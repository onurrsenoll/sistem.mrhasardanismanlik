<?php
/**
 * GET /api/v1/police/tahsilat-list.php?police_id=1&baslangic=2026-01-01&bitis=2026-12-31
 * Poliçe tahsilat listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(); // v2.11: rol kısıtı kaldırıldı, yetki matrisi tek otorite
$db = getDB();

$policeId = (int)($_GET['police_id'] ?? 0);
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

$where = [];
$params = [];

if ($policeId > 0) {
    $where[] = 'pt.police_id = ?';
    $params[] = $policeId;
}

if ($baslangic !== '') {
    $where[] = 'pt.tahsilat_tarihi >= ?';
    $params[] = $baslangic;
}

if ($bitis !== '') {
    $where[] = 'pt.tahsilat_tarihi <= ?';
    $params[] = $bitis;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

/* v2.11: kolon adı 'islem_yapan_id' yanlıştı, doğrusu 'olusturan_id' */
$sql = "SELECT pt.*, p.police_no, p.musteri_adi, u.ad_soyad as islem_yapan_adi, k.ad as kasa_adi
    FROM police_tahsilatlar pt
    LEFT JOIN policeler p ON p.id = pt.police_id
    LEFT JOIN users u ON u.id = pt.olusturan_id
    LEFT JOIN kasalar k ON k.id = pt.kasa_id
    $whereSQL
    ORDER BY pt.tahsilat_tarihi DESC";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success(['items' => $items]);
