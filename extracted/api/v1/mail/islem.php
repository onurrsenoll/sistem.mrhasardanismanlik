<?php
/**
 * PUT /api/v1/mail/islem.php
 * Mail işlemleri (okundu, yıldız, sil)
 * Body: { "id": 1, "islem": "okundu|okunmadi|yildiz|sil" }
 * Toplu: { "ids": [1,2,3], "islem": "okundu|sil" }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/mail_helper.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
$db = getDB();
mail_tablo_olustur($db);

$islem = $body['islem'] ?? '';

// Tekli işlem
if (!empty($body['id'])) {
    $id = (int)$body['id'];
    switch ($islem) {
        case 'okundu':
            $db->prepare("UPDATE mailler SET okundu = 1 WHERE id = ?")->execute([$id]);
            break;
        case 'okunmadi':
            $db->prepare("UPDATE mailler SET okundu = 0 WHERE id = ?")->execute([$id]);
            break;
        case 'yildiz':
            $db->prepare("UPDATE mailler SET yildizli = NOT yildizli WHERE id = ?")->execute([$id]);
            break;
        case 'sil':
            $db->prepare("DELETE FROM mailler WHERE id = ?")->execute([$id]);
            break;
        default:
            json_error('GEÇERSİZ İŞLEM');
    }
    json_success(null, 'İŞLEM TAMAMLANDI');
}

// Toplu işlem
if (!empty($body['ids']) && is_array($body['ids'])) {
    $ids = array_map('intval', $body['ids']);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    switch ($islem) {
        case 'okundu':
            $db->prepare("UPDATE mailler SET okundu = 1 WHERE id IN ($placeholders)")->execute($ids);
            break;
        case 'sil':
            $db->prepare("DELETE FROM mailler WHERE id IN ($placeholders)")->execute($ids);
            break;
        default:
            json_error('GEÇERSİZ İŞLEM');
    }
    json_success(null, count($ids) . ' MAIL İŞLENDİ');
}

json_error('ID VEYA IDS GEREKLİ');
