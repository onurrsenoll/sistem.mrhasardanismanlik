<?php
/**
 * POST /api/v1/sms/iptal.php
 * Zamanlanmış SMS gönderimini iptal et
 * Body: { "bulk_id": "123456" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['bulk_id']);

$sonuc = sms_iptal($body['bulk_id']);

log_action($user['id'], 'sms_iptal', "SMS İptal: bulk_id={$body['bulk_id']} - Sonuç: {$sonuc['mesaj']}", 'sms_loglari');

json_success($sonuc, $sonuc['basarili'] ? 'SMS İPTAL EDİLDİ' : 'SMS İPTAL EDİLEMEDİ');
