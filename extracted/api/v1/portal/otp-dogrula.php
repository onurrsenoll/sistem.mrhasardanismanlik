<?php
/**
 * POST /api/v1/portal/otp-dogrula.php
 * SMS OTP kodunu doğrula ve portal token'ı döndür
 * Body: { telefon: "05XX...", otp: "123456" }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/sms_helper.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('POST');
ensure_portal_tables();

$body = get_json_body();
$telefon = clean($body['telefon'] ?? '');
$otp = clean($body['otp'] ?? '');

if (empty($telefon) || empty($otp)) {
    json_error('TELEFON VE OTP KODU GEREKLİ', 422);
}

$db = getDB();
$telNorm = sms_telefon_normalize($telefon);
$telAra = $telNorm ?: $telefon;

// OTP kaydını bul
$stmt = $db->prepare("SELECT * FROM portal_otp WHERE telefon = ? AND otp_kod = ? AND kullanildi = 0 AND gecerlilik > NOW() ORDER BY created_at DESC LIMIT 1");
$stmt->execute([$telAra, $otp]);
$otpKayit = $stmt->fetch();

if (!$otpKayit) {
    // Deneme sayısını artır (brute force koruması)
    $stmtDeneme = $db->prepare("UPDATE portal_otp SET deneme_sayisi = deneme_sayisi + 1 WHERE telefon = ? AND kullanildi = 0 AND gecerlilik > NOW()");
    $stmtDeneme->execute([$telAra]);

    // 5'ten fazla hatalı deneme varsa OTP'yi devre dışı bırak
    $stmtKontrol = $db->prepare("SELECT id FROM portal_otp WHERE telefon = ? AND kullanildi = 0 AND deneme_sayisi >= 5 AND gecerlilik > NOW()");
    $stmtKontrol->execute([$telAra]);
    if ($stmtKontrol->fetch()) {
        $db->prepare("UPDATE portal_otp SET kullanildi = 1 WHERE telefon = ? AND gecerlilik > NOW()")->execute([$telAra]);
        json_error('ÇOK FAZLA HATALI DENEME. YENİ KOD TALEP EDİN.', 429);
    }

    json_error('GEÇERSİZ VEYA SÜRESİ DOLMUŞ DOĞRULAMA KODU', 401);
}

// OTP'yi kullanıldı olarak işaretle
$db->prepare("UPDATE portal_otp SET kullanildi = 1 WHERE id = ?")->execute([$otpKayit['id']]);

// Portal erişim bilgisini al
$erisimId = $otpKayit['erisim_id'];
$stmtErisim = $db->prepare("SELECT pe.*, d.dosya_no, d.dosya_turu, d.asama, m.ad_soyad as magdur_adi FROM portal_erisim pe LEFT JOIN dosyalar d ON d.id = pe.dosya_id LEFT JOIN magdurlar m ON m.dosya_id = pe.dosya_id WHERE pe.id = ? AND pe.aktif = 1");
$stmtErisim->execute([$erisimId]);
$erisim = $stmtErisim->fetch();

if (!$erisim) {
    json_error('PORTAL ERİŞİMİ AKTİF DEĞİL', 403);
}

// Giriş bilgilerini güncelle
$db->prepare("UPDATE portal_erisim SET son_giris = NOW(), giris_sayisi = giris_sayisi + 1 WHERE id = ?")->execute([$erisimId]);

// Portal token oluştur
$token = portal_token_olustur($erisimId, $erisim['dosya_id']);

// KVKK log
portal_logla($erisimId, $erisim['dosya_id'], 'giris', 'SMS OTP ile portal girişi yapıldı');

json_success([
    'token' => $token,
    'erisim' => [
        'id' => (int)$erisim['id'],
        'dosya_id' => (int)$erisim['dosya_id'],
        'dosya_no' => $erisim['dosya_no'],
        'dosya_turu' => $erisim['dosya_turu'],
        'asama' => $erisim['asama'],
        'ad_soyad' => $erisim['magdur_adi'] ?: $erisim['ad_soyad'],
        'giris_yontemi' => $erisim['giris_yontemi']
    ]
], 'PORTAL GİRİŞİ BAŞARILI');
