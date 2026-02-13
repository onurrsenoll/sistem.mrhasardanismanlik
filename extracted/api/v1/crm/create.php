<?php
/**
 * POST /api/v1/crm/create.php
 * Yeni CRM kaydı (potansiyel müşteri) oluştur
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['ad_soyad']);

$db = getDB();

$stmt = $db->prepare('INSERT INTO crm (ad_soyad, tc_vergi_no, telefon, telefon2, email, il, ilce, adres, plaka, marka, model_adi, arac_yili, arac_km, olay_aciklama, kaynak, dosya_turu, kaza_turu, kaza_tarihi, pozisyon, durum, oncelik, taslak, not_text, atanan_id, son_iletisim, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    clean($body['ad_soyad']),
    clean($body['tc_vergi_no'] ?? ''),
    clean($body['telefon'] ?? ''),
    clean($body['telefon2'] ?? ''),
    clean($body['email'] ?? ''),
    clean($body['il'] ?? ''),
    clean($body['ilce'] ?? ''),
    clean($body['adres'] ?? ''),
    clean($body['plaka'] ?? ''),
    clean($body['marka'] ?? ''),
    clean($body['model_adi'] ?? ''),
    !empty($body['arac_yili']) ? (int)$body['arac_yili'] : null,
    !empty($body['arac_km']) ? (int)$body['arac_km'] : null,
    clean($body['olay_aciklama'] ?? ''),
    clean($body['kaynak'] ?? ''),
    clean($body['dosya_turu'] ?? ''),
    clean($body['kaza_turu'] ?? ''),
    !empty($body['kaza_tarihi']) ? $body['kaza_tarihi'] : null,
    clean($body['pozisyon'] ?? ''),
    $body['durum'] ?? 'Yeni',
    clean($body['oncelik'] ?? 'NORMAL'),
    !empty($body['taslak']) ? 1 : 0,
    clean($body['not_text'] ?? ''),
    !empty($body['atanan_id']) ? (int)$body['atanan_id'] : null,
    !empty($body['son_iletisim']) ? $body['son_iletisim'] : date('Y-m-d'),
    $user['id']
]);

$id = (int)$db->lastInsertId();

log_action($user['id'], 'crm_ekle', "CRM kaydı: " . clean($body['ad_soyad']), 'crm', $id);

json_success(['id' => $id], 'CRM kaydı oluşturuldu', 201);
