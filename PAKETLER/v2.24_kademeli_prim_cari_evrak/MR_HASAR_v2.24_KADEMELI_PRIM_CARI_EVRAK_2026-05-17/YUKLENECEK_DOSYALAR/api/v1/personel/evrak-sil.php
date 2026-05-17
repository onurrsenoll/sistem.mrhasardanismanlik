<?php
/**
 * POST /api/v1/personel/evrak-sil.php  body: {id: X}
 *
 * v2.24 — Personel evrakını siler (DB + disk).
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = auth_required();
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$id = (int)($body['id'] ?? 0);
if (!$id) json_error('id zorunlu', 422);

$stmt = $db->prepare('SELECT * FROM personel_evraklari WHERE id = ?');
$stmt->execute([$id]);
$e = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$e) json_error('Evrak bulunamadı', 404);

$publicRoot = realpath(__DIR__ . '/../../../');
if (!$publicRoot) $publicRoot = $_SERVER['DOCUMENT_ROOT'] ?? __DIR__ . '/../../..';
$tamYol = rtrim($publicRoot, '/') . $e['dosya_yolu'];
if (is_file($tamYol)) @unlink($tamYol);

$stmt = $db->prepare('DELETE FROM personel_evraklari WHERE id = ?');
$stmt->execute([$id]);

json_success(['mesaj' => 'Evrak silindi']);
