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

// ESKİ SİSTEM: eski_sistem kolonu migration (yoksa ekle)
try { $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS eski_sistem TINYINT(1) DEFAULT 0"); } catch (\Exception $e) {}

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

// Avukat ve diğer kısıtlı roller: yetki verilmişse tüm dosyaları görür, verilmemişse sadece kendi dosyalarını
if ($user['rol'] !== 'admin') {
    $dosyaYetkisi = false;
    try {
        // Hem eski 'goruntule' hem yeni 'dosya-liste' ve 'dosya-detay' anahtarlarını kontrol et
        $yStmt = $db->prepare("SELECT izin FROM yetkiler WHERE kullanici_id = ? AND modul = 'dosya' AND islem IN ('goruntule', 'dosya-liste', 'dosya-detay') AND izin = 1 LIMIT 1");
        $yStmt->execute([$user['id']]);
        $yRow = $yStmt->fetch();
        if ($yRow) $dosyaYetkisi = true;
    } catch (Exception $e) {}

    if (!$dosyaYetkisi) {
        // Yetkisi yoksa sadece kendi atanmış dosyalarını görsün
        $where[] = 'd.avukat_id = ?';
        $params[] = $user['id'];
    }
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
    COALESCE(ort.ad_soyad, avk.ad_soyad) AS avukat_adi,
    COALESCE(d.eski_sistem, 0) AS eski_sistem
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

// Özet istatistikler (filtrelere bağlı, tüm sayfalardaki toplam)
$statsSQL = "SELECT
    COUNT(*) as toplam,
    SUM(CASE WHEN v.dosya_turu = 'ADK' THEN 1 ELSE 0 END) as adk,
    SUM(CASE WHEN v.dosya_turu = 'BH' THEN 1 ELSE 0 END) as bh,
    SUM(CASE WHEN v.asama != 'DOSYA KAPANDI' OR v.asama IS NULL THEN 1 ELSE 0 END) as acik
    FROM v_dosya_ozet v LEFT JOIN dosyalar d ON d.dosya_no = v.dosya_no $whereSQL";
$stmtStats = $db->prepare($statsSQL);
$stmtStats->execute(array_slice($params, 0, count($params) - 2));
$stats = $stmtStats->fetch();

// Avukat rolü için hassas verileri gizle
if ($user['rol'] === 'avukat') {
    foreach ($items as &$item) {
        unset($item['avukat_adi']);
        unset($item['dosya_kaynagi']);
        unset($item['sorumlu_adi']);
    }
    unset($item);
}

json_success(array(
    'items' => $items,
    'pagination' => array(
        'page' => $pag['page'],
        'limit' => $pag['limit'],
        'total' => $total,
        'totalPages' => (int)ceil($total / $pag['limit'])
    ),
    'stats' => array(
        'toplam' => (int)($stats['toplam'] ?? 0),
        'adk' => (int)($stats['adk'] ?? 0),
        'bh' => (int)($stats['bh'] ?? 0),
        'acik' => (int)($stats['acik'] ?? 0)
    )
));
