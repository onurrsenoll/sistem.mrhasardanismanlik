<?php
/**
 * GET /api/v1/dosya/get.php?id=1 veya ?no=2025-0001
 * Dosya detayı (mağdur, araç, masraf, evrak dahil)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
$no = clean($_GET['no'] ?? '');

if (!$id && !$no) json_error('Dosya id veya no gerekli', 422);

// Dosya
$sql = $id ? 'SELECT * FROM dosyalar WHERE id = ?' : 'SELECT * FROM dosyalar WHERE dosya_no = ?';
$stmt = $db->prepare($sql);
$stmt->execute([$id ?: $no]);
$dosya = $stmt->fetch();

if (!$dosya) json_error('Dosya bulunamadı', 404);
if (!empty($dosya['silindi']) && (int)$dosya['silindi'] === 1 && $user['rol'] !== 'admin') {
    json_error('Dosya bulunamadı', 404);
}

// Mağdur
$stmt = $db->prepare('SELECT * FROM magdurlar WHERE dosya_id = ?');
$stmt->execute([$dosya['id']]);
$dosya['magdur'] = $stmt->fetch() ?: null;

// Araçlar
$stmt = $db->prepare('SELECT * FROM araclar WHERE dosya_id = ? ORDER BY taraf');
$stmt->execute([$dosya['id']]);
$dosya['araclar'] = $stmt->fetchAll();

// Masraflar
$stmt = $db->prepare('SELECT m.*, k.ad as kasa_adi, u.ad_soyad as kullanici_adi FROM masraflar m LEFT JOIN kasalar k ON k.id = m.kasa_id LEFT JOIN users u ON u.id = m.kullanici_id WHERE m.dosya_id = ? ORDER BY m.islem_tarihi DESC');
$stmt->execute([$dosya['id']]);
$dosya['masraflar'] = $stmt->fetchAll();

// Evraklar
$stmt = $db->prepare('SELECT e.id, e.evrak_turu, e.dosya_adi, e.dosya_boyutu, e.mime_type, e.created_at, u.ad_soyad as kullanici_adi FROM evraklar e LEFT JOIN users u ON u.id = e.kullanici_id WHERE e.dosya_id = ? ORDER BY e.created_at DESC');
$stmt->execute([$dosya['id']]);
$dosya['evraklar'] = $stmt->fetchAll();

// Avukat & Sorumlu adı
if ($dosya['avukat_id']) {
    $stmt = $db->prepare('SELECT ad_soyad FROM users WHERE id = ?');
    $stmt->execute([$dosya['avukat_id']]);
    $dosya['avukat_adi'] = $stmt->fetchColumn() ?: '';
}
if ($dosya['sorumlu_id']) {
    $stmt = $db->prepare('SELECT ad_soyad FROM users WHERE id = ?');
    $stmt->execute([$dosya['sorumlu_id']]);
    $dosya['sorumlu_adi'] = $stmt->fetchColumn() ?: '';
}

// Toplam masraf
$dosya['toplam_masraf'] = array_sum(array_column($dosya['masraflar'], 'tutar'));

json_success($dosya);
