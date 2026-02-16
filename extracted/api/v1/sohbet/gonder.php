<?php
/**
 * POST /api/v1/sohbet/gonder.php
 * Mesaj gönder
 * Body: { "alici_id": 2, "mesaj": "Merhaba..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['alici_id', 'mesaj']);

$db = getDB();
$aliciId = (int)$body['alici_id'];

// Alıcı var mı
$stmt = $db->prepare('SELECT id, ad_soyad FROM users WHERE id = ? AND aktif = 1');
$stmt->execute([$aliciId]);
$alici = $stmt->fetch();
if (!$alici) json_error('Kullanıcı bulunamadı', 404);

$mesaj = clean($body['mesaj']);
if (mb_strlen($mesaj) === 0) json_error('Mesaj boş olamaz', 400);

$stmt = $db->prepare('INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([
    $user['id'],
    $aliciId,
    $mesaj,
    $mesaj,
    'mesaj'
]);

$id = (int)$db->lastInsertId();

json_success([
    'id' => $id,
    'gonderen_id' => $user['id'],
    'alici_id' => $aliciId,
    'baslik' => $mesaj,
    'created_at' => date('Y-m-d H:i:s')
], 'Mesaj gönderildi', 201);
