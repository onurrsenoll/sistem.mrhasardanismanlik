<?php
/**
 * GET /api/v1/muhasebe/kapanis-rapor.php?baslangic=2026-01-01&bitis=2026-01-31&avukat_id=5
 * Kapanış raporu: Belirli dönemde kapanan dosyaların detaylı finansal raporu
 * Avukat bazlı ve genel görünüm destekler
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

$baslangic = clean($_GET['baslangic'] ?? date('Y-m-01'));
$bitis = clean($_GET['bitis'] ?? date('Y-m-t'));
$avukatId = (int)($_GET['avukat_id'] ?? 0);

// Kapanan dosyaları çek (asama KAPANDI veya ÖDEME ALINDI içeren)
$sql = "SELECT d.id, d.dosya_no, d.dosya_turu, d.asama, d.ortak_id, d.avukat_id, d.paydas_id,
    COALESCE(d.kapanma_tarihi, d.updated_at) as kapanma_tarihi,
    COALESCE(m.ad_soyad, d.magdur_adi, '') as muvekkil_adi
    FROM dosyalar d
    LEFT JOIN magdurlar m ON m.dosya_id = d.id
    WHERE (d.asama LIKE '%KAPANDI%' OR d.asama LIKE '%ÖDEME ALINDI%' OR d.asama LIKE '%KAPANIŞ%')
    AND DATE(COALESCE(d.kapanma_tarihi, d.updated_at)) BETWEEN ? AND ?";
$params = [$baslangic, $bitis];

if ($avukatId > 0) {
    $sql .= " AND (d.ortak_id = ? OR d.avukat_id = ?)";
    $params[] = $avukatId;
    $params[] = $avukatId;
}

$sql .= " ORDER BY d.updated_at DESC";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$dosyalar = $stmt->fetchAll();

// Her dosya için masraf + gelir hesapla
$dosyaDetaylari = [];
$avukatGruplari = [];

foreach ($dosyalar as &$d) {
    $did = (int)$d['id'];

    // Masraflar toplamı
    $stmtM = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam_masraf FROM masraflar WHERE dosya_id = ?");
    $stmtM->execute([$did]);
    $d['toplam_masraf'] = (float)$stmtM->fetchColumn();

    // Gelirler (tahsilat)
    try {
        $stmtG = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam_gelir, COALESCE(SUM(CASE WHEN tahsilat_durumu = 'tahsil_edildi' THEN tutar ELSE 0 END), 0) as tahsil_edilen FROM gelirler WHERE dosya_id = ?");
        $stmtG->execute([$did]);
        $gelir = $stmtG->fetch();
        $d['toplam_gelir'] = (float)($gelir['toplam_gelir'] ?? 0);
        $d['tahsil_edilen'] = (float)($gelir['tahsil_edilen'] ?? 0);
    } catch (\Exception $e) {
        $d['toplam_gelir'] = 0;
        $d['tahsil_edilen'] = 0;
    }

    // Net kar ve %50 paylaşım
    $d['net_kar'] = $d['tahsil_edilen'] - $d['toplam_masraf'];
    $d['benim_payim'] = round($d['net_kar'] * 0.5, 2);
    $d['avukat_payi'] = round($d['net_kar'] * 0.5, 2);

    // Avukat/Ortak adını bul
    $avukatAdi = 'BELİRSİZ';
    $gruplama_id = 0;
    if (!empty($d['ortak_id'])) {
        $gruplama_id = (int)$d['ortak_id'];
        $stmtO = $db->prepare("SELECT ad_soyad, firma FROM ortaklar WHERE id = ?");
        $stmtO->execute([$d['ortak_id']]);
        $ortak = $stmtO->fetch();
        if ($ortak) $avukatAdi = $ortak['ad_soyad'] . ($ortak['firma'] ? ' (' . $ortak['firma'] . ')' : '');
    } elseif (!empty($d['avukat_id'])) {
        $gruplama_id = (int)$d['avukat_id'];
        $stmtU = $db->prepare("SELECT ad_soyad FROM users WHERE id = ?");
        $stmtU->execute([$d['avukat_id']]);
        $avukatAdi = $stmtU->fetchColumn() ?: 'BELİRSİZ';
    }
    $d['avukat_adi'] = $avukatAdi;

    // Yönlendiren ücreti (masraflar içinden)
    $stmtYU = $db->prepare("SELECT COALESCE(SUM(tutar), 0) FROM masraflar WHERE dosya_id = ? AND masraf_kalemi = 'YÖNLENDİREN ÜCRETİ'");
    $stmtYU->execute([$did]);
    $d['yonlendiren_ucret'] = (float)$stmtYU->fetchColumn();

    // Avukat gruplama
    $gKey = $gruplama_id ?: 'diger';
    if (!isset($avukatGruplari[$gKey])) {
        $avukatGruplari[$gKey] = [
            'avukat_id' => $gruplama_id,
            'avukat_adi' => $avukatAdi,
            'dosya_sayisi' => 0,
            'toplam_tahsilat' => 0,
            'toplam_masraf' => 0,
            'toplam_yonlendiren' => 0,
            'toplam_net_kar' => 0,
            'toplam_benim_payim' => 0,
            'toplam_avukat_payi' => 0,
            'dosyalar' => []
        ];
    }
    $avukatGruplari[$gKey]['dosya_sayisi']++;
    $avukatGruplari[$gKey]['toplam_tahsilat'] += $d['tahsil_edilen'];
    $avukatGruplari[$gKey]['toplam_masraf'] += $d['toplam_masraf'];
    $avukatGruplari[$gKey]['toplam_yonlendiren'] += $d['yonlendiren_ucret'];
    $avukatGruplari[$gKey]['toplam_net_kar'] += $d['net_kar'];
    $avukatGruplari[$gKey]['toplam_benim_payim'] += $d['benim_payim'];
    $avukatGruplari[$gKey]['toplam_avukat_payi'] += $d['avukat_payi'];
    $avukatGruplari[$gKey]['dosyalar'][] = [
        'dosya_no' => $d['dosya_no'],
        'dosya_turu' => $d['dosya_turu'],
        'muvekkil' => $d['muvekkil_adi'],
        'asama' => $d['asama'],
        'kapanma_tarihi' => $d['kapanma_tarihi'],
        'tahsilat' => $d['tahsil_edilen'],
        'masraf' => $d['toplam_masraf'],
        'yonlendiren_ucret' => $d['yonlendiren_ucret'],
        'net_kar' => $d['net_kar'],
        'benim_payim' => $d['benim_payim'],
        'avukat_payi' => $d['avukat_payi']
    ];
}

// Genel toplamlar
$genelToplam = [
    'dosya_sayisi' => count($dosyalar),
    'toplam_tahsilat' => 0,
    'toplam_masraf' => 0,
    'toplam_yonlendiren' => 0,
    'toplam_net_kar' => 0,
    'toplam_benim_payim' => 0,
    'toplam_avukat_payi' => 0
];
foreach ($avukatGruplari as $g) {
    $genelToplam['toplam_tahsilat'] += $g['toplam_tahsilat'];
    $genelToplam['toplam_masraf'] += $g['toplam_masraf'];
    $genelToplam['toplam_yonlendiren'] += $g['toplam_yonlendiren'];
    $genelToplam['toplam_net_kar'] += $g['toplam_net_kar'];
    $genelToplam['toplam_benim_payim'] += $g['toplam_benim_payim'];
    $genelToplam['toplam_avukat_payi'] += $g['toplam_avukat_payi'];
}

// Önceki dönem devir hesabı (kapanmış ama henüz ödenmemiş masraflar)
$devirToplam = 0;
try {
    $stmtD = $db->prepare("SELECT COALESCE(SUM(m.tutar), 0) FROM masraflar m
        INNER JOIN dosyalar d ON d.id = m.dosya_id
        WHERE m.odeme_durumu = 'odenmedi'
        AND (d.asama LIKE '%KAPANDI%' OR d.asama LIKE '%ÖDEME ALINDI%' OR d.asama LIKE '%KAPANIŞ%')
        AND DATE(d.updated_at) < ?");
    $stmtD->execute([$baslangic]);
    $devirToplam = (float)$stmtD->fetchColumn();
} catch (\Exception $e) {}

json_success([
    'donem' => ['baslangic' => $baslangic, 'bitis' => $bitis],
    'genel_toplam' => $genelToplam,
    'onceki_donem_devir' => $devirToplam,
    'avukat_gruplari' => array_values($avukatGruplari)
]);
