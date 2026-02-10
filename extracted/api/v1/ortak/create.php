<?php
/**
 * POST /api/v1/ortak/create.php
 * Yeni ortak kaydı oluştur
 * Body: { "ad_soyad": "...", "unvan": "...", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['ad_soyad']);

$db = getDB();

try {
    $stmt = $db->prepare('INSERT INTO ortaklar (ad_soyad, unvan, baro, sicil_no, telefon, telefon2, email, adres, il, iban, vergi_no, pay_orani, kasa_id, notlar, durum, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $stmt->execute([
        clean($body['ad_soyad']),
        clean($body['unvan'] ?? ''),
        clean($body['baro'] ?? ''),
        clean($body['sicil_no'] ?? ''),
        clean($body['telefon'] ?? ''),
        clean($body['telefon2'] ?? ''),
        clean($body['email'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        clean($body['iban'] ?? ''),
        clean($body['vergi_no'] ?? ''),
        isset($body['pay_orani']) ? (float)$body['pay_orani'] : 0,
        !empty($body['kasa_id']) ? (int)$body['kasa_id'] : null,
        clean($body['notlar'] ?? ''),
        'aktif',
        $user['id']
    ]);

    $ortakId = (int)$db->lastInsertId();

    log_action($user['id'], 'ortak_olustur', "Ortak oluşturuldu: " . clean($body['ad_soyad']), 'ortaklar', $ortakId);

    json_success([
        'id' => $ortakId
    ], 'Ortak başarıyla oluşturuldu', 201);

} catch (\Exception $e) {
    json_error('Ortak oluşturulurken hata: ' . $e->getMessage(), 500);
}
