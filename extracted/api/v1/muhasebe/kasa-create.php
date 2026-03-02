<?php
/**
 * POST /api/v1/muhasebe/kasa-create.php
 * Yeni kasa/banka hesabı oluştur
 * Body: { "ad": "Yeni Kasa", "tur": "nakit", "banka_adi": "...", "hesap_no": "...", "iban": "...", "bakiye": 0 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['ad']);

$db = getDB();

// Frontend 'tur' (küçük harf) gönderir, DB 'tip' (büyük harfle başlayan) bekler
$tip = clean($body['tip'] ?? $body['tur'] ?? 'nakit');
$tip = ucfirst(strtolower($tip)); // nakit → Nakit, banka → Banka

if (!in_array($tip, ['Nakit', 'Banka'])) {
    json_error('Geçersiz kasa tipi. Nakit veya Banka olmalı', 422);
}

// Ortak kasa desteği
$ortakKasaTipi = clean($body['ortak_kasa_tipi'] ?? '');
$ortakIds = clean($body['ortak_ids'] ?? '');

// DDL: ortak kasa sütunları
try {
    $db->exec("ALTER TABLE kasalar ADD COLUMN IF NOT EXISTS ortak_kasa_tipi VARCHAR(20) DEFAULT NULL");
    $db->exec("ALTER TABLE kasalar ADD COLUMN IF NOT EXISTS ortak_ids TEXT DEFAULT NULL");
} catch (\Exception $e) {}

$stmt = $db->prepare('INSERT INTO kasalar (ad, tip, banka_adi, hesap_no, iban, bakiye, aktif, ortak_kasa_tipi, ortak_ids) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)');
$stmt->execute([
    clean($body['ad']),
    $tip,
    clean($body['banka_adi'] ?? ''),
    clean($body['hesap_no'] ?? ''),
    clean($body['iban'] ?? ''),
    (float)($body['bakiye'] ?? 0),
    $ortakKasaTipi ?: null,
    $ortakIds ?: null
]);

$id = (int)$db->lastInsertId();

log_action($user['id'], 'kasa_olustur', "Kasa oluşturuldu: " . clean($body['ad']), 'kasalar', $id);

json_success(['id' => $id], 'Kasa oluşturuldu', 201);
