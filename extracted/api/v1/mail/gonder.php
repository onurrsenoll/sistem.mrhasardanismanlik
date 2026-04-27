<?php
/**
 * POST /api/v1/mail/gonder.php
 * Mail gönder (zengin HTML + ekler + imza otomatik).
 * 2 farkli content-type kabul eder:
 *   - application/json: { hesap_id, to, cc, bcc, subject, body_html, body_text } (ek yoktan)
 *   - multipart/form-data: hesap_id, to, cc, bcc, subject, body_html, body_text + ekler[] (file)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('POST');
mail_ensure_tables();

@set_time_limit(120);
@ini_set('memory_limit', '256M');
$user = auth_required();
$db = getDB();

/* Multipart mı yoksa JSON mu? */
$ct = $_SERVER['CONTENT_TYPE'] ?? '';
$multipart = stripos($ct, 'multipart/form-data') !== false;

if ($multipart) {
    $body = $_POST;
    $ekDosyalari = [];
    if (!empty($_FILES['ekler'])) {
        $files = $_FILES['ekler'];
        $count = is_array($files['name']) ? count($files['name']) : 1;
        for ($i = 0; $i < $count; $i++) {
            $name = is_array($files['name']) ? $files['name'][$i] : $files['name'];
            $tmp = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
            $type = is_array($files['type']) ? $files['type'][$i] : $files['type'];
            $err = is_array($files['error']) ? $files['error'][$i] : $files['error'];
            $size = is_array($files['size']) ? $files['size'][$i] : $files['size'];
            if ($err === UPLOAD_ERR_OK && is_uploaded_file($tmp) && $size > 0) {
                $ekDosyalari[] = [
                    'ad' => $name,
                    'mime' => $type ?: 'application/octet-stream',
                    'boyut' => (int)$size,
                    'veri' => file_get_contents($tmp)
                ];
            }
        }
    }
} else {
    $body = get_json_body();
    $ekDosyalari = [];
}

if (empty($body['hesap_id']) || empty($body['to']) || empty($body['subject'])) {
    json_error('hesap_id, to, subject zorunlu', 422);
}

$hesapId = (int)$body['hesap_id'];
$stmt = $db->prepare('SELECT * FROM mail_hesaplar WHERE id = ?');
$stmt->execute([$hesapId]);
$hesap = $stmt->fetch();
if (!$hesap) json_error('Mail hesabı bulunamadı', 404);
if ($user['rol'] !== 'admin' && (int)$hesap['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);
if (!$hesap['aktif']) json_error('Mail hesabı pasif - önce aktif edin', 422);

try {
    $sonuc = mail_smtp_gonder($hesap, [
        'to' => clean($body['to']),
        'cc' => clean($body['cc'] ?? ''),
        'bcc' => clean($body['bcc'] ?? ''),
        'subject' => clean($body['subject']),
        'body_html' => $body['body_html'] ?? '',
        'body_text' => $body['body_text'] ?? '',
        'attachments' => $ekDosyalari
    ]);

    if ($sonuc['success']) {
        /* Giden mail DB'ye kaydet + ekler JSON */
        $ekJsonList = [];
        foreach ($ekDosyalari as $ek) {
            $ekJsonList[] = ['ad' => $ek['ad'], 'mime' => $ek['mime'], 'boyut' => $ek['boyut']];
        }
        $ekJson = !empty($ekJsonList) ? json_encode($ekJsonList, JSON_UNESCAPED_UNICODE) : null;

        $stmt = $db->prepare('INSERT INTO mail_mesajlar (hesap_id, message_id, yon, klasor, gonderen, alici, cc, bcc, konu, govde_text, govde_html, ekler, tarih, okundu) VALUES (?, ?, \'giden\', \'Sent\', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)');
        $stmt->execute([
            $hesapId,
            $sonuc['message_id'] ?? null,
            $hesap['email'],
            clean($body['to']),
            clean($body['cc'] ?? ''),
            clean($body['bcc'] ?? ''),
            clean($body['subject']),
            $body['body_text'] ?? strip_tags($body['body_html'] ?? ''),
            $body['body_html'] ?? '',
            $ekJson
        ]);
        $mesajId = (int)$db->lastInsertId();

        /* Ekleri fiziksel olarak kaydet (sonra indirilebilsin) */
        if (!empty($ekDosyalari)) {
            $klasor = mail_ek_klasor($hesapId, $mesajId);
            foreach ($ekDosyalari as $idx => $ek) {
                $hedefAd = preg_replace('/[^A-Za-z0-9\._\-]/', '_', $ek['ad']);
                @file_put_contents($klasor . '/' . $idx . '_' . $hedefAd, $ek['veri']);
            }
        }

        log_action($user['id'], 'mail_gonder', 'Mail gönderildi: ' . clean($body['subject']) . ' → ' . clean($body['to']) . ' (' . count($ekDosyalari) . ' ek)', 'mail_mesajlar', $mesajId);
        json_success(['id' => $mesajId, 'ek_sayisi' => count($ekDosyalari)], 'Mail gönderildi', 201);
    } else {
        $db->prepare('UPDATE mail_hesaplar SET son_hata = ? WHERE id = ?')->execute([$sonuc['error'], $hesapId]);
        json_error('Gönderim hatası: ' . $sonuc['error'], 500);
    }
} catch (\Exception $e) {
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
