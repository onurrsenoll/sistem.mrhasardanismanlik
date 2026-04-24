<?php
/**
 * GET /api/v1/saha/list.php
 * SAHA DOSYALARI LİSTESİ — ARAMA, FİLTRELEME, SAYFALAMA
 *
 * Query params: ?durum=beklemede&personel_id=5&arama=ali&page=1&limit=25
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

// auth_required() YETKI_MAP üzerinden crm/saha-liste yetkisini otomatik kontrol eder.
// Admin ise has_yetki() içinde bypass edilir.
$user = auth_required();
$db = getDB();
$pag = get_pagination();

// Veri kapsamı: 'crm/saha-tumunu-gor' izni varsa tüm personelin kayıtlarını, yoksa sadece kendi kayıtlarını görür.
// Admin: has_yetki() bypass'ı sayesinde otomatik true döner.
$tumuniGor = has_yetki($user, 'crm', 'saha-tumunu-gor');

// Auto-expire: 3 gün geçmiş onaylanan kayıtları suresi_doldu yap
try {
    $db->exec("UPDATE saha_dosyalar SET durum = 'suresi_doldu' WHERE durum = 'onaylandi' AND onay_tarihi IS NOT NULL AND onay_tarihi < DATE_SUB(NOW(), INTERVAL 3 DAY)");
} catch (\Exception $e) { /* İlk kurulumda ENUM henüz güncellenmemiş olabilir */ }

// Filtreler
$durum       = clean($_GET['durum'] ?? '');
$personel_id = clean($_GET['personel_id'] ?? '');
$arama       = clean($_GET['arama'] ?? '');

$where  = [];
$params = [];

// Yetki matrisi: "saha-tumunu-gor" izni olmayan kullanıcılar sadece kendi kayıtlarını görür.
if (!$tumuniGor) {
    $where[]  = 's.personel_id = ?';
    $params[] = $user['id'];
}

// Durum filtresi (virgülle ayrılmış çoklu durum desteği)
if ($durum !== '') {
    if (strpos($durum, ',') !== false) {
        $durumlar = array_map('trim', explode(',', $durum));
        $placeholders = implode(',', array_fill(0, count($durumlar), '?'));
        $where[]  = "s.durum IN ($placeholders)";
        $params   = array_merge($params, $durumlar);
    } else {
        $where[]  = 's.durum = ?';
        $params[] = $durum;
    }
}

// Personel ID filtresi (tümünü görebilenler için — admin, yönetici vb.)
if ($personel_id !== '' && $tumuniGor) {
    $where[]  = 's.personel_id = ?';
    $params[] = (int)$personel_id;
}

// Arama
if ($arama !== '') {
    $search   = "%$arama%";
    $where[]  = '(s.musteri_adi LIKE ? OR s.musteri_telefon LIKE ? OR s.arac_plaka LIKE ? OR s.musteri_tc LIKE ?)';
    $params   = array_merge($params, [$search, $search, $search, $search]);
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// Toplam sayı
$countSQL = "SELECT COUNT(*) as total FROM saha_dosyalar s $whereSQL";
$stmt = $db->prepare($countSQL);
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

// Veri çek
$dataSQL = "SELECT s.*,
    u.ad_soyad AS personel_adi,
    u2.ad_soyad AS onaylayan_adi,
    d.dosya_no
    FROM saha_dosyalar s
    LEFT JOIN users u ON u.id = s.personel_id
    LEFT JOIN users u2 ON u2.id = s.onaylayan_id
    LEFT JOIN dosyalar d ON d.id = s.dosya_id
    $whereSQL
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?";

$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare($dataSQL);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
