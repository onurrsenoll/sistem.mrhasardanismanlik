<?php
/**
 * GET /api/v1/saha/medya-download.php?id=X
 * SAHA DOSYA MEDYA İNDİR / ÖNİZLE
 * ?mode=inline → tarayıcıda göster
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe', 'uzman', 'personel', 'avukat']);

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) json_error('GEÇERSİZ ID', 400);

$mode = $_GET['mode'] ?? 'attachment';

$db = getDB();

$stmt = $db->prepare("SELECT m.*, s.personel_id FROM saha_dosya_medya m JOIN saha_dosyalar s ON s.id = m.saha_dosya_id WHERE m.id = ?");
$stmt->execute([$id]);
$medya = $stmt->fetch();

if (!$medya) json_error('MEDYA BULUNAMADI', 404);

// Personel sadece kendi dosyasını görebilir
if ($user['rol'] === 'personel' && (int)$medya['personel_id'] !== (int)$user['id']) {
    json_error('BU DOSYAYI GÖRME YETKİNİZ YOK', 403);
}

// Dosya yolunu bul
$dosyaYolu = $medya['dosya_yolu'];
$fullPath = UPLOAD_DIR . $dosyaYolu;

if (!file_exists($fullPath)) {
    // Alternatif yolları dene
    $altPath = UPLOAD_DIR . '/' . $dosyaYolu;
    if (file_exists($altPath)) {
        $fullPath = $altPath;
    } else {
        json_error('DOSYA BULUNAMADI', 404);
    }
}

$mimeType = $medya['mime_type'] ?: 'application/octet-stream';
$dosyaAdi = $medya['dosya_adi'] ?: 'dosya';

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($fullPath));

if ($mode === 'inline') {
    header('Content-Disposition: inline; filename="' . $dosyaAdi . '"');
} else {
    header('Content-Disposition: attachment; filename="' . $dosyaAdi . '"');
}

header('Cache-Control: private, max-age=3600');

// Remove JSON content-type set by setup_headers
header_remove('Access-Control-Allow-Origin');
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
header('Access-Control-Allow-Origin: ' . $origin);

readfile($fullPath);
exit;
