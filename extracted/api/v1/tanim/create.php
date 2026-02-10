<?php
/**
 * POST /api/v1/tanim/create.php
 * Yeni tanımlama ekle
 * Body: { "kategori": "sigorta_sirket", "deger": "Yeni Sigorta", "sira": 23 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['kategori', 'deger']);

$db = getDB();

$kategori = clean($body['kategori']);
$deger = clean($body['deger']);
$sira = (int)($body['sira'] ?? 0);

// Aynı kategori+değer var mı kontrol
$stmt = $db->prepare('SELECT id FROM tanimlamalar WHERE kategori = ? AND deger = ?');
$stmt->execute([$kategori, $deger]);
if ($stmt->fetch()) {
    json_error('Bu tanımlama zaten mevcut', 409);
}

// Sıra otomatik belirle
if ($sira === 0) {
    $stmt = $db->prepare('SELECT MAX(sira) as max_sira FROM tanimlamalar WHERE kategori = ?');
    $stmt->execute([$kategori]);
    $row = $stmt->fetch();
    $sira = ($row['max_sira'] ?? 0) + 1;
}

$stmt = $db->prepare('INSERT INTO tanimlamalar (kategori, deger, sira, aktif) VALUES (?, ?, ?, 1)');
$stmt->execute([$kategori, $deger, $sira]);

$id = (int)$db->lastInsertId();

log_action($user['id'], 'tanim_ekle', "$kategori: $deger", 'tanimlamalar', $id);

json_success(['id' => $id], 'Tanımlama eklendi', 201);
