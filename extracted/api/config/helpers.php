<?php
function setup_headers() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function get_json_body() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : array();
}

function json_success($data = null, $message = 'Basarili', $code = 200) {
    http_response_code($code);
    echo json_encode(array('success' => true, 'message' => $message, 'data' => $data), JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error($message, $code = 400, $detail = null) {
    http_response_code($code);
    $response = array('success' => false, 'error' => $message);
    if ($detail !== null) $response['detail'] = $detail;
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function require_method() {
    $methods = func_get_args();
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods)) {
        json_error('Bu method desteklenmiyor', 405);
    }
}

function require_fields($data, $fields) {
    $missing = array();
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missing[] = $field;
        }
    }
    if (!empty($missing)) {
        json_error('Eksik alanlar: ' . implode(', ', $missing), 422);
    }
}

function clean($value) {
    if ($value === null) return '';
    return htmlspecialchars(trim(strval($value)), ENT_QUOTES, 'UTF-8');
}

function validate_tc($tc) {
    return preg_match('/^[1-9][0-9]{10}$/', $tc) === 1;
}

function format_plaka($plaka) {
    return mb_strtoupper(preg_replace('/\s+/', '', $plaka), 'UTF-8');
}

function generate_dosya_no($db) {
    $yil = date('Y');
    $stmt = $db->prepare("SELECT MAX(CAST(SUBSTRING(dosya_no, 6) AS UNSIGNED)) as max_no FROM dosyalar WHERE dosya_no LIKE ?");
    $stmt->execute(array($yil . '-%'));
    $row = $stmt->fetch();
    $next = (isset($row['max_no']) ? $row['max_no'] : 0) + 1;
    return $yil . '-' . str_pad($next, 4, '0', STR_PAD_LEFT);
}

function get_pagination() {
    $page = max(1, intval(isset($_GET['page']) ? $_GET['page'] : 1));
    $limit = min(250, max(10, intval(isset($_GET['limit']) ? $_GET['limit'] : 25)));
    $offset = ($page - 1) * $limit;
    return array('page' => $page, 'limit' => $limit, 'offset' => $offset);
}

function paginated_response($items, $total, $pagination) {
    json_success(array(
        'items' => $items,
        'pagination' => array(
            'page' => $pagination['page'],
            'limit' => $pagination['limit'],
            'total' => $total,
            'totalPages' => ceil($total / $pagination['limit'])
        )
    ));
}

function generate_uuid() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * Evrensel HTTP POST fonksiyonu
 * 3 yöntem dener: cURL → file_get_contents → stream_socket_client (SSL)
 * cURL kapalı hostinglerde bile çalışır
 *
 * @param string $url Hedef URL
 * @param string $postData JSON encoded POST body
 * @param array  $headers Ek HTTP header'lar ['Header: Value', ...]
 * @param int    $timeout Saniye cinsinden timeout
 * @return array ['body' => string|false, 'http_code' => int, 'error' => string, 'method' => string]
 */
