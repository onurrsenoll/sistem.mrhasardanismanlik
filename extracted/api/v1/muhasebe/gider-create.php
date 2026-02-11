<?php
/**
 * POST /api/v1/muhasebe/gider-create.php
 * Yeni gider kaydı oluştur
 * Body: { "gider_turu": "...", "tutar": 1000, "kasa_id": 1, "islem_tarihi": "2026-01-15",
 *         "dosya_id": null, "aciklama": "...", "belge_no": "..." }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();

// Frontend 'kategori' gönderir, backend 'gider_turu' bekler
if (!isset($body['gider_turu']) && isset($body['kategori'])) {
    $body['gider_turu'] = $body['kategori'];
}
// Frontend 'tarih' gönderir, backend 'islem_tarihi' bekler
if (!isset($body['islem_tarihi']) && isset($body['tarih'])) {
    $body['islem_tarihi'] = $body['tarih'];
}
if (empty($body['islem_tarihi'])) {
    $body['islem_tarihi'] = date('Y-m-d');
}
require_fields($body, ['gider_turu', 'tutar', 'kasa_id']);

$db = getDB();
$giderTuru = clean($body['gider_turu']);
$tutar = (float)$body['tutar'];
$kasaId = (int)$body['kasa_id'];
$islemTarihi = clean($body['islem_tarihi']);
$dosyaId = !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null;
$aciklama = clean($body['aciklama'] ?? '');
$belgeNo = clean($body['belge_no'] ?? '');

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);

// Kasa kontrolü
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$kasaId]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);

if ($kasa['bakiye'] < $tutar) {
    json_error("Yetersiz bakiye! {$kasa['ad']}: " . number_format($kasa['bakiye'], 2, ',', '.') . ' ₺', 422);
}

// Dosya kontrolü
if ($dosyaId) {
    $stmt = $db->prepare('SELECT id FROM dosyalar WHERE id = ?');
    $stmt->execute([$dosyaId]);
    if (!$stmt->fetch()) json_error('Dosya bulunamadı', 404);
}

$db->beginTransaction();
try {
    // Gider kaydı oluştur
    $stmt = $db->prepare('INSERT INTO giderler (dosya_id, gider_turu, tutar, kasa_id, aciklama, belge_no, islem_tarihi, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $dosyaId,
        $giderTuru,
        $tutar,
        $kasaId,
        $aciklama,
        $belgeNo,
        $islemTarihi,
        $user['id']
    ]);
    $giderId = (int)$db->lastInsertId();

    // Kasa bakiyesini düşür
    $yeniBakiye = $kasa['bakiye'] - $tutar;
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$yeniBakiye, $kasaId]);

    // Kasa hareketi kaydet
    $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $kasaId,
        $dosyaId,
        'gider',
        $tutar,
        $yeniBakiye,
        "Gider: $giderTuru - $aciklama",
        $user['id']
    ]);

    $db->commit();

    log_action($user['id'], 'gider_olustur', "Gider: $giderTuru, Tutar: $tutar ₺, Kasa: {$kasa['ad']}", 'giderler', $giderId);

    json_success([
        'id' => $giderId,
        'yeni_bakiye' => $yeniBakiye
    ], 'Gider kaydı oluşturuldu', 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
