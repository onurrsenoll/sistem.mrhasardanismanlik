<?php
/**
 * GET /api/v1/yonlendirme/get.php?id=1
 * Yönlendirme kayıt detayı (notlarıyla birlikte)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('Yönlendirme ID gerekli', 422);

$stmt = $db->prepare('SELECT y.*, u.ad_soyad as atanan_adi, cb.ad_soyad as olusturan_adi
    FROM yonlendirme y
    LEFT JOIN users u ON u.id = y.atanan_id
    LEFT JOIN users cb ON cb.id = y.created_by
    WHERE y.id = ?');
$stmt->execute([$id]);
$kayit = $stmt->fetch();
if (!$kayit) json_error('Yönlendirme kaydı bulunamadı', 404);

// Rol bazlı gizlilik: personel sadece kendine atanmış / kendi yüklediği kaydı görebilir
$rolGorebilirTumu = in_array($user['rol'], ['admin', 'uzman', 'avukat'], true);
if (!$rolGorebilirTumu) {
    $atanan = (int)($kayit['atanan_id'] ?? 0);
    $olusturan = (int)($kayit['created_by'] ?? 0);
    if ($atanan !== (int)$user['id'] && $olusturan !== (int)$user['id']) {
        json_error('Bu kayıt için yetkiniz yok', 403);
    }
}

// Notları getir
$stmt = $db->prepare('SELECT yn.*, u.ad_soyad as ekleyen_adi
    FROM yonlendirme_notlar yn
    LEFT JOIN users u ON u.id = yn.ekleyen_id
    WHERE yn.yonlendirme_id = ?
    ORDER BY yn.created_at DESC');
$stmt->execute([$id]);
$kayit['notlar'] = $stmt->fetchAll();

// Dönüşen CRM bilgisi
if (!empty($kayit['donusen_crm_id'])) {
    $stmt = $db->prepare('SELECT id, ad_soyad, durum FROM crm WHERE id = ?');
    $stmt->execute([$kayit['donusen_crm_id']]);
    $kayit['donusen_crm'] = $stmt->fetch() ?: null;
}

// Dönüşen dosya bilgisi
if (!empty($kayit['donusen_dosya_id'])) {
    $stmt = $db->prepare('SELECT dosya_no, dosya_turu, asama FROM dosyalar WHERE id = ?');
    $stmt->execute([$kayit['donusen_dosya_id']]);
    $kayit['donusen_dosya'] = $stmt->fetch() ?: null;
}

json_success($kayit);
