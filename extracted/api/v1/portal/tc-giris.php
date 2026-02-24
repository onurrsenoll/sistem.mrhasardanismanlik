<?php
/**
 * POST /api/v1/portal/tc-giris.php
 * TC Kimlik + Telefon ile portal girişi (SMS gerektirmez)
 * Body: { tc_kimlik: "1234567890X", telefon: "05XX..." }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('POST');
ensure_portal_tables();

$body = get_json_body();
$tc = clean($body['tc_kimlik'] ?? '');
$telefon = clean($body['telefon'] ?? '');

if (empty($tc) || empty($telefon)) {
    json_error('TC KİMLİK VE TELEFON GEREKLİ', 422);
}

// TC Kimlik format kontrolü
if (!preg_match('/^[1-9][0-9]{10}$/', $tc)) {
    json_error('GEÇERSİZ TC KİMLİK NUMARASI', 422);
}

$db = getDB();

// Brute force koruması - aynı IP'den 10 dakikada en fazla 10 deneme
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$stmtBrute = $db->prepare("SELECT COUNT(*) as sayi FROM portal_loglar WHERE ip_adresi = ? AND islem = 'giris_basarisiz' AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
$stmtBrute->execute([$ip]);
$bruteSayi = (int)$stmtBrute->fetch()['sayi'];
if ($bruteSayi >= 10) {
    json_error('ÇOK FAZLA BAŞARISIZ DENEME. 10 DAKİKA SONRA TEKRAR DENEYİN.', 429);
}

// Telefon normalizasyonu
$telNorm = preg_replace('/[\s\-\(\)\+]/', '', $telefon);
if (substr($telNorm, 0, 1) === '0' && strlen($telNorm) === 11) $telNorm = '9' . $telNorm;
if (substr($telNorm, 0, 1) === '5' && strlen($telNorm) === 10) $telNorm = '90' . $telNorm;

// Portal erişimi bul - TC + Telefon eşleşmesi
$stmt = $db->prepare("
    SELECT pe.*, d.dosya_no, d.dosya_turu, d.asama, m.ad_soyad as magdur_adi
    FROM portal_erisim pe
    LEFT JOIN dosyalar d ON d.id = pe.dosya_id
    LEFT JOIN magdurlar m ON m.dosya_id = pe.dosya_id
    WHERE pe.tc_kimlik = ?
    AND (pe.telefon = ? OR pe.telefon = ? OR pe.telefon = ?)
    AND pe.aktif = 1
    AND (pe.bitis_tarihi IS NULL OR pe.bitis_tarihi >= CURDATE())
    ORDER BY pe.created_at DESC
    LIMIT 1
");
$stmt->execute([$tc, $telefon, $telNorm, ltrim($telefon, '0')]);
$erisim = $stmt->fetch();

if (!$erisim) {
    // Başarısız giriş logu
    try {
        $stmtLog = $db->prepare("INSERT INTO portal_loglar (islem, detay, ip_adresi, user_agent) VALUES ('giris_basarisiz', ?, ?, ?)");
        $stmtLog->execute([
            "TC: {$tc}, Tel: {$telefon}",
            $ip,
            isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 500) : null
        ]);
    } catch (\Exception $e) {}

    json_error('TC KİMLİK VE TELEFON BİLGİLERİ EŞLEŞMİYOR VEYA AKTİF PORTAL BULUNAMADI', 401);
}

// Giriş bilgilerini güncelle
$db->prepare("UPDATE portal_erisim SET son_giris = NOW(), giris_sayisi = giris_sayisi + 1 WHERE id = ?")->execute([$erisim['id']]);

// Portal token oluştur
$token = portal_token_olustur($erisim['id'], $erisim['dosya_id']);

// KVKK log
portal_logla($erisim['id'], $erisim['dosya_id'], 'giris', 'TC Kimlik + Telefon ile portal girişi yapıldı');

json_success([
    'token' => $token,
    'erisim' => [
        'id' => (int)$erisim['id'],
        'dosya_id' => (int)$erisim['dosya_id'],
        'dosya_no' => $erisim['dosya_no'],
        'dosya_turu' => $erisim['dosya_turu'],
        'asama' => $erisim['asama'],
        'ad_soyad' => $erisim['magdur_adi'] ?: $erisim['ad_soyad'],
        'giris_yontemi' => 'tc_telefon'
    ]
], 'PORTAL GİRİŞİ BAŞARILI');
