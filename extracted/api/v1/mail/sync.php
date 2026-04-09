<?php
/**
 * POST /api/v1/mail/sync.php
 * Mail senkronizasyonu (IMAP'ten yeni mailleri çek)
 * Body: { "hesap_id": 1 }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/mail_helper.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['hesap_id']);

$sonuc = mail_sync((int)$body['hesap_id'], 50);

if ($sonuc['basarili']) {
    json_success($sonuc, $sonuc['mesaj']);
} else {
    json_error($sonuc['mesaj']);
}
