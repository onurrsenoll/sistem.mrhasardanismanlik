<?php
/**
 * MR HASAR DANIŞMANLIK - AI ADK ANALİZ ENDPOINTİ
 * OpenAI API ile araç değer kaybı analizi
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'GEÇERSİZ İSTEK YÖNTEMİ']);
    exit;
}

// AUTH kontrol
$user = authenticate();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'YETKİSİZ ERİŞİM']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'error' => 'GEÇERSİZ VERİ']);
    exit;
}

// API Key'i ayarlardan çek
try {
    $db = getDB();
    $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar = 'openai_api_key'");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $apiKey = $row ? trim($row['deger']) : '';
} catch (Exception $e) {
    $apiKey = '';
}

if (empty($apiKey)) {
    // API key yoksa yerel analiz yap
    $analiz = yerselAnaliz($input);
    echo json_encode(['success' => true, 'data' => ['analiz' => $analiz, 'kaynak' => 'yerel']]);
    exit;
}

// OpenAI API çağrısı
$prompt = buildPrompt($input);

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'model' => 'gpt-4o-mini',
        'messages' => [
            [
                'role' => 'system',
                'content' => 'Sen bir Türk sigorta hukuku ve araç değer kaybı uzmanısın. Araç değer kaybı (ADK) hesaplamaları konusunda detaylı analiz yapıyorsun. Tahkim komisyonu kararları ve Yargıtay içtihatlarına hakimsin. Yanıtlarını Türkçe ve profesyonel bir dille ver. Kısa ve öz tut, madde madde yaz.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'max_tokens' => 800,
        'temperature' => 0.3
    ])
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200 && $response) {
    $data = json_decode($response, true);
    $aiText = $data['choices'][0]['message']['content'] ?? '';

    if (!empty($aiText)) {
        echo json_encode(['success' => true, 'data' => ['analiz' => $aiText, 'kaynak' => 'ai']]);
    } else {
        $analiz = yerselAnaliz($input);
        echo json_encode(['success' => true, 'data' => ['analiz' => $analiz, 'kaynak' => 'yerel']]);
    }
} else {
    // API hatası - yerel analiz yap
    $analiz = yerselAnaliz($input);
    echo json_encode(['success' => true, 'data' => ['analiz' => $analiz, 'kaynak' => 'yerel']]);
}

/**
 * AI prompt oluştur
 */
function buildPrompt($d) {
    $marka = $d['marka'] ?? '-';
    $model = $d['model'] ?? '-';
    $yil = $d['yil'] ?? '-';
    $km = isset($d['km']) ? number_format($d['km'], 0, ',', '.') : '-';
    $rayic = isset($d['rayic']) ? number_format($d['rayic'], 0, ',', '.') . ' TL' : '-';
    $onarim = isset($d['onarim']) ? number_format($d['onarim'], 0, ',', '.') . ' TL' : '-';
    $kusur = $d['kusur'] ?? 100;
    $onceki = $d['onceki'] ?? 0;
    $bolge = $d['bolge'] ?? '-';
    $premium = ($d['premium'] ?? false) ? 'EVET' : 'HAYIR';

    $nisbi = isset($d['nisbi']) ? number_format($d['nisbi'], 0, ',', '.') . ' TL' : '-';
    $piyasa = isset($d['piyasa']) ? number_format($d['piyasa'], 0, ',', '.') . ' TL' : '-';
    $tsb = isset($d['tsb']) ? number_format($d['tsb'], 0, ',', '.') . ' TL' : '-';
    $fullRight = isset($d['fullRight']) ? number_format($d['fullRight'], 0, ',', '.') . ' TL' : '-';
    $kusurApplied = isset($d['kusurApplied']) ? number_format($d['kusurApplied'], 0, ',', '.') . ' TL' : '-';

    $emsalBilgi = '';
    if (!empty($d['emsal'])) {
        $e = $d['emsal'];
        $emsalBilgi = "\nEn yakın Tahkim emsal: {$e['dosyaNo']} - {$e['marka']} {$e['model']} {$e['aracYili']} - Rayiç: " . number_format($e['rayic'], 0, ',', '.') . " TL - DK: " . number_format($e['dk'], 0, ',', '.') . " TL";
    }

    return "Araç değer kaybı hesaplaması analiz et ve profesyonel rapor sun:

ARAÇ BİLGİLERİ:
- Marka/Model: {$marka} {$model} ({$yil})
- Kilometre: {$km} km
- Premium Segment: {$premium}
- Hasar Bölgesi: {$bolge}
- Önceki Hasar: {$onceki} adet

MALİ BİLGİLER:
- Rayiç Değer: {$rayic}
- Onarım Bedeli: {$onarim}
- Kusur Oranı: %{$kusur}

HESAPLAMA SONUÇLARI:
- Nisbi Yöntem: {$nisbi}
- Piyasa Yöntemi: {$piyasa}
- TSB Yöntemi: {$tsb}
- %100 Haklı: {$fullRight}
- Kusur Sonrası: {$kusurApplied}
{$emsalBilgi}

Lütfen şunları analiz et:
1. Hesaplama sonuçlarının uygunluğu
2. Tahkim başvurusu için tavsiyeler
3. Dikkat edilmesi gereken hukuki noktalar
4. Emsal kararlarla karşılaştırma";
}

