<?php
/**
 * Personel modülü veritabanı tabloları oluşturma
 * Bu dosyayı bir kez çalıştırın: GET /api/v1/personel/migrate.php
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

$user = auth_required(['admin']);
$db = getDB();

$tablolar = [];

// 1. PERSONEL TABLOSU
try {
    $db->exec("CREATE TABLE IF NOT EXISTS personel (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ad_soyad VARCHAR(100) NOT NULL,
        tc_kimlik VARCHAR(11) DEFAULT NULL,
        telefon VARCHAR(20) DEFAULT NULL,
        email VARCHAR(100) DEFAULT NULL,
        departman VARCHAR(100) DEFAULT NULL,
        pozisyon VARCHAR(100) DEFAULT NULL,
        maas DECIMAL(12,2) DEFAULT 0.00,
        prim_orani DECIMAL(12,2) DEFAULT 0.00,
        sgk_no VARCHAR(50) DEFAULT NULL,
        iban VARCHAR(34) DEFAULT NULL,
        adres TEXT DEFAULT NULL,
        il VARCHAR(50) DEFAULT NULL,
        ise_baslama DATE DEFAULT NULL,
        isten_ayrilma DATE DEFAULT NULL,
        durum ENUM('aktif','pasif') NOT NULL DEFAULT 'aktif',
        user_id INT DEFAULT NULL,
        notlar TEXT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_durum (durum),
        INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
    $tablolar[] = 'personel: OK';
} catch (Exception $e) {
    $tablolar[] = 'personel: HATA - ' . $e->getMessage();
}

// 2. PERSONEL HAKEDİŞ TABLOSU
try {
    $db->exec("CREATE TABLE IF NOT EXISTS personel_hakedis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        personel_id INT NOT NULL,
        donem VARCHAR(7) NOT NULL,
        calisan_gun INT DEFAULT 0,
        dosya_sayisi INT DEFAULT 0,
        prim_tutar DECIMAL(12,2) DEFAULT 0.00,
        ek_prim DECIMAL(12,2) DEFAULT 0.00,
        kesinti DECIMAL(12,2) DEFAULT 0.00,
        maas_tutar DECIMAL(12,2) DEFAULT 0.00,
        toplam_hakedis DECIMAL(12,2) DEFAULT 0.00,
        odeme_durumu ENUM('bekliyor','odendi') DEFAULT 'bekliyor',
        odeme_tarihi DATE DEFAULT NULL,
        notlar TEXT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_personel_donem (personel_id, donem),
        INDEX idx_donem (donem),
        INDEX idx_odeme_durumu (odeme_durumu),
        FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
    $tablolar[] = 'personel_hakedis: OK';
} catch (Exception $e) {
    $tablolar[] = 'personel_hakedis: HATA - ' . $e->getMessage();
}

json_success($tablolar, 'PERSONEL TABLOLARI OLUŞTURULDU');
