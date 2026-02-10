<?php
/**
 * POST /api/v1/muhasebe/transfer.php
 * Kasalar arası transfer
 * Body: { "kaynak_kasa_id": 1, "hedef_kasa_id": 2, "tutar": 5000, "aciklama": "..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['kaynak_kasa_id', 'hedef_kasa_id', 'tutar']);

$db = getDB();
$kaynakId = (int)$body['kaynak_kasa_id'];
$hedefId = (int)$body['hedef_kasa_id'];
$tutar = (float)$body['tutar'];

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);
if ($kaynakId === $hedefId) json_error('Kaynak ve hedef kasa aynı olamaz', 422);

// Kaynak kasa
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$kaynakId]);
$kaynak = $stmt->fetch();
if (!$kaynak) json_error('Kaynak kasa bulunamadı', 404);
if ($kaynak['bakiye'] < $tutar) {
    json_error("Yetersiz bakiye! {$kaynak['ad']}: " . number_format($kaynak['bakiye'], 2, ',', '.') . ' ₺', 422);
}

// Hedef kasa
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$hedefId]);
$hedef = $stmt->fetch();
if (!$hedef) json_error('Hedef kasa bulunamadı', 404);

$db->beginTransaction();
try {
    $kaynakYeniBakiye = $kaynak['bakiye'] - $tutar;
    $hedefYeniBakiye = $hedef['bakiye'] + $tutar;

    // Kaynak bakiye düşür
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$kaynakYeniBakiye, $kaynakId]);

    // Hedef bakiye artır
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$hedefYeniBakiye, $hedefId]);

    $aciklama = clean($body['aciklama'] ?? "Transfer: {$kaynak['ad']} → {$hedef['ad']}");

    // Kaynak hareket (çıkış)
    $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$kaynakId, 'transfer', $tutar, $kaynakYeniBakiye, "Transfer çıkış → {$hedef['ad']}: $aciklama", $user['id']]);

    // Hedef hareket (giriş)
    $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$hedefId, 'transfer', $tutar, $hedefYeniBakiye, "Transfer giriş ← {$kaynak['ad']}: $aciklama", $user['id']]);

    $db->commit();

    log_action($user['id'], 'kasa_transfer', "{$kaynak['ad']} → {$hedef['ad']}: " . number_format($tutar, 2) . " ₺", 'kasa_hareketleri', null);

    json_success([
        'kaynak_bakiye' => $kaynakYeniBakiye,
        'hedef_bakiye' => $hedefYeniBakiye
    ], 'Transfer başarılı');

} catch (\Exception $e) {
    $db->rollBack();
    json_error('Transfer hatası: ' . $e->getMessage(), 500);
}
