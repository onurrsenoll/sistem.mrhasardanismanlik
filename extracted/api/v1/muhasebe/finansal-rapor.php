<?php
/**
 * GET /api/v1/muhasebe/finansal-rapor.php
 * Kapsamlı finansal rapor
 * Params: baslangic, bitis
 * Returns: gelir özet, gider özet, komisyon özet, kasa bakiyeleri, aylık trendler, kaynak bazlı analiz
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

$baslangic = clean($_GET['baslangic'] ?? date('Y-01-01'));
$bitis = clean($_GET['bitis'] ?? date('Y-12-31'));

// ═══════════════════════════════════════════
// 1. GELİR ÖZETİ (türe göre)
// ═══════════════════════════════════════════
$stmt = $db->prepare("SELECT
    gelir_turu,
    COUNT(*) as adet,
    SUM(tutar) as toplam,
    SUM(CASE WHEN tahsilat_durumu = 'tahsil_edildi' THEN tutar ELSE 0 END) as tahsil_edilen,
    SUM(CASE WHEN tahsilat_durumu = 'beklemede' THEN tutar ELSE 0 END) as bekleyen
    FROM gelirler
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY gelir_turu
    ORDER BY toplam DESC");
$stmt->execute([$baslangic, $bitis]);
$gelirOzet = $stmt->fetchAll();

$stmt = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam FROM gelirler WHERE DATE(created_at) BETWEEN ? AND ? AND tahsilat_durumu = 'tahsil_edildi' AND (gelir_turu IS NULL OR gelir_turu NOT LIKE '%ORTAK KASA%')");
$stmt->execute([$baslangic, $bitis]);
$toplamGelir = (float)$stmt->fetch()['toplam'];

// ═══════════════════════════════════════════
// 2. GİDER ÖZETİ (türe göre)
// ═══════════════════════════════════════════
$stmt = $db->prepare("SELECT
    gider_turu,
    COUNT(*) as adet,
    SUM(tutar) as toplam
    FROM giderler
    WHERE islem_tarihi BETWEEN ? AND ?
    GROUP BY gider_turu
    ORDER BY toplam DESC");
$stmt->execute([$baslangic, $bitis]);
$giderOzet = $stmt->fetchAll();

$stmt = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam FROM giderler WHERE islem_tarihi BETWEEN ? AND ? AND (gider_turu IS NULL OR gider_turu NOT LIKE '%ORTAK KASA%')");
$stmt->execute([$baslangic, $bitis]);
$toplamGider = (float)$stmt->fetch()['toplam'];

// ═══════════════════════════════════════════
// 3. MASRAF ÖZETİ (kalem bazlı)
// ═══════════════════════════════════════════
$stmt = $db->prepare("SELECT
    masraf_kalemi,
    COUNT(*) as adet,
    SUM(tutar) as toplam
    FROM masraflar
    WHERE islem_tarihi BETWEEN ? AND ?
    GROUP BY masraf_kalemi
    ORDER BY toplam DESC");
$stmt->execute([$baslangic, $bitis]);
$masrafOzet = $stmt->fetchAll();

$stmt = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam FROM masraflar WHERE islem_tarihi BETWEEN ? AND ?");
$stmt->execute([$baslangic, $bitis]);
$toplamMasraf = (float)$stmt->fetch()['toplam'];

// ═══════════════════════════════════════════
// 4. KOMİSYON ÖZETİ
// ═══════════════════════════════════════════
$stmt = $db->prepare("SELECT
    komisyon_turu,
    COUNT(*) as adet,
    SUM(tutar) as toplam,
    SUM(CASE WHEN odendi = 1 THEN tutar ELSE 0 END) as odenen,
    SUM(CASE WHEN odendi = 0 THEN tutar ELSE 0 END) as bekleyen
    FROM komisyonlar
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY komisyon_turu
    ORDER BY toplam DESC");
$stmt->execute([$baslangic, $bitis]);
$komisyonOzet = $stmt->fetchAll();

$stmt = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam FROM komisyonlar WHERE DATE(created_at) BETWEEN ? AND ?");
$stmt->execute([$baslangic, $bitis]);
$toplamKomisyon = (float)$stmt->fetch()['toplam'];

// ═══════════════════════════════════════════
// 5. KASA BAKİYELERİ
// ═══════════════════════════════════════════
$stmt = $db->query('SELECT id, ad, tip, banka_adi, bakiye FROM kasalar WHERE aktif = 1 ORDER BY id');
$kasalar = $stmt->fetchAll();

$stmt = $db->query('SELECT SUM(bakiye) as toplam_bakiye FROM kasalar WHERE aktif = 1');
$toplamBakiye = (float)$stmt->fetch()['toplam_bakiye'];

// ═══════════════════════════════════════════
// 6. AYLIK TRENDLER
// ═══════════════════════════════════════════
$stmt = $db->prepare("SELECT
    DATE_FORMAT(created_at, '%Y-%m') as ay,
    SUM(CASE WHEN tahsilat_durumu = 'tahsil_edildi' THEN tutar ELSE 0 END) as gelir
    FROM gelirler
    WHERE DATE(created_at) BETWEEN ? AND ? AND (gelir_turu IS NULL OR gelir_turu NOT LIKE '%ORTAK KASA%')
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY ay");
$stmt->execute([$baslangic, $bitis]);
$aylikGelir = [];
foreach ($stmt->fetchAll() as $row) {
    $aylikGelir[$row['ay']] = (float)$row['gelir'];
}

$stmt = $db->prepare("SELECT
    DATE_FORMAT(islem_tarihi, '%Y-%m') as ay,
    SUM(tutar) as gider
    FROM giderler
    WHERE islem_tarihi BETWEEN ? AND ? AND (gider_turu IS NULL OR gider_turu NOT LIKE '%ORTAK KASA%')
    GROUP BY DATE_FORMAT(islem_tarihi, '%Y-%m')
    ORDER BY ay");
$stmt->execute([$baslangic, $bitis]);
$aylikGider = [];
foreach ($stmt->fetchAll() as $row) {
    $aylikGider[$row['ay']] = (float)$row['gider'];
}

$stmt = $db->prepare("SELECT
    DATE_FORMAT(islem_tarihi, '%Y-%m') as ay,
    SUM(tutar) as masraf
    FROM masraflar
    WHERE islem_tarihi BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(islem_tarihi, '%Y-%m')
    ORDER BY ay");
$stmt->execute([$baslangic, $bitis]);
$aylikMasraf = [];
foreach ($stmt->fetchAll() as $row) {
    $aylikMasraf[$row['ay']] = (float)$row['masraf'];
}

// Aylık komisyon
$stmt = $db->prepare("SELECT
    DATE_FORMAT(created_at, '%Y-%m') as ay,
    SUM(tutar) as komisyon,
    SUM(CASE WHEN odendi = 1 THEN tutar ELSE 0 END) as komisyon_odenen,
    SUM(CASE WHEN odendi = 0 THEN tutar ELSE 0 END) as komisyon_bekleyen
    FROM komisyonlar
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY ay");
$stmt->execute([$baslangic, $bitis]);
$aylikKomisyon = [];
foreach ($stmt->fetchAll() as $row) {
    $aylikKomisyon[$row['ay']] = [
        'toplam' => (float)$row['komisyon'],
        'odenen' => (float)$row['komisyon_odenen'],
        'bekleyen' => (float)$row['komisyon_bekleyen']
    ];
}

// Aylık trendleri birleştir
$tumAylar = array_unique(array_merge(array_keys($aylikGelir), array_keys($aylikGider), array_keys($aylikMasraf), array_keys($aylikKomisyon)));
sort($tumAylar);

$aylikTrend = [];
foreach ($tumAylar as $ay) {
    $gelir = $aylikGelir[$ay] ?? 0;
    $gider = $aylikGider[$ay] ?? 0;
    $masraf = $aylikMasraf[$ay] ?? 0;
    $kom = $aylikKomisyon[$ay] ?? ['toplam' => 0, 'odenen' => 0, 'bekleyen' => 0];
    $aylikTrend[] = [
        'ay' => $ay,
        'gelir' => $gelir,
        'gider' => $gider,
        'masraf' => $masraf,
        'komisyon' => $kom['toplam'],
        'komisyon_odenen' => $kom['odenen'],
        'komisyon_bekleyen' => $kom['bekleyen'],
        'net' => $gelir - $gider - $masraf - $kom['toplam']
    ];
}

// ═══════════════════════════════════════════
// 7. KAYNAK BAZLI ANALİZ
// ═══════════════════════════════════════════
$stmt = $db->prepare("SELECT
    d.dosya_kaynagi,
    COUNT(DISTINCT d.id) as dosya_sayisi,
    COALESCE(SUM(gel.tutar), 0) as toplam_gelir
    FROM dosyalar d
    LEFT JOIN gelirler gel ON gel.dosya_id = d.id AND gel.tahsilat_durumu = 'tahsil_edildi'
    WHERE d.created_at BETWEEN ? AND ?
    GROUP BY d.dosya_kaynagi
    ORDER BY toplam_gelir DESC");
$stmt->execute([$baslangic, $bitis]);
$kaynakAnaliz = $stmt->fetchAll();

// ═══════════════════════════════════════════
// SONUÇ
// ═══════════════════════════════════════════
$netKar = $toplamGelir - $toplamGider - $toplamMasraf - $toplamKomisyon;

json_success([
    'donem' => ['baslangic' => $baslangic, 'bitis' => $bitis],
    'genel_ozet' => [
        'toplam_gelir' => $toplamGelir,
        'toplam_gider' => $toplamGider,
        'toplam_masraf' => $toplamMasraf,
        'toplam_komisyon' => $toplamKomisyon,
        'net_kar' => $netKar,
        'toplam_bakiye' => $toplamBakiye
    ],
    'gelir_ozet' => $gelirOzet,
    'gider_ozet' => $giderOzet,
    'masraf_ozet' => $masrafOzet,
    'komisyon_ozet' => $komisyonOzet,
    'kasalar' => $kasalar,
    'aylik_trend' => $aylikTrend,
    'kaynak_analiz' => $kaynakAnaliz
]);
