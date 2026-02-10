<?php
/**
 * POST /api/v1/sablon/create.php
 * Yeni şablon oluştur
 * Body: { "ad": "...", "icerik": "...", "kategori": "...", "degiskenler": ["ad_soyad","dosya_no"], "aktif": 1 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['ad', 'icerik']);

$db = getDB();
$ad = clean($body['ad']);
$icerik = $body['icerik']; // İçerik HTML/metin olabilir, clean yapmıyoruz
$kategori = clean($body['kategori'] ?? '');
$aktif = isset($body['aktif']) ? (int)$body['aktif'] : 1;

// Değişkenler JSON olarak saklanır
$degiskenler = null;
if (isset($body['degiskenler'])) {
    if (is_array($body['degiskenler'])) {
        $degiskenler = json_encode($body['degiskenler'], JSON_UNESCAPED_UNICODE);
    } elseif (is_string($body['degiskenler'])) {
        // JSON string olarak geldiyse doğrula
        $decoded = json_decode($body['degiskenler'], true);
        $degiskenler = is_array($decoded) ? $body['degiskenler'] : null;
    }
}

// Aynı isimde şablon kontrolü
$stmt = $db->prepare('SELECT id FROM sablonlar WHERE ad = ?');
$stmt->execute([$ad]);
if ($stmt->fetch()) json_error('Bu isimde bir şablon zaten mevcut', 422);

try {
    $stmt = $db->prepare('INSERT INTO sablonlar (ad, kategori, icerik, degiskenler, aktif, kullanici_id) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $ad,
        $kategori,
        $icerik,
        $degiskenler,
        $aktif,
        $user['id']
    ]);
    $sablonId = (int)$db->lastInsertId();

    log_action($user['id'], 'sablon_olustur', "Şablon oluşturuldu: $ad", 'sablonlar', $sablonId);

    json_success(['id' => $sablonId], 'Şablon oluşturuldu', 201);

} catch (\Exception $e) {
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
