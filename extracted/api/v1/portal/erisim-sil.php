<?php
/**
 * DELETE /api/v1/portal/erisim-sil.php?id=X
 * Portal erişimini sil (sadece admin)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('DELETE');
ensure_portal_tables();

$user = auth_required(['admin']);
$erisimId = (int)($_GET['id'] ?? 0);

if ($erisimId <= 0) {
    json_error('ERİŞİM ID GEREKLİ', 422);
}

$db = getDB();

$stmt = $db->prepare("SELECT pe.*, d.dosya_no FROM portal_erisim pe LEFT JOIN dosyalar d ON d.id = pe.dosya_id WHERE pe.id = ?");
$stmt->execute([$erisimId]);
$erisim = $stmt->fetch();

if (!$erisim) {
    json_error('ERİŞİM KAYDI BULUNAMADI', 404);
}

// Soft delete yerine aktif = 0 yap (KVKK - veri silinmemeli, anonim tutulmalı)
$db->prepare("UPDATE portal_erisim SET aktif = 0 WHERE id = ?")->execute([$erisimId]);

log_action($user['id'], 'portal_erisim_sil', "Portal erişimi kapatıldı: {$erisim['dosya_no']} - {$erisim['ad_soyad']}", 'portal_erisim', $erisimId);
portal_logla($erisimId, $erisim['dosya_id'], 'erisim_kapatildi', $user['ad_soyad'] . ' tarafından kapatıldı');

json_success(null, 'PORTAL ERİŞİMİ KAPATILDI');
