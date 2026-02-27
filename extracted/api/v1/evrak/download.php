<?php
/**
 * GET /api/v1/evrak/download.php?id=1
 * Evrak indir / önizle (PDF, resim vb.)
 *
 * ÇOK KATMANLI DOSYA ARAMA SİSTEMİ:
 * 1. Tam yol eşleşmesi (dosya_yolu)
 * 2. sunucu_adi ile alt klasörlerde arama
 * 3. Dosya boyutu + uzantı eşleşmesiyle akıllı eşleme
 * 4. Aynı klasördeki tüm dosyaları tarayarak eşleşme
 * 5. Bulunamazsa → detaylı tanı bilgisi (admin için)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

// CORS headers
$origin = isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== '' ? $_SERVER['HTTP_ORIGIN'] : '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($origin !== '*') {
    header('Access-Control-Allow-Credentials: true');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$evrakId = (int)($_GET['id'] ?? 0);
$smsToken = $_GET['token'] ?? '';

// SMS TOKEN İLE ERİŞİM
if (!empty($smsToken) && $evrakId > 0) {
    $smsHelperPath = __DIR__ . '/../../config/sms_helper.php';
    if (file_exists($smsHelperPath)) {
        require_once $smsHelperPath;
        if (!sms_evrak_token_dogrula($smsToken, $evrakId)) {
            header('Content-Type: application/json');
            json_error('EVRAK LİNKİ GEÇERSİZ VEYA SÜRESİ DOLMUŞ', 403);
        }
    } else {
        header('Content-Type: application/json');
        json_error('SMS TOKEN DOĞRULAMA MODÜLÜ BULUNAMADI', 500);
    }
} else {
    $user = auth_required();
}

if (!$evrakId) {
    header('Content-Type: application/json');
    json_error('Evrak ID gerekli', 422);
}

$db = getDB();
$stmt = $db->prepare('SELECT * FROM evraklar WHERE id = ?');
$stmt->execute([$evrakId]);
$evrak = $stmt->fetch();

if (!$evrak) {
    header('Content-Type: application/json');
    json_error('Evrak bulunamadı (ID: ' . $evrakId . ')', 404);
}

// ═══════════════════════════════════════════════════
// ÇOK KATMANLI DOSYA ARAMA MOTORU
// ═══════════════════════════════════════════════════

$dosyaYolu = $evrak['dosya_yolu'] ?? '';
$sunucuAdi = $evrak['sunucu_adi'] ?? '';
$dosyaAdiOrijinal = $evrak['dosya_adi'] ?? '';
$dosyaBoyutu = (int)($evrak['dosya_boyutu'] ?? 0);
$mimeTypeDB = $evrak['mime_type'] ?? '';
$filePath = null;

// dosya_yolu başında uploads/ varsa temizle
if (strpos($dosyaYolu, 'uploads/') === 0) {
    $dosyaYolu = substr($dosyaYolu, 8);
}

// UPLOAD_DIR normalize (sonunda / olsun)
$uploadBase = rtrim(UPLOAD_DIR, '/') . '/';

// realpath alternatifi
$realUploadBase = realpath(UPLOAD_DIR);
if ($realUploadBase) $realUploadBase = rtrim($realUploadBase, '/') . '/';

// Document root bazlı alternatifler
$docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/');
$parentRoot = dirname($docRoot);

// ─── KATMAN 1: TAM YOL EŞLEŞMESİ ───
$adayYollar = [];

if ($dosyaYolu) {
    $adayYollar[] = $uploadBase . $dosyaYolu;
    $adayYollar[] = $uploadBase . ltrim($dosyaYolu, '/');
    if ($realUploadBase) {
        $adayYollar[] = $realUploadBase . $dosyaYolu;
        $adayYollar[] = $realUploadBase . ltrim($dosyaYolu, '/');
    }
    $adayYollar[] = $docRoot . '/uploads/' . $dosyaYolu;
    $adayYollar[] = $parentRoot . '/uploads/' . $dosyaYolu;
}

// ─── KATMAN 2: SUNUCU_ADI İLE FARKLI KONUMLARDA ARAMA ───
if ($sunucuAdi) {
    // Yıl/ay klasöründe
    if (preg_match('#(\d{4})/(\d{2})/#', $dosyaYolu, $ym)) {
        $adayYollar[] = $uploadBase . $ym[1] . '/' . $ym[2] . '/' . $sunucuAdi;
        if ($realUploadBase) $adayYollar[] = $realUploadBase . $ym[1] . '/' . $ym[2] . '/' . $sunucuAdi;
    }
    // Şuanki yıl/ay
    $yil = date('Y');
    $ay = date('m');
    $adayYollar[] = $uploadBase . $yil . '/' . $ay . '/' . $sunucuAdi;
    // Doğrudan uploads/ altında
    $adayYollar[] = $uploadBase . $sunucuAdi;
    if ($realUploadBase) $adayYollar[] = $realUploadBase . $sunucuAdi;
    $adayYollar[] = $docRoot . '/uploads/' . $sunucuAdi;
}

// ─── KATMAN 3: BÜYÜK/KÜÇÜK HARF DÖNÜŞÜMLERİ ───
if ($sunucuAdi) {
    $lower = strtolower($sunucuAdi);
    $upper = strtoupper($sunucuAdi);
    if (preg_match('#(\d{4})/(\d{2})/#', $dosyaYolu, $ym)) {
        $adayYollar[] = $uploadBase . $ym[1] . '/' . $ym[2] . '/' . $lower;
        $adayYollar[] = $uploadBase . $ym[1] . '/' . $ym[2] . '/' . $upper;
    }
}

// Tekil yolları dene
foreach (array_unique($adayYollar) as $yol) {
    if ($yol && file_exists($yol) && is_file($yol)) {
        $filePath = $yol;
        break;
    }
}

// ─── KATMAN 4: AKILLI KLASÖR TARAMASI ───
// Dosya hala bulunamadıysa, aynı klasördeki tüm dosyaları tara
// ve dosya boyutu + uzantı ile eşleştirmeye çalış
if (!$filePath && $dosyaYolu) {
    // Klasör yolunu bul
    $klasorYolu = null;
    if (preg_match('#(\d{4}/\d{2})/#', $dosyaYolu, $subDir)) {
        $klasorAday = [
            $uploadBase . $subDir[1],
            $realUploadBase ? $realUploadBase . $subDir[1] : null,
            $docRoot . '/uploads/' . $subDir[1],
            $parentRoot . '/uploads/' . $subDir[1]
        ];
        foreach ($klasorAday as $ka) {
            if ($ka && is_dir($ka)) {
                $klasorYolu = rtrim($ka, '/');
                break;
            }
        }
    }

    if ($klasorYolu) {
        // Klasördeki dosyaları listele
        $dosyalar = array_diff(scandir($klasorYolu), ['.', '..']);
        $uzanti = pathinfo($sunucuAdi ?: $dosyaAdiOrijinal, PATHINFO_EXTENSION);
        $uzanti = strtolower($uzanti ?: 'pdf');

        // ─── 4A: Bu evrak ID'sine ait aynı dosya_id'deki TÜM evrakları çek ───
        // Sonra sıraya göre eşleştir
        $dosyaIdEvrak = (int)($evrak['dosya_id'] ?? 0);
        if ($dosyaIdEvrak > 0) {
            $stmtAll = $db->prepare('SELECT id, sunucu_adi, dosya_adi, dosya_boyutu, dosya_yolu FROM evraklar WHERE dosya_id = ? ORDER BY created_at ASC');
            $stmtAll->execute([$dosyaIdEvrak]);
            $tumEvraklar = $stmtAll->fetchAll();

            // Klasördeki dosyaları boyut sırasına göre al
            $diskDosyalar = [];
            foreach ($dosyalar as $dd) {
                $ddPath = $klasorYolu . '/' . $dd;
                if (is_file($ddPath)) {
                    $diskDosyalar[] = [
                        'name' => $dd,
                        'path' => $ddPath,
                        'size' => filesize($ddPath),
                        'ext'  => strtolower(pathinfo($dd, PATHINFO_EXTENSION))
                    ];
                }
            }

            // STRATEJİ 4A-1: Dosya boyutuyla eşleştir (en güvenilir)
            if ($dosyaBoyutu > 0) {
                foreach ($diskDosyalar as $dd) {
                    // Boyut eşleşmesi (±5 byte tolerans — dosya sistemleri küçük fark gösterebilir)
                    if (abs($dd['size'] - $dosyaBoyutu) <= 5 && $dd['ext'] === $uzanti) {
                        // Bu dosya başka bir evrak tarafından zaten eşleşmiş mi kontrol et
                        $baskaEvrakKullaniyorMu = false;
                        foreach ($tumEvraklar as $te) {
                            if ((int)$te['id'] !== $evrakId) {
                                $teSunucu = $te['sunucu_adi'] ?? '';
                                // Eğer bu disk dosyasının adı başka bir evrağın sunucu_adi'yse
                                if (strcasecmp($dd['name'], $teSunucu) === 0) {
                                    $baskaEvrakKullaniyorMu = true;
                                    break;
                                }
                            }
                        }
                        if (!$baskaEvrakKullaniyorMu) {
                            $filePath = $dd['path'];
                            // DB'yi düzelt (ileride tekrar aramasın)
                            try {
                                $fixStmt = $db->prepare('UPDATE evraklar SET sunucu_adi = ?, dosya_yolu = ? WHERE id = ?');
                                $fixStmt->execute([$dd['name'], $subDir[1] . '/' . $dd['name'], $evrakId]);
                            } catch (Exception $e) {}
                            break;
                        }
                    }
                }
            }

            // STRATEJİ 4A-2: Sıra bazlı eşleştirme
            // DB'deki evraklar ile diskteki dosyalar aynı sırada oluşturulmuş olmalı
            if (!$filePath) {
                // Aynı uzantıdaki dosyaları filtrele
                $ayniUzantiDisk = array_values(array_filter($diskDosyalar, function($d) use ($uzanti) {
                    return $d['ext'] === $uzanti;
                }));
                $ayniUzantiDB = array_values(array_filter($tumEvraklar, function($e) use ($uzanti) {
                    $eUzanti = strtolower(pathinfo($e['sunucu_adi'] ?? '', PATHINFO_EXTENSION) ?: 'pdf');
                    return $eUzanti === $uzanti;
                }));

                // Diskteki dosyaları isme göre sırala (UUID sırası ≈ oluşturma sırası)
                usort($ayniUzantiDisk, function($a, $b) { return strcmp($a['name'], $b['name']); });

                // Bu evrağın sırasını bul
                $evrakSirasi = -1;
                foreach ($ayniUzantiDB as $si => $ae) {
                    if ((int)$ae['id'] === $evrakId) {
                        $evrakSirasi = $si;
                        break;
                    }
                }

                if ($evrakSirasi >= 0 && $evrakSirasi < count($ayniUzantiDisk)) {
                    $eslesen = $ayniUzantiDisk[$evrakSirasi];
                    $filePath = $eslesen['path'];
                    // DB'yi düzelt
                    try {
                        $fixStmt = $db->prepare('UPDATE evraklar SET sunucu_adi = ?, dosya_yolu = ? WHERE id = ?');
                        $fixStmt->execute([$eslesen['name'], $subDir[1] . '/' . $eslesen['name'], $evrakId]);
                    } catch (Exception $e) {}
                }
            }
        }

        // STRATEJİ 4B: Tek dosya varsa ve tek evrak bekleniyorsa
        if (!$filePath) {
            $ayniUzanti = array_filter($dosyalar, function($d) use ($uzanti) {
                return strtolower(pathinfo($d, PATHINFO_EXTENSION)) === $uzanti;
            });
            if (count($ayniUzanti) === 1) {
                $tekDosya = array_values($ayniUzanti)[0];
                $filePath = $klasorYolu . '/' . $tekDosya;
                // DB'yi düzelt
                try {
                    $fixStmt = $db->prepare('UPDATE evraklar SET sunucu_adi = ?, dosya_yolu = ? WHERE id = ?');
                    $fixStmt->execute([$tekDosya, $subDir[1] . '/' . $tekDosya, $evrakId]);
                } catch (Exception $e) {}
            }
        }
    }
}

// ─── KATMAN 5: TÜM UPLOADS KLASÖRÜNÜ REKÜRSİF TARA ───
if (!$filePath && $sunucuAdi) {
    $aramaPaths = [$uploadBase];
    if ($realUploadBase && $realUploadBase !== $uploadBase) $aramaPaths[] = $realUploadBase;

    foreach ($aramaPaths as $base) {
        if (!is_dir($base)) continue;
        // Yıl klasörlerini tara
        $yillar = glob($base . '20*', GLOB_ONLYDIR);
        foreach ($yillar as $yilDir) {
            $aylar = glob($yilDir . '/*', GLOB_ONLYDIR);
            foreach ($aylar as $ayDir) {
                $dene = $ayDir . '/' . $sunucuAdi;
                if (file_exists($dene) && is_file($dene)) {
                    $filePath = $dene;
                    // DB'yi düzelt
                    $yeniYol = basename($yilDir) . '/' . basename($ayDir) . '/' . $sunucuAdi;
                    try {
                        $fixStmt = $db->prepare('UPDATE evraklar SET dosya_yolu = ? WHERE id = ?');
                        $fixStmt->execute([$yeniYol, $evrakId]);
                    } catch (Exception $e) {}
                    break 3;
                }
                // Büyük/küçük harf
                $deneLower = $ayDir . '/' . strtolower($sunucuAdi);
                $deneUpper = $ayDir . '/' . strtoupper($sunucuAdi);
                if (file_exists($deneLower) && is_file($deneLower)) { $filePath = $deneLower; break 3; }
                if (file_exists($deneUpper) && is_file($deneUpper)) { $filePath = $deneUpper; break 3; }
            }
        }
    }
}

// ═══ DOSYA BULUNAMADI → DETAYLI TANI ═══
if (!$filePath) {
    header('Content-Type: application/json');
    $hata = 'EVRAK DOSYASI SUNUCUDA BULUNAMADI';
    $debug = '';

    if (isset($user) && isset($user['rol']) && $user['rol'] === 'admin') {
        $debug .= ' | EVRAK_ID: ' . $evrakId;
        $debug .= ' | DOSYA_ID: ' . ($evrak['dosya_id'] ?? '?');
        $debug .= ' | SUNUCU_ADI: ' . $sunucuAdi;
        $debug .= ' | DOSYA_YOLU: ' . $dosyaYolu;
        $debug .= ' | BOYUT_DB: ' . $dosyaBoyutu . ' byte';
        $debug .= ' | UPLOAD_DIR: ' . UPLOAD_DIR;

        // Klasör bilgisi
        if (preg_match('#(\d{4}/\d{2})/#', $dosyaYolu, $subDir2)) {
            $subPath = $uploadBase . $subDir2[1];
            if (is_dir($subPath)) {
                $files = array_diff(scandir($subPath), ['.', '..']);
                $debug .= ' | KLASÖR(' . $subDir2[1] . ') MEVCUT, ' . count($files) . ' DOSYA: ';
                $fileInfos = [];
                foreach (array_slice($files, 0, 10) as $f) {
                    $fPath = $subPath . '/' . $f;
                    $fSize = is_file($fPath) ? filesize($fPath) : 0;
                    $fileInfos[] = $f . '(' . round($fSize/1024) . 'KB)';
                }
                $debug .= implode(', ', $fileInfos);
            } else {
                $debug .= ' | KLASÖR(' . $subDir2[1] . ') YOK';
                // Hangi klasörler var?
                if (is_dir($uploadBase)) {
                    $yilKlasor = glob($uploadBase . '20*', GLOB_ONLYDIR);
                    $debug .= ' | MEVCUT KLASÖRLER: ';
                    foreach ($yilKlasor as $yk) {
                        $ayKlasor = glob($yk . '/*', GLOB_ONLYDIR);
                        foreach ($ayKlasor as $ak) {
                            $debug .= basename($yk) . '/' . basename($ak) . ' ';
                        }
                    }
                }
            }
        }
    }

    json_error($hata . $debug, 404);
}

// ═══════════════════════════════════════════════════
// DOSYA BULUNDU — GÖNDER
// ═══════════════════════════════════════════════════

// Session kilidi serbest bırak
if (session_status() === PHP_SESSION_ACTIVE) {
    session_write_close();
}

$mode = ($_GET['mode'] ?? 'attachment') === 'inline' ? 'inline' : 'attachment';

// MIME type
$mimeType = $mimeTypeDB;
if (empty($mimeType) || $mimeType === 'application/octet-stream') {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($filePath) ?: 'application/pdf';
}

$fileSize = filesize($filePath);

// Output buffer temizle
while (ob_get_level() > 0) {
    ob_end_clean();
}

// Gzip devre dışı
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
@ini_set('zlib.output_compression', 'Off');
@ini_set('output_buffering', 'Off');

if (function_exists('header_remove')) {
    header_remove('Content-Encoding');
}

// Dosya adı güvenliği
$dosyaAdi = $evrak['dosya_adi'] ?? ('evrak_' . $evrakId . '.pdf');
$asciiAdi = preg_replace('/[^\x20-\x7E]/', '_', $dosyaAdi);
$utf8Adi = rawurlencode($dosyaAdi);

// Dosyayı gönder
header('Content-Type: ' . $mimeType);
header('Content-Disposition: ' . $mode . '; filename="' . $asciiAdi . '"; filename*=UTF-8\'\'' . $utf8Adi);
header('Content-Length: ' . $fileSize);
header('Content-Transfer-Encoding: binary');
header('X-Content-Type-Options: nosniff');
header('Accept-Ranges: bytes');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Dosya stream
if ($fileSize > 5 * 1024 * 1024) {
    $handle = fopen($filePath, 'rb');
    if ($handle) {
        while (!feof($handle)) {
            echo fread($handle, 8192);
            flush();
        }
        fclose($handle);
    } else {
        readfile($filePath);
    }
} else {
    readfile($filePath);
}
exit;
