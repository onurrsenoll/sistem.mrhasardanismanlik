<?php
/**
 * GET/POST/PUT/DELETE /api/v1/mail/sablonlar.php
 * Mail şablonları (otomatik tetikleyici) yönetimi.
 *
 * TETİK TÜRLERİ (tetik kolonu):
 *  - dosya_acildi       : Yeni dosya açılınca müşteriye
 *  - police_yenileme    : Poliçe bitimine 15 gün kala
 *  - ajanda_yaklasan    : Görev saati yaklaşınca ilgili personele
 *  - tahsilat_alindi    : Tahsilat girildiğinde müşteriye teşekkür
 *  - ihbar_olusturuldu  : İhbar föyü kaydı için
 *  - manuel             : Sadece manuel gönderim için şablon
 *
 * ŞABLON DEĞİŞKENLERİ (icerik_html içinde):
 *  {{plaka}} {{ad_soyad}} {{dosya_no}} {{tarih}} {{police_no}} {{tutar}} vb.
 *  Tetik sırasında otomatik doldurulur.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
mail_ensure_tables();
$user = auth_required(['admin']);
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->query('SELECT * FROM mail_sablonlari ORDER BY tetik ASC, ad ASC');
    json_success(['items' => $stmt->fetchAll()]);
}
if ($method === 'POST') {
    $body = get_json_body();
    require_fields($body, ['ad', 'konu']);
    $stmt = $db->prepare('INSERT INTO mail_sablonlari (ad, tetik, konu, icerik_html, aktif, aciklama, created_by) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE ad=VALUES(ad), konu=VALUES(konu), icerik_html=VALUES(icerik_html), aktif=VALUES(aktif), aciklama=VALUES(aciklama)');
    $stmt->execute([
        clean($body['ad']),
        !empty($body['tetik']) ? clean($body['tetik']) : null,
        clean($body['konu']),
        $body['icerik_html'] ?? '',
        isset($body['aktif']) ? (int)(bool)$body['aktif'] : 1,
        clean($body['aciklama'] ?? ''),
        (int)$user['id']
    ]);
    $id = (int)$db->lastInsertId();
    log_action($user['id'], 'mail_sablon_ekle', clean($body['ad']), 'mail_sablonlari', $id);
    json_success(['id' => $id], 'Şablon kaydedildi', 201);
}
if ($method === 'PUT') {
    $body = get_json_body();
    require_fields($body, ['id']);
    $sets = []; $params = [];
    foreach (['ad','tetik','konu','icerik_html','aktif','aciklama'] as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            $params[] = $f === 'aktif' ? (int)(bool)$body[$f] : (is_string($body[$f]) ? clean($body[$f]) : $body[$f]);
        }
    }
    if (empty($sets)) json_error('Alan yok', 422);
    $params[] = (int)$body['id'];
    $db->prepare('UPDATE mail_sablonlari SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    log_action($user['id'], 'mail_sablon_guncelle', 'ID ' . $body['id'], 'mail_sablonlari', (int)$body['id']);
    json_success(null, 'Güncellendi');
}
if ($method === 'DELETE') {
    $body = get_json_body();
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) json_error('ID gerekli', 422);
    $db->prepare('DELETE FROM mail_sablonlari WHERE id = ?')->execute([$id]);
    log_action($user['id'], 'mail_sablon_sil', 'ID ' . $id, 'mail_sablonlari', $id);
    json_success(null, 'Silindi');
}
json_error('Geçersiz method', 405);
