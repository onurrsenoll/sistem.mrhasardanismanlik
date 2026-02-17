<?php
/**
 * POST /api/v1/sms/gonder.php
 * Manuel SMS gönderimi (belirli dosya müşterisine)
 * Body: { "dosya_id": 1, "mesaj": "Özel mesaj metni" }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/sms_helper.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['dosya_id', 'mesaj']);

$dosyaId = (int)$body['dosya_id'];
$mesaj = $body['mesaj'];

// DOSYA + MAĞDUR TELEFON BİLGİSİNİ ÇEK
$db = getDB();
$stmt = $db->prepare("
    SELECT d.dosya_no, m.ad_soyad, m.telefon
    FROM dosyalar d
    LEFT JOIN magdurlar m ON m.dosya_id = d.id
    WHERE d.id = ?
");
$stmt->execute([$dosyaId]);
$bilgi = $stmt->fetch();

if (!$bilgi) {
    json_error('DOSYA BULUNAMADI', 404);
}

if (empty($bilgi['telefon'])) {
    json_error('MAĞDUR TELEFON NUMARASI KAYITLI DEĞİL. DOSYA BİLGİLERİNDEN TELEFON GİRİN.', 422);
}

$sonuc = sms_gonder($bilgi['telefon'], $mesaj, $dosyaId, $user['id']);

log_action($user['id'], 'sms_gonder', "Manuel SMS: {$bilgi['dosya_no']} - {$bilgi['telefon']} - Sonuç: {$sonuc['mesaj']}", 'sms_loglari');

json_success([
    'sonuc' => $sonuc,
    'dosya_no' => $bilgi['dosya_no'],
    'telefon' => $bilgi['telefon']
], $sonuc['basarili'] ? 'SMS GÖNDERİLDİ' : 'SMS GÖNDERİLEMEDİ: ' . $sonuc['mesaj']);
