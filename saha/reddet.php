<?php
/**
 * POST /api/v1/saha/reddet.php
 * SAHA DOSYASINI REDDET (SADECE ADMİN)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();

if (empty($body['id'])) json_error('ID GEREKLİ', 400);
if (empty($body['red_nedeni'])) json_error('RED NEDENİ GEREKLİ', 400);

$id = (int)$body['id'];
$db = getDB();

// Mevcut kaydı al
$stmt = $db->prepare("SELECT * FROM saha_dosyalar WHERE id = ?");
$stmt->execute([$id]);
$kayit = $stmt->fetch();

if (!$kayit) json_error('KAYIT BULUNAMADI', 404);

if ($kayit['durum'] !== 'beklemede') {
    json_error('BU KAYIT ZATEN İŞLEM GÖRMÜŞ', 400);
}

try {
    // Durumu reddet
    $stmt = $db->prepare("UPDATE saha_dosyalar SET durum = 'reddedildi', onaylayan_id = ?, onay_tarihi = NOW(), red_nedeni = ? WHERE id = ?");
    $stmt->execute([
        $user['id'],
        clean($body['red_nedeni']),
        $id
    ]);

    // Personele bildirim gönder
    $icerik = $kayit['musteri_adi'] . ' - ' . ($kayit['arac_plaka'] ?: 'PLAKA YOK') . ' SAHA DOSYASI REDDEDİLDİ. NEDEN: ' . clean($body['red_nedeni']);
    $stmt2 = $db->prepare("INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, okundu) VALUES (?, ?, ?, ?, 'uyari', 0)");
    $stmt2->execute([
        $user['id'],
        $kayit['personel_id'],
        'SAHA DOSYA REDDEDİLDİ',
        $icerik
    ]);

    log_action($user['id'], 'saha_reddet', "Saha dosya reddedildi: " . $kayit['musteri_adi'] . " - Neden: " . clean($body['red_nedeni']), 'saha_dosyalar', $id);

    json_success(null, 'SAHA DOSYASI REDDEDİLDİ');

} catch (\Exception $e) {
    json_error('RED İŞLEMİ HATASI: ' . $e->getMessage(), 500);
}
