<?php
/**
 * GET /api/v1/crm/get.php?id=1
 * CRM kayıt detayı (notlarıyla birlikte)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('CRM ID gerekli', 422);

$stmt = $db->prepare('SELECT c.*, u.ad_soyad as atanan_adi, cb.ad_soyad as olusturan_adi
    FROM crm c
    LEFT JOIN users u ON u.id = c.atanan_id
    LEFT JOIN users cb ON cb.id = c.created_by
    WHERE c.id = ?');
$stmt->execute([$id]);
$crm = $stmt->fetch();
if (!$crm) json_error('CRM kaydı bulunamadı', 404);

// Notları getir
$stmt = $db->prepare('SELECT cn.*, u.ad_soyad as ekleyen_adi FROM crm_notlari cn LEFT JOIN users u ON u.id = cn.kullanici_id WHERE cn.crm_id = ? ORDER BY cn.created_at DESC');
$stmt->execute([$id]);
$crm['notlar'] = $stmt->fetchAll();

// Dönüşen dosya bilgisi
if ($crm['donusen_dosya_id']) {
    $stmt = $db->prepare('SELECT dosya_no, dosya_turu, asama FROM dosyalar WHERE id = ?');
    $stmt->execute([$crm['donusen_dosya_id']]);
    $crm['donusen_dosya'] = $stmt->fetch() ?: null;
}

json_success($crm);
