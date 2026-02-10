<?php
/**
 * POST /api/v1/muhasebe/gelir-ekle.php
 * Kasaya gelir ekle (ödeme alındı, komisyon vs.)
 * Body: { "kasa_id": 1, "tutar": 5000, "islem_turu": "gelir", "aciklama": "...", "dosya_id": null }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['kasa_id', 'tutar', 'islem_turu']);

$db = getDB();
$kasaId = (int)$body['kasa_id'];
$tutar = (float)$body['tutar'];
$islemTuru = clean($body['islem_turu']);

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);
if (!in_array($islemTuru, ['gelir', 'komisyon'])) {
    json_error('İşlem türü gelir veya komisyon olmalı', 422);
}

$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$kasaId]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);

$yeniBakiye = $kasa['bakiye'] + $tutar;

$db->beginTransaction();
try {
    // Bakiye güncelle
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$yeniBakiye, $kasaId]);

    // Hareket kaydet
    $dosyaId = !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null;
    $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $kasaId,
        $dosyaId,
        $islemTuru,
        $tutar,
        $yeniBakiye,
        clean($body['aciklama'] ?? ''),
        $user['id']
    ]);

    $hareketId = (int)$db->lastInsertId();
    $db->commit();

    log_action($user['id'], 'gelir_ekle', "{$kasa['ad']} +{$tutar} ₺ ($islemTuru)", 'kasa_hareketleri', $hareketId);

    json_success([
        'hareket_id' => $hareketId,
        'yeni_bakiye' => $yeniBakiye
    ], 'Gelir eklendi', 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