function http_post($url, $postData, $headers = array(), $timeout = 30) {
    $result = array('body' => false, 'http_code' => 0, 'error' => '', 'method' => '');

    // Varsayılan header
    if (empty($headers)) {
        $headers = array('Content-Type: application/json');
    }

    // YÖNTEM 1: cURL
    if (function_exists('curl_init')) {
        $result['method'] = 'curl';
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $postData,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            CURLOPT_USERAGENT => 'MRHasar/1.0'
        ));
        $response = curl_exec($ch);
        $result['http_code'] = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $result['error'] = curl_error($ch);
        curl_close($ch);

        if ($result['http_code'] > 0) {
            $result['body'] = $response;
            return $result;
        }
    }

    // YÖNTEM 2: file_get_contents
    if (ini_get('allow_url_fopen')) {
        $result['method'] = 'file_get_contents';
        $headerStr = implode("\r\n", $headers) . "\r\nUser-Agent: MRHasar/1.0\r\n";
        $opts = array(
            'http' => array(
                'method' => 'POST',
                'header' => $headerStr,
                'content' => $postData,
                'timeout' => $timeout,
                'ignore_errors' => true
            ),
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false
            )
        );
        $context = stream_context_create($opts);
        $response = @file_get_contents($url, false, $context);

        // HTTP kodunu al
        $httpCode = 0;
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $h) {
                if (preg_match('/^HTTP\/[\d.]+ (\d+)/', $h, $m)) {
                    $httpCode = intval($m[1]);
                }
            }
        }
        $result['http_code'] = $httpCode;

        if ($response !== false) {
            $result['body'] = $response;
            $result['error'] = '';
            return $result;
        }
        $result['error'] = 'file_get_contents basarisiz';
    }

    // YÖNTEM 3: stream_socket_client (SSL) - sockets + openssl ile çalışır
    if (extension_loaded('openssl')) {
        $result['method'] = 'socket';
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? '';
        $path = ($parsed['path'] ?? '/') . (isset($parsed['query']) ? '?' . $parsed['query'] : '');
        $port = $parsed['port'] ?? (($parsed['scheme'] ?? 'https') === 'https' ? 443 : 80);
        $isSSL = (($parsed['scheme'] ?? 'https') === 'https');

        $target = ($isSSL ? 'ssl://' : 'tcp://') . $host . ':' . $port;

        $ctx = stream_context_create(array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        ));

        $errno = 0;
        $errstr = '';
        $fp = @stream_socket_client($target, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $ctx);

        if (!$fp) {
            $result['error'] = "Socket baglanti hatasi: [{$errno}] {$errstr}";
            return $result;
        }

        stream_set_timeout($fp, $timeout);

        // HTTP request oluştur
        $contentLength = strlen($postData);
        $headerLines = "POST {$path} HTTP/1.1\r\n";
        $headerLines .= "Host: {$host}\r\n";
        foreach ($headers as $h) {
            $headerLines .= $h . "\r\n";
        }
        $headerLines .= "User-Agent: MRHasar/1.0\r\n";
        $headerLines .= "Content-Length: {$contentLength}\r\n";
        $headerLines .= "Connection: close\r\n";
        $headerLines .= "\r\n";
        $headerLines .= $postData;

        fwrite($fp, $headerLines);

        $response = '';
        while (!feof($fp)) {
            $chunk = fread($fp, 8192);
            if ($chunk === false) break;
            $response .= $chunk;
            $info = stream_get_meta_data($fp);
            if (!empty($info['timed_out'])) {
                $result['error'] = 'Socket zaman asimi';
                fclose($fp);
                return $result;
            }
        }
        fclose($fp);

        // HTTP response parse et
        $parts = explode("\r\n\r\n", $response, 2);
        $headerPart = $parts[0] ?? '';
        $bodyPart = $parts[1] ?? '';

        // HTTP status kodu
        if (preg_match('/^HTTP\/[\d.]+ (\d+)/', $headerPart, $m)) {
            $result['http_code'] = intval($m[1]);
        }

        // Transfer-Encoding: chunked kontrolü
        if (stripos($headerPart, 'transfer-encoding: chunked') !== false) {
            $bodyPart = http_decode_chunked($bodyPart);
        }

        $result['body'] = $bodyPart;
        $result['error'] = '';
        return $result;
    }

    if (empty($result['error'])) {
        $result['error'] = 'Hicbir HTTP yontemi kullanilabilir degil (curl/file_get_contents/socket)';
    }
    return $result;
}

/* ═══ TOTP (Google Authenticator) FONKSİYONLARI ═══ */

function totp_generate_secret($length = 20) {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = '';
    for ($i = 0; $i < $length; $i++) {
        $secret .= $chars[random_int(0, 31)];
    }
    return $secret;
}

