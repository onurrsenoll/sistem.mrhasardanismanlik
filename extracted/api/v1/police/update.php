<?php
/**
 * PUT /api/v1/police/update.php
 * Poliçe güncelle
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM policeler WHERE id = ?');
$stmt->execute([$id]);
$police = $stmt->fetch();
if (!$police) json_error('Poliçe bulunamadı', 404);

$fields = [
    'police_no', 'yenileme_no', 'police_turu', 'sigorta_sirketi', 'brans',
    'musteri_adi', 'musteri_tc', 'musteri_telefon', 'musteri_email', 'plaka',
    'tanzim_tarihi', 'baslangic_tarihi', 'bitis_tarihi',
    'brut_prim', 'net_prim', 'komisyon_orani', 'komisyon_tutari',
    'durum', 'hatirlatma_gun', 'hatirlatma_gonderildi', 'notlar'
];

$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if (in_array($field, ['brut_prim', 'net_prim', 'komisyon_orani', 'komisyon_tutari'])) {
            $params[] = $body[$field] !== null && $body[$field] !== '' ? (float)$body[$field] : null;
        } elseif (in_array($field, ['hatirlatma_gun', 'hatirlatma_gonderildi'])) {
            $params[] = (int)$body[$field];
        } elseif (in_array($field, ['tanzim_tarihi', 'baslangic_tarihi', 'bitis_tarihi'])) {
            $params[] = !empty($body[$field]) ? $body[$field] : null;
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE policeler SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'police_guncelle', 'Poliçe güncellendi: ' . $police['police_no'], 'policeler', $id);

json_success(null, 'Poliçe güncellendi');
