<?php
/**
 * ═══ MAIL MODÜLÜ ORTAK YARDIMCI ═══
 * - Hesap tablosu + mail tablosu + şablon tablosu oluşturma (idempotent)
 * - Şifre güvenli saklama (AES-256-CBC + JWT_SECRET tabanlı)
 * - IMAP ile gelen mail senkronu
 * - SMTP ile mail gönderme (native fsockopen + TLS)
 */

if (!function_exists('mail_ensure_tables')) {
function mail_ensure_tables() {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    try {
        $db = getDB();

        $db->exec("CREATE TABLE IF NOT EXISTS mail_hesaplar (
            id INT AUTO_INCREMENT PRIMARY KEY,
            kullanici_id INT DEFAULT NULL,
            etiket VARCHAR(100) DEFAULT NULL,
            email VARCHAR(150) NOT NULL,
            gonderen_adi VARCHAR(150) DEFAULT NULL,
            imap_host VARCHAR(150) DEFAULT NULL,
            imap_port INT DEFAULT 993,
            imap_encryption VARCHAR(10) DEFAULT 'ssl',
            smtp_host VARCHAR(150) DEFAULT NULL,
            smtp_port INT DEFAULT 465,
            smtp_encryption VARCHAR(10) DEFAULT 'ssl',
            kullanici_adi VARCHAR(150) DEFAULT NULL,
            sifre_sifreli TEXT DEFAULT NULL,
            aktif TINYINT(1) NOT NULL DEFAULT 1,
            son_sync DATETIME DEFAULT NULL,
            son_hata TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_kullanici (kullanici_id),
            INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

        $db->exec("CREATE TABLE IF NOT EXISTS mail_mesajlar (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hesap_id INT NOT NULL,
            uid_imap VARCHAR(50) DEFAULT NULL,
            message_id VARCHAR(255) DEFAULT NULL,
            yon ENUM('gelen','giden') NOT NULL DEFAULT 'gelen',
            klasor VARCHAR(50) DEFAULT 'INBOX',
            gonderen VARCHAR(255) DEFAULT NULL,
            alici VARCHAR(500) DEFAULT NULL,
            cc VARCHAR(500) DEFAULT NULL,
            bcc VARCHAR(500) DEFAULT NULL,
            konu VARCHAR(500) DEFAULT NULL,
            govde_text LONGTEXT DEFAULT NULL,
            govde_html LONGTEXT DEFAULT NULL,
            ekler TEXT DEFAULT NULL,
            tarih DATETIME DEFAULT NULL,
            okundu TINYINT(1) DEFAULT 0,
            silindi TINYINT(1) DEFAULT 0,
            yildizli TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_hesap_uid (hesap_id, uid_imap, klasor),
            INDEX idx_hesap (hesap_id),
            INDEX idx_tarih (tarih),
            INDEX idx_yon (yon),
            INDEX idx_okundu (okundu)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

        $db->exec("CREATE TABLE IF NOT EXISTS mail_sablonlari (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ad VARCHAR(150) NOT NULL,
            tetik VARCHAR(50) DEFAULT NULL COMMENT 'dosya_acildi, police_yenileme, ajanda_yaklasan vb',
            konu VARCHAR(500) DEFAULT NULL,
            icerik_html LONGTEXT DEFAULT NULL,
            aktif TINYINT(1) DEFAULT 1,
            aciklama TEXT DEFAULT NULL,
            created_by INT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_tetik (tetik),
            INDEX idx_aktif (aktif)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
    } catch (\Exception $e) { /* sessiz */ }
}
}

if (!function_exists('mail_sifrele')) {
function mail_sifrele($plaintext) {
    if ($plaintext === null || $plaintext === '') return '';
    $key = hash('sha256', JWT_SECRET, true);
    $iv = openssl_random_pseudo_bytes(16);
    $ct = openssl_encrypt($plaintext, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return base64_encode($iv . $ct);
}
}
if (!function_exists('mail_coz')) {
function mail_coz($b64) {
    if (empty($b64)) return '';
    $raw = base64_decode($b64);
    if ($raw === false || strlen($raw) < 17) return '';
    $key = hash('sha256', JWT_SECRET, true);
    $iv = substr($raw, 0, 16);
    $ct = substr($raw, 16);
    $pt = openssl_decrypt($ct, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv);
    return $pt === false ? '' : $pt;
}
}

if (!function_exists('mail_imap_baglan')) {
function mail_imap_baglan($hesap) {
    if (!function_exists('imap_open')) {
        throw new \Exception('PHP IMAP uzantısı sunucuda yüklü değil. cPanel PHP Selector → imap uzantısını etkinleştirin.');
    }
    $port = (int)$hesap['imap_port'] ?: 993;
    $enc = $hesap['imap_encryption'] ?: 'ssl';
    $flag = $enc === 'tls' ? '/tls' : ($enc === 'ssl' ? '/ssl' : '');
    $sunucu = '{' . $hesap['imap_host'] . ':' . $port . '/imap' . $flag . '/novalidate-cert}INBOX';
    $sifre = mail_coz($hesap['sifre_sifreli']);
    $inbox = @imap_open($sunucu, $hesap['kullanici_adi'] ?: $hesap['email'], $sifre, 0, 1);
    if (!$inbox) {
        throw new \Exception('IMAP bağlantı hatası: ' . imap_last_error());
    }
    return $inbox;
}
}

if (!function_exists('mail_smtp_gonder')) {
/**
 * Saf PHP ile SMTP gönderme (PHPMailer'sız). TLS+SSL destekler.
 * @param array $hesap mail_hesaplar satırı
 * @param array $data ['to','cc','bcc','subject','body_html','body_text','attachments']
 * @return array ['success'=>bool,'error'=>string]
 */
function mail_smtp_gonder($hesap, $data) {
    $host = $hesap['smtp_host'];
    $port = (int)($hesap['smtp_port'] ?: 465);
    $enc = $hesap['smtp_encryption'] ?: 'ssl';
    $user = $hesap['kullanici_adi'] ?: $hesap['email'];
    $pass = mail_coz($hesap['sifre_sifreli']);
    $from = $hesap['email'];
    $fromAdi = $hesap['gonderen_adi'] ?: $hesap['email'];

    $to = $data['to'] ?? '';
    $subject = $data['subject'] ?? '';
    $html = $data['body_html'] ?? '';
    $text = $data['body_text'] ?? strip_tags($html);
    $cc = $data['cc'] ?? '';
    $bcc = $data['bcc'] ?? '';

    if (!$host || !$to) return ['success' => false, 'error' => 'SMTP host veya alıcı eksik'];

    $transport = $enc === 'ssl' ? 'ssl://' : '';
    $socket = @stream_socket_client($transport . $host . ':' . $port, $errno, $errstr, 15);
    if (!$socket) return ['success' => false, 'error' => "SMTP bağlantı hatası: $errstr ($errno)"];

    $read = function() use ($socket) {
        $r = '';
        while ($line = fgets($socket, 515)) {
            $r .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        return $r;
    };
    $write = function($cmd) use ($socket) {
        fwrite($socket, $cmd . "\r\n");
    };

    $read();
    $write('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $read();

    if ($enc === 'tls') {
        $write('STARTTLS');
        $read();
        @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        $write('EHLO ' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
        $read();
    }

    $write('AUTH LOGIN');
    $read();
    $write(base64_encode($user));
    $read();
    $write(base64_encode($pass));
    $authRes = $read();
    if (strpos($authRes, '235') === false) {
        fclose($socket);
        return ['success' => false, 'error' => 'SMTP kimlik doğrulama başarısız: ' . trim($authRes)];
    }

    $write('MAIL FROM:<' . $from . '>');
    $read();

    $aliciListe = array_filter(array_map('trim', preg_split('/[,;]/', $to . ($cc ? ',' . $cc : '') . ($bcc ? ',' . $bcc : ''))));
    foreach ($aliciListe as $a) {
        $write('RCPT TO:<' . $a . '>');
        $read();
    }

    $write('DATA');
    $read();

    $boundary = 'mr-' . bin2hex(random_bytes(8));
    $msgId = '<' . bin2hex(random_bytes(10)) . '@' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '>';
    $headers = [];
    $headers[] = 'From: ' . mb_encode_mimeheader($fromAdi, 'UTF-8') . ' <' . $from . '>';
    $headers[] = 'To: ' . $to;
    if ($cc) $headers[] = 'Cc: ' . $cc;
    $headers[] = 'Subject: ' . mb_encode_mimeheader($subject, 'UTF-8');
    $headers[] = 'Date: ' . date('r');
    $headers[] = 'Message-ID: ' . $msgId;
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';

    $body = '';
    $body .= '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($text)) . "\r\n";
    $body .= '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($html)) . "\r\n";
    $body .= '--' . $boundary . "--\r\n";

    $msg = implode("\r\n", $headers) . "\r\n\r\n" . $body;
    // Satır başı nokta kaçışı
    $msg = str_replace("\r\n.", "\r\n..", $msg);

    fwrite($socket, $msg . "\r\n.\r\n");
    $sendRes = $read();

    $write('QUIT');
    fclose($socket);

    if (strpos($sendRes, '250') === false) {
        return ['success' => false, 'error' => 'SMTP gönderim hatası: ' . trim($sendRes)];
    }
    return ['success' => true, 'message_id' => $msgId];
}
}
