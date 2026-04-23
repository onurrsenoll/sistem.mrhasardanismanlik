<?php
/**
 * GET /api/v1/saha/medya-list.php?saha_dosya_id=X
 * SAHA DOSYASINA AİT TÜM MEDYALARI LİSTELE
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'personel', 'uzman', 'avukat', 'muhasebe']);

$saha_dosya_id = isset($_GET['saha_dosya_id']) ? (int)$_GET['saha_dosya_id'] : 0;

if ($saha_dosya_id <= 0) {
    json_error('SAHA DOSYA ID GEREKLİ', 400);
}

$db = getDB();

// Saha dosyasının varlığını kontrol et
$stmt = $db->prepare("SELECT personel_id FROM saha_dosyalar WHERE id = ?");
$stmt->execute([$saha_dosya_id]);
$sahaDosya = $stmt->fetch();

if (!$sahaDosya) {
    json_error('SAHA DOSYASI BULUNAMADI', 404);
}

// Personel sadece kendi dosyasının medyalarını görebilir
if ($user['rol'] === 'personel' && (int)$sahaDosya['personel_id'] !== (int)$user['id']) {
    json_error('BU DOSYANIN MEDYALARINI GÖRME YETKİNİZ YOK', 403);
}

// Medyaları getir
$stmt = $db->prepare("SELECT m.*,
    u.ad_soyad AS yukleyen_adi
    FROM saha_dosya_medya m
    LEFT JOIN users u ON u.id = m.kullanici_id
    WHERE m.saha_dosya_id = ?
    ORDER BY m.created_at DESC");
$stmt->execute([$saha_dosya_id]);
$medyalar = $stmt->fetchAll();

json_success($medyalar);
