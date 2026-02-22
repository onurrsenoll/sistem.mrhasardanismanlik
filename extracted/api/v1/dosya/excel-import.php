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
$sutunMap = [
    'DOSYA TÜRÜ'        => 'dosya_turu',
    'BAŞVURU TÜRÜ'      => 'talep_turu',
    'ADI SOYADI'        => 'ad_soyad',
    'T.C. KİMLİK'       => 'tc_kimlik',
    'TELEFON'           => 'telefon',
    'TELEFON 2'         => 'telefon2',
    'E-POSTA'           => 'email',
    'SİGORTA ŞİRKETİ'   => 'sigorta_sirket',
    'HASAR NO'          => 'hasar_no',
    'POLİÇE NO'         => 'police_no',
    'KAZA TARİHİ'        => 'kaza_tarihi',
    'KAZA İL'            => 'kaza_il',
    'KAZA İLÇE'          => 'kaza_ilce',
    'PLAKA'             => 'ma_plaka',
    'MARKA'             => 'marka',
    'MODEL'             => 'model',
    'MODEL YILI'        => 'model_yili',
    'KARŞI PLAKA'        => 'ka_plaka',
    'KARŞI SİGORTA'      => 'ka_trafik',
    'DOSYA KAYNAĞI'      => 'dosya_kaynagi',
    'AŞAMA'              => 'asama',
    'NOTLAR'            => 'notlar',
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

    $dosyaTuru = mb_strtoupper($getValue('dosya_turu'), 'UTF-8');
    $adSoyad = $getValue('ad_soyad');

    // Zorunlu alan kontrolü
    if (empty($adSoyad)) {
        $hatali++;
        $hatalar[] = "Satır $satirNo: ADI SOYADI boş olamaz";
        continue;
    }
    if (!in_array($dosyaTuru, ['ADK', 'BH'])) {
        $hatali++;
        $hatalar[] = "Satır $satirNo: DOSYA TÜRÜ 'ADK' veya 'BH' olmalı (Girilen: '$dosyaTuru')";
        continue;
    }

    // Tarih formatını dönüştür (GG.AA.YYYY → YYYY-MM-DD)
    $kazaTarihi = $getValue('kaza_tarihi');
    if (!empty($kazaTarihi)) {
        // Çeşitli formatları dene
        if (preg_match('#^(\d{2})[./](\d{2})[./](\d{4})$#', $kazaTarihi, $m)) {
            $kazaTarihi = $m[3] . '-' . $m[2] . '-' . $m[1]; // YYYY-MM-DD
        } elseif (preg_match('#^(\d{4})-(\d{2})-(\d{2})$#', $kazaTarihi)) {
            // Zaten YYYY-MM-DD formatında
        } else {
            $kazaTarihi = null;
        }
    } else {
        $kazaTarihi = null;
    }

    try {
        $db->beginTransaction();

        // Dosya No üret
        $dosyaNo = generate_dosya_no($db);

        $asama = $getValue('asama');
        if (empty($asama)) $asama = 'Dosya Açık';

        // 1. Dosya kaydı
        $stmt = $db->prepare('INSERT INTO dosyalar (dosya_no, dosya_turu, talep_turu, asama, sigorta_sirket, police_no, dosya_kaynagi, haklilik, kaza_tarihi, kaza_il, kaza_ilce, hasar_no, acilis_tarihi, notlar, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 100, ?, ?, ?, ?, CURDATE(), ?, ?)');
        $stmt->execute([
            $dosyaNo,
            $dosyaTuru,
            clean($getValue('talep_turu')),
            clean($asama),
            clean($getValue('sigorta_sirket')),
            clean($getValue('police_no')),
            clean($getValue('dosya_kaynagi')),
            $kazaTarihi,
            clean($getValue('kaza_il')),
            clean($getValue('kaza_ilce')),
            clean($getValue('hasar_no')),
            clean($getValue('notlar')),
            $user['id']
        ]);

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
            'dosya_turu' => $dosyaTuru
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
