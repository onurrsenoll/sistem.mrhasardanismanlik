<?php
/**
 * GET /api/v1/sablon/get.php?id=1
 * Tek şablon detayı (tam içerik ile)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Şablon ID gerekli', 422);

$stmt = $db->prepare("SELECT s.*, u.ad_soyad as olusturan_adi
    FROM sablonlar s
    LEFT JOIN users u ON u.id = s.kullanici_id
    WHERE s.id = ?");
$stmt->execute([$id]);
$sablon = $stmt->fetch();

if (!$sablon) json_error('Şablon bulunamadı', 404);

// degiskenler JSON decode
if (!empty($sablon['degiskenler'])) {
    $decoded = json_decode($sablon['degiskenler'], true);
    $sablon['degiskenler'] = is_array($decoded) ? $decoded : [];
} else {
    $sablon['degiskenler'] = [];
}

json_success($sablon);
