<?php
/**
 * GET /api/v1/whatsapp/log-list.php — WhatsApp gönderim kayıtları
 * Params: ?dosya_id=&durum=gonderildi|hata&telefon=&page=&limit=
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/whatsapp_helper.php';

setup_headers();
require_method('GET');
$user = auth_required(['admin', 'uzman', 'personel']);

$db = getDB();
wa_log_tablo_olustur($db);
$pagination = get_pagination();

$where = '1=1'; $params = [];
if (!empty($_GET['dosya_id'])) { $where .= ' AND w.dosya_id = ?'; $params[] = (int)$_GET['dosya_id']; }
if (!empty($_GET['durum']))    { $where .= ' AND w.durum = ?';    $params[] = $_GET['durum']; }
if (!empty($_GET['telefon']))  { $where .= ' AND w.telefon LIKE ?'; $params[] = '%' . $_GET['telefon'] . '%'; }

$stmtC = $db->prepare("SELECT COUNT(*) FROM whatsapp_loglari w WHERE $where");
$stmtC->execute($params);
$total = (int)$stmtC->fetchColumn();

$sql = "SELECT w.*, u.ad_soyad AS kullanici_adi
        FROM whatsapp_loglari w
        LEFT JOIN users u ON u.id = w.kullanici_id
        WHERE $where
        ORDER BY w.created_at DESC
        LIMIT {$pagination['limit']} OFFSET {$pagination['offset']}";
$stmt = $db->prepare($sql);
$stmt->execute($params);
$items = $stmt->fetchAll();

paginated_response($items, $total, $pagination);
