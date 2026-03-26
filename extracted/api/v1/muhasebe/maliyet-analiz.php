<?php
/**
 * GET /api/v1/muhasebe/maliyet-analiz.php
 * Maliyet analizi
 * Params: dosya_id (opsiyonel), baslangic, bitis
 * - dosya_id varsa: o dosyanın gelir/gider/masraf/komisyon dökümü
 * - dosya_id yoksa: en kârlı dosyalar listesi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

$dosyaId = (int)($_GET['dosya_id'] ?? 0);
$baslangic = clean($_GET['baslangic'] ?? '');
$bitis = clean($_GET['bitis'] ?? '');

if ($dosyaId) {
    // ═══════════════════════════════════════════
    // TEK DOSYA ANALİZİ
    // ═══════════════════════════════════════════
    $stmt = $db->prepare('SELECT id, dosya_no, dosya_turu, asama, sigorta_sirket, kaza_tarihi FROM dosyalar WHERE id = ?');
    $stmt->execute([$dosyaId]);
    $dosya = $stmt->fetch();
    if (!$dosya) json_error('Dosya bulunamadı', 404);

    // Gelirler
    $stmt = $db->prepare('SELECT COALESCE(SUM(tutar), 0) as toplam FROM gelirler WHERE dosya_id = ? AND tahsilat_durumu = \'tahsil_edildi\' AND (gelir_turu IS NULL OR gelir_turu NOT LIKE \'%ORTAK KASA%\')');
    $stmt->execute([$dosyaId]);
    $toplamGelir = (float)$stmt->fetch()['toplam'];

    $stmt = $db->prepare('SELECT gelir_turu, COUNT(*) as adet, SUM(tutar) as toplam FROM gelirler WHERE dosya_id = ? GROUP BY gelir_turu');
    $stmt->execute([$dosyaId]);
    $gelirDetay = $stmt->fetchAll();

    // Giderler
    $stmt = $db->prepare('SELECT COALESCE(SUM(tutar), 0) as toplam FROM giderler WHERE dosya_id = ? AND (gider_turu IS NULL OR gider_turu NOT LIKE \'%ORTAK KASA%\')');
    $stmt->execute([$dosyaId]);
    $toplamGider = (float)$stmt->fetch()['toplam'];

    $stmt = $db->prepare('SELECT gider_turu, COUNT(*) as adet, SUM(tutar) as toplam FROM giderler WHERE dosya_id = ? GROUP BY gider_turu');
    $stmt->execute([$dosyaId]);
    $giderDetay = $stmt->fetchAll();

    // Masraflar
    $stmt = $db->prepare('SELECT COALESCE(SUM(tutar), 0) as toplam FROM masraflar WHERE dosya_id = ?');
    $stmt->execute([$dosyaId]);
    $toplamMasraf = (float)$stmt->fetch()['toplam'];

    $stmt = $db->prepare('SELECT masraf_kalemi, COUNT(*) as adet, SUM(tutar) as toplam FROM masraflar WHERE dosya_id = ? GROUP BY masraf_kalemi');
    $stmt->execute([$dosyaId]);
    $masrafDetay = $stmt->fetchAll();

    // Komisyonlar
    $stmt = $db->prepare('SELECT COALESCE(SUM(tutar), 0) as toplam FROM komisyonlar WHERE dosya_id = ?');
    $stmt->execute([$dosyaId]);
    $toplamKomisyon = (float)$stmt->fetch()['toplam'];

    $stmt = $db->prepare('SELECT komisyon_turu, COUNT(*) as adet, SUM(tutar) as toplam, SUM(CASE WHEN odendi = 1 THEN tutar ELSE 0 END) as odenen FROM komisyonlar WHERE dosya_id = ? GROUP BY komisyon_turu');
    $stmt->execute([$dosyaId]);
    $komisyonDetay = $stmt->fetchAll();

    $netKar = $toplamGelir - $toplamGider - $toplamMasraf - $toplamKomisyon;

    json_success([
        'dosya' => $dosya,
        'ozet' => [
            'toplam_gelir' => $toplamGelir,
            'toplam_gider' => $toplamGider,
            'toplam_masraf' => $toplamMasraf,
            'toplam_komisyon' => $toplamKomisyon,
            'net_kar' => $netKar
        ],
        'detay' => [
            'gelirler' => $gelirDetay,
            'giderler' => $giderDetay,
            'masraflar' => $masrafDetay,
            'komisyonlar' => $komisyonDetay
        ]
    ]);

} else {
    // ═══════════════════════════════════════════
    // TÜM DOSYALAR - KÂRLILIK SIRALAMASI
    // ═══════════════════════════════════════════
    $dateFilter = '';
    $dateParams = [];

    if ($baslangic !== '') {
        $dateFilter .= ' AND d.created_at >= ?';
        $dateParams[] = $baslangic;
    }
    if ($bitis !== '') {
        $dateFilter .= ' AND d.created_at <= ?';
        $dateParams[] = $bitis;
    }

    $sql = "SELECT
        d.id,
        d.dosya_no,
        d.dosya_turu,
        d.asama,
        d.sigorta_sirket,
        (COALESCE(gel.toplam_gelir, 0) + COALESCE(gel2.toplam_gelir_aciklama, 0)) as toplam_gelir,
        COALESCE(gid.toplam_gider, 0) as toplam_gider,
        COALESCE(mas.toplam_masraf, 0) as toplam_masraf,
        COALESCE(kom.toplam_komisyon, 0) as toplam_komisyon,
        ((COALESCE(gel.toplam_gelir, 0) + COALESCE(gel2.toplam_gelir_aciklama, 0)) - COALESCE(gid.toplam_gider, 0) - COALESCE(mas.toplam_masraf, 0) - COALESCE(kom.toplam_komisyon, 0)) as net_kar
    FROM dosyalar d
    LEFT JOIN (
        SELECT dosya_id, SUM(tutar) as toplam_gelir
        FROM gelirler WHERE tahsilat_durumu = 'tahsil_edildi' AND dosya_id IS NOT NULL AND (gelir_turu IS NULL OR gelir_turu NOT LIKE '%ORTAK KASA%')
        GROUP BY dosya_id
    ) gel ON gel.dosya_id = d.id
    LEFT JOIN (
        SELECT d2.id as dosya_id, SUM(g2.tutar) as toplam_gelir_aciklama
        FROM gelirler g2
        INNER JOIN dosyalar d2 ON g2.aciklama LIKE CONCAT('%', d2.dosya_no, '%')
        WHERE g2.dosya_id IS NULL AND g2.tahsilat_durumu = 'tahsil_edildi' AND (g2.gelir_turu IS NULL OR g2.gelir_turu NOT LIKE '%ORTAK KASA%')
        GROUP BY d2.id
    ) gel2 ON gel2.dosya_id = d.id
    LEFT JOIN (
        SELECT dosya_id, SUM(tutar) as toplam_gider
        FROM giderler WHERE (gider_turu IS NULL OR gider_turu NOT LIKE '%ORTAK KASA%')
        GROUP BY dosya_id
    ) gid ON gid.dosya_id = d.id
    LEFT JOIN (
        SELECT dosya_id, SUM(tutar) as toplam_masraf
        FROM masraflar
        GROUP BY dosya_id
    ) mas ON mas.dosya_id = d.id
    LEFT JOIN (
        SELECT dosya_id, SUM(tutar) as toplam_komisyon
        FROM komisyonlar
        GROUP BY dosya_id
    ) kom ON kom.dosya_id = d.id
    WHERE 1=1 $dateFilter
    HAVING (toplam_gelir > 0 OR toplam_gider > 0 OR toplam_masraf > 0 OR toplam_komisyon > 0)
    ORDER BY net_kar DESC
    LIMIT 50";

    $stmt = $db->prepare($sql);
    $stmt->execute($dateParams);
    $dosyalar = $stmt->fetchAll();

    // Genel toplamlar
    $toplamGelir = 0;
    $toplamGider = 0;
    $toplamMasraf = 0;
    $toplamKomisyon = 0;
    foreach ($dosyalar as $d) {
        $toplamGelir += (float)$d['toplam_gelir'];
        $toplamGider += (float)$d['toplam_gider'];
        $toplamMasraf += (float)$d['toplam_masraf'];
        $toplamKomisyon += (float)$d['toplam_komisyon'];
    }

    json_success([
        'dosyalar' => $dosyalar,
        'genel_toplam' => [
            'toplam_gelir' => $toplamGelir,
            'toplam_gider' => $toplamGider,
            'toplam_masraf' => $toplamMasraf,
            'toplam_komisyon' => $toplamKomisyon,
            'net_kar' => $toplamGelir - $toplamGider - $toplamMasraf - $toplamKomisyon
        ]
    ]);
}
