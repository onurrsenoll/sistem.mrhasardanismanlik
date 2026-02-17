<?php
/**
 * POST /api/v1/dosya/create.php
 * Yeni dosya oluştur (mağdur + araç bilgileriyle birlikte)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['ad_soyad', 'dosya_turu']);

$db = getDB();

// Frontend 'dosya_kaynak' gönderir, backend 'dosya_kaynagi' bekler
if (!isset($body['dosya_kaynagi']) && isset($body['dosya_kaynak'])) {
    $body['dosya_kaynagi'] = $body['dosya_kaynak'];
}
// Frontend 'komisyon' gönderir, backend 'komisyon_orani' bekler
if (!isset($body['komisyon_orani']) && isset($body['komisyon'])) {
    $body['komisyon_orani'] = $body['komisyon'];
}

try {
    $db->beginTransaction();

    // 1. Dosya No üret
    $dosyaNo = generate_dosya_no($db);

    // 2. Dosya kaydı
    $stmt = $db->prepare('INSERT INTO dosyalar (dosya_no, dosya_turu, talep_turu, asama, sigorta_sirket, police_no, sigorta_turu, dosya_kaynagi, avukat_id, ortak_id, sorumlu_id, haklilik, komisyon_orani, kaza_tarihi, kaza_il, kaza_ilce, hasar_no, acilis_tarihi, notlar, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)');

    $hasar_no = 'HSR-' . date('Y') . '-' . str_pad(mt_rand(1, 999), 3, '0', STR_PAD_LEFT);

    $stmt->execute([
        $dosyaNo,
        clean($body['dosya_turu']),
        clean($body['talep_turu'] ?? ''),
        'Dosya Açık',
        clean($body['sigorta_sirket'] ?? ''),
        clean($body['police_no'] ?? ''),
        clean($body['sigorta_turu'] ?? ''),
        clean($body['dosya_kaynagi'] ?? ''),
        !empty($body['avukat_id']) ? (int)$body['avukat_id'] : null,
        !empty($body['ortak_id']) ? (int)$body['ortak_id'] : null,
        !empty($body['sorumlu_id']) ? (int)$body['sorumlu_id'] : $user['id'],
        (int)($body['haklilik'] ?? 100),
        (float)($body['komisyon_orani'] ?? 0),
        !empty($body['kaza_tarihi']) ? $body['kaza_tarihi'] : null,
        clean($body['kaza_il'] ?? ''),
        clean($body['kaza_ilce'] ?? ''),
        $hasar_no,
        clean($body['notlar'] ?? ''),
        $user['id']
    ]);
    
    $dosyaId = (int)$db->lastInsertId();
    
    // 3. Mağdur kaydı
    $stmt = $db->prepare('INSERT INTO magdurlar (dosya_id, tc_kimlik, ad_soyad, telefon, telefon2, email, iban, adres, il, ilce, dogum_tarihi, cinsiyet, meslek, gelir_durumu) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $dosyaId,
        clean($body['tc_kimlik'] ?? ''),
        clean($body['ad_soyad']),
        clean($body['telefon'] ?? ''),
        clean($body['telefon2'] ?? ''),
        clean($body['email'] ?? ''),
        clean($body['iban'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        clean($body['ilce'] ?? ''),
        !empty($body['dogum_tarihi']) ? $body['dogum_tarihi'] : null,
        !empty($body['cinsiyet']) ? $body['cinsiyet'] : null,
        clean($body['meslek'] ?? ''),
        clean($body['gelir_durumu'] ?? '')
    ]);
    
    // 4. Araç kayıtları (ADK ise)
    if ($body['dosya_turu'] === 'ADK') {
        // Mağdur aracı
        if (!empty($body['ma_plaka'])) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, marka, model, model_yili, kasko, kasko_sirket, kasko_police) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaId,
                'magdur',
                format_plaka($body['ma_plaka']),
                clean($body['ma_marka'] ?? ''),
                clean($body['ma_model'] ?? ''),
                !empty($body['ma_yil']) ? (int)$body['ma_yil'] : null,
                !empty($body['ma_kasko']) ? 1 : 0,
                clean($body['ma_kasko_sirket'] ?? ''),
                clean($body['ma_kasko_police'] ?? '')
            ]);
        }
        
        // Karşı araç
        if (!empty($body['ka_plaka'])) {
            $stmt = $db->prepare('INSERT INTO araclar (dosya_id, taraf, plaka, ruhsat_sahibi, tc_kimlik, marka, model, model_yili, trafik_sirket, trafik_police) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $dosyaId,
                'karsi',
                format_plaka($body['ka_plaka']),
                clean($body['ka_ruhsat'] ?? ''),
                clean($body['ka_tc'] ?? ''),
                clean($body['ka_marka'] ?? ''),
                clean($body['ka_model'] ?? ''),
                !empty($body['ka_yil']) ? (int)$body['ka_yil'] : null,
                clean($body['ka_trafik'] ?? ''),
                clean($body['ka_trafik_police'] ?? '')
            ]);
        }
    }
    
    $db->commit();
    
    log_action($user['id'], 'dosya_olustur', "Dosya oluşturuldu: $dosyaNo", 'dosyalar', $dosyaId);
    
    json_success([
        'dosya_id' => $dosyaId,
        'dosya_no' => $dosyaNo,
        'hasar_no' => $hasar_no
    ], 'Dosya başarıyla oluşturuldu', 201);
    
} catch (\Exception $e) {
    $db->rollBack();
    json_error('Dosya oluşturulurken hata: ' . $e->getMessage(), 500);
}
