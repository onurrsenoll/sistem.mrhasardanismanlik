<?php
/**
 * POST /api/v1/bildirim/create.php
 * Bildirim/mesaj gönder
 * Body: { "alici_id": 2, "baslik": "...", "icerik": "...", "tip": "mesaj", "ilgili_dosya_id": null }
 *
 * v2.7 (#026): okundu kolonu artık explicit olarak 0 ile set ediliyor.
 *   Önceki sürüm: INSERT'e okundu dahil değildi → kolon NULL kalabiliyor,
 *   bazı DB konfigürasyonlarında WHERE okundu=0 filtresi NULL satırları
 *   atlıyordu (sayım/listeleme yanlış oluyordu).
 *   Defansif çözüm: okundu=0 + created_at=NOW() açıkça yazılır.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Frontend 'hedef_id' gönderir, backend 'alici_id' bekler
if (!isset($body['alici_id']) && isset($body['hedef_id'])) {
    $body['alici_id'] = $body['hedef_id'];
}
// Frontend 'mesaj' gönderir, backend 'icerik' bekler
if (!isset($body['icerik']) && isset($body['mesaj'])) {
    $body['icerik'] = $body['mesaj'];
}
// Frontend 'tur' gönderir, backend 'tip' bekler
if (!isset($body['tip']) && isset($body['tur'])) {
    $body['tip'] = $body['tur'];
}

require_fields($body, ['alici_id', 'baslik']);

$db = getDB();
$aliciId = (int)$body['alici_id'];

// Alıcı var mı
$stmt = $db->prepare('SELECT id, ad_soyad FROM users WHERE id = ? AND aktif = 1');
$stmt->execute([$aliciId]);
$alici = $stmt->fetch();
if (!$alici) json_error('Alıcı bulunamadı', 404);

$tip = $body['tip'] ?? 'bildirim';
if (!in_array($tip, ['bildirim', 'mesaj', 'uyari', 'sistem', 'bilgi', 'basari', 'acil'])) {
    $tip = 'bildirim';
}

/* v2.7 (#026): okundu=0 + created_at NOW() explicit yazılır */
$stmt = $db->prepare(
    'INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, ilgili_dosya_id, okundu, created_at) '
  . 'VALUES (?, ?, ?, ?, ?, ?, 0, NOW())'
);
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
