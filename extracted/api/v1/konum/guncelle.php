<?php
/**
 * POST /api/v1/konum/guncelle.php
 * Kullanıcının GPS konumunu kaydeder
 * Tüm giriş yapmış kullanıcılar erişebilir
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$db = getDB();
$data = get_json_body();

// Zorunlu alan kontrolü
$enlem = isset($data['enlem']) ? floatval($data['enlem']) : null;
$boylam = isset($data['boylam']) ? floatval($data['boylam']) : null;

if ($enlem === null || $boylam === null || $enlem == 0 || $boylam == 0) {
    json_error('Geçerli konum verisi gerekli (enlem, boylam)', 422);
}

// Geçerlilik kontrolü
if ($enlem < -90 || $enlem > 90 || $boylam < -180 || $boylam > 180) {
    json_error('Geçersiz koordinat değerleri', 422);
}

$dogruluk   = isset($data['dogruluk']) ? intval($data['dogruluk']) : 0;
$hiz        = isset($data['hiz']) ? floatval($data['hiz']) : 0;
$yon        = isset($data['yon']) ? floatval($data['yon']) : 0;
$cihaz_tipi = clean($data['cihaz_tipi'] ?? 'pc');
$zaman      = clean($data['zaman'] ?? date('Y-m-d H:i:s'));
$ip_adresi  = $_SERVER['REMOTE_ADDR'] ?? null;

// Tablo yoksa oluştur (auto-migration)
try {
    $db->exec("CREATE TABLE IF NOT EXISTS konum_kayitlari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kullanici_id INT NOT NULL,
        enlem DECIMAL(10,7) NOT NULL,
        boylam DECIMAL(10,7) NOT NULL,
        dogruluk INT DEFAULT 0,
        hiz DECIMAL(8,2) DEFAULT 0,
        yon DECIMAL(6,2) DEFAULT 0,
        cihaz_tipi VARCHAR(20) DEFAULT 'pc',
        ip_adresi VARCHAR(45),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_kullanici (kullanici_id),
        INDEX idx_zaman (created_at),
        INDEX idx_kullanici_zaman (kullanici_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {
    // Tablo zaten varsa sessiz geç
}

// Son konumu kontrol et — çok sık güncellemeyi engelle (min 60sn)
try {
    $stmt = $db->prepare("SELECT created_at FROM konum_kayitlari WHERE kullanici_id = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$user['id']]);
    $son = $stmt->fetch();
    if ($son && (time() - strtotime($son['created_at'])) < 60) {
        // 60 saniyeden kısa sürede tekrar geldi, güncelle ama yeni satır ekleme
        $stmt2 = $db->prepare("UPDATE konum_kayitlari SET enlem = ?, boylam = ?, dogruluk = ?, hiz = ?, yon = ?, cihaz_tipi = ?, ip_adresi = ?, created_at = NOW() WHERE kullanici_id = ? ORDER BY created_at DESC LIMIT 1");
        $stmt2->execute([$enlem, $boylam, $dogruluk, $hiz, $yon, $cihaz_tipi, $ip_adresi, $user['id']]);
        json_success(['guncellendi' => true], 'Konum güncellendi');
    }
} catch (Exception $e) {
    // İlk kayıtsa devam et
}

// Yeni konum kaydı ekle
$stmt = $db->prepare("INSERT INTO konum_kayitlari (kullanici_id, enlem, boylam, dogruluk, hiz, yon, cihaz_tipi, ip_adresi, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
$stmt->execute([$user['id'], $enlem, $boylam, $dogruluk, $hiz, $yon, $cihaz_tipi, $ip_adresi]);

json_success(['id' => $db->lastInsertId()], 'Konum kaydedildi');
