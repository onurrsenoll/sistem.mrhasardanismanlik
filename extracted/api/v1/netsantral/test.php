<?php
/**
 * GET /api/v1/netsantral/test.php
 * NETSANTRAL BAĞLANTI TESTİ
 * Ayarlar tablosundaki netsantral bilgileriyle NetGSM API'ye bağlanarak test yapar
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

$user = auth_required(['admin']);

$db = getDB();

// AYARLARI OKU
$ayarlar = [];
try {
    $stmt = $db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'netsantral_%'");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $ayarlar[$row['anahtar']] = $row['deger'];
    }
} catch (Exception $e) {
    json_error('AYARLAR OKUNAMADI: ' . $e->getMessage(), 500);
}

$santralNo = $ayarlar['netsantral_santral_no'] ?? '';
$kullanici = $ayarlar['netsantral_kullanici'] ?? '';
$sifre = $ayarlar['netsantral_sifre'] ?? '';
$dahili = $ayarlar['netsantral_dahili'] ?? '';
$aktif = ($ayarlar['netsantral_aktif'] ?? '0') === '1';

if (!$aktif) {
    json_success([
        'success_api' => false,
        'response' => ['hata_mesaj' => 'NETSANTRAL PASİF DURUMDA', 'hata_kodu' => '0'],
        'debug' => ['aktif' => false]
    ]);
}

if (empty($kullanici) || empty($sifre)) {
    json_success([
        'success_api' => false,
        'response' => ['hata_mesaj' => 'KULLANICI ADI VEYA ŞİFRE GİRİLMEMİŞ', 'hata_kodu' => '0'],
        'debug' => ['kullanici_var' => !empty($kullanici), 'sifre_var' => !empty($sifre)]
    ]);
}

// SANTRAL NUMARASINI TEMİZLE
$cleanSantral = preg_replace('/[^0-9]/', '', $santralNo);
// 0850 öneki varsa kaldır
if (substr($cleanSantral, 0, 4) === '0850') {
    $cleanSantral = substr($cleanSantral, 4);
}
// Başındaki 0'ları kaldır
$cleanSantral = ltrim($cleanSantral, '0');

$debug = [
    'santral_no_ham' => $santralNo,
    'santral_no_temiz' => $cleanSantral,
    'kullanici' => $kullanici,
    'dahili' => $dahili
];

// NETGSM NETSANTRAL API - KUYRUK DURUMU (CONNECTION TEST)
$denemeler = [];
$basarili = false;
$apiResponse = null;

// DENEME 1: Santral no ile
$formats = [];
if ($cleanSantral) {
    $formats[] = ['santral' => $cleanSantral, 'aciklama' => 'Temiz santral no'];
}
if ($santralNo && $santralNo !== $cleanSantral) {
    $formats[] = ['santral' => preg_replace('/[^0-9]/', '', $santralNo), 'aciklama' => 'Ham santral no'];
}
// Kullanıcı adı ile de dene
if ($kullanici && $kullanici !== $cleanSantral) {
    $formats[] = ['santral' => $kullanici, 'aciklama' => 'Kullanıcı adı ile'];
}

foreach ($formats as $fmt) {
    $postData = http_build_query([
        'usercode' => $kullanici,
        'password' => $sifre,
        'santession' => $fmt['santral']
    ]);

    $result = http_post(
        'https://api.netgsm.com.tr/netsantral/queue/',
        $postData,
        ['Content-Type: application/x-www-form-urlencoded'],
        15
    );

    $deneme = [
        'format' => $fmt['aciklama'],
        'santral_param' => $fmt['santral'],
        'http_code' => $result['http_code'],
        'method' => $result['method'],
        'error' => $result['error']
    ];

    if ($result['body'] !== false && $result['http_code'] >= 200 && $result['http_code'] < 500) {
        $body = trim($result['body']);
        $deneme['raw_response'] = substr($body, 0, 500);

        // NetGSM yanıtını analiz et
        // Başarılı yanıt: XML veya düz metin
        // Hata kodları: 30=Geçersiz kullanıcı, 40=Parametreler eksik, 70=Geçersiz parametre

        // Hata kodu kontrolü (düz sayı yanıt)
        if (preg_match('/^(\d{2,3})$/', $body, $m)) {
            $hatKodu = $m[1];
            $hataMesajlari = [
                '30' => 'GEÇERSİZ KULLANICI ADI VEYA ŞİFRE',
                '40' => 'EKSİK PARAMETRELER',
                '50' => 'SİSTEM HATASI',
                '60' => 'TANIMLI DAHİLİ YOK',
                '70' => 'GEÇERSİZ PARAMETRE',
                '80' => 'TANIMLI KUYRUK YOK',
                '100' => 'SİSTEM BAKIMDA'
            ];
            $deneme['hata_kodu'] = $hatKodu;
            $deneme['hata_mesaj'] = $hataMesajlari[$hatKodu] ?? 'BİLİNMEYEN HATA KODU: ' . $hatKodu;
        }
        // Başarılı XML yanıtı
        else if (strpos($body, '<') !== false || strlen($body) > 5) {
            // Muhtemelen başarılı yanıt (XML veya JSON)
            $basarili = true;
            $apiResponse = $body;
            $deneme['basarili'] = true;
            $denemeler[] = $deneme;
            break;
        }
        // Boş yanıt = muhtemelen başarılı
        else if (empty($body) && $result['http_code'] === 200) {
            $basarili = true;
            $apiResponse = '';
            $deneme['basarili'] = true;
            $denemeler[] = $deneme;
            break;
        }
    }

    $denemeler[] = $deneme;
}

$debug['denemeler'] = $denemeler;
$debug['deneme_sayisi'] = count($denemeler);

if ($basarili) {
    // BAŞARILI - KUYRUK BİLGİSİNİ PARSE ET
    $responseData = [];
    if ($apiResponse) {
        // XML parse dene
        libxml_use_internal_errors(true);
        $xml = @simplexml_load_string($apiResponse);
        if ($xml) {
            $responseData = json_decode(json_encode($xml), true);
        } else {
            $responseData = ['raw' => substr($apiResponse, 0, 500)];
        }
        libxml_clear_errors();
    }

    json_success([
        'success_api' => true,
        'response' => array_merge($responseData, [
            'aktif' => true,
            'dahili' => $dahili,
            'santral_no' => $santralNo,
            'mesaj' => 'NETSANTRAL BAĞLANTISI BAŞARILI'
        ]),
        'debug' => $debug
    ]);
} else {
    // BAŞARISIZ
    $sonDeneme = end($denemeler);
    $hataKodu = $sonDeneme['hata_kodu'] ?? '';
    $hataMesaj = $sonDeneme['hata_mesaj'] ?? ($sonDeneme['raw_response'] ?? 'BAĞLANTI KURULAMADI');

    // ÇÖZÜM ÖNERİSİ
    $cozum = '';
    switch ($hataKodu) {
        case '30':
            $cozum = 'NETGSM PANELİNDEN KULLANICI ADI VE ŞİFRENİZİ KONTROL EDİN. HAT KULLANICI BİLGİSİ SEKMESİNDEKİ BİLGİLERİ KULLANIN.';
            break;
        case '40':
            $cozum = 'SANTRAL NUMARASI, KULLANICI ADI VE ŞİFRE ALANLARI DOLU OLDUĞUNDAN EMİN OLUN.';
            break;
        case '70':
            $cozum = 'SANTRAL NUMARANIZI KONTROL EDİN. NETGSM PANELİNDEKİ ABONE BİLGİLERİ SAYFASINDAKİ NUMARAYI KULLANIN.';
            break;
        case '80':
            $cozum = 'NETSANTRAL PANELİNDE EN AZ BİR KUYRUK TANIMLANMIŞ OLMALI.';
            break;
        default:
            if (strpos($sonDeneme['error'] ?? '', 'timeout') !== false || strpos($sonDeneme['error'] ?? '', 'zaman') !== false) {
                $cozum = 'SUNUCUDAN NETGSM API\'YE ERİŞİLEMİYOR. FİREWALL VEYA DNS AYARLARINI KONTROL EDİN.';
            } else {
                $cozum = 'NETGSM PANELİNDEN NETSANTRAL HİZMETİNİZİN AKTİF OLDUĞUNDAN EMİN OLUN.';
            }
    }

    // FORMATONERI
    $formatOnerisi = '';
    if ($hataKodu === '70' && count($denemeler) > 1) {
        $formatOnerisi = 'SANTRAL NUMARASINI FARKLI FORMATLARDA DENEYİN: SADECE ABONE NO (ÖRN: 3625026502) VEYA 0850 ÖNEKLİ (ÖRN: 08503625026502)';
    }

    json_success([
        'success_api' => false,
        'response' => [
            'hata_mesaj' => $hataMesaj,
            'hata_kodu' => $hataKodu,
            'cozum_onerisi' => $cozum,
            'format_onerisi' => $formatOnerisi,
            'deneme_sayisi' => count($denemeler),
            'raw_response' => $sonDeneme['raw_response'] ?? ''
        ],
        'http_code' => $sonDeneme['http_code'] ?? 0,
        'debug' => $debug
    ]);
}
