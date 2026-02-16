<?php
/**
 * GET /api/v1/netsantral/test-webhook.php
 * NETSANTRAL WEBHOOK TEST VE DURUM KONTROL
 *
 * Bu endpoint webhook'un doğru çalışıp çalışmadığını test eder.
 * ?mode=simulate → Sahte bir gelen çağrı simüle eder
 * ?mode=status   → Webhook durumunu ve ayarları gösterir
 * ?mode=log      → Son webhook loglarını gösterir
 * ?mode=diagnose → Adım adım bağlantı tanılama yapar
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user = auth_required(['admin']);
$db = getDB();
$mode = $_GET['mode'] ?? 'status';

// ══════════ DURUM KONTROL ══════════
if ($mode === 'status') {
    $ayarlar = [];
    try {
        $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'netsantral_%'");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $key = $row['anahtar'];
            // Şifreyi maskeleme
            if ($key === 'netsantral_sifre') {
                $ayarlar[$key] = $row['deger'] ? str_repeat('*', strlen($row['deger'])) : '(BOŞ)';
            } else {
                $ayarlar[$key] = $row['deger'] ?: '(BOŞ)';
            }
        }
    } catch (Exception $e) {
        $ayarlar['hata'] = $e->getMessage();
    }

    // WEBHOOK URL KONTROLÜ
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'SİTE_ADRESI';
    $webhookUrl = $protocol . '://' . $host . '/api/v1/netsantral/webhook.php';

    // TABLOLAR KONTROL
    $tabloDurumu = [];
    try {
        $stmt = $db->query("SELECT COUNT(*) as sayi FROM arama_loglari");
        $tabloDurumu['arama_loglari'] = $stmt->fetch()['sayi'] . ' KAYIT';
    } catch (Exception $e) { $tabloDurumu['arama_loglari'] = 'TABLO YOK'; }

    try {
        $stmt = $db->query("SELECT COUNT(*) as sayi FROM netsantral_bekleyen");
        $tabloDurumu['netsantral_bekleyen'] = $stmt->fetch()['sayi'] . ' KAYIT';
    } catch (Exception $e) { $tabloDurumu['netsantral_bekleyen'] = 'TABLO YOK'; }

    // SON ÇAĞRILAR
    $sonCagrilar = [];
    try {
        $stmt = $db->query("SELECT arayan, arayan_adi, aranan, yon, durum, arama_tarihi FROM arama_loglari ORDER BY id DESC LIMIT 5");
        $sonCagrilar = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {}

    // NETSANTRAL API TESTİ
    $apiTest = ['durum' => 'TEST_YAPILMADI'];
    $santralNo = $ayarlar['netsantral_santral_no'] ?? '';
    $username = $ayarlar['netsantral_kullanici'] ?? '';
    $sifre = '';
    try {
        $stmt = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'netsantral_sifre' LIMIT 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) $sifre = $row['deger'];
    } catch (Exception $e) {}

    if (!empty($santralNo) && !empty($username) && !empty($sifre)) {
        // BAŞINDAKİ 0'LARI TEMİZLE (NetGSM API format)
        $santralNoClean = ltrim($santralNo, '0');
        $usernameClean = ltrim($username, '0');
        $testUrl = "https://crmsntrl.netgsm.com.tr/{$santralNoClean}/queuestats?username={$usernameClean}&password={$sifre}";
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $testUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => [
                'Accept: application/json, text/plain, */*',
                'User-Agent: MR-Hasar-CRM/1.0',
                'Connection: close'
            ]
        ]);
        $testResp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        $curlErrno = curl_errno($ch);
        $totalTime = round(curl_getinfo($ch, CURLINFO_TOTAL_TIME), 2);
        $primaryIp = curl_getinfo($ch, CURLINFO_PRIMARY_IP);
        curl_close($ch);

        if ($curlErr) {
            $turkceHata = $curlErr;
            if (stripos($curlErr, 'SSL') !== false) $turkceHata = 'SSL SERTİFİKA HATASI';
            elseif (stripos($curlErr, 'resolve') !== false) $turkceHata = 'DNS ÇÖZÜMLEME HATASI - NETGSM SUNUCUSU BULUNAMIYOR';
            elseif (stripos($curlErr, 'timeout') !== false) $turkceHata = 'ZAMAN AŞIMI - NETGSM YANIT VERMİYOR';
            elseif (stripos($curlErr, 'protocol') !== false || stripos($curlErr, 'HTTP') !== false || $curlErrno == 1 || $curlErrno == 16) $turkceHata = 'HTTP PROTOKOL HATASI - IPv4/TLS UYUMSUZLUĞU';
            elseif (stripos($curlErr, 'connect') !== false || $curlErrno == 7) $turkceHata = 'BAĞLANTI REDDEDİLDİ - FIREWALL VEYA PORT ENGELI';
            $apiTest = ['durum' => 'BAĞLANTI_HATASI', 'hata' => $turkceHata, 'curl_hata' => $curlErr, 'curl_errno' => $curlErrno, 'ip' => $primaryIp, 'sure' => $totalTime . 's'];
        } elseif ($httpCode === 200) {
            $trimmed = trim($testResp);
            $netgsmHatalar = [
                '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE - NETSANTRAL AYARLARINI KONTROL EDİN',
                '60' => 'GEÇERSİZ SANTRAL NUMARASI - SANTRAL NUMARASINI KONTROL EDİN',
                '70' => 'GEÇERSİZ PARAMETRE',
                '100' => 'NETGSM SİSTEM HATASI',
                '101' => 'SİSTEMDE KAYITLI DEĞİL - SANTRAL NUMARASINI VE KULLANICI ADINI KONTROL EDİN'
            ];
            if (isset($netgsmHatalar[$trimmed])) {
                $apiTest = ['durum' => 'API_HATASI', 'hata_kodu' => $trimmed, 'hata' => $netgsmHatalar[$trimmed], 'ip' => $primaryIp, 'sure' => $totalTime . 's'];
            } else {
                $apiTest = ['durum' => 'BAĞLI', 'http_kodu' => $httpCode, 'yanit' => substr($testResp, 0, 200), 'ip' => $primaryIp, 'sure' => $totalTime . 's'];
            }
        } elseif ($httpCode === 0) {
            $apiTest = ['durum' => 'BAĞLANTI_HATASI', 'hata' => 'SUNUCUYA BAĞLANILAMADI', 'http_kodu' => 0, 'ip' => $primaryIp, 'sure' => $totalTime . 's'];
        } else {
            $apiTest = ['durum' => 'HTTP_HATASI', 'http_kodu' => $httpCode, 'yanit' => substr($testResp, 0, 200), 'ip' => $primaryIp, 'sure' => $totalTime . 's'];
        }
    } else {
        $apiTest = ['durum' => 'AYARLAR_EKSİK', 'mesaj' => 'Santral no, kullanıcı veya şifre boş'];
    }

    // YÖNLENDIRME MODU
    $yonModu = $ayarlar['netsantral_yonlendirme_modu'] ?? 'dynamic';
    $dahili = $ayarlar['netsantral_dahili'] ?? '';

    json_success([
        'webhook_url' => $webhookUrl,
        'ayarlar' => $ayarlar,
        'yonlendirme' => [
            'mod' => $yonModu,
            'dahili' => $dahili,
            'aciklama' => $yonModu === 'dynamic'
                ? 'TTS OKUNUR + DAHİLİYE YÖNLENDİRİLİR (result: ' . $dahili . ')'
                : ($yonModu === 'extensions'
                    ? 'DİREKT DAHİLİYE YÖNLENDİRİLİR (result: ' . $dahili . ', data boş)'
                    : 'SADECE TTS OKUNUR - YÖNLENDİRME YOK (result: 1)')
        ],
        'tablo_durumu' => $tabloDurumu,
        'api_testi' => $apiTest,
        'son_cagrilar' => $sonCagrilar,
        'kurulum_rehberi' => [
            '1' => 'NETGSM NETSANTRAL > MODÜLLER > ENTEGRASYONLAR > ÖZEL API OLUŞTUR',
            '2' => 'FONKSİYON İSMİ: MR HASAR CRM GELEN | FONKSİYON URL: ' . $webhookUrl,
            '3' => 'FONKSİYON METOD: HTTP POST',
            '4' => 'SABİT DEĞİŞKEN EKLE: api_key = mr_hasar_2026',
            '5' => 'SONUÇ DURUMLARI: e=HATA, t=ZAMAN AŞIMI, 1=BAŞARILI (TTS)',
            '6' => 'FONKSİYONDAN MODÜL OLUŞTURUN',
            '7' => 'AYARLAR > IVR > TUŞLAMAYINCA > ÖZEL API MODÜLÜ SEÇİN'
        ]
    ]);
    exit;
}

