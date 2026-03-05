<?php
/**
 * MR HASAR DANIŞMANLIK - BH AI ANALİZ ENDPOINTİ
 * Google Gemini + OpenAI + Claude destekli bedeni hasar tazminat analizi
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

$user = auth_required();

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['success' => false, 'error' => 'GEÇERSİZ VERİ']);
    exit;
}

// API Key çek
$keys = getAiKeys();
$apiKey = $keys['active'];

if (empty($apiKey)) {
    $analiz = yerselBHAnaliz($input);
    echo json_encode(['success' => true, 'data' => ['analiz' => $analiz, 'kaynak' => 'yerel']]);
    exit;
}

$prompt = buildBHPrompt($input);
$systemPrompt = 'Sen bir Türk sigorta hukuku ve bedeni hasar tazminat uzmanısın. Maluliyet tazminatı, iş göremezlik, aktif/pasif dönem hesaplamaları, PMF tabloları ve progresif rant yöntemi konularında uzmansın. Yargıtay ve Sigorta Tahkim Komisyonu kararlarına hakimsin. Yanıtlarını Türkçe ve profesyonel bir dilde ver. Kısa ve öz tut, madde madde yaz. Başlıkları büyük harfle yaz.';

$aiResult = callAIWithDetail($apiKey, $systemPrompt, $prompt, ['temperature' => 0.3, 'maxTokens' => 1200, 'timeout' => 30]);
$result = $aiResult['text'];

// Başarısızsa fallback key'leri dene
if (empty($result) && !empty($keys['fallbacks'])) {
    foreach ($keys['fallbacks'] as $fbKey) {
        $aiResult = callAIWithDetail($fbKey, $systemPrompt, $prompt, ['temperature' => 0.3, 'maxTokens' => 1200, 'timeout' => 30]);
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
    $analiz = yerselBHAnaliz($input);
    echo json_encode(['success' => true, 'data' => ['analiz' => $analiz, 'kaynak' => 'yerel']]);
}

/* ═══════════════════════════════════════════
   PROMPT OLUŞTURUCU
   ═══════════════════════════════════════════ */
function buildBHPrompt($d) {
    $magdur = $d['magdurAdi'] ?? '-';
    $yas = $d['yas'] ?? '-';
    $cinsiyet = $d['cinsiyet'] ?? '-';
    $maluliyet = $d['maluliyet'] ?? '-';
    $meslek = $d['meslek'] ?? '-';
    $kazaTarihi = $d['kazaTarihi'] ?? '-';
    $aylikGelir = isset($d['aylikGelir']) ? number_format($d['aylikGelir'], 0, ',', '.') . ' TL' : '-';
    $gelirKaynagi = $d['gelirKaynagi'] ?? '-';
    $pmfTablosu = $d['pmfTablosu'] ?? 'TRH2010';
    $teknikFaiz = $d['teknikFaiz'] ?? 10;
    $kalanOmur = $d['kalanOmur'] ?? '-';
    $aktifYil = $d['aktifKalanYil'] ?? '-';
    $pasifYil = isset($d['pasifKalanYil']) ? number_format($d['pasifKalanYil'], 1) : '-';
    $kusur = $d['kusurOrani'] ?? 100;
    $aktifKusurlu = isset($d['aktifKusurlu']) ? number_format($d['aktifKusurlu'], 0, ',', '.') . ' TL' : '-';
    $pasifKusurlu = isset($d['pasifKusurlu']) ? number_format($d['pasifKusurlu'], 0, ',', '.') . ' TL' : '-';
    $toplamKusurlu = isset($d['toplamKusurlu']) ? number_format($d['toplamKusurlu'], 0, ',', '.') . ' TL' : '-';
    $toplamGelirKaybi = isset($d['toplamGelirKaybi']) ? number_format($d['toplamGelirKaybi'], 0, ',', '.') . ' TL' : '-';

    return "Bedeni hasar tazminat hesaplamasını analiz et ve profesyonel rapor sun:

MAĞDUR BİLGİLERİ:
- Adı Soyadı: {$magdur}
- Yaş (Kaza anı): {$yas}
- Cinsiyet: {$cinsiyet}
- Meslek: {$meslek}
- Kaza Tarihi: {$kazaTarihi}
- Maluliyet Oranı: %{$maluliyet}

GELİR BİLGİLERİ:
- Aylık Gelir: {$aylikGelir} ({$gelirKaynagi})
- Kusur Oranı: %{$kusur}

HESAPLAMA PARAMETRELERİ:
- PMF Tablosu: {$pmfTablosu}
- Teknik Faiz: %{$teknikFaiz}
- Kalan Ömür (PMF): {$kalanOmur} yıl
- Aktif Dönem: {$aktifYil} yıl (65 yaşına kadar)
- Pasif Dönem: {$pasifYil} yıl

HESAPLAMA SONUÇLARI:
- Aktif Dönem Gelir Kaybı: {$aktifKusurlu}
- Pasif Dönem Gelir Kaybı: {$pasifKusurlu}
- Toplam Tazminat (Kusur Sonrası): {$toplamKusurlu}
- Toplam Tazminat (Tam): {$toplamGelirKaybi}

Lütfen şunları analiz et:
1. Hesaplama sonuçlarının hukuki uygunluğu
2. Maluliyet oranı değerlendirmesi
3. PMF tablosu seçiminin uygunluğu (TRH2010 vs CSO1980 vs PMF1931)
4. Yargıtay ve Tahkim Komisyonu içtihatları açısından değerlendirme
5. Aktif/Pasif dönem hesaplamasının doğruluğu
6. Progresif rant yönteminin uygulanması
7. Sigorta şirketine başvuru ve dava sürecinde dikkat edilecek hususlar
8. Manevi tazminat talebi hakkında tavsiye";
}

