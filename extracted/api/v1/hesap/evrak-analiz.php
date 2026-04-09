<?php
/**
 * MR HASAR DANIŞMANLIK - EVRAK ANALİZ ENDPOINTİ v2
 * Claude Vision AI ile KTT / Hasar İhbar Föyü okuma
 * TRAMER 48 senaryo kusur analizi dahil
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);

set_exception_handler(function($e) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'SUNUCU HATASI: ' . $e->getMessage()]);
    exit;
});

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/ai-helper.php';

setup_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('GEÇERSİZ İSTEK YÖNTEMİ', 405);
}

$user = auth_required();

$keys = getAiKeys();
$apiKey = $keys['active'];
if (empty($apiKey)) {
    echo json_encode(['success' => false, 'error' => 'CLAUDE API KEY BULUNAMADI']);
    exit;
}

$tip = isset($_POST['tip']) ? $_POST['tip'] : 'anlasma_ktt';
$dosyaSayisi = intval(isset($_POST['dosya_sayisi']) ? $_POST['dosya_sayisi'] : 1);

// ═══ GD GÖRÜNTÜ ÖN İŞLEME ═══
function preprocessEvrak($content, $mime) {
    if (!function_exists('imagecreatefromstring') || $mime === 'application/pdf') {
        return ['content' => $content, 'mime' => $mime];
    }
    try {
        $img = imagecreatefromstring($content);
        if (!$img) return ['content' => $content, 'mime' => $mime];
        $w = imagesx($img); $h = imagesy($img);
        if ($w < 1600 || $h < 1200) {
            $scale = max(1600 / $w, 1200 / $h, 1.5);
            $nw = intval($w * $scale); $nh = intval($h * $scale);
            $scaled = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($scaled, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img); $img = $scaled;
        }
        imagefilter($img, IMG_FILTER_GRAYSCALE);
        imagefilter($img, IMG_FILTER_CONTRAST, -40);
        imagefilter($img, IMG_FILTER_BRIGHTNESS, 15);
        $sharpen = [[0,-1,0],[-1,6,-1],[0,-1,0]];
        imageconvolution($img, $sharpen, 2, 0);
        imagefilter($img, IMG_FILTER_CONTRAST, -20);
        ob_start();
        imagejpeg($img, null, 96);
        $processed = ob_get_clean();
        imagedestroy($img);
        if ($processed && strlen($processed) > 0) return ['content' => $processed, 'mime' => 'image/jpeg'];
    } catch (Exception $e) {}
    return ['content' => $content, 'mime' => $mime];
}

// ═══ DOSYALARI OKU ═══
$images = [];
for ($i = 0; $i < $dosyaSayisi; $i++) {
    $key = 'dosya_' . $i;
    if (!isset($_FILES[$key]) || $_FILES[$key]['error'] !== UPLOAD_ERR_OK) continue;
    $file = $_FILES[$key];
    if ($file['size'] > 15 * 1024 * 1024) continue;
    $allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    $mime = $file['type'];
    if (!in_array($mime, $allowed)) continue;
    $content = file_get_contents($file['tmp_name']);
    if ($content === false) continue;
    $processed = preprocessEvrak($content, $mime);
    $images[] = [
        'type' => 'image',
        'source' => [
            'type' => 'base64',
            'media_type' => $processed['mime'],
            'data' => base64_encode($processed['content'])
        ]
    ];
}

if (empty($images)) {
    echo json_encode(['success' => false, 'error' => 'GEÇERLİ DOSYA BULUNAMADI']);
    exit;
}

// ═══ TRAMER SENARYOLARI ═══
$TRAMER = 'DURUM 1A: Aynı yönde A kırmızı ışıkta durmuş B takip mesafesi korumadı → B %100
DURUM 2: Kırmızı ışıkta geçiş yapan A → A %100
DURUM 4: Her iki sürücü yeşil ışık iddiasında → A %50 B %50
DURUM 6: B tali yoldan ana yola çıkarken A ya yol vermedi → B %100
DURUM 7: B karşı şeride geçti → B %100
DURUM 9: A B ye arkadan çarptı → A %100 (K.Y.T.K.56/1-c)
DURUM 10: A arkadan çarptı → A %100
DURUM 12: B sağ şeritten dar kavisle dönüş yapmadı → B %100
DURUM 13: İşaretsiz kavşakta B sağdan gelen A ya öncelik vermedi → B %100
DURUM 14: Her iki araç sağ şerit ihlali → A %50 B %50
DURUM 20: A sollamada sol taraftan gelen aracı beklemedi → A %100
DURUM 25: B iz/mülkten çıkarken A nın geçişini beklemedi → B %100
DURUM 26: B şerit değiştirme ihlali → B %100
DURUM 27: A kurallı park etmiş araca çarptı → A %100
DURUM 30: Zincirleme arkadan çarpmalar her çarpan araç %100
DURUM 44: A dikkatsiz ana yola çıktı B ye çarptı A %100
DURUM 47: B kontrolsüz U dönüşü → B %100
DURUM 48: A ters yöne girdi B ile çarpıştı → A %100';

// ═══ PROMPT'LAR ═══
if ($tip === 'anlasma_ktt') {
    $systemPrompt = "Türk trafik sigortası kusur analiz uzmanısın. TRAMER senaryoları:\n{$TRAMER}\n\nKaza Tespit Tutanağını analiz et. Önce krokilere, sonra beyanlara bak. SADECE geçerli JSON döndür.";

    $prompt = 'Bu görsel ANLAŞMALI MADDİ HASARLI TRAFİK KAZASI TESPİT TUTANAĞI. EL YAZISI ile doldurulmuş olabilir.

SADECE JSON döndür:
{
  "kazaBilgileri":{"tarih":"","saat":"","il":"","ilce":"","cadde":""},
  "aracA":{"plaka":"","marka":"","surucu":"","tc":"","telefon":"","adres":"","sigorta":"","policeNo":"","hasarYeri":""},
  "aracB":{"plaka":"","marka":"","surucu":"","tc":"","telefon":"","adres":"","sigorta":"","policeNo":"","hasarYeri":""},
  "kroKiAnalizi":{"yolYapisi":"","aAracPozisyon":"","bAracPozisyon":"","carpismaNokta":"","ozet":""},
  "beyanAnalizi":{"aBeyan":"","bBeyan":"","celisme":"","kroKiUyum":""},
  "eslesenSenaryo":"DURUM X",
  "kusurAnalizi":"3-4 cümle analiz",
  "kusurTablosu":[{"arac":"A","plaka":"","kusurOrani":0,"kusurNedeni":""},{"arac":"B","plaka":"","kusurOrani":100,"kusurNedeni":""}],
  "yasalDayanak":["K.Y.T.K. madde"],
  "kritikTespitler":["tespit"],
  "guven":75
}

KURALLAR:
- EL YAZISINI dikkatle oku
- Plaka: 2 rakam + 1-3 harf + 2-4 rakam
- TC: 11 haneli, Telefon: 05XX ile başlar
- A sol taraf, B sağ taraf
- Krokileri ve beyanları karşılaştır
- TRAMER senaryosuyla eşleştir
- null kullan bulamadığın için';

} elseif ($tip === 'polis_ktt') {
    $systemPrompt = "Türk trafik sigortası kusur analiz uzmanısın. TRAMER senaryoları:\n{$TRAMER}\n\nPolis Kaza Tespit Tutanağını analiz et. SADECE geçerli JSON döndür.";

    $prompt = 'Bu görsel POLİS TRAFİK KAZA TESPİT TUTANAĞI. Birden fazla sayfa olabilir.

SADECE JSON döndür:
{
  "kazaBilgileri":{"tutanakNo":"","tarih":"","saat":"","il":"","ilce":"","cadde":"","yolTipi":"","havaDurumu":""},
  "aracA":{"plaka":"","marka":"","model":"","modelYili":"","surucu":"","tc":"","sigorta":"","policeNo":"","hasarYeri":"","alkol":""},
  "aracB":{"plaka":"","marka":"","model":"","modelYili":"","surucu":"","tc":"","sigorta":"","policeNo":"","hasarYeri":"","alkol":""},
  "yaralilar":[{"adi":"","pozisyon":"","durum":""}],
  "kroKiAnalizi":{"yolYapisi":"","aAracPozisyon":"","bAracPozisyon":"","carpismaNokta":"","ozet":""},
  "beyanAnalizi":{"aBeyan":"","bBeyan":"","celisme":"","kroKiUyum":""},
  "eslesenSenaryo":"DURUM X",
  "kusurAnalizi":"3-4 cümle analiz",
  "kusurTablosu":[{"arac":"A","plaka":"","kusurOrani":0,"kusurNedeni":""},{"arac":"B","plaka":"","kusurOrani":100,"kusurNedeni":""}],
  "yasalDayanak":[""],
  "kritikTespitler":[""],
  "kazaOzeti":"M.KAZANIN ÖZETİ tam metin",
  "guven":80
}';

} else {
    $systemPrompt = null;
    $prompt = 'Bu görsel SİGORTA ŞİRKETİ HASAR İHBAR FÖYÜ / DOSYA KAPAĞI. Her şirketin formatı farklı.

SADECE JSON döndür:
{
  "dosyaNo":"","musteriNo":"","sigortaSirketi":"","acenteAdi":"",
  "policeNo":"","policeTuru":"","sigortaBedeli":"","policeBitis":"",
  "sigortaliAdi":"","sigortaliTc":"","sigortaliTelefon":"","sigortaliAdres":"",
  "aracPlaka":"","aracMarka":"","aracModel":"","aracYili":"","aracSase":"",
  "hasarTarihi":"","ihbarTarihi":"","hasarNedeni":"","hasarYeri":"",
  "hasarAciklama":"","kusurDurumu":"","eksperAdi":"","servisAdi":"",
  "toplamHasar":"",
  "magdurlar":[{"adi":"","plaka":"","tutar":""}],
  "guven":80
}
Bulamadığın alanlara null yaz.';
}

// ═══ CLAUDE VİSİON API ═══
$url = 'https://api.anthropic.com/v1/messages';

$content = $images;
$content[] = ['type' => 'text', 'text' => $prompt];

$messages = [['role' => 'user', 'content' => $content]];

$payload = [
    'model' => 'claude-haiku-4-5-20251001',
    'max_tokens' => 4096,
    'messages' => $messages
];

if ($systemPrompt) {
    $payload['system'] = $systemPrompt;
}

$jsonPayload = json_encode($payload);
if ($jsonPayload === false) {
    echo json_encode(['success' => false, 'error' => 'JSON ENCODE HATASI']);
    exit;
}

$headers = [
    'Content-Type: application/json',
    'x-api-key: ' . $apiKey,
    'anthropic-version: 2023-06-01'
];

$res = http_post($url, $jsonPayload, $headers, 120);

if ($res['http_code'] !== 200 || !$res['body']) {
    echo json_encode(['success' => false, 'error' => 'CLAUDE API HATASI: HTTP ' . $res['http_code'] . ($res['error'] ? ' - ' . $res['error'] : '')]);
    exit;
}

$data = json_decode($res['body'], true);
$text = '';
if (isset($data['content'])) {
    foreach ($data['content'] as $block) {
        if (isset($block['text'])) $text .= $block['text'];
    }
}

if (empty($text)) {
    echo json_encode(['success' => false, 'error' => 'CLAUDE YANIT ALINAMADI']);
    exit;
}

// ═══ JSON PARSE (bozuk JSON onarma) ═══
$parsed = null;
$t = preg_replace('/```json|```/', '', trim($text));

$r = json_decode($t, true);
if ($r && is_array($r)) { $parsed = $r; }

if (!$parsed && preg_match('/\{[\s\S]*\}/', $t, $m)) {
    // Süslü parantez dengeleme
    $candidate = $m[0];
    $open = substr_count($candidate, '{');
    $close = substr_count($candidate, '}');
    if ($open > $close) $candidate .= str_repeat('}', $open - $close);
    $r = json_decode($candidate, true);
    if ($r && is_array($r)) { $parsed = $r; }
}

if (!$parsed) {
    // Son çare: kapanmamış string düzeltme
    $fixed = preg_replace('/,\s*\}/', '}', $t);
    $fixed = preg_replace('/,\s*\]/', ']', $fixed);
    $f = strpos($fixed, '{'); $l = strrpos($fixed, '}');
    if ($f !== false && $l !== false && $l > $f) {
        $r = json_decode(substr($fixed, $f, $l - $f + 1), true);
        if ($r && is_array($r)) { $parsed = $r; }
    }
}

if ($parsed) {
    $parsed['_tip'] = $tip;
    echo json_encode(['success' => true, 'data' => $parsed, 'tip' => $tip]);
} else {
    echo json_encode(['success' => false, 'error' => 'EVRAK ANALİZ EDİLEMEDİ', 'raw' => substr($text, 0, 500)]);
}
