<?php
/**
 * POST /api/v1/personel/hakedis-hesapla.php
 * Aylık hakediş hesapla ve kaydet
 * Body: {
 *   "personel_id": 1,
 *   "donem": "2026-02",
 *   "calisan_gun": 22,
 *   "dosya_sayisi": 15,
 *   "ek_prim": 0,
 *   "kesinti": 0,
 *   "notlar": ""
 * }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

ensure_prim_columns();

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['personel_id', 'donem']);

$db = getDB();

$personelId = (int)$body['personel_id'];
$donem = clean($body['donem']);

// Personel bilgilerini çek
$stmt = $db->prepare('SELECT * FROM personel WHERE id = ?');
$stmt->execute([$personelId]);
$personel = $stmt->fetch();
if (!$personel) json_error('PERSONEL BULUNAMADI', 404);

$primAdk = (float)($personel['prim_adk'] ?? $personel['prim_orani'] ?? 0);
$primBh = (float)($personel['prim_bh'] ?? 0);

// Dönem aralığında dosya sayısını hesapla (sorumlu olduğu dosyalar)
$donemBaslangic = $donem . '-01';
$donemBitis = date('Y-m-t', strtotime($donemBaslangic));

$calisanGun = isset($body['calisan_gun']) ? (int)$body['calisan_gun'] : 22;
$dosyaSayisi = isset($body['dosya_sayisi']) ? (int)$body['dosya_sayisi'] : 0;
$ekPrim = isset($body['ek_prim']) ? (float)$body['ek_prim'] : 0;
$kesinti = isset($body['kesinti']) ? (float)$body['kesinti'] : 0;

// Eğer dosya sayısı gönderilmediyse, o dönemde açılan dosya sayısına bak
if ($dosyaSayisi === 0 && $personel['user_id']) {
    $stmtAdk = $db->prepare('SELECT COUNT(*) as sayi FROM dosyalar WHERE (sorumlu_id = ? OR created_by = ?) AND dosya_turu = "ADK" AND acilis_tarihi BETWEEN ? AND ?');
    $stmtAdk->execute([$personel['user_id'], $personel['user_id'], $donemBaslangic, $donemBitis]);
    $adkSayisi = (int)$stmtAdk->fetch()['sayi'];

    $stmtBh = $db->prepare('SELECT COUNT(*) as sayi FROM dosyalar WHERE (sorumlu_id = ? OR created_by = ?) AND dosya_turu = "BH" AND acilis_tarihi BETWEEN ? AND ?');
    $stmtBh->execute([$personel['user_id'], $personel['user_id'], $donemBaslangic, $donemBitis]);
    $bhSayisi = (int)$stmtBh->fetch()['sayi'];

    $dosyaSayisi = $adkSayisi + $bhSayisi;
}

// HAKEDİŞ HESAPLA
$maas = (float)$personel['maas'];
$primOrani = (float)$personel['prim_orani'];

// Gün bazlı maaş hesaplama (aylık 30 gün üzerinden)
$gunlukMaas = $maas / 30;
$maasTutar = round($gunlukMaas * $calisanGun, 2);

// Prim hesaplama: dosya türüne göre ayrı prim oranı
if (isset($adkSayisi) && isset($bhSayisi)) {
    $primTutar = round($adkSayisi * $primAdk + $bhSayisi * $primBh, 2);
} else {
    $primTutar = round($dosyaSayisi * $primAdk, 2);
}

// Toplam hakediş
$toplamHakedis = round($maasTutar + $primTutar + $ekPrim - $kesinti, 2);

// Mevcut kayıt var mı kontrol et
$stmtCheck = $db->prepare('SELECT id FROM personel_hakedis WHERE personel_id = ? AND donem = ?');
$stmtCheck->execute([$personelId, $donem]);
$mevcut = $stmtCheck->fetch();

if ($mevcut) {
    // Güncelle
    $stmt = $db->prepare('UPDATE personel_hakedis SET calisan_gun = ?, dosya_sayisi = ?, prim_tutar = ?, ek_prim = ?, kesinti = ?, maas_tutar = ?, toplam_hakedis = ?, notlar = ? WHERE id = ?');
    $stmt->execute([
        $calisanGun, $dosyaSayisi, $primTutar, $ekPrim, $kesinti, $maasTutar, $toplamHakedis,
        clean($body['notlar'] ?? ''),
        $mevcut['id']
    ]);
    $hakedisId = (int)$mevcut['id'];
} else {
    // Yeni kayıt
    $stmt = $db->prepare('INSERT INTO personel_hakedis (personel_id, donem, calisan_gun, dosya_sayisi, prim_tutar, ek_prim, kesinti, maas_tutar, toplam_hakedis, notlar, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $personelId, $donem, $calisanGun, $dosyaSayisi, $primTutar, $ekPrim, $kesinti, $maasTutar, $toplamHakedis,
        clean($body['notlar'] ?? ''),
        $user['id']
    ]);
    $hakedisId = (int)$db->lastInsertId();
}

log_action($user['id'], 'hakedis_hesapla', "Hakediş hesaplandı: {$personel['ad_soyad']} - $donem - ₺$toplamHakedis", 'personel_hakedis', $hakedisId);

json_success([
    'id' => $hakedisId,
    'personel_id' => $personelId,
    'personel_adi' => $personel['ad_soyad'],
    'donem' => $donem,
    'calisan_gun' => $calisanGun,
    'dosya_sayisi' => $dosyaSayisi,
    'adk_sayisi' => $adkSayisi ?? null,
    'bh_sayisi' => $bhSayisi ?? null,
    'maas' => $maas,
    'maas_tutar' => $maasTutar,
    'prim_orani' => $primOrani,
    'prim_adk' => $primAdk,
    'prim_bh' => $primBh,
    'prim_tutar' => $primTutar,
    'ek_prim' => $ekPrim,
    'kesinti' => $kesinti,
    'toplam_hakedis' => $toplamHakedis
], 'HAKEDİŞ BAŞARIYLA HESAPLANDI');
