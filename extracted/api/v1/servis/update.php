<?php
/**
 * PUT /api/v1/servis/update.php
 * Servis güncelle
 * Body: { "id": 1, "firma_adi": "...", ... }
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

$stmt = $db->prepare('SELECT * FROM servisler WHERE id = ?');
$stmt->execute([$id]);
$servis = $stmt->fetch();
if (!$servis) json_error('Servis bulunamadı', 404);

$fields = ['firma_adi', 'yetkili_adi', 'telefon', 'telefon2', 'email', 'adres', 'il', 'ilce', 'vergi_no', 'hizmet_turleri', 'anlasma_kosullari', 'komisyon_orani', 'notlar', 'durum'];

$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if ($field === 'komisyon_orani') {
            $params[] = (float)$body[$field];
        } elseif ($field === 'hizmet_turleri') {
            $params[] = is_array($body[$field]) ? json_encode($body[$field], JSON_UNESCAPED_UNICODE) : clean($body[$field]);
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan bulunamadı', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE servisler SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'servis_guncelle', "Servis güncellendi: {$servis['firma_adi']}", 'servisler', $id);

json_success(['id' => $id], 'Servis güncellendi');
