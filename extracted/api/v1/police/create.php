<?php
/**
 * POST /api/v1/police/create.php
 * Yeni poliçe oluştur
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['police_no', 'sigorta_sirketi', 'brans', 'musteri_adi', 'tanzim_tarihi', 'baslangic_tarihi', 'bitis_tarihi', 'brut_prim']);

$db = getDB();

// Aynı poliçe numarası kontrolü
$stmt = $db->prepare('SELECT id FROM policeler WHERE police_no = ?');
$stmt->execute([clean($body['police_no'])]);
if ($stmt->fetch()) {
    json_error('Bu poliçe numarası zaten mevcut', 422);
}

try {
    $stmt = $db->prepare('INSERT INTO policeler (
        police_no, yenileme_no, police_turu, sigorta_sirketi, brans,
        musteri_adi, musteri_tc, musteri_telefon, musteri_email, plaka,
        tanzim_tarihi, baslangic_tarihi, bitis_tarihi,
        brut_prim, net_prim, komisyon_orani, komisyon_tutari,
        tahsil_edilen, tahsilat_durumu, durum,
        hatirlatma_gun, hatirlatma_gonderildi, notlar, olusturan_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, \'beklemede\', \'aktif\', ?, 0, ?, ?)');

    $stmt->execute([
        clean($body['police_no']),
        clean($body['yenileme_no'] ?? ''),
        clean($body['police_turu'] ?? 'yeni'),
        clean($body['sigorta_sirketi']),
        clean($body['brans']),
        clean($body['musteri_adi']),
        clean($body['musteri_tc'] ?? ''),
        clean($body['musteri_telefon'] ?? ''),
        clean($body['musteri_email'] ?? ''),
        clean($body['plaka'] ?? ''),
        $body['tanzim_tarihi'],
        $body['baslangic_tarihi'],
        $body['bitis_tarihi'],
        (float)$body['brut_prim'],
        (float)($body['net_prim'] ?? 0),
        (float)($body['komisyon_orani'] ?? 0),
        (float)($body['komisyon_tutari'] ?? 0),
        (int)($body['hatirlatma_gun'] ?? 30),
        clean($body['notlar'] ?? ''),
        $user['id']
    ]);

    $id = (int)$db->lastInsertId();

    log_action($user['id'], 'police_ekle', 'Poliçe oluşturuldu: ' . clean($body['police_no']), 'policeler', $id);

    json_success(['id' => $id], 'Poliçe oluşturuldu', 201);

} catch (Exception $e) {
    json_error('Poliçe oluşturma hatası: ' . $e->getMessage(), 500);
}
