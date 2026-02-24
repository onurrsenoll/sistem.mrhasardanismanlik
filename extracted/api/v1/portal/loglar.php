<?php
/**
 * GET /api/v1/portal/loglar.php
 * Portal giriş ve işlem logları (KVKK uyumu)
 * Params: ?erisim_id=X, ?dosya_id=X
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

if (!empty($_GET['erisim_id'])) {
    $where[] = 'pl.portal_erisim_id = ?';
    $params[] = (int)$_GET['erisim_id'];
}

if (!empty($_GET['dosya_id'])) {
    $where[] = 'pl.dosya_id = ?';
    $params[] = (int)$_GET['dosya_id'];
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
$pagination = get_pagination();

$stmtCount = $db->prepare("SELECT COUNT(*) as toplam FROM portal_loglar pl {$whereSQL}");
$stmtCount->execute($params);
$toplam = (int)$stmtCount->fetch()['toplam'];

$stmtList = $db->prepare("
    SELECT pl.*, pe.ad_soyad, pe.telefon, d.dosya_no
    FROM portal_loglar pl
    LEFT JOIN portal_erisim pe ON pe.id = pl.portal_erisim_id
    LEFT JOIN dosyalar d ON d.id = pl.dosya_id
    {$whereSQL}
    ORDER BY pl.created_at DESC
    LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
");
$stmtList->execute($params);
$items = $stmtList->fetchAll();

paginated_response($items, $toplam, $pagination);
