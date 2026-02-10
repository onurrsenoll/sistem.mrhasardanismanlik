<?php
/**
 * POST /api/v1/ajanda/create.php
 * Yeni ajanda/görev oluştur
 * Body: { "baslik": "...", "aciklama": "...", "tarih": "2026-02-15 10:00:00", "oncelik": "normal", "dosya_id": null }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['baslik', 'tarih']);

$db = getDB();

$oncelik = $body['oncelik'] ?? 'normal';
if (!in_array($oncelik, ['dusuk', 'normal', 'yuksek', 'acil'])) {
    $oncelik = 'normal';
}

$stmt = $db->prepare('INSERT INTO ajanda (kullanici_id, dosya_id, baslik, aciklama, tarih, bitis_tarihi, hatirlatma, oncelik, renk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $user['id'],
    !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null,
    clean($body['baslik']),
    clean($body['aciklama'] ?? ''),
    $body['tarih'],
    !empty($body['bitis_tarihi']) ? $body['bitis_tarihi'] : null,
    !empty($body['hatirlatma']) ? $body['hatirlatma'] : null,
    $oncelik,
    clean($body['renk'] ?? '#2563eb')
]);

$id = (int)$db->lastInsertId();

log_action($user['id'], 'ajanda_ekle', clean($body['baslik']), 'ajanda', $id);

json_success(['id' => $id], 'Görev oluşturuldu', 201);
