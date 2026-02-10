<?php
/**
 * PUT /api/v1/tanim/update.php
 * Tanımlama güncelle
 * Body: { "id": 1, "deger": "Yeni Ad", "sira": 5, "aktif": 1 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM tanimlamalar WHERE id = ?');
$stmt->execute([$id]);
$tanim = $stmt->fetch();
if (!$tanim) json_error('Tanımlama bulunamadı', 404);

$sets = [];
$params = [];

if (isset($body['deger'])) {
    $sets[] = 'deger = ?';
    $params[] = clean($body['deger']);
}
if (isset($body['sira'])) {
    $sets[] = 'sira = ?';
    $params[] = (int)$body['sira'];
}
if (isset($body['aktif'])) {
    $sets[] = 'aktif = ?';
    $params[] = (int)$body['aktif'];
}

if (empty($sets)) json_error('Güncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE tanimlamalar SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'tanim_guncelle', "{$tanim['kategori']}: {$tanim['deger']}", 'tanimlamalar', $id);

json_success(null, 'Tanımlama güncellendi');
