<?php
/**
 * GET /api/v1/police/list.php
 * Poliçe listesi - filtre, arama ve sayfalama destekli
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(); // v2.11: rol kısıtı kaldırıldı, yetki matrisi tek otorite
$db = getDB();
$pag = get_pagination();

$durum = clean($_GET['durum'] ?? '');
$sigorta_sirketi = clean($_GET['sigorta_sirketi'] ?? '');
$brans = clean($_GET['brans'] ?? '');
$tahsilat_durumu = clean($_GET['tahsilat_durumu'] ?? '');
$arama = clean($_GET['arama'] ?? '');
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

$where = [];
$params = [];

if ($durum !== '') {
    $where[] = 'p.durum = ?';
    $params[] = $durum;
}

if ($sigorta_sirketi !== '') {
    $where[] = 'p.sigorta_sirketi = ?';
    $params[] = $sigorta_sirketi;
}

if ($brans !== '') {
    $where[] = 'p.brans = ?';
    $params[] = $brans;
}

if ($tahsilat_durumu !== '') {
    $where[] = 'p.tahsilat_durumu = ?';
    $params[] = $tahsilat_durumu;
}

if ($arama !== '') {
    $search = "%$arama%";
    $where[] = '(p.police_no LIKE ? OR p.musteri_adi LIKE ? OR p.plaka LIKE ?)';
    $params = array_merge($params, [$search, $search, $search]);
}

if ($baslangic !== '') {
    $where[] = 'p.tanzim_tarihi >= ?';
    $params[] = $baslangic;
}

if ($bitis !== '') {
    $where[] = 'p.tanzim_tarihi <= ?';
    $params[] = $bitis;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM policeler p $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Liste
$sql = "SELECT p.*, u.ad_soyad as olusturan_adi
    FROM policeler p
    LEFT JOIN users u ON u.id = p.olusturan_id
    $whereSQL
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?";
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
