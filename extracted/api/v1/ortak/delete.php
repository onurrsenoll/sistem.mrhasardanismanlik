<?php
/**
 * DELETE /api/v1/ortak/delete.php?id=1
 * Ortak sil (sadece admin) — hareketleri varsa soft delete (durum=pasif)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('DELETE');

$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Ortak ID gerekli', 422);

$stmt = $db->prepare('SELECT id, ad_soyad FROM ortaklar WHERE id = ?');
$stmt->execute([$id]);
$ortak = $stmt->fetch();
if (!$ortak) json_error('Ortak bulunamadı', 404);

// Hareket kontrolü
$stmt = $db->prepare('SELECT COUNT(*) as total FROM ortak_hareketleri WHERE ortak_id = ?');
$stmt->execute([$id]);
$hareketSayisi = (int)$stmt->fetch()['total'];

if ($hareketSayisi > 0) {
    // Hareketleri varsa soft delete — durumu pasif yap
    $stmt = $db->prepare("UPDATE ortaklar SET durum = 'pasif' WHERE id = ?");
    $stmt->execute([$id]);

    log_action($user['id'], 'ortak_pasif', "Ortak pasife alındı (hareket mevcut): {$ortak['ad_soyad']}", 'ortaklar', $id);

    json_success(['id' => $id], 'Ortağın hareketleri bulunduğu için pasife alındı');
} else {
    // Hareketleri yoksa kalıcı sil
    $stmt = $db->prepare('DELETE FROM ortaklar WHERE id = ?');
    $stmt->execute([$id]);

    log_action($user['id'], 'ortak_sil', "Ortak silindi: {$ortak['ad_soyad']}", 'ortaklar', $id);

    json_success(null, 'Ortak silindi');
}
