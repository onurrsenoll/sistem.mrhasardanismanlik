<?php
/**
 * GET /api/v1/mesaj/giden.php
 * Gönderilen mesajlar listesi (gonderen_id = current user)
 * Params: page, limit
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Toplam kayıt
$stmt = $db->prepare('SELECT COUNT(*) as total FROM mesajlar WHERE gonderen_id = ?');
$stmt->execute([$user['id']]);
$total = (int)$stmt->fetch()['total'];

// Liste
$stmt = $db->prepare("SELECT m.*, a.ad_soyad as alici_adi
    FROM mesajlar m
    LEFT JOIN users a ON a.id = m.alici_id
    WHERE m.gonderen_id = ?
    ORDER BY m.id DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute([$user['id']]);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
