<?php
/**
 * MR HASAR DANIŞMANLIK - MAIL HELPER
 * IMAP / SMTP E-Posta Entegrasyonu
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/helpers.php';

/**
 * Mail ayarlarını oku
 */
function mail_ayarlari_oku($db = null) {
    if (!$db) $db = getDB();
    $ayarlar = [];
    try {
        $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'mail_%'");
        while ($row = $stmt->fetch()) {
            $ayarlar[$row['anahtar']] = $row['deger'];
        }
    } catch (Exception $e) {}
    return $ayarlar;
}

/**
 * Mail tablosunu oluştur
 */
function mail_tablo_olustur($db = null) {
    if (!$db) $db = getDB();
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS mail_hesaplari (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            display_name VARCHAR(255) DEFAULT NULL,
            imap_sunucu VARCHAR(255) NOT NULL DEFAULT 'mail.mrhasardanismanlik.com',
            imap_port INT NOT NULL DEFAULT 993,
            smtp_sunucu VARCHAR(255) NOT NULL DEFAULT 'mail.mrhasardanismanlik.com',
            smtp_port INT NOT NULL DEFAULT 465,
            kullanici VARCHAR(255) NOT NULL,
            sifre TEXT NOT NULL,
            guvenlik ENUM('ssl','tls','none') DEFAULT 'ssl',
            aktif TINYINT(1) DEFAULT 1,
            son_sync DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

        $db->exec("CREATE TABLE IF NOT EXISTS mailler (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hesap_id INT NOT NULL,
            message_id VARCHAR(255) DEFAULT NULL,
            uid INT DEFAULT NULL,
            klasor VARCHAR(100) DEFAULT 'INBOX',
            gonderen VARCHAR(255) NOT NULL,
            gonderen_adi VARCHAR(255) DEFAULT NULL,
            alici TEXT DEFAULT NULL,
            cc TEXT DEFAULT NULL,
            konu VARCHAR(500) DEFAULT NULL,
            icerik LONGTEXT DEFAULT NULL,
            icerik_text TEXT DEFAULT NULL,
            tarih DATETIME DEFAULT NULL,
            okundu TINYINT(1) DEFAULT 0,
            yildizli TINYINT(1) DEFAULT 0,
            ek_sayisi INT DEFAULT 0,
            boyut INT DEFAULT 0,
            yon ENUM('gelen','giden','taslak') DEFAULT 'gelen',
            dosya_id INT DEFAULT NULL,
            crm_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_hesap (hesap_id),
            INDEX idx_klasor (klasor),
            INDEX idx_tarih (tarih),
            INDEX idx_okundu (okundu),
            INDEX idx_yon (yon),
            INDEX idx_uid (uid),
            UNIQUE KEY uk_msg (hesap_id, uid, klasor)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

        $db->exec("CREATE TABLE IF NOT EXISTS mail_ekleri (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mail_id INT NOT NULL,
            dosya_adi VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) DEFAULT NULL,
            boyut INT DEFAULT 0,
            icerik LONGBLOB DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_mail (mail_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
    } catch (Exception $e) {
        error_log('MAIL_TABLO_HATA: ' . $e->getMessage());
    }
}

/**
 * IMAP bağlantısı aç
 */
function mail_imap_baglan($hesap) {
    if (!function_exists('imap_open')) {
        return ['basarili' => false, 'mesaj' => 'PHP IMAP MODÜLÜ YÜKLÜ DEĞİL. SUNUCUDA php-imap KURULMALI.', 'conn' => null];
    }

    $guvenlik = $hesap['guvenlik'] ?? 'ssl';
    $port = $hesap['imap_port'] ?? 993;
    $sunucu = $hesap['imap_sunucu'] ?? 'mail.mrhasardanismanlik.com';

    $flags = '/imap';
    if ($guvenlik === 'ssl') $flags .= '/ssl';
    elseif ($guvenlik === 'tls') $flags .= '/tls';
    $flags .= '/novalidate-cert';

    $mailbox = '{' . $sunucu . ':' . $port . $flags . '}';

    $conn = @imap_open($mailbox . 'INBOX', $hesap['kullanici'], $hesap['sifre'], 0, 3);

    if (!$conn) {
        $err = imap_last_error() ?: 'BAĞLANTI BAŞARISIZ';
        return ['basarili' => false, 'mesaj' => 'IMAP BAĞLANTI HATASI: ' . $err, 'conn' => null];
    }

    return ['basarili' => true, 'mesaj' => 'BAĞLANTI BAŞARILI', 'conn' => $conn, 'mailbox' => $mailbox];
}

/**
 * IMAP ile mailleri çek ve DB'ye kaydet
 */
function mail_sync($hesapId, $limit = 50) {
    $db = getDB();
    mail_tablo_olustur($db);

    $stmt = $db->prepare("SELECT * FROM mail_hesaplari WHERE id = ? AND aktif = 1");
    $stmt->execute([$hesapId]);
    $hesap = $stmt->fetch();

    if (!$hesap) {
        return ['basarili' => false, 'mesaj' => 'HESAP BULUNAMADI VEYA PASİF'];
    }

    $baglanti = mail_imap_baglan($hesap);
    if (!$baglanti['basarili']) return $baglanti;

    $conn = $baglanti['conn'];
    $mailbox = $baglanti['mailbox'];
    $yeniSayisi = 0;

    // Son UID'yi bul
    $stmtLast = $db->prepare("SELECT MAX(uid) FROM mailler WHERE hesap_id = ? AND klasor = 'INBOX'");
    $stmtLast->execute([$hesapId]);
    $sonUid = (int)$stmtLast->fetchColumn();

    // Yeni mailleri çek
    $search = $sonUid > 0 ? imap_search($conn, 'UID ' . ($sonUid + 1) . ':*', SE_UID) : imap_search($conn, 'ALL', SE_UID);

    if ($search && is_array($search)) {
        // Son N mail
        $search = array_slice(array_reverse($search), 0, $limit);

        foreach ($search as $uid) {
            if ($uid <= $sonUid && $sonUid > 0) continue;

            try {
                $overview = imap_fetch_overview($conn, $uid, FT_UID);
                if (!$overview || empty($overview[0])) continue;
                $msg = $overview[0];

                $msgno = imap_msgno($conn, $uid);
                if ($msgno <= 0) continue;

                $header = @imap_headerinfo($conn, $msgno);
                $from = '';
                $fromName = '';
                if ($header && isset($header->from[0])) {
                    $from = ($header->from[0]->mailbox ?? '') . '@' . ($header->from[0]->host ?? '');
                    $fromName = isset($header->from[0]->personal) ? imap_utf8($header->from[0]->personal) : '';
                }

                $to = '';
                if ($header && isset($header->to)) {
                    $toArr = [];
                    foreach ($header->to as $t) {
                        $toArr[] = ($t->mailbox ?? '') . '@' . ($t->host ?? '');
                    }
                    $to = implode(', ', $toArr);
                }

                $cc = '';
                if ($header && isset($header->cc)) {
                    $ccArr = [];
                    foreach ($header->cc as $c) {
                        $ccArr[] = ($c->mailbox ?? '') . '@' . ($c->host ?? '');
                    }
                    $cc = implode(', ', $ccArr);
                }

                $konu = isset($msg->subject) ? imap_utf8($msg->subject) : '(KONU YOK)';
                $tarih = isset($msg->date) ? date('Y-m-d H:i:s', strtotime($msg->date)) : date('Y-m-d H:i:s');
                $okundu = isset($msg->seen) ? (int)$msg->seen : 0;
                $boyut = isset($msg->size) ? (int)$msg->size : 0;

                // Mail içeriğini çek (önce text, sonra HTML)
                $body = mail_icerik_cek($conn, $msgno);
                $bodyText = strip_tags($body['text'] ?: $body['html']);
                $bodyHtml = $body['html'] ?: nl2br(htmlspecialchars($body['text'] ?: ''));

                // Ek sayısı
                $structure = @imap_fetchstructure($conn, $msgno);
                $ekSayisi = 0;
                if ($structure && isset($structure->parts)) {
                    foreach ($structure->parts as $part) {
                        if (isset($part->disposition) && strtoupper($part->disposition) === 'ATTACHMENT') {
                            $ekSayisi++;
                        }
                    }
                }

                // DB'ye kaydet
                $stmtInsert = $db->prepare("
                    INSERT IGNORE INTO mailler (hesap_id, uid, klasor, gonderen, gonderen_adi, alici, cc, konu, icerik, icerik_text, tarih, okundu, ek_sayisi, boyut, yon)
                    VALUES (?, ?, 'INBOX', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'gelen')
                ");
                $stmtInsert->execute([
                    $hesapId, $uid, $from, $fromName, $to, $cc,
                    mb_substr($konu, 0, 500),
                    $bodyHtml,
                    mb_substr($bodyText, 0, 65000),
                    $tarih, $okundu, $ekSayisi, $boyut
                ]);

                if ($stmtInsert->rowCount() > 0) $yeniSayisi++;

            } catch (Exception $e) {
                error_log('MAIL_SYNC_HATA: UID=' . $uid . ' - ' . $e->getMessage());
                continue;
            }
        }
    }

    // Son sync tarihini güncelle
    $db->prepare("UPDATE mail_hesaplari SET son_sync = NOW() WHERE id = ?")->execute([$hesapId]);

    imap_close($conn);

    return ['basarili' => true, 'mesaj' => $yeniSayisi . ' YENİ MAIL SENKRONİZE EDİLDİ', 'yeni' => $yeniSayisi];
}

/**
 * Mail içeriğini çek (text + html)
 */
function mail_icerik_cek($conn, $msgno) {
    $result = ['text' => '', 'html' => ''];

    $structure = @imap_fetchstructure($conn, $msgno);
    if (!$structure) return $result;

    if (!isset($structure->parts) || empty($structure->parts)) {
        // Tek parçalı mail
        $body = imap_fetchbody($conn, $msgno, '1');
        $body = mail_decode($body, $structure->encoding ?? 0);
        if (isset($structure->subtype) && strtoupper($structure->subtype) === 'HTML') {
            $result['html'] = $body;
        } else {
            $result['text'] = $body;
        }
    } else {
        // Çok parçalı mail
        foreach ($structure->parts as $idx => $part) {
            $partNum = ($idx + 1);
            if (isset($part->subtype)) {
                $subtype = strtoupper($part->subtype);
                if ($subtype === 'PLAIN' && empty($result['text'])) {
                    $body = imap_fetchbody($conn, $msgno, (string)$partNum);
                    $result['text'] = mail_decode($body, $part->encoding ?? 0);
                }
                if ($subtype === 'HTML' && empty($result['html'])) {
                    $body = imap_fetchbody($conn, $msgno, (string)$partNum);
                    $result['html'] = mail_decode($body, $part->encoding ?? 0);
                }
                // Multipart/alternative
                if ($subtype === 'ALTERNATIVE' && isset($part->parts)) {
                    foreach ($part->parts as $subIdx => $subPart) {
                        $subPartNum = $partNum . '.' . ($subIdx + 1);
                        $subSubtype = strtoupper($subPart->subtype ?? '');
                        if ($subSubtype === 'PLAIN' && empty($result['text'])) {
                            $body = imap_fetchbody($conn, $msgno, $subPartNum);
                            $result['text'] = mail_decode($body, $subPart->encoding ?? 0);
                        }
                        if ($subSubtype === 'HTML' && empty($result['html'])) {
                            $body = imap_fetchbody($conn, $msgno, $subPartNum);
                            $result['html'] = mail_decode($body, $subPart->encoding ?? 0);
                        }
                    }
                }
            }
        }
    }

    // Charset düzeltme
    $charset = mail_charset_bul($structure);
    if ($charset && strtoupper($charset) !== 'UTF-8') {
        if (!empty($result['text'])) $result['text'] = @mb_convert_encoding($result['text'], 'UTF-8', $charset) ?: $result['text'];
        if (!empty($result['html'])) $result['html'] = @mb_convert_encoding($result['html'], 'UTF-8', $charset) ?: $result['html'];
    }

    return $result;
}

/**
 * Mail encoding decode
 */
function mail_decode($data, $encoding) {
    switch ($encoding) {
        case 0: // 7BIT
        case 1: // 8BIT
            return $data;
        case 2: // BINARY
            return $data;
        case 3: // BASE64
            return base64_decode($data);
        case 4: // QUOTED-PRINTABLE
            return quoted_printable_decode($data);
        default:
            return $data;
    }
}

/**
 * Charset bul
 */
function mail_charset_bul($structure) {
    if (isset($structure->parameters)) {
        foreach ($structure->parameters as $p) {
            if (strtoupper($p->attribute) === 'CHARSET') {
                return $p->value;
            }
        }
    }
    if (isset($structure->parts[0]->parameters)) {
        foreach ($structure->parts[0]->parameters as $p) {
            if (strtoupper($p->attribute) === 'CHARSET') {
                return $p->value;
            }
        }
    }
    return 'UTF-8';
}

/**
 * SMTP ile mail gönder
 */
function mail_gonder($hesapId, $alici, $konu, $icerik, $cc = '', $bcc = '', $ekler = []) {
    $db = getDB();
    mail_tablo_olustur($db);

    $stmt = $db->prepare("SELECT * FROM mail_hesaplari WHERE id = ? AND aktif = 1");
    $stmt->execute([$hesapId]);
    $hesap = $stmt->fetch();

    if (!$hesap) {
        return ['basarili' => false, 'mesaj' => 'HESAP BULUNAMADI VEYA PASİF'];
    }

    $smtp_sunucu = $hesap['smtp_sunucu'] ?? 'mail.mrhasardanismanlik.com';
    $smtp_port = (int)($hesap['smtp_port'] ?? 465);
    $guvenlik = $hesap['guvenlik'] ?? 'ssl';
    $kullanici = $hesap['kullanici'];
    $sifre = $hesap['sifre'];
    $fromEmail = $hesap['email'];
    $fromName = $hesap['display_name'] ?: $hesap['email'];

    // Boundary oluştur
    $boundary = md5(uniqid(time()));
    $boundaryMixed = 'MR_MIXED_' . $boundary;
    $boundaryAlt = 'MR_ALT_' . $boundary;

    // HEADERS
    $headers = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>\r\n";
    $headers .= "To: {$alici}\r\n";
    if ($cc) $headers .= "Cc: {$cc}\r\n";
    if ($bcc) $headers .= "Bcc: {$bcc}\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($konu) . "?=\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Date: " . date('r') . "\r\n";
    $headers .= "Message-ID: <" . uniqid() . "@" . ($hesap['imap_sunucu'] ?? 'mrhasardanismanlik.com') . ">\r\n";
    $headers .= "X-Mailer: MR-Hasar-CRM/1.0\r\n";

    if (!empty($ekler)) {
        $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundaryMixed}\"\r\n";
    } else {
        $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundaryAlt}\"\r\n";
    }

    // BODY
    $body = '';
    $textContent = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $icerik));

    if (!empty($ekler)) {
        $body .= "--{$boundaryMixed}\r\n";
        $body .= "Content-Type: multipart/alternative; boundary=\"{$boundaryAlt}\"\r\n\r\n";
    }

    // Text part
    $body .= "--{$boundaryAlt}\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($textContent)) . "\r\n";

    // HTML part
    $body .= "--{$boundaryAlt}\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;">' . $icerik . '</body></html>';
    $body .= chunk_split(base64_encode($htmlBody)) . "\r\n";
    $body .= "--{$boundaryAlt}--\r\n";

    // Ekler
    if (!empty($ekler)) {
        foreach ($ekler as $ek) {
            $body .= "--{$boundaryMixed}\r\n";
            $body .= "Content-Type: " . ($ek['mime_type'] ?? 'application/octet-stream') . "; name=\"" . $ek['dosya_adi'] . "\"\r\n";
            $body .= "Content-Disposition: attachment; filename=\"" . $ek['dosya_adi'] . "\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($ek['icerik'])) . "\r\n";
        }
        $body .= "--{$boundaryMixed}--\r\n";
    }

    // SMTP bağlantısı kur
    $sonuc = mail_smtp_gonder($smtp_sunucu, $smtp_port, $guvenlik, $kullanici, $sifre, $fromEmail, $alici, $cc, $bcc, $headers, $body);

    if ($sonuc['basarili']) {
        // DB'ye kaydet
        try {
            $stmtInsert = $db->prepare("
                INSERT INTO mailler (hesap_id, klasor, gonderen, gonderen_adi, alici, cc, konu, icerik, icerik_text, tarih, okundu, yon)
                VALUES (?, 'Sent', ?, ?, ?, ?, ?, ?, ?, NOW(), 1, 'giden')
            ");
            $stmtInsert->execute([
                $hesapId, $fromEmail, $fromName, $alici, $cc ?: null,
                mb_substr($konu, 0, 500), $icerik, mb_substr($textContent, 0, 65000)
            ]);
        } catch (Exception $e) {}
    }

    return $sonuc;
}

