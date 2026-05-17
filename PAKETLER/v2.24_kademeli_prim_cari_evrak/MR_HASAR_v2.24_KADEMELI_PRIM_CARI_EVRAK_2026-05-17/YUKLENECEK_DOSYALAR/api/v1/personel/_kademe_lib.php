<?php
/**
 * v2.24 — KADEMELİ PRİM HESAP HELPER
 * Mutabık kalınan formül: PARÇALI (vergi gibi)
 *
 * Örnek:
 *   count = 25 dosya
 *   kademeler = [{min:0,max:10,birim:400},{min:11,max:25,birim:600},...]
 *   → İlk 10 × 400 = 4.000
 *   → Sonraki 15 × 600 = 9.000
 *   → Toplam = 13.000
 *
 * Kullanım:
 *   $tutar = parcali_kademe_hesap($count, $kademeJsonArray);
 *   $hak  = personel_donem_hakedis($db, $personelId, 'YYYY-MM');
 */

function parcali_kademe_hesap(int $count, $kademeler): float {
    if ($count <= 0 || !is_array($kademeler) || count($kademeler) === 0) return 0.0;
    $tutar = 0.0;
    foreach ($kademeler as $k) {
        if (!is_array($k)) continue;
        $min   = (int)($k['min']   ?? 0);
        $max   = (int)($k['max']   ?? 0);
        $birim = (float)($k['birim'] ?? 0);
        if ($count < $min || $max < $min) continue;
        $bu_kademe = min($count, $max) - $min + 1;
        if ($bu_kademe > 0) $tutar += $bu_kademe * $birim;
    }
    return $tutar;
}

/**
 * Bir personelin AKTİF kazanç modelini döndürür (yoksa null).
 */
