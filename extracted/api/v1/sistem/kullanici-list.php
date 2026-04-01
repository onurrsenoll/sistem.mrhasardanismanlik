<?php
/**
 * GET /api/v1/sistem/kullanici-list.php
 * Kullanıcı listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin']);
$db = getDB();

// Netsantral kolonlari yoksa ekle
try { $db->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS netsantral_dahili VARCHAR(10) DEFAULT NULL"); } catch(\Exception $e) {}
try { $db->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS netsantral_sip_sifre VARCHAR(100) DEFAULT NULL"); } catch(\Exception $e) {}
try { $db->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS netsantral_api_sifre VARCHAR(100) DEFAULT NULL"); } catch(\Exception $e) {}

$rol = clean($_GET['rol'] ?? '');
$aktif = isset($_GET['aktif']) ? (int)$_GET['aktif'] : -1;
$q = clean($_GET['q'] ?? '');

$where = [];
$params = [];

if ($q !== '') {
    $search = "%$q%";
    $where[] = '(ad_soyad LIKE ? OR email LIKE ? OR telefon LIKE ?)';
    $params = array_merge($params, [$search, $search, $search]);
}

if ($rol !== '') {
    $where[] = 'rol = ?';
    $params[] = $rol;
}

if ($aktif >= 0) {
    $where[] = 'aktif = ?';
    $params[] = $aktif;
}

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$stmt = $db->prepare("SELECT id, ad_soyad, email, rol, telefon, avatar, aktif, son_giris, created_at, netsantral_dahili, netsantral_sip_sifre, netsantral_api_sifre FROM users $whereSQL ORDER BY id");
$stmt->execute($params);
$items = $stmt->fetchAll();

json_success($items);
