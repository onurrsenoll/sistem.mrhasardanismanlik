<?php
/**
 * GET /api/v1/sozlesme/get.php?id=1
 * Tek sözleşme detayı (araç zimmet dahil)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');
$user = auth_required(['admin']);
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID gerekli', 400);

$stmt = $db->prepare('SELECT * FROM mr_sozlesmeler WHERE id = ?');
$stmt->execute([$id]);
$sozlesme = $stmt->fetch();
if (!$sozlesme) json_error('Sözleşme bulunamadı', 404);

// JSON decode
if ($sozlesme['prim_json']) $sozlesme['prim_json'] = json_decode($sozlesme['prim_json'], true);
if ($sozlesme['ek_haklar_json']) $sozlesme['ek_haklar_json'] = json_decode($sozlesme['ek_haklar_json'], true);

// Araç zimmet
$stmt = $db->prepare('SELECT * FROM mr_sozlesme_arac_zimmet WHERE sozlesme_id = ?');
$stmt->execute([$id]);
$sozlesme['arac_zimmet'] = $stmt->fetch() ?: null;

// Şirket ayarları
$stmt = $db->query('SELECT * FROM mr_sozlesme_ayarlar WHERE id = 1');
$sozlesme['sirket'] = $stmt->fetch() ?: null;

// Belge numaraları
$yil = date('Y', strtotime($sozlesme['olusturma']));
$sira = (int)substr($sozlesme['belge_no'], -3);
$sozlesme['az_belge_no'] = sprintf("MR-AZ-%s-%03d", $yil, $sira);
$sozlesme['kvkk_belge_no'] = sprintf("MR-KV-%s-%03d", $yil, $sira);

json_success($sozlesme);
