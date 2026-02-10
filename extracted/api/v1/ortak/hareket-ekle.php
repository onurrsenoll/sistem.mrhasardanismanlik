<?php
/**
 * POST /api/v1/ortak/hareket-ekle.php
 * Ortağa hareket ekle (pay veya ödeme)
 * Body: { "ortak_id": 1, "islem_turu": "pay", "tutar": 5000, "dosya_id": null, "aciklama": "...", "kasa_id": null }
 *
 * islem_turu='odeme' ve kasa_id varsa, kasa bakiyesinden düşülür
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'muhasebe']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['ortak_id', 'islem_turu', 'tutar']);

$db = getDB();

$ortakId   = (int)$body['ortak_id'];
$islemTuru = clean($body['islem_turu']);
$tutar     = (float)$body['tutar'];
$dosyaId   = !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null;
$aciklama  = clean($body['aciklama'] ?? '');
$kasaId    = !empty($body['kasa_id']) ? (int)$body['kasa_id'] : null;

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);

// Ortak kontrolü
$stmt = $db->prepare('SELECT id, ad_soyad FROM ortaklar WHERE id = ?');
$stmt->execute([$ortakId]);
$ortak = $stmt->fetch();
if (!$ortak) json_error('Ortak bulunamadı', 404);

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
    // Hareket kaydet
    $stmt = $db->prepare('INSERT INTO ortak_hareketleri (ortak_id, dosya_id, islem_turu, tutar, aciklama, kasa_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $ortakId,
        $dosyaId,
        $islemTuru,
        $tutar,
        $aciklama,
        $kasaId,
        $user['id']
    ]);

    $hareketId = (int)$db->lastInsertId();

    // Eğer ödeme ise ve kasa seçildiyse, kasa bakiyesinden düş
    if ($islemTuru === 'odeme' && $kasa) {
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
            "Ortak ödeme: {$ortak['ad_soyad']} - $aciklama",
            $user['id']
        ]);
    }

    $db->commit();

    log_action($user['id'], 'ortak_hareket', "Ortak hareket: {$ortak['ad_soyad']} - $islemTuru {$tutar} ₺", 'ortak_hareketleri', $hareketId);

    json_success([
        'id' => $hareketId
    ], 'Hareket başarıyla eklendi', 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('Hareket eklenirken hata: ' . $e->getMessage(), 500);
}
