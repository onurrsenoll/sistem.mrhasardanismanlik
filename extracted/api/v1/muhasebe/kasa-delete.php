<?php
/**
 * DELETE /api/v1/muhasebe/kasa-delete.php?id=1
 * Kasa sil (Sadece Sistem Yöneticisi)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Kasa ID gerekli', 422);

// Kasa var mı kontrol et
$stmt = $db->prepare('SELECT id, ad FROM kasalar WHERE id = ?');
$stmt->execute([$id]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);

// Kasaya bağlı hareket var mı kontrol et
$stmt = $db->prepare('SELECT COUNT(*) as cnt FROM kasa_hareketleri WHERE kasa_id = ?');
$stmt->execute([$id]);
$cnt = (int)$stmt->fetch()['cnt'];

if ($cnt > 0) {
    // Önce kasaya bağlı hareketleri sil
    $stmt = $db->prepare('DELETE FROM kasa_hareketleri WHERE kasa_id = ?');
    $stmt->execute([$id]);
}

// Kasayı sil
$stmt = $db->prepare('DELETE FROM kasalar WHERE id = ?');
$stmt->execute([$id]);

log_action($user['id'], 'kasa_sil', "Kasa silindi: " . $kasa['ad'] . " (ID: $id, $cnt hareket de silindi)", 'kasalar', $id);

json_success(null, 'Kasa başarıyla silindi');
