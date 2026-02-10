<?php
/**
 * POST /api/v1/bildirim/create.php
 * Bildirim/mesaj gönder
 * Body: { "alici_id": 2, "baslik": "...", "icerik": "...", "tip": "mesaj", "ilgili_dosya_id": null }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['alici_id', 'baslik']);

$db = getDB();
$aliciId = (int)$body['alici_id'];

// Alıcı var mı
$stmt = $db->prepare('SELECT id, ad_soyad FROM users WHERE id = ? AND aktif = 1');
$stmt->execute([$aliciId]);
$alici = $stmt->fetch();
if (!$alici) json_error('Alıcı bulunamadı', 404);

$tip = $body['tip'] ?? 'bildirim';
if (!in_array($tip, ['bildirim', 'mesaj', 'uyari', 'sistem'])) {
    $tip = 'bildirim';
}

$stmt = $db->prepare('INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, ilgili_dosya_id) VALUES (?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $user['id'],
    $aliciId,
    clean($body['baslik']),
    clean($body['icerik'] ?? ''),
    $tip,
    !empty($body['ilgili_dosya_id']) ? (int)$body['ilgili_dosya_id'] : null
]);

$id = (int)$db->lastInsertId();

json_success(['id' => $id], 'Bildirim gönderildi', 201);
