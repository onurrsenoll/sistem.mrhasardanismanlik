<?php
/**
 * GET /api/v1/netsipp/bekleyen-cagri.php
 * Son 30 saniye içindeki gelen çağrıları döndürür
 * Frontend bu endpoint'i poll eder
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

// Son 30 saniye içindeki çağrıları getir
$stmt = $db->prepare("SELECT al.*,
    c.id as crm_id, c.ad_soyad as crm_ad_soyad, c.dosya_turu as crm_dosya_turu, c.durum as crm_durum
    FROM arama_loglari al
    LEFT JOIN crm c ON (c.telefon LIKE CONCAT('%', REPLACE(al.arayan, ' ', ''), '%') OR c.telefon2 LIKE CONCAT('%', REPLACE(al.arayan, ' ', ''), '%'))
    WHERE al.yon = 'gelen' AND al.durum = 'calıyor' AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND)
    ORDER BY al.created_at DESC LIMIT 5");
$stmt->execute();
$calls = $stmt->fetchAll();

json_success(['calls' => $calls]);
