<?php
/**
 * MR HASAR — BOOTSTRAP
 * Tüm endpoint'lerin başında çalışan ortak güvenlik/hata kurulumu.
 * .env yüklenir, hata raporlama production-safe duruma getirilir.
 */

require_once __DIR__ . '/env.php';

$mr_env_name = mr_env('APP_ENV', 'production');

if ($mr_env_name === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
} else {
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED & ~E_STRICT);
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
}

ini_set('log_errors', '1');
$mr_log_path = mr_env('ERROR_LOG_PATH', '');
if ($mr_log_path !== '') {
    ini_set('error_log', $mr_log_path);
}

if (!defined('MR_APP_ENV')) define('MR_APP_ENV', $mr_env_name);
if (!defined('MR_IS_PROD')) define('MR_IS_PROD', $mr_env_name === 'production');
