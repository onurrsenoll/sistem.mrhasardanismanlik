<?php
/**
 * GET /api/v1/mail/list.php
 * Mail listesi
 * Params: ?hesap_id=1&klasor=INBOX&page=1&limit=25&okundu=0&arama=kelime
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/mail_helper.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman', 'personel']);
$db = getDB();
mail_tablo_olustur($db);

$pagination = get_pagination();
$where = '1=1';
$params = [];

if (!empty($_GET['hesap_id'])) {
    $where .= ' AND m.hesap_id = ?';
    $params[] = (int)$_GET['hesap_id'];
}

if (!empty($_GET['klasor'])) {
    $where .= ' AND m.klasor = ?';
    $params[] = $_GET['klasor'];
}

if (!empty($_GET['yon'])) {
    $where .= ' AND m.yon = ?';
    $params[] = $_GET['yon'];
}

if (isset($_GET['okundu']) && $_GET['okundu'] !== '') {
    $where .= ' AND m.okundu = ?';
    $params[] = (int)$_GET['okundu'];
}

if (isset($_GET['yildizli']) && $_GET['yildizli'] !== '') {
    $where .= ' AND m.yildizli = ?';
    $params[] = (int)$_GET['yildizli'];
}

if (!empty($_GET['arama'])) {
    $where .= ' AND (m.konu LIKE ? OR m.gonderen LIKE ? OR m.gonderen_adi LIKE ? OR m.icerik_text LIKE ?)';
    $s = '%' . $_GET['arama'] . '%';
    $params = array_merge($params, [$s, $s, $s, $s]);
}

// Toplam
$stmtCount = $db->prepare("SELECT COUNT(*) FROM mailler m WHERE $where");
$stmtCount->execute($params);
$total = (int)$stmtCount->fetchColumn();

// Okunmamış
$okunmamisWhere = $where . ' AND m.okundu = 0';
$stmtUnread = $db->prepare("SELECT COUNT(*) FROM mailler m WHERE $okunmamisWhere");
$stmtUnread->execute($params);
$okunmamis = (int)$stmtUnread->fetchColumn();

// Veriler (içerik hariç - performans)
$sql = "
    SELECT m.id, m.hesap_id, m.uid, m.klasor, m.gonderen, m.gonderen_adi, m.alici, m.cc, m.konu,
           LEFT(m.icerik_text, 200) AS ozet, m.tarih, m.okundu, m.yildizli, m.ek_sayisi, m.boyut, m.yon
    FROM mailler m
    WHERE $where
    ORDER BY m.tarih DESC
    LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}
";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success([
    'items' => $items,
    'okunmamis' => $okunmamis,
    'pagination' => [
        'page' => $pagination['page'],
        'limit' => $pagination['limit'],
        'total' => $total,
        'totalPages' => ceil($total / $pagination['limit'])
    ]
]);
