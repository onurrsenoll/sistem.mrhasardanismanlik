<?php
/**
 * TEMA CONFIG - TÜM KULLANICILAR İÇİN TEMA AYARLARINI DÖNDÜRÜR
 * Auth gerektirmez çünkü tema login sayfasında da uygulanmalı
 */
require_once __DIR__ . '/../../config/helpers.php';

setup_headers();
require_method('GET');

$db = getDB();

try {
    $stmt = $db->prepare('SELECT deger FROM ayarlar WHERE anahtar = ?');
    $stmt->execute(['tema_config']);
    $row = $stmt->fetch();

    if ($row && $row['deger']) {
        $config = json_decode($row['deger'], true);
        if ($config) {
            json_success($config);
        } else {
            json_success(null);
        }
    } else {
        json_success(null);
    }
} catch (Exception $e) {
    json_success(null);
}
