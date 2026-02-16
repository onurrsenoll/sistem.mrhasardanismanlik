<?php
/**
 * GET /api/v1/sohbet/konusmalar.php
 * Kullanıcının mesajlaştığı kişilerin listesi (son mesajla birlikte)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

// Mesajlaşılan kişileri bul
$stmt = $db->prepare("
    SELECT
        u.id,
        u.ad_soyad,
        u.rol,
        (SELECT b2.baslik FROM bildirimler b2
         WHERE b2.tip = 'mesaj'
           AND ((b2.gonderen_id = ? AND b2.alici_id = u.id) OR (b2.gonderen_id = u.id AND b2.alici_id = ?))
         ORDER BY b2.created_at DESC LIMIT 1) as son_mesaj,
        (SELECT b3.created_at FROM bildirimler b3
         WHERE b3.tip = 'mesaj'
           AND ((b3.gonderen_id = ? AND b3.alici_id = u.id) OR (b3.gonderen_id = u.id AND b3.alici_id = ?))
         ORDER BY b3.created_at DESC LIMIT 1) as son_mesaj_tarih,
        (SELECT COUNT(*) FROM bildirimler b4
         WHERE b4.tip = 'mesaj' AND b4.gonderen_id = u.id AND b4.alici_id = ? AND b4.okundu = 0) as okunmamis
    FROM users u
    WHERE u.aktif = 1 AND u.id != ?
      AND (
        EXISTS (SELECT 1 FROM bildirimler bx WHERE bx.tip = 'mesaj' AND bx.gonderen_id = ? AND bx.alici_id = u.id)
        OR EXISTS (SELECT 1 FROM bildirimler bx WHERE bx.tip = 'mesaj' AND bx.gonderen_id = u.id AND bx.alici_id = ?)
      )
    ORDER BY son_mesaj_tarih DESC
");
$stmt->execute([$user['id'], $user['id'], $user['id'], $user['id'], $user['id'], $user['id'], $user['id'], $user['id']]);
$konusmalar = $stmt->fetchAll();

json_success($konusmalar);
