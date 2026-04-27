<?php
/**
 * GET /api/v1/mail/yeni-sayisi.php
 * Kullanicinin OKUNMAMIS mail sayisini ve son gelen mailin bilgisini doner.
 * Polling icin hizli endpoint - sayac + ses bildirim icin.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('GET');
mail_ensure_tables();

$user = auth_required();
$db = getDB();

try {
    /* Admin tum mailleri, kullanici sadece kendi atanmis hesaplari */
    if ($user['rol'] === 'admin') {
        $where = '';
        $params = [];
    } else {
        $where = ' AND h.kullanici_id = ?';
        $params = [(int)$user['id']];
    }

    $sql = 'SELECT COUNT(*) AS okunmamis, MAX(m.tarih) AS son_tarih, MAX(m.id) AS son_id
            FROM mail_mesajlar m
            JOIN mail_hesaplar h ON h.id = m.hesap_id
            WHERE m.silindi = 0 AND m.okundu = 0 AND m.yon = "gelen"' . $where;
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();

    /* Hesap aktiflik bilgisi */
    if ($user['rol'] === 'admin') {
        $hStmt = $db->query('SELECT COUNT(*) c FROM mail_hesaplar WHERE aktif = 1');
        $hCount = (int)$hStmt->fetch()['c'];
    } else {
        $hStmt = $db->prepare('SELECT COUNT(*) c FROM mail_hesaplar WHERE aktif = 1 AND kullanici_id = ?');
        $hStmt->execute([(int)$user['id']]);
        $hCount = (int)$hStmt->fetch()['c'];
    }

    json_success([
        'okunmamis' => (int)($row['okunmamis'] ?? 0),
        'son_tarih' => $row['son_tarih'] ?? null,
        'son_id' => (int)($row['son_id'] ?? 0),
        'aktif_hesap_sayisi' => $hCount
    ]);
} catch (\Exception $e) {
    json_success(['okunmamis' => 0, 'son_tarih' => null, 'son_id' => 0, 'aktif_hesap_sayisi' => 0]);
}
