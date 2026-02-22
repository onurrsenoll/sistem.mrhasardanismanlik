<?php
/**
 * POST /api/v1/servis/bulk-delete.php
 * Toplu servis sil (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true);
$ids = $body['ids'] ?? [];

if (empty($ids) || !is_array($ids)) json_error('SİLİNECEK SERVİS SEÇİLMEDİ', 422);
if (count($ids) > 500) json_error('EN FAZLA 500 KAYIT SİLİNEBİLİR', 422);

$ids = array_map('intval', $ids);
$ids = array_filter($ids, fn($id) => $id > 0);

$silinen = 0;
$hatalar = [];

foreach ($ids as $id) {
    try {
        $stmt = $db->prepare('SELECT id, firma_adi FROM servisler WHERE id = ?');
        $stmt->execute([$id]);
        $servis = $stmt->fetch();
        if (!$servis) { $hatalar[] = "ID $id bulunamadı"; continue; }

        $stmt = $db->prepare('DELETE FROM servisler WHERE id = ?');
        $stmt->execute([$id]);
        $silinen++;

        log_action($user['id'], 'servis_toplu_sil', "Toplu silme: {$servis['firma_adi']}", 'servisler', $id);
    } catch (Exception $e) {
        $hatalar[] = "ID $id: " . $e->getMessage();
    }
}

json_success(['silinen' => $silinen, 'hatalar' => $hatalar], "$silinen SERVİS SİLİNDİ");
