<?php
/**
 * GET /api/v1/ortak/list.php
 * Ortak listesi — arama, filtreleme, sayfalama
 * Toplam ödeme tutarlarını dahil eder
 *
 * Query params: ?durum=aktif&q=xyz&page=1&limit=25
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
$arama = clean($_GET['q'] ?? $_GET['arama'] ?? '');
$il = clean($_GET['il'] ?? '');

$where = [];
$params = [];

if ($durum !== '') {
    $where[] = 'o.durum = ?';
    $params[] = $durum;
}

if ($il !== '') {
    $where[] = 'o.il = ?';
    $params[] = $il;
}

if ($arama !== '') {
    $search = "%$arama%";
    $where[] = '(o.ad_soyad LIKE ? OR o.firma LIKE ? OR o.telefon LIKE ? OR o.email LIKE ? OR o.baro LIKE ?)';
    $params = array_merge($params, [$search, $search, $search, $search, $search]);
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$stmt = $db->prepare("SELECT COUNT(*) as total FROM ortaklar o $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek — toplam ödeme tutarları dahil
$stmt = $db->prepare("SELECT o.*,
    COALESCE(k.ad, '') as kasa_adi,
    COALESCE((SELECT SUM(oh.tutar) FROM ortak_hareketleri oh WHERE oh.ortak_id = o.id AND oh.tur = 'odeme'), 0) as toplam_odeme,
    COALESCE((SELECT SUM(oh.tutar) FROM ortak_hareketleri oh WHERE oh.ortak_id = o.id AND oh.tur = 'tahsilat'), 0) as toplam_tahsilat
    FROM ortaklar o
    LEFT JOIN kasalar k ON k.id = o.kasa_id
    $whereSQL
    ORDER BY o.created_at DESC
    LIMIT {$pag['limit']} OFFSET {$pag['offset']}");
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
