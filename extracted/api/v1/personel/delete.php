<?php
/**
 * DELETE /api/v1/personel/delete.php?id=1
 * Personel sil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID GEREKLİ', 422);

$db = getDB();

$stmt = $db->prepare('SELECT * FROM personel WHERE id = ?');
$stmt->execute([$id]);
$personel = $stmt->fetch();
if (!$personel) json_error('PERSONEL BULUNAMADI', 404);

$stmt = $db->prepare('DELETE FROM personel WHERE id = ?');
$stmt->execute([$id]);

log_action($user['id'], 'personel_sil', "Personel silindi: " . $personel['ad_soyad'], 'personel', $id);

json_success(null, 'PERSONEL BAŞARIYLA SİLİNDİ');
