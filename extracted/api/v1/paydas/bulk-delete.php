<?php
/**
 * POST /api/v1/paydas/bulk-delete.php
 * Toplu paydaş pasife al (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
if (!has_yetki($user, 'paydaslar', 'paydaslar-toplu-sil')) json_error('Bu işlem için yetkiniz bulunmamaktadır', 403);
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true);
$ids = $body['ids'] ?? [];

if (empty($ids) || !is_array($ids)) json_error('SİLİNECEK PAYDAŞ SEÇİLMEDİ', 422);
if (count($ids) > 500) json_error('EN FAZLA 500 KAYIT SİLİNEBİLİR', 422);

$ids = array_map('intval', $ids);
$ids = array_filter($ids, fn($id) => $id > 0);

$silinen = 0;
$hatalar = [];

foreach ($ids as $id) {
    try {
        $stmt = $db->prepare('SELECT id, ad FROM paydaslar WHERE id = ?');
        $stmt->execute([$id]);
        $paydas = $stmt->fetch();
        if (!$paydas) { $hatalar[] = "ID $id bulunamadı"; continue; }

        $stmt = $db->prepare("UPDATE paydaslar SET durum = 'pasif' WHERE id = ?");
        $stmt->execute([$id]);
        $silinen++;

        log_action($user['id'], 'paydas_toplu_sil', "Toplu pasife alma: {$paydas['ad']}", 'paydaslar', $id);
    } catch (Exception $e) {
        $hatalar[] = "ID $id: " . $e->getMessage();
    }
}

json_success(['silinen' => $silinen, 'hatalar' => $hatalar], "$silinen PAYDAŞ PASİFE ALINDI");
