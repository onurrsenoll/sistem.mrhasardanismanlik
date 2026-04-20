<?php
/**
 * POST /api/v1/arama-log/create.php
 * Yeni arama logu olustur
 * Body: { "yon": "giden", "numara": "05551234567", "musteri_adi": "...", "durum": "cevaplandi", "baslangic_zamani": "...", "sure_saniye": 120 }
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);

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

try {
    // crm_id / yonlendirme_id sütunları olmayabilir → ensure
    ensure_crm_columns();
    $stmt = $db->prepare('INSERT INTO arama_loglari (kullanici_id, yon, numara, musteri_adi, musteri_kaynak, musteri_kaynak_id, durum, baslangic_zamani, cevaplanma_zamani, bitis_zamani, sure_saniye, notlar, crm_id, yonlendirme_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
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
        clean($body['notlar'] ?? ''),
        !empty($body['crm_id']) ? (int)$body['crm_id'] : null,
        !empty($body['yonlendirme_id']) ? (int)$body['yonlendirme_id'] : null
    ]);

    $id = (int)$db->lastInsertId();
    json_success(['id' => $id], 'Arama logu kaydedildi', 201);

} catch (\Throwable $e) {
    error_log('[ARAMA-LOG-CREATE] HATA: ' . $e->getMessage() . ' | DATA: ' . json_encode($body));
    json_error('Arama logu kayit hatasi: ' . $e->getMessage(), 500);
}
