<?php
/**
 * GET /api/v1/evrak/download.php?id=1
 * Evrak indir (PDF)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// Bu endpoint dosya stream ettiği için JSON header koymuyoruz
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/auth.php';
$user = auth_required();

$evrakId = (int)($_GET['id'] ?? 0);
if (!$evrakId) {
    header('Content-Type: application/json');
    json_error('Evrak ID gerekli', 422);
}

$db = getDB();
$stmt = $db->prepare('SELECT * FROM evraklar WHERE id = ?');
$stmt->execute([$evrakId]);
$evrak = $stmt->fetch();

if (!$evrak) {
    header('Content-Type: application/json');
    json_error('Evrak bulunamadı', 404);
}

$filePath = UPLOAD_DIR . $evrak['dosya_yolu'];

if (!file_exists($filePath)) {
    header('Content-Type: application/json');
    json_error('Dosya sunucuda bulunamadı', 404);
}

// Dosyayı gönder
header('Content-Type: ' . $evrak['mime_type']);
header('Content-Disposition: attachment; filename="' . $evrak['dosya_adi'] . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: no-cache');

readfile($filePath);
exit;
