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