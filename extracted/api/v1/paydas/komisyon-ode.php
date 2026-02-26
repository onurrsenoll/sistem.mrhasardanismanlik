<?php
/**
 * PUT /api/v1/paydas/komisyon-ode.php
 * Paydaş komisyonunu öde — cariden ödeme
 *
 * Body: { "id": 1, "kasa_id": 1 }
 *
 * - Komisyon bekliyor → ödendi olarak güncellenir
 * - Seçilen kasadan tutar düşülür
 * - Bağlı masraf kaydı varsa o da otomatik ödendi yapılır
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'uzman', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['id', 'kasa_id']);

$db = getDB();
$komisyonId = (int)$body['id'];
$kasaId = (int)$body['kasa_id'];

// Komisyon kontrolü
$stmt = $db->prepare('SELECT * FROM paydas_komisyonlari WHERE id = ?');
$stmt->execute([$komisyonId]);
$komisyon = $stmt->fetch();
if (!$komisyon) json_error('Komisyon kaydı bulunamadı', 404);
if ($komisyon['durum'] === 'odendi') json_error('Bu komisyon zaten ödenmiş', 422);

$tutar = (float)$komisyon['tutar'];

// Kasa kontrolü
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$kasaId]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);
if ($kasa['bakiye'] < $tutar) {
    json_error("Yetersiz bakiye! {$kasa['ad']}: " . number_format($kasa['bakiye'], 2, ',', '.') . ' ₺', 422);
}

// Paydaş bilgisi
$stmt = $db->prepare('SELECT ad FROM paydaslar WHERE id = ?');
$stmt->execute([$komisyon['paydas_id']]);
$paydas = $stmt->fetch();

$db->beginTransaction();
try {
    $bugun = date('Y-m-d');

    // 1. Komisyonu ödendi olarak güncelle
    $stmt = $db->prepare('UPDATE paydas_komisyonlari SET durum = ?, odeme_tarihi = ?, kasa_id = ? WHERE id = ?');
    $stmt->execute(['odendi', $bugun, $kasaId, $komisyonId]);

    // 2. Kasa bakiyesini düşür
    $yeniBakiye = $kasa['bakiye'] - $tutar;
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$yeniBakiye, $kasaId]);

    // 3. Kasa hareketi kaydet
    $aciklama = "Paydaş komisyon ödeme: " . ($paydas['ad'] ?? '');
    if ($komisyon['dosya_id']) {
        $stmtD = $db->prepare('SELECT dosya_no FROM dosyalar WHERE id = ?');
        $stmtD->execute([$komisyon['dosya_id']]);
        $dosya = $stmtD->fetch();
        if ($dosya) $aciklama .= " (Dosya: {$dosya['dosya_no']})";
    }

    $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $kasaId,
        $komisyon['dosya_id'],
        'masraf',
        $tutar,
        $yeniBakiye,
        $aciklama,
        $user['id']
    ]);

    // 4. Bağlı masraf kaydı varsa onu da ödendi yap
    $masrafBilgi = null;
    $masrafId = $komisyon['masraf_id'] ?? null;
    if ($masrafId) {
        $stmtM = $db->prepare('SELECT id, odeme_durumu FROM masraflar WHERE id = ?');
        $stmtM->execute([$masrafId]);
        $masraf = $stmtM->fetch();
        if ($masraf && ($masraf['odeme_durumu'] ?? 'odendi') === 'odenmedi') {
            $stmtMU = $db->prepare('UPDATE masraflar SET odeme_durumu = ?, kasa_id = ? WHERE id = ?');
            $stmtMU->execute(['odendi', $kasaId, $masrafId]);
            $masrafBilgi = [
                'masraf_id' => $masrafId,
                'odeme_durumu' => 'odendi'
            ];
        }
    }

    $db->commit();

    log_action($user['id'], 'paydas_komisyon_ode', "Paydaş komisyon #$komisyonId ödendi: " . number_format($tutar, 2) . " ₺, Kasa: {$kasa['ad']}", 'paydas_komisyonlari', $komisyonId);

    json_success([
        'komisyon_id' => $komisyonId,
        'durum' => 'odendi',
        'odeme_tarihi' => $bugun,
        'kasa_id' => $kasaId,
        'kasa_adi' => $kasa['ad'],
        'yeni_bakiye' => $yeniBakiye,
        'masraf' => $masrafBilgi
    ], 'Komisyon ödemesi başarıyla yapıldı');

} catch (\Exception $e) {
    $db->rollBack();
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
