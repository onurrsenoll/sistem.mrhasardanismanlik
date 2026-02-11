<?php
/**
 * POST /api/v1/ortak/hareket-ekle.php
 * Ortağa hareket ekle (ödeme, tahsilat, masraf)
 * Body: { "ortak_id": 1, "tur": "odeme", "tutar": 5000, "tarih": "2025-01-01", "dosya_id": null, "aciklama": "..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'muhasebe']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['ortak_id', 'tutar']);

$db = getDB();

$ortakId   = (int)$body['ortak_id'];
$tur       = clean($body['tur'] ?? $body['islem_turu'] ?? 'odeme');
$tutar     = (float)$body['tutar'];
$tarih     = !empty($body['tarih']) ? $body['tarih'] : date('Y-m-d');
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
    $stmt = $db->prepare('INSERT INTO ortak_hareketleri (ortak_id, dosya_id, tur, tutar, tarih, aciklama, kasa_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $ortakId,
        $dosyaId,
        $tur,
        $tutar,
        $tarih,
        $aciklama,
        $kasaId,
        $user['id']
    ]);

    $hareketId = (int)$db->lastInsertId();

    // Eğer ödeme ise ve kasa seçildiyse, kasa bakiyesinden düş
    if ($tur === 'odeme' && $kasa) {
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

    log_action($user['id'], 'ortak_hareket', "Ortak hareket: {$ortak['ad_soyad']} - $tur {$tutar} ₺", 'ortak_hareketleri', $hareketId);

    json_success([
        'id' => $hareketId
    ], 'Hareket başarıyla eklendi', 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('Hareket eklenirken hata: ' . $e->getMessage(), 500);
}
