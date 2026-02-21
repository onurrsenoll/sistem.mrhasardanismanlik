<?php
/**
 * POST /api/v1/saha/create.php
 * YENİ SAHA DOSYASI OLUŞTUR (TASLAK OLARAK)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'personel', 'uzman', 'avukat']);
$body = get_json_body();

// Zorunlu alan
if (!isset($body['musteri_adi']) || empty(trim($body['musteri_adi']))) {
    json_error('MÜŞTERİ ADI ZORUNLUDUR', 400);
}

$db = getDB();

try {
    $stmt = $db->prepare("INSERT INTO saha_dosyalar
        (personel_id, durum, musteri_adi, musteri_telefon, musteri_tc,
         hasar_tipi, hasar_tarihi, hasar_yeri, hasar_aciklama, hasar_tutari,
         hasar_durumu, gecmis_hasar, dosya_kaynagi,
         arac_plaka, arac_marka, arac_model, arac_model_yili, arac_km,
         arac_ruhsat_sahibi, arac_kusur_durumu, arac_renk, arac_sasi_no,
         karsi_plaka, karsi_sigorta, created_at)
        VALUES (?, 'taslak', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");

    $stmt->execute([
        $user['id'],
        clean($body['musteri_adi']),
        clean($body['musteri_telefon'] ?? ''),
        clean($body['musteri_tc'] ?? ''),
        clean($body['hasar_tipi'] ?? ''),
        !empty($body['hasar_tarihi']) ? $body['hasar_tarihi'] : null,
        clean($body['hasar_yeri'] ?? ''),
        clean($body['hasar_aciklama'] ?? ''),
        !empty($body['hasar_tutari']) ? (float)str_replace(['.', ','], ['', '.'], strval($body['hasar_tutari'])) : null,
        !empty($body['hasar_durumu']) ? clean($body['hasar_durumu']) : 'dosya_acik',
        !empty($body['gecmis_hasar']) ? clean($body['gecmis_hasar']) : 'yok',
        clean($body['dosya_kaynagi'] ?? ''),
        clean($body['arac_plaka'] ?? ''),
        clean($body['arac_marka'] ?? ''),
        clean($body['arac_model'] ?? ''),
        !empty($body['arac_model_yili']) ? (int)$body['arac_model_yili'] : null,
        !empty($body['arac_km']) ? (int)$body['arac_km'] : null,
        clean($body['arac_ruhsat_sahibi'] ?? ''),
        clean($body['arac_kusur_durumu'] ?? ''),
        clean($body['arac_renk'] ?? ''),
        clean($body['arac_sasi_no'] ?? ''),
        clean($body['karsi_plaka'] ?? ''),
        clean($body['karsi_sigorta'] ?? '')
    ]);

    $sahaId = (int)$db->lastInsertId();

    // TASLAK olarak oluşturulduğunda bildirim GÖNDERİLMEZ
    // Bildirim sadece "onaya gönder" işleminde gönderilir

    log_action($user['id'], 'saha_olustur', "Saha dosya taslak oluşturuldu: " . clean($body['musteri_adi']), 'saha_dosyalar', $sahaId);

    json_success(['id' => $sahaId], 'SAHA DOSYASI TASLAK OLARAK OLUŞTURULDU', 201);

} catch (\Exception $e) {
    json_error('SAHA DOSYASI OLUŞTURULURKEN HATA: ' . $e->getMessage(), 500);
}
