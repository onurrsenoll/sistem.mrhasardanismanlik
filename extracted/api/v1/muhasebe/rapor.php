<?php
/**
 * GET /api/v1/muhasebe/rapor.php?baslangic=2026-01-01&bitis=2026-12-31
 * Muhasebe özet raporu
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

$baslangic = clean($_GET['baslangic'] ?? date('Y-01-01'));
$bitis = clean($_GET['bitis'] ?? date('Y-12-31'));

// Toplam kasalar
$stmt = $db->query('SELECT SUM(bakiye) as toplam_bakiye, COUNT(*) as kasa_sayisi FROM kasalar WHERE aktif = 1');
$kasaOzet = $stmt->fetch();

// Dönem gelir
$stmt = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam FROM kasa_hareketleri WHERE islem_turu IN ('gelir', 'komisyon') AND DATE(created_at) BETWEEN ? AND ?");
$stmt->execute([$baslangic, $bitis]);
$toplamGelir = (float)$stmt->fetch()['toplam'];

// Dönem gider (masraflar)
$stmt = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam FROM masraflar WHERE islem_tarihi BETWEEN ? AND ?");
$stmt->execute([$baslangic, $bitis]);
$toplamGider = (float)$stmt->fetch()['toplam'];

// Masraf kalemleri dağılımı
$stmt = $db->prepare("SELECT masraf_kalemi, COUNT(*) as adet, SUM(tutar) as toplam FROM masraflar WHERE islem_tarihi BETWEEN ? AND ? GROUP BY masraf_kalemi ORDER BY toplam DESC");
$stmt->execute([$baslangic, $bitis]);
$masrafDagilim = $stmt->fetchAll();

// Kasa bazlı bakiyeler
$stmt = $db->query('SELECT id, ad, tip, bakiye FROM kasalar WHERE aktif = 1 ORDER BY id');
$kasalar = $stmt->fetchAll();

// Aylık gelir-gider trendi
$stmt = $db->prepare("SELECT DATE_FORMAT(created_at, '%Y-%m') as ay,
    SUM(CASE WHEN islem_turu IN ('gelir','komisyon') THEN tutar ELSE 0 END) as gelir,
    SUM(CASE WHEN islem_turu = 'masraf' THEN tutar ELSE 0 END) as gider
    FROM kasa_hareketleri
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY ay");
$stmt->execute([$baslangic, $bitis]);
$aylikTrend = $stmt->fetchAll();

json_success([
    'donem' => ['baslangic' => $baslangic, 'bitis' => $bitis],
    'ozet' => [
        'toplam_bakiye' => (float)$kasaOzet['toplam_bakiye'],
        'kasa_sayisi' => (int)$kasaOzet['kasa_sayisi'],
        'donem_gelir' => $toplamGelir,
        'donem_gider' => $toplamGider,
        'donem_kar' => $toplamGelir - $toplamGider
    ],
    'kasalar' => $kasalar,
    'masraf_dagilim' => $masrafDagilim,
    'aylik_trend' => $aylikTrend
]);
