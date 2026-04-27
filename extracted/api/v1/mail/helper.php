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

        /* IDEMPOTENT MIGRATIONS - mevcut kayitlara dokunmaz */
        try { $db->exec("ALTER TABLE mail_hesaplar ADD COLUMN imza_html LONGTEXT DEFAULT NULL"); } catch (\Exception $e) {}
        try { $db->exec("ALTER TABLE mail_hesaplar ADD COLUMN varsayilan TINYINT(1) DEFAULT 0"); } catch (\Exception $e) {}

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

/* Mail ekleri icin guvenli upload klasoru */
if (!function_exists('mail_ek_klasor')) {
function mail_ek_klasor($hesapId, $mesajId) {
    $base = __DIR__ . '/../../../uploads/mail-ekler';
    if (!is_dir($base)) @mkdir($base, 0755, true);
    $hesapDir = $base . '/' . (int)$hesapId;
    if (!is_dir($hesapDir)) @mkdir($hesapDir, 0755, true);
    $mesajDir = $hesapDir . '/' . (int)$mesajId;
    if (!is_dir($mesajDir)) @mkdir($mesajDir, 0755, true);
    return $mesajDir;
}
}

/* Recursive part walker - tum HTML, plain ve EKLERI cikarir
   $struct: imap_fetchstructure cikti
   Return: ['html'=>..., 'text'=>..., 'ekler'=>[{partNum, ad, mime, boyut, encoding}, ...]] */
if (!function_exists('mail_part_walk')) {
function mail_part_walk($imap, $msgNum, $struct, $prefix = '') {
    $sonuc = ['html' => '', 'text' => '', 'ekler' => []];
    $decode = function($payload, $encoding) {
        if ($encoding == 3) return base64_decode($payload);
        if ($encoding == 4) return quoted_printable_decode($payload);
        return $payload;
    };

    /* Tek parca mesaj */
    if (empty($struct->parts)) {
        $partNum = $prefix === '' ? '1' : $prefix;
        $data = imap_fetchbody($imap, $msgNum, $partNum ?: '1');
        $data = $decode($data, $struct->encoding ?? 0);
        $charset = 'UTF-8';
        if (!empty($struct->parameters)) {
            foreach ($struct->parameters as $p) {
                if (strtolower($p->attribute) === 'charset') $charset = $p->value;
            }
        }
        if (strtolower($charset) !== 'utf-8') $data = @mb_convert_encoding($data, 'UTF-8', $charset);
        $subtype = strtoupper($struct->subtype ?? '');
        if ($subtype === 'HTML') $sonuc['html'] = $data;
        else $sonuc['text'] = $data;
        return $sonuc;
    }

    foreach ($struct->parts as $i => $part) {
        $partNum = $prefix === '' ? (string)($i + 1) : $prefix . '.' . ($i + 1);

        /* Recursive: nested multipart */
        if (!empty($part->parts) && (strtoupper($part->type === 1 ? 'MULTIPART' : '') || $part->subtype === 'ALTERNATIVE' || $part->subtype === 'MIXED' || $part->subtype === 'RELATED')) {
            $alt = mail_part_walk($imap, $msgNum, $part, $partNum);
            if ($alt['html']) $sonuc['html'] .= $alt['html'];
            if ($alt['text']) $sonuc['text'] .= $alt['text'];
            $sonuc['ekler'] = array_merge($sonuc['ekler'], $alt['ekler']);
            continue;
        }

        /* EK dosya tespit: dispoition=attachment VEYA filename parametresi VEYA content-id (inline image) */
        $isAttachment = false;
        $dosyaAdi = '';
        if (!empty($part->disposition) && strtolower($part->disposition) === 'attachment') $isAttachment = true;
        if (!empty($part->dparameters)) {
            foreach ($part->dparameters as $dp) {
                if (strtolower($dp->attribute) === 'filename') { $dosyaAdi = imap_utf8($dp->value); $isAttachment = true; }
            }
        }
        if (!empty($part->parameters)) {
            foreach ($part->parameters as $p) {
                if (strtolower($p->attribute) === 'name') { if (!$dosyaAdi) $dosyaAdi = imap_utf8($p->value); $isAttachment = true; }
            }
        }

        if ($isAttachment) {
            $sonuc['ekler'][] = [
                'partNum' => $partNum,
                'ad' => $dosyaAdi ?: ('ek-' . $partNum),
                'mime' => strtolower(($part->type ? '' : 'TEXT') . '/' . ($part->subtype ?? 'BIN')),
                'boyut' => (int)($part->bytes ?? 0),
                'encoding' => (int)($part->encoding ?? 0)
            ];
            continue;
        }

        /* Govde: HTML veya PLAIN */
        $data = imap_fetchbody($imap, $msgNum, $partNum);
        $data = $decode($data, $part->encoding ?? 0);
        $charset = 'UTF-8';
        if (!empty($part->parameters)) {
            foreach ($part->parameters as $p) {
                if (strtolower($p->attribute) === 'charset') $charset = $p->value;
            }
        }
        if (strtolower($charset) !== 'utf-8') $data = @mb_convert_encoding($data, 'UTF-8', $charset);
        $subtype = strtoupper($part->subtype ?? '');
        if ($subtype === 'HTML') $sonuc['html'] .= $data;
        elseif ($subtype === 'PLAIN') $sonuc['text'] .= $data;
    }
    return $sonuc;
}
}

