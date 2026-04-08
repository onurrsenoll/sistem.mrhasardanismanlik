<?php
/**
 * POST /api/v1/crm/not-ekle.php
 * CRM kaydına not ekle
 * Body: { "crm_id": 1, "not_text": "Müşteriyle görüşüldü..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['crm_id', 'not_text']);

$db = getDB();
$crmId = (int)$body['crm_id'];

// CRM kaydı var mı
$stmt = $db->prepare('SELECT id, ad_soyad FROM crm WHERE id = ?');
$stmt->execute([$crmId]);
$crm = $stmt->fetch();
if (!$crm) json_error('CRM kaydı bulunamadı', 404);

$stmt = $db->prepare('INSERT INTO crm_notlari (crm_id, not_text, kullanici_id) VALUES (?, ?, ?)');
$stmt->execute([$crmId, clean($body['not_text']), $user['id']]);

$notId = (int)$db->lastInsertId();

// Son iletişim tarihini güncelle
$stmt = $db->prepare('UPDATE crm SET son_iletisim = CURDATE() WHERE id = ?');
$stmt->execute([$crmId]);

log_action($user['id'], 'crm_not_ekle', "CRM not eklendi: {$crm['ad_soyad']}", 'crm_notlari', $notId);

json_success(['not_id' => $notId], 'Not eklendi', 201);
