<?php
/**
 * GET /api/v1/personel/list.php
 * Personel listesi — arama, filtreleme, sayfalama
 * Query params: ?q=arama&durum=aktif&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe', 'avukat', 'uzman', 'personel']);
$db = getDB();
$pag = get_pagination();

$q     = clean($_GET['q'] ?? '');
$durum = clean($_GET['durum'] ?? '');

$where = [];
$params = [];

if ($q !== '') {
    $search = "%$q%";
    $where[] = '(p.ad_soyad LIKE ? OR p.tc_kimlik LIKE ? OR p.telefon LIKE ? OR p.email LIKE ?)';
    $params = array_merge($params, [$search, $search, $search, $search]);
}

if ($durum !== '') {
    $where[] = 'p.durum = ?';
    $params[] = $durum;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$countSQL = "SELECT COUNT(*) as total FROM personel p $whereSQL";
$stmt = $db->prepare($countSQL);
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Avukat rolü için kısıtlı veri (sadece id ve ad_soyad)
if ($user['rol'] === 'avukat') {
    $dataSQL = "SELECT p.id, p.ad_soyad, p.pozisyon, p.departman
        FROM personel p
        $whereSQL
        ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    $params[] = (int)$pag['limit'];
    $params[] = (int)$pag['offset'];
    $stmt = $db->prepare($dataSQL);
    $stmt->execute($params);
    $items = $stmt->fetchAll();
    paginated_response($items, $total, $pag);
    exit;
}

// Veri çek
$dataSQL = "SELECT p.*,
    u.email as kullanici_email,
    u.aktif as kullanici_aktif,
    (SELECT COUNT(*) FROM personel_hakedis ph WHERE ph.personel_id = p.id) as hakedis_sayisi,
    (SELECT COALESCE(SUM(ph.toplam_hakedis), 0) FROM personel_hakedis ph WHERE ph.personel_id = p.id AND ph.odeme_durumu = 'odendi') as toplam_odenen
    FROM personel p
    LEFT JOIN users u ON u.id = p.user_id
    $whereSQL
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare($dataSQL);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
