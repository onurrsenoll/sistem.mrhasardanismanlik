<?php
/**
 * GET /api/v1/mail/get.php?id=1
 * Tek mail detayı (içerik dahil)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/mail_helper.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman', 'personel']);
$db = getDB();
mail_tablo_olustur($db);

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID GEREKLİ');

$stmt = $db->prepare("SELECT * FROM mailler WHERE id = ?");
$stmt->execute([$id]);
$mail = $stmt->fetch();

if (!$mail) json_error('MAIL BULUNAMADI', 404);

// Okundu olarak işaretle
if (!$mail['okundu']) {
    $db->prepare("UPDATE mailler SET okundu = 1 WHERE id = ?")->execute([$id]);
    $mail['okundu'] = 1;
}

json_success($mail);
