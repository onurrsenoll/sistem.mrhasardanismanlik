<?php
/**
 * POST /api/v1/personel/create.php
 * Yeni personel kaydı oluştur
 * Personel oluşturulduğunda otomatik olarak kullanıcı hesabı da oluşturulur (aktif, personel rolü)
 * Body: { "ad_soyad": "...", "tc_kimlik": "...", "maas": 25000, ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin']);
$body = get_json_body();
require_fields($body, ['ad_soyad']);

$db = getDB();

try {
    $db->beginTransaction();

    $adSoyad = clean($body['ad_soyad']);
    $email = clean($body['email'] ?? '');
    $telefon = clean($body['telefon'] ?? '');
    $tcKimlik = clean($body['tc_kimlik'] ?? '');

    // ═══ OTOMATİK KULLANICI OLUŞTUR (AKTİF, PERSONEL ROLÜ) ═══
    $userId = null;
    $kullaniciOlusturuldu = false;

    if (!empty($email)) {
        $stmtCheck = $db->prepare('SELECT id FROM users WHERE email = ?');
        $stmtCheck->execute([$email]);
        $mevcutUser = $stmtCheck->fetch();

        if (!$mevcutUser) {
            // Varsayılan şifre: TC son 6 hane veya telefon son 6 hane, yoksa "123456"
            $varsayilanSifre = '123456';
            if (!empty($tcKimlik) && strlen($tcKimlik) >= 6) {
                $varsayilanSifre = substr($tcKimlik, -6);
            } elseif (!empty($telefon) && strlen(preg_replace('/\D/', '', $telefon)) >= 6) {
                $varsayilanSifre = substr(preg_replace('/\D/', '', $telefon), -6);
            }

            $sifreHash = password_hash($varsayilanSifre, PASSWORD_BCRYPT);

            $stmtUser = $db->prepare('INSERT INTO users (ad_soyad, email, sifre_hash, rol, telefon, aktif) VALUES (?, ?, ?, ?, ?, 1)');
            $stmtUser->execute([$adSoyad, $email, $sifreHash, 'personel', $telefon]);

            $userId = (int)$db->lastInsertId();
            $kullaniciOlusturuldu = true;

            log_action($user['id'], 'kullanici_olustur', "Personel ile otomatik kullanıcı oluşturuldu: $adSoyad (personel)", 'users', $userId);
        } else {
            $userId = (int)$mevcutUser['id'];
        }
    }

    // PERSONEL KAYDI OLUŞTUR
    $stmt = $db->prepare('INSERT INTO personel (ad_soyad, tc_kimlik, telefon, email, departman, pozisyon, maas, prim_orani, sgk_no, iban, adres, il, ise_baslama, durum, user_id, notlar, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $stmt->execute([
        $adSoyad,
        $tcKimlik,
        $telefon,
        $email,
        clean($body['departman'] ?? ''),
        clean($body['pozisyon'] ?? ''),
        isset($body['maas']) ? (float)$body['maas'] : 0,
        isset($body['prim_orani']) ? (float)$body['prim_orani'] : 0,
        clean($body['sgk_no'] ?? ''),
        clean($body['iban'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['il'] ?? ''),
        !empty($body['ise_baslama']) ? $body['ise_baslama'] : null,
        clean($body['durum'] ?? 'aktif'),
        $userId,
        clean($body['notlar'] ?? ''),
        $user['id']
    ]);

    $personelId = (int)$db->lastInsertId();

    $db->commit();

    log_action($user['id'], 'personel_olustur', "Personel oluşturuldu: $adSoyad", 'personel', $personelId);

    $mesaj = 'PERSONEL BAŞARIYLA OLUŞTURULDU';
    if ($kullaniciOlusturuldu) {
        $mesaj .= ". SİSTEM GİRİŞİ İÇİN KULLANICI HESABI OTOMATİK OLUŞTURULDU (E-POSTA: $email, ROL: PERSONEL)";
    }

    json_success([
        'id' => $personelId,
        'user_id' => $userId,
        'kullanici_olusturuldu' => $kullaniciOlusturuldu
    ], $mesaj, 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('PERSONEL OLUŞTURULURKEN HATA: ' . $e->getMessage(), 500);
}
