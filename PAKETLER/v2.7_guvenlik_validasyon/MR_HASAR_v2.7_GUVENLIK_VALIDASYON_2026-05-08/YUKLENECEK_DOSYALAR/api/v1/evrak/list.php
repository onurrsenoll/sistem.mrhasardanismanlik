<?php
/**
 * GET /api/v1/evrak/list.php?dosya_id=1
 * Evrak listesi
 *
 * v2.7 (#034): SOFT-DELETE CASCADE FİLTRESİ
 *   Silinmiş dosyaların evrakları artık listede görünmez.
 *   Bağlı dosyası olmayan evraklar (sistem evrakları) korunur.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
$pag = get_pagination();

$dosyaId = (int)($_GET['dosya_id'] ?? 0);
$evrakTuru = clean($_GET['evrak_turu'] ?? '');

$where = [];
$params = [];

if ($dosyaId) {
    $where[] = 'e.dosya_id = ?';
    $params[] = $dosyaId;
}

if ($evrakTuru !== '') {
    $where[] = 'e.evrak_turu = ?';
    $params[] = $evrakTuru;
}

/* v2.7 (#034): Soft-delete cascade —
   evraklar.dosya_id ya null ya da bağlı dosya silinmemiş olmalı */
$where[] = '(e.dosya_id IS NULL OR d.silindi = 0 OR d.silindi IS NULL)';

$whereSQL = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

// COUNT için JOIN gerekli (silindi filtresi için)
$stmt = $db->prepare("SELECT COUNT(*) as total FROM evraklar e LEFT JOIN dosyalar d ON d.id = e.dosya_id $whereSQL");
$stmt->execute($params);
$total = (int)$stmt->fetch()['total'];

$dataSQL = "SELECT e.id, e.dosya_id, e.evrak_turu, e.dosya_adi, e.dosya_boyutu, e.mime_type, e.created_at, u.ad_soyad as kullanici_adi, d.dosya_no
    FROM evraklar e
    LEFT JOIN users u ON u.id = e.kullanici_id
    LEFT JOIN dosyalar d ON d.id = e.dosya_id
    $whereSQL
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?";
$params[] = (int)$pag['limit'];
$params[] = (int)$pag['offset'];
$stmt = $db->prepare($dataSQL);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pag);
