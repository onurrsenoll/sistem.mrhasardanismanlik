<?php
/**
 * PUT /api/v1/arama-log/update.php
 * Arama logunu guncelle (durum, sure, not, kayit dosyasi)
 * Body: { "id": 1, "durum": "cevaplandi", "sure_saniye": 120, "notlar": "...", "kayit_dosya": "..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('PUT');

$user = auth_required();
$body = get_json_body();

ensure_arama_log_table();

require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

// Log sahibi mi kontrol et
$stmt = $db->prepare('SELECT * FROM arama_loglari WHERE id = ?');
$stmt->execute([$id]);
$log = $stmt->fetch();

if (!$log) json_error('Arama logu bulunamadi', 404);
if ($user['rol'] !== 'admin' && $log['kullanici_id'] != $user['id']) {
    json_error('Bu loga erisim yetkiniz yok', 403);
}

$updates = [];
$params = [];

if (isset($body['durum']) && in_array($body['durum'], ['cevaplandi', 'cevapsiz', 'reddedildi', 'mesgul', 'hata'])) {
    $updates[] = 'durum = ?';
    $params[] = $body['durum'];
}
if (isset($body['sure_saniye'])) {
    $updates[] = 'sure_saniye = ?';
    $params[] = (int)$body['sure_saniye'];
}
if (isset($body['cevaplanma_zamani'])) {
    $updates[] = 'cevaplanma_zamani = ?';
    $params[] = $body['cevaplanma_zamani'];
}
if (isset($body['bitis_zamani'])) {
    $updates[] = 'bitis_zamani = ?';
    $params[] = $body['bitis_zamani'];
}
if (isset($body['notlar'])) {
    $updates[] = 'notlar = ?';
    $params[] = clean($body['notlar']);
}
if (isset($body['kayit_dosya'])) {
    $updates[] = 'kayit_dosya = ?';
    $params[] = clean($body['kayit_dosya']);
}
if (isset($body['kayit_boyut'])) {
    $updates[] = 'kayit_boyut = ?';
    $params[] = (int)$body['kayit_boyut'];
}
if (isset($body['musteri_adi'])) {
    $updates[] = 'musteri_adi = ?';
    $params[] = clean($body['musteri_adi']);
}

if (empty($updates)) {
    json_error('Guncellenecek alan bulunamadi', 422);
}

$params[] = $id;
$stmt = $db->prepare('UPDATE arama_loglari SET ' . implode(', ', $updates) . ' WHERE id = ?');
$stmt->execute($params);

json_success(['id' => $id], 'Arama logu guncellendi');
