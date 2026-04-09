<?php
/**
 * GET /api/v1/sms/basliklar.php
 * NetGSM tanımlı SMS başlıklarını (sender) listele
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);

$sonuc = sms_baslik_listele();

json_success($sonuc, $sonuc['basarili'] ? 'BAŞLIKLAR LİSTELENDİ' : 'BAŞLIKLAR LİSTELENEMEDİ');
