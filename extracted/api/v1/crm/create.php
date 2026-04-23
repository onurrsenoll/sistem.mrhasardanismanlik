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

// CRM TABLOSU YOKSA OLUŞTUR
try {
    $db->exec("CREATE TABLE IF NOT EXISTS crm (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ad_soyad VARCHAR(100) NOT NULL,
        tc_vergi_no VARCHAR(20) DEFAULT NULL,
        telefon VARCHAR(20) DEFAULT NULL,
        telefon2 VARCHAR(20) DEFAULT NULL,
        email VARCHAR(100) DEFAULT NULL,
        il VARCHAR(50) DEFAULT NULL,
        ilce VARCHAR(50) DEFAULT NULL,
        adres TEXT DEFAULT NULL,
        plaka VARCHAR(20) DEFAULT NULL,
        marka VARCHAR(50) DEFAULT NULL,
        model_adi VARCHAR(50) DEFAULT NULL,
        arac_yili SMALLINT DEFAULT NULL,
        arac_km INT DEFAULT NULL,
        olay_aciklama TEXT DEFAULT NULL,
        kaynak VARCHAR(50) DEFAULT NULL,
        dosya_turu VARCHAR(20) DEFAULT NULL,
        kaza_turu VARCHAR(30) DEFAULT NULL,
        kaza_tarihi DATE DEFAULT NULL,
        pozisyon VARCHAR(20) DEFAULT NULL,
        durum ENUM('Yeni','Takipte','Olumlu','Olumsuz') NOT NULL DEFAULT 'Yeni',
        oncelik VARCHAR(20) DEFAULT 'NORMAL',
        taslak TINYINT DEFAULT 0,
        not_text TEXT DEFAULT NULL,
        atanan_id INT DEFAULT NULL,
        son_iletisim DATE DEFAULT NULL,
        donusen_dosya_id INT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_durum (durum),
        INDEX idx_ad (ad_soyad)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (Exception $e) {}

// EKSİK KOLONLARI KONTROL ET VE EKLE
$eklenecekKolonlar = [
    'telefon2' => "ALTER TABLE crm ADD COLUMN telefon2 VARCHAR(20) DEFAULT NULL AFTER telefon",
    'adres' => "ALTER TABLE crm ADD COLUMN adres TEXT DEFAULT NULL AFTER ilce",
    'tc_vergi_no' => "ALTER TABLE crm ADD COLUMN tc_vergi_no VARCHAR(20) DEFAULT NULL AFTER ad_soyad",
    'plaka' => "ALTER TABLE crm ADD COLUMN plaka VARCHAR(20) DEFAULT NULL AFTER adres",
    'marka' => "ALTER TABLE crm ADD COLUMN marka VARCHAR(50) DEFAULT NULL AFTER plaka",
    'model_adi' => "ALTER TABLE crm ADD COLUMN model_adi VARCHAR(50) DEFAULT NULL AFTER marka",
    'arac_yili' => "ALTER TABLE crm ADD COLUMN arac_yili SMALLINT DEFAULT NULL AFTER model_adi",
    'arac_km' => "ALTER TABLE crm ADD COLUMN arac_km INT DEFAULT NULL AFTER arac_yili",
    'olay_aciklama' => "ALTER TABLE crm ADD COLUMN olay_aciklama TEXT DEFAULT NULL AFTER arac_km",
    'kaza_turu' => "ALTER TABLE crm ADD COLUMN kaza_turu VARCHAR(30) DEFAULT NULL AFTER dosya_turu",
    'kaza_tarihi' => "ALTER TABLE crm ADD COLUMN kaza_tarihi DATE DEFAULT NULL AFTER kaza_turu",
    'pozisyon' => "ALTER TABLE crm ADD COLUMN pozisyon VARCHAR(20) DEFAULT NULL AFTER kaza_tarihi",
    'oncelik' => "ALTER TABLE crm ADD COLUMN oncelik VARCHAR(20) DEFAULT 'NORMAL' AFTER durum",
    'taslak' => "ALTER TABLE crm ADD COLUMN taslak TINYINT DEFAULT 0 AFTER oncelik",
    'not_text' => "ALTER TABLE crm ADD COLUMN not_text TEXT DEFAULT NULL AFTER taslak",
    'donusen_dosya_id' => "ALTER TABLE crm ADD COLUMN donusen_dosya_id INT DEFAULT NULL AFTER son_iletisim",
    'created_by' => "ALTER TABLE crm ADD COLUMN created_by INT DEFAULT NULL AFTER donusen_dosya_id",
    'gorusme_sonucu' => "ALTER TABLE crm ADD COLUMN gorusme_sonucu VARCHAR(100) DEFAULT NULL AFTER not_text"
];

try {
    $cols = $db->query("SHOW COLUMNS FROM crm")->fetchAll(PDO::FETCH_COLUMN, 0);
    foreach ($eklenecekKolonlar as $kolon => $sql) {
        if (!in_array($kolon, $cols)) {
            try { $db->exec($sql); } catch (Exception $e2) {}
        }
    }
} catch (Exception $e) {}

try {
    $stmt = $db->prepare('INSERT INTO crm (ad_soyad, tc_vergi_no, telefon, telefon2, email, il, ilce, adres, plaka, marka, model_adi, arac_yili, arac_km, olay_aciklama, kaynak, dosya_turu, kaza_turu, kaza_tarihi, pozisyon, durum, oncelik, taslak, not_text, gorusme_sonucu, atanan_id, son_iletisim, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
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
        clean($body['gorusme_sonucu'] ?? ''),
        !empty($body['atanan_id']) ? (int)$body['atanan_id'] : null,
        !empty($body['son_iletisim']) ? $body['son_iletisim'] : date('Y-m-d'),
        $user['id']
    ]);

    $id = (int)$db->lastInsertId();

    log_action($user['id'], 'crm_ekle', "CRM kaydı: " . clean($body['ad_soyad']), 'crm', $id);

    json_success(['id' => $id], 'CRM kaydı oluşturuldu', 201);
} catch (Exception $e) {
    json_error('CRM KAYIT HATASI: ' . $e->getMessage());
}
