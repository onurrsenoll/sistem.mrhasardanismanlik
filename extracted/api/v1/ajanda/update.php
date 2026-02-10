<?php
/**
 * PUT /api/v1/ajanda/update.php
 * Ajanda/görev güncelle
 * Body: { "id": 1, "tamamlandi": 1 } veya diğer alanlar
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

$stmt = $db->prepare('SELECT * FROM ajanda WHERE id = ? AND kullanici_id = ?');
$stmt->execute([$id, $user['id']]);
$gorev = $stmt->fetch();
if (!$gorev) json_error('Görev bulunamadı', 404);

$fields = ['baslik', 'aciklama', 'tarih', 'bitis_tarihi', 'hatirlatma', 'tamamlandi', 'oncelik', 'renk', 'dosya_id'];
$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if ($field === 'tamamlandi') {
            $params[] = (int)$body[$field];
        } elseif ($field === 'dosya_id') {
            $params[] = !empty($body[$field]) ? (int)$body[$field] : null;
        } elseif (in_array($field, ['tarih', 'bitis_tarihi', 'hatirlatma'])) {
            $params[] = !empty($body[$field]) ? $body[$field] : null;
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE ajanda SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'ajanda_guncelle', $gorev['baslik'], 'ajanda', $id);

json_success(null, 'Görev güncellendi');
