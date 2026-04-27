<?php
/**
 * GET /api/v1/mail/ek-indir.php?mesaj_id=123&ek_idx=0
 * Mail ek dosyasini indir (yetki kontrollu).
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('GET');
mail_ensure_tables();

$user = auth_required();
$db = getDB();

$mesajId = (int)($_GET['mesaj_id'] ?? 0);
$ekIdx = (int)($_GET['ek_idx'] ?? 0);
if (!$mesajId) json_error('mesaj_id gerekli', 422);

/* Yetki + mesaj bilgi */
$stmt = $db->prepare('SELECT m.hesap_id, m.ekler, h.kullanici_id FROM mail_mesajlar m JOIN mail_hesaplar h ON h.id = m.hesap_id WHERE m.id = ?');
$stmt->execute([$mesajId]);
$row = $stmt->fetch();
if (!$row) json_error('Mesaj bulunamadı', 404);
if ($user['rol'] !== 'admin' && (int)$row['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);

$ekler = json_decode($row['ekler'] ?? '[]', true);
if (!is_array($ekler) || !isset($ekler[$ekIdx])) json_error('Ek bulunamadı', 404);
$ek = $ekler[$ekIdx];

$klasor = __DIR__ . '/../../../uploads/mail-ekler/' . (int)$row['hesap_id'] . '/' . $mesajId;
$hedefAd = preg_replace('/[^A-Za-z0-9\._\-]/', '_', $ek['ad'] ?? 'ek');
$dosyaPath = $klasor . '/' . $ekIdx . '_' . $hedefAd;

if (!file_exists($dosyaPath)) json_error('Dosya disk üzerinde bulunamadı', 404);

/* Stream dosyayi */
$mime = $ek['mime'] ?? 'application/octet-stream';
$gosterimAdi = $ek['ad'] ?? ('ek-' . $ekIdx);

header_remove('Content-Type');
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($dosyaPath));
header('Content-Disposition: attachment; filename="' . addslashes($gosterimAdi) . '"');
header('X-Content-Type-Options: nosniff');
readfile($dosyaPath);
exit;
