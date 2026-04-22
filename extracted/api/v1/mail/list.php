<?php
/**
 * GET /api/v1/mail/list.php?hesap_id=&klasor=INBOX&yon=gelen&okundu=0&q=&page=&limit=
 * Mail mesajlarını listele (DB'den; IMAP sync'ten sonra).
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('GET');
mail_ensure_tables();

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$hesapId = (int)($_GET['hesap_id'] ?? 0);
$klasor = clean($_GET['klasor'] ?? '');
$yon = clean($_GET['yon'] ?? '');
$okundu = isset($_GET['okundu']) && $_GET['okundu'] !== '' ? (int)$_GET['okundu'] : null;
$q = clean($_GET['q'] ?? '');

$where = ['m.silindi = 0'];
$params = [];

// Yetki: admin tümü, diğer kullanıcılar kendi hesaplarındaki mailleri
if ($user['rol'] !== 'admin') {
    $where[] = 'h.kullanici_id = ?';
    $params[] = (int)$user['id'];
}
if ($hesapId) { $where[] = 'm.hesap_id = ?'; $params[] = $hesapId; }
if ($klasor) { $where[] = 'm.klasor = ?'; $params[] = $klasor; }
if ($yon && in_array($yon, ['gelen','giden'], true)) { $where[] = 'm.yon = ?'; $params[] = $yon; }
if ($okundu !== null) { $where[] = 'm.okundu = ?'; $params[] = $okundu; }
if ($q !== '') {
    $where[] = '(m.konu LIKE ? OR m.gonderen LIKE ? OR m.alici LIKE ? OR m.govde_text LIKE ?)';
    $s = '%' . $q . '%';
    array_push($params, $s, $s, $s, $s);
}
$whereSql = 'WHERE ' . implode(' AND ', $where);

$stmt = $db->prepare("SELECT COUNT(*) c FROM mail_mesajlar m JOIN mail_hesaplar h ON h.id = m.hesap_id $whereSql");
$stmt->execute($params);
$total = (int)$stmt->fetch()['c'];

$stmt = $db->prepare("SELECT m.id, m.hesap_id, m.yon, m.klasor, m.gonderen, m.alici, m.konu,
    LEFT(m.govde_text, 200) AS ozet, m.tarih, m.okundu, m.yildizli, h.email AS hesap_email
    FROM mail_mesajlar m JOIN mail_hesaplar h ON h.id = m.hesap_id
    $whereSql ORDER BY m.tarih DESC LIMIT ? OFFSET ?");
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt->execute($params);

json_success([
    'items' => $stmt->fetchAll(),
    'pagination' => [
        'page' => $pag['page'], 'limit' => $pag['limit'],
        'total' => $total, 'totalPages' => ceil($total / $pag['limit'])
    ]
]);
