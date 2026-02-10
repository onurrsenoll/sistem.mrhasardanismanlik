<?php
/**
 * POST /api/v1/masraf/create.php
 * Masraf ekle — kasa bakiyesi otomatik düşer (trigger ile)
 * 
 * Body: { "dosya_id": 1, "masraf_kalemi": "Eksper Ücreti", "tutar": 3500, "kasa_id": 1 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['dosya_id', 'masraf_kalemi', 'tutar', 'kasa_id']);

$dosyaId = (int)$body['dosya_id'];
$tutar   = (float)$body['tutar'];
$kasaId  = (int)$body['kasa_id'];

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);

$db = getDB();

// Dosya var mı
$stmt = $db->prepare('SELECT id, dosya_no FROM dosyalar WHERE id = ?');
$stmt->execute([$dosyaId]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);

// Kasa var mı ve bakiye yeterli mi
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$kasaId]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);
if ($kasa['bakiye'] < $tutar) {
    json_error("Yetersiz bakiye! {$kasa['ad']} bakiyesi: " . number_format($kasa['bakiye'], 2, ',', '.') . ' ₺', 422);
}

// Masraf ekle (trigger otomatik bakiye düşürür)
$stmt = $db->prepare('INSERT INTO masraflar (dosya_id, masraf_kalemi, tutar, kasa_id, aciklama, islem_tarihi, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $dosyaId,
    clean($body['masraf_kalemi']),
    $tutar,
    $kasaId,
    clean($body['aciklama'] ?? ''),
    $body['islem_tarihi'] ?? date('Y-m-d'),
    $user['id']
]);

$masrafId = (int)$db->lastInsertId();

log_action($user['id'], 'masraf_ekle', "{$dosya['dosya_no']} - {$body['masraf_kalemi']}: " . number_format($tutar, 2) . " ₺ ({$kasa['ad']})", 'masraflar', $masrafId);

json_success(['masraf_id' => $masrafId], 'Masraf başarıyla eklendi', 201);
