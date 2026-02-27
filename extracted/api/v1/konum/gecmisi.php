<?php
/**
 * GET /api/v1/konum/gecmisi.php
 * Bir kullanıcının belirli tarihteki konum geçmişini döner
 * Query params: ?kullanici_id=5&tarih=2025-06-15
 * Sadece admin erişebilir
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);
$db = getDB();

$kullanici_id = intval($_GET['kullanici_id'] ?? 0);
$tarih = clean($_GET['tarih'] ?? '');

if (!$kullanici_id) {
    json_error('kullanici_id gerekli', 422);
}

if (!$tarih || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $tarih)) {
    json_error('Geçerli tarih gerekli (YYYY-MM-DD)', 422);
}

// Tablo yoksa boş dön
try {
    $db->query("SELECT 1 FROM konum_kayitlari LIMIT 1");
} catch (Exception $e) {
    json_success([]);
}

// O günün konum kayıtlarını zaman sıralı getir
$sql = "SELECT
    k.id,
    k.enlem,
    k.boylam,
    k.dogruluk,
    k.hiz,
    k.yon,
    k.cihaz_tipi,
    k.ip_adresi,
    k.created_at as zaman
FROM konum_kayitlari k
WHERE k.kullanici_id = ?
AND DATE(k.created_at) = ?
ORDER BY k.created_at ASC";

$stmt = $db->prepare($sql);
$stmt->execute([$kullanici_id, $tarih]);
$items = $stmt->fetchAll();

json_success($items);
