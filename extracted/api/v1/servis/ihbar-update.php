<?php
/**
 * PUT /api/v1/servis/ihbar-update.php
 * İhbar güncelle
 * Body: { "id": 1, "durum": "tamamlandi", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM servis_ihbarlari WHERE id = ?');
$stmt->execute([$id]);
$ihbar = $stmt->fetch();
if (!$ihbar) json_error('İhbar bulunamadı', 404);

$fields = ['durum', 'ihbar_turu', 'plaka', 'arac_bilgi', 'hasar_aciklama', 'asistans_durumu', 'notlar', 'dosya_id'];

$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if ($field === 'dosya_id') {
            $params[] = !empty($body[$field]) ? (int)$body[$field] : null;
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan bulunamadı', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE servis_ihbarlari SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'ihbar_guncelle', "İhbar güncellendi: #$id", 'servis_ihbarlari', $id);

json_success(['id' => $id], 'İhbar güncellendi');
