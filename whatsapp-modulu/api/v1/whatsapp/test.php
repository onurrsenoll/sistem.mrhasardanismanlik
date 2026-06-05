<?php
/**
 * POST /api/v1/whatsapp/test.php  — Tek numaraya test gönderimi (admin)
 * Body (şablon):  { "no":"5321234567", "tip":"sablon", "sablon":"dosya_acilis", "dil":"tr", "parametreler":["Ali Veli","2026-0123"] }
 * Body (metin):   { "no":"5321234567", "tip":"metin", "mesaj":"..." }   (yalnız 24s oturum içinde)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/whatsapp_helper.php';

setup_headers();
require_method('POST');
$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['no']);

$tip = $body['tip'] ?? 'sablon';
if ($tip === 'metin') {
    $r = wa_gonder_metin($body['no'], $body['mesaj'] ?? 'MR HASAR DANISMANLIK WHATSAPP TEST MESAJIDIR.', null, $user['id']);
} else {
    require_fields($body, ['sablon']);
    $r = wa_gonder_sablon(
        $body['no'], $body['sablon'], $body['dil'] ?? 'tr',
        $body['parametreler'] ?? [], $body['medya'] ?? null, null, $user['id']
    );
}

log_action($user['id'], 'wa_test', "WhatsApp test: {$body['no']} - " . $r['mesaj'], 'whatsapp_loglari');
json_success($r, $r['basarili'] ? 'WHATSAPP TEST GÖNDERİLDİ' : 'GÖNDERİLEMEDİ: ' . $r['mesaj']);
