<?php
/**
 * POST /api/v1/mail/sync.php
 * IMAP'ten yeni mailleri çeker, mail_mesajlar tablosuna kaydeder (duplicate engel).
 * Body: { hesap_id, son_n_gun (opsiyonel, varsayılan 30), max_mesaj (opsiyonel, varsayılan 100) }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('POST');
mail_ensure_tables();

@set_time_limit(120);
$user = auth_required();
$db = getDB();
$body = get_json_body();
require_fields($body, ['hesap_id']);

$hesapId = (int)$body['hesap_id'];
$sonGun = max(1, (int)($body['son_n_gun'] ?? 30));
$maxMesaj = min(500, max(10, (int)($body['max_mesaj'] ?? 100)));

$stmt = $db->prepare('SELECT * FROM mail_hesaplar WHERE id = ?');
$stmt->execute([$hesapId]);
$hesap = $stmt->fetch();
if (!$hesap) json_error('Mail hesabı bulunamadı', 404);
if ($user['rol'] !== 'admin' && (int)$hesap['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);

try {
    $inbox = mail_imap_baglan($hesap);
    $dateSince = date('d-M-Y', strtotime('-' . $sonGun . ' days'));
    $search = imap_search($inbox, 'SINCE "' . $dateSince . '"');

    if ($search === false) {
        imap_close($inbox);
        $db->prepare('UPDATE mail_hesaplar SET son_sync = NOW(), son_hata = NULL WHERE id = ?')->execute([$hesapId]);
        json_success(['yeni' => 0, 'toplam' => 0], 'Yeni mail yok');
    }

    rsort($search);
    $search = array_slice($search, 0, $maxMesaj);

    $ins = $db->prepare('INSERT IGNORE INTO mail_mesajlar (hesap_id, uid_imap, message_id, yon, klasor, gonderen, alici, cc, konu, govde_text, govde_html, tarih, okundu) VALUES (?, ?, ?, \'gelen\', \'INBOX\', ?, ?, ?, ?, ?, ?, ?, 0)');

    $yeni = 0;
    foreach ($search as $num) {
        $uid = imap_uid($inbox, $num);
        // Zaten var mı?
        $dup = $db->prepare('SELECT id FROM mail_mesajlar WHERE hesap_id = ? AND uid_imap = ? AND klasor = ?');
        $dup->execute([$hesapId, (string)$uid, 'INBOX']);
        if ($dup->fetch()) continue;

        $overview = imap_fetch_overview($inbox, $num, 0);
        if (empty($overview)) continue;
        $info = $overview[0];

        $tarih = isset($info->date) ? date('Y-m-d H:i:s', strtotime($info->date)) : date('Y-m-d H:i:s');
        $gonderen = $info->from ?? '';
        $alici = $info->to ?? ($hesap['email'] ?? '');
        $konu = isset($info->subject) ? imap_utf8($info->subject) : '';
        $messageId = $info->message_id ?? '';

        // Gövde
        $struct = imap_fetchstructure($inbox, $num);
        $text = '';
        $html = '';
        $decode = function($payload, $encoding) {
            if ($encoding == 3) return base64_decode($payload);
            if ($encoding == 4) return quoted_printable_decode($payload);
            return $payload;
        };

        if (empty($struct->parts)) {
            $raw = imap_body($inbox, $num);
            $text = $decode($raw, $struct->encoding ?? 0);
            // Charset convert
            if (isset($struct->parameters)) {
                foreach ($struct->parameters as $p) {
                    if (strtolower($p->attribute) === 'charset' && strtolower($p->value) !== 'utf-8') {
                        $text = @mb_convert_encoding($text, 'UTF-8', $p->value);
                    }
                }
            }
        } else {
            foreach ($struct->parts as $i => $part) {
                $partNum = $i + 1;
                $data = imap_fetchbody($inbox, $num, $partNum);
                $data = $decode($data, $part->encoding);
                $charset = 'UTF-8';
                if (!empty($part->parameters)) {
                    foreach ($part->parameters as $p) {
                        if (strtolower($p->attribute) === 'charset') $charset = $p->value;
                    }
                }
                if (strtolower($charset) !== 'utf-8') $data = @mb_convert_encoding($data, 'UTF-8', $charset);
                if ($part->subtype === 'HTML') $html .= $data;
                elseif ($part->subtype === 'PLAIN') $text .= $data;
            }
        }
        if (!$text && $html) $text = trim(strip_tags($html));

        try {
            $ins->execute([
                $hesapId,
                (string)$uid,
                $messageId,
                $gonderen,
                $alici,
                $info->cc ?? '',
                $konu,
                mb_substr($text, 0, 100000, 'UTF-8'),
                mb_substr($html, 0, 200000, 'UTF-8'),
                $tarih
            ]);
            if ($ins->rowCount() > 0) $yeni++;
        } catch (\Exception $ie) { /* tek mesaj hatası toplu sync'i bozmasın */ }
    }

    imap_close($inbox);
    $db->prepare('UPDATE mail_hesaplar SET son_sync = NOW(), son_hata = NULL WHERE id = ?')->execute([$hesapId]);
    log_action($user['id'], 'mail_sync', "Mail sync: $yeni yeni / " . count($search) . ' tarandı', 'mail_hesaplar', $hesapId);
    json_success(['yeni' => $yeni, 'toplam' => count($search)], "$yeni yeni mail senkronlandı");

} catch (\Exception $e) {
    $db->prepare('UPDATE mail_hesaplar SET son_hata = ? WHERE id = ?')->execute([$e->getMessage(), $hesapId]);
    json_error('SYNC HATASI: ' . $e->getMessage(), 500);
}
