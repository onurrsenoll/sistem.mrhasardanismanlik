<?php
/**
 * POST /api/v1/servis/create.php
 * Yeni servis kaydı oluştur
 * Body: { "firma_adi": "...", "yetkili_adi": "...", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['firma_adi']);

$db = getDB();

try {
    $stmt = $db->prepare('INSERT INTO servisler (firma_adi, yetkili_adi, telefon, telefon2, email, adres, il, ilce, vergi_no, hizmet_turleri, anlasma_kosullari, komisyon_orani, notlar, durum, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $hizmetTurleri = null;
    if (!empty($body['hizmet_turleri'])) {
        $hizmetTurleri = is_array($body['hizmet_turleri']) ? json_encode($body['hizmet_turleri'], JSON_UNESCAPED_UNICODE) : $body['hizmet_turleri'];
    }

    $stmt->execute([
        clean($body['firma_adi']),
        clean($body['yetkili_adi'] ?? ''),
        clean($body['telefon'] ?? ''),
        clean($body['telefon2'] ?? ''),
        clean($body['email'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        clean($body['ilce'] ?? ''),
        clean($body['vergi_no'] ?? ''),
        $hizmetTurleri,
        clean($body['anlasma_kosullari'] ?? ''),
        isset($body['komisyon_orani']) ? (float)$body['komisyon_orani'] : 0,
        clean($body['notlar'] ?? ''),
        'aktif',
        $user['id']
    ]);

    $servisId = (int)$db->lastInsertId();

    log_action($user['id'], 'servis_olustur', "Servis oluşturuldu: " . clean($body['firma_adi']), 'servisler', $servisId);

    json_success([
        'id' => $servisId
    ], 'Servis başarıyla oluşturuldu', 201);

} catch (\Exception $e) {
    json_error('Servis oluşturulurken hata: ' . $e->getMessage(), 500);
}
