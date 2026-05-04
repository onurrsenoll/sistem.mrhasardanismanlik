<?php
/**
 * GET /api/v1/muhasebe/aysonu-getir.php?id=N
 * Kayıtlı bir raporu getirir (rapor_data JSON parse edilmiş halde).
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('id gerekli', 422);

try {
    $stmt = $db->prepare("SELECT * FROM aylik_mutabakat_raporlari WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Rapor bulunamadı', 404);

    $row['rapor_data_parsed'] = $row['rapor_data'] ? json_decode($row['rapor_data'], true) : null;

    json_success($row);
} catch (\Exception $e) {
    json_error('Hata: ' . $e->getMessage(), 500);
}
