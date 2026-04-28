<?php
require_once __DIR__ . '/bootstrap.php';

if (!defined('DB_HOST')) define('DB_HOST', mr_env('DB_HOST', 'localhost'));
if (!defined('DB_NAME')) define('DB_NAME', mr_env('DB_NAME', 'mrhasard_dosyatakip'));
if (!defined('DB_USER')) define('DB_USER', mr_env('DB_USER', 'mrhasard_dtuser'));
if (!defined('DB_PASS')) define('DB_PASS', mr_env('DB_PASS', ''));

if (!defined('JWT_SECRET')) {
    $mr_jwt = mr_env('JWT_SECRET', '');
    if ($mr_jwt === '') {
        $mr_jwt = 'mr-hasar-fallback-' . hash('sha256', DB_PASS . DB_NAME . DB_USER);
    }
    define('JWT_SECRET', $mr_jwt);
}
if (!defined('JWT_EXPIRE')) define('JWT_EXPIRE', (int)mr_env('JWT_EXPIRE', 86400));
if (!defined('JWT_REFRESH_EXPIRE')) define('JWT_REFRESH_EXPIRE', (int)mr_env('JWT_REFRESH_EXPIRE', 2592000));

if (!defined('UPLOAD_DIR')) define('UPLOAD_DIR', dirname(__DIR__, 2) . '/uploads/');
if (!defined('MAX_FILE_SIZE')) define('MAX_FILE_SIZE', 20 * 1024 * 1024);
if (!defined('ALLOWED_TYPES')) define('ALLOWED_TYPES', array('application/pdf'));

date_default_timezone_set('Europe/Istanbul');

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_turkish_ci"
            ));
        } catch (PDOException $e) {
            error_log('[mr_hasar] DB connect failed: ' . $e->getMessage());
            http_response_code(500);
            $resp = array('success' => false, 'error' => 'Veritabani baglanti hatasi');
            if (!(defined('MR_IS_PROD') && MR_IS_PROD)) {
                $resp['detail'] = $e->getMessage();
            }
            echo json_encode($resp);
            exit;
        }
    }
    return $pdo;
}
?>