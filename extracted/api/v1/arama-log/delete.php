<?php
/**
 * DELETE /api/v1/arama-log/delete.php?id=1
 * Arama logunu sil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('DELETE');

$user = auth_required();

ensure_arama_log_table();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID gerekli', 422);

$db = getDB();

// Kayit dosyasi varsa sil
$stmt = $db->prepare('SELECT kayit_dosya FROM arama_loglari WHERE id = ?');
$stmt->execute([$id]);
$log = $stmt->fetch();

if (!$log) json_error('Arama logu bulunamadi', 404);

if (!empty($log['kayit_dosya'])) {
    $filePath = dirname(__DIR__, 3) . '/uploads/arama-kayitlari/' . $log['kayit_dosya'];
    if (file_exists($filePath)) {
        unlink($filePath);
    }
}

$stmt = $db->prepare('DELETE FROM arama_loglari WHERE id = ?');
$stmt->execute([$id]);

json_success(null, 'Arama logu silindi');