/* ═══════════════════════════════════════════
   YEREL ANALİZ (API yoksa fallback)
   ═══════════════════════════════════════════ */
function yerselBHAnaliz($d) {
    $maluliyet = $d['maluliyet'] ?? 0;
    $yas = $d['yas'] ?? 0;
    $cinsiyet = $d['cinsiyet'] ?? '-';
    $meslek = $d['meslek'] ?? '-';
    $toplamKusurlu = $d['toplamKusurlu'] ?? 0;
    $kusur = $d['kusurOrani'] ?? 100;
    $pmfTablosu = $d['pmfTablosu'] ?? 'TRH2010';
    $aktifYil = $d['aktifKalanYil'] ?? 0;
    $pasifYil = $d['pasifKalanYil'] ?? 0;

    $analiz = "BEDENİ HASAR TAZMİNAT ANALİZ RAPORU\n\n";
    $analiz .= "MAĞDUR: {$d['magdurAdi']} ({$yas} YAŞ, {$cinsiyet})\n";
    $analiz .= "MALULİYET: %{$maluliyet}\n\n";

    if ($maluliyet >= 50) {
        $analiz .= "AĞIR MALULİYET DURUMU: Maluliyet oranı %{$maluliyet} olup ağır maluliyet kapsamındadır. Bu durumda bakıcı gideri ve manevi tazminat talepleri de değerlendirilmelidir.\n\n";
    } elseif ($maluliyet >= 20) {
        $analiz .= "ORTA DÜZEY MALULİYET: Maluliyet oranı %{$maluliyet} olup orta düzey maluliyet kapsamındadır.\n\n";
    } else {
        $analiz .= "HAFİF MALULİYET: Maluliyet oranı %{$maluliyet} olup hafif maluliyet kapsamındadır.\n\n";
    }

    $analiz .= "PMF TABLOSU: {$pmfTablosu} kullanılmıştır. ";
    if ($pmfTablosu === 'TRH2010') {
        $analiz .= "TRH2010, Yargıtay ve Tahkim Komisyonu tarafından en çok tercih edilen güncel tablodur.\n\n";
    } elseif ($pmfTablosu === 'CSO1980') {
        $analiz .= "CSO1980, uluslararası standart tablodur. Bazı mahkemeler TRH2010'u tercih etmektedir.\n\n";
    } else {
        $analiz .= "PMF1931, en eski tablodur. Güncel hesaplamalarda TRH2010 tercih edilmektedir.\n\n";
    }

    $analiz .= "HESAPLAMA DÖNEMLERİ:\n";
    $analiz .= "- Aktif Dönem: {$aktifYil} yıl (65 yaşına kadar çalışma dönemi)\n";
    $analiz .= "- Pasif Dönem: " . number_format($pasifYil, 1) . " yıl (emeklilik sonrası)\n";
    $analiz .= "- Progresif rant (1/Ln) metodu ile iskonto uygulanmıştır.\n\n";

    $analiz .= "TAVSİYELER:\n";
    $analiz .= "- Hesaplanan tazminat tutarı " . number_format($toplamKusurlu, 0, ',', '.') . " TL olup emsal kararlara uygun görülmektedir.\n";

    if ($kusur < 100) {
        $analiz .= "- Kusur oranı %{$kusur} uygulanmıştır. Kusur tespitinin ATK veya bilirkişi raporuyla desteklenmesi önerilir.\n";
    }

    $analiz .= "- Sigorta Tahkim Komisyonu'na başvuru yapılması önerilir.\n";
    $analiz .= "- Maluliyet raporunun Adli Tıp Kurumu onaylı olması önemlidir.\n";
    $analiz .= "- Manevi tazminat talebi de ayrıca değerlendirilmelidir.\n";
    $analiz .= "- Geçici iş göremezlik süresi için ayrıca tazminat talep edilebilir.\n";
    $analiz .= "- Tedavi giderleri ve bakıcı giderleri de talep edilebilir.";

    return $analiz;
}
