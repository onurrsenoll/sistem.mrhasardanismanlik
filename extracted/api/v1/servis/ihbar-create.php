<?php
/**
 * POST /api/v1/servis/ihbar-create.php
 * Yeni servis ihbarı oluştur
 * Body: { "servis_id": 1, "dosya_id": null, "ihbar_turu": "...", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['servis_id']);

$db = getDB();

// Servis kontrolü
$servisId = (int)$body['servis_id'];
$stmt = $db->prepare('SELECT id, firma_adi FROM servisler WHERE id = ?');
$stmt->execute([$servisId]);
$servis = $stmt->fetch();
if (!$servis) json_error('Servis bulunamadı', 404);

// Dosya kontrolü (opsiyonel)
$dosyaId = null;
if (!empty($body['dosya_id'])) {
    $dosyaId = (int)$body['dosya_id'];
    $stmt = $db->prepare('SELECT id FROM dosyalar WHERE id = ?');
    $stmt->execute([$dosyaId]);
    if (!$stmt->fetch()) json_error('Dosya bulunamadı', 404);
}

try {
    $stmt = $db->prepare('INSERT INTO servis_ihbarlari (servis_id, dosya_id, ihbar_turu, plaka, arac_bilgi, hasar_aciklama, asistans_durumu, notlar, durum, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $stmt->execute([
        $servisId,
        $dosyaId,
        clean($body['ihbar_turu'] ?? ''),
        clean($body['plaka'] ?? ''),
        clean($body['arac_bilgi'] ?? ''),
        clean($body['hasar_aciklama'] ?? ''),
        clean($body['asistans_durumu'] ?? ''),
        clean($body['notlar'] ?? ''),
        'beklemede',
        $user['id']
    ]);

    $ihbarId = (int)$db->lastInsertId();

    log_action($user['id'], 'ihbar_olustur', "İhbar oluşturuldu: {$servis['firma_adi']}", 'servis_ihbarlari', $ihbarId);

    json_success([
        'id' => $ihbarId
    ], 'İhbar başarıyla oluşturuldu', 201);

} catch (\Exception $e) {
    json_error('İhbar oluşturulurken hata: ' . $e->getMessage(), 500);
}
