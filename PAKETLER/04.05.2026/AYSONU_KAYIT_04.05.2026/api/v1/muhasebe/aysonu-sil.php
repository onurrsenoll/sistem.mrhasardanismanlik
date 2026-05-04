<?php
/**
 * POST /api/v1/muhasebe/aysonu-sil.php
 * Body: {id}
 * Sadece TASLAK raporlar silinebilir (KESİN ise önce taslağa çevrilmeli).
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

try {
    $stmt = $db->prepare("SELECT donem, baslik, durum FROM aylik_mutabakat_raporlari WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Rapor bulunamadı', 404);

    if ($row['durum'] === 'kesin' && empty($body['_force'])) {
        json_error('KESİN rapor silinemez. Önce taslağa çevirin.', 409);
    }

    $stmt = $db->prepare("DELETE FROM aylik_mutabakat_raporlari WHERE id = ?");
    $stmt->execute([$id]);

    log_action($user['id'], 'aysonu_silindi', $row['baslik'], 'aylik_mutabakat_raporlari', $id);
    json_success(['id' => $id], $row['baslik'] . ' silindi');
} catch (\Exception $e) {
    json_error('Silme hatası: ' . $e->getMessage(), 500);
}
