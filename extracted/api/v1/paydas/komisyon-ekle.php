<?php
/**
 * POST /api/v1/paydas/komisyon-ekle.php
 * Paydaşa komisyon kaydı ekle
 * Body: { "paydas_id": 1, "tutar": 5000, "dosya_id": null, "odendi": 0, "odeme_tarihi": null, "kasa_id": null, "aciklama": "..." }
 *
 * odendi=1 ve kasa_id varsa, kasa bakiyesinden düşülür
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'muhasebe']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['paydas_id', 'tutar']);

$db = getDB();

$paydasId    = (int)$body['paydas_id'];
$tutar       = (float)$body['tutar'];
$dosyaId     = !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null;
$odendi      = !empty($body['odendi']) ? 1 : 0;
$odemeTarihi = !empty($body['odeme_tarihi']) ? $body['odeme_tarihi'] : null;
$kasaId      = !empty($body['kasa_id']) ? (int)$body['kasa_id'] : null;
$aciklama    = clean($body['aciklama'] ?? '');

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);

// Paydaş kontrolü
$stmt = $db->prepare('SELECT id, firma_adi FROM paydaslar WHERE id = ?');
$stmt->execute([$paydasId]);
$paydas = $stmt->fetch();
if (!$paydas) json_error('Paydaş bulunamadı', 404);

// Dosya kontrolü (opsiyonel)
if ($dosyaId) {
    $stmt = $db->prepare('SELECT id FROM dosyalar WHERE id = ?');
    $stmt->execute([$dosyaId]);
    if (!$stmt->fetch()) json_error('Dosya bulunamadı', 404);
}

// Kasa kontrolü (opsiyonel)
$kasa = null;
if ($kasaId) {
    $stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
    $stmt->execute([$kasaId]);
    $kasa = $stmt->fetch();
    if (!$kasa) json_error('Kasa bulunamadı', 404);
}

$db->beginTransaction();
try {
    // Komisyon kaydı
    $stmt = $db->prepare('INSERT INTO paydas_komisyonlari (paydas_id, dosya_id, tutar, odendi, odeme_tarihi, kasa_id, aciklama, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $paydasId,
        $dosyaId,
        $tutar,
        $odendi,
        $odendi ? ($odemeTarihi ?: date('Y-m-d')) : null,
        $kasaId,
        $aciklama,
        $user['id']
    ]);

    $komisyonId = (int)$db->lastInsertId();

    // Eğer ödendi ve kasa seçildiyse, kasa bakiyesinden düş
    if ($odendi && $kasa) {
        $yeniBakiye = $kasa['bakiye'] - $tutar;

        $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
        $stmt->execute([$yeniBakiye, $kasaId]);

        // Kasa hareketi kaydet
        $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $kasaId,
            'masraf',
            $tutar,
            $yeniBakiye,
            "Paydaş komisyon: {$paydas['firma_adi']} - $aciklama",
            $user['id']
        ]);
    }

    $db->commit();

    log_action($user['id'], 'komisyon_ekle', "Komisyon eklendi: {$paydas['firma_adi']} - {$tutar} ₺", 'paydas_komisyonlari', $komisyonId);

    json_success([
        'id' => $komisyonId
    ], 'Komisyon başarıyla eklendi', 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('Komisyon eklenirken hata: ' . $e->getMessage(), 500);
}
