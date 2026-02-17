<?php
/**
 * POST /api/v1/sms/gelen-okundu.php
 * Gelen SMS'i okundu olarak işaretle
 * Body: { "id": 1 } veya { "hepsi": true }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);

$db = getDB();
$body = get_json_body();

// Tümünü okundu yap
if (!empty($body['hepsi'])) {
    $stmt = $db->prepare("UPDATE gelen_smsler SET okundu = 1 WHERE okundu = 0");
    $stmt->execute();
    $etkilenen = $stmt->rowCount();
    log_action($user['id'], 'sms_toplu_okundu', "Tüm gelen SMS'ler okundu: {$etkilenen} adet", 'gelen_smsler');
    json_success(['etkilenen' => $etkilenen], "{$etkilenen} SMS OKUNDU OLARAK İŞARETLENDİ");
}

// Tekil okundu
if (empty($body['id'])) {
    json_error('SMS ID GEREKLİ', 422);
}

$id = (int)$body['id'];
$stmt = $db->prepare("UPDATE gelen_smsler SET okundu = 1 WHERE id = ?");
$stmt->execute([$id]);

if ($stmt->rowCount() === 0) {
    json_error('SMS BULUNAMADI', 404);
}

log_action($user['id'], 'sms_okundu', "Gelen SMS okundu: #{$id}", 'gelen_smsler');
json_success(null, 'SMS OKUNDU OLARAK İŞARETLENDİ');
