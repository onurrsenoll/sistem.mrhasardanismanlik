<?php
/**
 * GET /api/v1/portal/erisim-list.php
 * Portal erişim listesi (Admin paneli için)
 * Params: ?dosya_id=X (opsiyonel), ?aktif=1/0 (opsiyonel)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('GET');
ensure_portal_tables();

$user = auth_required(['admin']);
$db = getDB();

$where = [];
$params = [];

// Dosya bazlı filtreleme
if (!empty($_GET['dosya_id'])) {
    $where[] = 'pe.dosya_id = ?';
    $params[] = (int)$_GET['dosya_id'];
}

// Aktiflik filtresi
if (isset($_GET['aktif'])) {
    $where[] = 'pe.aktif = ?';
    $params[] = (int)$_GET['aktif'];
}

// Arama
if (!empty($_GET['arama'])) {
    $where[] = '(pe.ad_soyad LIKE ? OR pe.telefon LIKE ? OR d.dosya_no LIKE ?)';
    $arama = '%' . $_GET['arama'] . '%';
    $params[] = $arama;
    $params[] = $arama;
    $params[] = $arama;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmtCount = $db->prepare("SELECT COUNT(*) as toplam FROM portal_erisim pe LEFT JOIN dosyalar d ON d.id = pe.dosya_id {$whereSQL}");
$stmtCount->execute($params);
$toplam = (int)$stmtCount->fetch()['toplam'];

// Pagination
$pagination = get_pagination();

// Liste
$stmtList = $db->prepare("
    SELECT pe.*, d.dosya_no, d.dosya_turu, d.asama,
           u.ad_soyad as olusturan_adi,
           (SELECT COUNT(*) FROM portal_mesajlar pm WHERE pm.dosya_id = pe.dosya_id AND pm.gonderen_tip = 'musteri' AND pm.okundu = 0) as okunmamis_mesaj
    FROM portal_erisim pe
    LEFT JOIN dosyalar d ON d.id = pe.dosya_id
    LEFT JOIN users u ON u.id = pe.olusturan_id
    {$whereSQL}
    ORDER BY pe.created_at DESC
    LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
");
$stmtList->execute($params);
$items = $stmtList->fetchAll();

// İstatistikler
$stmtStats = $db->query("SELECT
    COUNT(*) as toplam,
    SUM(CASE WHEN aktif = 1 THEN 1 ELSE 0 END) as aktif,
    SUM(CASE WHEN aktif = 0 THEN 1 ELSE 0 END) as pasif,
    SUM(CASE WHEN son_giris IS NOT NULL AND son_giris > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as son7gun_aktif
    FROM portal_erisim");
$stats = $stmtStats->fetch();

json_success([
    'items' => $items,
    'istatistik' => $stats,
    'pagination' => [
        'page' => $pagination['page'],
        'limit' => $pagination['limit'],
        'total' => $toplam,
        'totalPages' => ceil($toplam / $pagination['limit'])
    ]
]);
