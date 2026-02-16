<?php
/**
 * GET /api/v1/paydas/get.php?id=1
 * Paydaş detayı — komisyon özeti dahil
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Paydaş ID gerekli', 422);

// Paydaş bilgisi
$stmt = $db->prepare('SELECT * FROM paydaslar WHERE id = ?');
$stmt->execute([$id]);
$paydas = $stmt->fetch();

if (!$paydas) json_error('Paydaş bulunamadı', 404);

// Komisyon özeti
$stmt = $db->prepare("SELECT
    COALESCE(SUM(tutar), 0) as toplam_komisyon,
    COALESCE(SUM(CASE WHEN durum = 'odendi' THEN tutar ELSE 0 END), 0) as odenen_komisyon,
    COALESCE(SUM(CASE WHEN durum = 'bekliyor' THEN tutar ELSE 0 END), 0) as bekleyen_komisyon,
    COUNT(*) as toplam_kayit
    FROM paydas_komisyonlari WHERE paydas_id = ?");
$stmt->execute([$id]);
$komisyon = $stmt->fetch();
$paydas['toplam_komisyon'] = (float)$komisyon['toplam_komisyon'];
$paydas['odenen_komisyon'] = (float)$komisyon['odenen_komisyon'];
$paydas['bekleyen_komisyon'] = (float)$komisyon['bekleyen_komisyon'];
$paydas['komisyon_kayit_sayisi'] = (int)$komisyon['toplam_kayit'];

// Son komisyon kayıtları
$stmt = $db->prepare('SELECT pk.*, d.dosya_no
    FROM paydas_komisyonlari pk
    LEFT JOIN dosyalar d ON d.id = pk.dosya_id
    WHERE pk.paydas_id = ?
    ORDER BY pk.created_at DESC
    LIMIT 10');
$stmt->execute([$id]);
$paydas['son_komisyonlar'] = $stmt->fetchAll();

json_success($paydas);
