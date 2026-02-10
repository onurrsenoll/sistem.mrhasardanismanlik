<?php
/**
 * POST /api/v1/muhasebe/kasa-create.php
 * Yeni kasa/banka hesabı oluştur
 * Body: { "ad": "Yeni Kasa", "tip": "Banka", "banka_adi": "...", "hesap_no": "...", "iban": "...", "bakiye": 0 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['ad', 'tip']);

$db = getDB();

$tip = clean($body['tip']);
if (!in_array($tip, ['Nakit', 'Banka'])) {
    json_error('Geçersiz kasa tipi. Nakit veya Banka olmalı', 422);
}

$stmt = $db->prepare('INSERT INTO kasalar (ad, tip, banka_adi, hesap_no, iban, bakiye, aktif) VALUES (?, ?, ?, ?, ?, ?, 1)');
$stmt->execute([
    clean($body['ad']),
    $tip,
    clean($body['banka_adi'] ?? ''),
    clean($body['hesap_no'] ?? ''),
    clean($body['iban'] ?? ''),
    (float)($body['bakiye'] ?? 0)
]);

$id = (int)$db->lastInsertId();

log_action($user['id'], 'kasa_olustur', "Kasa oluşturuldu: " . clean($body['ad']), 'kasalar', $id);

json_success(['id' => $id], 'Kasa oluşturuldu', 201);