// ══════════ ADIM ADIM TANILAMA ══════════
if ($mode === 'diagnose') {
    $adimlar = [];

    // ADIM 1: PHP & cURL VERSİYON BİLGİSİ
    $curlVer = function_exists('curl_version') ? curl_version() : null;
    $adimlar[] = [
        'adim' => 1,
        'baslik' => 'PHP VE CURL BİLGİLERİ',
        'durum' => 'TAMAM',
        'detay' => [
            'php_version' => PHP_VERSION,
            'curl_version' => $curlVer ? $curlVer['version'] : 'CURL YOK!',
            'ssl_version' => $curlVer ? ($curlVer['ssl_version'] ?? 'YOK') : 'YOK',
            'protocols' => $curlVer ? implode(', ', $curlVer['protocols'] ?? []) : 'YOK'
        ]
    ];

    // ADIM 2: DNS ÇÖZÜMLEME
    $dnsStart = microtime(true);
    $dnsResult = @gethostbyname('crmsntrl.netgsm.com.tr');
    $dnsSure = round(microtime(true) - $dnsStart, 3);
    $dnsBasarili = ($dnsResult !== 'crmsntrl.netgsm.com.tr');
    $adimlar[] = [
        'adim' => 2,
        'baslik' => 'DNS ÇÖZÜMLEME',
        'durum' => $dnsBasarili ? 'TAMAM' : 'HATA',
        'detay' => [
            'host' => 'crmsntrl.netgsm.com.tr',
            'ip' => $dnsBasarili ? $dnsResult : 'ÇÖZÜMLENEMEDI',
            'sure' => $dnsSure . 's'
        ]
    ];

    // ADIM 3: TCP BAĞLANTI TESTİ (443 PORTU)
    $tcpBasarili = false;
    $tcpSure = 0;
    $tcpHata = '';
    if ($dnsBasarili) {
        $tcpStart = microtime(true);
        $sock = @fsockopen('ssl://crmsntrl.netgsm.com.tr', 443, $errno, $errstr, 10);
        $tcpSure = round(microtime(true) - $tcpStart, 3);
        if ($sock) {
            $tcpBasarili = true;
            fclose($sock);
        } else {
            $tcpHata = "errno={$errno}: {$errstr}";
        }
    } else {
        $tcpHata = 'DNS ÇÖZÜMLENEMEDI - TCP TESTİ ATLANDI';
    }
    $adimlar[] = [
        'adim' => 3,
        'baslik' => 'TCP BAĞLANTI (HTTPS/443)',
        'durum' => $tcpBasarili ? 'TAMAM' : 'HATA',
        'detay' => [
            'host' => 'crmsntrl.netgsm.com.tr:443',
            'sonuc' => $tcpBasarili ? 'BAĞLANTI BAŞARILI' : $tcpHata,
            'sure' => $tcpSure . 's'
        ]
    ];

    // ADIM 4: CURL HTTP İSTEK TESTİ (BASIT - google.com ile)
    $curlTestBasarili = false;
    $curlTestSure = 0;
    $curlTestHata = '';
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://www.google.com',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_NOBODY => true
    ]);
    $curlTestResp = curl_exec($ch);
    $curlTestCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlTestHata = curl_error($ch);
    $curlTestSure = round(curl_getinfo($ch, CURLINFO_TOTAL_TIME), 3);
    curl_close($ch);
    $curlTestBasarili = ($curlTestCode > 0 && empty($curlTestHata));
    $adimlar[] = [
        'adim' => 4,
        'baslik' => 'CURL GENEL HTTPS TESTİ (google.com)',
        'durum' => $curlTestBasarili ? 'TAMAM' : 'HATA',
        'detay' => [
            'http_code' => $curlTestCode,
            'hata' => $curlTestHata ?: 'YOK',
            'sure' => $curlTestSure . 's'
        ]
    ];

    // ADIM 5: NETGSM API BAĞLANTI TESTİ
    $santralNo = '';
    $username = '';
    $sifre = '';
    try {
        $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'netsantral_%'");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if ($row['anahtar'] === 'netsantral_santral_no') $santralNo = $row['deger'];
            if ($row['anahtar'] === 'netsantral_kullanici') $username = $row['deger'];
            if ($row['anahtar'] === 'netsantral_sifre') $sifre = $row['deger'];
        }
    } catch (Exception $e) {}

    $apiTestBasarili = false;
    $apiTestDetay = [];
    if (!empty($santralNo) && !empty($username) && !empty($sifre)) {
        $santralNoClean = ltrim($santralNo, '0');
        $usernameClean = ltrim($username, '0');
        $testUrl = "https://crmsntrl.netgsm.com.tr/{$santralNoClean}/queuestats?username={$usernameClean}&password={$sifre}";
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $testUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => [
                'Accept: application/json, text/plain, */*',
                'User-Agent: MR-Hasar-CRM/1.0',
                'Connection: close'
            ]
        ]);
        $testResp = curl_exec($ch);
        $testHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $testCurlErr = curl_error($ch);
        $testCurlErrno = curl_errno($ch);
        $testTime = round(curl_getinfo($ch, CURLINFO_TOTAL_TIME), 3);
        $testIp = curl_getinfo($ch, CURLINFO_PRIMARY_IP);
        curl_close($ch);

        if ($testCurlErr) {
            $apiTestDetay = [
                'sonuc' => 'CURL HATASI',
                'curl_errno' => $testCurlErrno,
                'curl_error' => $testCurlErr,
                'ip' => $testIp,
                'sure' => $testTime . 's',
                'api_url' => preg_replace('/password=[^&]+/', 'password=***', $testUrl)
            ];
        } elseif ($testHttpCode === 200) {
            $trimmed = trim($testResp);
            $netgsmHatalar = ['30' => 'GEÇERSİZ KUL.ADI/ŞİFRE', '60' => 'GEÇERSİZ SANTRAL NO', '70' => 'GEÇERSİZ PARAMETRE', '100' => 'SİSTEM HATASI', '101' => 'KAYITLI DEĞİL'];
            if (isset($netgsmHatalar[$trimmed])) {
                $apiTestDetay = ['sonuc' => 'KULLANICI DOĞRULANAMADI', 'hata_kodu' => $trimmed, 'hata' => $netgsmHatalar[$trimmed], 'ip' => $testIp, 'sure' => $testTime . 's'];
            } else {
                $apiTestBasarili = true;
                $apiTestDetay = ['sonuc' => 'BAĞLANTI BAŞARILI', 'yanit' => substr($testResp, 0, 200), 'ip' => $testIp, 'sure' => $testTime . 's'];
            }
        } else {
            $apiTestDetay = ['sonuc' => 'HTTP HATASI', 'http_code' => $testHttpCode, 'yanit' => substr($testResp, 0, 200), 'ip' => $testIp, 'sure' => $testTime . 's'];
        }
    } else {
        $apiTestDetay = ['sonuc' => 'AYARLAR EKSİK - SANTRAL NO, KULLANICI VEYA ŞİFRE BOŞ'];
    }
    $adimlar[] = [
        'adim' => 5,
        'baslik' => 'NETGSM API BAĞLANTI TESTİ',
        'durum' => $apiTestBasarili ? 'TAMAM' : 'HATA',
        'detay' => $apiTestDetay
    ];

    // ÖZET
    $basariliAdim = 0;
    $toplamAdim = count($adimlar);
    foreach ($adimlar as $a) {
        if ($a['durum'] === 'TAMAM') $basariliAdim++;
    }

    json_success([
        'ozet' => "{$basariliAdim}/{$toplamAdim} ADIM BAŞARILI",
        'tum_basarili' => ($basariliAdim === $toplamAdim),
        'adimlar' => $adimlar,
        'sunucu_bilgi' => [
            'php' => PHP_VERSION,
            'curl' => $curlVer ? $curlVer['version'] : 'YOK',
            'ssl' => $curlVer ? ($curlVer['ssl_version'] ?? 'YOK') : 'YOK',
            'os' => PHP_OS,
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'BİLİNMİYOR'
        ]
    ]);
    exit;
}

