<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();

// Yetki: admin TUM ayarlari, netsantral-duzenle yetkili sadece netsantral_* anahtarlari
$isAdmin = ($user['rol'] === 'admin');
$nsDuzenle = $isAdmin || (isset($user['yetkiler']['netsantral_netsantral-duzenle']) && $user['yetkiler']['netsantral_netsantral-duzenle'] === 1);

if (!$isAdmin && !$nsDuzenle) {
    json_error('YETKİSİZ İŞLEM', 403);
}

$db = getDB();
$data = get_json_body();

if (!is_array($data) || empty($data)) {
    json_error('GEÇERSİZ VERİ');
}

try {
    // Tablo yoksa olustur
    $db->exec("CREATE TABLE IF NOT EXISTS ayarlar (
        id INT AUTO_INCREMENT PRIMARY KEY,
        anahtar VARCHAR(100) NOT NULL UNIQUE,
        deger TEXT,
        tip ENUM('text','number','color','json','image') DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

    // Sifreli olarak saklanan netsantral anahtarlari
    $sifreliAnahtarlar = ['netsantral_sip_sifre', 'netsantral_api_sifre', 'netsantral_netgsm_api_sifre'];
    $netsantralPrefix = 'netsantral_';

    $stmt = $db->prepare('INSERT INTO ayarlar (anahtar, deger) VALUES (?, ?) ON DUPLICATE KEY UPDATE deger = VALUES(deger)');

    $kayit_sayisi = 0;
    foreach ($data as $anahtar => $deger) {
        $isNetsantral = strpos($anahtar, $netsantralPrefix) === 0;

        // Yetki kontrolu: admin degil VE (netsantral degil VEYA netsantral yetkisi yok) -> atla
        if (!$isAdmin) {
            if (!$isNetsantral) continue;
            if (!$nsDuzenle) continue;
        }

        // Sifre alani: '••••••••' geliyorsa kullanici degistirmedi -> atla
        if (in_array($anahtar, $sifreliAnahtarlar)) {
            if ($deger === '••••••••' || $deger === '') continue;
            $deger = aes_encrypt($deger);
        }

        $stmt->execute([$anahtar, $deger]);
        $kayit_sayisi++;
    }

    log_action($user['id'], 'AYAR_GUNCELLE', 'Sistem ayarlari guncellendi (' . $kayit_sayisi . ' alan)', 'AYARLAR', null);

    json_success(['kaydedilen' => $kayit_sayisi], 'AYARLAR GÜNCELLENDİ');
} catch (Exception $e) {
    json_error('AYAR GÜNCELLEME HATASI: ' . $e->getMessage());
}
