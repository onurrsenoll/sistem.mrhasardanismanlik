<?php
/**
 * POST /api/v1/mesaj/create.php
 * Yeni mesaj gönder
 * Body: { "alici_id": 2, "konu": "...", "icerik": "...", "dosya_id": null }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['alici_id', 'konu', 'icerik']);

$db = getDB();
$aliciId = (int)$body['alici_id'];
$konu = clean($body['konu']);
$icerik = clean($body['icerik']);
$dosyaId = !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null;

// Kendine mesaj gönderemez
if ($aliciId === (int)$user['id']) {
    json_error('Kendinize mesaj gönderemezsiniz', 422);
}

// Alıcı kontrolü
$stmt = $db->prepare('SELECT id, ad_soyad, aktif FROM users WHERE id = ?');
$stmt->execute([$aliciId]);
$alici = $stmt->fetch();
if (!$alici) json_error('Alıcı bulunamadı', 404);
if (!$alici['aktif']) json_error('Alıcı hesabı aktif değil', 422);

// Dosya kontrolü
if ($dosyaId) {
    $stmt = $db->prepare('SELECT id FROM dosyalar WHERE id = ?');
    $stmt->execute([$dosyaId]);
    if (!$stmt->fetch()) json_error('Dosya bulunamadı', 404);
}

try {
    $stmt = $db->prepare('INSERT INTO mesajlar (gonderen_id, alici_id, dosya_id, konu, icerik, okundu) VALUES (?, ?, ?, ?, ?, 0)');
    $stmt->execute([
        $user['id'],
        $aliciId,
        $dosyaId,
        $konu,
        $icerik
    ]);
    $mesajId = (int)$db->lastInsertId();

    log_action($user['id'], 'mesaj_gonder', "Mesaj gönderildi: $konu → {$alici['ad_soyad']}", 'mesajlar', $mesajId);

    json_success(['id' => $mesajId], 'Mesaj gönderildi', 201);

} catch (\Exception $e) {
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
