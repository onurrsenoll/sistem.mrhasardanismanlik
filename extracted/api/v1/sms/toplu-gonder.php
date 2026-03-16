<?php
/**
 * POST /api/v1/sms/toplu-gonder.php
 * Toplu SMS gönderimi (birden fazla numaraya aynı mesaj)
 * Body: { "telefonlar": ["05XX1234567", "05XX9876543"], "mesaj": "Mesaj metni" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['telefonlar', 'mesaj']);

if (!is_array($body['telefonlar']) || empty($body['telefonlar'])) {
    json_error('TELEFON LİSTESİ BOŞ VEYA GEÇERSİZ FORMAT', 422);
}

if (count($body['telefonlar']) > 500) {
    json_error('TEK SEFERDEKİ TOPLAM SMS SINIRI 500 ADETTIR', 422);
}

$sonuc = sms_toplu_gonder($body['telefonlar'], $body['mesaj'], $user['id']);

log_action($user['id'], 'sms_toplu_gonder', "Toplu SMS: " . count($body['telefonlar']) . " numara - Başarılı: {$sonuc['basarili']}, Başarısız: {$sonuc['basarisiz']}", 'sms_loglari');

json_success($sonuc, $sonuc['basarili'] > 0 ? 'TOPLU SMS GÖNDERİLDİ' : 'TOPLU SMS GÖNDERİLEMEDİ');
