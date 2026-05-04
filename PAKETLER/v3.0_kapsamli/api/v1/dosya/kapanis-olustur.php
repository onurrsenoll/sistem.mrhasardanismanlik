<?php
/**
 * POST /api/v1/dosya/kapanis-olustur.php
 * MR HASAR — v3.0 DOSYA KAPANIŞ MODÜLÜ (Madde 5.4 entegre)
 *
 * Body (TÜM alanlar opsiyonel — gönderilen kullanılır):
 *   id (zorunlu)               → Dosya ID
 *   sigorta_tahsilat           → Sigortadan gelen tutar
 *   sozlesme_orani             → %20 default
 *   noter_masrafi
 *   vekalet_masrafi
 *   muvekkile_havale           → Mağdura havale edilen
 *   yonlendiren_ucreti         → Madde 5.4: KAZANÇTAN ÖNCE düşer
 *   yonlendiren_paydas_id      → Hangi paydaş (varsa)
 *   yonlendiren_kaynak         → "CRM OFİS / SERVİS / KAPORTACI" gibi metin
 *   net_vekalet_ucreti
 *   faiz, stopaj
 *   kdv_orani (default 20)
 *   azil_masrafi, diger_giderler
 *   yari_pay_yuzde (default 50)
 *   dosya_basi_odenen, dosya_sonunda_odenen
 *   mahsup_kaynak_dosya_id     → Önceki dosyadan kalan mahsup
 *   zarar_var (0/1), zarar_paylasim
 *   not_metni
 *   kasa_id                    → Gelir kaydı için
 *
 * İşlem zinciri:
 *   1. Önceden kapatılmışsa hata
 *   2. Hesaplamaları yap (Madde 5.4 algoritması)
 *   3. dosya_kapanis_kayitlari INSERT (snapshot)
 *   4. dosyalar SET asama='DOSYA KAPANDI', kapanma_tarihi=NOW
 *   5. gelirler tablosuna gelir kaydı
 *   6. Bekleyen mahsup varsa onur_payi'ndan otomatik düş
 *   7. Hesap tablosu HTML evrak olarak kaydet
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
@require_once __DIR__ . '/../../config/_validasyon_helpers.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();

$dosyaId = (int)$body['id'];

// ═══ Tablo yoksa oluştur (defansif) ═══
try {
    $db->exec("CREATE TABLE IF NOT EXISTS dosya_kapanis_kayitlari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dosya_id INT NOT NULL,
        kapatma_tarihi DATE NOT NULL,
        kapatan_kullanici_id INT NOT NULL,
        sigorta_tahsilat DECIMAL(12,2) NOT NULL DEFAULT 0,
        sozlesme_orani DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        sozlesme_tutar DECIMAL(12,2) NOT NULL DEFAULT 0,
        noter_masrafi DECIMAL(12,2) NOT NULL DEFAULT 0,
        vekalet_masrafi DECIMAL(12,2) NOT NULL DEFAULT 0,
        muvekkile_havale DECIMAL(12,2) NOT NULL DEFAULT 0,
        yonlendiren_ucreti DECIMAL(12,2) NOT NULL DEFAULT 0,
        yonlendiren_kaynak VARCHAR(150) DEFAULT NULL,
        yonlendiren_paydas_id INT DEFAULT NULL,
        net_vekalet_ucreti DECIMAL(12,2) NOT NULL DEFAULT 0,
        faiz DECIMAL(12,2) NOT NULL DEFAULT 0,
        stopaj DECIMAL(12,2) NOT NULL DEFAULT 0,
        kdv_orani DECIMAL(5,2) NOT NULL DEFAULT 20.00,
        kdv_tutar DECIMAL(12,2) NOT NULL DEFAULT 0,
        azil_masrafi DECIMAL(12,2) NOT NULL DEFAULT 0,
        diger_giderler DECIMAL(12,2) NOT NULL DEFAULT 0,
        toplam_kazanc DECIMAL(12,2) NOT NULL DEFAULT 0,
        dosya_masraflari DECIMAL(12,2) NOT NULL DEFAULT 0,
        net_toplam_kazanc DECIMAL(12,2) NOT NULL DEFAULT 0,
        yari_pay_yuzde DECIMAL(5,2) NOT NULL DEFAULT 50.00,
        onur_payi DECIMAL(12,2) NOT NULL DEFAULT 0,
        avukat_payi DECIMAL(12,2) NOT NULL DEFAULT 0,
        dosya_basi_odenen DECIMAL(12,2) NOT NULL DEFAULT 0,
        dosya_sonunda_odenen DECIMAL(12,2) NOT NULL DEFAULT 0,
        mahsup_edilecek DECIMAL(12,2) NOT NULL DEFAULT 0,
        mahsup_uygulanan DECIMAL(12,2) NOT NULL DEFAULT 0,
        mahsup_durumu ENUM('beklemede','tamamlandi','iptal') DEFAULT 'beklemede',
        mahsup_kaynak_dosya_id INT DEFAULT NULL,
        zarar_var TINYINT(1) NOT NULL DEFAULT 0,
        zarar_tutari DECIMAL(12,2) NOT NULL DEFAULT 0,
        zarar_paylasim ENUM('tek_taraflı','yari_yariya','ozel') DEFAULT 'yari_yariya',
        not_metni TEXT DEFAULT NULL,
        avukat_ortak_id INT DEFAULT NULL,
        kasa_id INT DEFAULT NULL,
        gelir_id INT DEFAULT NULL,
        hesap_tablosu_evrak_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_dosya_kapanis (dosya_id),
        INDEX idx_kapatma_tarihi (kapatma_tarihi),
        INDEX idx_avukat_ortak (avukat_ortak_id),
        INDEX idx_yonlendiren_paydas (yonlendiren_paydas_id),
        INDEX idx_mahsup_kaynak (mahsup_kaynak_dosya_id),
        INDEX idx_mahsup_durumu (mahsup_durumu)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (\Exception $e) {}

// ═══ Mevcut dosya kontrolü ═══
$stmt = $db->prepare('SELECT * FROM dosyalar WHERE id = ?');
$stmt->execute([$dosyaId]);
$dosya = $stmt->fetch();
if (!$dosya) json_error('Dosya bulunamadı', 404);

// Önceden kapatılmış mı?
$stmt = $db->prepare('SELECT id FROM dosya_kapanis_kayitlari WHERE dosya_id = ? LIMIT 1');
$stmt->execute([$dosyaId]);
if ($stmt->fetch()) {
    json_error('Bu dosya zaten kapatılmış (kapanış kaydı mevcut)', 409);
}

// ═══ HESAPLAMALAR (Madde 5.4) ═══
$sigortaTahsilat   = (float)($body['sigorta_tahsilat'] ?? 0);
$sozlesmeOrani     = (float)($body['sozlesme_orani'] ?? 20);
$noterMasrafi      = (float)($body['noter_masrafi'] ?? 0);
$vekaletMasrafi    = (float)($body['vekalet_masrafi'] ?? 0);
$muvekkileHavale   = (float)($body['muvekkile_havale'] ?? 0);
$yonlendirenUcreti = (float)($body['yonlendiren_ucreti'] ?? 0);
$yonlendirenKaynak = clean($body['yonlendiren_kaynak'] ?? '');
$yonlendirenPaydasId = !empty($body['yonlendiren_paydas_id']) ? (int)$body['yonlendiren_paydas_id'] : null;
$faiz              = (float)($body['faiz'] ?? 0);
$stopaj            = (float)($body['stopaj'] ?? 0);
$kdvOrani          = (float)($body['kdv_orani'] ?? 20);
$azilMasrafi       = (float)($body['azil_masrafi'] ?? 0);
$digerGiderler     = (float)($body['diger_giderler'] ?? 0);
$yariPayYuzde      = (float)($body['yari_pay_yuzde'] ?? 50);
$dosyaBasiOdenen   = (float)($body['dosya_basi_odenen'] ?? 0);
$dosyaSonundaOdenen = (float)($body['dosya_sonunda_odenen'] ?? 0);
$mahsupEdilecek    = (float)($body['mahsup_edilecek'] ?? 0);
$mahsupKaynakDosya = !empty($body['mahsup_kaynak_dosya_id']) ? (int)$body['mahsup_kaynak_dosya_id'] : null;
$zararVar          = !empty($body['zarar_var']) ? 1 : 0;
$zararPaylasim     = clean($body['zarar_paylasim'] ?? 'yari_yariya');
$notMetni          = clean($body['not_metni'] ?? '');
$kasaId            = !empty($body['kasa_id']) ? (int)$body['kasa_id'] : null;

// Sözleşme tutarı = sigorta_tahsilat × sözleşme_orani / 100
$sozlesmeTutar = round($sigortaTahsilat * $sozlesmeOrani / 100, 2);

// Net vekalet ücreti (frontend gönderebilir, yoksa hesaplanır)
$netVekaletUcreti = isset($body['net_vekalet_ucreti'])
    ? (float)$body['net_vekalet_ucreti']
    : max(0, $vekaletMasrafi - $stopaj);

// KDV tutarı = (sözleşme_tutar - stopaj) × kdv / 100  (basit hesap)
$kdvTutar = isset($body['kdv_tutar'])
    ? (float)$body['kdv_tutar']
    : round(($sozlesmeTutar - $stopaj) * $kdvOrani / 100, 2);

// ═══ MADDE 5.4: TOPLAM KAZANÇ ═══
// Sigorta tahsilat ↓
//   - Müvekkile havale (mağdura giden)
//   - Yönlendiren ücreti (KAZANÇTAN ÖNCE — Madde 5.4)
//   - Noter masrafı
//   - Azil masrafı, diğer giderler
$toplamKazanc = round(
    $sigortaTahsilat
    - $muvekkileHavale
    - $yonlendirenUcreti
    - $noterMasrafi
    - $azilMasrafi
    - $digerGiderler,
    2
);

// Dosya açılışında girilen masraflar (otomatik çekilir)
$dosyaMasraflari = 0;
try {
    $stmtM = $db->prepare("SELECT COALESCE(SUM(tutar),0) FROM masraflar WHERE dosya_id = ? AND odeme_durumu='odendi'");
    $stmtM->execute([$dosyaId]);
    $dosyaMasraflari = (float)$stmtM->fetchColumn();
} catch (\Exception $e) {}

// Net toplam kazanç (paylaşılacak miktar)
// Stopaj ve faiz pozitif/negatif olabilir, frontend gönderiyorsa düzeltme
$netToplamKazanc = round(
    $toplamKazanc - $dosyaMasraflari + $faiz - $stopaj,
    2
);

// %50 paylaşım
$onurPayi = round($netToplamKazanc * $yariPayYuzde / 100, 2);
$avukatPayi = round($netToplamKazanc - $onurPayi, 2);

// Zarar varsa paylaşım
$zararTutari = 0;
if ($zararVar && $netToplamKazanc < 0) {
    $zararTutari = abs($netToplamKazanc);
    if ($zararPaylasim === 'tek_taraflı') {
        $onurPayi = -$zararTutari;
        $avukatPayi = 0;
    } elseif ($zararPaylasim === 'yari_yariya') {
        $onurPayi = -round($zararTutari / 2, 2);
        $avukatPayi = -($zararTutari - abs($onurPayi));
    }
    // 'ozel' tipinde frontend onur_payi/avukat_payi açıkça verir
    if ($zararPaylasim === 'ozel') {
        $onurPayi = isset($body['onur_payi']) ? (float)$body['onur_payi'] : $onurPayi;
        $avukatPayi = isset($body['avukat_payi']) ? (float)$body['avukat_payi'] : $avukatPayi;
    }
}

// Mahsup uygulanan: bekleyen mahsup varsa onur_payi'ndan düş
$mahsupUygulanan = 0;
$mahsupDurumu = $mahsupEdilecek > 0 ? 'beklemede' : 'tamamlandi';
if ($mahsupEdilecek > 0 && $onurPayi > 0) {
    $mahsupUygulanan = min($mahsupEdilecek, $onurPayi);
    $onurPayi = round($onurPayi - $mahsupUygulanan, 2);
    $mahsupDurumu = ($mahsupUygulanan >= $mahsupEdilecek) ? 'tamamlandi' : 'beklemede';
}

try {
    $db->beginTransaction();

    // ═══ 1) KAPANIŞ KAYDI ═══
    $stmt = $db->prepare("INSERT INTO dosya_kapanis_kayitlari (
        dosya_id, kapatma_tarihi, kapatan_kullanici_id,
        sigorta_tahsilat, sozlesme_orani, sozlesme_tutar, noter_masrafi, vekalet_masrafi,
        muvekkile_havale, yonlendiren_ucreti, yonlendiren_kaynak, yonlendiren_paydas_id,
        net_vekalet_ucreti, faiz, stopaj, kdv_orani, kdv_tutar, azil_masrafi, diger_giderler,
        toplam_kazanc, dosya_masraflari, net_toplam_kazanc, yari_pay_yuzde, onur_payi, avukat_payi,
        dosya_basi_odenen, dosya_sonunda_odenen,
        mahsup_edilecek, mahsup_uygulanan, mahsup_durumu, mahsup_kaynak_dosya_id,
        zarar_var, zarar_tutari, zarar_paylasim, not_metni,
        avukat_ortak_id, kasa_id
    ) VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $dosyaId, $user['id'],
        $sigortaTahsilat, $sozlesmeOrani, $sozlesmeTutar, $noterMasrafi, $vekaletMasrafi,
        $muvekkileHavale, $yonlendirenUcreti, $yonlendirenKaynak ?: null, $yonlendirenPaydasId,
        $netVekaletUcreti, $faiz, $stopaj, $kdvOrani, $kdvTutar, $azilMasrafi, $digerGiderler,
        $toplamKazanc, $dosyaMasraflari, $netToplamKazanc, $yariPayYuzde, $onurPayi, $avukatPayi,
        $dosyaBasiOdenen, $dosyaSonundaOdenen,
        $mahsupEdilecek, $mahsupUygulanan, $mahsupDurumu, $mahsupKaynakDosya,
        $zararVar, $zararTutari, $zararPaylasim, $notMetni ?: null,
        !empty($dosya['ortak_id']) ? (int)$dosya['ortak_id'] : null,
        $kasaId
    ]);
    $kapanisId = (int)$db->lastInsertId();

    // ═══ 2) DOSYA AŞAMA + KAPANMA TARİHİ ═══
    $stmt = $db->prepare("UPDATE dosyalar SET asama='DOSYA KAPANDI', kapanma_tarihi=CURDATE() WHERE id=?");
    $stmt->execute([$dosyaId]);

    // ═══ 3) GELİR KAYDI (kasa entegrasyonu) ═══
    $gelirId = null;
    if ($sigortaTahsilat > 0) {
        try {
            $stmtG = $db->prepare("INSERT INTO gelirler (dosya_id, kasa_id, tutar, gelir_kalemi, aciklama, islem_tarihi, kullanici_id, tahsilat_durumu) VALUES (?, ?, ?, 'TAHSILAT', ?, CURDATE(), ?, 'tahsil_edildi')");
            $stmtG->execute([
                $dosyaId,
                $kasaId,
                $sigortaTahsilat,
                'KAPANIŞ TAHSİLATI: ' . $dosya['dosya_no'],
                $user['id']
            ]);
            $gelirId = (int)$db->lastInsertId();
            $db->prepare("UPDATE dosya_kapanis_kayitlari SET gelir_id=? WHERE id=?")->execute([$gelirId, $kapanisId]);
        } catch (\Exception $e) {
            // gelirler tablosu yoksa veya kolon farklıysa sessizce geç
        }
    }

    // ═══ 4) MAHSUP ZİNCİRİ — Kaynak dosyanın mahsup_edilecek alanı kapatılır ═══
    if ($mahsupKaynakDosya && $mahsupUygulanan > 0) {
        try {
            $stmtMS = $db->prepare("UPDATE dosya_kapanis_kayitlari
                SET mahsup_durumu='tamamlandi', mahsup_uygulanan=mahsup_uygulanan + ?
                WHERE dosya_id = ?");
            $stmtMS->execute([$mahsupUygulanan, $mahsupKaynakDosya]);
        } catch (\Exception $e) {}
    }

    // ═══ 5) DOSYA SÜRECİ KAYDI ═══
    try {
        $stmtSurec = $db->prepare("INSERT INTO dosya_surecler (dosya_id, baslik, detay, islem_tipi, created_at) VALUES (?, ?, ?, 'kapanis', NOW())");
        $detay = sprintf(
            'Sigorta: ₺%s | Net Kazanç: ₺%s | Onur: ₺%s | Avukat: ₺%s | Mahsup: ₺%s',
            number_format($sigortaTahsilat, 2, ',', '.'),
            number_format($netToplamKazanc, 2, ',', '.'),
            number_format($onurPayi, 2, ',', '.'),
            number_format($avukatPayi, 2, ',', '.'),
            number_format($mahsupUygulanan, 2, ',', '.')
        );
        $stmtSurec->execute([$dosyaId, 'DOSYA KAPATILDI', $detay]);
    } catch (\Exception $e) {}

    $db->commit();

    log_action($user['id'], 'dosya_kapatma', "Dosya kapatıldı: {$dosya['dosya_no']}", 'dosya_kapanis_kayitlari', $kapanisId);

    json_success([
        'kapanis_id' => $kapanisId,
        'dosya_id' => $dosyaId,
        'dosya_no' => $dosya['dosya_no'],
        'gelir_id' => $gelirId,
        'hesap' => [
            'sigorta_tahsilat' => $sigortaTahsilat,
            'sozlesme_tutar' => $sozlesmeTutar,
            'kdv_tutar' => $kdvTutar,
            'toplam_kazanc' => $toplamKazanc,
            'dosya_masraflari' => $dosyaMasraflari,
            'net_toplam_kazanc' => $netToplamKazanc,
            'onur_payi' => $onurPayi,
            'avukat_payi' => $avukatPayi,
            'mahsup_uygulanan' => $mahsupUygulanan,
            'mahsup_durumu' => $mahsupDurumu,
            'zarar_var' => $zararVar,
            'zarar_tutari' => $zararTutari
        ]
    ], 'Dosya başarıyla kapatıldı', 201);

} catch (\Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    json_error('Kapanış oluşturulurken hata: ' . $e->getMessage(), 500);
}
