<?php
/**
 * POST /api/v1/arama-log/create.php
 * Yeni arama logu olustur
 * Body: { "yon": "giden", "numara": "05551234567", "musteri_adi": "...", "durum": "cevaplandi", "baslangic_zamani": "...", "sure_saniye": 120 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/setup.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();

ensure_arama_log_table();

require_fields($body, ['numara', 'baslangic_zamani']);

$db = getDB();

$yon = in_array($body['yon'] ?? '', ['gelen', 'giden']) ? $body['yon'] : 'giden';
$durum = in_array($body['durum'] ?? '', ['cevaplandi', 'cevapsiz', 'reddedildi', 'mesgul', 'hata']) ? $body['durum'] : 'cevapsiz';

$stmt = $db->prepare('INSERT INTO arama_loglari (kullanici_id, yon, numara, musteri_adi, musteri_kaynak, musteri_kaynak_id, durum, baslangic_zamani, cevaplanma_zamani, bitis_zamani, sure_saniye, notlar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $user['id'],
    $yon,
    clean($body['numara']),
    clean($body['musteri_adi'] ?? ''),
    clean($body['musteri_kaynak'] ?? ''),
    !empty($body['musteri_kaynak_id']) ? (int)$body['musteri_kaynak_id'] : null,
    $durum,
    $body['baslangic_zamani'],
    $body['cevaplanma_zamani'] ?? null,
    $body['bitis_zamani'] ?? null,
    (int)($body['sure_saniye'] ?? 0),
    clean($body['notlar'] ?? '')
]);

$id = (int)$db->lastInsertId();

json_success(['id' => $id], 'Arama logu kaydedildi', 201);
