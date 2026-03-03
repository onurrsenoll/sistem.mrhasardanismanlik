<?php
/**
 * POST /api/v1/personel/bulk-delete.php
 * Toplu personel sil (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
if (!has_yetki($user, 'muhasebe', 'personel-toplu-sil')) json_error('Bu işlem için yetkiniz bulunmamaktadır', 403);
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true);
$ids = $body['ids'] ?? [];

if (empty($ids) || !is_array($ids)) json_error('SİLİNECEK PERSONEL SEÇİLMEDİ', 422);
if (count($ids) > 500) json_error('EN FAZLA 500 KAYIT SİLİNEBİLİR', 422);

$ids = array_map('intval', $ids);
$ids = array_filter($ids, fn($id) => $id > 0);

$silinen = 0;
$hatalar = [];

foreach ($ids as $id) {
    try {
        $stmt = $db->prepare('SELECT id, ad_soyad FROM personel WHERE id = ?');
        $stmt->execute([$id]);
        $p = $stmt->fetch();
        if (!$p) { $hatalar[] = "ID $id bulunamadı"; continue; }

        $stmt = $db->prepare('DELETE FROM personel WHERE id = ?');
        $stmt->execute([$id]);
        $silinen++;

        log_action($user['id'], 'personel_toplu_sil', "Toplu silme: {$p['ad_soyad']}", 'personel', $id);
    } catch (Exception $e) {
        $hatalar[] = "ID $id: " . $e->getMessage();
    }
}

json_success(['silinen' => $silinen, 'hatalar' => $hatalar], "$silinen PERSONEL SİLİNDİ");
