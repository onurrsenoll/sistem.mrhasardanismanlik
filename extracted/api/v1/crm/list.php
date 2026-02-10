<?php
/**
 * GET /api/v1/crm/list.php?q=arama&durum=Yeni&kaynak=Telefon
 * CRM kayıt listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$q = clean($_GET['q'] ?? '');
$durum = clean($_GET['durum'] ?? '');
$kaynak = clean($_GET['kaynak'] ?? '');
$atanan = (int)($_GET['atanan_id'] ?? 0);

$where = [];
$params = [];

if ($q !== '') {
    $search = "%$q%";
    $where[] = '(c.ad_soyad LIKE ? OR c.telefon LIKE ? OR c.email LIKE ? OR c.il LIKE ?)';
    $params = array_merge($params, [$search, $search, $search, $search]);
}

if ($durum !== '') {
    $where[] = 'c.durum = ?';
    $params[] = $durum;
}

if ($kaynak !== '') {
    $where[] = 'c.kaynak = ?';
    $params[] = $kaynak;
}

if ($atanan) {
    $where[] = 'c.atanan_id = ?';
    $params[] = $atanan;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT COUNT(*) as total FROM crm c $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

$stmt = $db->prepare("SELECT c.*, u.ad_soyad as atanan_adi, cb.ad_soyad as olusturan_adi,
    (SELECT COUNT(*) FROM crm_notlari cn WHERE cn.crm_id = c.id) as not_sayisi
    FROM crm c
    LEFT JOIN users u ON u.id = c.atanan_id
    LEFT JOIN users cb ON cb.id = c.created_by
    $whereSQL
    ORDER BY c.updated_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
