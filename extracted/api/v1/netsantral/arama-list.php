<?php
/**
 * GET /api/v1/netsantral/arama-list.php
 * NETSANTRAL ÇAĞRI GEÇMİŞİ LİSTESİ
 *
 * Query params:
 * - page (default: 1)
 * - limit (default: 50)
 * - yon (gelen|giden|hepsi)
 * - durum
 * - q (arama - arayan/aranan/arayan_adi)
 * - tarih_baslangic
 * - tarih_bitis
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = auth_required(['admin', 'uzman', 'personel', 'avukat']);
$db = getDB();

// PARAMETRELER
$page = max(1, intval($_GET['page'] ?? 1));
$limit = min(100, max(10, intval($_GET['limit'] ?? 50)));
$offset = ($page - 1) * $limit;
$yon = $_GET['yon'] ?? '';
$durum = $_GET['durum'] ?? '';
$q = trim($_GET['q'] ?? '');
$tarihBas = $_GET['tarih_baslangic'] ?? '';
$tarihBit = $_GET['tarih_bitis'] ?? '';

// SORGU OLUŞTUR
$where = [];
$params = [];

if ($yon && in_array($yon, ['gelen', 'giden'])) {
    $where[] = 'a.yon = ?';
    $params[] = $yon;
}

if ($durum) {
    $where[] = 'a.durum = ?';
    $params[] = $durum;
}

if ($q) {
    $where[] = '(a.arayan LIKE ? OR a.aranan LIKE ? OR a.arayan_adi LIKE ?)';
    $searchPattern = '%' . $q . '%';
    $params[] = $searchPattern;
    $params[] = $searchPattern;
    $params[] = $searchPattern;
}

if ($tarihBas) {
    $where[] = 'a.arama_tarihi >= ?';
    $params[] = $tarihBas . ' 00:00:00';
}

if ($tarihBit) {
    $where[] = 'a.arama_tarihi <= ?';
    $params[] = $tarihBit . ' 23:59:59';
}

$whereStr = $where ? 'WHERE ' . implode(' AND ', $where) : '';

// TOPLAM SAYISI
try {
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM arama_loglari a {$whereStr}");
    $stmt->execute($params);
    $total = (int)$stmt->fetch(PDO::FETCH_ASSOC)['total'];
} catch (Exception $e) {
    $total = 0;
}

$totalPages = max(1, ceil($total / $limit));

// KAYITLARI GETİR
$items = [];
try {
    $sql = "SELECT a.*,
            CASE WHEN a.crm_id IS NOT NULL THEN (SELECT ad_soyad FROM crm WHERE id = a.crm_id LIMIT 1) ELSE NULL END as crm_ad_soyad
            FROM arama_loglari a
            {$whereStr}
            ORDER BY a.id DESC
            LIMIT {$limit} OFFSET {$offset}";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {}

// İSTATİSTİKLER
$stats = ['toplam' => $total, 'gelen' => 0, 'giden' => 0, 'bugun' => 0, 'toplam_sure' => 0];
try {
    $stmt = $db->query("SELECT
        COUNT(*) as toplam,
        SUM(CASE WHEN yon = 'gelen' THEN 1 ELSE 0 END) as gelen,
        SUM(CASE WHEN yon = 'giden' THEN 1 ELSE 0 END) as giden,
        SUM(CASE WHEN DATE(arama_tarihi) = CURDATE() THEN 1 ELSE 0 END) as bugun,
        SUM(sure) as toplam_sure
        FROM arama_loglari");
    $statsRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($statsRow) {
        $stats['toplam'] = (int)$statsRow['toplam'];
        $stats['gelen'] = (int)$statsRow['gelen'];
        $stats['giden'] = (int)$statsRow['giden'];
        $stats['bugun'] = (int)$statsRow['bugun'];
        $stats['toplam_sure'] = (int)$statsRow['toplam_sure'];
    }
} catch (Exception $e) {}

json_success([
    'items' => $items,
    'stats' => $stats,
    'pagination' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'totalPages' => $totalPages
    ]
]);
