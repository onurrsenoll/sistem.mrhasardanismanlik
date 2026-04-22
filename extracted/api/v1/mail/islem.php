<?php
/**
 * PUT /api/v1/mail/islem.php
 * Mail işlemleri: okundu/okunmadi/yildizli/sil
 * Body: { id | ids: [..], islem: 'okundu' | 'okunmadi' | 'yildizli' | 'yildizsiz' | 'sil' | 'geri_yukle' }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('PUT');
mail_ensure_tables();
$user = auth_required();
$db = getDB();
$body = get_json_body();
require_fields($body, ['islem']);

$islem = clean($body['islem']);
$idler = [];
if (!empty($body['id'])) $idler[] = (int)$body['id'];
if (!empty($body['ids']) && is_array($body['ids'])) $idler = array_merge($idler, array_map('intval', $body['ids']));
if (empty($idler)) json_error('ID gerekli', 422);

// Yetki kontrolü
$place = implode(',', array_fill(0, count($idler), '?'));
$sql = "SELECT m.id, h.kullanici_id FROM mail_mesajlar m JOIN mail_hesaplar h ON h.id = m.hesap_id WHERE m.id IN ($place)";
$stmt = $db->prepare($sql);
$stmt->execute($idler);
$mesajlar = $stmt->fetchAll();
foreach ($mesajlar as $m) {
    if ($user['rol'] !== 'admin' && (int)$m['kullanici_id'] !== (int)$user['id']) {
        json_error('En az bir mail için yetkiniz yok', 403);
    }
}

$map = [
    'okundu' => ['okundu', 1],
    'okunmadi' => ['okundu', 0],
    'yildizli' => ['yildizli', 1],
    'yildizsiz' => ['yildizli', 0],
    'sil' => ['silindi', 1],
    'geri_yukle' => ['silindi', 0]
];
if (!isset($map[$islem])) json_error('Geçersiz işlem', 422);
[$kolon, $deger] = $map[$islem];

$params = [$deger];
$params = array_merge($params, $idler);
$db->prepare("UPDATE mail_mesajlar SET $kolon = ? WHERE id IN ($place)")->execute($params);

log_action($user['id'], 'mail_islem', "$islem: " . count($idler) . ' mesaj', 'mail_mesajlar', $idler[0]);
json_success(['etkilenen' => count($idler)], 'İşlem tamam');
