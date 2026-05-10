<?php
/**
 * GET /api/v1/police/rapor.php?baslangic=2026-01-01&bitis=2026-12-31
 * Poliçe rapor ve analiz
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(); // v2.11: rol kısıtı kaldırıldı, yetki matrisi tek otorite
$db = getDB();

$baslangic = clean($_GET['baslangic'] ?? date('Y-01-01'));
$bitis = clean($_GET['bitis'] ?? date('Y-12-31'));

// GENEL ÖZET
$stmt = $db->prepare("SELECT
    COUNT(*) as toplam_police,
    SUM(CASE WHEN durum = 'aktif' THEN 1 ELSE 0 END) as aktif_police,
    COALESCE(SUM(brut_prim), 0) as toplam_prim,
    COALESCE(SUM(net_prim), 0) as toplam_net_prim,
    COALESCE(SUM(komisyon_tutari), 0) as toplam_komisyon,
    COALESCE(SUM(tahsil_edilen), 0) as tahsil_edilen,
    COALESCE(SUM(brut_prim - tahsil_edilen), 0) as bekleyen_tahsilat,
    COALESCE(SUM(
        CASE WHEN brut_prim > 0
        THEN komisyon_tutari * LEAST(tahsil_edilen / brut_prim, 1)
        ELSE 0 END
    ), 0) as tahsil_edilen_komisyon
    FROM policeler
    WHERE tanzim_tarihi BETWEEN ? AND ?");
$stmt->execute([$baslangic, $bitis]);
$genelOzet = $stmt->fetch();

// Cari bakiye hesapla (toplam komisyon - tahsil edilen oranindaki komisyon)
$genelOzet['cari_bakiye'] = (float)$genelOzet['toplam_komisyon'] - (float)$genelOzet['tahsil_edilen_komisyon'];

// Sayisal degerleri duzelt
$genelOzet['toplam_police'] = (int)$genelOzet['toplam_police'];
$genelOzet['aktif_police'] = (int)$genelOzet['aktif_police'];
$genelOzet['toplam_prim'] = (float)$genelOzet['toplam_prim'];
$genelOzet['toplam_net_prim'] = (float)$genelOzet['toplam_net_prim'];
$genelOzet['toplam_komisyon'] = (float)$genelOzet['toplam_komisyon'];
$genelOzet['tahsil_edilen'] = (float)$genelOzet['tahsil_edilen'];
$genelOzet['bekleyen_tahsilat'] = (float)$genelOzet['bekleyen_tahsilat'];
$genelOzet['tahsil_edilen_komisyon'] = (float)$genelOzet['tahsil_edilen_komisyon'];

// BRANŞ ANALİZİ
$stmt = $db->prepare("SELECT
    brans,
    COUNT(*) as police_sayisi,
    COALESCE(SUM(brut_prim), 0) as toplam_prim,
    COALESCE(SUM(komisyon_tutari), 0) as toplam_komisyon
    FROM policeler
    WHERE tanzim_tarihi BETWEEN ? AND ?
    GROUP BY brans
    ORDER BY toplam_prim DESC");
$stmt->execute([$baslangic, $bitis]);
$bransAnaliz = $stmt->fetchAll();

// ŞİRKET ANALİZİ
$stmt = $db->prepare("SELECT
    sigorta_sirketi,
    COUNT(*) as police_sayisi,
    COALESCE(SUM(brut_prim), 0) as toplam_prim,
    COALESCE(SUM(komisyon_tutari), 0) as toplam_komisyon
    FROM policeler
    WHERE tanzim_tarihi BETWEEN ? AND ?
    GROUP BY sigorta_sirketi
    ORDER BY toplam_prim DESC");
$stmt->execute([$baslangic, $bitis]);
$sirketAnaliz = $stmt->fetchAll();

// AYLIK ÜRETİM
$stmt = $db->prepare("SELECT
    DATE_FORMAT(tanzim_tarihi, '%Y-%m') as donem,
    COUNT(*) as police_sayisi,
    COALESCE(SUM(brut_prim), 0) as toplam_prim,
    COALESCE(SUM(komisyon_tutari), 0) as toplam_komisyon
    FROM policeler
    WHERE tanzim_tarihi BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(tanzim_tarihi, '%Y-%m')
    ORDER BY donem ASC");
$stmt->execute([$baslangic, $bitis]);
$aylikUretim = $stmt->fetchAll();

// YENİLEME BEKLEYEN POLİÇELER (60 gün içinde bitecekler)
$stmt = $db->query("SELECT id, police_no, musteri_adi, musteri_telefon, sigorta_sirketi, brans, plaka, bitis_tarihi, brut_prim,
    DATEDIFF(bitis_tarihi, CURDATE()) as kalan_gun
    FROM policeler
    WHERE durum = 'aktif'
    AND bitis_tarihi BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)
    ORDER BY bitis_tarihi ASC");
$yenilemeBekleyen = $stmt->fetchAll();

// TAHSİLAT DURUMU ÖZETİ
$stmt = $db->prepare("SELECT
    tahsilat_durumu,
    COUNT(*) as adet,
    COALESCE(SUM(brut_prim), 0) as toplam_prim
    FROM policeler
    WHERE tanzim_tarihi BETWEEN ? AND ?
    GROUP BY tahsilat_durumu");
$stmt->execute([$baslangic, $bitis]);
$tahsilatDurum = $stmt->fetchAll();

json_success([
    'donem' => ['baslangic' => $baslangic, 'bitis' => $bitis],
    'genel_ozet' => $genelOzet,
    'brans_analiz' => $bransAnaliz,
    'sirket_analiz' => $sirketAnaliz,
    'aylik_uretim' => $aylikUretim,
    'yenileme_bekleyen' => $yenilemeBekleyen,
    'tahsilat_durum' => $tahsilatDurum
]);
