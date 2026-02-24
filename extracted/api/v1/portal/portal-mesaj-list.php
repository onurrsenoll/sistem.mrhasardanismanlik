<?php
/**
 * GET /api/v1/portal/portal-mesaj-list.php
 * Admin panelinden portal mesajlarını listele
 * Params: ?dosya_id=X (opsiyonel)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('GET');
ensure_portal_tables();

$user = auth_required(['admin', 'uzman', 'personel']);
$db = getDB();

$dosyaId = (int)($_GET['dosya_id'] ?? 0);

if ($dosyaId <= 0) {
    json_error('DOSYA ID GEREKLİ', 422);
}

$stmt = $db->prepare("
    SELECT pm.*,
           CASE WHEN pm.gonderen_tip = 'firma' THEN u.ad_soyad ELSE pe.ad_soyad END as gonderen_adi
    FROM portal_mesajlar pm
    LEFT JOIN users u ON u.id = pm.gonderen_id AND pm.gonderen_tip = 'firma'
    LEFT JOIN portal_erisim pe ON pe.id = pm.portal_erisim_id
    WHERE pm.dosya_id = ?
    ORDER BY pm.created_at ASC
");
$stmt->execute([$dosyaId]);
$mesajlar = $stmt->fetchAll();

// Müşteri mesajlarını okundu işaretle
$db->prepare("UPDATE portal_mesajlar SET okundu = 1 WHERE dosya_id = ? AND gonderen_tip = 'musteri' AND okundu = 0")->execute([$dosyaId]);

json_success($mesajlar);
