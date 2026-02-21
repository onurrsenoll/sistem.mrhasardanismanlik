<?php
/**
 * POST /api/v1/saha/create.php
 * YENİ SAHA DOSYASI OLUŞTUR
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'personel', 'uzman', 'avukat']);
$body = get_json_body();

// Zorunlu alan
require_fields($body, ['musteri_adi']);

$db = getDB();

try {
    $stmt = $db->prepare("INSERT INTO saha_dosyalar
        (personel_id, durum, musteri_adi, musteri_telefon, musteri_tc,
         hasar_tipi, hasar_tarihi, hasar_yeri, hasar_aciklama,
         sigorta_sirketi, police_no, plaka, karsi_plaka, karsi_sigorta)
        VALUES (?, 'beklemede', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $stmt->execute([
        $user['id'],
        clean($body['musteri_adi']),
        clean($body['musteri_telefon'] ?? ''),
        clean($body['musteri_tc'] ?? ''),
        clean($body['hasar_tipi'] ?? ''),
        !empty($body['hasar_tarihi']) ? $body['hasar_tarihi'] : null,
        clean($body['hasar_yeri'] ?? ''),
        clean($body['hasar_aciklama'] ?? ''),
        clean($body['sigorta_sirketi'] ?? ''),
        clean($body['police_no'] ?? ''),
        clean($body['plaka'] ?? ''),
        clean($body['karsi_plaka'] ?? ''),
        clean($body['karsi_sigorta'] ?? '')
    ]);

    $sahaId = (int)$db->lastInsertId();

    // Admin kullanıcılara bildirim gönder
    $admins = $db->query("SELECT id FROM users WHERE rol = 'admin' AND aktif = 1")->fetchAll();
    $icerik = clean($body['musteri_adi']) . ' - ' . clean($body['hasar_tipi'] ?? 'BELİRTİLMEDİ') . ' - ' . clean($body['plaka'] ?? '');

    foreach ($admins as $admin) {
        $stmt2 = $db->prepare("INSERT INTO bildirimler (gonderen_id, alici_id, baslik, icerik, tip, okundu) VALUES (?, ?, ?, ?, 'uyari', 0)");
        $stmt2->execute([
            $user['id'],
            $admin['id'],
            'SAHA DOSYA ONAY BEKLİYOR',
            $icerik
        ]);
    }

    log_action($user['id'], 'saha_olustur', "Saha dosya oluşturuldu: " . clean($body['musteri_adi']), 'saha_dosyalar', $sahaId);

    json_success(['id' => $sahaId], 'SAHA DOSYASI BAŞARIYLA OLUŞTURULDU', 201);

} catch (\Exception $e) {
    json_error('SAHA DOSYASI OLUŞTURULURKEN HATA: ' . $e->getMessage(), 500);
}
