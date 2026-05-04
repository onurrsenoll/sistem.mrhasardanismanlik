<?php
/**
 * GET /api/v1/muhasebe/ay-sonu-rapor-v30.php?donem=YYYY-MM
 *
 * v3.0 — Aylık Mutabakat Raporu (Madde 5.4 entegre)
 * dosya_kapanis_kayitlari'ndan üretilir.
 *
 * Format: JSON (HTML/PDF üretimi frontend tarafında yapılır)
 *
 * Sonuç:
 *  - donem (başlangıç, bitiş)
 *  - dosyalar (her kapanış kaydı + Madde 5.4 uyum işareti)
 *  - toplamlar
 *  - paydas_ozet (yönlendiren bazlı)
 *  - avukat_ozet (avukat/ortak bazlı)
 *  - madde54_uyumsuz (yönlendiren ücreti olduğu halde kazançtan düşülmeyen veya hesap hatalı)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman']);
$db = getDB();

$donem = clean($_GET['donem'] ?? date('Y-m'));
if (!preg_match('/^\d{4}-\d{2}$/', $donem)) {
    json_error('Geçersiz dönem formatı (YYYY-MM bekleniyor)', 422);
}

$baslangic = $donem . '-01';
$bitis = date('Y-m-t', strtotime($baslangic));

try {
    // Kapanış kayıtları
    $stmt = $db->prepare("SELECT k.*,
                                 d.dosya_no, d.dosya_turu, d.sigorta_sirket,
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
                          WHERE k.kapatma_tarihi BETWEEN ? AND ?
                          ORDER BY k.kapatma_tarihi");
    $stmt->execute([$baslangic, $bitis]);
    $kayitlar = $stmt->fetchAll();

    $toplamlar = [
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
        'kdv_tutar' => 0,
        'stopaj' => 0,
        'faiz' => 0,
    ];

    $paydasOzet = [];
    $avukatOzet = [];
    $madde54Uyumsuz = [];

    foreach ($kayitlar as $k) {
        foreach (['sigorta_tahsilat','muvekkile_havale','yonlendiren_ucreti','noter_masrafi',
                  'dosya_masraflari','toplam_kazanc','net_toplam_kazanc','onur_payi','avukat_payi',
                  'mahsup_uygulanan','zarar_tutari','kdv_tutar','stopaj','faiz'] as $f) {
            $toplamlar[$f] += (float)($k[$f] ?? 0);
        }
        if ($k['mahsup_durumu'] === 'beklemede') {
            $toplamlar['mahsup_bekleyen'] += (float)$k['mahsup_edilecek'] - (float)$k['mahsup_uygulanan'];
        }

        // Madde 5.4 uyum kontrolü:
        // Yönlendiren ücreti varsa toplam_kazanc'tan düşülmüş olmalı
        if ((float)$k['yonlendiren_ucreti'] > 0) {
            $hesapTKaz = (float)$k['sigorta_tahsilat'] - (float)$k['muvekkile_havale']
                       - (float)$k['yonlendiren_ucreti'] - (float)$k['noter_masrafi']
                       - (float)$k['azil_masrafi'] - (float)$k['diger_giderler'];
            if (abs($hesapTKaz - (float)$k['toplam_kazanc']) > 1.0) {
                $madde54Uyumsuz[] = [
                    'dosya_id' => $k['dosya_id'],
                    'dosya_no' => $k['dosya_no'],
                    'fark' => round($hesapTKaz - (float)$k['toplam_kazanc'], 2),
                    'aciklama' => 'Yönlendiren ücreti kazançtan düşülmemiş olabilir'
                ];
            }
        }

        // Paydaş özet
        if (!empty($k['yonlendiren_paydas_id'])) {
            $pid = (int)$k['yonlendiren_paydas_id'];
            if (!isset($paydasOzet[$pid])) {
                $paydasOzet[$pid] = ['paydas_id'=>$pid,'paydas_adi'=>$k['yonlendiren_paydas_adi']?:'-','dosya_sayisi'=>0,'toplam_yonlendiren_ucret'=>0];
            }
            $paydasOzet[$pid]['dosya_sayisi']++;
            $paydasOzet[$pid]['toplam_yonlendiren_ucret'] += (float)$k['yonlendiren_ucreti'];
        }

        // Avukat özet
        if (!empty($k['avukat_ortak_id'])) {
            $aid = (int)$k['avukat_ortak_id'];
            if (!isset($avukatOzet[$aid])) {
                $avukatOzet[$aid] = ['avukat_ortak_id'=>$aid,'avukat_adi'=>$k['avukat_adi']?:'-','avukat_firma'=>$k['avukat_firma']?:'','dosya_sayisi'=>0,'toplam_avukat_payi'=>0];
            }
            $avukatOzet[$aid]['dosya_sayisi']++;
            $avukatOzet[$aid]['toplam_avukat_payi'] += (float)$k['avukat_payi'];
        }
    }

    foreach ($toplamlar as $k => $v) if (is_float($v)) $toplamlar[$k] = round($v, 2);

    json_success([
        'donem' => ['donem'=>$donem,'baslangic'=>$baslangic,'bitis'=>$bitis],
        'dosyalar' => $kayitlar,
        'toplamlar' => $toplamlar,
        'paydas_ozet' => array_values($paydasOzet),
        'avukat_ozet' => array_values($avukatOzet),
        'madde54_uyumsuz' => $madde54Uyumsuz
    ]);

} catch (\Exception $e) {
    json_error('Rapor oluşturulamadı: ' . $e->getMessage(), 500);
}
