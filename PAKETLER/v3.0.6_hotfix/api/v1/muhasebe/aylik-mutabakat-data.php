<?php
/**
 * GET /api/v1/muhasebe/aylik-mutabakat-data.php?donem=YYYY-MM
 *
 * Ayın TÜM dosyaları + TÜM kapanış kayıtları (avukat filtresi yok).
 * Frontend canlı rapor üretmek için kullanır.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required(['admin', 'uzman', 'personel']);
$db = getDB();

$donem = clean($_GET['donem'] ?? date('Y-m'));
if (!preg_match('/^\d{4}-\d{2}$/', $donem)) {
    json_error('Geçersiz dönem (YYYY-MM)', 422);
}

$baslangic = $donem . '-01';
$bitis     = date('Y-m-t', strtotime($baslangic));

// Firma adı
$firmaAdi = 'MR HASAR DANIŞMANLIK';
try {
    $r = $db->query("SELECT deger FROM ayarlar WHERE anahtar='firma_adi' LIMIT 1")->fetch();
    if ($r && !empty($r['deger'])) $firmaAdi = $r['deger'];
} catch (\Exception $e) {}

// ═══ DOSYALAR — bu ay açılan tüm aktif dosyalar ═══
$stmt = $db->prepare("SELECT d.id, d.dosya_no, d.dosya_turu, d.dosya_kaynagi, d.acilis_tarihi as tarih,
                            COALESCE(m.ad_soyad,'-') as musteri,
                            COALESCE((SELECT SUM(ms.tutar) FROM masraflar ms WHERE ms.dosya_id = d.id), 0) as masraf
                     FROM dosyalar d
                     LEFT JOIN magdurlar m ON m.dosya_id = d.id
                     WHERE d.acilis_tarihi BETWEEN ? AND ?
                       AND (d.silindi IS NULL OR d.silindi = 0)
                     ORDER BY d.acilis_tarihi, d.id");
$stmt->execute([$baslangic, $bitis]);
$rows = $stmt->fetchAll();

$KAYNAK_ETIKET = function($k) {
    if (mb_stripos($k, 'OFİS') !== false || mb_stripos($k, 'CRM') !== false) return 'OFİS CRM';
    if (mb_stripos($k, 'PAYDAŞ') !== false || mb_stripos($k, 'YÖNLENDİREN') !== false) return 'YÖNLENDİREN';
    if (empty($k)) return 'MR';
    return mb_strtoupper($k, 'UTF-8');
};
$DOSYA_TURU_ADI = function($t) {
    return $t === 'ADK' ? 'ARAÇ DEĞER KAYBI' : ($t === 'BH' ? 'BEDENİ HASAR' : ($t === 'MDK' ? 'MADDİ HASAR / KAZA' : strtoupper($t)));
};

$dosyalar = [];
foreach ($rows as $d) {
    $dosyalar[] = [
        'id'    => (int)$d['id'],
        'date'  => date('d.m.Y', strtotime($d['tarih'])),
        'name'  => $d['musteri'],
        'tip'   => $DOSYA_TURU_ADI($d['dosya_turu']),
        'tipKisa' => $d['dosya_turu'],
        'kanal' => $KAYNAK_ETIKET($d['dosya_kaynagi']),
        'tutar' => (float)$d['masraf']
    ];
}

// ═══ KAPANIŞLAR — bu ay kapatılan tüm dosyalar ═══
$pozAdet = 0; $pozToplam = 0; $mahsupAdet = 0; $mahsupToplam = 0;
try {
    $stmt = $db->prepare("SELECT k.* FROM dosya_kapanis_kayitlari k
                          WHERE k.kapatma_tarihi BETWEEN ? AND ?");
    $stmt->execute([$baslangic, $bitis]);
    foreach ($stmt->fetchAll() as $k) {
        $onur = (float)$k['onur_payi'];
        if ($onur > 0) { $pozAdet++; $pozToplam += $onur; }
        $kes = (float)$k['mahsup_uygulanan'] + (float)$k['zarar_tutari'];
        if ($kes > 0) { $mahsupAdet++; $mahsupToplam += $kes; }
    }
} catch (\Exception $e) {
    // Kapanış tablosu yoksa sessizce 0 dön
}

json_success([
    'donem'      => $donem,
    'baslangic'  => $baslangic,
    'bitis'      => $bitis,
    'firma_adi'  => $firmaAdi,
    'hazirlayan' => strtoupper($user['ad_soyad'] ?? 'SİSTEM'),
    'dosyalar'   => $dosyalar,
    'kapanis'    => [
        'poz_adet'      => $pozAdet,
        'poz_toplam'    => round($pozToplam, 2),
        'mahsup_adet'   => $mahsupAdet,
        'mahsup_toplam' => round($mahsupToplam, 2)
    ]
]);