if (!function_exists('mail_imap_baglan')) {
function mail_imap_baglan($hesap, $klasor = 'INBOX') {
    if (!function_exists('imap_open')) {
        throw new \Exception('PHP IMAP uzantısı sunucuda yüklü değil. cPanel PHP Selector → imap uzantısını etkinleştirin.');
    }
    $port = (int)$hesap['imap_port'] ?: 993;
    $enc = $hesap['imap_encryption'] ?: 'ssl';
    $flag = $enc === 'tls' ? '/tls' : ($enc === 'ssl' ? '/ssl' : '');
    $sunucu = '{' . $hesap['imap_host'] . ':' . $port . '/imap' . $flag . '/novalidate-cert}' . $klasor;
    $sifre = mail_coz($hesap['sifre_sifreli']);
    $inbox = @imap_open($sunucu, $hesap['kullanici_adi'] ?: $hesap['email'], $sifre, 0, 1);
    if (!$inbox) {
        throw new \Exception('IMAP bağlantı hatası (klasor=' . $klasor . '): ' . imap_last_error());
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
    stream_set_timeout($socket, 15);

    /* Multi-line SMTP yanit okuyucu - "XXX SPACE" satiri sonu kabul eder
       Bazi sunucularda EHLO yanitinda 5+ satir olabilir, hepsini topla */
    $read = function() use ($socket) {
        $r = '';
        while (!feof($socket)) {
            $line = fgets($socket, 1024);
            if ($line === false) break;
            $r .= $line;
            if (preg_match('/^\d{3} /', $line)) break;
            $info = stream_get_meta_data($socket);
            if (!empty($info['timed_out'])) break;
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

    /* IMZA otomatik EKLE (eger hesapta tanimliysa) */
    if (!empty($hesap['imza_html'])) {
        $imza = $hesap['imza_html'];
        if (stripos($html, $imza) === false) {
            $html = ($html ?: '<div></div>') . '<br/><br/>' . $imza;
        }
    }
    if (!$text && $html) $text = trim(strip_tags($html));

    /* Ekler varsa multipart/mixed sarmalama, yoksa direkt multipart/alternative */
    $ekler = $data['attachments'] ?? [];
    $ekler = is_array($ekler) ? $ekler : [];
    $boundaryAlt = 'mr-alt-' . bin2hex(random_bytes(6));
    $boundaryMixed = 'mr-mix-' . bin2hex(random_bytes(6));
    $msgId = '<' . bin2hex(random_bytes(10)) . '@' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '>';
    $headers = [];
    $headers[] = 'From: ' . mb_encode_mimeheader($fromAdi, 'UTF-8') . ' <' . $from . '>';
    $headers[] = 'To: ' . $to;
    if ($cc) $headers[] = 'Cc: ' . $cc;
    $headers[] = 'Subject: ' . mb_encode_mimeheader($subject, 'UTF-8');
    $headers[] = 'Date: ' . date('r');
    $headers[] = 'Message-ID: ' . $msgId;
    $headers[] = 'MIME-Version: 1.0';

    /* Govde olusturma: alt = HTML+TEXT alternative */
    $altBody = '';
    $altBody .= '--' . $boundaryAlt . "\r\n";
    $altBody .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $altBody .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $altBody .= chunk_split(base64_encode($text)) . "\r\n";
    $altBody .= '--' . $boundaryAlt . "\r\n";
    $altBody .= "Content-Type: text/html; charset=UTF-8\r\n";
    $altBody .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $altBody .= chunk_split(base64_encode($html)) . "\r\n";
    $altBody .= '--' . $boundaryAlt . "--\r\n";

    if (empty($ekler)) {
        /* Ek yok - direkt alternative */
        $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundaryAlt . '"';
        $body = $altBody;
    } else {
        /* Ek var - mixed sarmala */
        $headers[] = 'Content-Type: multipart/mixed; boundary="' . $boundaryMixed . '"';
        $body = '';
        $body .= '--' . $boundaryMixed . "\r\n";
        $body .= 'Content-Type: multipart/alternative; boundary="' . $boundaryAlt . '"' . "\r\n\r\n";
        $body .= $altBody . "\r\n";
        foreach ($ekler as $ek) {
            $ekAd = $ek['ad'] ?? 'ek.bin';
            $ekMime = $ek['mime'] ?? 'application/octet-stream';
            $ekVeri = $ek['veri'] ?? '';
            if (!$ekVeri && !empty($ek['path']) && file_exists($ek['path'])) {
                $ekVeri = file_get_contents($ek['path']);
            }
            if (!$ekVeri) continue;
            $body .= '--' . $boundaryMixed . "\r\n";
            $body .= 'Content-Type: ' . $ekMime . '; name="' . addslashes($ekAd) . '"' . "\r\n";
            $body .= 'Content-Transfer-Encoding: base64' . "\r\n";
            $body .= 'Content-Disposition: attachment; filename="' . addslashes($ekAd) . '"' . "\r\n\r\n";
            $body .= chunk_split(base64_encode($ekVeri)) . "\r\n";
        }
        $body .= '--' . $boundaryMixed . "--\r\n";
    }

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
