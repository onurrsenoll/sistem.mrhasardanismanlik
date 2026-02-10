<?php
/**
 * GET /api/v1/servis/get.php?id=1
 * Servis detayı — ihbar sayısı ve son ihbarlar dahil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Servis ID gerekli', 422);

// Servis bilgisi
$stmt = $db->prepare('SELECT * FROM servisler WHERE id = ?');
$stmt->execute([$id]);
$servis = $stmt->fetch();

if (!$servis) json_error('Servis bulunamadı', 404);

// İhbar sayısı
$stmt = $db->prepare('SELECT COUNT(*) as total FROM servis_ihbarlari WHERE servis_id = ?');
$stmt->execute([$id]);
$servis['ihbar_sayisi'] = (int)$stmt->fetch()['total'];

// Son ihbarlar (en yeni 10 tanesi)
$stmt = $db->prepare('SELECT si.*, d.dosya_no
    FROM servis_ihbarlari si
    LEFT JOIN dosyalar d ON d.id = si.dosya_id
    WHERE si.servis_id = ?
    ORDER BY si.created_at DESC
    LIMIT 10');
$stmt->execute([$id]);
$servis['son_ihbarlar'] = $stmt->fetchAll();

json_success($servis);
