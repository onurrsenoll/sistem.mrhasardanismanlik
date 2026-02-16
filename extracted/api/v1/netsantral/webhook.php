<?php
/**
 * POST /api/v1/netsantral/webhook.php
 * NetGSM NetSantral'dan gelen webhook bildirimleri
 * Bu endpoint dışarıdan erişime açıktır (auth yok)
 * Güvenlik: API key ile doğrulama
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

// OPTIONS isteği
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Sadece POST kabul et
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$db = getDB();

// NetSantral ayarlarını al
$stmt = $db->query('SELECT * FROM netsantral_ayarlar WHERE aktif = 1 AND webhook_aktif = 1 ORDER BY id DESC LIMIT 1');
$ayar = $stmt->fetch();

if (!$ayar) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Webhook deaktif']);
    exit;
}

// API key kontrolü (GET parametresi veya header)
$api_key = $_GET['key'] ?? ($_SERVER['HTTP_X_API_KEY'] ?? '');
if ($ayar['api_key'] && $api_key !== '' && $api_key !== $ayar['api_key']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid API key']);
    exit;
}

// Gelen veriyi oku
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

// POST parametrelerini de kontrol et
if (!$data || !is_array($data)) {
    $data = $_POST;
}

if (empty($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No data received']);
    exit;
}

// Webhook event tipi
$event = $data['event'] ?? $data['type'] ?? $data['action'] ?? 'unknown';
$call_id = $data['call_id'] ?? $data['callid'] ?? $data['uniqueid'] ?? uniqid('wh_');
$caller = $data['caller'] ?? $data['arayan'] ?? $data['src'] ?? '';
$called = $data['called'] ?? $data['aranan'] ?? $data['dst'] ?? '';
$extension = $data['extension'] ?? $data['dahili'] ?? $data['ext'] ?? '';
$status = $data['status'] ?? '';
$duration = isset($data['duration']) ? (int)$data['duration'] : 0;

// Durumu normalize et
$durum = 'bilinmiyor';
switch (strtolower($status)) {
    case 'ringing':
    case 'caliyor':
        $durum = 'caliyor';
        break;
    case 'answered':
    case 'cevaplandi':
    case 'up':
        $durum = 'cevaplandi';
        break;
    case 'busy':
    case 'mesgul':
        $durum = 'mesgul';
        break;
    case 'noanswer':
    case 'no-answer':
    case 'cevaplanmadi':
        $durum = 'cevaplanmadi';
        break;
    case 'transfer':
        $durum = 'transfer';
        break;
}

// Mevcut kayıt var mı kontrol et (aynı call_id ile)
$stmt = $db->prepare('SELECT id, durum FROM arama_kayitlari WHERE arama_id = ?');
$stmt->execute([$call_id]);
$mevcut = $stmt->fetch();

if ($mevcut) {
    // Güncelle
    $updates = ['durum = ?', 'ham_veri = JSON_ARRAY_APPEND(COALESCE(ham_veri, JSON_ARRAY()), "$", CAST(? AS JSON))'];
    $params = [$durum, json_encode($data)];

    if ($durum === 'cevaplandi') {
        $updates[] = 'cevap_zamani = NOW()';
    }
    if (in_array($durum, ['cevaplanmadi', 'mesgul']) || $event === 'hangup' || $event === 'end') {
        $updates[] = 'bitis_zamani = NOW()';
        if ($duration > 0) {
            $updates[] = 'sure = ?';
            $params[] = $duration;
        }
    }

    $params[] = $call_id;
    $sql = 'UPDATE arama_kayitlari SET ' . implode(', ', $updates) . ' WHERE arama_id = ?';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
} else {
    // Yeni kayıt ekle
    // Dahili'den kullanıcı bul
    $kullanici_id = null;
    if ($extension !== '') {
        $stmt = $db->prepare('SELECT kullanici_id FROM netsantral_dahililer WHERE dahili = ? AND aktif = 1');
        $stmt->execute([$extension]);
        $dahiliKayit = $stmt->fetch();
        if ($dahiliKayit) {
            $kullanici_id = $dahiliKayit['kullanici_id'];
        }
    }

    // Arayan numara ile CRM eşleştir
    $crm_id = null;
    if ($caller !== '') {
        $tel = preg_replace('/[^0-9]/', '', $caller);
        if (strlen($tel) >= 10) {
            $tel10 = substr($tel, -10);
            $stmt = $db->prepare("SELECT id FROM crm WHERE REPLACE(REPLACE(REPLACE(telefon, ' ', ''), '-', ''), '+', '') LIKE ? OR REPLACE(REPLACE(REPLACE(telefon2, ' ', ''), '-', ''), '+', '') LIKE ? ORDER BY id DESC LIMIT 1");
            $stmt->execute(["%$tel10", "%$tel10"]);
            $crmKayit = $stmt->fetch();
            if ($crmKayit) {
                $crm_id = $crmKayit['id'];
            }
        }
    }

    $stmt = $db->prepare('INSERT INTO arama_kayitlari (arama_id, yon, arayan, aranan, dahili, durum, baslangic_zamani, sure, kaynak, crm_id, kullanici_id, ham_veri) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)');
    $stmt->execute([
        $call_id,
        'gelen',
        $caller,
        $called,
        $extension,
        $durum,
        $duration,
        'webhook',
        $crm_id,
        $kullanici_id,
        json_encode([$data])
    ]);
}

echo json_encode(['success' => true, 'message' => 'OK']);