// ══════════ WEBHOOK SİMÜLASYON ══════════
if ($mode === 'simulate') {
    $testArayan = $_GET['arayan'] ?? '905551234567';
    $testAranan = $_GET['aranan'] ?? '908503625026502';

    // Webhook'u simüle et: webhook.php'ye istek gönder
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $webhookUrl = $protocol . '://' . $host . '/api/v1/netsantral/webhook.php';

    $postData = json_encode([
        'arayan_no'   => $testArayan,
        'aranan_no'   => $testAranan,
        'santral_no'  => '08503625026502',
        'arama_id'    => 'TEST_' . time(),
        'tus_bilgisi' => '-1',
        'api_key'     => 'mr_hasar_2026'
    ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $webhookUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    $parsed = json_decode($resp, true);

    json_success([
        'test_tipi' => 'WEBHOOK SİMÜLASYON',
        'test_arayan' => $testArayan,
        'test_aranan' => $testAranan,
        'webhook_url' => $webhookUrl,
        'http_kodu' => $httpCode,
        'curl_hata' => $curlErr ?: null,
        'webhook_yanit_raw' => $resp,
        'webhook_yanit_parsed' => $parsed,
        'dogrulama' => [
            'status_dogru' => ($parsed['status'] ?? '') === 'success' ? 'EVET' : 'HAYIR - "success" olmalı',
            'result_degeri' => $parsed['result'] ?? 'YOK',
            'result_aciklama' => ($parsed['result'] ?? '') === '1'
                ? 'SADECE TTS - YÖNLENDİRME YOK (IVR AKIŞINA DEVAM EDER)'
                : (($parsed['result'] ?? '') === 'e'
                    ? 'HATA DURUMU'
                    : (is_numeric($parsed['result'] ?? '')
                        ? 'DİNAMİK YÖNLENDİRME - TTS OKUNUR + DAHİLİ ' . ($parsed['result'] ?? '') . ' NUMARASINA AKTARILIR'
                        : 'BİLİNMEYEN RESULT: ' . ($parsed['result'] ?? ''))),
            'data_dolu' => !empty($parsed['data'] ?? '') ? 'EVET - TTS METNİ: ' . mb_substr($parsed['data'] ?? '', 0, 80) : 'HAYIR',
            'tum_alanlar_string' => (is_string($parsed['status'] ?? null) && is_string($parsed['result'] ?? null) && is_string($parsed['data'] ?? null)) ? 'EVET' : 'HAYIR - TÜM ALANLAR STRING OLMALI!',
        ]
    ]);
    exit;
}

// ══════════ LOG GÖSTERİM ══════════
if ($mode === 'log') {
    $logDir = __DIR__ . '/../../../data';
    $logFile = $logDir . '/netsantral_webhook.log';
    $proxyLog = $logDir . '/netsantral_proxy.log';

    $webhookLog = '';
    if (file_exists($logFile)) {
        $webhookLog = file_get_contents($logFile);
        // Son 5000 karakter
        if (strlen($webhookLog) > 5000) {
            $webhookLog = '... (KISALTILDI) ...' . "\n" . substr($webhookLog, -5000);
        }
    } else {
        $webhookLog = 'LOG DOSYASI YOK - HENÜZ WEBHOOK ÇAĞRISI YAPILMAMIŞ';
    }

    $proxyLogContent = '';
    if (file_exists($proxyLog)) {
        $proxyLogContent = file_get_contents($proxyLog);
        if (strlen($proxyLogContent) > 5000) {
            $proxyLogContent = '... (KISALTILDI) ...' . "\n" . substr($proxyLogContent, -5000);
        }
    } else {
        $proxyLogContent = 'LOG DOSYASI YOK - HENÜZ PROXY İSTEĞİ YAPILMAMIŞ';
    }

    json_success([
        'webhook_log' => $webhookLog,
        'proxy_log' => $proxyLogContent
    ]);
    exit;
}

json_error('GEÇERSİZ MOD. Kullanım: ?mode=status, ?mode=simulate, ?mode=log, ?mode=diagnose', 422);
