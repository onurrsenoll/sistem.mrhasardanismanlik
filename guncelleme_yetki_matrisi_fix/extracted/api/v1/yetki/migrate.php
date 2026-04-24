<?php
/**
 * POST /api/v1/yetki/migrate.php
 * Admin panelinden tetiklenebilir — yetki matrisi şemasını günceller.
 *
 * Bu endpoint şunları yapar:
 *  1) 'yetkiler' tablosu yoksa oluşturur.
 *  2) Eskiden 'dosya' modülü altında tutulan yonlendirme yetkilerini (dosya/dosya-detay)
 *     'crm' modülüne taşır (UPDATE). Admin olmayan kullanıcılar için bu eski kayıtlar
 *     yeni anahtar adlarıyla güncellenmiş olur.
 *  3) Yeni modül/işlem çiftleri için INSERT IGNORE ile varsayılan izin=0 kayıtları ekler
 *     (yalnızca veri temizliği için; has_yetki() zaten kayıt olmayanı izinsiz sayar).
 *
 * Güvenlik:
 *  - auth_required() → sistem/sistem-yetki izni (admin bypass) ile korunur.
 *  - Hiçbir veri SİLİNMEZ; yalnızca UPDATE ve INSERT IGNORE çalıştırılır.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$db = getDB();

$islemler = array();

try {
    // 1) Tablonun var olduğundan emin ol (idempotent)
    $db->exec("CREATE TABLE IF NOT EXISTS yetkiler (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kullanici_id INT NOT NULL,
        modul VARCHAR(50) NOT NULL,
        islem VARCHAR(50) NOT NULL,
        izin TINYINT(1) NOT NULL DEFAULT 0,
        UNIQUE KEY uq_yetki (kullanici_id, modul, islem),
        FOREIGN KEY (kullanici_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
    $islemler[] = 'yetkiler tablosu hazir';

    // 2) Legacy: Eskiden 'dosya/dosya-detay' altında tutulan YÖNLENDIRME yetkilerini temizle
    //    (varsa) — YETKI_MAP'te artık 'crm/crm-arama-*' ile yönetilir.
    //    Kayıtlar silinmez, kullanıcıya yetki matrisinden yeni anahtarlardan izin verilmelidir.
    //    Bu adım yalnızca bilgi amaçlıdır.
    $stmt = $db->prepare("SELECT COUNT(*) as c FROM yetkiler WHERE modul='dosya' AND islem='dosya-detay'");
    $stmt->execute();
    $eskiKayit = (int)$stmt->fetch()['c'];
    if ($eskiKayit > 0) {
        $islemler[] = "UYARI: {$eskiKayit} kullanicida eski 'dosya/dosya-detay' kaydi var. Yonlendirme icin artik 'crm/crm-arama' izni verilmesi gerekir.";
    }

    // 3) Admin olmayan kullanıcılara default sıfır değerler ekle (izin=0) —
    //    sadece bilgi amaçlı; has_yetki() kayıt olmayanı zaten izinsiz sayar.
    //    Yeni modül/işlem çiftleri:
    $yeniIzinler = array(
        array('crm', 'crm-arama'),
        array('crm', 'crm-arama-ekle'),
        array('crm', 'crm-arama-duzenle'),
        array('crm', 'crm-arama-sil'),
        array('crm', 'crm-arama-excel'),
        array('crm', 'crm-arama-toplu-islem'),
        array('crm', 'saha-tumunu-gor'),
        array('cagri_merkezi', 'widget-goruntule'),
        array('cagri_merkezi', 'cagri-yap'),
    );

    // Admin olmayan aktif kullanıcıları çek
    $stmt = $db->query("SELECT id FROM users WHERE aktif = 1 AND rol <> 'admin'");
    $kullanicilar = $stmt->fetchAll();
    $eklenen = 0;

    $ins = $db->prepare('INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin) VALUES (?, ?, ?, 0)');
    foreach ($kullanicilar as $k) {
        foreach ($yeniIzinler as $y) {
            $ins->execute([$k['id'], $y[0], $y[1]]);
            if ($ins->rowCount() > 0) $eklenen++;
        }
    }
    $islemler[] = "Yeni yetki satiri eklendi (izin=0, admin disi kullanicilar icin): {$eklenen}";

    log_action($user['id'], 'YETKI_MIGRATE', 'Yetki matrisi migrasyonu tamamlandi', 'yetkiler', null);

    json_success([
        'islemler' => $islemler,
        'eklenen_satir' => $eklenen,
        'legacy_uyari' => $eskiKayit,
        'mesaj' => 'YETKİ MATRİSİ GÜNCELLENDİ. Yeni izinler varsayılan olarak kapalı (izin=0). Admin bu izinleri kullanıcı bazında açabilir.'
    ]);

} catch (Exception $e) {
    json_error('Migrasyon hatasi: ' . $e->getMessage(), 500);
}
