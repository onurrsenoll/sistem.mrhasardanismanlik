<?php
/**
 * GET /api/v1/arama-log/list.php
 * Arama geçmişi listesi
 * Params: q, yon, durum, tarih_bas, tarih_son, page, limit, kullanici_id
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

// Tablo migration
ensure_arama_loglari_table();

$pag = get_pagination();

// Parametreleri al - hem eski hem yeni format destekle
$q = clean($_GET['q'] ?? '');
$yon = clean($_GET['yon'] ?? '');
$durum = clean($_GET['durum'] ?? '');
$tarih_bas = clean($_GET['tarih_bas'] ?? $_GET['baslangic'] ?? '');
$tarih_son = clean($_GET['tarih_son'] ?? $_GET['bitis'] ?? '');
$kullanici_id = clean($_GET['kullanici_id'] ?? '');

// Kolon adlarını al
$tarih_col = get_tarih_column();
$sure_col = get_sure_column();
$numara_col = get_numara_column();
$isim_col = get_isim_column();
$cols = get_table_columns();

$where = [];
$params = [];

// Arama filtresi
if ($q !== '') {
    $search = "%$q%";
    $searchWhere = [];
    if (in_array('arayan', $cols)) $searchWhere[] = 'a.arayan LIKE ?';
    if (in_array('aranan', $cols)) $searchWhere[] = 'a.aranan LIKE ?';
    if (in_array('numara', $cols)) $searchWhere[] = 'a.numara LIKE ?';
    if (in_array('arayan_adi', $cols)) $searchWhere[] = 'a.arayan_adi LIKE ?';
    if (in_array('musteri_adi', $cols)) $searchWhere[] = 'a.musteri_adi LIKE ?';
    if (!empty($searchWhere)) {
        $where[] = '(' . implode(' OR ', $searchWhere) . ')';
        $params = array_merge($params, array_fill(0, count($searchWhere), $search));
    }
}

// Yön filtresi
if ($yon !== '') {
    $where[] = 'a.yon = ?';
    $params[] = $yon;
}

// Durum filtresi
if ($durum !== '') {
    $where[] = 'a.durum = ?';
    $params[] = $durum;
}

// Tarih filtresi
if ($tarih_bas !== '') {
    $where[] = "a.$tarih_col >= ?";
    $params[] = $tarih_bas . ' 00:00:00';
}

if ($tarih_son !== '') {
    $where[] = "a.$tarih_col <= ?";
    $params[] = $tarih_son . ' 23:59:59';
}

// Kullanıcı filtresi (admin değilse sadece kendi kayıtlarını görsün)
if ($kullanici_id !== '' && $user['rol'] === 'admin') {
    $where[] = 'a.kullanici_id = ?';
    $params[] = (int)$kullanici_id;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

try {
    // Toplam kayıt sayısı
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM arama_loglari a $whereSQL");
    $stmt->execute($params);
    $total = (int)$stmt->fetch()['total'];

    // SELECT - tüm kolonları al + kullanıcı adı
    $sql = "SELECT a.*, u.ad_soyad as kullanici_adi
        FROM arama_loglari a
        LEFT JOIN users u ON u.id = a.kullanici_id
        $whereSQL
        ORDER BY a.$tarih_col DESC
        LIMIT ? OFFSET ?";

    $queryParams = array_merge($params, [(int)$pag['limit'], (int)$pag['offset']]);
    $stmt = $db->prepare($sql);
    $stmt->execute($queryParams);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Response'u frontend'in beklediği formata dönüştür
    $mapped = [];
    foreach ($items as $item) {
        $mapped[] = [
            'id' => $item['id'] ?? null,
            'arama_tarihi' => $item['arama_tarihi'] ?? $item['baslangic_zamani'] ?? $item['created_at'] ?? null,
            'yon' => $item['yon'] ?? 'gelen',
            'arayan' => $item['arayan'] ?? $item['numara'] ?? null,
            'aranan' => $item['aranan'] ?? null,
            'arayan_adi' => $item['arayan_adi'] ?? $item['musteri_adi'] ?? null,
            'durum' => $item['durum'] ?? 'cevapsiz',
            'sure' => (int)($item['sure'] ?? $item['sure_saniye'] ?? 0),
            'kullanici_adi' => $item['kullanici_adi'] ?? null,
            'notlar' => $item['notlar'] ?? null,
            'crm_id' => $item['crm_id'] ?? $item['musteri_kaynak_id'] ?? null,
            'kayit_dosya' => $item['kayit_dosya'] ?? null,
        ];
    }

    paginated_response($mapped, $total, $pag);
} catch (Exception $e) {
    json_error('Arama kayıtları yüklenemedi: ' . $e->getMessage(), 500);
}
