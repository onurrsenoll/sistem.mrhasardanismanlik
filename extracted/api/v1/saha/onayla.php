<?php
/**
 * POST /api/v1/saha/onayla.php
 * SAHA DOSYASINI ONAYLA (SADECE ADMİN)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();

if (empty($body['id'])) json_error('ID GEREKLİ', 400);

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
    // Durumu onayla
    $stmt = $db->prepare("UPDATE saha_dosyalar SET durum = 'onaylandi', onaylayan_id = ?, onay_tarihi = NOW(), onay_notu = ? WHERE id = ?");
    $stmt->execute([
        $user['id'],
        clean($body['onay_notu'] ?? ''),
        $id
    ]);

    // Personele bildirim gönder - vekalet takip süresi bilgisi
    $icerik = $kayit['musteri_adi'] . ' - ' . ($kayit['arac_plaka'] ?: 'PLAKA YOK') . ' SAHA DOSYASI ONAYLANDI. 3 GÜN İÇİNDE VEKALET ALINARAK DOSYAYA DÖNÜŞTÜRÜLMESİ GEREKMEKTEDİR.';
    $stmt2 = $db->prepare("INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, okundu) VALUES (?, ?, ?, ?, 'uyari', 0)");
    $stmt2->execute([
        $user['id'],
        $kayit['personel_id'],
        'SAHA DOSYA ONAYLANDI - 3 GÜN SÜRE',
        $icerik
    ]);

    // Ajanda kaydı - 3 gün sonrası için vekalet takip hatırlatması
    $stmt3 = $db->prepare("INSERT INTO ajanda (kullanici_id, baslik, aciklama, tarih, hatirlatma, oncelik, renk) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), 'acil', '#ef4444')");
    $stmt3->execute([
        $kayit['personel_id'],
        'VEKALET TAKİP - ' . $kayit['musteri_adi'],
        $kayit['musteri_adi'] . ' - ' . ($kayit['arac_plaka'] ?: '') . ' SAHA DOSYASI İÇİN VEKALET ALINMASI GEREKİYOR. SON GÜN!'
    ]);

    log_action($user['id'], 'saha_onayla', "Saha dosya onaylandı: " . $kayit['musteri_adi'], 'saha_dosyalar', $id);

    json_success(null, 'SAHA DOSYASI ONAYLANDI');

} catch (\Exception $e) {
    json_error('ONAYLAMA HATASI: ' . $e->getMessage(), 500);
}
