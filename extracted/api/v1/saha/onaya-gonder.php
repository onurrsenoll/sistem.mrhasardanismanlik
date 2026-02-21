<?php
/**
 * POST /api/v1/saha/onaya-gonder.php
 * SAHA DOSYASINI ONAYA GÖNDER (TASLAK → BEKLEMEDE)
 * Admin kullanıcılarına bildirim gönderir
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'personel', 'uzman', 'avukat']);
$body = get_json_body();

if (empty($body['id'])) json_error('ID GEREKLİ', 400);

$id = (int)$body['id'];
$db = getDB();

// Mevcut kaydı al
$stmt = $db->prepare("SELECT * FROM saha_dosyalar WHERE id = ?");
$stmt->execute([$id]);
$kayit = $stmt->fetch();

if (!$kayit) json_error('KAYIT BULUNAMADI', 404);

// Personel sadece kendi kaydını gönderebilir
if ($user['rol'] !== 'admin' && (int)$kayit['personel_id'] !== (int)$user['id']) {
    json_error('BU KAYDI ONAYA GÖNDERME YETKİNİZ YOK', 403);
}

// Sadece taslak durumundaki kayıtlar onaya gönderilebilir
if ($kayit['durum'] !== 'taslak') {
    json_error('SADECE TASLAK DURUMUNDAKI KAYITLAR ONAYA GÖNDERİLEBİLİR', 400);
}

try {
    // Durumu beklemede olarak güncelle
    $stmt = $db->prepare("UPDATE saha_dosyalar SET durum = 'beklemede', updated_at = NOW() WHERE id = ?");
    $stmt->execute([$id]);

    // Admin kullanıcılara bildirim gönder
    $admins = $db->query("SELECT id FROM users WHERE rol = 'admin' AND aktif = 1")->fetchAll();
    $icerik = clean($kayit['musteri_adi']) .
              ($kayit['hasar_tipi'] ? ' - ' . clean($kayit['hasar_tipi']) : '') .
              ($kayit['arac_plaka'] ? ' - ' . clean($kayit['arac_plaka']) : '');

    foreach ($admins as $admin) {
        $stmt2 = $db->prepare("INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, okundu) VALUES (?, ?, ?, ?, 'uyari', 0)");
        $stmt2->execute([
            $user['id'],
            $admin['id'],
            'YENİ SAHA DOSYASI ONAY BEKLİYOR',
            $icerik
        ]);
    }

    log_action($user['id'], 'saha_onaya_gonder', "Saha dosya onaya gönderildi: " . $kayit['musteri_adi'], 'saha_dosyalar', $id);

    json_success(null, 'SAHA DOSYASI ONAYA GÖNDERİLDİ');

} catch (\Exception $e) {
    json_error('ONAYA GÖNDERME HATASI: ' . $e->getMessage(), 500);
}
