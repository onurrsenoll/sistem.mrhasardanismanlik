<?php
/**
 * POST /api/v1/police/excel-import.php
 * Toplu poliçe yükleme — v2.11.1: lenient validation + marka/model_yili.
 *
 * v2.11.1 değişiklikleri:
 *  • Eksik müşteri adı / sigorta şirketi → 'BELİRSİZ' placeholder, satır kaybolmaz
 *  • Eksik poliçe no → otomatik fallback üretilir (IMP-microtime-rand)
 *  • marka, model_yili kolonları kabul ediliyor (DDL ile garanti)
 *  • Tarih parse: PHP ile DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD desteklenir
 *  • Yanıt 'basarili' (frontend bunu okur) + 'eklenen' (eski uyumluluk)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(); // v2.11: rol kısıtı kaldırıldı, yetki matrisi tek otorite
$body = get_json_body();

if (empty($body['policeler']) || !is_array($body['policeler'])) {
    json_error('Poliçe verisi bulunamadı', 422);
}

$db = getDB();
$basarili = 0;
$hatali = 0;
$hatalar = [];

/* DDL: yeni kolonları idempotent ekle */
try {
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS belge_seri VARCHAR(50) DEFAULT ''");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS dogum_tarihi DATE DEFAULT NULL");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS sase_no VARCHAR(50) DEFAULT ''");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS personel VARCHAR(120) DEFAULT ''");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS marka VARCHAR(60) DEFAULT ''");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS model_yili VARCHAR(8) DEFAULT ''");
} catch (Exception $e) {}

/**
 * Sağlam tarih parser: ISO, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
 * Tanınmazsa null döner (NULL gönderim için).
 */
if (!function_exists('v211_parse_date')) {
    function v211_parse_date($v) {
        if ($v === null || $v === '' || $v === false) return null;
        $s = trim((string)$v);
        if ($s === '') return null;
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $s, $m)) {
            return $m[1] . '-' . $m[2] . '-' . $m[3];
        }
        if (preg_match('/^(\d{1,2})[.\/\-\s]+(\d{1,2})[.\/\-\s]+(\d{4})/', $s, $m)) {
            $d = (int)$m[1]; $mo = (int)$m[2]; $y = (int)$m[3];
            if ($d>=1 && $d<=31 && $mo>=1 && $mo<=12 && $y>=1900 && $y<=2100) {
                return sprintf('%04d-%02d-%02d', $y, $mo, $d);
            }
        }
        $ts = strtotime($s);
        if ($ts !== false) return date('Y-m-d', $ts);
        return null;
    }
}

$db->beginTransaction();
try {
    $insertStmt = $db->prepare('INSERT INTO policeler (
        police_no, yenileme_no, police_turu, sigorta_sirketi, brans,
        musteri_adi, musteri_tc, musteri_telefon, musteri_email, plaka,
        tanzim_tarihi, baslangic_tarihi, bitis_tarihi,
        brut_prim, net_prim, komisyon_orani, komisyon_tutari,
        tahsil_edilen, tahsilat_durumu, durum,
        hatirlatma_gun, hatirlatma_gonderildi, notlar, olusturan_id,
        belge_seri, dogum_tarihi, sase_no, personel, marka, model_yili
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, \'beklemede\', \'aktif\', 20, 0, ?, ?, ?, ?, ?, ?, ?, ?)');

    $checkStmt = $db->prepare('SELECT id FROM policeler WHERE police_no = ?');

    foreach ($body['policeler'] as $i => $p) {
        $sira = $i + 1;

        /* v2.11.1: hiçbir alanı reddetme — boş ise placeholder/NULL ile devam et */
        $policeNo = trim($p['police_no'] ?? '');
        if ($policeNo === '') {
            $policeNo = 'IMP-' . substr((string)round(microtime(true) * 1000), -10) . '-' . str_pad((string)$sira, 3, '0', STR_PAD_LEFT) . '-' . random_int(1000, 9999);
        }

        $musteriAdi     = trim($p['musteri_adi'] ?? '');
        if ($musteriAdi === '') $musteriAdi = 'BELİRSİZ';

        $sigortaSirketi = trim($p['sigorta_sirketi'] ?? '');
        if ($sigortaSirketi === '') $sigortaSirketi = 'BELİRSİZ';

        $brans = trim($p['brans'] ?? '');
        if ($brans === '') $brans = 'TRAFİK';

        $bitisTarihi     = v211_parse_date($p['bitis_tarihi'] ?? null);
        $baslangicTarihi = v211_parse_date($p['baslangic_tarihi'] ?? null);
        $tanzimTarihi    = v211_parse_date($p['tanzim_tarihi'] ?? null);
        if (!$tanzimTarihi) $tanzimTarihi = $baslangicTarihi ?: date('Y-m-d');
        if (!$baslangicTarihi && $bitisTarihi) {
            try {
                $dt = new DateTime($bitisTarihi);
                $dt->modify('-1 year');
                $baslangicTarihi = $dt->format('Y-m-d');
            } catch (\Exception $e) { $baslangicTarihi = null; }
        }
        $dogumTarihi = v211_parse_date($p['dogum_tarihi'] ?? null);

        /* Poliçe no çakışmasında otomatik suffix ekle (kaybetme) */
        $checkStmt->execute([$policeNo]);
        if ($checkStmt->fetch()) {
            $tryNo = $policeNo . '-' . substr((string)round(microtime(true) * 1000), -6);
            $checkStmt->execute([$tryNo]);
            if ($checkStmt->fetch()) {
                $hatali++;
                $hatalar[] = "Satır {$sira}: {$policeNo} ÇAKIŞMA (tekrarlanan)";
                continue;
            }
            $policeNo = $tryNo;
        }

        $netPrim = (float)($p['net_prim'] ?? 0);
        $komisyonOrani = (float)($p['komisyon_orani'] ?? 0);
        $komisyonTutari = $netPrim > 0 && $komisyonOrani > 0 ? $netPrim * $komisyonOrani / 100 : 0;
        $brutPrim = (float)($p['brut_prim'] ?? 0);

        try {
            $insertStmt->execute([
                clean($policeNo),
                clean($p['yenileme_no'] ?? ''),
                'yeni',
                clean($sigortaSirketi),
                clean($brans),
                clean($musteriAdi),
                clean($p['musteri_tc'] ?? ''),
                clean($p['musteri_telefon'] ?? ''),
                clean($p['musteri_email'] ?? ''),
                clean($p['plaka'] ?? ''),
                $tanzimTarihi,
                $baslangicTarihi,
                $bitisTarihi,
                $brutPrim,
                $netPrim,
                $komisyonOrani,
                $komisyonTutari,
                clean($p['notlar'] ?? ''),
                $user['id'],
                clean($p['belge_seri'] ?? ''),
                $dogumTarihi,
                clean($p['sase_no'] ?? ''),
                clean($p['personel'] ?? ''),
                clean($p['marka'] ?? ''),
                clean($p['model_yili'] ?? '')
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
        'eklenen'  => $basarili, /* eski client uyumluluğu */
        'hatali'   => $hatali,
        'toplam'   => count($body['policeler']),
        'hatalar'  => array_slice($hatalar, 0, 25)
    ], "{$basarili} poliçe başarıyla yüklendi" . ($hatali > 0 ? ", {$hatali} hatalı" : ''), 201);

} catch (Exception $e) {
    $db->rollBack();
    json_error('Toplu yükleme hatası: ' . $e->getMessage(), 500);
}
