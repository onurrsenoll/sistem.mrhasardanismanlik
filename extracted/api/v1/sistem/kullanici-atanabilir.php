<?php
/**
 * GET /api/v1/sistem/kullanici-atanabilir.php
 * Atama için hafif kullanıcı listesi (id + ad_soyad + rol).
 * Yetki: auth_required() — Excel yükleme / atama yetkisi olan herkes çağırabilir.
 * Sadece atama için gerekli asgari bilgi döner. Şifre / e-mail / telefon gibi
 * hassas veriler DÖNMEZ.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$q = clean($_GET['q'] ?? '');
$rol = clean($_GET['rol'] ?? '');

$where = ['aktif = 1'];
$params = [];

if ($q !== '') {
    $where[] = '(ad_soyad LIKE ? OR email LIKE ?)';
    $params[] = "%$q%";
    $params[] = "%$q%";
}

if ($rol !== '') {
    $where[] = 'rol = ?';
    $params[] = $rol;
}

$whereSQL = 'WHERE ' . implode(' AND ', $where);

$stmt = $db->prepare("SELECT id, ad_soyad, rol FROM users $whereSQL ORDER BY ad_soyad ASC");
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success($items);
