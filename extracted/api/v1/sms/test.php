<?php
/**
 * POST /api/v1/sms/test.php
 * SMS test gönderimi
 * Body: { "telefon": "05XX1234567", "mesaj": "Test mesajı" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['telefon']);

$telefon = $body['telefon'];
$mesaj = $body['mesaj'] ?? 'MR HASAR DANISMANLIK SMS TEST MESAJIDIR. BU MESAJI DIKKATE ALMAYINIZ.';

$sonuc = sms_gonder($telefon, $mesaj, null, $user['id']);

log_action($user['id'], 'sms_test', "SMS Test: {$telefon} - Sonuç: {$sonuc['mesaj']}", 'sms_loglari');

json_success($sonuc, $sonuc['basarili'] ? 'SMS TEST GÖNDERİLDİ' : 'SMS TEST BAŞARISIZ');
