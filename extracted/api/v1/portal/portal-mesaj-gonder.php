<?php
/**
 * POST /api/v1/portal/portal-mesaj-gonder.php
 * Admin panelinden müşteriye mesaj gönder
 * Body: { dosya_id, mesaj }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/migration.php';

setup_headers();
require_method('POST');
ensure_portal_tables();

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

$dosyaId = (int)($body['dosya_id'] ?? 0);
$mesaj = trim($body['mesaj'] ?? '');

if ($dosyaId <= 0) { json_error('DOSYA ID GEREKLİ', 422); }
if (empty($mesaj)) { json_error('MESAJ METNİ GEREKLİ', 422); }

$db = getDB();

// Portal erişim kaydını bul
$stmtErisim = $db->prepare("SELECT id FROM portal_erisim WHERE dosya_id = ? AND aktif = 1 LIMIT 1");
$stmtErisim->execute([$dosyaId]);
$erisim = $stmtErisim->fetch();

$erisimId = $erisim ? (int)$erisim['id'] : null;

$stmt = $db->prepare("INSERT INTO portal_mesajlar (dosya_id, portal_erisim_id, gonderen_tip, gonderen_id, mesaj) VALUES (?, ?, 'firma', ?, ?)");
$stmt->execute([$dosyaId, $erisimId, $user['id'], clean($mesaj)]);

json_success(['id' => (int)$db->lastInsertId()], 'MESAJ GÖNDERİLDİ');
