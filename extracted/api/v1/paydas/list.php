<?php
/**
 * GET /api/v1/paydas/list.php
 * Paydaş listesi — arama, filtreleme, sayfalama
 * Komisyon toplamlarını dahil eder
 *
 * Query params: ?tur=avukat&durum=aktif&q=xyz&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Filtreler
$tur   = clean($_GET['tur'] ?? $_GET['tip'] ?? '');
$durum = clean($_GET['durum'] ?? '');
$arama = clean($_GET['q'] ?? $_GET['arama'] ?? '');

$where = [];
$params = [];

if ($tur !== '') {
    $where[] = 'p.tur = ?';
    $params[] = $tur;
}

if ($durum !== '') {
    $where[] = 'p.durum = ?';
    $params[] = $durum;
}

if ($arama !== '') {
    $search = "%$arama%";
    $where[] = '(p.ad LIKE ? OR p.yetkili LIKE ? OR p.telefon LIKE ? OR p.email LIKE ?)';
    $params = array_merge($params, [$search, $search, $search, $search]);
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM paydaslar p $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek — komisyon toplamları dahil
$stmt = $db->prepare("SELECT p.*,
    COALESCE((SELECT SUM(pk.tutar) FROM paydas_komisyonlari pk WHERE pk.paydas_id = p.id), 0) as toplam_komisyon,
    COALESCE((SELECT SUM(pk.tutar) FROM paydas_komisyonlari pk WHERE pk.paydas_id = p.id AND pk.durum = 'odendi'), 0) as odenen_komisyon,
    COALESCE((SELECT SUM(pk.tutar) FROM paydas_komisyonlari pk WHERE pk.paydas_id = p.id AND pk.durum = 'bekliyor'), 0) as bekleyen_komisyon
    FROM paydaslar p
    $whereSQL
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?");
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
