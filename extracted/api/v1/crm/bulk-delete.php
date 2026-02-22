<?php
/**
 * POST /api/v1/crm/bulk-delete.php
 * Toplu CRM sil (sadece admin)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true);
$ids = $body['ids'] ?? [];

if (empty($ids) || !is_array($ids)) json_error('SİLİNECEK CRM KAYDI SEÇİLMEDİ', 422);
if (count($ids) > 500) json_error('EN FAZLA 500 KAYIT SİLİNEBİLİR', 422);

$ids = array_map('intval', $ids);
$ids = array_filter($ids, fn($id) => $id > 0);

$silinen = 0;
$hatalar = [];

foreach ($ids as $id) {
    try {
        $stmt = $db->prepare('SELECT id, ad_soyad FROM crm WHERE id = ?');
        $stmt->execute([$id]);
        $crm = $stmt->fetch();
        if (!$crm) { $hatalar[] = "ID $id bulunamadı"; continue; }

        $db->beginTransaction();
        $stmt = $db->prepare('DELETE FROM crm_notlari WHERE crm_id = ?');
        $stmt->execute([$id]);
        try { $stmt = $db->prepare('DELETE FROM crm_ekler WHERE crm_id = ?'); $stmt->execute([$id]); } catch (Exception $e2) {}
        $stmt = $db->prepare('DELETE FROM crm WHERE id = ?');
        $stmt->execute([$id]);
        $db->commit();
        $silinen++;

        log_action($user['id'], 'crm_toplu_sil', "Toplu silme: {$crm['ad_soyad']}", 'crm', $id);
    } catch (Exception $e) {
        try { $db->rollBack(); } catch (Exception $e2) {}
        $hatalar[] = "ID $id: " . $e->getMessage();
    }
}

json_success(['silinen' => $silinen, 'hatalar' => $hatalar], "$silinen CRM KAYDI SİLİNDİ");
