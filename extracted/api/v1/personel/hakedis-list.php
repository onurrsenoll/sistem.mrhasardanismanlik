<?php
/**
 * GET /api/v1/personel/hakedis-list.php
 * Hakediş listesi
 * Query params: ?personel_id=1&donem=2026-02&odeme_durumu=bekliyor
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

$personelId = (int)($_GET['personel_id'] ?? 0);
$donem = clean($_GET['donem'] ?? '');
$odemeDurumu = clean($_GET['odeme_durumu'] ?? '');

$where = [];
$params = [];

if ($personelId > 0) {
    $where[] = 'ph.personel_id = ?';
    $params[] = $personelId;
}

if ($donem !== '') {
    $where[] = 'ph.donem = ?';
    $params[] = $donem;
}

if ($odemeDurumu !== '') {
    $where[] = 'ph.odeme_durumu = ?';
    $params[] = $odemeDurumu;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$sql = "SELECT ph.*, p.ad_soyad as personel_adi, p.maas as personel_maas, p.prim_orani as personel_prim_orani
    FROM personel_hakedis ph
    LEFT JOIN personel p ON p.id = ph.personel_id
    $whereSQL
    ORDER BY ph.donem DESC, p.ad_soyad ASC";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success($items);
