<?php
/**
 * GET /api/v1/dosya/list.php
 * Dosya listesi — arama, filtreleme, sayfalama
 * 
 * Query params: ?q=arama&tur=ADK&asama=...&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Filtreler
$q      = clean($_GET['q'] ?? '');
$tur    = clean($_GET['tur'] ?? '');
$asama  = clean($_GET['asama'] ?? '');
$avukat = clean($_GET['avukat_id'] ?? '');
$kaynak = clean($_GET['kaynak'] ?? '');

$where = [];
$params = [];

if ($q !== '') {
    $search = "%$q%";
    $searchUpper = "%" . mb_strtoupper(preg_replace('/\s+/', '', $q), 'UTF-8') . "%";
    $where[] = '(v.magdur_adi LIKE ? OR v.tc_kimlik LIKE ? OR v.dosya_no LIKE ? OR v.plaka LIKE ? OR v.hasar_no LIKE ?)';
    $params = array_merge($params, [$search, $search, $search, $searchUpper, $search]);
}

if ($tur !== '') {
    $where[] = 'v.dosya_turu = ?';
    $params[] = $tur;
}

if ($asama !== '') {
    $where[] = 'v.asama = ?';
    $params[] = $asama;
}

if ($avukat !== '') {
    $where[] = 'd.avukat_id = ?';
    $params[] = (int)$avukat;
}

if ($kaynak !== '') {
    $where[] = 'd.dosya_kaynagi = ?';
    $params[] = $kaynak;
}

// Avukat rolü sadece kendi dosyalarını görür
if ($user['rol'] === 'avukat') {
    $where[] = 'd.avukat_id = ?';
    $params[] = $user['id'];
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$countSQL = "SELECT COUNT(*) as total FROM v_dosya_ozet v LEFT JOIN dosyalar d ON d.dosya_no = v.dosya_no $whereSQL";
$stmt = $db->prepare($countSQL);
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek — avukat_adi için ortaklar ve users tablosu açıkça JOIN edilir
// (v_dosya_ozet görünümü sunucuda eski kalabilir, bu JOIN güvenli çözüm sağlar)
$dataSQL = "SELECT v.*,
    COALESCE(ort.ad_soyad, avk.ad_soyad) AS avukat_adi
    FROM v_dosya_ozet v
    LEFT JOIN dosyalar d ON d.dosya_no = v.dosya_no
    LEFT JOIN ortaklar ort ON ort.id = d.ortak_id
    LEFT JOIN users avk ON avk.id = d.avukat_id
    $whereSQL ORDER BY v.created_at DESC LIMIT ? OFFSET ?";
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare($dataSQL);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
