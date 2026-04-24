<?php
/**
 * GET /api/v1/ai/motivasyon.php
 * Claude API ile motive edici söz üretir
 * API key veritabanından okunur
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/ai-helper.php';

setup_headers();
require_method('GET');

// Yedek sözler - API çalışmazsa bunlardan döner
$yedekSozler = [
    'Başarı, her gün küçük çabaların tekrarlanmasının toplamıdır. - Robert Collier',
    'Gelecek, bugünden hazırlananlarındır. - Malcolm X',
    'Yapabileceğine inanan yapabilir, inanamayan yapamaz. - Pablo Picasso',
    'Bir adım atmadan yol alınmaz, bir söz söylemeden dert anlatılmaz.',
    'Büyük işler küçük adımlarla başlar.',
    'Sabır acıdır ama meyvesi tatlıdır. - Jean-Jacques Rousseau',
    'Zorluklar, başarıya giden yolun taşlarıdır.',
    'Hedefine odaklanan zihin, her engeli aşar.',
    'İnsan ancak hayal ettiği kadar büyüktür. - Atatürk',
    'Hayatta en hakiki mürşit ilimdir. - Atatürk',
    'Zafer, zafer benimdir diyebilenindir. - Atatürk',
    'Yükselmek için tırmanmak gerekir, düşmek için bir anlık dikkatsizlik yeter.',
    'Güçlü insanlar başkaları için yol açar, zayıf insanlar yol kenarında bekler.',
    'Adalet mülkün temelidir.',
    'Azim ve kararlılık her kapıyı açan anahtardır.',
    'Fırtına ne kadar sert olursa olsun, güneş mutlaka doğar.',
    'Dünya cesur insanlar tarafından değiştirilir, korkaklar tarafından değil.',
    'Hayat bisiklete binmek gibidir. Dengenizi korumak için hareket etmeye devam etmelisiniz. - Albert Einstein',
    'Bir şeyi değiştirmek istiyorsanız önce kendinizi değiştirin. - Mahatma Gandhi',
    'Her zaman fark eder.'
];

// Rastgele konu seç
$konular = [
    'başarı ve azim', 'hayatta kararlılık', 'çalışkanlık ve emek',
    'umut ve gelecek', 'liderlik', 'adalet ve hukuk',
    'iş hayatında motivasyon', 'hedef belirleme', 'öz güven',
    'takım çalışması', 'sabır ve metanet', 'sorumluluk',
    'dürüstlük ve etik', 'cesaret', 'kararlılık ve irade gücü'
];
$konu = $konular[array_rand($konular)];

// Claude API ile söz üret
$prompt = "Bana " . $konu . " konusunda kısa, özlü, gerçek bir motive edici söz veya düşünce yaz. Sadece sözün kendisini yaz, başka hiçbir şey yazma. Tırnak işareti kullanma. Söz sahibi varsa sonuna - ile ekle. Türkçe olsun. Maksimum 2 cümle.";

$soz = '';

try {
    $result = callClaudeAPI($prompt, 'Kısa motivasyon sözü üret.', 0.9, 150);
    if ($result && isset($result['content'][0]['text'])) {
        $soz = trim($result['content'][0]['text']);
    }
} catch (\Exception $e) {
    // Claude başarısız olursa yedek söz kullan
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
