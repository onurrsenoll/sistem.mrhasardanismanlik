<?php
/**
 * GET /api/v1/ai/motivasyon.php
 * Google Gemini API ile motive edici söz üretir
 * Her çağrıda farklı, anlamlı, Türkçe söz döner
 */

require_once __DIR__ . '/../../config/helpers.php';

setup_headers();
require_method('GET');

// Gemini API Key
$apiKey = 'AIzaSyBCtNfGQUQbYJh_hfRUQt-rcj61Ua9BQsE';

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

$requestBody = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 1.2,
        'maxOutputTokens' => 150,
        'topP' => 0.95,
        'topK' => 40
    ]
];

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . $apiKey;

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode($requestBody),
    CURLOPT_TIMEOUT => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error || $httpCode !== 200) {
    // API hatası - yerel yedek sözler
    $yedek = [
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
        'Başarı yolculuğunda en büyük engel, kendi kendimize koyduğumuz sınırlardır.'
    ];
    json_success(['soz' => $yedek[array_rand($yedek)]]);
}

$data = json_decode($response, true);

$soz = '';
if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
    $soz = trim($data['candidates'][0]['content']['parts'][0]['text']);
    // Tırnak temizle
    $soz = trim($soz, "\"'""''«»");
    $soz = str_replace(["\n", "\r"], ' ', $soz);
    $soz = preg_replace('/\s+/', ' ', $soz);
}

if (empty($soz)) {
    $yedek = [
        'Başarı, her gün küçük çabaların tekrarlanmasının toplamıdır. - Robert Collier',
        'Gelecek, bugünden hazırlananlarındır. - Malcolm X',
        'İnsan ancak hayal ettiği kadar büyüktür. - Atatürk'
    ];
    $soz = $yedek[array_rand($yedek)];
}

json_success(['soz' => $soz]);
