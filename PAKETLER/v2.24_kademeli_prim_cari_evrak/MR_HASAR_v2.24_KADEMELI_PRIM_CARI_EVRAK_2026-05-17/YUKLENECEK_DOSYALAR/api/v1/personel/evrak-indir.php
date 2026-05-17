<?php
/**
 * GET /api/v1/personel/evrak-indir.php?id=X
 *
 * v2.24 — Personel evrakını indirir (auth zorunlu).
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) { http_response_code(422); echo 'id zorunlu'; exit; }

$stmt = $db->prepare('SELECT * FROM personel_evraklari WHERE id = ?');
$stmt->execute([$id]);
$e = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$e) { http_response_code(404); echo 'Evrak bulunamadı'; exit; }

$publicRoot = realpath(__DIR__ . '/../../../');
if (!$publicRoot) $publicRoot = $_SERVER['DOCUMENT_ROOT'] ?? __DIR__ . '/../../..';
$tamYol = rtrim($publicRoot, '/') . $e['dosya_yolu'];

if (!is_file($tamYol)) { http_response_code(404); echo 'Sunucuda dosya yok'; exit; }

header('Content-Type: ' . ($e['mime_type'] ?: 'application/octet-stream'));
header('Content-Length: ' . filesize($tamYol));
header('Content-Disposition: inline; filename="' . rawurlencode($e['dosya_adi']) . '"');
header('Cache-Control: private, max-age=0, must-revalidate');
readfile($tamYol);
exit;
