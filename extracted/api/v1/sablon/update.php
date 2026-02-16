<?php
/**
 * PUT /api/v1/sablon/update.php
 * Şablon güncelle
 * Body: { "id": 1, "ad": "...", "icerik": "...", "kategori": "...", "degiskenler": [...], "aktif": 1 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

// Şablon kontrolü
$stmt = $db->prepare('SELECT * FROM sablonlar WHERE id = ?');
$stmt->execute([$id]);
$sablon = $stmt->fetch();
if (!$sablon) json_error('Şablon bulunamadı', 404);

// Güncellenecek alanları hazırla
$fields = [];
$params = [];

if (isset($body['ad'])) {
    $ad = clean($body['ad']);
    // Aynı isimde başka şablon var mı?
    $stmt = $db->prepare('SELECT id FROM sablonlar WHERE ad = ? AND id != ?');
    $stmt->execute([$ad, $id]);
    if ($stmt->fetch()) json_error('Bu isimde bir şablon zaten mevcut', 422);
    $fields[] = 'ad = ?';
    $params[] = $ad;
}

if (isset($body['icerik'])) {
    $fields[] = 'icerik = ?';
    $params[] = $body['icerik']; // İçerik HTML/metin olabilir
}

if (isset($body['kategori'])) {
    $fields[] = 'kategori = ?';
    $params[] = clean($body['kategori']);
}

if (isset($body['degiskenler'])) {
    $degiskenler = null;
    if (is_array($body['degiskenler'])) {
        $degiskenler = json_encode($body['degiskenler'], JSON_UNESCAPED_UNICODE);
    } elseif (is_string($body['degiskenler'])) {
        $decoded = json_decode($body['degiskenler'], true);
        $degiskenler = is_array($decoded) ? $body['degiskenler'] : null;
    }
    $fields[] = 'degiskenler = ?';
    $params[] = $degiskenler;
}

if (isset($body['aktif'])) {
    $fields[] = 'aktif = ?';
    $params[] = (int)$body['aktif'];
}

if (empty($fields)) {
    json_error('Güncellenecek alan bulunamadı', 422);
}

$params[] = $id;

try {
    $sql = 'UPDATE sablonlar SET ' . implode(', ', $fields) . ' WHERE id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    log_action($user['id'], 'sablon_guncelle', "Şablon güncellendi: " . ($body['ad'] ?? $sablon['ad']), 'sablonlar', $id);

    json_success(['id' => $id], 'Şablon güncellendi');

} catch (\Exception $e) {
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
