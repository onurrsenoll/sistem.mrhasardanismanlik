<?php
/**
 * GET /api/v1/ai/motivasyon.php
 * Google Gemini API ile motive edici söz üretir
 * API key veritabanından okunur, yoksa varsayılan kullanılır
 * Limit dolunca Sistem > Firma Ayarları'ndan yeni key girilebilir
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/database.php';

setup_headers();
require_method('GET');

// Yedek sözler - API çalışmazsa bunlardan döner
$yedekSozler = [
    'Başarı, her gün küçük çabaların tekrarlanmasının toplamıdır. - Robert Collier',
    'Gelecek, bugünden hazırlananlarındır. - Malcolm X',
    'Yapabileceğine inanan yapabilir, inanamayan yapamaz. Bu değişmez bir kuraldır. - Pablo Picasso',
    'Başarısızlık, başarının baharatıdır. - Truman Capote',
    'Bir adım atmadan yol alınmaz, bir söz söylemeden dert anlatılmaz.',
    'Büyük işler küçük adımlarla başlar.',
    'Sabır acıdır ama meyvesi tatlıdır. - Jean-Jacques Rousseau',
    'Zorluklar, başarıya giden yolun taşlarıdır.',
    'Hedefine odaklanan zihin, her engeli aşar.',
    'Bugünün işini yarına bırakma, yarının ne getireceği belirsizdir.',
    'Dürüstlük en iyi politikadır. - Benjamin Franklin',
    'Her şeyin bir başlangıcı vardır, ama devam eden kazanır.',
    'İnsan ancak hayal ettiği kadar büyüktür. - Atatürk',
    'Hayatta en hakiki mürşit ilimdir. - Atatürk',
    'Başarı yolculuğunda en büyük engel, kendi kendimize koyduğumuz sınırlardır.',
    'Zafer, zafer benimdir diyebilenindir. - Atatürk',
    'Yükselmek için tırmanmak gerekir, düşmek için bir anlık dikkatsizlik yeter.',
    'Kararlı bir insanın yapamayacağı hiçbir şey yoktur. - Emerson',
    'Güçlü insanlar başkaları için yol açar, zayıf insanlar yol kenarında bekler.',
    'Her başarının arkasında cesaret, her cesaretin arkasında inanç vardır.',
    'Adalet mülkün temelidir.',
    'Azim ve kararlılık her kapıyı açan anahtardır.',
    'Bilgi güçtür ama uygulanan bilgi gerçek güçtür. - Francis Bacon',
    'Fırtına ne kadar sert olursa olsun, güneş mutlaka doğar.',
    'Tek bir mumun ışığı, karanlığın tamamını yenebilir.',
    'Dünya cesur insanlar tarafından değiştirilir, korkaklar tarafından değil.',
    'İş yapan insan hata yapabilir ama hiçbir şey yapmayan insan en büyük hatayı yapar.',
    'Hayat bisiklete binmek gibidir. Dengenizi korumak için hareket etmeye devam etmelisiniz. - Albert Einstein',
    'Başarılı insanlar işe başlar, başarısız insanlar bahane üretir.',
    'Bir şeyi değiştirmek istiyorsanız önce kendinizi değiştirin. - Mahatma Gandhi'
];

// API KEY: Önce veritabanından oku, yoksa varsayılan kullan
$apiKey = '';
$varsayilanKey = 'AIzaSyAxIkYW3-i8FfxoYU83NFPvbwJckhsxDfI';

try {
    $db = getDB();
    $stmt = $db->prepare("SELECT deger FROM ayarlar WHERE anahtar = 'gemini_api_key'");
    $stmt->execute();
    $row = $stmt->fetch();
    if ($row && !empty(trim($row['deger']))) {
        $apiKey = trim($row['deger']);
    }
} catch (Exception $e) {}

if (empty($apiKey)) {
    $apiKey = $varsayilanKey;
}

// Rastgele konu seç
$konular = [
    'başarı ve azim', 'hayatta kararlılık', 'çalışkanlık ve emek',
    'umut ve gelecek', 'liderlik', 'adalet ve hukuk',
    'iş hayatında motivasyon', 'hedef belirleme', 'öz güven',
    'takım çalışması', 'sabır ve metanet', 'yenilikçilik',
    'sorumluluk', 'dürüstlük ve etik', 'zaman yönetimi',
    'hayallerine ulaşmak', 'değişim ve gelişim', 'bilgelik',
    'cesaret', 'kararlılık ve irade gücü'
];
$konu = $konular[array_rand($konular)];

$prompt = "Bana " . $konu . " konusunda kısa, özlü, gerçek bir motive edici söz veya düşünce yaz. Sadece sözün kendisini yaz, başka hiçbir şey yazma. Tırnak işareti kullanma. Söz sahibi varsa sonuna - ile ekle. Türkçe olsun. Maksimum 2 cümle.";

$requestBody = json_encode([
    'contents' => [
        ['parts' => [['text' => $prompt]]]
    ],
    'generationConfig' => [
        'temperature' => 1.2,
        'maxOutputTokens' => 150,
        'topP' => 0.95,
        'topK' => 40
    ]
]);

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $apiKey;

$soz = '';

// Evrensel HTTP POST (curl → file_get_contents → socket fallback)
$res = http_post($url, $requestBody, ['Content-Type: application/json'], 10);

if ($res['http_code'] === 200 && $res['body']) {
    $data = json_decode($res['body'], true);
    if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
        $soz = trim($data['candidates'][0]['content']['parts'][0]['text']);
    }
}

// SÖZ TEMİZLEME
if (!empty($soz)) {
    $soz = trim($soz, "\"'" . "\xc2\xab\xc2\xbb*#");
    $soz = str_replace(["\n", "\r", "\t"], ' ', $soz);
    $soz = preg_replace('/\s+/', ' ', $soz);
    $soz = trim($soz);
}

// API'DEN SÖZ GELMEDİYSE YEDEK KULLAN
if (empty($soz)) {
    $soz = $yedekSozler[array_rand($yedekSozler)];
}

json_success(['soz' => $soz]);
