<?php
/**
 * PUT /api/v1/personel/update.php
 * Personel güncelle
 * Body: { "id": 1, "ad_soyad": "...", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

// Mevcut kayıt kontrol
$stmt = $db->prepare('SELECT * FROM personel WHERE id = ?');
$stmt->execute([$id]);
$personel = $stmt->fetch();
if (!$personel) json_error('PERSONEL BULUNAMADI', 404);

$fields = [];
$params = [];

$guncellenecek = ['ad_soyad', 'tc_kimlik', 'telefon', 'email', 'departman', 'pozisyon', 'sgk_no', 'iban', 'adres', 'il', 'durum', 'notlar'];
foreach ($guncellenecek as $f) {
    if (isset($body[$f])) {
        $fields[] = "$f = ?";
        $params[] = clean($body[$f]);
    }
}

$sayisallar = ['maas' => 'float', 'prim_orani' => 'float'];
foreach ($sayisallar as $f => $tip) {
    if (isset($body[$f])) {
        $fields[] = "$f = ?";
        $params[] = $tip === 'float' ? (float)$body[$f] : (int)$body[$f];
    }
}

$tarihler = ['ise_baslama', 'isten_ayrilma'];
foreach ($tarihler as $f) {
    if (isset($body[$f])) {
        $fields[] = "$f = ?";
        $params[] = !empty($body[$f]) ? $body[$f] : null;
    }
}

if (empty($fields)) json_error('GÜNCELLENEBİLİR ALAN YOK', 422);

$params[] = $id;
$sql = "UPDATE personel SET " . implode(', ', $fields) . " WHERE id = ?";
$stmt = $db->prepare($sql);
$stmt->execute($params);

log_action($user['id'], 'personel_guncelle', "Personel güncellendi: " . ($body['ad_soyad'] ?? $personel['ad_soyad']), 'personel', $id);

json_success(['id' => $id], 'PERSONEL BAŞARIYLA GÜNCELLENDİ');
