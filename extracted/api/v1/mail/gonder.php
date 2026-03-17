<?php
/**
 * POST /api/v1/mail/gonder.php
 * Mail gönder
 * Body: { "hesap_id": 1, "alici": "a@b.com", "konu": "Konu", "icerik": "HTML icerik", "cc": "", "bcc": "" }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/mail_helper.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['hesap_id', 'alici', 'konu', 'icerik']);

$sonuc = mail_gonder(
    (int)$body['hesap_id'],
    $body['alici'],
    $body['konu'],
    $body['icerik'],
    $body['cc'] ?? '',
    $body['bcc'] ?? ''
);

log_action($user['id'], 'mail_gonder', 'Mail gönderildi: ' . $body['alici'] . ' - ' . $body['konu'], 'SİSTEM', null);

if ($sonuc['basarili']) {
    json_success($sonuc, 'MAIL GÖNDERİLDİ');
} else {
    json_error($sonuc['mesaj']);
}
