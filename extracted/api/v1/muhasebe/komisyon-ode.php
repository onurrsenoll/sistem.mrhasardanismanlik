<?php
/**
 * PUT /api/v1/muhasebe/komisyon-ode.php
 * Komisyon ödemesi yap
 * Body: { "id": 1, "kasa_id": 1 }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['id', 'kasa_id']);

$db = getDB();
$komisyonId = (int)$body['id'];
$kasaId = (int)$body['kasa_id'];

// Komisyon kontrolü
$stmt = $db->prepare('SELECT k.*, d.dosya_no FROM komisyonlar k LEFT JOIN dosyalar d ON d.id = k.dosya_id WHERE k.id = ?');
$stmt->execute([$komisyonId]);
$komisyon = $stmt->fetch();
if (!$komisyon) json_error('Komisyon kaydı bulunamadı', 404);
if ($komisyon['odendi']) json_error('Bu komisyon zaten ödenmiş', 422);

// Kasa kontrolü
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$kasaId]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);

$tutar = (float)$komisyon['tutar'];
if ($kasa['bakiye'] < $tutar) {
    json_error("Yetersiz bakiye! {$kasa['ad']}: " . number_format($kasa['bakiye'], 2, ',', '.') . ' ₺', 422);
}

$db->beginTransaction();
try {
    $bugun = date('Y-m-d');

    // Komisyon ödenmiş olarak işaretle
    $stmt = $db->prepare('UPDATE komisyonlar SET odendi = 1, odeme_tarihi = ?, kasa_id = ? WHERE id = ?');
    $stmt->execute([$bugun, $kasaId, $komisyonId]);

    // Kasa bakiyesini düşür
    $yeniBakiye = $kasa['bakiye'] - $tutar;
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$yeniBakiye, $kasaId]);

    // Kasa hareketi kaydet
    $dosyaNo = $komisyon['dosya_no'] ?? '';
    $aciklama = "Komisyon ödeme: {$komisyon['komisyon_turu']}";
    if ($dosyaNo) $aciklama .= " (Dosya: $dosyaNo)";

    $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $kasaId,
        $komisyon['dosya_id'],
        'komisyon',
        $tutar,
        $yeniBakiye,
        $aciklama,
        $user['id']
    ]);

    $db->commit();

    log_action($user['id'], 'komisyon_ode', "Komisyon #$komisyonId ödendi: $tutar ₺, Kasa: {$kasa['ad']}", 'komisyonlar', $komisyonId);

    json_success([
        'komisyon_id' => $komisyonId,
        'odeme_tarihi' => $bugun,
        'yeni_bakiye' => $yeniBakiye
    ], 'Komisyon ödemesi yapıldı');

} catch (\Exception $e) {
    $db->rollBack();
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
