<?php
/**
 * GET /api/v1/police/get.php?id=1
 * Poliçe detayı (tahsilatlarıyla birlikte)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe', 'uzman']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Poliçe ID gerekli', 422);

$stmt = $db->prepare('SELECT p.*, u.ad_soyad as olusturan_adi
    FROM policeler p
    LEFT JOIN users u ON u.id = p.olusturan_id
    WHERE p.id = ?');
$stmt->execute([$id]);
$police = $stmt->fetch();
if (!$police) json_error('Poliçe bulunamadı', 404);

// Tahsilatları getir
$stmt = $db->prepare('SELECT pt.*, u.ad_soyad as olusturan_adi, k.ad as kasa_adi
    FROM police_tahsilatlar pt
    LEFT JOIN users u ON u.id = pt.olusturan_id
    LEFT JOIN kasalar k ON k.id = pt.kasa_id
    WHERE pt.police_id = ?
    ORDER BY pt.tahsilat_tarihi DESC');
$stmt->execute([$id]);
$police['tahsilatlar'] = $stmt->fetchAll();

json_success($police);
