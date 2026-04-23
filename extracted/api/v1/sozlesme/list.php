<?php
/**
 * GET /api/v1/sozlesme/list.php
 * Sözleşme listesi
 * Params: ?departman=saha&durum=taslak&q=arama&page=1&limit=25
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');
$user = auth_required(['admin']);
$db = getDB();

// Tablo yoksa oluştur (ilk çağrıda)
$db->exec("CREATE TABLE IF NOT EXISTS mr_sozlesmeler (
  id INT PRIMARY KEY AUTO_INCREMENT,
  belge_no VARCHAR(50) NOT NULL UNIQUE,
  personel_id INT NULL,
  departman ENUM('saha','ofis_cagri','ofis_diger','yonetim') NOT NULL,
  ad_soyad VARCHAR(200) NOT NULL,
  tc_kimlik VARCHAR(11) NOT NULL,
  dogum_tarihi DATE NULL,
  dogum_yeri VARCHAR(100) NULL,
  adres TEXT NULL,
  telefon VARCHAR(20) NULL,
  eposta VARCHAR(200) NULL,
  iban VARCHAR(50) NULL,
  kan_grubu VARCHAR(10) NULL,
  egitim VARCHAR(300) NULL,
  ehliyet_no VARCHAR(50) NULL,
  ehliyet_sinif VARCHAR(50) NULL,
  ehliyet_gecerlilik DATE NULL,
  pozisyon VARCHAR(200) NOT NULL,
  ise_baslama DATE NOT NULL,
  deneme_ay TINYINT NOT NULL DEFAULT 3,
  sabit_maas_net DECIMAL(12,2) NOT NULL,
  yemek_ucreti DECIMAL(8,2) NOT NULL DEFAULT 0,
  calisma_saati VARCHAR(100) NOT NULL DEFAULT 'Pazartesi-Cuma 09:00-18:00',
  prim_json JSON NULL,
  ek_haklar_json JSON NULL,
  ozel_notlar TEXT NULL,
  durum ENUM('taslak','onaylandi','imzalandi','arsivlendi') DEFAULT 'taslak',
  olusturan_id INT NULL,
  olusturma TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  guncelleme TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

$pag = get_pagination();

$where = [];
$params = [];

$departman = clean($_GET['departman'] ?? '');
$durum = clean($_GET['durum'] ?? '');
$q = clean($_GET['q'] ?? '');

if ($departman) { $where[] = 's.departman = ?'; $params[] = $departman; }
if ($durum) { $where[] = 's.durum = ?'; $params[] = $durum; }
if ($q) { $where[] = '(s.ad_soyad LIKE ? OR s.tc_kimlik LIKE ? OR s.belge_no LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; $params[] = "%$q%"; }

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam
$stmt = $db->prepare("SELECT COUNT(*) as total FROM mr_sozlesmeler s $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Liste
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare("SELECT s.*,
    (SELECT COUNT(*) FROM mr_sozlesme_arac_zimmet WHERE sozlesme_id = s.id) as arac_var
    FROM mr_sozlesmeler s
    $whereSQL
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?");
$stmt->execute($params);
$items = $stmt->fetchAll();

// JSON alanları decode et
foreach ($items as &$item) {
    if ($item['prim_json']) $item['prim_json'] = json_decode($item['prim_json'], true);
    if ($item['ek_haklar_json']) $item['ek_haklar_json'] = json_decode($item['ek_haklar_json'], true);
}
unset($item);

// İstatistikler
$stmt = $db->query("SELECT
    COUNT(*) as toplam,
    SUM(CASE WHEN durum='taslak' THEN 1 ELSE 0 END) as taslak,
    SUM(CASE WHEN durum='onaylandi' THEN 1 ELSE 0 END) as onaylandi,
    SUM(CASE WHEN durum='imzalandi' THEN 1 ELSE 0 END) as imzalandi,
    SUM(CASE WHEN durum='arsivlendi' THEN 1 ELSE 0 END) as arsivlendi
    FROM mr_sozlesmeler");
$stats = $stmt->fetch();

json_success([
    'items' => $items,
    'stats' => $stats,
    'pagination' => [
        'page' => $pag['page'],
        'limit' => $pag['limit'],
        'total' => $total,
        'totalPages' => ceil($total / $pag['limit'])
    ]
]);
