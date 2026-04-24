<?php
/**
 * GET /api/v1/dosya/excel-sablon.php
 * DOSYA TOPLU AKTARIM İÇİN EXCEL (CSV) ŞABLON İNDİRME
 * Sadece admin yetkisi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$user = auth_required(['admin']);

// Şablon sütunları (dosya listesi excel export sıralamasıyla birebir aynı + ek alanlar)
// Export sırası: DOSYA NO > T.C. NO > ADI SOYADI > DOSYA KAYNAĞI > AVUKATI > DOSYA TÜRÜ > DAVALI ŞİRKET > SİGORTA HASAR NO > KAZA TARİHİ > AÇILIŞ TARİHİ > DOSYA AŞAMA DURUMU
// DOSYA NO sistem tarafından otomatik atanır, şablonda yer almaz
// AÇILIŞ TARİHİ boş bırakılırsa bugünün tarihi, doldurulursa eski sistem dosyası olarak kabul edilir
$sutunlar = [
    // — Dosya Listesi Export ile birebir aynı sıra ve isim —
    'T.C. NO',             // Mağdur TC (export sırası: 2)
    'ADI SOYADI',          // Mağdur ad soyad - zorunlu (export sırası: 3)
    'DOSYA KAYNAĞI',       // OFİS CRM, YÖNLENDİREN, SAHA PERSONEL (export sırası: 4)
    'DOSYA TÜRÜ',          // ADK veya BH - zorunlu (export sırası: 6)
    'DAVALI ŞİRKET',      // Davalı sigorta şirketi (export sırası: 7)
    'SİGORTA HASAR NO',   // Sigorta hasar numarası (export sırası: 8)
    'KAZA TARİHİ',        // GG.AA.YYYY formatında (export sırası: 9)
    'AÇILIŞ TARİHİ',      // Dosya açılış tarihi (eski sistem dosyaları için orijinal tarih), GG.AA.YYYY - boş ise bugün
    'DOSYA AŞAMA DURUMU', // Dosya aşaması (export sırası: 11)
    // — Ek alanlar (export'ta bulunmayan) —
    'TELEFON',             // Mağdur telefon
    'TELEFON 2',           // Mağdur ikinci telefon
    'E-POSTA',             // Mağdur email
    'POLİÇE NO',          // Sigorta poliçe no
    'KAZA İL',             // İl
    'KAZA İLÇE',          // İlçe
    'PLAKA',               // Mağdur araç plaka
    'MARKA',               // Araç marka
    'MODEL',               // Araç model
    'MODEL YILI',          // Araç yılı
    'KARŞI PLAKA',         // Karşı araç plaka
    'KARŞI SİGORTA',      // Karşı araç trafik sigortası
    'NOTLAR'               // Dosya notları
];

// Örnek veri satırı (sütun sırası ile birebir aynı)
$ornek = [
    // — Dosya Listesi Export sırası —
    '12345678901',                  // T.C. NO
    'Ahmet Yılmaz',                 // ADI SOYADI
    'OFİS CRM',                     // DOSYA KAYNAĞI
    'ADK',                          // DOSYA TÜRÜ
    'Axa Sigorta',                  // DAVALI ŞİRKET
    'HSR-2026-001',                 // SİGORTA HASAR NO
    '15.01.2026',                   // KAZA TARİHİ (GG.AA.YYYY)
    '20.01.2026',                   // AÇILIŞ TARİHİ (eski sistem dosyası orijinal tarihi)
    'Dosya Açık',                   // DOSYA AŞAMA DURUMU
    // — Ek alanlar —
    '0532 111 2233',                // TELEFON
    '',                             // TELEFON 2
    'ahmet@email.com',              // E-POSTA
    'POL-123456',                   // POLİÇE NO
    'İSTANBUL',                     // KAZA İL
    'KADIKÖY',                      // KAZA İLÇE
    '34 ABC 123',                   // PLAKA
    'TOYOTA',                       // MARKA
    'COROLLA',                      // MODEL
    '2022',                         // MODEL YILI
    '06 DEF 456',                   // KARŞI PLAKA
    'Allianz Sigorta',              // KARŞI SİGORTA
    'Toplu aktarım ile eklendi'     // NOTLAR
];

// LiteSpeed/Apache gzip devre dışı
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
@ini_set('zlib.output_compression', 'Off');

// CSV dosyası olarak gönder (UTF-8 BOM ile Excel uyumlu)
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="dosya_toplu_aktarim_sablonu.csv"');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');

if (ob_get_level()) {
    ob_end_clean();
}

// UTF-8 BOM (Excel'in Türkçe karakterleri doğru okuması için)
echo "\xEF\xBB\xBF";

$output = fopen('php://output', 'w');

// Başlık satırı
fputcsv($output, $sutunlar, ';');

// Örnek veri satırı
fputcsv($output, $ornek, ';');

// Boş ikinci örnek satır (BH türü - aynı sırada, eski sistem dosyası örneği)
$ornek2 = [
    // — Dosya Listesi Export sırası —
    '98765432109',                   // T.C. NO
    'Fatma Demir',                   // ADI SOYADI
    'YÖNLENDİREN',                   // DOSYA KAYNAĞI
    'BH',                            // DOSYA TÜRÜ
    'Mapfre Sigorta',                // DAVALI ŞİRKET
    '',                              // SİGORTA HASAR NO
    '10.03.2023',                    // KAZA TARİHİ
    '15.05.2023',                    // AÇILIŞ TARİHİ (eski sistemde açılmış, geriye dönük aktarım)
    'Dosya Açık',                    // DOSYA AŞAMA DURUMU
    // — Ek alanlar —
    '0533 444 5566',                 // TELEFON
    '',                              // TELEFON 2
    '',                              // E-POSTA
    '',                              // POLİÇE NO
    'ANKARA',                        // KAZA İL
    'ÇANKAYA',                       // KAZA İLÇE
    '',                              // PLAKA
    '',                              // MARKA
    '',                              // MODEL
    '',                              // MODEL YILI
    '',                              // KARŞI PLAKA
    '',                              // KARŞI SİGORTA
    'Eski sistemden aktarım'         // NOTLAR
];
fputcsv($output, $ornek2, ';');

fclose($output);
exit;
