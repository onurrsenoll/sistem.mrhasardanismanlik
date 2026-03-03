<?php
/**
 * POST /api/v1/mesaj/bulk-delete.php
 * Toplu mesaj sil (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
if (!has_yetki($user, 'mesajlar', 'mesaj-toplu-sil')) json_error('Bu işlem için yetkiniz bulunmamaktadır', 403);
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true);
$ids = $body['ids'] ?? [];

if (empty($ids) || !is_array($ids)) json_error('SİLİNECEK MESAJ SEÇİLMEDİ', 422);
if (count($ids) > 500) json_error('EN FAZLA 500 KAYIT SİLİNEBİLİR', 422);

$ids = array_map('intval', $ids);
$ids = array_filter($ids, fn($id) => $id > 0);

$silinen = 0;
$hatalar = [];

foreach ($ids as $id) {
    try {
        $stmt = $db->prepare('SELECT id, konu FROM mesajlar WHERE id = ?');
        $stmt->execute([$id]);
        $mesaj = $stmt->fetch();
        if (!$mesaj) { $hatalar[] = "ID $id bulunamadı"; continue; }

        $stmt = $db->prepare('DELETE FROM mesajlar WHERE id = ?');
        $stmt->execute([$id]);
        $silinen++;

        log_action($user['id'], 'mesaj_toplu_sil', "Toplu silme: {$mesaj['konu']}", 'mesajlar', $id);
    } catch (Exception $e) {
        $hatalar[] = "ID $id: " . $e->getMessage();
    }
}

json_success(['silinen' => $silinen, 'hatalar' => $hatalar], "$silinen MESAJ SİLİNDİ");
