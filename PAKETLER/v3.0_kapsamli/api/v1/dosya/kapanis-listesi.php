<?php
/**
 * GET /api/v1/dosya/kapanis-listesi.php?donem=YYYY-MM
 *      ?baslangic=YYYY-MM-DD&bitis=YYYY-MM-DD
 *      ?paydas_id=N&avukat_ortak_id=N
 *
 * Aylık mutabakat raporu için tüm kapanışları listeler.
 * Toplamları, mahsup zincirini, paydaş bazlı dökümü hesaplar.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman', 'personel']);
$db = getDB();

// Filtreler
$donem = clean($_GET['donem'] ?? '');           // 2026-05
$baslangic = clean($_GET['baslangic'] ?? '');   // 2026-05-01
$bitis = clean($_GET['bitis'] ?? '');           // 2026-05-31
$paydasId = !empty($_GET['paydas_id']) ? (int)$_GET['paydas_id'] : null;
$avukatOrtakId = !empty($_GET['avukat_ortak_id']) ? (int)$_GET['avukat_ortak_id'] : null;

// Dönem öncelikli
if ($donem && preg_match('/^\d{4}-\d{2}$/', $donem)) {
    $baslangic = $donem . '-01';
    $bitis = date('Y-m-t', strtotime($baslangic));
}
if (!$baslangic) $baslangic = date('Y-m-01');
if (!$bitis) $bitis = date('Y-m-t');

$where = ['k.kapatma_tarihi BETWEEN ? AND ?'];
$params = [$baslangic, $bitis];

if ($paydasId) {
    $where[] = 'k.yonlendiren_paydas_id = ?';
    $params[] = $paydasId;
}
if ($avukatOrtakId) {
    $where[] = 'k.avukat_ortak_id = ?';
    $params[] = $avukatOrtakId;
}

try {
    $sql = "SELECT k.*, d.dosya_no, d.dosya_turu, d.sigorta_sirket,
                   m.ad_soyad as magdur_adi,
                   o.ad_soyad as avukat_adi, o.firma as avukat_firma,
                   p.ad as yonlendiren_paydas_adi,
                   u.ad_soyad as kapatan_adi
            FROM dosya_kapanis_kayitlari k
            INNER JOIN dosyalar d ON d.id = k.dosya_id
            LEFT JOIN magdurlar m ON m.dosya_id = k.dosya_id
            LEFT JOIN ortaklar o ON o.id = k.avukat_ortak_id
            LEFT JOIN paydaslar p ON p.id = k.yonlendiren_paydas_id
            LEFT JOIN users u ON u.id = k.kapatan_kullanici_id
            WHERE " . implode(' AND ', $where) . "
            ORDER BY k.kapatma_tarihi DESC, k.id DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $kayitlar = $stmt->fetchAll();

    // Toplamlar
    $toplam = [
        'kayit_sayisi' => count($kayitlar),
        'sigorta_tahsilat' => 0,
        'muvekkile_havale' => 0,
        'yonlendiren_ucreti' => 0,
        'noter_masrafi' => 0,
        'dosya_masraflari' => 0,
        'toplam_kazanc' => 0,
        'net_toplam_kazanc' => 0,
        'onur_payi' => 0,
        'avukat_payi' => 0,
        'mahsup_uygulanan' => 0,
        'mahsup_bekleyen' => 0,
        'zarar_tutari' => 0,
    ];

    // Paydaş ve avukat bazlı dökümler
    $paydasOzet = [];
    $avukatOzet = [];

    foreach ($kayitlar as $k) {
        $toplam['sigorta_tahsilat']  += (float)$k['sigorta_tahsilat'];
        $toplam['muvekkile_havale']  += (float)$k['muvekkile_havale'];
        $toplam['yonlendiren_ucreti'] += (float)$k['yonlendiren_ucreti'];
        $toplam['noter_masrafi']     += (float)$k['noter_masrafi'];
        $toplam['dosya_masraflari']  += (float)$k['dosya_masraflari'];
        $toplam['toplam_kazanc']     += (float)$k['toplam_kazanc'];
        $toplam['net_toplam_kazanc'] += (float)$k['net_toplam_kazanc'];
        $toplam['onur_payi']         += (float)$k['onur_payi'];
        $toplam['avukat_payi']       += (float)$k['avukat_payi'];
        $toplam['mahsup_uygulanan']  += (float)$k['mahsup_uygulanan'];
        $toplam['zarar_tutari']      += (float)$k['zarar_tutari'];
        if ($k['mahsup_durumu'] === 'beklemede') {
            $toplam['mahsup_bekleyen'] += (float)$k['mahsup_edilecek'] - (float)$k['mahsup_uygulanan'];
        }

        // Paydaş özet
        if (!empty($k['yonlendiren_paydas_id'])) {
            $pid = (int)$k['yonlendiren_paydas_id'];
            if (!isset($paydasOzet[$pid])) {
                $paydasOzet[$pid] = [
                    'paydas_id' => $pid,
                    'paydas_adi' => $k['yonlendiren_paydas_adi'] ?: '-',
                    'dosya_sayisi' => 0,
                    'toplam_yonlendiren_ucret' => 0,
                ];
            }
            $paydasOzet[$pid]['dosya_sayisi']++;
            $paydasOzet[$pid]['toplam_yonlendiren_ucret'] += (float)$k['yonlendiren_ucreti'];
        }

        // Avukat özet
        if (!empty($k['avukat_ortak_id'])) {
            $aid = (int)$k['avukat_ortak_id'];
            if (!isset($avukatOzet[$aid])) {
                $avukatOzet[$aid] = [
                    'avukat_ortak_id' => $aid,
                    'avukat_adi' => $k['avukat_adi'] ?: '-',
                    'avukat_firma' => $k['avukat_firma'] ?: '',
                    'dosya_sayisi' => 0,
                    'toplam_avukat_payi' => 0,
                ];
            }
            $avukatOzet[$aid]['dosya_sayisi']++;
            $avukatOzet[$aid]['toplam_avukat_payi'] += (float)$k['avukat_payi'];
        }
    }

    // Yuvarla
    foreach ($toplam as $k => $v) {
        if (is_float($v)) $toplam[$k] = round($v, 2);
    }

    json_success([
        'donem' => [
            'baslangic' => $baslangic,
            'bitis' => $bitis
        ],
        'kayitlar' => $kayitlar,
        'toplam' => $toplam,
        'paydas_ozet' => array_values($paydasOzet),
        'avukat_ozet' => array_values($avukatOzet)
    ]);

} catch (\Exception $e) {
    json_error('Liste alınırken hata: ' . $e->getMessage(), 500);
}
