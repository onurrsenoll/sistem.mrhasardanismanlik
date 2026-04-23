<?php
/**
 * GET /api/v1/arama-log/kayit-indir.php?id=1
 * Gorusme kaydi dosyasini indir/oynat
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

$user = auth_required();

ensure_arama_log_table();

$id = (int)($_GET['id'] ?? 0);
if (!$id) {
    http_response_code(400);
    echo 'ID gerekli';
    exit;
}

$db = getDB();
$stmt = $db->prepare('SELECT * FROM arama_loglari WHERE id = ?');
$stmt->execute([$id]);
$log = $stmt->fetch();

if (!$log || empty($log['kayit_dosya'])) {
    http_response_code(404);
    echo 'Kayit bulunamadi';
    exit;
}

if ($user['rol'] !== 'admin' && $log['kullanici_id'] != $user['id']) {
    http_response_code(403);
    echo 'Yetkisiz erisim';
    exit;
}

$filePath = dirname(__DIR__, 3) . '/uploads/arama-kayitlari/' . $log['kayit_dosya'];
if (!file_exists($filePath)) {
    http_response_code(404);
    echo 'Dosya bulunamadi';
    exit;
}

// MIME tipi belirle
$ext = pathinfo($log['kayit_dosya'], PATHINFO_EXTENSION);
$mimeMap = [
    'webm' => 'audio/webm',
    'ogg' => 'audio/ogg',
    'mp4' => 'audio/mp4',
    'mp3' => 'audio/mpeg',
    'wav' => 'audio/wav'
];
$mime = $mimeMap[$ext] ?? 'application/octet-stream';

// Inline modu (tarayici icinde oynat)
$mode = $_GET['mode'] ?? 'inline';
$disposition = ($mode === 'download') ? 'attachment' : 'inline';

header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($filePath));
header('Content-Disposition: ' . $disposition . '; filename="' . $log['kayit_dosya'] . '"');
header('Accept-Ranges: bytes');
header('Cache-Control: no-cache');

// Range destegi (ses oynaticilari icin)
if (isset($_SERVER['HTTP_RANGE'])) {
    $fileSize = filesize($filePath);
    $range = $_SERVER['HTTP_RANGE'];
    preg_match('/bytes=(\d+)-(\d*)/', $range, $matches);
    $start = (int)$matches[1];
    $end = !empty($matches[2]) ? (int)$matches[2] : $fileSize - 1;
    $length = $end - $start + 1;

    http_response_code(206);
    header("Content-Range: bytes $start-$end/$fileSize");
    header("Content-Length: $length");

    $fp = fopen($filePath, 'rb');
    fseek($fp, $start);
    echo fread($fp, $length);
    fclose($fp);
} else {
    readfile($filePath);
}
exit;
