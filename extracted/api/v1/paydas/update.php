<?php
/**
 * PUT /api/v1/paydas/update.php
 * Paydaş güncelle
 * Body: { "id": 1, "ad": "...", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

ensure_prim_columns();

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM paydaslar WHERE id = ?');
$stmt->execute([$id]);
$paydas = $stmt->fetch();
if (!$paydas) json_error('Paydaş bulunamadı', 404);

$fields = ['ad', 'tur', 'yetkili', 'telefon', 'telefon2', 'email', 'adres', 'il', 'ilce', 'vergi_no', 'iban', 'komisyon_orani', 'prim_adk', 'prim_bh', 'notlar', 'durum'];

$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if (in_array($field, ['komisyon_orani', 'prim_adk', 'prim_bh'])) {
            $params[] = (float)$body[$field];
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan bulunamadı', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE paydaslar SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'paydas_guncelle', "Paydaş güncellendi: {$paydas['ad']}", 'paydaslar', $id);

json_success(['id' => $id], 'Paydaş güncellendi');
