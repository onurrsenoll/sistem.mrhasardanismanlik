<?php
/**
 * PUT /api/v1/personel/hakedis-ode.php
 * Hakediş / Maaş ödeme işlemi
 *
 * Senaryo 1 (Hakediş tablosundan ödeme):
 *   Body: { "id": 1, "odeme_durumu": "odendi", "odeme_tarihi": "2026-02-28" }
 *
 * Senaryo 2 (Personel listesinden kasa ile maaş ödeme):
 *   Body: { "personel_id": 5, "kasa_id": 1, "tutar": 8500, "aciklama": "...", "tarih": "2026-03-01" }
 *   → Giderler tablosuna PERSONEL MAAŞ kaydı oluşturur (trigger kasa hareketini otomatik işler)
 *   → Bekleyen hakedişi varsa ödendi olarak işaretler
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required();
if (!has_yetki($user, 'muhasebe', 'personel-maas-ode')) {
    json_error('Bu işlem için yetkiniz bulunmamaktadır', 403);
}

$body = get_json_body();
$db = getDB();

/* ═══ SENARYO 2: Personel listesinden kasa ile maaş ödeme ═══ */
if (!empty($body['personel_id']) && !empty($body['kasa_id'])) {
    $personelId = (int)$body['personel_id'];
    $kasaId = (int)$body['kasa_id'];
    $tutar = (float)($body['tutar'] ?? 0);
    $aciklama = clean($body['aciklama'] ?? '');
    $tarih = !empty($body['tarih']) ? clean($body['tarih']) : date('Y-m-d');

    if ($tutar <= 0) json_error('TUTAR 0\'DAN BÜYÜK OLMALIDIR', 422);

    // Personel kontrolü
    $stmt = $db->prepare('SELECT id, ad_soyad, maas FROM personel WHERE id = ?');
    $stmt->execute([$personelId]);
    $personel = $stmt->fetch();
    if (!$personel) json_error('PERSONEL BULUNAMADI', 404);

    // Kasa kontrolü
    $stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
    $stmt->execute([$kasaId]);
    $kasa = $stmt->fetch();
    if (!$kasa) json_error('KASA BULUNAMADI', 404);
    if ($kasa['bakiye'] < $tutar) {
        json_error("YETERSİZ BAKİYE! {$kasa['ad']}: " . number_format($kasa['bakiye'], 2, ',', '.') . ' ₺', 422);
    }

    if (empty($aciklama)) $aciklama = $personel['ad_soyad'] . ' - MAAŞ/HAKEDİŞ ÖDEMESİ';

    $db->beginTransaction();
    try {
        // Gider kaydı oluştur → trigger otomatik kasa bakiye düşer + hareket oluşur
        $stmt = $db->prepare('INSERT INTO giderler (dosya_id, gider_turu, tutar, kasa_id, aciklama, islem_tarihi, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([null, 'PERSONEL MAAŞ', $tutar, $kasaId, $aciklama, $tarih, $user['id']]);
        $giderId = (int)$db->lastInsertId();

        // Bekleyen hakedişi varsa ödendi yap
        $hakedisId = null;
        $stmtH = $db->prepare("SELECT id FROM personel_hakedis WHERE personel_id = ? AND (odeme_durumu IS NULL OR odeme_durumu = '' OR odeme_durumu = 'bekliyor') ORDER BY donem DESC LIMIT 1");
        $stmtH->execute([$personelId]);
        $bekleyenH = $stmtH->fetch();
        if ($bekleyenH) {
            $hakedisId = (int)$bekleyenH['id'];
            $stmtU = $db->prepare('UPDATE personel_hakedis SET odeme_durumu = ?, odeme_tarihi = ? WHERE id = ?');
            $stmtU->execute(['odendi', $tarih, $hakedisId]);
        }

        $db->commit();

        // Güncel bakiyeyi al
        $stmt = $db->prepare('SELECT bakiye FROM kasalar WHERE id = ?');
        $stmt->execute([$kasaId]);
        $yeniBakiye = (float)$stmt->fetch()['bakiye'];

        log_action($user['id'], 'personel_maas_ode', "Maaş ödeme: {$personel['ad_soyad']} - ₺$tutar - Kasa: {$kasa['ad']}", 'giderler', $giderId);

        json_success([
            'gider_id' => $giderId,
            'hakedis_id' => $hakedisId,
            'yeni_bakiye' => $yeniBakiye,
            'personel' => $personel['ad_soyad']
        ], "MAAŞ ÖDEMESİ BAŞARIYLA YAPILDI: {$personel['ad_soyad']} - " . number_format($tutar, 2, ',', '.') . ' ₺');

    } catch (\Exception $e) {
        $db->rollBack();
        json_error('İŞLEM HATASI: ' . $e->getMessage(), 500);
    }
    exit;
}

/* ═══ SENARYO 1: Hakediş tablosundan ödeme durumu güncelle ═══ */
require_fields($body, ['id']);
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT ph.*, p.ad_soyad FROM personel_hakedis ph LEFT JOIN personel p ON p.id = ph.personel_id WHERE ph.id = ?');
$stmt->execute([$id]);
$hakedis = $stmt->fetch();
if (!$hakedis) json_error('HAKEDİŞ KAYDI BULUNAMADI', 404);

$odemeDurumu = clean($body['odeme_durumu'] ?? 'odendi');
$odemeTarihi = !empty($body['odeme_tarihi']) ? $body['odeme_tarihi'] : date('Y-m-d');

// Kasa ile ödeme yapılmak isteniyorsa (hakediş tablosundan kasa seçerek)
if (!empty($body['kasa_id']) && $odemeDurumu === 'odendi') {
    $kasaId = (int)$body['kasa_id'];
    $tutar = (float)$hakedis['toplam_hakedis'];

    $stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
    $stmt->execute([$kasaId]);
    $kasa = $stmt->fetch();
    if (!$kasa) json_error('KASA BULUNAMADI', 404);
    if ($kasa['bakiye'] < $tutar) {
        json_error("YETERSİZ BAKİYE! {$kasa['ad']}: " . number_format($kasa['bakiye'], 2, ',', '.') . ' ₺', 422);
    }

    $aciklama = $hakedis['ad_soyad'] . ' - ' . $hakedis['donem'] . ' HAKEDİŞ ÖDEMESİ';

    $db->beginTransaction();
    try {
        // Gider kaydı → trigger kasa işler
        $stmt = $db->prepare('INSERT INTO giderler (dosya_id, gider_turu, tutar, kasa_id, aciklama, islem_tarihi, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([null, 'PERSONEL MAAŞ', $tutar, $kasaId, $aciklama, $odemeTarihi, $user['id']]);

        // Hakedişi ödendi yap
        $stmt = $db->prepare('UPDATE personel_hakedis SET odeme_durumu = ?, odeme_tarihi = ? WHERE id = ?');
        $stmt->execute([$odemeDurumu, $odemeTarihi, $id]);

        $db->commit();

        log_action($user['id'], 'hakedis_ode', "Hakediş ödendi (kasadan): {$hakedis['ad_soyad']} - {$hakedis['donem']} - ₺{$hakedis['toplam_hakedis']} - Kasa: {$kasa['ad']}", 'personel_hakedis', $id);

        json_success(['id' => $id], 'HAKEDİŞ ÖDEMESİ BAŞARIYLA YAPILDI');
    } catch (\Exception $e) {
        $db->rollBack();
        json_error('İŞLEM HATASI: ' . $e->getMessage(), 500);
    }
    exit;
}

// Sadece durum güncelleme (kasa olmadan)
$stmt = $db->prepare('UPDATE personel_hakedis SET odeme_durumu = ?, odeme_tarihi = ? WHERE id = ?');
$stmt->execute([$odemeDurumu, $odemeTarihi, $id]);

log_action($user['id'], 'hakedis_ode', "Hakediş ödendi: {$hakedis['ad_soyad']} - {$hakedis['donem']} - ₺{$hakedis['toplam_hakedis']}", 'personel_hakedis', $id);

json_success(['id' => $id], 'HAKEDİŞ ÖDEME DURUMU GÜNCELLENDİ');
