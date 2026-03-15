<?php
/**
 * GET /api/v1/arama-log/list.php
 * Arama loglarini listele
 * Params: ?yon=gelen|giden &durum=cevaplandi|cevapsiz &q=arama &tarih_bas=2025-01-01 &tarih_son=2025-12-31 &sayfa=1 &limit=50 &kullanici_id=1
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('GET');

$user = auth_required();

ensure_arama_log_table();

$db = getDB();

// Tablo var mi kontrol et - yoksa bos veri don
$tabloVar = false;
try {
    $db->query("SELECT 1 FROM arama_loglari LIMIT 1");
    $tabloVar = true;
} catch (\Exception $e) {
    error_log('[ARAMA-LOG] Tablo bulunamadi: ' . $e->getMessage());
}

if (!$tabloVar) {
    json_success([
        'items' => [],
        'toplam' => 0,
        'sayfa' => 1,
        'limit' => 50,
        'toplam_sayfa' => 0
    ]);
    exit;
}

$where = [];
$params = [];

// Admin tum kullanicilari gorebilir, diger kullanicilar sadece kendilerini
if ($user['rol'] !== 'admin') {
    $where[] = 'a.kullanici_id = ?';
    $params[] = $user['id'];
} else if (!empty($_GET['kullanici_id'])) {
    $where[] = 'a.kullanici_id = ?';
    $params[] = (int)$_GET['kullanici_id'];
}

// Yon filtresi
if (!empty($_GET['yon']) && in_array($_GET['yon'], ['gelen', 'giden'])) {
    $where[] = 'a.yon = ?';
    $params[] = $_GET['yon'];
}

// Durum filtresi
if (!empty($_GET['durum'])) {
    $where[] = 'a.durum = ?';
    $params[] = $_GET['durum'];
}

// Arama (numara veya musteri adi)
if (!empty($_GET['q'])) {
    $q = '%' . $_GET['q'] . '%';
    $where[] = '(a.numara LIKE ? OR a.musteri_adi LIKE ?)';
    $params[] = $q;
    $params[] = $q;
}

// Sadece kayitli gorusmeler
if (!empty($_GET['sadece_kayitli'])) {
    $where[] = "a.kayit_dosya IS NOT NULL AND a.kayit_dosya != ''";
}

// Tarih aralik
if (!empty($_GET['tarih_bas'])) {
    $where[] = 'a.baslangic_zamani >= ?';
    $params[] = $_GET['tarih_bas'] . ' 00:00:00';
}
if (!empty($_GET['tarih_son'])) {
    $where[] = 'a.baslangic_zamani <= ?';
    $params[] = $_GET['tarih_son'] . ' 23:59:59';
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Sayfalama
$limit = min((int)($_GET['limit'] ?? 50), 200);
$sayfa = max((int)($_GET['sayfa'] ?? 1), 1);
$offset = ($sayfa - 1) * $limit;

// Toplam kayit
$countSQL = "SELECT COUNT(*) FROM arama_loglari a $whereSQL";
$stmt = $db->prepare($countSQL);
$stmt->execute($params);
$toplam = (int)$stmt->fetchColumn();

// Liste
$listSQL = "SELECT a.*, u.ad_soyad as kullanici_adi
            FROM arama_loglari a
            LEFT JOIN users u ON a.kullanici_id = u.id
            $whereSQL
            ORDER BY a.baslangic_zamani DESC
            LIMIT $limit OFFSET $offset";

$stmt = $db->prepare($listSQL);
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success([
    'items' => $items,
    'toplam' => $toplam,
    'sayfa' => $sayfa,
    'limit' => $limit,
    'toplam_sayfa' => ceil($toplam / $limit)
]);
