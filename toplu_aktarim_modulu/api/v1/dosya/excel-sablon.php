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

// Şablon sütunları (dosya listesindeki alanlar + oluşturma alanları)
$sutunlar = [
    'DOSYA TÜRÜ',          // ADK veya BH (zorunlu)
    'ADI SOYADI',          // Mağdur ad soyad (zorunlu)
    'T.C. KİMLİK',        // Mağdur TC
    'TELEFON',             // Mağdur telefon
    'TELEFON 2',           // Mağdur ikinci telefon
    'E-POSTA',             // Mağdur email
    'SİGORTA ŞİRKETİ',    // Davalı sigorta
    'HASAR NO',            // Sigorta hasar no
    'POLİÇE NO',          // Sigorta poliçe no
    'KAZA TARİHİ',        // GG.AA.YYYY formatında
    'KAZA İL',             // İl
    'KAZA İLÇE',          // İlçe
    'PLAKA',               // Mağdur araç plaka
    'MARKA',               // Araç marka
    'MODEL',               // Araç model
    'MODEL YILI',          // Araç yılı
    'KARŞI PLAKA',         // Karşı araç plaka
    'KARŞI SİGORTA',      // Karşı araç trafik sigortası
    'DOSYA KAYNAĞI',       // OFİS CRM, YÖNLENDİREN, SAHA PERSONEL
    'AŞAMA',               // Dosya aşaması
    'NOTLAR'               // Dosya notları
];

// Örnek veri satırı
$ornek = [
    'ADK',                          // DOSYA TÜRÜ
    'Ahmet Yılmaz',                 // ADI SOYADI
    '12345678901',                  // T.C. KİMLİK
    '0532 111 2233',                // TELEFON
    '',                             // TELEFON 2
    'ahmet@email.com',              // E-POSTA
    'Axa Sigorta',                  // SİGORTA ŞİRKETİ
    'HSR-2026-001',                 // HASAR NO
    'POL-123456',                   // POLİÇE NO
    '15.01.2026',                   // KAZA TARİHİ (GG.AA.YYYY)
    'İSTANBUL',                     // KAZA İL
    'KADIKÖY',                      // KAZA İLÇE
    '34 ABC 123',                   // PLAKA
    'TOYOTA',                       // MARKA
    'COROLLA',                      // MODEL
    '2022',                         // MODEL YILI
    '06 DEF 456',                   // KARŞI PLAKA
    'Allianz Sigorta',              // KARŞI SİGORTA
    'OFİS CRM',                     // DOSYA KAYNAĞI
    'Dosya Açık',                   // AŞAMA
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

// Boş ikinci örnek satır (BH türü)
$ornek2 = [
    'BH',                           // DOSYA TÜRÜ
    'Fatma Demir',                   // ADI SOYADI
    '98765432109',                   // T.C. KİMLİK
    '0533 444 5566',                 // TELEFON
    '',                              // TELEFON 2
    '',                              // E-POSTA
    'Mapfre Sigorta',                // SİGORTA ŞİRKETİ
    '',                              // HASAR NO
    '',                              // POLİÇE NO
    '20.02.2026',                    // KAZA TARİHİ
    'ANKARA',                        // KAZA İL
    'ÇANKAYA',                       // KAZA İLÇE
    '',                              // PLAKA
    '',                              // MARKA
    '',                              // MODEL
    '',                              // MODEL YILI
    '',                              // KARŞI PLAKA
    '',                              // KARŞI SİGORTA
    'YÖNLENDİREN',                   // DOSYA KAYNAĞI
    'Dosya Açık',                    // AŞAMA
    ''                               // NOTLAR
];
fputcsv($output, $ornek2, ';');

fclose($output);
exit;
