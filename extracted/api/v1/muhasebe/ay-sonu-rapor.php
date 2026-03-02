<?php
/**
 * GET /api/v1/muhasebe/ay-sonu-rapor.php
 * Kapsamlı Ay Sonu Raporu — PDF formatında kullanılmak üzere
 *
 * Params:
 *   ay      = 2026-02  (zorunlu: yıl-ay)
 *   ortak_id = 1       (opsiyonel: ana ortak/yatırımcı)
 *
 * Rapor yapısı:
 *   BÖLÜM 1: Ortak Hesabı (dosya masrafları, ortak ödemeleri, alacak)
 *   BÖLÜM 2: MR Net Kazanç (diğer masraflar, kapanan dosya gelirleri)
 *   FİNAL:   Genel özet
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'muhasebe']);
$db = getDB();

// Parametre: Ay (zorunlu)
$ay = clean($_GET['ay'] ?? '');
if (!preg_match('/^\d{4}-\d{2}$/', $ay)) {
    $ay = date('Y-m');
}

$baslangic = $ay . '-01';
$bitis = date('Y-m-t', strtotime($baslangic));
$ayAdi = strftime('%B %Y', strtotime($baslangic));

// Türkçe ay adı (strftime locale'e bağlı, elle yapalım)
$aylar = ['', 'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
$ayNo = (int)date('m', strtotime($baslangic));
$yil = date('Y', strtotime($baslangic));
$ayAdiTR = $aylar[$ayNo] . ' ' . $yil;

// Opsiyonel: Ortak seçimi
$ortakId = (int)($_GET['ortak_id'] ?? 0);
$ortakBilgi = null;
if ($ortakId) {
    $stmt = $db->prepare('SELECT id, ad_soyad, firma FROM ortaklar WHERE id = ?');
    $stmt->execute([$ortakId]);
    $ortakBilgi = $stmt->fetch();
}

// ═══════════════════════════════════════════
// BÖLÜM 1: ORTAK HESABI — DOSYA MASRAFLARI
// ═══════════════════════════════════════════

// 1a. Ortaktan alınan ödemeler (ay içinde)
$ortakOdemeleri = [];
$ortakToplamOdeme = 0;
if ($ortakId) {
    $stmt = $db->prepare("SELECT oh.id, oh.tutar, oh.tarih, oh.aciklama, oh.tur
        FROM ortak_hareketleri oh
        WHERE oh.ortak_id = ? AND oh.tarih BETWEEN ? AND ?
        ORDER BY oh.tarih ASC");
    $stmt->execute([$ortakId, $baslangic, $bitis]);
    $ortakOdemeleri = $stmt->fetchAll();
    foreach ($ortakOdemeleri as $o) {
        if ($o['tur'] === 'tahsilat' || $o['tur'] === 'odeme') {
            $ortakToplamOdeme += (float)$o['tutar'];
        }
    }
}

// 1b. Ay içinde açılan dosyalar + masrafları
$dosyaSQL = "SELECT d.id, d.dosya_no, d.dosya_turu, d.dosya_kaynagi, d.acilis_tarihi,
    m.ad_soyad as magdur_adi,
    COALESCE((SELECT SUM(mas.tutar) FROM masraflar mas WHERE mas.dosya_id = d.id), 0) as toplam_masraf
    FROM dosyalar d
    LEFT JOIN magdurlar m ON m.dosya_id = d.id
    WHERE d.acilis_tarihi BETWEEN ? AND ?";
$dosyaParams = [$baslangic, $bitis];

if ($ortakId) {
    $dosyaSQL .= " AND d.ortak_id = ?";
    $dosyaParams[] = $ortakId;
}

$dosyaSQL .= " GROUP BY d.id ORDER BY d.acilis_tarihi ASC, d.id ASC";
$stmt = $db->prepare($dosyaSQL);
$stmt->execute($dosyaParams);
$dosyalar = $stmt->fetchAll();

// Dosya türü dağılımı
$turDagilimi = [];
$toplamDosyaMasraf = 0;
foreach ($dosyalar as $d) {
    $tur = $d['dosya_turu'] ?: 'DİĞER';
    if (!isset($turDagilimi[$tur])) $turDagilimi[$tur] = 0;
    $turDagilimi[$tur]++;
    $toplamDosyaMasraf += (float)$d['toplam_masraf'];
}

// Kaynak formatlama
foreach ($dosyalar as &$d) {
    $kaynak = mb_strtoupper($d['dosya_kaynagi'] ?? '');
    if (mb_stripos($kaynak, 'OFİS') !== false || mb_stripos($kaynak, 'CRM') !== false) {
        $d['kaynak_kisa'] = 'OFİS CRM';
    } else {
        $d['kaynak_kisa'] = 'YÖNLENDİREN';
    }
}
unset($d);

// ═══════════════════════════════════════════
// BÖLÜM 2: MR NET KAZANÇ
// ═══════════════════════════════════════════

// 2a. Diğer masraflar (giderler tablosundan, ay içinde)
$stmt = $db->prepare("SELECT id, gider_turu, tutar, aciklama, islem_tarihi
    FROM giderler
    WHERE islem_tarihi BETWEEN ? AND ?
    ORDER BY islem_tarihi ASC");
$stmt->execute([$baslangic, $bitis]);
$digerMasraflar = $stmt->fetchAll();

$toplamDigerMasraf = 0;
foreach ($digerMasraflar as $dm) {
    $toplamDigerMasraf += (float)$dm['tutar'];
}

// 2b. Kapanan dosyalar kazancı (ay içinde kapanan)
$kapananSQL = "SELECT d.id, d.dosya_no, d.dosya_turu, d.asama, d.updated_at as kapanma_tarihi,
    m.ad_soyad as magdur_adi,
    COALESCE((SELECT SUM(g.tutar) FROM gelirler g WHERE g.dosya_id = d.id AND g.tahsilat_durumu = 'tahsil_edildi'), 0) as toplam_gelir,
    COALESCE((SELECT SUM(mas.tutar) FROM masraflar mas WHERE mas.dosya_id = d.id), 0) as toplam_masraf
    FROM dosyalar d
    LEFT JOIN magdurlar m ON m.dosya_id = d.id
    WHERE (d.asama LIKE '%KAPANDI%' OR d.asama LIKE '%ÖDEME ALINDI%' OR d.asama LIKE '%KAPANIŞ%')
    AND DATE(d.updated_at) BETWEEN ? AND ?";
$kapananParams = [$baslangic, $bitis];

if ($ortakId) {
    $kapananSQL .= " AND d.ortak_id = ?";
    $kapananParams[] = $ortakId;
}

$kapananSQL .= " ORDER BY d.updated_at ASC";
$stmt = $db->prepare($kapananSQL);
$stmt->execute($kapananParams);
$kapananDosyalar = $stmt->fetchAll();

$pozitifToplam = 0;
$mahsupToplam = 0;
foreach ($kapananDosyalar as &$kd) {
    $net = (float)$kd['toplam_gelir'] - (float)$kd['toplam_masraf'];
    $kd['net_kar'] = $net;
    if ($net >= 0) {
        $pozitifToplam += $net;
    } else {
        $mahsupToplam += abs($net);
    }
}
unset($kd);

$kapananNetKazanc = $pozitifToplam - $mahsupToplam;

// ═══════════════════════════════════════════
// HESAPLAMALAR
// ═══════════════════════════════════════════

// Diğer masraflar yarısı (ortak payı ve MR payı)
$digerMasrafYarisi = round($toplamDigerMasraf / 2, 2);

// BÖLÜM 1 SONUÇ: Ortak alacak
$ortakAlacak = $toplamDosyaMasraf + $digerMasrafYarisi - $ortakToplamOdeme;

// BÖLÜM 2 SONUÇ: MR net kazanç
$mrNetKazanc = $kapananNetKazanc - $digerMasrafYarisi;

// ═══════════════════════════════════════════
// ÖNCEKİ AY DEVİR (varsa)
// ═══════════════════════════════════════════
$oncekiAyDevir = 0;
if ($ortakId) {
    // Önceki aylardan kalan bakiye (toplam tahsilat - toplam masraf farkı)
    $stmt = $db->prepare("SELECT
        COALESCE(SUM(CASE WHEN tur IN ('tahsilat','odeme') THEN tutar ELSE 0 END), 0) as toplam_odeme,
        COALESCE(SUM(CASE WHEN tur = 'masraf' THEN tutar ELSE 0 END), 0) as toplam_masraf
        FROM ortak_hareketleri
        WHERE ortak_id = ? AND tarih < ?");
    $stmt->execute([$ortakId, $baslangic]);
    $onceki = $stmt->fetch();
    // Önceki dönem detay - basit devir hesabı
}

// ═══════════════════════════════════════════
// ORTAKLAR LİSTESİ (dropdown için)
// ═══════════════════════════════════════════
$stmt = $db->query("SELECT id, ad_soyad, firma FROM ortaklar WHERE durum = 'aktif' ORDER BY ad_soyad");
$ortaklarListesi = $stmt->fetchAll();

// ═══════════════════════════════════════════
// SONUÇ
// ═══════════════════════════════════════════
json_success([
    'donem' => [
        'ay' => $ay,
        'baslangic' => $baslangic,
        'bitis' => $bitis,
        'ay_adi' => $ayAdiTR
    ],
    'ortak' => $ortakBilgi,
    'ortaklar_listesi' => $ortaklarListesi,

    // BÖLÜM 1: Ortak hesabı
    'bolum1' => [
        'ortak_odemeleri' => $ortakOdemeleri,
        'ortak_toplam_odeme' => $ortakToplamOdeme,
        'dosyalar' => $dosyalar,
        'dosya_sayisi' => count($dosyalar),
        'toplam_dosya_masraf' => $toplamDosyaMasraf,
        'tur_dagilimi' => $turDagilimi,
        'diger_masraf_yarisi' => $digerMasrafYarisi,
        'ortak_alacak' => $ortakAlacak
    ],

    // BÖLÜM 2: MR net kazanç
    'bolum2' => [
        'diger_masraflar' => $digerMasraflar,
        'toplam_diger_masraf' => $toplamDigerMasraf,
        'kapanan_dosyalar' => $kapananDosyalar,
        'pozitif_toplam' => $pozitifToplam,
        'mahsup_toplam' => $mahsupToplam,
        'kapanan_net_kazanc' => $kapananNetKazanc,
        'diger_masraf_yarisi' => $digerMasrafYarisi,
        'mr_net_kazanc' => $mrNetKazanc
    ],

    // FİNAL ÖZET
    'final' => [
        'ortak_alacak' => $ortakAlacak,
        'mr_net_kazanc' => $mrNetKazanc,
        'toplam_diger_masraf' => $toplamDigerMasraf,
        'ortak_diger_masraf_payi' => $digerMasrafYarisi,
        'mr_diger_masraf_payi' => $digerMasrafYarisi
    ]
]);