function totp_base32_decode($b32) {
    $lut = array(
        'A'=>0,'B'=>1,'C'=>2,'D'=>3,'E'=>4,'F'=>5,'G'=>6,'H'=>7,
        'I'=>8,'J'=>9,'K'=>10,'L'=>11,'M'=>12,'N'=>13,'O'=>14,'P'=>15,
        'Q'=>16,'R'=>17,'S'=>18,'T'=>19,'U'=>20,'V'=>21,'W'=>22,'X'=>23,
        'Y'=>24,'Z'=>25,'2'=>26,'3'=>27,'4'=>28,'5'=>29,'6'=>30,'7'=>31
    );
    $b32 = strtoupper(rtrim($b32, '='));
    $binary = '';
    foreach (str_split($b32) as $c) {
        if (!isset($lut[$c])) return false;
        $binary .= str_pad(decbin($lut[$c]), 5, '0', STR_PAD_LEFT);
    }
    $bytes = '';
    for ($i = 0; $i + 7 < strlen($binary); $i += 8) {
        $bytes .= chr(bindec(substr($binary, $i, 8)));
    }
    return $bytes;
}

function totp_generate_code($secret, $timeSlice = null) {
    if ($timeSlice === null) {
        $timeSlice = floor(time() / 30);
    }
    $key = totp_base32_decode($secret);
    if ($key === false) return false;
    $time = pack('N*', 0) . pack('N*', $timeSlice);
    $hash = hash_hmac('sha1', $time, $key, true);
    $offset = ord($hash[19]) & 0x0F;
    $code = (
        ((ord($hash[$offset]) & 0x7F) << 24) |
        ((ord($hash[$offset+1]) & 0xFF) << 16) |
        ((ord($hash[$offset+2]) & 0xFF) << 8) |
        (ord($hash[$offset+3]) & 0xFF)
    ) % 1000000;
    return str_pad($code, 6, '0', STR_PAD_LEFT);
}

function totp_verify($secret, $code, $window = 1) {
    $code = trim($code);
    if (strlen($code) !== 6) return false;
    $timeSlice = floor(time() / 30);
    for ($i = -$window; $i <= $window; $i++) {
        $expected = totp_generate_code($secret, $timeSlice + $i);
        if ($expected !== false && hash_equals($expected, $code)) {
            return true;
        }
    }
    return false;
}

function totp_get_qr_url($issuer, $email, $secret) {
    $otpauth = 'otpauth://totp/' . rawurlencode($issuer) . ':' . rawurlencode($email) . '?secret=' . $secret . '&issuer=' . rawurlencode($issuer) . '&digits=6&period=30';
    return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . urlencode($otpauth);
}

/* ═══ 2FA USERS MIGRATION ═══ */
function ensure_2fa_columns() {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    try {
        $db = getDB();
        $cols = $db->query("SHOW COLUMNS FROM users LIKE 'totp_secret'")->fetchAll();
        if (empty($cols)) {
            $db->exec("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) DEFAULT NULL");
            $db->exec("ALTER TABLE users ADD COLUMN totp_aktif TINYINT(1) NOT NULL DEFAULT 0");
        }
    } catch (\Exception $e) {
        // Migration hatası sessiz geç
    }
}

/**
 * Chunked transfer encoding decode
 */
function http_decode_chunked($data) {
    $decoded = '';
    while (true) {
        $nl = strpos($data, "\r\n");
        if ($nl === false) break;
        $sizeHex = substr($data, 0, $nl);
        $size = hexdec(trim($sizeHex));
        if ($size === 0) break;
        $decoded .= substr($data, $nl + 2, $size);
        $data = substr($data, $nl + 2 + $size + 2);
        if (empty($data)) break;
    }
    return $decoded;
}

/**
 * Veritabanı yetki kontrolü
 * Kullanıcının belirli bir modül+işlem için yetkisi var mı kontrol eder
 * Admin her zaman true döner
 */
function has_yetki($user, $modul, $islem) {
    if ($user['rol'] === 'admin') return true;
    try {
        $db = getDB();
        $stmt = $db->prepare('SELECT izin FROM yetkiler WHERE kullanici_id = ? AND modul = ? AND islem = ? LIMIT 1');
        $stmt->execute([$user['id'], $modul, $islem]);
        $row = $stmt->fetch();
        return $row && ($row['izin'] == 1);
    } catch (\Exception $e) {
        return false;
    }
}

