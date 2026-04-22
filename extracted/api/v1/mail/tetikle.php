<?php
/**
 * POST /api/v1/mail/tetikle.php
 * OTOMATİK ŞABLON TETİKLEME — Sistem event'leri çağırır (dosya açıldı, poliçe yenileme vb.).
 *
 * Body: {
 *   tetik: 'dosya_acildi' | 'police_yenileme' | 'tahsilat_alindi' | 'manuel',
 *   alici: 'x@y.com',           // mail adresi
 *   hesap_id: null,             // hangi hesaptan gönderilecek (boşsa kullanıcının ilk aktif hesabı)
 *   degiskenler: { plaka: '34X', ad_soyad: 'Ali', ... }  // şablondaki {{...}} yerine konur
 * }
 *
 * Tetik koduna göre aktif şablonu bulur, değişkenleri doldurur, gönderir.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('POST');
mail_ensure_tables();
$user = auth_required();
$db = getDB();
$body = get_json_body();
require_fields($body, ['tetik', 'alici']);

$tetik = clean($body['tetik']);
$alici = clean($body['alici']);
$degiskenler = is_array($body['degiskenler'] ?? null) ? $body['degiskenler'] : [];

// Aktif şablonu bul
$stmt = $db->prepare('SELECT * FROM mail_sablonlari WHERE tetik = ? AND aktif = 1 LIMIT 1');
$stmt->execute([$tetik]);
$sablon = $stmt->fetch();
if (!$sablon) json_error('Aktif şablon bulunamadı (tetik: ' . $tetik . ')', 404);

// Değişken yerleştirme
$konu = $sablon['konu'];
$html = $sablon['icerik_html'];
foreach ($degiskenler as $k => $v) {
    $ph = '{{' . $k . '}}';
    $konu = str_replace($ph, (string)$v, $konu);
    $html = str_replace($ph, (string)$v, $html);
}

// Hesap seç
$hesapId = !empty($body['hesap_id']) ? (int)$body['hesap_id'] : 0;
if ($hesapId) {
    $stmt = $db->prepare('SELECT * FROM mail_hesaplar WHERE id = ? AND aktif = 1');
    $stmt->execute([$hesapId]);
} else {
    // Kullanıcının ilk aktif hesabı (admin ise herhangi bir aktif)
    if ($user['rol'] === 'admin') {
        $stmt = $db->query('SELECT * FROM mail_hesaplar WHERE aktif = 1 ORDER BY id ASC LIMIT 1');
    } else {
        $stmt = $db->prepare('SELECT * FROM mail_hesaplar WHERE kullanici_id = ? AND aktif = 1 ORDER BY id ASC LIMIT 1');
        $stmt->execute([(int)$user['id']]);
    }
}
$hesap = $stmt->fetch();
if (!$hesap) json_error('Gönderim için aktif mail hesabı yok', 404);

// Gönder
$sonuc = mail_smtp_gonder($hesap, [
    'to' => $alici,
    'subject' => $konu,
    'body_html' => $html,
    'body_text' => strip_tags($html)
]);

if ($sonuc['success']) {
    // Giden mail kaydet
    $stmt = $db->prepare('INSERT INTO mail_mesajlar (hesap_id, message_id, yon, klasor, gonderen, alici, konu, govde_text, govde_html, tarih, okundu) VALUES (?, ?, \'giden\', \'SENT\', ?, ?, ?, ?, ?, NOW(), 1)');
    $stmt->execute([
        $hesap['id'], $sonuc['message_id'] ?? null, $hesap['email'],
        $alici, $konu, strip_tags($html), $html
    ]);
    log_action($user['id'], 'mail_tetikle', "Tetik: $tetik → $alici", 'mail_mesajlar', (int)$db->lastInsertId());
    json_success(null, 'Otomatik mail gönderildi');
} else {
    json_error('Gönderim hatası: ' . $sonuc['error'], 500);
}
