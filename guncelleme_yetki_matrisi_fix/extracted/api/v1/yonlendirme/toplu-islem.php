<?php
/**
 * POST /api/v1/yonlendirme/toplu-islem.php
 * Toplu durum değişikliği veya silme
 * Body: { "ids": [1, 2, 3], "islem": "alindi"|"olumsuz"|"belirsiz"|"sil" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

// auth_required() YETKI_MAP üzerinden crm/crm-arama-toplu-islem yetkisini otomatik kontrol eder.
// Admin kullanıcılar has_yetki() içinde bypass edilir.
$user = auth_required();
$body = get_json_body();
require_fields($body, ['ids', 'islem']);

if (!is_array($body['ids']) || empty($body['ids'])) {
    json_error('Geçerli kayıt ID listesi gerekli', 422);
}

$islem = clean($body['islem']);
$allowedIslemler = ['alindi', 'olumsuz', 'belirsiz', 'sil'];
if (!in_array($islem, $allowedIslemler)) {
    json_error('Geçersiz işlem. İzin verilenler: ' . implode(', ', $allowedIslemler), 422);
}

// Silme işlemi için ayrı yetki kontrolü (yetki matrisi üzerinden)
if ($islem === 'sil' && !has_yetki($user, 'crm', 'crm-arama-sil')) {
    json_error('Toplu silme için yetkiniz yok. Yönetici yetki matrisinden "ARAMA LİSTESİ SİLME" izni verilmelidir.', 403);
}

$db = getDB();
$ids = array_map('intval', $body['ids']);
$placeholders = implode(',', array_fill(0, count($ids), '?'));

// Kayıtların var olduğunu doğrula
$stmt = $db->prepare("SELECT COUNT(*) as cnt FROM yonlendirme WHERE id IN ($placeholders)");
$stmt->execute($ids);
$count = (int)$stmt->fetch()['cnt'];

if ($count === 0) json_error('Hiçbir kayıt bulunamadı', 404);

$db->beginTransaction();

try {
    if ($islem === 'sil') {
        // Önce notları sil
        $stmt = $db->prepare("DELETE FROM yonlendirme_notlar WHERE yonlendirme_id IN ($placeholders)");
        $stmt->execute($ids);

        // Kayıtları sil
        $stmt = $db->prepare("DELETE FROM yonlendirme WHERE id IN ($placeholders)");
        $stmt->execute($ids);

        $message = "$count kayıt silindi";
    } else {
        // Durum eşlemesi
        $durumMap = [
            'alindi' => 'Alindi',
            'olumsuz' => 'Olumsuz',
            'belirsiz' => 'Belirsiz'
        ];
        $yeniDurum = $durumMap[$islem];

        $stmt = $db->prepare("UPDATE yonlendirme SET durum = ? WHERE id IN ($placeholders)");
        $stmt->execute(array_merge([$yeniDurum], $ids));

        $message = "$count kayıt '$yeniDurum' olarak güncellendi";
    }

    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    json_error('Toplu işlem hatası: ' . $e->getMessage(), 500);
}

log_action($user['id'], 'yonlendirme_toplu_' . $islem, "Toplu işlem ($islem): $count kayıt", 'yonlendirme', null);

json_success(['etkilenen' => $count], $message);
