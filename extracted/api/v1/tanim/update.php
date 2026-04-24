<?php
/**
 * PUT /api/v1/tanim/update.php
 * Tanımlama güncelle
 * Body: { "id": 1, "deger": "Yeni Ad", "sira": 5, "aktif": 1 }
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

$stmt = $db->prepare('SELECT * FROM tanimlamalar WHERE id = ?');
$stmt->execute([$id]);
$tanim = $stmt->fetch();
if (!$tanim) json_error('Tanımlama bulunamadı', 404);

$sets = [];
$params = [];

if (isset($body['deger'])) {
    $sets[] = 'deger = ?';
    $params[] = clean($body['deger']);
}
if (isset($body['sira'])) {
    $sets[] = 'sira = ?';
    $params[] = (int)$body['sira'];
}
if (isset($body['aktif'])) {
    $sets[] = 'aktif = ?';
    $params[] = (int)$body['aktif'];
}

if (empty($sets)) json_error('Güncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE tanimlamalar SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

/* ═══ KASKAD RENAME ═══
 * evrak_turu kategorisinde bir tanımlamanın "deger" alanı değiştirildiğinde,
 * mevcut yüklü evrakların evrak_turu metnini de otomatik yeni isme UPDATE et.
 * Böylece liste - upload eşleşmesi bozulmaz. Sadece metin güncellenir, hiçbir
 * evrak silinmez/taşınmaz. İdempotent: eski isim kalmamışsa 0 satır etkiler.
 */
$cascadeCount = 0;
if ($tanim['kategori'] === 'evrak_turu' && isset($body['deger'])) {
    $eskiDeger = $tanim['deger'];
    $yeniDeger = clean($body['deger']);
    if ($eskiDeger !== '' && $yeniDeger !== '' && $eskiDeger !== $yeniDeger) {
        try {
            $casc = $db->prepare('UPDATE evraklar SET evrak_turu = ? WHERE evrak_turu = ?');
            $casc->execute([$yeniDeger, $eskiDeger]);
            $cascadeCount = $casc->rowCount();
        } catch (\Exception $e) { /* tablo yoksa veya başka sebeple sessiz geç */ }
    }
}

$logDetay = "{$tanim['kategori']}: {$tanim['deger']}" . ($cascadeCount > 0 ? " (kaskad: $cascadeCount evrak güncellendi)" : '');
log_action($user['id'], 'tanim_guncelle', $logDetay, 'tanimlamalar', $id);

json_success(['cascade_updated' => $cascadeCount], 'Tanımlama güncellendi');
