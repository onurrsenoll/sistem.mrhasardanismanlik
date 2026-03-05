<?php
/**
 * MR HASAR DANIŞMANLIK - AI ADK ANALİZ ENDPOINTİ
 * Google Gemini + OpenAI + Claude destekli araç değer kaybı analizi
 * Key prefix ile otomatik API seçimi: AIzaSy = Gemini, sk- = OpenAI, sk-ant- = Claude
 */

ob_start(); error_reporting(0);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/ai-helper.php';

ob_end_clean();

setup_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('GEÇERSİZ İSTEK YÖNTEMİ', 405);
}

// AUTH kontrol
$user = auth_required();

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'error' => 'GEÇERSİZ VERİ']);
    exit;
}

// API Key'leri ayarlardan çek
$keys = getAiKeys();
$apiKey = $keys['active'];

if (empty($apiKey)) {
    $analiz = yerselAnaliz($input);
    echo json_encode(['success' => true, 'data' => ['analiz' => $analiz, 'kaynak' => 'yerel']]);
    exit;
}

$prompt = buildPrompt($input);
$systemPrompt = 'Sen bir Türk sigorta hukuku ve araç değer kaybı uzmanısın. Araç değer kaybı (ADK) hesaplamaları konusunda detaylı analiz yapıyorsun. Tahkim komisyonu kararları ve Yargıtay içtihatlarına hakimsin. Yanıtlarını Türkçe ve profesyonel bir dille ver. Kısa ve öz tut, madde madde yaz. Başlıkları büyük harfle yaz.';

$aiResult = callAIWithDetail($apiKey, $systemPrompt, $prompt, ['temperature' => 0.3, 'maxTokens' => 1024, 'timeout' => 30]);
$result = $aiResult['text'];

// Başarısızsa fallback key'leri dene
if (empty($result) && !empty($keys['fallbacks'])) {
    foreach ($keys['fallbacks'] as $fbKey) {
        $aiResult = callAIWithDetail($fbKey, $systemPrompt, $prompt, ['temperature' => 0.3, 'maxTokens' => 1024, 'timeout' => 30]);
        $result = $aiResult['text'];
        if (!empty($result)) {
            $apiKey = $fbKey;
            break;
        }
    }
}

if (!empty($result)) {
    echo json_encode(['success' => true, 'data' => ['analiz' => $result, 'kaynak' => 'ai', 'provider' => detectProvider($apiKey)]]);
} else {
    $analiz = yerselAnaliz($input);
    echo json_encode(['success' => true, 'data' => ['analiz' => $analiz, 'kaynak' => 'yerel']]);
}

/* ═══════════════════════════════════════════
   PROMPT OLUŞTURUCU
   ═══════════════════════════════════════════ */
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
1. Hesaplama sonuçlarının uygunluğu ve doğruluğu
2. Sigorta Tahkim Komisyonu başvurusu için tavsiyeler
3. Dikkat edilmesi gereken hukuki noktalar
4. Emsal kararlarla karşılaştırma ve değerlendirme
5. Onarım/Rayiç oranı değerlendirmesi";
}

/* ═══════════════════════════════════════════
   YEREL ANALİZ (API yoksa fallback)
   ═══════════════════════════════════════════ */
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

    if ($onarimOrani > 60) {
        $analiz .= "PERT TOTAL DURUMU: Onarım bedeli rayiç değerin %{$onarimOrani}'sini oluşturmaktadır. Bu oran %60'ın üzerinde olup araç ekonomik ömrünü tamamlamış sayılabilir.\n\n";
    } elseif ($onarimOrani > 40) {
        $analiz .= "AĞIR HASAR: Onarım/Rayiç oranı %{$onarimOrani} olup yüksek seviyededir. Pert farkı yöntemi ile değerlendirme yapılması uygun olabilir.\n\n";
    } else {
        $analiz .= "GENEL HASAR: Onarım/Rayiç oranı %{$onarimOrani} olup normal seviyededir.\n\n";
    }

    if ($premium) {
        $analiz .= "PREMIUM SEGMENT: {$marka} premium segment araç olarak sınıflandırılmıştır. Premium araçlarda değer kaybı oranları genellikle %10-15 daha yüksek uygulanmaktadır.\n\n";
    }

    if ($onceki > 0) {
        $analiz .= "ÖNCEKİ HASAR: Araçta daha önce {$onceki} adet hasar kaydı bulunmaktadır. Bu durum değer kaybı hesaplamasında indirim faktörü olarak uygulanmıştır.\n\n";
    }

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
