-- ═══════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK - V6 MİGRASYON
-- YÖNLENDİRME / ARAMA LİSTESİ TABLOSU
-- ═══════════════════════════════════════════════════

-- YÖNLENDİRME ANA TABLOSU
CREATE TABLE IF NOT EXISTS yonlendirme (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sira_no INT DEFAULT NULL,
    yonlendiren VARCHAR(100) DEFAULT NULL,
    yonlendirme_tarihi DATE DEFAULT NULL,
    kaza_turu VARCHAR(50) DEFAULT NULL,
    magdur_ad_soyad VARCHAR(150) DEFAULT NULL,
    magdur_telefon VARCHAR(20) DEFAULT NULL,
    magdur_il VARCHAR(50) DEFAULT NULL,
    magdur_ilce VARCHAR(50) DEFAULT NULL,
    magdur_tc VARCHAR(15) DEFAULT NULL,
    gorusme_tarihi DATETIME DEFAULT NULL,
    durum ENUM('Belirsiz','Alindi','Olumsuz') DEFAULT 'Belirsiz',
    alinmama_nedeni VARCHAR(200) DEFAULT NULL,
    son_durum VARCHAR(200) DEFAULT NULL,
    sonraki_arama DATETIME DEFAULT NULL,
    atanan_id INT DEFAULT NULL,
    donusen_crm_id INT DEFAULT NULL,
    donusen_dosya_id INT DEFAULT NULL,
    batch_id VARCHAR(50) DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_durum (durum),
    INDEX idx_yonlendiren (yonlendiren),
    INDEX idx_magdur_telefon (magdur_telefon),
    INDEX idx_batch_id (batch_id),
    INDEX idx_atanan (atanan_id),
    INDEX idx_sonraki_arama (sonraki_arama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

-- YÖNLENDİRME NOTLARI TABLOSU
CREATE TABLE IF NOT EXISTS yonlendirme_notlar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    yonlendirme_id INT NOT NULL,
    not_text TEXT NOT NULL,
    gorusme_durumu VARCHAR(50) DEFAULT NULL,
    alinmama_nedeni VARCHAR(200) DEFAULT NULL,
    ekleyen_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_yonlendirme (yonlendirme_id),
    FOREIGN KEY (yonlendirme_id) REFERENCES yonlendirme(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
