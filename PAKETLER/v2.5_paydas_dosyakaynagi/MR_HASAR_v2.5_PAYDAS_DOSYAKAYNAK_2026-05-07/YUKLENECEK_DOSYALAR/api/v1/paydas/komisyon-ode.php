<?php
/**
 * PUT /api/v1/paydas/komisyon-ode.php
 * Paydaş komisyonunu öde — cariden ödeme
 *
 * Body: { "id": 1, "kasa_id": 1 }
 *
 * KASA BUTUNLUGU (Madde 13):
 *  - Race condition'a karsi kosullu (atomik) UPDATE kullanir.
 *  - Komisyon zaten odenmisse 409 doner.
 *  - Kasa bakiyesi yetersizse atomik UPDATE basarisiz olur ve 422 doner.
 *  - Bagli masraf kaydi varsa onu da kosullu UPDATE ile odendi yapar.
 *  - Muhasebe komisyonlar tablosunu paralel olarak gunceller.
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

// Kasa kontrolü (ön kontrol)
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

    // 1. Komisyonu koşullu UPDATE ile ödendi yap (atomik — race-safe)
    $stmt = $db->prepare("UPDATE paydas_komisyonlari SET durum = 'odendi', odeme_tarihi = ?, kasa_id = ? WHERE id = ? AND durum != 'odendi'");
    $stmt->execute([$bugun, $kasaId, $komisyonId]);
    if ($stmt->rowCount() === 0) {
        $db->rollBack();
        json_error('Bu komisyon zaten ödenmiş veya başka bir işlem tarafından kilitli (cakisma)', 409);
    }

    // 2. Kasa bakiyesini koşullu UPDATE ile düş (atomik)
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = bakiye - ? WHERE id = ? AND aktif = 1 AND bakiye >= ?');
    $stmt->execute([$tutar, $kasaId, $tutar]);
    if ($stmt->rowCount() === 0) {
        $db->rollBack();
        json_error('Kasa bakiyesi yetersiz veya kasa erişilemez (eşzamanlı işlem olabilir)', 422);
    }

    // 3. Yeni bakiyeyi oku
    $stmtB = $db->prepare('SELECT bakiye FROM kasalar WHERE id = ?');
    $stmtB->execute([$kasaId]);
    $yeniBakiye = (float)$stmtB->fetchColumn();

    // 4. Kasa hareketi kaydet
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

    // 5. Bağlı masraf kaydı varsa onu da koşullu UPDATE ile ödendi yap
    $masrafBilgi = null;
    $masrafId = $komisyon['masraf_id'] ?? null;
    if ($masrafId) {
        $stmtM = $db->prepare('SELECT id, odeme_durumu FROM masraflar WHERE id = ?');
        $stmtM->execute([$masrafId]);
        $masraf = $stmtM->fetch();
        if ($masraf && ($masraf['odeme_durumu'] ?? 'odendi') === 'odenmedi') {
            $stmtMU = $db->prepare("UPDATE masraflar SET odeme_durumu = 'odendi', kasa_id = ? WHERE id = ? AND odeme_durumu = 'odenmedi'");
            $stmtMU->execute([$kasaId, $masrafId]);
            if ($stmtMU->rowCount() > 0) {
                $masrafBilgi = [
                    'masraf_id' => $masrafId,
                    'odeme_durumu' => 'odendi'
                ];
            }
        }
    }

    // 6. Muhasebe komisyonlar tablosunu da güncelle (paralel entegrasyon)
    try {
        $db->prepare('UPDATE komisyonlar SET odendi = 1, odeme_tarihi = ?, kasa_id = ? WHERE paydas_id = ? AND dosya_id = ? AND odendi = 0')
           ->execute([$bugun, $kasaId, $komisyon['paydas_id'], $komisyon['dosya_id']]);
    } catch (\Exception $e) {}

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
    if ($db->inTransaction()) $db->rollBack();
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
