<?php
/**
 * GET /api/v1/sms/rapor.php
 * SMS iletim raporu sorgulama
 * Params: ?bulk_id=123456&tip=0
 *   tip: 0=tümü, 1=iletildi, 2=iletilmedi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman']);

if (empty($_GET['bulk_id'])) {
    json_error('BULK_ID PARAMETRESI GEREKLİ', 422);
}

$bulkId = $_GET['bulk_id'];
$tip = isset($_GET['tip']) ? (int)$_GET['tip'] : 0;

$sonuc = sms_rapor_sorgula($bulkId, $tip);

json_success($sonuc, $sonuc['basarili'] ? 'RAPOR SORGULAMASI BAŞARILI' : 'RAPOR SORGULANAMADI');