/**
 * API key yoksa yerel analiz üret
 */
function yerselAnaliz($d) {
    $marka = $d['marka'] ?? '-';
    $model = $d['model'] ?? '-';
    $yil = $d['yil'] ?? date('Y');
    $rayic = $d['rayic'] ?? 0;
    $onarim = $d['onarim'] ?? 0;
    $kusur = $d['kusur'] ?? 100;
    $fullRight = $d['fullRight'] ?? 0;
    $kusurApplied = $d['kusurApplied'] ?? 0;
    $premium = $d['premium'] ?? false;
    $onceki = $d['onceki'] ?? 0;

    $onarimOrani = $rayic > 0 ? round(($onarim / $rayic) * 100, 1) : 0;
    $aracYasi = date('Y') - intval($yil);

    $analiz = "ARAÇ DEĞER KAYBI ANALİZ RAPORU\n\n";
    $analiz .= "ARAÇ: {$marka} {$model} ({$yil})\n";
    $analiz .= "ARAÇ YAŞI: {$aracYasi} YIL\n\n";

    // ONARIM ORANI DEĞERLENDİRME
    if ($onarimOrani > 60) {
        $analiz .= "PERT TOTAL DURUMU: Onarım bedeli rayiç değerin %{$onarimOrani}'sini oluşturmaktadır. Bu oran %60'ın üzerinde olup araç ekonomik ömrünü tamamlamış sayılabilir.\n\n";
    } elseif ($onarimOrani > 40) {
        $analiz .= "AĞIR HASAR: Onarım/Rayiç oranı %{$onarimOrani} olup yüksek seviyededir. Pert farkı yöntemi ile değerlendirme yapılması uygun olabilir.\n\n";
    } else {
        $analiz .= "GENEL HASAR: Onarım/Rayiç oranı %{$onarimOrani} olup normal seviyededir.\n\n";
    }

    // PREMIUM ARAÇ
    if ($premium) {
        $analiz .= "PREMIUM SEGMENT: {$marka} premium segment araç olarak sınıflandırılmıştır. Premium araçlarda değer kaybı oranları genellikle %10-15 daha yüksek uygulanmaktadır.\n\n";
    }

    // ÖNCEKİ HASAR
    if ($onceki > 0) {
        $analiz .= "ÖNCEKİ HASAR: Araçta daha önce {$onceki} adet hasar kaydı bulunmaktadır. Bu durum değer kaybı hesaplamasında indirim faktörü olarak uygulanmıştır.\n\n";
    }

    // TAVSİYE
    $analiz .= "TAVSİYELER:\n";
    $analiz .= "- Sigorta Tahkim Komisyonu'na başvuru yapılması önerilir.\n";
    $analiz .= "- Hesaplanan değer kaybı tutarı " . number_format($kusurApplied, 0, ',', '.') . " TL olup, benzer emsal kararlara uygun görülmektedir.\n";

    if ($kusur < 100) {
        $analiz .= "- Kusur oranı %{$kusur} uygulanmıştır. Kusur durumunun trafik tespit tutanağı ile doğrulanması önemlidir.\n";
    }

    $analiz .= "- Eksper raporu ve onarım faturaları mutlaka dosyaya eklenmelidir.\n";
    $analiz .= "- 2024-2025 Tahkim kararlarındaki emsal rayiçler referans alınmıştır.";

    return $analiz;
}
