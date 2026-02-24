<?php
/**
 * PUT /api/v1/portal/erisim-guncelle.php
 * Portal erişimini güncelle (aktif/pasif, bitiş tarihi, yeniden SMS gönder)
 * Body: { id, aktif, bitis_tarihi, sms_gonder }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('PUT');
ensure_portal_tables();

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
$erisimId = (int)($body['id'] ?? 0);

if ($erisimId <= 0) {
    json_error('ERİŞİM ID GEREKLİ', 422);
}

$db = getDB();

// Mevcut kaydı al
$stmt = $db->prepare("SELECT pe.*, d.dosya_no FROM portal_erisim pe LEFT JOIN dosyalar d ON d.id = pe.dosya_id WHERE pe.id = ?");
$stmt->execute([$erisimId]);
$erisim = $stmt->fetch();

if (!$erisim) {
    json_error('ERİŞİM KAYDI BULUNAMADI', 404);
}

// Güncellenecek alanlar
$updates = [];
$params = [];

if (isset($body['aktif'])) {
    $updates[] = 'aktif = ?';
    $params[] = (int)$body['aktif'];
}

if (array_key_exists('bitis_tarihi', $body)) {
    $updates[] = 'bitis_tarihi = ?';
    $params[] = !empty($body['bitis_tarihi']) ? $body['bitis_tarihi'] : null;
}

if (isset($body['giris_yontemi']) && in_array($body['giris_yontemi'], ['sms_otp', 'tc_telefon', 'link'])) {
    $updates[] = 'giris_yontemi = ?';
    $params[] = $body['giris_yontemi'];
}

if (!empty($updates)) {
    $params[] = $erisimId;
    $db->prepare("UPDATE portal_erisim SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);
}

// Tekrar SMS gönder
if (!empty($body['sms_gonder']) && !empty($erisim['telefon'])) {
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

    $firmaAdi = 'MR HASAR DANISMANLIK';
    try {
        $stmtFirma = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'firma_adi' LIMIT 1");
        $fRow = $stmtFirma->fetch();
        if ($fRow && !empty($fRow['deger'])) $firmaAdi = $fRow['deger'];
    } catch (\Exception $e) {}

    $portalLink = $siteUrl . '/portal.html';
    $girisYontemi = $body['giris_yontemi'] ?? $erisim['giris_yontemi'];

    if ($girisYontemi === 'link') {
        $portalLink .= '#kod=' . $erisim['erisim_kodu'];
        $smsMesaj = "Sayin " . ($erisim['ad_soyad'] ?: 'MUSTERIMIZ') . ", {$erisim['dosya_no']} nolu dosyaniza portal erisim linkiniz: {$portalLink} - {$firmaAdi}";
    } else {
        $smsMesaj = "Sayin " . ($erisim['ad_soyad'] ?: 'MUSTERIMIZ') . ", {$erisim['dosya_no']} nolu dosyaniz icin portal adresi: {$portalLink} Telefonunuzla giris yapabilirsiniz. - {$firmaAdi}";
    }

    sms_gonder($erisim['telefon'], $smsMesaj, $erisim['dosya_id'], $user['id']);
}

log_action($user['id'], 'portal_erisim_guncelle', "Portal erişimi güncellendi: {$erisim['dosya_no']}", 'portal_erisim', $erisimId);

json_success(null, 'PORTAL ERİŞİMİ GÜNCELLENDİ');
