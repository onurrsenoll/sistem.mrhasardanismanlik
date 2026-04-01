<?php
/**
 * POST /api/v1/auth/profil-update.php
 * Kullanıcı kendi profil bilgilerini günceller
 * Body: { "telefon": "..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();

$db = getDB();

$updates = [];
$params = [];

// TELEFON
if (isset($body['telefon'])) {
    $telefon = clean($body['telefon']);
    if ($telefon && !preg_match('/^[0-9\s\-\+\(\)]{7,20}$/', $telefon)) {
        json_error('GEÇERSİZ TELEFON NUMARASI', 422);
    }
    $updates[] = 'telefon = ?';
    $params[] = $telefon ?: null;
}

if (empty($updates)) {
    json_error('GÜNCELLENECEK ALAN YOK', 422);
}

$params[] = $user['id'];
$sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';
$stmt = $db->prepare($sql);
$stmt->execute($params);

log_action($user['id'], 'profil_guncelle', 'Profil bilgileri güncellendi', 'users', $user['id']);

// Güncel veriyi çek
$stmt = $db->prepare('SELECT id, ad_soyad, email, rol, telefon, avatar, aktif, created_at, netsantral_dahili, netsantral_sip_sifre, netsantral_api_sifre FROM users WHERE id = ?');
$stmt->execute([$user['id']]);
$updatedUser = $stmt->fetch();

json_success(['user' => $updatedUser], 'PROFİL BAŞARIYLA GÜNCELLENDİ');
