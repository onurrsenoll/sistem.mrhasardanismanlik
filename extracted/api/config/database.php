<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'mrhasard_dosyatakip');
define('DB_USER', 'mrhasard_dtuser');
define('DB_PASS', 'MrHasar2025!');

define('JWT_SECRET', 'mr-hasar-2025-gizli-anahtar-' . md5(DB_PASS));
define('JWT_EXPIRE', 86400);

define('UPLOAD_DIR', dirname(__DIR__, 2) . '/uploads/');
define('MAX_FILE_SIZE', 20 * 1024 * 1024);
define('ALLOWED_TYPES', array('application/pdf'));

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
            http_response_code(500);
            echo json_encode(array('error' => 'Veritabani baglanti hatasi', 'detail' => $e->getMessage()));
            exit;
        }
    }
    return $pdo;
}
?>