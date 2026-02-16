<?php
/**
 * GET /api/v1/masraf/list.php?dosya_id=1
 * Masraf listesi — dosya bazlı veya tümü
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$dosyaId = (int)($_GET['dosya_id'] ?? 0);
$kasaId = (int)($_GET['kasa_id'] ?? 0);
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

$where = [];
$params = [];

if ($dosyaId) {
    $where[] = 'm.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($kasaId) {
    $where[] = 'm.kasa_id = ?';
    $params[] = $kasaId;
}

if ($baslangic !== '') {
    $where[] = 'm.islem_tarihi >= ?';
    $params[] = $baslangic;
}

if ($bitis !== '') {
    $where[] = 'm.islem_tarihi <= ?';
    $params[] = $bitis;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT COUNT(*) as total FROM masraflar m $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

$dataSQL = "SELECT m.*, k.ad as kasa_adi, u.ad_soyad as kullanici_adi, d.dosya_no
    FROM masraflar m
    LEFT JOIN kasalar k ON k.id = m.kasa_id
    LEFT JOIN users u ON u.id = m.kullanici_id
    LEFT JOIN dosyalar d ON d.id = m.dosya_id
    $whereSQL
    ORDER BY m.islem_tarihi DESC, m.id DESC
    LIMIT ? OFFSET ?";
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare($dataSQL);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
