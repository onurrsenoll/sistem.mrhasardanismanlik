<?php
/**
 * PUT /api/v1/masraf/update.php
 * Masraf kaydini guncelle (tutar, masraf_kalemi, aciklama)
 * Sadece admin yetkisi
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required();
if (!has_yetki($user, 'dosya', 'dosya-masraf-duzenle')) {
    json_error('Bu islem icin yetkiniz bulunmamaktadir', 403);
}

$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM masraflar WHERE id = ?');
$stmt->execute([$id]);
$masraf = $stmt->fetch();
if (!$masraf) json_error('Masraf bulunamadi', 404);

$sets = [];
$params = [];

if (isset($body['tutar'])) {
    $yeniTutar = (float)$body['tutar'];
    if ($yeniTutar < 0) json_error('Tutar 0 dan kucuk olamaz', 422);
    $sets[] = 'tutar = ?';
    $params[] = $yeniTutar;
}

if (isset($body['masraf_kalemi'])) {
    $sets[] = 'masraf_kalemi = ?';
    $params[] = clean($body['masraf_kalemi']);
}

if (isset($body['aciklama'])) {
    $sets[] = 'aciklama = ?';
    $params[] = clean($body['aciklama']);
}

if (empty($sets)) json_error('Guncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE masraflar SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'masraf_guncelle', "Masraf guncellendi ID:$id - Dosya:{$masraf['dosya_id']}", 'masraflar', $id);

json_success(null, 'Masraf guncellendi');
