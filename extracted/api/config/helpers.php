<?php
require_once __DIR__ . '/bootstrap.php';

function mr_allowed_origins() {
    static $list = null;
    if ($list !== null) return $list;
    $raw = mr_env('ALLOWED_ORIGINS', '');
    $list = array();
    if ($raw !== '') {
        foreach (explode(',', $raw) as $o) {
            $o = trim($o);
            if ($o !== '') $list[] = rtrim($o, '/');
        }
    }
    return $list;
}

function setup_headers() {
    header('Content-Type: application/json; charset=utf-8');
    header('Vary: Origin');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? rtrim($_SERVER['HTTP_ORIGIN'], '/') : '';
    $allowed = mr_allowed_origins();
    if ($origin !== '' && (in_array($origin, $allowed, true) || empty($allowed))) {
        // Eğer ALLOWED_ORIGINS boşsa (canlı henüz .env'e geçmedi) eski davranışı koru.
        // .env tanımlandığında yalnız izinli origin yansıtılır.
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
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
    // Production'da iç hata detayı yalnız log'a yazılır, response'a düşmez.
    if ($detail !== null) {
        if (defined('MR_IS_PROD') && MR_IS_PROD) {
            error_log('[mr_hasar] ' . $message . ' :: ' . (is_string($detail) ? $detail : json_encode($detail)));
        } else {
            $response['detail'] = $detail;
        }
    }
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
    $limit = min(100, max(10, intval(isset($_GET['limit']) ? $_GET['limit'] : 25)));
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
?>