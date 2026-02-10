<?php
/**
 * POST /api/v1/crm/create.php
 * Yeni CRM kaydı (potansiyel müşteri) oluştur
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['ad_soyad']);

$db = getDB();

$stmt = $db->prepare('INSERT INTO crm (ad_soyad, telefon, telefon2, email, il, ilce, kaynak, dosya_turu, durum, not_text, atanan_id, son_iletisim, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    clean($body['ad_soyad']),
    clean($body['telefon'] ?? ''),
    clean($body['telefon2'] ?? ''),
    clean($body['email'] ?? ''),
    clean($body['il'] ?? ''),
    clean($body['ilce'] ?? ''),
    clean($body['kaynak'] ?? ''),
    clean($body['dosya_turu'] ?? ''),
    $body['durum'] ?? 'Yeni',
    clean($body['not_text'] ?? ''),
    !empty($body['atanan_id']) ? (int)$body['atanan_id'] : null,
    !empty($body['son_iletisim']) ? $body['son_iletisim'] : date('Y-m-d'),
    $user['id']
]);

$id = (int)$db->lastInsertId();

log_action($user['id'], 'crm_ekle', "CRM kaydı: " . clean($body['ad_soyad']), 'crm', $id);

json_success(['id' => $id], 'CRM kaydı oluşturuldu', 201);
