<?php
/**
 * GET /api/v1/personel/evrak-liste.php?personel_id=X
 *
 * v2.24 — Personel özlük evraklarını listele.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');
$user = auth_required();
$db = getDB();

$personelId = (int)($_GET['personel_id'] ?? 0);
if (!$personelId) json_error('personel_id zorunlu', 422);

$stmt = $db->prepare('
    SELECT e.id, e.personel_id, e.evrak_turu, e.evrak_etiketi, e.dosya_adi,
           e.dosya_yolu, e.mime_type, e.dosya_boyutu, e.yukleyen_id,
           e.created_at, u.ad_soyad AS yukleyen_ad
    FROM personel_evraklari e
    LEFT JOIN users u ON u.id = e.yukleyen_id
    WHERE e.personel_id = ? AND (e.odeme_id IS NULL OR e.odeme_id = 0)
    ORDER BY e.evrak_turu ASC, e.created_at DESC
');
$stmt->execute([$personelId]);
$liste = $stmt->fetchAll(PDO::FETCH_ASSOC);

json_success(['evraklar' => $liste, 'toplam' => count($liste)]);
