<?php
/**
 * PUT /api/v1/masraf/update.php
 * Masraf kaydini guncelle (tutar, masraf_kalemi, aciklama)
 * Sadece admin yetkisi
 *
 * KASA BUTUNLUGU (Madde 12):
 *  - Eger masraf odenmis (kasa_id dolu) ve tutar degisiyorsa,
 *    kasa bakiyesi farka gore otomatik duzeltilir.
 *  - Eski tutar > yeni tutar  -> kasaya geri eklenir (fark = eski - yeni)
 *  - Eski tutar < yeni tutar  -> kasadan dusulur     (fark = eski - yeni < 0)
 *  - Yeni tutar buyukse, mevcut bakiye yeterliligi kontrol edilir.
 *  - Tutar duzeltmesi icin kasa_hareketleri'ne aciklayici bir kayit eklenir.
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

$tutarDegisti = false;
$eskiTutar = (float)$masraf['tutar'];
$yeniTutar = $eskiTutar;

if (isset($body['tutar'])) {
    $yeniTutar = (float)$body['tutar'];
    if ($yeniTutar < 0) json_error('Tutar 0 dan kucuk olamaz', 422);
    if ($yeniTutar !== $eskiTutar) {
        $tutarDegisti = true;
        $sets[] = 'tutar = ?';
        $params[] = $yeniTutar;
    }
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

// Kasa bakiyesi duzeltmesi gerekecek mi?
$kasaId = $masraf['kasa_id'] ?? null;
$odendi = (($masraf['odeme_durumu'] ?? 'odendi') === 'odendi') && $kasaId;
$fark = $eskiTutar - $yeniTutar; // pozitif = kasaya geri ekle, negatif = kasadan dus

$db->beginTransaction();
try {
    // Yeni tutar daha buyukse, kasa bakiyesi yeterli mi kontrol et
    if ($tutarDegisti && $odendi && $fark < 0) {
        $ek = abs($fark);
        $stmtK = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
        $stmtK->execute([$kasaId]);
        $kasa = $stmtK->fetch();
        if (!$kasa) { $db->rollBack(); json_error('Masrafa bagli kasa bulunamadi', 404); }
        if ((float)$kasa['bakiye'] < $ek) {
            $db->rollBack();
            json_error("Yetersiz bakiye! Tutar artirimi icin {$kasa['ad']} kasasinda {$ek} TL daha lazim", 422);
        }
    }

    $params[] = $id;
    $stmt = $db->prepare('UPDATE masraflar SET ' . implode(', ', $sets) . ' WHERE id = ?');
    $stmt->execute($params);

    // Tutar degisti ve masraf odenmis ise kasa bakiyesini farka gore duzelt
    if ($tutarDegisti && $odendi) {
        // Atomik UPDATE: yeterli bakiye sarti ile (negatif fark = kasadan dus)
        if ($fark < 0) {
            $duz = $db->prepare('UPDATE kasalar SET bakiye = bakiye - ? WHERE id = ? AND bakiye >= ?');
            $duz->execute([abs($fark), $kasaId, abs($fark)]);
            if ($duz->rowCount() === 0) {
                $db->rollBack();
                json_error('Kasa bakiyesi duzeltilemedi (yetersiz bakiye veya kasa erisilemiyor)', 422);
            }
        } else {
            // Pozitif fark: kasaya geri ekle
            $duz = $db->prepare('UPDATE kasalar SET bakiye = bakiye + ? WHERE id = ?');
            $duz->execute([$fark, $kasaId]);
        }

        // Yeni bakiyeyi al
        $stmtB = $db->prepare('SELECT bakiye FROM kasalar WHERE id = ?');
        $stmtB->execute([$kasaId]);
        $yeniBakiye = (float)$stmtB->fetchColumn();

        // Kasa hareketi: aciklayici duzeltme satiri
        $aciklama = "Masraf tutar duzeltme #$id: " . number_format($eskiTutar, 2, ',', '.')
                  . ' -> ' . number_format($yeniTutar, 2, ',', '.') . ' TL';
        // islem_turu: pozitif fark = gelir (geri donus), negatif = masraf (ek dus)
        $islemTuru = ($fark > 0) ? 'gelir' : 'masraf';
        $hareketTutar = abs($fark);

        $hr = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $hr->execute([
            $kasaId,
            $masraf['dosya_id'],
            $islemTuru,
            $hareketTutar,
            $yeniBakiye,
            $aciklama,
            $user['id']
        ]);
    }

    $db->commit();
} catch (\Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    json_error('Islem hatasi: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'masraf_guncelle', "Masraf guncellendi ID:$id - Dosya:{$masraf['dosya_id']}" . ($tutarDegisti ? " (tutar: $eskiTutar -> $yeniTutar)" : ''), 'masraflar', $id);

json_success([
    'masraf_id' => $id,
    'eski_tutar' => $eskiTutar,
    'yeni_tutar' => $yeniTutar,
    'kasa_duzeltildi' => ($tutarDegisti && $odendi)
], 'Masraf guncellendi');