function personel_aktif_model(PDO $db, int $personelId): ?array {
    $stmt = $db->prepare('
        SELECT * FROM personel_kazanc_modelleri
        WHERE personel_id = ? AND aktif = 1
          AND (gecerlilik_bitis IS NULL OR gecerlilik_bitis >= CURDATE())
        ORDER BY gecerlilik_baslangic DESC, id DESC LIMIT 1
    ');
    $stmt->execute([$personelId]);
    $m = $stmt->fetch(PDO::FETCH_ASSOC);
    return $m ?: null;
}

/**
 * Bir personelin BELİRLİ DÖNEM için hakediş özetini hesaplar.
 * REAL-TIME: personel_prim_kayitlari + aktif kazanç modeli üzerinden.
 *
 * Dönüş:
 * [
 *   'maas' => 12000,
 *   'adk_sayisi' => 8, 'bh_sayisi' => 3,
 *   'adk_prim'  => 4000, 'bh_prim' => 6000,
 *   'toplam_prim' => 10000, 'toplam_hakedis' => 22000,
 *   'model_tipi' => 'kademeli_ofis',
 *   'dosyalar' => [ {id, dosya_no, dosya_turu, durum, acilis_tarihi, asama, magdur}, ... ]
 * ]
 */
function personel_donem_hakedis(PDO $db, int $personelId, string $donem): array {
    $model = personel_aktif_model($db, $personelId);
    $maas  = (float)($model['sabit_maas'] ?? 0);

    /* O döneme ait BEKLİYOR + SAYILDI primleri çek (iptal hariç) */
    $stmt = $db->prepare('
        SELECT pk.id AS kayit_id, pk.dosya_id, pk.dosya_no, pk.dosya_turu,
               pk.durum, pk.created_at AS prim_created,
               d.acilis_tarihi, d.asama, d.magdur, d.kaza_il
        FROM personel_prim_kayitlari pk
        LEFT JOIN dosyalar d ON d.id = pk.dosya_id
        WHERE pk.personel_id = ? AND pk.donem = ?
          AND pk.durum IN ("bekliyor","sayildi")
        ORDER BY pk.created_at ASC
    ');
    $stmt->execute([$personelId, $donem]);
    $kayitlar = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    $adkDosyalar = []; $bhDosyalar = [];
    foreach ($kayitlar as $k) {
        if (strtoupper((string)$k['dosya_turu']) === 'BH') $bhDosyalar[] = $k;
        else                                                $adkDosyalar[] = $k;
    }
    $adkSayisi = count($adkDosyalar);
    $bhSayisi  = count($bhDosyalar);

    $adkPrim = 0.0; $bhPrim = 0.0;
    $modelTipi = $model['model_tipi'] ?? 'sabit';

    if ($modelTipi === 'kademeli_ofis' && !empty($model['ofis_kota_json'])) {
        $ofis = json_decode($model['ofis_kota_json'], true) ?: [];
        $adkPrim = parcali_kademe_hesap($adkSayisi, $ofis['adk_kademe'] ?? []);
        $bhPrim  = parcali_kademe_hesap($bhSayisi,  $ofis['bh_kademe']  ?? []);
    } elseif ($modelTipi === 'kademeli_saha' && !empty($model['saha_kademe_json'])) {
        $saha = json_decode($model['saha_kademe_json'], true) ?: [];
        $toplamSayi = $adkSayisi + $bhSayisi;
        $toplamPrim = parcali_kademe_hesap($toplamSayi, $saha);
        /* Saha modeli ADK/BH ayırmaz → toplam prim adk'ya yazılır görüntüleme için */
        $adkPrim = $toplamPrim; $bhPrim = 0.0;
    } elseif ($modelTipi === 'sabit_prim') {
        $adkPrim = $adkSayisi * (float)($model['prim_adk'] ?? 0);
        $bhPrim  = $bhSayisi  * (float)($model['prim_bh']  ?? 0);
    } else {
        /* sabit veya model yok → eski personel kolonlarına fallback */
        $p = $db->prepare('SELECT maas, prim_adk, prim_bh FROM personel WHERE id = ?');
        $p->execute([$personelId]);
        $pp = $p->fetch(PDO::FETCH_ASSOC) ?: [];
        if (!$model) $maas = (float)($pp['maas'] ?? 0);
        $adkPrim = $adkSayisi * (float)($pp['prim_adk'] ?? 0);
        $bhPrim  = $bhSayisi  * (float)($pp['prim_bh']  ?? 0);
    }

    $toplamPrim = $adkPrim + $bhPrim;
    return [
        'donem'           => $donem,
        'model_tipi'      => $modelTipi,
        'maas'            => $maas,
        'adk_sayisi'      => $adkSayisi,
        'bh_sayisi'       => $bhSayisi,
        'adk_prim'        => round($adkPrim, 2),
        'bh_prim'         => round($bhPrim, 2),
        'toplam_prim'     => round($toplamPrim, 2),
        'toplam_hakedis'  => round($maas + $toplamPrim, 2),
        'kayitlar'        => $kayitlar,
        'adk_dosyalar'    => $adkDosyalar,
        'bh_dosyalar'     => $bhDosyalar,
    ];
}

/**
 * Bir personelin TÜM dönemlerinin cari özetini döndürür (REAL-TIME).
 */
function personel_cari_ozet(PDO $db, int $personelId): array {
    $stmt = $db->prepare('
        SELECT DISTINCT donem FROM personel_prim_kayitlari
        WHERE personel_id = ? AND durum IN ("bekliyor","sayildi")
        ORDER BY donem DESC
    ');
    $stmt->execute([$personelId]);
    $donemler = array_column($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], 'donem');

    /* Eğer hiç prim kaydı yoksa, en azından bugünün ayını ekle (boş maaş için) */
    if (empty($donemler)) $donemler[] = date('Y-m');

    $detaylar = [];
    $toplamHak = 0.0;
    foreach ($donemler as $d) {
        $h = personel_donem_hakedis($db, $personelId, $d);
        $detaylar[] = $h;
        $toplamHak += (float)$h['toplam_hakedis'];
    }

    /* Toplam ödemeler */
    $stmt = $db->prepare('SELECT IFNULL(SUM(tutar),0) FROM personel_odemeler WHERE personel_id = ?');
    $stmt->execute([$personelId]);
    $toplamOdenen = (float)$stmt->fetchColumn();

    return [
        'donemler'        => $detaylar,
        'genel_hakedis'   => round($toplamHak, 2),
        'genel_odenen'    => round($toplamOdenen, 2),
        'genel_bakiye'    => round($toplamHak - $toplamOdenen, 2),
    ];
}
