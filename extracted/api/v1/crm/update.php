<?php
/**
 * PUT /api/v1/crm/update.php
 * CRM kaydı güncelle
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM crm WHERE id = ?');
$stmt->execute([$id]);
$crm = $stmt->fetch();
if (!$crm) json_error('CRM kaydı bulunamadı', 404);

$fields = ['ad_soyad', 'tc_vergi_no', 'telefon', 'telefon2', 'email', 'il', 'ilce', 'adres',
    'plaka', 'marka', 'model_adi', 'arac_yili', 'arac_km', 'olay_aciklama',
    'kaynak', 'dosya_turu', 'kaza_turu', 'pozisyon', 'durum', 'oncelik', 'taslak', 'not_text',
    'atanan_id', 'son_iletisim', 'donusen_dosya_id'];

$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if (in_array($field, ['atanan_id', 'donusen_dosya_id', 'arac_yili', 'arac_km', 'taslak'])) {
            $params[] = !empty($body[$field]) ? (int)$body[$field] : null;
        } elseif ($field === 'son_iletisim') {
            $params[] = !empty($body[$field]) ? $body[$field] : null;
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE crm SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'crm_guncelle', "CRM güncellendi: {$crm['ad_soyad']}", 'crm', $id);

json_success(null, 'CRM kaydı güncellendi');
