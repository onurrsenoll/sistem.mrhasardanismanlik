<?php
/**
 * GET /api/v1/konum/listele.php
 * Tüm kullanıcıların son konum bilgilerini döner
 * Sadece admin erişebilir
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);
$db = getDB();

// Tablo yoksa boş dön
try {
    $db->query("SELECT 1 FROM konum_kayitlari LIMIT 1");
} catch (Exception $e) {
    json_success([]);
}

// Her kullanıcının en son konum kaydını çek
$sql = "SELECT
    u.id,
    u.id as kullanici_id,
    u.ad_soyad,
    u.email,
    u.rol,
    u.avatar,
    u.aktif,
    k.enlem,
    k.boylam,
    k.dogruluk,
    k.hiz,
    k.yon,
    k.cihaz_tipi,
    k.ip_adresi,
    k.created_at as son_konum_zamani
FROM users u
LEFT JOIN (
    SELECT k1.*
    FROM konum_kayitlari k1
    INNER JOIN (
        SELECT kullanici_id, MAX(created_at) as max_zaman
        FROM konum_kayitlari
        GROUP BY kullanici_id
    ) k2 ON k1.kullanici_id = k2.kullanici_id AND k1.created_at = k2.max_zaman
) k ON k.kullanici_id = u.id
WHERE u.aktif = 1
ORDER BY k.created_at DESC, u.ad_soyad ASC";

$stmt = $db->prepare($sql);
$stmt->execute();
$items = $stmt->fetchAll();

json_success($items);
