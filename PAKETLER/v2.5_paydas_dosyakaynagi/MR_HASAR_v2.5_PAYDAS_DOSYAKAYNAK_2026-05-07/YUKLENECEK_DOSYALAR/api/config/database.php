<?php
require_once __DIR__ . '/bootstrap.php';

// === SABİTLER (env > fallback) ===
// .env mevcutsa oradan; değilse mevcut canlı değerler.
if (!defined('DB_HOST')) define('DB_HOST', mr_env('DB_HOST', 'localhost'));
if (!defined('DB_NAME')) define('DB_NAME', mr_env('DB_NAME', 'mrhasard_dosyatakip'));
if (!defined('DB_USER')) define('DB_USER', mr_env('DB_USER', 'mrhasard_dtuser'));
if (!defined('DB_PASS')) define('DB_PASS', mr_env('DB_PASS', 'MrHasar2025!'));

if (!defined('JWT_SECRET')) {
    $mr_jwt = mr_env('JWT_SECRET', '');
    if ($mr_jwt === '') {
        // Geçiş süreci fallback: .env tanımlanana kadar eski türetme korunur.
        $mr_jwt = 'mr-hasar-2025-gizli-anahtar-' . md5(DB_PASS);
    }
    define('JWT_SECRET', $mr_jwt);
}
if (!defined('JWT_EXPIRE')) define('JWT_EXPIRE', (int)mr_env('JWT_EXPIRE', 86400));
if (!defined('JWT_REFRESH_EXPIRE')) define('JWT_REFRESH_EXPIRE', (int)mr_env('JWT_REFRESH_EXPIRE', 2592000));

if (!defined('UPLOAD_DIR')) define('UPLOAD_DIR', dirname(__DIR__, 2) . '/uploads/');
if (!defined('MAX_FILE_SIZE')) define('MAX_FILE_SIZE', 512 * 1024 * 1024);
if (!defined('ALLOWED_TYPES')) define('ALLOWED_TYPES', array('application/pdf', 'image/jpeg', 'image/png', 'image/svg+xml', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));

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
                PDO::ATTR_PERSISTENT => true,
                PDO::ATTR_TIMEOUT => 10,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_turkish_ci, SESSION wait_timeout=300, SESSION interactive_timeout=300"
            ));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array('success' => false, 'error' => 'VERITABANI BAGLANTI HATASI'));
            exit;
        }
    }
    return $pdo;
}

/* ═══ OTOMATİK MİGRASYON: prim_adk / prim_bh KOLONLARI ═══ */
function ensure_prim_columns() {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    try {
        $db = getDB();
        // PERSONEL tablosuna prim_adk ve prim_bh ekle
        $cols = $db->query("SHOW COLUMNS FROM personel LIKE 'prim_adk'")->fetchAll();
        if (empty($cols)) {
            $db->exec("ALTER TABLE personel ADD COLUMN prim_adk DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER prim_orani");
            $db->exec("ALTER TABLE personel ADD COLUMN prim_bh DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER prim_adk");
            // Mevcut prim_orani değerini prim_adk'ya aktar
            $db->exec("UPDATE personel SET prim_adk = prim_orani WHERE prim_orani > 0");
        }
        // PAYDASLAR tablosuna prim_adk ve prim_bh ekle
        $cols2 = $db->query("SHOW COLUMNS FROM paydaslar LIKE 'prim_adk'")->fetchAll();
        if (empty($cols2)) {
            $db->exec("ALTER TABLE paydaslar ADD COLUMN prim_adk DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER komisyon_orani");
            $db->exec("ALTER TABLE paydaslar ADD COLUMN prim_bh DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER prim_adk");
        }
        // MASRAFLAR: kasa_id NULL olabilmeli (ödenmemiş masraflar kasasız kaydedilir)
        $db->exec("ALTER TABLE masraflar MODIFY COLUMN kasa_id INT DEFAULT NULL");
        // KASALAR: ortak_kasa_tipi sütunu (ortak kasa desteği)
        $db->exec("ALTER TABLE kasalar ADD COLUMN IF NOT EXISTS ortak_kasa_tipi VARCHAR(20) DEFAULT NULL");
        $db->exec("ALTER TABLE kasalar ADD COLUMN IF NOT EXISTS ortak_ids TEXT DEFAULT NULL");
    } catch (\Exception $e) {
        // Migration hatası sessiz geç
    }
}
