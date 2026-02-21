<?php
/**
 * GET /api/v1/saha/get.php?id=X
 * TEK SAHA DOSYASI DETAYI
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe', 'uzman', 'personel', 'avukat']);

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) json_error('GEÇERSİZ ID', 400);

$db = getDB();

$stmt = $db->prepare("SELECT s.*,
    u.ad_soyad AS personel_adi,
    u2.ad_soyad AS onaylayan_adi,
    d.dosya_no
    FROM saha_dosyalar s
    LEFT JOIN users u ON u.id = s.personel_id
    LEFT JOIN users u2 ON u2.id = s.onaylayan_id
    LEFT JOIN dosyalar d ON d.id = s.dosya_id
    WHERE s.id = ?");
$stmt->execute([$id]);
$row = $stmt->fetch();

if (!$row) json_error('KAYIT BULUNAMADI', 404);

// Personel sadece kendi kaydını görebilir
if ($user['rol'] === 'personel' && (int)$row['personel_id'] !== (int)$user['id']) {
    json_error('BU KAYDI GÖRME YETKİNİZ YOK', 403);
}

json_success($row);
