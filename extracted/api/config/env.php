<?php
/**
 * MR HASAR — ENV YÜKLEYİCİ
 * api/config/.env dosyasını okur. Her satır KEY=VALUE formatında.
 * .env yoksa boş döner — eski sabitler korunur (canlı kırılmaz).
 */

if (!function_exists('mr_load_env')) {
    function mr_load_env($path) {
        static $loaded = false;
        if ($loaded) return;
        $loaded = true;
        if (!is_file($path) || !is_readable($path)) return;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            $eq = strpos($line, '=');
            if ($eq === false) continue;
            $k = trim(substr($line, 0, $eq));
            $v = trim(substr($line, $eq + 1));
            if ((str_starts_with($v, '"') && str_ends_with($v, '"')) ||
                (str_starts_with($v, "'") && str_ends_with($v, "'"))) {
                $v = substr($v, 1, -1);
            }
            if ($k !== '' && getenv($k) === false) {
                putenv("$k=$v");
                $_ENV[$k] = $v;
            }
        }
    }
}

if (!function_exists('mr_env')) {
    function mr_env($key, $default = null) {
        $v = getenv($key);
        if ($v === false || $v === '') return $default;
        if (strcasecmp($v, 'true') === 0) return true;
        if (strcasecmp($v, 'false') === 0) return false;
        if (strcasecmp($v, 'null') === 0) return null;
        return $v;
    }
}

mr_load_env(__DIR__ . '/.env');
