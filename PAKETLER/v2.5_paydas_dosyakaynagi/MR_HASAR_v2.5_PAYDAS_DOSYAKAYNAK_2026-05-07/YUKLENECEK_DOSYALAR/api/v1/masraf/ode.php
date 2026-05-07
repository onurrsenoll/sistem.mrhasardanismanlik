<?php
/**
 * PUT /api/v1/masraf/ode.php
 * Masraf ödeme işlemi — ödenmemiş masrafı ödenmiş olarak işaretle
 *
 * Body: { "id": 1, "kasa_id": 1 }
 *
 * KASA BUTUNLUGU (Madde 13):
 *  - Race condition'a karsi kosullu (atomik) UPDATE kullanir.
 *  - Masraf zaten odenmisse veya baska kullanici islerken cakisma yasarsa 409 doner.
 *  - Kasa bakiyesi yetersizse atomik UPDATE basarisiz olur ve 422 doner.
 *  - Bagli paydas komisyonu varsa onu da ayni kosullu UPDATE ile odendi yapar.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['id', 'kasa_id']);

if (!has_yetki($user, 'dosya', 'dosya-masraf-ode')) {
    json_error('Bu işlem için yetkiniz bulunmamaktadır', 403);
}

$db = getDB();
$masrafId = (int)$body['id'];
$kasaId = (int)$body['kasa_id'];

// Masraf kontrolü (önce var mı, ödendi mi?)
$stmt = $db->prepare('SELECT m.*, d.dosya_no FROM masraflar m LEFT JOIN dosyalar d ON d.id = m.dosya_id WHERE m.id = ?');
$stmt->execute([$masrafId]);
$masraf = $stmt->fetch();
if (!$masraf) json_error('Masraf kaydı bulunamadı', 404);

$odemeDurumu = $masraf['odeme_durumu'] ?? 'odendi';
if ($odemeDurumu === 'odendi') json_error('Bu masraf zaten ödenmiş', 422);

$tutar = (float)$masraf['tutar'];

// Kasa kontrolü (ön kontrol — kullanıcıya hızlı hata)
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$kasaId]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);
if ($kasa['bakiye'] < $tutar) {
    json_error("Yetersiz bakiye! {$kasa['ad']}: " . number_format($kasa['bakiye'], 2, ',', '.') . ' ₺', 422);
}

$db->beginTransaction();
try {
    $bugun = date('Y-m-d');

    // 1. Masrafı koşullu UPDATE ile ödendi yap (atomik — race-safe)
    $stmt = $db->prepare("UPDATE masraflar SET odeme_durumu = 'odendi', kasa_id = ? WHERE id = ? AND odeme_durumu = 'odenmedi'");
    $stmt->execute([$kasaId, $masrafId]);
    if ($stmt->rowCount() === 0) {
        $db->rollBack();
        json_error('Bu masraf zaten ödenmiş veya başka bir işlem tarafından kilitli (cakisma)', 409);
    }

    // 2. Kasa bakiyesini koşullu UPDATE ile düş (atomik — yetersiz bakiyede 0 row etkilenir)
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
    $aciklama = "Masraf ödeme: {$masraf['masraf_kalemi']}";
    if ($masraf['dosya_no']) $aciklama .= " (Dosya: {$masraf['dosya_no']})";

    $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $kasaId,
        $masraf['dosya_id'],
        'masraf',
        $tutar,
        $yeniBakiye,
        $aciklama,
        $user['id']
    ]);

    // 5. Bağlı paydaş komisyonu varsa onu da koşullu UPDATE ile ödendi yap
    $komisyonBilgi = null;
    $paydasKomisyonId = $masraf['paydas_komisyon_id'] ?? null;
    if ($paydasKomisyonId) {
        $stmtK = $db->prepare('SELECT id, durum, paydas_id FROM paydas_komisyonlari WHERE id = ?');
        $stmtK->execute([$paydasKomisyonId]);
        $komisyon = $stmtK->fetch();
        if ($komisyon && $komisyon['durum'] !== 'odendi') {
            $stmtKU = $db->prepare("UPDATE paydas_komisyonlari SET durum = 'odendi', odeme_tarihi = ?, kasa_id = ? WHERE id = ? AND durum != 'odendi'");
            $stmtKU->execute([$bugun, $kasaId, $paydasKomisyonId]);
            if ($stmtKU->rowCount() > 0) {
                $komisyonBilgi = [
                    'komisyon_id' => $paydasKomisyonId,
                    'paydas_id' => $komisyon['paydas_id'],
                    'durum' => 'odendi'
                ];
            }
        }
    }

    $db->commit();

    log_action($user['id'], 'masraf_ode', "Masraf #$masrafId ödendi: " . number_format($tutar, 2) . " ₺, Kasa: {$kasa['ad']}", 'masraflar', $masrafId);

    json_success([
        'masraf_id' => $masrafId,
        'odeme_durumu' => 'odendi',
        'kasa_id' => $kasaId,
        'kasa_adi' => $kasa['ad'],
        'yeni_bakiye' => $yeniBakiye,
        'komisyon' => $komisyonBilgi
    ], 'Masraf ödemesi başarıyla yapıldı');

} catch (\Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
