<?php
/**
 * POST /api/v1/police/create.php
 * Yeni poliçe oluştur — v2.11: belge_seri, dogum_tarihi, sase_no, personel
 * alanları artık INSERT'te kayıt ediliyor (önceki sürümde sessizce düşüyordu).
 * Eksik kolonlar idempotent ALTER ile ekleniyor.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required();
$body = get_json_body();
require_fields($body, ['police_no', 'sigorta_sirketi', 'brans', 'musteri_adi', 'tanzim_tarihi', 'baslangic_tarihi', 'bitis_tarihi', 'brut_prim']);

$db = getDB();

/* DDL: yeni poliçe alanları için kolonları idempotent ekle */
try {
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS belge_seri VARCHAR(50) DEFAULT ''");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS dogum_tarihi DATE DEFAULT NULL");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS sase_no VARCHAR(50) DEFAULT ''");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS personel VARCHAR(120) DEFAULT ''");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS marka VARCHAR(60) DEFAULT ''");
    $db->exec("ALTER TABLE policeler ADD COLUMN IF NOT EXISTS model_yili VARCHAR(8) DEFAULT ''");
} catch (Exception $e) { /* sessiz */ }

/* Aynı poliçe numarası kontrolü */
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
        hatirlatma_gun, hatirlatma_gonderildi, notlar, olusturan_id,
        belge_seri, dogum_tarihi, sase_no, personel, marka, model_yili
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, \'beklemede\', \'aktif\', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)');

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
        $user['id'],
        clean($body['belge_seri'] ?? ''),
        !empty($body['dogum_tarihi']) ? $body['dogum_tarihi'] : null,
        clean($body['sase_no'] ?? ''),
        clean($body['personel'] ?? ''),
        clean($body['marka'] ?? ''),
        clean($body['model_yili'] ?? '')
    ]);

    $id = (int)$db->lastInsertId();

    log_action($user['id'], 'police_ekle', 'Poliçe oluşturuldu: ' . clean($body['police_no']), 'policeler', $id);

    json_success(['id' => $id], 'Poliçe oluşturuldu', 201);

} catch (Exception $e) {
    json_error('Poliçe oluşturma hatası: ' . $e->getMessage(), 500);
}
