<?php
/**
 * POST /api/v1/portal/otp-gonder.php
 * Müşteriye SMS OTP kodu gönder
 * Body: { telefon: "05XX..." }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/sms_helper.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('POST');
ensure_portal_tables();

$body = get_json_body();
$telefon = clean($body['telefon'] ?? '');

if (empty($telefon)) {
    json_error('TELEFON NUMARASI GEREKLİ', 422);
}

$db = getDB();

// Bu telefona kayıtlı aktif portal erişimi var mı?
$telNorm = sms_telefon_normalize($telefon);
$stmt = $db->prepare("SELECT pe.*, d.dosya_no FROM portal_erisim pe LEFT JOIN dosyalar d ON d.id = pe.dosya_id WHERE pe.telefon = ? AND pe.aktif = 1 AND (pe.bitis_tarihi IS NULL OR pe.bitis_tarihi >= CURDATE()) ORDER BY pe.created_at DESC LIMIT 1");
$stmt->execute([$telNorm]);
$erisim = $stmt->fetch();

// Normalize edilmemiş telefon ile de dene
if (!$erisim) {
    $stmt2 = $db->prepare("SELECT pe.*, d.dosya_no FROM portal_erisim pe LEFT JOIN dosyalar d ON d.id = pe.dosya_id WHERE pe.telefon = ? AND pe.aktif = 1 AND (pe.bitis_tarihi IS NULL OR pe.bitis_tarihi >= CURDATE()) ORDER BY pe.created_at DESC LIMIT 1");
    $stmt2->execute([$telefon]);
    $erisim = $stmt2->fetch();
}

if (!$erisim) {
    json_error('BU TELEFON NUMARASINA TANIMLI AKTİF DOSYA BULUNAMADI', 404);
}

// Son 2 dakika içinde gönderilmiş OTP var mı? (spam koruması)
$stmtSpam = $db->prepare("SELECT id FROM portal_otp WHERE telefon = ? AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE) AND kullanildi = 0 LIMIT 1");
$stmtSpam->execute([$telNorm ?: $telefon]);
$spam = $stmtSpam->fetch();
if ($spam) {
    json_error('SON 2 DAKİKA İÇİNDE KOD GÖNDERİLMİŞ. LÜTFEN BEKLEYİN.', 429);
}

// 6 haneli OTP kodu oluştur
$otpKod = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);

// OTP kaydı oluştur (5 dakika geçerli)
$stmtOtp = $db->prepare("INSERT INTO portal_otp (telefon, otp_kod, erisim_id, gecerlilik, ip_adresi) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), ?)");
$stmtOtp->execute([
    $telNorm ?: $telefon,
    $otpKod,
    $erisim['id'],
    $_SERVER['REMOTE_ADDR'] ?? null
]);

// SMS ile OTP gönder
$firmaAdi = 'MR HASAR DANISMANLIK';
try {
    $stmtFirma = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'firma_adi' LIMIT 1");
    $firmaRow = $stmtFirma->fetch();
    if ($firmaRow && !empty($firmaRow['deger'])) $firmaAdi = $firmaRow['deger'];
} catch (\Exception $e) {}

$smsMesaj = "Sayin " . ($erisim['ad_soyad'] ?: 'MUSTERIMIZ') . ", {$firmaAdi} Musteri Portali giris kodunuz: {$otpKod} - Bu kod 5 dakika gecerlidir. Kimseyle paylasmayiniz.";

$sonuc = sms_gonder($telNorm ?: $telefon, $smsMesaj, $erisim['dosya_id'], null);

if (!$sonuc['basarili']) {
    json_error('SMS GÖNDERİLEMEDİ: ' . $sonuc['mesaj'], 500);
}

portal_logla($erisim['id'], $erisim['dosya_id'], 'otp_gonderildi', 'OTP SMS gönderildi: ' . ($telNorm ?: $telefon));

json_success([
    'telefon_maskelenmis' => substr($telefon, 0, 4) . '****' . substr($telefon, -2),
    'gecerlilik_dk' => 5
], 'DOĞRULAMA KODU GÖNDERİLDİ');
