<?php
/**
 * POST /api/v1/mail/test.php
 * IMAP + SMTP bağlantı testi. Body: { hesap_id } veya hesap alanları
 */

/* DEBUG MODU - 500 yerine JSON ile fatal hata mesaji donder */
ini_set('display_errors', 0);
error_reporting(E_ALL);
register_shutdown_function(function(){
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
        }
        echo json_encode([
            'success' => false,
            'error' => 'PHP FATAL: ' . $err['message'],
            'file' => basename($err['file']),
            'line' => $err['line']
        ], JSON_UNESCAPED_UNICODE);
    }
});
set_error_handler(function($severity, $message, $file, $line){
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

try {
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('POST');
mail_ensure_tables();
$user = auth_required();
$db = getDB();
$body = get_json_body();

// Hesap: kayıtlı mı yeni mi
if (!empty($body['hesap_id'])) {
    $stmt = $db->prepare('SELECT * FROM mail_hesaplar WHERE id = ?');
    $stmt->execute([(int)$body['hesap_id']]);
    $hesap = $stmt->fetch();
    if (!$hesap) json_error('Hesap bulunamadı', 404);
    if ($user['rol'] !== 'admin' && (int)$hesap['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);
} else {
    require_fields($body, ['email', 'imap_host', 'smtp_host']);
    $hesap = [
        'email' => clean($body['email']),
        'gonderen_adi' => clean($body['gonderen_adi'] ?? ''),
        'imap_host' => clean($body['imap_host']),
        'imap_port' => (int)($body['imap_port'] ?? 993),
        'imap_encryption' => clean($body['imap_encryption'] ?? 'ssl'),
        'smtp_host' => clean($body['smtp_host']),
        'smtp_port' => (int)($body['smtp_port'] ?? 465),
        'smtp_encryption' => clean($body['smtp_encryption'] ?? 'ssl'),
        'kullanici_adi' => clean($body['kullanici_adi'] ?? $body['email']),
        'sifre_sifreli' => mail_sifrele($body['sifre'] ?? '')
    ];
}

$sonuc = ['imap' => null, 'smtp' => null];

// IMAP test
try {
    $inbox = mail_imap_baglan($hesap);
    $imap_sayi = imap_num_msg($inbox);
    imap_close($inbox);
    $sonuc['imap'] = ['success' => true, 'toplam_mesaj' => $imap_sayi];
} catch (\Exception $e) {
    $sonuc['imap'] = ['success' => false, 'error' => $e->getMessage()];
}

// SMTP test (bağlantı + AUTH, gönderim değil) - ROBUST multi-line oku
try {
    $host = $hesap['smtp_host']; $port = (int)($hesap['smtp_port'] ?: 465);
    $enc = $hesap['smtp_encryption'] ?: 'ssl';
    $transport = $enc === 'ssl' ? 'ssl://' : '';
    $socket = @stream_socket_client($transport . $host . ':' . $port, $errno, $errstr, 10);
    if (!$socket) throw new \Exception("SMTP bağlantı hatası: $errstr ($errno)");
    stream_set_timeout($socket, 10);

    /* Multi-line SMTP yanit okuyucu - "XXX SPACE" satiri sonu kabul eder */
    $smtp_oku = function($s) {
        $tum = '';
        while (!feof($s)) {
            $line = fgets($s, 1024);
            if ($line === false) break;
            $tum .= $line;
            // SMTP standardi: "XXX " (3 rakam + space) son satirdir, "XXX-" devam ediyor
            if (preg_match('/^\d{3} /', $line)) break;
            $info = stream_get_meta_data($s);
            if (!empty($info['timed_out'])) break;
        }
        return $tum;
    };

    $banner = $smtp_oku($socket);                       // 220 banner
    fwrite($socket, 'EHLO mrhasar' . "\r\n");
    $ehlo = $smtp_oku($socket);                          // 250 multi-line

    if ($enc === 'tls') {
        fwrite($socket, "STARTTLS\r\n");
        $smtp_oku($socket);
        @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        fwrite($socket, 'EHLO mrhasar' . "\r\n");
        $smtp_oku($socket);
    }

    fwrite($socket, "AUTH LOGIN\r\n");
    $authReq = $smtp_oku($socket);                      // 334 VXNlcm5hbWU6 (Username:)

    fwrite($socket, base64_encode($hesap['kullanici_adi'] ?: $hesap['email']) . "\r\n");
    $userResp = $smtp_oku($socket);                     // 334 UGFzc3dvcmQ6 (Password:)

    fwrite($socket, base64_encode(mail_coz($hesap['sifre_sifreli'])) . "\r\n");
    $auth = $smtp_oku($socket);                          // 235 OK veya 535 Auth fail

    fwrite($socket, "QUIT\r\n");
    fclose($socket);

    if (strpos($auth, '235') === false) {
        throw new \Exception('SMTP AUTH BAŞARISIZ: ' . trim($auth));
    }
    $sonuc['smtp'] = ['success' => true, 'mesaj' => 'SMTP AUTH başarılı'];
} catch (\Exception $e) {
    $sonuc['smtp'] = ['success' => false, 'error' => $e->getMessage()];
}

$tamBasari = $sonuc['imap']['success'] && $sonuc['smtp']['success'];
json_success($sonuc, $tamBasari ? 'Her iki bağlantı başarılı' : 'Bağlantıda sorun var');

} catch (\Throwable $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'error' => 'EXCEPTION: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
        'trace_first' => explode("\n", $e->getTraceAsString())[0] ?? ''
    ], JSON_UNESCAPED_UNICODE);
}
