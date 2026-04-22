<?php
/**
 * GET /api/v1/ihbar-foyu/get.php?id=1
 * İhbar Föyü kaydının tüm detayı + parçaları
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
ensure_ihbar_foyu_tables();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('ID GEREKLİ', 422);

$stmt = $db->prepare('SELECT h.*, u.ad_soyad AS olusturan FROM hasar_ihbar h LEFT JOIN users u ON u.id = h.kullanici_id WHERE h.id = ?');
$stmt->execute([$id]);
$k = $stmt->fetch();
if (!$k) json_error('KAYIT BULUNAMADI', 404);

// Yetki: admin/uzman/avukat/muhasebe tümünü görür; diğerleri sadece kendilerinin
if (!in_array($user['rol'], ['admin','uzman','avukat','muhasebe'], true)
    && (int)$k['kullanici_id'] !== (int)$user['id']) {
    json_error('BU KAYIT İÇİN YETKİNİZ YOK', 403);
}

// Parçaları çek
$stmt = $db->prepare('SELECT id, sira, ad, oem, fiyat, miktar FROM hasar_ihbar_parcalar WHERE ihbar_id = ? ORDER BY sira ASC, id ASC');
$stmt->execute([$id]);
$k['parcalar'] = $stmt->fetchAll();

// JSON alanlarını parse et
foreach (['evraklar', 'islemler'] as $jf) {
    if (!empty($k[$jf]) && is_string($k[$jf])) {
        $parsed = json_decode($k[$jf], true);
        if ($parsed !== null) $k[$jf] = $parsed;
    }
}

json_success($k);
