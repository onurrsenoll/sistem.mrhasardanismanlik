<?php
/**
 * GET /api/v1/muhasebe/mutabakat-getir.php?id=N veya ?donem=YYYY-MM
 * Kayıtlı bir raporu döner (dosyalar_json parse edilmiş halde)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
$donem = clean($_GET['donem'] ?? '');
if (!$id && !$donem) json_error('id veya donem gerekli', 422);

try {
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM aylik_mutabakat_raporlari WHERE id = ?");
        $stmt->execute([$id]);
    } else {
        $stmt = $db->prepare("SELECT * FROM aylik_mutabakat_raporlari WHERE donem = ?");
        $stmt->execute([$donem]);
    }
    $row = $stmt->fetch();
    if (!$row) json_error('Rapor bulunamadı', 404);

    $row['dosyalar'] = $row['dosyalar_json'] ? json_decode($row['dosyalar_json'], true) : [];
    unset($row['dosyalar_json']);

    json_success($row);
} catch (\Exception $e) {
    json_error('Hata: ' . $e->getMessage(), 500);
}
