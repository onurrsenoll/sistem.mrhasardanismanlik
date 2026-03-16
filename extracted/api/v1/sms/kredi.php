<?php
/**
 * GET /api/v1/sms/kredi.php
 * NetGSM SMS kredi (bakiye) sorgulama
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../../../netgsm-sms-module/NetgsmSms.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);

$sms = new NetgsmSms();
$sonuc = $sms->krediSorgula();

json_success($sonuc, $sonuc['basarili'] ? 'KREDİ SORGULAMASI BAŞARILI' : 'KREDİ SORGULANAMADI');
