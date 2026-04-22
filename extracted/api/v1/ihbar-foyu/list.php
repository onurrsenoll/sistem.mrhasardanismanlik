<?php
/**
 * GET /api/v1/ihbar-foyu/list.php?q=...&plaka=...&page=1&limit=50
 * Kullanıcıya görünür kayıtları listeler (admin hepsini, diğerleri kendilerinin)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
ensure_ihbar_foyu_tables();
$pag = get_pagination();

$q = clean($_GET['q'] ?? '');
$plaka = clean($_GET['plaka'] ?? '');
$dosyaId = (int)($_GET['dosya_id'] ?? 0);

$where = [];
$params = [];

// Rol bazlı: admin/uzman/avukat/muhasebe tümünü; diğerleri sadece kendi oluşturdukları
if (!in_array($user['rol'], ['admin', 'uzman', 'avukat', 'muhasebe'], true)) {
    $where[] = 'kullanici_id = ?';
    $params[] = (int)$user['id'];
}
if ($q !== '') {
    $where[] = '(plaka LIKE ? OR sahip_ad LIKE ? OR dosya_no LIKE ? OR marka LIKE ?)';
    $s = '%' . $q . '%';
    array_push($params, $s, $s, $s, $s);
}
if ($plaka !== '') { $where[] = 'plaka = ?'; $params[] = $plaka; }
if ($dosyaId) { $where[] = 'dosya_id = ?'; $params[] = $dosyaId; }

$whereSql = !empty($where) ? ('WHERE ' . implode(' AND ', $where)) : '';

$stmt = $db->prepare("SELECT COUNT(*) c FROM hasar_ihbar $whereSql");
$stmt->execute($params);
$total = (int)$stmt->fetch()['c'];

$stmt = $db->prepare("SELECT h.id, h.plaka, h.marka, h.sahip_ad, h.sahip_tel, h.dosya_no, h.dosya_turu,
    h.sigorta, h.kaza_tarihi, h.dosya_id, h.created_at, u.ad_soyad as olusturan
    FROM hasar_ihbar h LEFT JOIN users u ON u.id = h.kullanici_id
    $whereSql ORDER BY h.id DESC LIMIT ? OFFSET ?");
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success([
    'items' => $items,
    'pagination' => [
        'page' => $pag['page'], 'limit' => $pag['limit'],
        'total' => $total, 'totalPages' => ceil($total / $pag['limit'])
    ]
]);