/* ═══════════════════════════════════════════════════════════════
   YETKİ HARİTASI - API ENDPOINT → MODÜL/İŞLEM EŞLEMESİ
   auth_required() fonksiyonu bu haritayı kullanarak
   ROL BAZLI değil, YETKİ MATRİSİ BAZLI erişim kontrolü yapar.
   Admin kullanıcılar bu kontrolden muaftır (has_yetki bypass).
   ═══════════════════════════════════════════════════════════════ */
$GLOBALS['YETKI_MAP'] = array(
    // ─── DOSYA ───
    'dosya/create.php' => array('dosya', 'dosya-yeni'),
    'dosya/delete.php' => array('dosya', 'dosya-sil'),
    'dosya/update.php' => array('dosya', 'dosya-duzenle'),
    'dosya/list.php' => array('dosya', 'dosya-liste'),
    'dosya/get.php' => array('dosya', 'dosya-detay'),
    'dosya/excel-import.php' => array('dosya', 'dosya-yeni'),
    'dosya/excel-sablon.php' => array('dosya', 'dosya-yeni'),
    'dosya/bulk-delete.php' => array('dosya', 'dosya-toplu-sil'),

    // ─── CRM ───
    'crm/create.php' => array('crm', 'crm-yeni'),
    'crm/delete.php' => array('crm', 'crm-sil'),
    'crm/update.php' => array('crm', 'crm-duzenle'),
    'crm/list.php' => array('crm', 'crm-arama'),
    'crm/get.php' => array('crm', 'crm-arama'),
    'crm/donustur.php' => array('crm', 'crm-yeni'),
    'crm/dosya-yukle.php' => array('crm', 'crm-duzenle'),
    'crm/not-ekle.php' => array('crm', 'crm-duzenle'),
    'crm/bulk-delete.php' => array('crm', 'crm-toplu-sil'),

    // ─── SAHA ───
    'saha/create.php' => array('crm', 'saha-yeni'),
    'saha/update.php' => array('crm', 'saha-duzenle'),
    'saha/sil.php' => array('crm', 'saha-sil'),
    'saha/list.php' => array('crm', 'saha-liste'),
    'saha/get.php' => array('crm', 'saha-liste'),
    'saha/dosya-yukle.php' => array('crm', 'saha-duzenle'),
    'saha/dosya-sil.php' => array('crm', 'saha-sil'),
    'saha/dosyaya-donustur.php' => array('crm', 'saha-onay'),
    'saha/onaya-gonder.php' => array('crm', 'saha-onay'),
    'saha/onayla.php' => array('crm', 'saha-onay'),
    'saha/reddet.php' => array('crm', 'saha-red'),
    'saha/medya-download.php' => array('crm', 'saha-liste'),
    'saha/medya-list.php' => array('crm', 'saha-liste'),

    // ─── HESAPLAMALAR ───
    'hesap/ocr-analiz.php' => array('hesaplamalar', 'hesap-adk', 'police-qr-ruhsat'),
    'hesap/ai-analiz.php' => array('hesaplamalar', 'hesap-adk'),
    'hesap/rayic-arastirma.php' => array('hesaplamalar', 'hesap-adk'),
    'hesap/tahkim-emsal-ara.php' => array('hesaplamalar', 'hesap-bh'),
    'hesap/bh-ai-analiz.php' => array('hesaplamalar', 'hesap-bh'),

    // ─── MUHASEBE ───
    'muhasebe/gelir-create.php' => array('muhasebe', 'muhasebe-gelir-ekle'),
    'muhasebe/gelir-ekle.php' => array('muhasebe', 'muhasebe-gelir-ekle'),
    'muhasebe/gelir-list.php' => array('muhasebe', 'muhasebe-gelir'),
    'muhasebe/gider-create.php' => array('muhasebe', 'muhasebe-gider-ekle'),
    'muhasebe/gider-list.php' => array('muhasebe', 'muhasebe-gider'),
    'muhasebe/hareket-delete.php' => array('muhasebe', 'muhasebe-hareket-sil'),
    'muhasebe/hareket-update.php' => array('muhasebe', 'muhasebe-hareket-duzenle'),
    'muhasebe/hareketler.php' => array('muhasebe', 'muhasebe-kasa'),
    'muhasebe/kasa-create.php' => array('muhasebe', 'muhasebe-kasa'),
    'muhasebe/kasa-delete.php' => array('muhasebe', 'muhasebe-kasa-sil'),
    'muhasebe/kasa-update.php' => array('muhasebe', 'muhasebe-kasa'),
    'muhasebe/transfer.php' => array('muhasebe', 'muhasebe-transfer'),
    'muhasebe/komisyon-list.php' => array('muhasebe', 'muhasebe-komisyon'),
    'muhasebe/komisyon-ode.php' => array('muhasebe', 'muhasebe-komisyon'),
    'muhasebe/komisyon-olustur.php' => array('muhasebe', 'muhasebe-komisyon'),
    'muhasebe/rapor.php' => array('muhasebe', 'muhasebe-rapor'),
    'muhasebe/finansal-rapor.php' => array('muhasebe', 'muhasebe-rapor'),
    'muhasebe/kapanis-rapor.php' => array('muhasebe', 'muhasebe-kapanis'),
    'muhasebe/ay-sonu-rapor.php' => array('muhasebe', 'muhasebe-aysonu'),
    'muhasebe/maliyet-analiz.php' => array('muhasebe', 'muhasebe-maliyet'),
    'muhasebe/bakiye-duzelt.php' => array('muhasebe', 'muhasebe-bakiye-sifirla'),
    'muhasebe/bakiye-sifirla.php' => array('muhasebe', 'muhasebe-bakiye-sifirla'),

    // ─── POLİÇE ───
    'police/list.php' => array('police', 'police-liste'),
    'police/get.php' => array('police', 'police-liste'),
    'police/create.php' => array('police', 'police-yeni'),
    'police/delete.php' => array('police', 'police-sil'),
    'police/update.php' => array('police', 'police-duzenle'),
    'police/rapor.php' => array('police', 'police-rapor'),
    'police/tahsilat-ekle.php' => array('police', 'police-tahsilat'),
    'police/tahsilat-list.php' => array('police', 'police-tahsilat'),
    'police/excel-import.php' => array('police', 'police-excel'),
    'police/hatirlatma-kontrol.php' => array('police', 'police-yenileme'),
    'police/bulk-delete.php' => array('police', 'police-toplu-sil'),

    // ─── PERSONEL ───
    'personel/list.php' => array('paydaslar', 'personel-liste'),
    'personel/create.php' => array('muhasebe', 'personel-yeni'),
    'personel/delete.php' => array('muhasebe', 'personel-sil'),
    'personel/update.php' => array('muhasebe', 'personel-duzenle'),
    'personel/hakedis-hesapla.php' => array('muhasebe', 'personel-hakedis'),
    'personel/hakedis-list.php' => array('muhasebe', 'personel-hakedis'),
    'personel/hakedis-ode.php' => array('muhasebe', 'personel-maas-ode'),
    'personel/migrate.php' => array('sistem', 'sistem-veri'),
    'personel/bulk-delete.php' => array('muhasebe', 'personel-toplu-sil'),

    // ─── MASRAF ───
    'masraf/create.php' => array('dosya', 'dosya-masraf-ekle'),
    'masraf/delete.php' => array('dosya', 'dosya-masraf-sil'),
    'masraf/ode.php' => array('dosya', 'dosya-masraf-ode'),
    'masraf/update.php' => array('dosya', 'dosya-masraf-duzenle'),

    // ─── EVRAK ───
    'evrak/upload.php' => array('evrak', 'evrak-yukle'),
    'evrak/delete.php' => array('evrak', 'evrak-sil'),
    'evrak/diagnose.php' => array('sistem', 'sistem-veri'),
    'evrak/tani.php' => array('sistem', 'sistem-veri'),

    // ─── PAYDAŞLAR / ORTAKLAR ───
    'ortak/list.php' => array('paydaslar', 'ortaklar-ortaklar'),
    'ortak/get.php' => array('paydaslar', 'ortaklar-ortaklar'),
    'ortak/create.php' => array('paydaslar', 'ortaklar-yeni'),
    'ortak/delete.php' => array('paydaslar', 'ortaklar-sil'),
    'ortak/update.php' => array('paydaslar', 'ortaklar-duzenle'),
    'ortak/hareket-ekle.php' => array('paydaslar', 'ortaklar-detay'),
    'ortak/hareket-list.php' => array('paydaslar', 'ortaklar-detay'),
    'ortak/bulk-delete.php' => array('paydaslar', 'ortaklar-toplu-sil'),
    'paydas/list.php' => array('paydaslar', 'ortaklar-paydaslar'),
    'paydas/get.php' => array('paydaslar', 'ortaklar-paydaslar'),
    'paydas/create.php' => array('paydaslar', 'ortaklar-yeni'),
    'paydas/delete.php' => array('paydaslar', 'ortaklar-sil'),
    'paydas/update.php' => array('paydaslar', 'ortaklar-duzenle'),
    'paydas/komisyon-ekle.php' => array('muhasebe', 'muhasebe-komisyon'),
    'paydas/komisyon-ode.php' => array('muhasebe', 'muhasebe-komisyon'),
    'paydas/komisyon-list.php' => array('muhasebe', 'muhasebe-komisyon'),
    'paydas/bulk-delete.php' => array('paydaslar', 'paydaslar-toplu-sil'),

    // ─── SİSTEM ───
    'sistem/kullanici-create.php' => array('sistem', 'sistem-kullanici'),
    'sistem/kullanici-delete.php' => array('sistem', 'sistem-kullanici'),
    'sistem/kullanici-list.php' => array('sistem', 'sistem-kullanici'),
    'sistem/kullanici-update.php' => array('sistem', 'sistem-kullanici'),
    'sistem/loglar.php' => array('sistem', 'sistem-log'),
    'sistem/toplu-sifirla.php' => array('sistem', 'sistem-veri'),
    'sistem/ayarlar-list.php' => array('sistem', 'sistem-ayarlar'),
    'sistem/ayarlar-guncelle.php' => array('sistem', 'sistem-ayarlar'),
    'sistem/yetki-list.php' => array('sistem', 'sistem-yetki'),
    'sistem/yetki-guncelle.php' => array('sistem', 'sistem-yetki'),
    'sistem/logo-yukle.php' => array('sistem', 'sistem-ayarlar'),
    'sistem/sidebar-logo-yukle.php' => array('sistem', 'sistem-ayarlar'),

    // ─── PORTAL ───
    'portal/erisim-guncelle.php' => array('sistem', 'sistem-portal'),
    'portal/erisim-list.php' => array('sistem', 'sistem-portal'),
    'portal/erisim-olustur.php' => array('sistem', 'sistem-portal'),
    'portal/erisim-sil.php' => array('sistem', 'sistem-portal'),
    'portal/loglar.php' => array('sistem', 'sistem-portal'),
    'portal/portal-mesaj-gonder.php' => array('sistem', 'sistem-portal'),
    'portal/portal-mesaj-list.php' => array('sistem', 'sistem-portal'),

    // ─── SMS ───
    'sms/gelen-list.php' => array('sistem', 'sistem-sms'),
    'sms/gelen-okundu.php' => array('sistem', 'sistem-sms'),
    'sms/gonder.php' => array('sistem', 'sistem-sms'),
    'sms/log-list.php' => array('sistem', 'sistem-sms'),
    'sms/test.php' => array('sistem', 'sistem-sms'),

    // ─── KONUM ───
    'konum/gecmisi.php' => array('sistem', 'sistem-konum'),
    'konum/listele.php' => array('sistem', 'sistem-konum'),
    'konum/guncelle.php' => array('sistem', 'sistem-konum'),

    // ─── TANIM ───
    'tanim/list.php' => array('sistem', 'tanimlamalar-dosya'),
    'tanim/create.php' => array('sistem', 'tanimlamalar-ekle'),
    'tanim/delete.php' => array('sistem', 'tanimlamalar-sil'),
    'tanim/update.php' => array('sistem', 'tanimlamalar-duzenle'),
    'tanim/bulk-create.php' => array('sistem', 'tanimlamalar-ekle'),

    // ─── ŞABLON ───
    'sablon/list.php' => array('sistem', 'tanimlamalar-sablon'),
    'sablon/get.php' => array('sistem', 'tanimlamalar-sablon'),
    'sablon/create.php' => array('sistem', 'tanimlamalar-sablon-ekle'),
    'sablon/update.php' => array('sistem', 'tanimlamalar-sablon-duzenle'),
    'sablon/delete.php' => array('sistem', 'tanimlamalar-sil'),

    // ─── YÖNLENDIRME (CRM ARAMA LİSTESİ) ───
    'yonlendirme/list.php' => array('crm', 'crm-arama'),
    'yonlendirme/get.php' => array('crm', 'crm-arama'),
    'yonlendirme/create.php' => array('crm', 'crm-arama'),
    'yonlendirme/delete.php' => array('crm', 'crm-arama'),
    'yonlendirme/update.php' => array('crm', 'crm-arama'),
    'yonlendirme/import.php' => array('crm', 'crm-arama'),
    'yonlendirme/not-ekle.php' => array('crm', 'crm-arama'),
    'yonlendirme/toplu-islem.php' => array('crm', 'crm-arama'),

    // ─── AJANDA ───
    'ajanda/list.php' => array('ajanda', 'goruntule'),
    'ajanda/create.php' => array('ajanda', 'ajanda-ekle'),
    'ajanda/update.php' => array('ajanda', 'ajanda-duzenle'),
    'ajanda/delete.php' => array('ajanda', 'ajanda-sil'),
    'ajanda/bulk-delete.php' => array('ajanda', 'ajanda-toplu-sil'),

    // ─── İÇTİHAT ───
    'ictihat/yargitay-ara.php' => array('ictihat', 'ictihat-yargitay'),
    'ictihat/tahkim-ara.php' => array('ictihat', 'ictihat-tahkim'),
    'ictihat/police-limit.php' => array('ictihat', 'ictihat-police-limit'),
    'ictihat/kusur-emsal-ara.php' => array('ictihat', 'ictihat-kusur-emsal'),


    // ─── ARAMA LOG (CRM ANALİZ modülüne taşındı - yukarıda tanımlı) ───
    'arama-log/delete.php' => array('crm-analiz', 'crm-analiz-goruntule'),

    // ─── NETSANTRAL ───
    'sozlesme/settings.php' => array('netsantral', 'netsantral-ayarlar'),

    // ─── E-POSTA ───
    'mail/list.php' => array('eposta', 'eposta-goruntule'),
    'mail/get.php' => array('eposta', 'eposta-goruntule'),
    'mail/send.php' => array('eposta', 'eposta-gonder'),
    'mail/delete.php' => array('eposta', 'eposta-sil'),

    // ─── CRM ANALİZ ───
    'arama-log/list.php' => array('crm-analiz', 'crm-analiz-goruntule'),
    'arama-log/istatistik.php' => array('crm-analiz', 'crm-analiz-istatistik'),
    'arama-log/kayit-indir.php' => array('crm-analiz', 'crm-analiz-kayitlar'),

    // ─── BİLDİRİM ───
    'bildirim/create.php' => array('bildirim', 'bildirim-goruntule'),
    'bildirim/delete.php' => array('bildirim', 'bildirim-sil'),
    'bildirim/bulk-delete.php' => array('bildirim', 'bildirim-sil'),

    // ─── MESAJ ───
    'mesaj/create.php' => array('mesajlar', 'mesaj-gonder'),
    'mesaj/delete.php' => array('mesajlar', 'mesaj-sil'),
    'mesaj/bulk-delete.php' => array('mesajlar', 'mesaj-toplu-sil'),
);