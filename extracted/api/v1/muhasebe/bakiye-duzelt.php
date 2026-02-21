<?php
/**
 * PUT /api/v1/muhasebe/bakiye-duzelt.php
 * KASA BAKİYESİNİ DÜZELT — SADECE ADMİN
 * Body: { "kasa_id": 1, "yeni_bakiye": 5000.00, "aciklama": "DÜZELTME NEDENİ" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['kasa_id', 'yeni_bakiye']);

$db = getDB();

$kasaId = (int)$body['kasa_id'];
$yeniBakiye = (float)str_replace(['.', ','], ['', '.'], strval($body['yeni_bakiye']));
$aciklama = clean($body['aciklama'] ?? 'MANUEL BAKİYE DÜZELTMESİ');

// Kasayı kontrol et
$stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ?');
$stmt->execute([$kasaId]);
$kasa = $stmt->fetch();

if (!$kasa) json_error('KASA BULUNAMADI', 404);

$eskiBakiye = (float)$kasa['bakiye'];
$fark = $yeniBakiye - $eskiBakiye;

if (abs($fark) < 0.01) {
    json_success(null, 'BAKİYE ZATEN AYNI DEĞERDEDİR');
    return;
}

$db->beginTransaction();
try {
    // Bakiyeyi güncelle
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$yeniBakiye, $kasaId]);

    // Düzeltme hareketi oluştur
    $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$kasaId, 'duzeltme', $fark, $yeniBakiye, $aciklama . ' (ESKİ: ' . number_format($eskiBakiye, 2) . ' ₺ → YENİ: ' . number_format($yeniBakiye, 2) . ' ₺)', $user['id']]);

    $db->commit();

    log_action($user['id'], 'bakiye_duzelt', $kasa['ad'] . ': ' . number_format($eskiBakiye, 2) . ' → ' . number_format($yeniBakiye, 2), 'kasalar', $kasaId);

    json_success([
        'kasa_id' => $kasaId,
        'eski_bakiye' => $eskiBakiye,
        'yeni_bakiye' => $yeniBakiye,
        'fark' => $fark
    ], 'BAKİYE BAŞARIYLA DÜZELTİLDİ');
} catch (Exception $e) {
    $db->rollBack();
    json_error('BAKİYE DÜZELTME HATASI: ' . $e->getMessage(), 500);
}
