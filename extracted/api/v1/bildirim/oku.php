<?php
/**
 * PUT /api/v1/bildirim/oku.php
 * Bildirimi okundu olarak işaretle
 * Body: { "id": 1 } veya { "hepsi": true }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required();
$body = get_json_body();
$db = getDB();

// Frontend 'tumu' gönderir, backend 'hepsi' bekler
if (!empty($body['hepsi']) || !empty($body['tumu'])) {
    // Tümünü okundu yap
    $stmt = $db->prepare('UPDATE bildirimler SET okundu = 1 WHERE alici_id = ? AND okundu = 0');
    $stmt->execute([$user['id']]);
    $count = $stmt->rowCount();
    json_success(['guncellenen' => $count], "$count bildirim okundu olarak işaretlendi");
}

$id = (int)($body['id'] ?? 0);
if (!$id) json_error('Bildirim ID gerekli', 422);

$stmt = $db->prepare('UPDATE bildirimler SET okundu = 1 WHERE id = ? AND alici_id = ?');
$stmt->execute([$id, $user['id']]);

if ($stmt->rowCount() === 0) {
    json_error('Bildirim bulunamadı', 404);
}

json_success(null, 'Bildirim okundu');
