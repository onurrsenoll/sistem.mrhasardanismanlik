<?php
/**
 * POST /api/v1/dosya/excel-import.php
 * CSV/EXCEL DOSYASINDAN TOPLU DOSYA AKTARIMI
 * Sadece admin yetkisi
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/../../config/database.php';

$user = auth_required(['admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Sadece POST desteklenir', 405);
}

// Dosya kontrolü
if (!isset($_FILES['dosya']) || $_FILES['dosya']['error'] !== UPLOAD_ERR_OK) {
    json_error('CSV dosyası yüklenemedi. Lütfen geçerli bir dosya seçin.', 422);
}

$file = $_FILES['dosya'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($ext, ['csv', 'txt'])) {
    json_error('Sadece CSV dosyası kabul edilir. (.csv veya .txt)', 422);
}

// Dosya boyutu kontrolü (max 5MB)
if ($file['size'] > 5 * 1024 * 1024) {
    json_error('Dosya boyutu 5MB\'dan büyük olamaz.', 422);
}

// CSV dosyasını oku
$content = file_get_contents($file['tmp_name']);

// BOM temizle
$content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

// Satırlara ayır
$lines = preg_split('/\r\n|\r|\n/', $content);
$lines = array_filter($lines, function($l) { return trim($l) !== ''; });

if (count($lines) < 2) {
    json_error('CSV dosyasında en az 1 başlık ve 1 veri satırı olmalıdır.', 422);
}

// Ayırıcı tespit et (noktalı virgül veya virgül)
$headerLine = $lines[0];
$separator = (substr_count($headerLine, ';') >= substr_count($headerLine, ',')) ? ';' : ',';

// Başlık satırını parse et
$headers = str_getcsv($headerLine, $separator);
$headers = array_map(function($h) {
    return mb_strtoupper(trim($h), 'UTF-8');
}, $headers);

// Sütun eşleştirme haritası (CSV başlık → alan adı)
// Yeni isimler (dosya listesi export formatı) + eski isimler (geriye uyumluluk)
$sutunMap = [
    'DOSYA TÜRÜ'          => 'dosya_turu',
    'ADI SOYADI'          => 'ad_soyad',
    'T.C. NO'             => 'tc_kimlik',     // Yeni isim (export formatı)
    'T.C. KİMLİK'         => 'tc_kimlik',     // Eski isim (geriye uyumlu)
    'DOSYA KAYNAĞI'       => 'dosya_kaynagi',
    'DAVALI ŞİRKET'       => 'sigorta_sirket', // Yeni isim (export formatı)
    'SİGORTA ŞİRKETİ'     => 'sigorta_sirket', // Eski isim (geriye uyumlu)
    'SİGORTA HASAR NO'    => 'hasar_no',       // Yeni isim (export formatı)
    'HASAR NO'            => 'hasar_no',        // Eski isim (geriye uyumlu)
    'KAZA TARİHİ'         => 'kaza_tarihi',
    'AÇILIŞ TARİHİ'       => 'acilis_tarihi',  // Eski sistem dosyaları için orijinal açılış tarihi
    'DOSYA AÇILIŞ TARİHİ' => 'acilis_tarihi',  // Alternatif isim
    'DOSYA AŞAMA DURUMU'  => 'asama',          // Yeni isim (export formatı)
    'AŞAMA'               => 'asama',           // Eski isim (geriye uyumlu)
    'TELEFON'             => 'telefon',
    'TELEFON 2'           => 'telefon2',
    'E-POSTA'             => 'email',
    'POLİÇE NO'           => 'police_no',
    'KAZA İL'             => 'kaza_il',
    'KAZA İLÇE'           => 'kaza_ilce',
    'PLAKA'               => 'ma_plaka',
    'MARKA'               => 'marka',
    'MODEL'               => 'model',
    'MODEL YILI'          => 'model_yili',
    'KARŞI PLAKA'         => 'ka_plaka',
    'KARŞI SİGORTA'       => 'ka_trafik',
    'NOTLAR'              => 'notlar',
];

// Hangi sütun hangi index'te?
$colIndex = [];
foreach ($headers as $i => $h) {
    if (isset($sutunMap[$h])) {
        $colIndex[$sutunMap[$h]] = $i;
    }
}

// Zorunlu sütun kontrolü
$zorunlu = ['dosya_turu', 'ad_soyad'];
$eksik = [];
foreach ($zorunlu as $z) {
    if (!isset($colIndex[$z])) {
        $eksik[] = array_search($z, $sutunMap) ?: $z;
    }
}
if (!empty($eksik)) {
    json_error('CSV dosyasında zorunlu sütunlar eksik: ' . implode(', ', $eksik), 422);
}

$db = getDB();
$basarili = 0;
$hatali = 0;
$hatalar = [];
$olusturulan = [];

// ESKİ SİSTEM DOSYALARI: acilis_tarihi kolonu + eski_sistem flag migrasyonu
// Bu sayede toplu aktarılan dosyalar orijinal tarihleriyle kayıt altına alınır
// ve güncel ay dosya sayısı / finansal tabloyu etkilemez
try {
    $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS eski_sistem TINYINT(1) DEFAULT 0");
} catch (\Exception $e) {}

// Dosya türü eşleştirme haritası (Excel'deki uzun isimler → sistem kodu)
$dosyaTuruMap = [
    'A.D.KAYBI'     => 'ADK',
    'ADK'           => 'ADK',
    'ARAÇ DEĞER KAYBI' => 'ADK',
    'MÜRACAAT'      => 'BH',
    'BH'            => 'BH',
    'BEDENİ HASAR'  => 'BH',
    'BEDENI HASAR'  => 'BH',
];

// Tarih çözümleyici (GG.AA.YYYY / GG/AA/YYYY / YYYY-MM-DD / Excel serial → Y-m-d)
$parseTarih = function($raw) {
    $raw = trim((string)$raw);
    if ($raw === '') return null;
    if (preg_match('#^(\d{2})[./](\d{2})[./](\d{4})$#', $raw, $m)) {
        return $m[3] . '-' . $m[2] . '-' . $m[1];
    }
    if (preg_match('#^(\d{4})-(\d{2})-(\d{2})$#', $raw)) {
        return $raw;
    }
    if (preg_match('#^(\d{1,2})/(\d{1,2})/(\d{2,4})$#', $raw, $m)) {
        $yil = (int)$m[3];
        if ($yil < 100) $yil += ($yil > 50 ? 1900 : 2000);
        return $yil . '-' . str_pad($m[1], 2, '0', STR_PAD_LEFT) . '-' . str_pad($m[2], 2, '0', STR_PAD_LEFT);
    }
    if (is_numeric($raw) && (int)$raw > 30000 && (int)$raw < 60000) {
        $unixTs = ((int)$raw - 25569) * 86400;
        return date('Y-m-d', $unixTs);
    }
    return null;
};

// Veri satırlarını işle (başlık satırını atla)
$dataLines = array_slice(array_values($lines), 1);

foreach ($dataLines as $lineIdx => $line) {
    $satirNo = $lineIdx + 2; // Excel'deki satır numarası (1=başlık)
    $cols = str_getcsv($line, $separator);

    // Boş satır atla
    if (empty(array_filter($cols, function($c) { return trim($c) !== ''; }))) {
        continue;
    }

    // Değerleri al
    $getValue = function($field) use ($colIndex, $cols) {
        if (!isset($colIndex[$field])) return '';
        $idx = $colIndex[$field];
        return isset($cols[$idx]) ? trim($cols[$idx]) : '';
    };

    $dosyaTuruRaw = mb_strtoupper(trim($getValue('dosya_turu')), 'UTF-8');
    $adSoyad = $getValue('ad_soyad');

    // Zorunlu alan kontrolü
    if (empty($adSoyad)) {
        $hatali++;
        $hatalar[] = "Satır $satirNo: ADI SOYADI boş olamaz";
        continue;
    }

    // Dosya türü eşleştirme (A.D.KAYBI → ADK, MÜRACAAT → BH, vb.)
    $dosyaTuru = isset($dosyaTuruMap[$dosyaTuruRaw]) ? $dosyaTuruMap[$dosyaTuruRaw] : $dosyaTuruRaw;
    if (!in_array($dosyaTuru, ['ADK', 'BH'])) {
        $hatali++;
        $hatalar[] = "Satır $satirNo: DOSYA TÜRÜ 'ADK' veya 'BH' olmalı (Girilen: '$dosyaTuruRaw')";
        continue;
    }

    // Tarih formatlarını dönüştür → YYYY-MM-DD
    $kazaTarihi = $parseTarih($getValue('kaza_tarihi'));
    $acilisTarihiRaw = $parseTarih($getValue('acilis_tarihi'));

    try {
        $db->beginTransaction();

        // Dosya No üret
        $dosyaNo = generate_dosya_no($db);

        $asama = $getValue('asama');
        if (empty($asama)) $asama = 'Dosya Açık';

        // ═══ AÇILIŞ TARİHİ MANTIĞI ═══
        // Kullanıcı AÇILIŞ TARİHİ girdiyse:
        //   → Eski sistem dosyası olarak kabul edilir (eski_sistem = 1)
        //   → acilis_tarihi ve created_at o tarihe ayarlanır
        //   → Güncel ay dosya sayımına ve finansal tabloya girmez
        // AÇILIŞ TARİHİ boşsa:
        //   → Yeni dosya olarak bugün tarihiyle açılır (eski_sistem = 0)
        $eskiSistem = !empty($acilisTarihiRaw) ? 1 : 0;
        $acilisTarihiSQL = !empty($acilisTarihiRaw) ? $acilisTarihiRaw : date('Y-m-d');

        // created_at: Eski sistem dosyasıysa açılış tarihi 12:00:00, değilse NOW()
        $createdAtValue = null;
        if ($eskiSistem) {
            // Satır sırasını korumak için saniye ofseti ekle
            $offset = $lineIdx;
            $createdAtValue = $acilisTarihiRaw . ' 12:00:' . str_pad(($offset % 60), 2, '0', STR_PAD_LEFT);
        }

        // 1. Dosya kaydı (AÇILIŞ TARİHİ parametre olarak geçirilir)
        if ($createdAtValue) {
            $stmt = $db->prepare('INSERT INTO dosyalar (dosya_no, dosya_turu, asama, sigorta_sirket, police_no, dosya_kaynagi, haklilik, kaza_tarihi, kaza_il, kaza_ilce, hasar_no, acilis_tarihi, notlar, eski_sistem, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, 100, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaNo,
                $dosyaTuru,
                clean($asama),
                clean($getValue('sigorta_sirket')),
                clean($getValue('police_no')),
                clean($getValue('dosya_kaynagi')),
                $kazaTarihi,
                clean($getValue('kaza_il')),
                clean($getValue('kaza_ilce')),
                clean($getValue('hasar_no')),
                $acilisTarihiSQL,
                clean($getValue('notlar')),
                $eskiSistem,
                $user['id'],
                $createdAtValue
            ]);
        } else {
            $stmt = $db->prepare('INSERT INTO dosyalar (dosya_no, dosya_turu, asama, sigorta_sirket, police_no, dosya_kaynagi, haklilik, kaza_tarihi, kaza_il, kaza_ilce, hasar_no, acilis_tarihi, notlar, eski_sistem, created_by) VALUES (?, ?, ?, ?, ?, ?, 100, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaNo,
                $dosyaTuru,
                clean($asama),
                clean($getValue('sigorta_sirket')),
                clean($getValue('police_no')),
                clean($getValue('dosya_kaynagi')),
                $kazaTarihi,
                clean($getValue('kaza_il')),
                clean($getValue('kaza_ilce')),
                clean($getValue('hasar_no')),
                $acilisTarihiSQL,
                clean($getValue('notlar')),
                $eskiSistem,
                $user['id']
            ]);
        }

        $dosyaId = (int)$db->lastInsertId();

        // 2. Mağdur kaydı
        $stmt = $db->prepare('INSERT INTO magdurlar (dosya_id, tc_kimlik, ad_soyad, telefon, telefon2, email) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $dosyaId,
            clean($getValue('tc_kimlik')),
            clean($adSoyad),
            clean($getValue('telefon')),
            clean($getValue('telefon2')),
            clean($getValue('email'))
        ]);

        // 3. Mağdur araç kaydı (plaka varsa)
        $maPlaka = $getValue('ma_plaka');
        if (!empty($maPlaka)) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, marka, model, model_yili) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaId,
                'magdur',
                format_plaka($maPlaka),
                clean($getValue('marka')),
                clean($getValue('model')),
                !empty($getValue('model_yili')) ? (int)$getValue('model_yili') : null
            ]);
        }

        // 4. Karşı araç kaydı (plaka varsa)
        $kaPlaka = $getValue('ka_plaka');
        if (!empty($kaPlaka)) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, trafik_sirket) VALUES (?, ?, ?, ?)');
            $stmt->execute([
                $dosyaId,
                'karsi',
                format_plaka($kaPlaka),
                clean($getValue('ka_trafik'))
            ]);
        }

        $db->commit();
        $basarili++;
        $olusturulan[] = [
            'satir' => $satirNo,
            'dosya_no' => $dosyaNo,
            'ad_soyad' => $adSoyad,
            'dosya_turu' => $dosyaTuru,
            'eski_sistem' => $eskiSistem,
            'acilis_tarihi' => $acilisTarihiSQL
        ];

    } catch (\Exception $e) {
        $db->rollBack();
        $hatali++;
        $hatalar[] = "Satır $satirNo ($adSoyad): " . $e->getMessage();
    }
}

// Log kaydı
log_action($user['id'], 'toplu_dosya_aktarim', "Toplu aktarım: $basarili başarılı, $hatali hatalı", 'dosyalar');

json_success([
    'basarili' => $basarili,
    'hatali' => $hatali,
    'toplam' => $basarili + $hatali,
    'hatalar' => array_slice($hatalar, 0, 20),
    'olusturulan' => array_slice($olusturulan, 0, 50)
], "Toplu aktarım tamamlandı: $basarili başarılı" . ($hatali > 0 ? ", $hatali hatalı" : ''));
