<?php
/**
 * POST /api/v1/sozlesme/delete.php
 * Sözleşme sil
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = auth_required(['admin']);
$db = getDB();

$body = get_json_body();
require_fields($body, ['id']);
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT belge_no, ad_soyad FROM mr_sozlesmeler WHERE id = ?');
$stmt->execute([$id]);
$sozlesme = $stmt->fetch();
if (!$sozlesme) json_error('Sözleşme bulunamadı', 404);

// Araç zimmet otomatik silinir (CASCADE)
$db->prepare('DELETE FROM mr_sozlesmeler WHERE id = ?')->execute([$id]);

log_action($user['id'], 'sozlesme_sil', "Sözleşme silindi: {$sozlesme['belge_no']} - {$sozlesme['ad_soyad']}", 'mr_sozlesmeler', $id);
json_success(null, 'Sözleşme silindi');
