<?php
/**
 * POST /api/v1/portal/erisim-olustur.php
 * Dosya için müşteri portal erişimi oluştur (Admin/Uzman/Personel)
 * Body: { dosya_id, giris_yontemi: "sms_otp"|"link", bitis_tarihi, sms_gonder: true/false }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('POST');
ensure_portal_tables();

$user = auth_required(['admin']);
$body = get_json_body();
$dosyaId = (int)($body['dosya_id'] ?? 0);

if ($dosyaId <= 0) {
    json_error('DOSYA ID GEREKLİ', 422);
}

$db = getDB();

// Dosya ve mağdur bilgilerini al
$stmt = $db->prepare("SELECT d.id, d.dosya_no, d.dosya_turu, m.ad_soyad, m.tc_kimlik, m.telefon, m.email FROM dosyalar d LEFT JOIN magdurlar m ON m.dosya_id = d.id WHERE d.id = ?");
$stmt->execute([$dosyaId]);
$dosya = $stmt->fetch();

if (!$dosya) {
    json_error('DOSYA BULUNAMADI', 404);
}

if (empty($dosya['telefon'])) {
    json_error('MAĞDUR TELEFON NUMARASI TANIMLI DEĞİL. DOSYADA TELEFON BİLGİSİ EKLEYİN.', 422);
}

// Mevcut aktif erişim var mı kontrol et
$stmtMevcut = $db->prepare("SELECT id, erisim_kodu FROM portal_erisim WHERE dosya_id = ? AND aktif = 1");
$stmtMevcut->execute([$dosyaId]);
$mevcut = $stmtMevcut->fetch();

if ($mevcut) {
    json_error('BU DOSYA İÇİN ZATEN AKTİF PORTAL ERİŞİMİ MEVCUT (ID: ' . $mevcut['id'] . ')', 409);
}

// Benzersiz erişim kodu oluştur
$erisimKodu = generate_uuid();

// Telefon normalize
$telNorm = sms_telefon_normalize($dosya['telefon']);

// Erişim kaydı oluştur
$girisYontemi = in_array($body['giris_yontemi'] ?? '', ['sms_otp', 'tc_telefon', 'link']) ? $body['giris_yontemi'] : 'sms_otp';
$bitisTarihi = !empty($body['bitis_tarihi']) ? $body['bitis_tarihi'] : null;

$stmtInsert = $db->prepare("INSERT INTO portal_erisim (dosya_id, erisim_kodu, tc_kimlik, telefon, ad_soyad, giris_yontemi, bitis_tarihi, olusturan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
$stmtInsert->execute([
    $dosyaId,
    $erisimKodu,
    $dosya['tc_kimlik'] ?: null,
    $telNorm ?: $dosya['telefon'],
    $dosya['ad_soyad'],
    $girisYontemi,
    $bitisTarihi,
    $user['id']
]);

$erisimId = (int)$db->lastInsertId();

// Site URL al
$siteUrl = '';
try {
    $stmtUrl = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'site_url' LIMIT 1");
    $urlRow = $stmtUrl->fetch();
    if ($urlRow && !empty($urlRow['deger'])) $siteUrl = rtrim($urlRow['deger'], '/');
} catch (\Exception $e) {}
if (empty($siteUrl)) {
    $protokol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'sistem.mrhasardanismanlik.com';
    $siteUrl = $protokol . '://' . $host;
}

$portalLoginLink = $siteUrl . '/portal.html';
$portalDirectLink = $siteUrl . '/portal.html#kod=' . $erisimKodu;

// SMS ile bilgilendirme gönder - müşteriye sadece giriş sayfası linki gönderilir
$smsGonder = !isset($body['sms_gonder']) || $body['sms_gonder'] !== false;
$smsSonuc = null;

if ($smsGonder && !empty($telNorm)) {
    $firmaAdi = 'MR HASAR DANISMANLIK';
    try {
        $stmtFirma = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'firma_adi' LIMIT 1");
        $fRow = $stmtFirma->fetch();
        if ($fRow && !empty($fRow['deger'])) $firmaAdi = $fRow['deger'];
    } catch (\Exception $e) {}

    $smsMesaj = "Sayin " . ($dosya['ad_soyad'] ?: 'MUSTERIMIZ') . ", {$dosya['dosya_no']} nolu dosyaniz icin portal erisiminiz olusturulmustur. Giris icin: {$portalLoginLink} adresinden TC Kimlik ve telefonunuzla giris yapabilirsiniz. - {$firmaAdi}";

    $smsSonuc = sms_gonder($telNorm, $smsMesaj, $dosyaId, $user['id']);
}

log_action($user['id'], 'portal_erisim_olustur', "Portal erişimi oluşturuldu: {$dosya['dosya_no']} - {$dosya['ad_soyad']}", 'portal_erisim', $erisimId);
portal_logla($erisimId, $dosyaId, 'erisim_olusturuldu', 'Portal erişimi oluşturuldu: ' . $user['ad_soyad'] . ' tarafından');

json_success([
    'erisim_id' => $erisimId,
    'erisim_kodu' => $erisimKodu,
    'portal_link' => $portalDirectLink,
    'portal_login_link' => $portalLoginLink,
    'giris_yontemi' => $girisYontemi,
    'sms_sonuc' => $smsSonuc
], 'PORTAL ERİŞİMİ BAŞARIYLA OLUŞTURULDU', 201);
