<?php
/**
 * GET /api/v1/sohbet/mesajlar.php?kisi_id=2
 * İki kullanıcı arasındaki mesajları getirir (çift yönlü)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$kisiId = isset($_GET['kisi_id']) ? (int)$_GET['kisi_id'] : 0;
if ($kisiId <= 0) json_error('kisi_id gerekli', 400);

$limit = min(100, max(10, intval(isset($_GET['limit']) ? $_GET['limit'] : 50)));

$stmt = $db->prepare("SELECT b.*, g.ad_soyad as gonderen_adi
    FROM bildirimler b
    LEFT JOIN users g ON g.id = b.gonderen_id
    WHERE b.tip = 'mesaj'
      AND ((b.gonderen_id = ? AND b.alici_id = ?) OR (b.gonderen_id = ? AND b.alici_id = ?))
    ORDER BY b.created_at ASC
    LIMIT ?");
$stmt->execute([$user['id'], $kisiId, $kisiId, $user['id'], $limit]);
$mesajlar = $stmt->fetchAll();

// Karşı taraftan gelen okunmamış mesajları okundu yap
$stmt2 = $db->prepare("UPDATE bildirimler SET okundu = 1 WHERE gonderen_id = ? AND alici_id = ? AND tip = 'mesaj' AND okundu = 0");
$stmt2->execute([$kisiId, $user['id']]);

json_success($mesajlar);
