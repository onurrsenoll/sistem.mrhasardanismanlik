<?php
/**
 * PUT /api/v1/yonlendirme/update.php
 * Yönlendirme kaydı güncelle
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
ensure_yonlendirme_columns();
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM yonlendirme WHERE id = ?');
$stmt->execute([$id]);
$kayit = $stmt->fetch();
if (!$kayit) json_error('Yönlendirme kaydı bulunamadı', 404);

// Rol bazlı erişim: personel sadece kendine atanmış veya kendi yüklediği kaydı güncelleyebilir
$rolGorebilirTumu = in_array($user['rol'], ['admin', 'uzman', 'avukat'], true);
if (!$rolGorebilirTumu) {
    $atanan = (int)($kayit['atanan_id'] ?? 0);
    $olusturan = (int)($kayit['created_by'] ?? 0);
    if ($atanan !== (int)$user['id'] && $olusturan !== (int)$user['id']) {
        json_error('Bu kayıt için yetkiniz yok', 403);
    }
}

$fields = ['sira_no', 'yonlendiren', 'yonlendirme_tarihi', 'kaza_turu', 'magdur_ad_soyad',
    'magdur_telefon', 'magdur_il', 'magdur_ilce', 'magdur_tc', 'gorusme_tarihi',
    'durum', 'alinmama_nedeni', 'son_durum', 'son_gorusme_sonucu', 'sonraki_arama', 'atanan_id',
    'donusen_crm_id', 'donusen_dosya_id', 'batch_id',
    'dosya_turu', 'plaka', 'sigorta_sirket', 'kusur_durumu', 'maluliyet',
    'kaza_pozisyonu', 'guncel_durum', 'dosya_durumu', 'kaza_tarihi'];

$sets = [];
$params = [];

foreach ($fields as $field) {
    if (array_key_exists($field, $body)) {
        $sets[] = "$field = ?";
        if (in_array($field, ['sira_no', 'atanan_id', 'donusen_crm_id', 'donusen_dosya_id'])) {
            $params[] = !empty($body[$field]) ? (int)$body[$field] : null;
        } elseif (in_array($field, ['yonlendirme_tarihi', 'gorusme_tarihi', 'sonraki_arama', 'kaza_tarihi'])) {
            $params[] = !empty($body[$field]) ? $body[$field] : null;
        } else {
            $params[] = clean($body[$field]);
        }
    }
}

if (empty($sets)) json_error('Güncellenecek alan yok', 422);

$params[] = $id;
$stmt = $db->prepare('UPDATE yonlendirme SET ' . implode(', ', $sets) . ' WHERE id = ?');
$stmt->execute($params);

log_action($user['id'], 'yonlendirme_guncelle', "Yönlendirme güncellendi: {$kayit['magdur_ad_soyad']}", 'yonlendirme', $id);

json_success(null, 'Yönlendirme kaydı güncellendi');
