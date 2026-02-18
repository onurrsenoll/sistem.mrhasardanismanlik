<?php
/**
 * POST /api/v1/ortak/create.php
 * Yeni ortak kaydı oluştur
 * İş ortağı oluşturulduğunda otomatik olarak kullanıcı hesabı da oluşturulur (aktif, avukat rolü)
 * Body: { "ad_soyad": "...", "firma": "...", ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();

// Zorunlu alanlar
require_fields($body, ['ad_soyad']);

$db = getDB();

try {
    $db->beginTransaction();

    $stmt = $db->prepare('INSERT INTO ortaklar (ad_soyad, firma, baro, sicil_no, telefon, telefon2, email, adres, il, iban, vergi_no, odeme_orani, kasa_id, notlar, durum, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $adSoyad = clean($body['ad_soyad']);
    $email = clean($body['email'] ?? '');
    $telefon = clean($body['telefon'] ?? '');

    $stmt->execute([
        $adSoyad,
        clean($body['firma'] ?? ''),
        clean($body['baro'] ?? ''),
        clean($body['sicil_no'] ?? ''),
        $telefon,
        clean($body['telefon2'] ?? ''),
        $email,
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        clean($body['iban'] ?? ''),
        clean($body['vergi_no'] ?? ''),
        isset($body['odeme_orani']) ? (float)$body['odeme_orani'] : 0,
        !empty($body['kasa_id']) ? (int)$body['kasa_id'] : null,
        clean($body['notlar'] ?? ''),
        clean($body['durum'] ?? 'aktif'),
        $user['id']
    ]);

    $ortakId = (int)$db->lastInsertId();

    // ═══ OTOMATİK KULLANICI OLUŞTUR (AKTİF, AVUKAT ROLÜ) ═══
    $userId = null;
    $kullaniciOlusturuldu = false;
    $kullaniciEmail = '';

    if (!empty($email)) {
        // E-posta varsa, aynı e-posta ile kullanıcı var mı kontrol et
        $stmtCheck = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmtCheck->execute([$email]);
        $mevcutUser = $stmtCheck->fetch();

        if (!$mevcutUser) {
            // Varsayılan şifre: TC veya telefon son 6 hane, yoksa "123456"
            $varsayilanSifre = '123456';
            if (!empty($body['tc_kimlik']) && strlen($body['tc_kimlik']) >= 6) {
                $varsayilanSifre = substr($body['tc_kimlik'], -6);
            } elseif (!empty($telefon) && strlen(preg_replace('/\D/', '', $telefon)) >= 6) {
                $varsayilanSifre = substr(preg_replace('/\D/', '', $telefon), -6);
            }

            $sifreHash = password_hash($varsayilanSifre, PASSWORD_BCRYPT);

            $stmtUser = $db->prepare('INSERT INTO users (ad_soyad, email, sifre_hash, rol, telefon, aktif) VALUES (?, ?, ?, ?, ?, 1)');
            $stmtUser->execute([
                $adSoyad,
                $email,
                $sifreHash,
                'avukat',
                $telefon
            ]);

            $userId = (int)$db->lastInsertId();
            $kullaniciOlusturuldu = true;
            $kullaniciEmail = $email;

            log_action($user['id'], 'kullanici_olustur', "İş ortağı ile otomatik kullanıcı oluşturuldu: $adSoyad (avukat)", 'users', $userId);
        } else {
            $userId = (int)$mevcutUser['id'];
        }
    }

    $db->commit();

    log_action($user['id'], 'ortak_olustur', "Ortak oluşturuldu: $adSoyad", 'ortaklar', $ortakId);

    $responseData = [
        'id' => $ortakId,
        'kullanici_olusturuldu' => $kullaniciOlusturuldu,
        'user_id' => $userId
    ];

    $mesaj = 'İŞ ORTAĞI BAŞARIYLA OLUŞTURULDU';
    if ($kullaniciOlusturuldu) {
        $mesaj .= ". SİSTEM GİRİŞİ İÇİN KULLANICI HESABI OTOMATİK OLUŞTURULDU (E-POSTA: $kullaniciEmail, ROL: AVUKAT)";
    }

    json_success($responseData, $mesaj, 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('ORTAK OLUŞTURULURKEN HATA: ' . $e->getMessage(), 500);
}
