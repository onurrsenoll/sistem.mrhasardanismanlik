<?php
/**
 * POST /api/v1/paydas/create.php
 * Yeni paydaş kaydı oluştur
 * Body: { "ad": "...", "tur": "avukat", "yetkili": "...", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

ensure_prim_columns();

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['ad']);

$db = getDB();

try {
    $stmt = $db->prepare('INSERT INTO paydaslar (ad, tur, yetkili, telefon, telefon2, email, adres, il, ilce, vergi_no, iban, komisyon_orani, prim_adk, prim_bh, notlar, durum, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $stmt->execute([
        clean($body['ad']),
        clean($body['tur'] ?? 'sigorta_acentesi'),
        clean($body['yetkili'] ?? ''),
        clean($body['telefon'] ?? ''),
        clean($body['telefon2'] ?? ''),
        clean($body['email'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        clean($body['ilce'] ?? ''),
        clean($body['vergi_no'] ?? ''),
        clean($body['iban'] ?? ''),
        isset($body['komisyon_orani']) ? (float)$body['komisyon_orani'] : 0,
        isset($body['prim_adk']) ? (float)$body['prim_adk'] : 0,
        isset($body['prim_bh']) ? (float)$body['prim_bh'] : 0,
        clean($body['notlar'] ?? ''),
        clean($body['durum'] ?? 'aktif'),
        $user['id']
    ]);

    $paydasId = (int)$db->lastInsertId();

    log_action($user['id'], 'paydas_olustur', "Paydaş oluşturuldu: " . clean($body['ad']), 'paydaslar', $paydasId);

    json_success([
        'id' => $paydasId
    ], 'Paydaş başarıyla oluşturuldu', 201);

} catch (\Exception $e) {
    json_error('Paydaş oluşturulurken hata: ' . $e->getMessage(), 500);
}
