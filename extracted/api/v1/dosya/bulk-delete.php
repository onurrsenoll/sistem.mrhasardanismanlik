<?php
/**
 * POST /api/v1/dosya/bulk-delete.php
 * Toplu dosya sil (sadece admin)
 * Body: {ids: [1, 2, 3]}
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true);
$ids = $body['ids'] ?? [];

if (empty($ids) || !is_array($ids)) json_error('SİLİNECEK DOSYA SEÇİLMEDİ', 422);
if (count($ids) > 500) json_error('EN FAZLA 500 KAYIT SİLİNEBİLİR', 422);

$ids = array_map('intval', $ids);
$ids = array_filter($ids, fn($id) => $id > 0);
if (empty($ids)) json_error('GEÇERSİZ ID LİSTESİ', 422);

$silinen = 0;
$hatalar = [];

$db->exec("SET FOREIGN_KEY_CHECKS = 0");

foreach ($ids as $id) {
    try {
        $stmt = $db->prepare('SELECT id, dosya_no FROM dosyalar WHERE id = ?');
        $stmt->execute([$id]);
        $dosya = $stmt->fetch();
        if (!$dosya) { $hatalar[] = "ID $id bulunamadı"; continue; }

        // Evrak dosyalarını sunucudan sil
        $stmt = $db->prepare('SELECT dosya_yolu FROM evraklar WHERE dosya_id = ?');
        $stmt->execute([$id]);
        foreach ($stmt->fetchAll() as $evrak) {
            $filePath = UPLOAD_DIR . $evrak['dosya_yolu'];
            if (file_exists($filePath)) unlink($filePath);
        }

        $stmt = $db->prepare('DELETE FROM dosyalar WHERE id = ?');
        $stmt->execute([$id]);
        $silinen++;

        log_action($user['id'], 'dosya_toplu_sil', "Toplu silme: {$dosya['dosya_no']}", 'dosyalar', $id);
    } catch (Exception $e) {
        $hatalar[] = "ID $id: " . $e->getMessage();
    }
}

$db->exec("SET FOREIGN_KEY_CHECKS = 1");

json_success([
    'silinen' => $silinen,
    'hatalar' => $hatalar
], "$silinen DOSYA SİLİNDİ");
