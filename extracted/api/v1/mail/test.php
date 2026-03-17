<?php
/**
 * POST /api/v1/mail/test.php
 * Mail bağlantı testi (IMAP + SMTP)
 * Body: { "hesap_id": 1 } veya { "email": "x@y.com", "kullanici": "...", "sifre": "...", ... }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/mail_helper.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
$db = getDB();
mail_tablo_olustur($db);

$hesap = null;

// Mevcut hesap ID ile test
if (!empty($body['hesap_id'])) {
    $stmt = $db->prepare("SELECT * FROM mail_hesaplari WHERE id = ?");
    $stmt->execute([(int)$body['hesap_id']]);
    $hesap = $stmt->fetch();
    if (!$hesap) json_error('HESAP BULUNAMADI');
} else {
    // Yeni bilgilerle test
    require_fields($body, ['kullanici', 'sifre']);
    $hesap = [
        'imap_sunucu' => $body['imap_sunucu'] ?? 'mail.mrhasardanismanlik.com',
        'imap_port' => (int)($body['imap_port'] ?? 993),
        'smtp_sunucu' => $body['smtp_sunucu'] ?? 'mail.mrhasardanismanlik.com',
        'smtp_port' => (int)($body['smtp_port'] ?? 465),
        'kullanici' => $body['kullanici'],
        'sifre' => $body['sifre'],
        'guvenlik' => $body['guvenlik'] ?? 'ssl'
    ];
}

$sonuclar = ['imap' => null, 'smtp' => null];

// IMAP TEST
$imapSonuc = mail_imap_baglan($hesap);
$sonuclar['imap'] = [
    'basarili' => $imapSonuc['basarili'],
    'mesaj' => $imapSonuc['mesaj']
];
if ($imapSonuc['conn']) {
    $mailCount = imap_num_msg($imapSonuc['conn']);
    $sonuclar['imap']['mail_sayisi'] = $mailCount;
    imap_close($imapSonuc['conn']);
}

// SMTP TEST (basit bağlantı)
$prefix = ($hesap['guvenlik'] === 'ssl') ? 'ssl://' : '';
$context = stream_context_create(['ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true]]);
$smtpSocket = @stream_socket_client($prefix . $hesap['smtp_sunucu'] . ':' . $hesap['smtp_port'], $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);

if ($smtpSocket) {
    $resp = fgets($smtpSocket, 512);
    if (substr($resp, 0, 3) === '220') {
        $sonuclar['smtp'] = ['basarili' => true, 'mesaj' => 'SMTP BAĞLANTISI BAŞARILI'];
    } else {
        $sonuclar['smtp'] = ['basarili' => false, 'mesaj' => 'SMTP YANIT HATASI: ' . trim($resp)];
    }
    fwrite($smtpSocket, "QUIT\r\n");
    fclose($smtpSocket);
} else {
    $sonuclar['smtp'] = ['basarili' => false, 'mesaj' => 'SMTP BAĞLANTI HATASI: ' . $errstr];
}

$genelBasarili = $sonuclar['imap']['basarili'] && $sonuclar['smtp']['basarili'];

if ($genelBasarili) {
    json_success($sonuclar, 'IMAP VE SMTP BAĞLANTISI BAŞARILI');
} else {
    json_success($sonuclar, 'BAĞLANTI TESTİ TAMAMLANDI - DETAYLAR İÇİN SONUÇLARI İNCELEYİN');
}
