<?php
/**
 * POST /api/v1/paydas/create.php
 * Yeni paydaş kaydı oluştur
 * Body: { "firma_adi": "...", "tip": "avukat", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['firma_adi', 'tip']);

$db = getDB();

try {
    $stmt = $db->prepare('INSERT INTO paydaslar (firma_adi, tip, yetkili_adi, telefon, telefon2, email, adres, il, ilce, vergi_no, iban, komisyon_orani, notlar, durum, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $stmt->execute([
        clean($body['firma_adi']),
        clean($body['tip']),
        clean($body['yetkili_adi'] ?? ''),
        clean($body['telefon'] ?? ''),
        clean($body['telefon2'] ?? ''),
        clean($body['email'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        clean($body['ilce'] ?? ''),
        clean($body['vergi_no'] ?? ''),
        clean($body['iban'] ?? ''),
        isset($body['komisyon_orani']) ? (float)$body['komisyon_orani'] : 0,
        clean($body['notlar'] ?? ''),
        'aktif',
        $user['id']
    ]);

    $paydasId = (int)$db->lastInsertId();

    log_action($user['id'], 'paydas_olustur', "Paydaş oluşturuldu: " . clean($body['firma_adi']), 'paydaslar', $paydasId);

    json_success([
        'id' => $paydasId
    ], 'Paydaş başarıyla oluşturuldu', 201);

} catch (\Exception $e) {
    json_error('Paydaş oluşturulurken hata: ' . $e->getMessage(), 500);
}
