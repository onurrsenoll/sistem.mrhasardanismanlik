<?php
/**
 * POST /api/v1/police/excel-import.php
 * Toplu poliçe yükleme (Excel'den parse edilmiş JSON veri)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();

if (empty($body['policeler']) || !is_array($body['policeler'])) {
    json_error('Poliçe verisi bulunamadı', 422);
}

$db = getDB();
$basarili = 0;
$hatali = 0;
$hatalar = [];

$db->beginTransaction();
try {
    $insertStmt = $db->prepare('INSERT INTO policeler (
        police_no, yenileme_no, police_turu, sigorta_sirketi, brans,
        musteri_adi, musteri_tc, musteri_telefon, musteri_email, plaka,
        tanzim_tarihi, baslangic_tarihi, bitis_tarihi,
        brut_prim, net_prim, komisyon_orani, komisyon_tutari,
        tahsil_edilen, tahsilat_durumu, durum,
        hatirlatma_gun, hatirlatma_gonderildi, notlar, olusturan_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, \'beklemede\', \'aktif\', 20, 0, ?, ?)');

    $checkStmt = $db->prepare('SELECT id FROM policeler WHERE police_no = ?');

    foreach ($body['policeler'] as $i => $p) {
        $sira = $i + 1;

        // Zorunlu alan kontrolleri
        $policeNo = trim($p['police_no'] ?? '');
        $musteriAdi = trim($p['musteri_adi'] ?? '');
        $sigortaSirketi = trim($p['sigorta_sirketi'] ?? '');
        $brans = trim($p['brans'] ?? '');
        $baslangicTarihi = trim($p['baslangic_tarihi'] ?? '');
        $bitisTarihi = trim($p['bitis_tarihi'] ?? '');
        $brutPrim = (float)($p['brut_prim'] ?? 0);

        if ($policeNo === '') {
            $hatali++;
            $hatalar[] = "Satır {$sira}: Poliçe No boş";
            continue;
        }
        if ($musteriAdi === '') {
            $hatali++;
            $hatalar[] = "Satır {$sira}: Müşteri adı boş";
            continue;
        }
        if ($sigortaSirketi === '') {
            $hatali++;
            $hatalar[] = "Satır {$sira}: Sigorta şirketi boş";
            continue;
        }

        // Poliçe no tekrarı kontrolü
        $checkStmt->execute([$policeNo]);
        if ($checkStmt->fetch()) {
            $hatali++;
            $hatalar[] = "Satır {$sira}: {$policeNo} zaten mevcut";
            continue;
        }

        $netPrim = (float)($p['net_prim'] ?? 0);
        $komisyonOrani = (float)($p['komisyon_orani'] ?? 0);
        $komisyonTutari = $netPrim > 0 && $komisyonOrani > 0 ? $netPrim * $komisyonOrani / 100 : 0;
        $tanzimTarihi = !empty($baslangicTarihi) ? $baslangicTarihi : date('Y-m-d');

        try {
            $insertStmt->execute([
                clean($policeNo),
                clean($p['yenileme_no'] ?? ''),
                'yeni',
                clean($sigortaSirketi),
                clean($brans ?: 'DİĞER'),
                clean($musteriAdi),
                clean($p['musteri_tc'] ?? ''),
                clean($p['musteri_telefon'] ?? ''),
                clean($p['musteri_email'] ?? ''),
                clean($p['plaka'] ?? ''),
                $tanzimTarihi,
                $baslangicTarihi ?: null,
                $bitisTarihi ?: null,
                $brutPrim,
                $netPrim,
                $komisyonOrani,
                $komisyonTutari,
                clean($p['notlar'] ?? ''),
                $user['id']
            ]);
            $basarili++;
        } catch (Exception $e) {
            $hatali++;
            $hatalar[] = "Satır {$sira}: " . $e->getMessage();
        }
    }

    $db->commit();

    log_action($user['id'], 'police_excel_import',
        "Excel ile toplu yükleme: {$basarili} başarılı, {$hatali} hatalı",
        'policeler', null);

    json_success([
        'basarili' => $basarili,
        'hatali' => $hatali,
        'toplam' => count($body['policeler']),
        'hatalar' => array_slice($hatalar, 0, 20)
    ], "{$basarili} poliçe başarıyla yüklendi" . ($hatali > 0 ? ", {$hatali} hatalı" : ''), 201);

} catch (Exception $e) {
    $db->rollBack();
    json_error('Toplu yükleme hatası: ' . $e->getMessage(), 500);
}
