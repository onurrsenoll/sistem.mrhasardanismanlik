<?php
/**
 * POST /api/v1/mail/gonder.php
 * Mail gönder. Body: { hesap_id, to, cc, bcc, subject, body_html, body_text }
 * Gönderilen mail 'giden' olarak mail_mesajlar'a kaydedilir.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('POST');
mail_ensure_tables();

$user = auth_required();
$db = getDB();
$body = get_json_body();
require_fields($body, ['hesap_id', 'to', 'subject']);

$hesapId = (int)$body['hesap_id'];
$stmt = $db->prepare('SELECT * FROM mail_hesaplar WHERE id = ?');
$stmt->execute([$hesapId]);
$hesap = $stmt->fetch();
if (!$hesap) json_error('Mail hesabı bulunamadı', 404);
if ($user['rol'] !== 'admin' && (int)$hesap['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);
if (!$hesap['aktif']) json_error('Mail hesabı pasif', 422);

try {
    $sonuc = mail_smtp_gonder($hesap, [
        'to' => clean($body['to']),
        'cc' => clean($body['cc'] ?? ''),
        'bcc' => clean($body['bcc'] ?? ''),
        'subject' => clean($body['subject']),
        'body_html' => $body['body_html'] ?? '',
        'body_text' => $body['body_text'] ?? ''
    ]);

    if ($sonuc['success']) {
        // Giden mail DB'ye kaydet
        $stmt = $db->prepare('INSERT INTO mail_mesajlar (hesap_id, message_id, yon, klasor, gonderen, alici, cc, bcc, konu, govde_text, govde_html, tarih, okundu) VALUES (?, ?, \'giden\', \'SENT\', ?, ?, ?, ?, ?, ?, ?, NOW(), 1)');
        $stmt->execute([
            $hesapId,
            $sonuc['message_id'] ?? null,
            $hesap['email'],
            clean($body['to']),
            clean($body['cc'] ?? ''),
            clean($body['bcc'] ?? ''),
            clean($body['subject']),
            $body['body_text'] ?? strip_tags($body['body_html'] ?? ''),
            $body['body_html'] ?? ''
        ]);
        $mesajId = (int)$db->lastInsertId();

        log_action($user['id'], 'mail_gonder', 'Mail gönderildi: ' . clean($body['subject']) . ' → ' . clean($body['to']), 'mail_mesajlar', $mesajId);
        json_success(['id' => $mesajId], 'Mail gönderildi', 201);
    } else {
        // Hata hesap kaydına da yaz
        $db->prepare('UPDATE mail_hesaplar SET son_hata = ? WHERE id = ?')->execute([$sonuc['error'], $hesapId]);
        json_error('Gönderim hatası: ' . $sonuc['error'], 500);
    }
} catch (\Exception $e) {
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
