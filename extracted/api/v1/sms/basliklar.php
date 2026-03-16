<?php
/**
 * GET /api/v1/sms/basliklar.php
 * NetGSM tanımlı SMS başlıklarını (sender) listele
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../../../netgsm-sms-module/NetgsmSms.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);

$sms = new NetgsmSms();
$sonuc = $sms->baslikListele();

json_success($sonuc, $sonuc['basarili'] ? 'BAŞLIKLAR LİSTELENDİ' : 'BAŞLIKLAR LİSTELENEMEDİ');
