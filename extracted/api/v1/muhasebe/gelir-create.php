<?php
/**
 * POST /api/v1/muhasebe/gelir-create.php
 * Yeni gelir kaydı oluştur
 * Body: { "gelir_turu": "...", "tutar": 5000, "kasa_id": 1, "dosya_id": null, "aciklama": "...",
 *         "fatura_no": "...", "fatura_tarihi": "...", "tahsilat_durumu": "bekliyor", "tahsilat_tarihi": null }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['gelir_turu', 'tutar', 'kasa_id']);

$db = getDB();
$gelirTuru = clean($body['gelir_turu']);
$tutar = (float)$body['tutar'];
$kasaId = (int)$body['kasa_id'];
$dosyaId = !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null;
$aciklama = clean($body['aciklama'] ?? '');
$faturaNo = clean($body['fatura_no'] ?? '');
$faturaTarihi = !empty($body['fatura_tarihi']) ? clean($body['fatura_tarihi']) : null;
$tahsilatDurumu = clean($body['tahsilat_durumu'] ?? 'bekliyor');
$tahsilatTarihi = !empty($body['tahsilat_tarihi']) ? clean($body['tahsilat_tarihi']) : null;

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);

// Kasa kontrolü
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
$stmt->execute([$kasaId]);
$kasa = $stmt->fetch();
if (!$kasa) json_error('Kasa bulunamadı', 404);

// Dosya kontrolü
if ($dosyaId) {
    $stmt = $db->prepare('SELECT id FROM dosyalar WHERE id = ?');
    $stmt->execute([$dosyaId]);
    if (!$stmt->fetch()) json_error('Dosya bulunamadı', 404);
}

$db->beginTransaction();
try {
    // Gelir kaydı oluştur
    $stmt = $db->prepare('INSERT INTO gelirler (dosya_id, gelir_turu, tutar, kasa_id, aciklama, fatura_no, fatura_tarihi, tahsilat_durumu, tahsilat_tarihi, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $dosyaId,
        $gelirTuru,
        $tutar,
        $kasaId,
        $aciklama,
        $faturaNo,
        $faturaTarihi,
        $tahsilatDurumu,
        $tahsilatTarihi,
        $user['id']
    ]);
    $gelirId = (int)$db->lastInsertId();

    // Tahsil edildiyse kasa bakiyesini güncelle
    if ($tahsilatDurumu === 'tahsil_edildi') {
        $yeniBakiye = $kasa['bakiye'] + $tutar;

        $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
        $stmt->execute([$yeniBakiye, $kasaId]);

        // Kasa hareketi kaydet
        $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, dosya_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $kasaId,
            $dosyaId,
            'gelir',
            $tutar,
            $yeniBakiye,
            "Gelir: $gelirTuru - $aciklama",
            $user['id']
        ]);
    }

    $db->commit();

    log_action($user['id'], 'gelir_olustur', "Gelir: $gelirTuru, Tutar: $tutar ₺, Durum: $tahsilatDurumu", 'gelirler', $gelirId);

    json_success(['id' => $gelirId], 'Gelir kaydı oluşturuldu', 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
