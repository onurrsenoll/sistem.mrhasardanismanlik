<?php
/**
 * PUT /api/v1/muhasebe/kasa-update.php
 * Kasa bilgilerini güncelle
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

$stmt = $db->prepare('SELECT * FROM kasalar WHERE id = ?');
$stmt->execute([$id]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);

$fields = ['ad', 'tip', 'banka_adi', 'hesap_no', 'iban', 'aktif'];
$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if ($field === 'aktif') {
            $params[] = (int)$body[$field];
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE kasalar SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'kasa_guncelle', "Kasa güncellendi: {$kasa['ad']}", 'kasalar', $id);

json_success(null, 'Kasa güncellendi');
