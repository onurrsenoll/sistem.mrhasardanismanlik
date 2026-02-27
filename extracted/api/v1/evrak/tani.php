<?php
/**
 * GET /api/v1/evrak/tani.php?dosya_id=5
 * POST /api/v1/evrak/tani.php (body: {dosya_id: 5, onar: true})
 *
 * ADMİN İÇİN EVRAK DOSYA EŞLEŞTİRME TANI VE ONARIM ARACI
 * Veritabanındaki evrak kayıtlarını diskteki dosyalarla karşılaştırır
 * ve uyumsuzlukları tespit eder / onarır
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET', 'POST');

$user = auth_required(['admin']);
$db = getDB();

$dosyaId = 0;
$onar = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = get_json_body();
    $dosyaId = (int)($data['dosya_id'] ?? 0);
    $onar = !empty($data['onar']);
} else {
    $dosyaId = (int)($_GET['dosya_id'] ?? 0);
}

if (!$dosyaId) {
    json_error('dosya_id gerekli', 422);
}

$uploadBase = rtrim(UPLOAD_DIR, '/') . '/';

// Bu dosyaya ait tüm evrakları çek
$stmt = $db->prepare('SELECT id, evrak_turu, dosya_adi, sunucu_adi, dosya_yolu, dosya_boyutu, mime_type, created_at FROM evraklar WHERE dosya_id = ? ORDER BY created_at ASC');
$stmt->execute([$dosyaId]);
$evraklar = $stmt->fetchAll();

$sonuc = [
    'dosya_id' => $dosyaId,
    'evrak_sayisi' => count($evraklar),
    'upload_dir' => UPLOAD_DIR,
    'evraklar' => [],
    'disk_dosyalar' => [],
    'sorunlar' => [],
    'onarilan' => 0
];

// Her evrağı kontrol et
$klasorler = [];
foreach ($evraklar as $e) {
    $dosyaYolu = $e['dosya_yolu'] ?? '';
    if (strpos($dosyaYolu, 'uploads/') === 0) $dosyaYolu = substr($dosyaYolu, 8);

    $tamYol = $uploadBase . $dosyaYolu;
    $bulundu = file_exists($tamYol) && is_file($tamYol);

    $evrakBilgi = [
        'id' => $e['id'],
        'evrak_turu' => $e['evrak_turu'],
        'dosya_adi' => $e['dosya_adi'],
        'sunucu_adi' => $e['sunucu_adi'],
        'dosya_yolu' => $dosyaYolu,
        'dosya_boyutu' => (int)$e['dosya_boyutu'],
        'boyut_kb' => round((int)$e['dosya_boyutu'] / 1024, 1) . 'KB',
        'diskde_bulundu' => $bulundu,
        'tam_yol' => $tamYol,
        'created_at' => $e['created_at']
    ];

    if (!$bulundu) {
        $sonuc['sorunlar'][] = 'EVRAK #' . $e['id'] . ' (' . $e['evrak_turu'] . '): DISKDE BULUNAMADI → ' . $dosyaYolu;
    }

    $sonuc['evraklar'][] = $evrakBilgi;

    // Klasörü kaydet
    if (preg_match('#(\d{4}/\d{2})/#', $dosyaYolu, $km)) {
        $klasorler[$km[1]] = true;
    }
}

// İlgili klasörlerdeki tüm dosyaları listele
foreach (array_keys($klasorler) as $klasorAdi) {
    $klasorYolu = $uploadBase . $klasorAdi;
    if (!is_dir($klasorYolu)) {
        $sonuc['disk_dosyalar'][$klasorAdi] = ['KLASÖR_MEVCUT_DEĞİL'];
        continue;
    }
    $dosyalar = array_diff(scandir($klasorYolu), ['.', '..']);
    $dosyaBilgileri = [];
    foreach ($dosyalar as $d) {
        $dPath = $klasorYolu . '/' . $d;
        if (is_file($dPath)) {
            $dosyaBilgileri[] = [
                'ad' => $d,
                'boyut' => filesize($dPath),
                'boyut_kb' => round(filesize($dPath) / 1024, 1) . 'KB'
            ];
        }
    }
    $sonuc['disk_dosyalar'][$klasorAdi] = $dosyaBilgileri;
}

// ONARIM MODU
if ($onar && !empty($sonuc['sorunlar'])) {
    $onarSayisi = 0;

    foreach ($evraklar as $e) {
        $dosyaYolu = $e['dosya_yolu'] ?? '';
        if (strpos($dosyaYolu, 'uploads/') === 0) $dosyaYolu = substr($dosyaYolu, 8);
        $tamYol = $uploadBase . $dosyaYolu;

        // Zaten bulunuyorsa geç
        if (file_exists($tamYol) && is_file($tamYol)) continue;

        // Klasördeki dosyaları tarayarak eşleştir
        if (preg_match('#(\d{4}/\d{2})/#', $dosyaYolu, $km)) {
            $klasorYolu = $uploadBase . $km[1];
            if (!is_dir($klasorYolu)) continue;

            $dosyalar = array_diff(scandir($klasorYolu), ['.', '..']);
            $uzanti = strtolower(pathinfo($e['sunucu_adi'] ?? '', PATHINFO_EXTENSION) ?: 'pdf');
            $boyut = (int)($e['dosya_boyutu'] ?? 0);

            // Boyut eşleşmesi
            if ($boyut > 0) {
                foreach ($dosyalar as $d) {
                    $dPath = $klasorYolu . '/' . $d;
                    if (!is_file($dPath)) continue;
                    if (strtolower(pathinfo($d, PATHINFO_EXTENSION)) !== $uzanti) continue;

                    $diskBoyut = filesize($dPath);
                    if (abs($diskBoyut - $boyut) <= 10) {
                        // Başka evrak kullanıyor mu?
                        $kontrol = $db->prepare('SELECT id FROM evraklar WHERE sunucu_adi = ? AND id != ?');
                        $kontrol->execute([$d, $e['id']]);
                        if ($kontrol->fetch()) continue;

                        // Eşleşti! DB'yi güncelle
                        $fix = $db->prepare('UPDATE evraklar SET sunucu_adi = ?, dosya_yolu = ? WHERE id = ?');
                        $fix->execute([$d, $km[1] . '/' . $d, $e['id']]);
                        $onarSayisi++;
                        break;
                    }
                }
            }
        }
    }

    $sonuc['onarilan'] = $onarSayisi;
    if ($onarSayisi > 0) {
        log_action($user['id'], 'evrak_onarim', "Dosya #$dosyaId: $onarSayisi evrak onarıldı", 'evraklar', $dosyaId);
    }
}

json_success($sonuc);