/**
 * SMTP ile mail gönder (socket bazlı)
 */
function mail_smtp_gonder($host, $port, $guvenlik, $user, $pass, $from, $to, $cc, $bcc, $headers, $body) {
    $prefix = ($guvenlik === 'ssl') ? 'ssl://' : '';
    $context = stream_context_create([
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true]
    ]);

    $socket = @stream_socket_client($prefix . $host . ':' . $port, $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);

    if (!$socket) {
        return ['basarili' => false, 'mesaj' => 'SMTP BAĞLANTI HATASI: ' . $errstr];
    }

    stream_set_timeout($socket, 30);

    $response = fgets($socket, 512);
    if (substr($response, 0, 3) !== '220') {
        fclose($socket);
        return ['basarili' => false, 'mesaj' => 'SMTP SUNUCU YANIT HATASI: ' . trim($response)];
    }

    // EHLO
    fwrite($socket, "EHLO mrhasardanismanlik.com\r\n");
    $ehloResp = '';
    while ($line = fgets($socket, 512)) {
        $ehloResp .= $line;
        if (substr($line, 3, 1) === ' ') break;
    }

    // STARTTLS (sadece tls modunda)
    if ($guvenlik === 'tls') {
        fwrite($socket, "STARTTLS\r\n");
        $startTlsResp = fgets($socket, 512);
        if (substr($startTlsResp, 0, 3) !== '220') {
            fclose($socket);
            return ['basarili' => false, 'mesaj' => 'STARTTLS HATASI: ' . trim($startTlsResp)];
        }
        stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT);
        fwrite($socket, "EHLO mrhasardanismanlik.com\r\n");
        while ($line = fgets($socket, 512)) {
            if (substr($line, 3, 1) === ' ') break;
        }
    }

    // AUTH LOGIN
    fwrite($socket, "AUTH LOGIN\r\n");
    $authResp = fgets($socket, 512);
    if (substr($authResp, 0, 3) !== '334') {
        fclose($socket);
        return ['basarili' => false, 'mesaj' => 'AUTH HATASI: ' . trim($authResp)];
    }

    fwrite($socket, base64_encode($user) . "\r\n");
    $userResp = fgets($socket, 512);
    if (substr($userResp, 0, 3) !== '334') {
        fclose($socket);
        return ['basarili' => false, 'mesaj' => 'KULLANICI HATASI: ' . trim($userResp)];
    }

    fwrite($socket, base64_encode($pass) . "\r\n");
    $passResp = fgets($socket, 512);
    if (substr($passResp, 0, 3) !== '235') {
        fclose($socket);
        return ['basarili' => false, 'mesaj' => 'GİRİŞ BAŞARISIZ - KULLANICI ADI VEYA ŞİFRE HATALI'];
    }

    // MAIL FROM
    fwrite($socket, "MAIL FROM:<{$from}>\r\n");
    $mailFromResp = fgets($socket, 512);
    if (substr($mailFromResp, 0, 3) !== '250') {
        fclose($socket);
        return ['basarili' => false, 'mesaj' => 'MAIL FROM HATASI: ' . trim($mailFromResp)];
    }

    // RCPT TO (to, cc, bcc)
    $alicilar = array_filter(array_map('trim', explode(',', $to . ',' . $cc . ',' . $bcc)));
    foreach ($alicilar as $a) {
        if (empty($a)) continue;
        fwrite($socket, "RCPT TO:<{$a}>\r\n");
        $rcptResp = fgets($socket, 512);
        if (substr($rcptResp, 0, 3) !== '250' && substr($rcptResp, 0, 3) !== '251') {
            // Devam et, bazı alıcılar başarısız olabilir
        }
    }

    // DATA
    fwrite($socket, "DATA\r\n");
    $dataResp = fgets($socket, 512);
    if (substr($dataResp, 0, 3) !== '354') {
        fclose($socket);
        return ['basarili' => false, 'mesaj' => 'DATA HATASI: ' . trim($dataResp)];
    }

    // Mail içeriği gönder
    fwrite($socket, $headers . "\r\n" . $body . "\r\n.\r\n");
    $sendResp = fgets($socket, 512);

    // QUIT
    fwrite($socket, "QUIT\r\n");
    fclose($socket);

    if (substr($sendResp, 0, 3) === '250') {
        return ['basarili' => true, 'mesaj' => 'MAIL BAŞARIYLA GÖNDERİLDİ'];
    }

    return ['basarili' => false, 'mesaj' => 'GÖNDERİM HATASI: ' . trim($sendResp)];
}
