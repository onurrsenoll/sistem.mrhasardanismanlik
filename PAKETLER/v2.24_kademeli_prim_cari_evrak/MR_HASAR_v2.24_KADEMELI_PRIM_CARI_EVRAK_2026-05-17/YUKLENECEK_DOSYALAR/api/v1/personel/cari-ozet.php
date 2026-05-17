<?php
/**
 * GET /api/v1/personel/cari-ozet.php?personel_id=X
 *
 * v2.24 — REAL-TIME PERSONEL CARİ ÖZETİ
 * personel_prim_kayitlari + aktif kazanç modeli üzerinden PARÇALI KADEMELİ
 * hesaplama yapar. Cache yok — her çağrıda dosyalardan canlı toplar.
 *
 * Dönüş:
 *   {
 *     "personel":{...},
 *     "model":{...},                      // aktif kazanç modeli
 *     "donemler":[                        // her dönem için detay
 *       { "donem":"2026-05", "maas":..., "adk_sayisi":..., "bh_sayisi":...,
 *         "adk_prim":..., "bh_prim":..., "toplam_prim":..., "toplam_hakedis":...,
 *         "odenen":..., "bakiye":... }
 *     ],
 *     "genel_hakedis":..., "genel_odenen":..., "genel_bakiye":...,
 *     "son_odemeler":[...]
 *   }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/_kademe_lib.php';

setup_headers();
require_method('GET');
$user = auth_required();
$db = getDB();

$personelId = (int)($_GET['personel_id'] ?? 0);
if (!$personelId) json_error('personel_id zorunlu', 422);

$stmt = $db->prepare('SELECT * FROM personel WHERE id = ? LIMIT 1');
$stmt->execute([$personelId]);
$personel = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$personel) json_error('Personel bulunamadı', 404);

$model = personel_aktif_model($db, $personelId);

$ozet = personel_cari_ozet($db, $personelId);

/* Her dönem için ödenmiş tutarı çıkar → dönemsel bakiye */
foreach ($ozet['donemler'] as &$d) {
    $stmt = $db->prepare('SELECT IFNULL(SUM(tutar),0) FROM personel_odemeler WHERE personel_id = ? AND donem = ?');
    $stmt->execute([$personelId, $d['donem']]);
    $d['odenen'] = round((float)$stmt->fetchColumn(), 2);
    $d['bakiye'] = round((float)$d['toplam_hakedis'] - (float)$d['odenen'], 2);
}
unset($d);

/* Son 5 ödeme */
$stmt = $db->prepare('
    SELECT po.*, k.ad AS kasa_ad
    FROM personel_odemeler po
    LEFT JOIN kasalar k ON k.id = po.kasa_id
    WHERE po.personel_id = ?
    ORDER BY po.odeme_tarihi DESC, po.id DESC LIMIT 5
');
$stmt->execute([$personelId]);
$sonOdemeler = $stmt->fetchAll(PDO::FETCH_ASSOC);

json_success([
    'personel'      => $personel,
    'model'         => $model,
    'donemler'      => $ozet['donemler'],
    'genel_hakedis' => $ozet['genel_hakedis'],
    'genel_odenen'  => $ozet['genel_odenen'],
    'genel_bakiye'  => $ozet['genel_bakiye'],
    'son_odemeler'  => $sonOdemeler,
]);
