<?php
/**
 * GET /api/v1/mesaj/get.php?id=1
 * Tek mesaj detayı
 * Alıcı current user ise otomatik okundu olarak işaretle
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Mesaj ID gerekli', 422);

// Mesajı getir
$stmt = $db->prepare("SELECT m.*,
    g.ad_soyad as gonderen_adi, g.email as gonderen_email,
    a.ad_soyad as alici_adi, a.email as alici_email,
    d.dosya_no
    FROM mesajlar m
    LEFT JOIN users g ON g.id = m.gonderen_id
    LEFT JOIN users a ON a.id = m.alici_id
    LEFT JOIN dosyalar d ON d.id = m.dosya_id
    WHERE m.id = ?");
$stmt->execute([$id]);
$mesaj = $stmt->fetch();

if (!$mesaj) json_error('Mesaj bulunamadı', 404);

// Sadece gönderen veya alıcı görebilir
if ($mesaj['gonderen_id'] != $user['id'] && $mesaj['alici_id'] != $user['id']) {
    json_error('Bu mesajı görme yetkiniz yok', 403);
}

// Alıcı ise ve henüz okunmamışsa okundu olarak işaretle
if ($mesaj['alici_id'] == $user['id'] && !$mesaj['okundu']) {
    $stmt = $db->prepare('UPDATE mesajlar SET okundu = 1, okunma_tarihi = NOW() WHERE id = ?');
    $stmt->execute([$id]);
    $mesaj['okundu'] = 1;
    $mesaj['okunma_tarihi'] = date('Y-m-d H:i:s');
}

json_success($mesaj);
