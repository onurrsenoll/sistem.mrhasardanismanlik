<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

// auth_required() YETKI_MAP üzerinden sistem/sistem-yetki yetki kontrolünü otomatik yapar.
// Admin kullanıcılar has_yetki() içinde bypass edilir. Hard-coded rol kontrolü kaldırıldı.
$user = auth_required();

$db = getDB();

$kullanici_id = (int)($_GET['kullanici_id'] ?? 0);
if (!$kullanici_id) {
    json_error('KULLANICI ID GEREKLİ');
}

try {
    $stmt = $db->prepare('SELECT modul, islem, izin FROM yetkiler WHERE kullanici_id = ? ORDER BY modul, islem');
    $stmt->execute([$kullanici_id]);
    $items = $stmt->fetchAll();
    json_success(['items' => $items]);
} catch (Exception $e) {
    // Tablo yoksa boş döndür
    json_success(['items' => []]);
}
