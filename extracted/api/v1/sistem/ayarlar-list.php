<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$db = getDB();

// Try auth but don't require
$user = null;
try {
    $user = auth_required();
} catch (Exception $e) {}

try {
    $stmt = $db->query('SELECT anahtar, deger, tip FROM ayarlar ORDER BY id');
    $items = $stmt->fetchAll();

    // Convert to key-value object
    $result = [];
    foreach ($items as $item) {
        $result[$item['anahtar']] = $item['deger'];
    }

    json_success($result);
} catch (Exception $e) {
    // Tablo yoksa boş döndür
    json_success([]);
}
