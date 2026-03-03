<?php
/**
 * PUT /api/v1/masraf/ode.php
 * Masraf ödeme işlemi — ödenmemiş masrafı ödenmiş olarak işaretle
 *
 * Body: { "id": 1, "kasa_id": 1 }
 *
 * - Masraf ödenmedi → ödendi olarak güncellenir
 * - Seçilen kasadan tutar düşülür
 * - Bağlı paydaş komisyonu varsa o da otomatik ödendi yapılır
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

// Masraf ödeme: yetki bazlı kontrol (dosya-masraf-ode yetkisi gerekli)
$user = auth_required();
$body = get_json_body();
require_fields($body, ['id', 'kasa_id']);

// Yetki kontrolü: admin veya dosya-masraf-ode yetkisi olmalı
if (!has_yetki($user, 'dosya', 'dosya-masraf-ode')) {
    json_error('Bu işlem için yetkiniz bulunmamaktadır', 403);
}

$db = getDB();
$masrafId = (int)$body['id'];
$kasaId = (int)$body['kasa_id'];

// Masraf kontrolü
$stmt = $db->prepare('SELECT m.*, d.dosya_no FROM masraflar m LEFT JOIN dosyalar d ON d.id = m.dosya_id WHERE m.id = ?');
$stmt->execute([$masrafId]);
$masraf = $stmt->fetch();
if (!$masraf) json_error('Masraf kaydı bulunamadı', 404);

// Zaten ödenmiş kontrolü
$odemeDurumu = $masraf['odeme_durumu'] ?? 'odendi';
if ($odemeDurumu === 'odendi') json_error('Bu masraf zaten ödenmiş', 422);

$tutar = (float)$masraf['tutar'];

// Kasa kontrolü
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

    // 1. Masrafı ödendi olarak güncelle
    $stmt = $db->prepare('UPDATE masraflar SET odeme_durumu = ?, kasa_id = ? WHERE id = ?');
    $stmt->execute(['odendi', $kasaId, $masrafId]);

    // 2. Kasa bakiyesini düşür
    $yeniBakiye = $kasa['bakiye'] - $tutar;
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$yeniBakiye, $kasaId]);

    // 3. Kasa hareketi kaydet
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

    // 4. Bağlı paydaş komisyonu varsa onu da ödendi yap
    $komisyonBilgi = null;
    $paydasKomisyonId = $masraf['paydas_komisyon_id'] ?? null;
    if ($paydasKomisyonId) {
        $stmtK = $db->prepare('SELECT id, durum, paydas_id FROM paydas_komisyonlari WHERE id = ?');
        $stmtK->execute([$paydasKomisyonId]);
        $komisyon = $stmtK->fetch();
        if ($komisyon && $komisyon['durum'] !== 'odendi') {
            $stmtKU = $db->prepare('UPDATE paydas_komisyonlari SET durum = ?, odeme_tarihi = ?, kasa_id = ? WHERE id = ?');
            $stmtKU->execute(['odendi', $bugun, $kasaId, $paydasKomisyonId]);
            $komisyonBilgi = [
                'komisyon_id' => $paydasKomisyonId,
                'paydas_id' => $komisyon['paydas_id'],
                'durum' => 'odendi'
            ];
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
    $db->rollBack();
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
