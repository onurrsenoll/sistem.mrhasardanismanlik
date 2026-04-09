<?php
/**
 * MR HASAR DANIŞMANLIK - EVRAK ANALİZ ENDPOINTİ
 * Claude Vision AI ile KTT / Hasar İhbar Föyü okuma
 * 3 Tip: anlasma_ktt, polis_ktt, hasar_ihbar
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

// API KEY
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
        // Küçük görselleri büyüt
        if ($w < 1600 || $h < 1200) {
            $scale = max(1600 / $w, 1200 / $h, 1.5);
            $nw = intval($w * $scale); $nh = intval($h * $scale);
            $scaled = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($scaled, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img); $img = $scaled;
        }
        // Grayscale + kontrast + keskinleştirme (el yazısı için kritik)
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

// ═══ PROMPT'LAR ═══
if ($tip === 'anlasma_ktt') {
    $prompt = 'Bu görsel bir ANLAŞMALI MADDİ HASARLI TRAFİK KAZASI TESPİT TUTANAĞI (KTT) fotoğrafıdır.
EL YAZISI İLE DOLDURULMUŞ OLABİLİR - dikkatle oku.

Belgedeki TÜM bilgileri dikkatle oku ve aşağıdaki JSON formatında döndür:
{
  "kaza_tarihi": "GG.AA.YYYY formatında",
  "kaza_saati": "SS:DD formatında",
  "kaza_yeri_il": "İl adı",
  "kaza_yeri_ilce": "İlçe adı",
  "kaza_yeri_mahalle": "Mahalle/Semt",
  "kaza_yeri_sokak": "Sokak/Cadde",
  "arac_a": {
    "plaka": "plaka numarası",
    "marka_model": "araç marka ve model",
    "surucu_adi": "sürücü adı soyadı",
    "surucu_tc": "TC kimlik no",
    "surucu_telefon": "telefon numarası",
    "surucu_adres": "adres bilgisi",
    "ehliyet_no": "ehliyet numarası varsa",
    "sigorta_sirketi": "sigorta şirketi adı",
    "police_no": "poliçe numarası",
    "hasar_bolgeleri": "hasarlı bölgeler listesi",
    "kusur_isaret": "işaretlenen kusur maddeleri (numaralar)"
  },
  "arac_b": {
    "plaka": "plaka numarası",
    "marka_model": "araç marka ve model",
    "surucu_adi": "sürücü adı soyadı",
    "surucu_tc": "TC kimlik no",
    "surucu_telefon": "telefon numarası",
    "surucu_adres": "adres bilgisi",
    "ehliyet_no": "ehliyet numarası varsa",
    "sigorta_sirketi": "sigorta şirketi adı",
    "police_no": "poliçe numarası",
    "hasar_bolgeleri": "hasarlı bölgeler listesi",
    "kusur_isaret": "işaretlenen kusur maddeleri (numaralar)"
  },
  "tanik_adi": "tanık adı soyadı varsa",
  "tanik_plaka": "tanık plakası varsa",
  "kaza_aciklama": "10. maddedeki kaza açıklaması (tam metin)",
  "guven": güven yüzdesi (1-100)
}

ÖNEMLİ KURALLAR:
- EL YAZISI dikkatle oku, harfleri tek tek ayır
- Plaka formatı: 2 rakam + 1-3 harf + 2-4 rakam (Örn: 55AOM782, 06DTZ681)
- TC kimlik numarası 11 haneli sayıdır
- Telefon numarası 05XX ile başlar, 10-11 hane
- İşaretlenen kusur kutucuklarının numaralarını yaz
- A ve B araçlarını KARIŞTIRMA, sol taraf A, sağ taraf B
- Bulamadığın alanları null yap
- Sadece JSON döndür, başka metin yazma.';

} elseif ($tip === 'polis_ktt') {
    $prompt = 'Bu görsel bir POLİS TRAFİK KAZA TESPİT TUTANAĞI fotoğrafıdır. Birden fazla sayfa olabilir.

Belgedeki TÜM bilgileri dikkatle oku ve aşağıdaki JSON formatında döndür:
{
  "tutanak_no": "tutanak numarası",
  "kaza_tarihi": "GG.AA.YYYY formatında",
  "kaza_saati": "SS:DD formatında",
  "kaza_yeri_il": "İl",
  "kaza_yeri_ilce": "İlçe",
  "kaza_yeri_mahalle": "Mahalle/Mevki",
  "kaza_yeri_adres": "Cadde/Sokak/Yol adı",
  "yol_tipi": "devlet yolu/il yolu/şehir içi vs.",
  "yol_kaplama": "asfalt/beton/stabilize vs.",
  "hava_durumu": "açık/yağmurlu vs.",
  "araclar": [
    {
      "sira": 1,
      "plaka": "plaka numarası",
      "marka": "araç markası",
      "model": "araç modeli",
      "model_yili": "model yılı",
      "renk": "araç rengi",
      "surucu_adi": "sürücü adı soyadı",
      "surucu_tc": "TC kimlik no",
      "surucu_dogum": "doğum yılı",
      "ehliyet_sinif": "ehliyet sınıfı",
      "sigorta_sirketi": "trafik sigortası şirketi",
      "police_no": "poliçe numarası",
      "hasar_durumu": "hasar açıklaması",
      "kusur_orani": "varsa kusur oranı veya ihlal maddesi",
      "alkol_durumu": "alkol test sonucu"
    }
  ],
  "yaralilar": [
    {
      "adi": "yaralı adı soyadı",
      "tc": "TC no",
      "pozisyon": "sürücü/yolcu/yaya",
      "durum": "hafif/ağır yaralı"
    }
  ],
  "kaza_ozeti": "M.KAZANIN ÖZETİ bölümündeki tam metin",
  "kusur_tespiti": "kusur tespiti ve ihlal edilen kanun maddeleri",
  "guven": güven yüzdesi (1-100)
}

ÖNEMLİ: Birden fazla araç ve yaralı olabilir, hepsini listele.
Bulamadığın alanları null yap. Sadece JSON döndür.';

} else {
    // hasar_ihbar
    $prompt = 'Bu görsel bir SİGORTA ŞİRKETİ HASAR İHBAR FÖYÜ / DOSYA KAPAĞI fotoğrafıdır.
Her sigorta şirketinin formatı farklı olabilir. Belgedeki TÜM bilgileri oku.

Aşağıdaki JSON formatında döndür:
{
  "dosya_no": "hasar dosya numarası",
  "musteri_no": "müşteri/sigortalı numarası",
  "sigorta_sirketi": "sigorta şirketi adı",
  "acente_adi": "acente adı/ünvanı",
  "police_no": "poliçe numarası",
  "police_turu": "kasko/trafik/dask vs.",
  "sigorta_bedeli": "sigorta bedeli (TL)",
  "police_bitis": "poliçe bitiş tarihi",
  "sigortali_adi": "sigortalı adı soyadı / ticari ünvan",
  "sigortali_tc": "TC/Vergi numarası",
  "sigortali_telefon": "telefon numarası",
  "sigortali_adres": "adres bilgisi",
  "arac_plaka": "araç plaka numarası",
  "arac_marka": "araç markası",
  "arac_model": "araç modeli",
  "arac_yili": "model yılı",
  "arac_sase": "şase numarası varsa",
  "hasar_tarihi": "hasar/kaza tarihi",
  "ihbar_tarihi": "ihbar tarihi",
  "hasar_nedeni": "hasar nedeni (çarpışma/hırsızlık vs.)",
  "hasar_yeri": "hasar yeri/ili",
  "hasar_aciklama": "hasar açıklaması",
  "kusur_durumu": "kusur oranı veya bilgisi",
  "eksper_adi": "eksper adı soyadı varsa",
  "servis_adi": "servis/onarım yeri adı varsa",
  "magdur_bilgileri": [
    {
      "adi": "mağdur adı soyadı",
      "plaka": "mağdur araç plakası",
      "hasar_tutari": "hasar tutarı"
    }
  ],
  "toplam_hasar": "toplam hasar tutarı varsa",
  "guven": güven yüzdesi (1-100)
}

ÖNEMLİ: Her sigorta şirketinin formatı farklıdır. Alanları esnek oku.
Bulamadığın alanları null yap. Sadece JSON döndür.';
}

// ═══ CLAUDE VİSİON API ═══
$url = 'https://api.anthropic.com/v1/messages';

$content = $images;
$content[] = ['type' => 'text', 'text' => $prompt];

$payload = [
    'model' => 'claude-haiku-4-5-20251001',
    'max_tokens' => 4096,
    'messages' => [['role' => 'user', 'content' => $content]]
];

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

$res = http_post($url, $jsonPayload, $headers, 90);

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

// ═══ JSON PARSE ═══
$parsed = null;
$t = trim($text);
$r = json_decode($t, true);
if ($r && is_array($r)) { $parsed = $r; }
if (!$parsed && preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $t, $m)) {
    $r = json_decode(trim($m[1]), true);
    if ($r && is_array($r)) { $parsed = $r; }
}
if (!$parsed) {
    $f = strpos($t, '{'); $l = strrpos($t, '}');
    if ($f !== false && $l !== false && $l > $f) {
        $r = json_decode(substr($t, $f, $l - $f + 1), true);
        if ($r && is_array($r)) { $parsed = $r; }
    }
}

if ($parsed) {
    echo json_encode(['success' => true, 'data' => $parsed, 'tip' => $tip]);
} else {
    echo json_encode(['success' => false, 'error' => 'EVRAK ANALİZ EDİLEMEDİ. NET GÖRÜNTÜ YÜKLEYİN.', 'raw' => $text]);
}
