<?php
/**
 * PUT /api/v1/personel/hakedis-ode.php
 * Hakediş ödeme durumu güncelle
 * Body: { "id": 1, "odeme_durumu": "odendi", "odeme_tarihi": "2026-02-28" }
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

$stmt = $db->prepare('SELECT ph.*, p.ad_soyad FROM personel_hakedis ph LEFT JOIN personel p ON p.id = ph.personel_id WHERE ph.id = ?');
$stmt->execute([$id]);
$hakedis = $stmt->fetch();
if (!$hakedis) json_error('HAKEDİŞ KAYDI BULUNAMADI', 404);

$odemeDurumu = clean($body['odeme_durumu'] ?? 'odendi');
$odemeTarihi = !empty($body['odeme_tarihi']) ? $body['odeme_tarihi'] : date('Y-m-d');

$stmt = $db->prepare('UPDATE personel_hakedis SET odeme_durumu = ?, odeme_tarihi = ? WHERE id = ?');
$stmt->execute([$odemeDurumu, $odemeTarihi, $id]);

log_action($user['id'], 'hakedis_ode', "Hakediş ödendi: {$hakedis['ad_soyad']} - {$hakedis['donem']} - ₺{$hakedis['toplam_hakedis']}", 'personel_hakedis', $id);

json_success(['id' => $id], 'HAKEDİŞ ÖDEME DURUMU GÜNCELLENDİ');
