<?php
/**
 * GET /api/v1/ortak/list.php
 * Ortak listesi — arama, filtreleme, sayfalama
 * Toplam pay tutarlarını dahil eder
 *
 * Query params: ?durum=aktif&arama=xyz&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Filtreler
$durum = clean($_GET['durum'] ?? '');
$arama = clean($_GET['arama'] ?? '');

$where = [];
$params = [];

if ($durum !== '') {
    $where[] = 'o.durum = ?';
    $params[] = $durum;
}

if ($arama !== '') {
    $search = "%$arama%";
    $where[] = '(o.ad_soyad LIKE ? OR o.unvan LIKE ? OR o.telefon LIKE ? OR o.email LIKE ?)';
    $params = array_merge($params, [$search, $search, $search, $search]);
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM ortaklar o $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek — toplam pay tutarları dahil
$stmt = $db->prepare("SELECT o.*,
    COALESCE((SELECT SUM(oh.tutar) FROM ortak_hareketleri oh WHERE oh.ortak_id = o.id AND oh.islem_turu = 'pay'), 0) as toplam_pay,
    COALESCE((SELECT SUM(oh.tutar) FROM ortak_hareketleri oh WHERE oh.ortak_id = o.id AND oh.islem_turu = 'odeme'), 0) as toplam_odeme
    FROM ortaklar o
    $whereSQL
    ORDER BY o.created_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
