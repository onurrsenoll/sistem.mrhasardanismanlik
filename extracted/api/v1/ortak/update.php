<?php
/**
 * PUT /api/v1/ortak/update.php
 * Ortak güncelle
 * Body: { "id": 1, "ad_soyad": "...", ... }
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

$stmt = $db->prepare('SELECT * FROM ortaklar WHERE id = ?');
$stmt->execute([$id]);
$ortak = $stmt->fetch();
if (!$ortak) json_error('Ortak bulunamadı', 404);

$fields = ['ad_soyad', 'firma', 'baro', 'sicil_no', 'telefon', 'telefon2', 'email', 'adres', 'il', 'iban', 'vergi_no', 'odeme_orani', 'kasa_id', 'notlar', 'durum'];

$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if ($field === 'odeme_orani') {
            $params[] = (float)$body[$field];
        } elseif ($field === 'kasa_id') {
            $params[] = !empty($body[$field]) ? (int)$body[$field] : null;
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan bulunamadı', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE ortaklar SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'ortak_guncelle', "Ortak güncellendi: {$ortak['ad_soyad']}", 'ortaklar', $id);

json_success(['id' => $id], 'Ortak güncellendi');
