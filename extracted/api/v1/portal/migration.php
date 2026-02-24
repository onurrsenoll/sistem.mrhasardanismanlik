<?php
/**
 * PORTAL TABLOSU OTOMATİK MİGRASYON
 * İlk çağrıda tabloları oluşturur
 */
require_once __DIR__ . '/../../config/database.php';

function ensure_portal_tables() {
    static $checked = false;
    if ($checked) return;
    $checked = true;

    try {
        $db = getDB();

        // portal_erisim tablosu
        $db->exec("CREATE TABLE IF NOT EXISTS portal_erisim (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dosya_id INT NOT NULL,
            erisim_kodu VARCHAR(64) NOT NULL UNIQUE,
            tc_kimlik VARCHAR(11) DEFAULT NULL,
            telefon VARCHAR(15) DEFAULT NULL,
            ad_soyad VARCHAR(100) DEFAULT NULL,
            sifre_hash VARCHAR(255) DEFAULT NULL,
            giris_yontemi ENUM('sms_otp','tc_telefon','link') DEFAULT 'sms_otp',
            aktif TINYINT(1) DEFAULT 1,
            son_giris DATETIME DEFAULT NULL,
            giris_sayisi INT DEFAULT 0,
            bitis_tarihi DATE DEFAULT NULL,
            olusturan_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_dosya (dosya_id),
            INDEX idx_tc (tc_kimlik),
            INDEX idx_telefon (telefon),
            INDEX idx_erisim_kodu (erisim_kodu)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

        // portal_otp tablosu
        $db->exec("CREATE TABLE IF NOT EXISTS portal_otp (
            id INT AUTO_INCREMENT PRIMARY KEY,
            telefon VARCHAR(15) NOT NULL,
            otp_kod VARCHAR(6) NOT NULL,
            erisim_id INT DEFAULT NULL,
            kullanildi TINYINT(1) DEFAULT 0,
            deneme_sayisi INT DEFAULT 0,
            gecerlilik DATETIME NOT NULL,
            ip_adresi VARCHAR(45) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_telefon_otp (telefon, otp_kod),
            INDEX idx_gecerlilik (gecerlilik)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

        // portal_mesajlar tablosu
        $db->exec("CREATE TABLE IF NOT EXISTS portal_mesajlar (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dosya_id INT NOT NULL,
            portal_erisim_id INT DEFAULT NULL,
            gonderen_tip ENUM('musteri','firma') NOT NULL DEFAULT 'musteri',
            gonderen_id INT DEFAULT NULL,
            mesaj TEXT NOT NULL,
            okundu TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_dosya (dosya_id),
            INDEX idx_erisim (portal_erisim_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

        // portal_loglar tablosu
        $db->exec("CREATE TABLE IF NOT EXISTS portal_loglar (
            id INT AUTO_INCREMENT PRIMARY KEY,
            portal_erisim_id INT DEFAULT NULL,
            dosya_id INT DEFAULT NULL,
            islem VARCHAR(50) NOT NULL,
            detay TEXT DEFAULT NULL,
            ip_adresi VARCHAR(45) DEFAULT NULL,
            user_agent VARCHAR(500) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_erisim_log (portal_erisim_id),
            INDEX idx_tarih (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

        // dosya_surecler tablosu (aşama/süreç takibi - portalde görünür)
        $db->exec("CREATE TABLE IF NOT EXISTS dosya_surecler (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dosya_id INT NOT NULL,
            baslik VARCHAR(255) NOT NULL,
            detay TEXT DEFAULT NULL,
            islem_tipi ENUM('sistem','asama_degisikligi','evrak','manuel') DEFAULT 'sistem',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_dosya_surec (dosya_id),
            INDEX idx_tarih (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");

    } catch (\Exception $e) {
        // Migration hatası sessiz geç
    }
}

/**
 * Portal erişim token'ı oluştur (JWT benzeri)
 */
function portal_token_olustur($erisimId, $dosyaId) {
    $payload = json_encode([
        'portal_erisim_id' => $erisimId,
        'dosya_id' => $dosyaId,
        'tip' => 'portal',
        'iat' => time(),
        'exp' => time() + 7200  // 2 saat
    ]);
    $hash = hash_hmac('sha256', $payload, JWT_SECRET, true);
    return base64_encode($hash . '|' . $payload);
}

/**
 * Portal token doğrula
 */
function portal_token_dogrula($token) {
    try {
        $decoded = base64_decode($token);
        if (!$decoded) return false;

        $pipePos = strpos($decoded, '|');
        if ($pipePos === false) return false;

        $hash = substr($decoded, 0, $pipePos);
        $payload = substr($decoded, $pipePos + 1);

        $expectedHash = hash_hmac('sha256', $payload, JWT_SECRET, true);
        if (!hash_equals($expectedHash, $hash)) return false;

        $data = json_decode($payload, true);
        if (!$data) return false;
        if (empty($data['tip']) || $data['tip'] !== 'portal') return false;
        if (empty($data['exp']) || $data['exp'] < time()) return false;

        return $data;
    } catch (\Exception $e) {
        return false;
    }
}

/**
 * Portal auth kontrolü
 */
function portal_auth_required() {
    $token = null;

    // Header'dan al
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '');
    if (preg_match('/Portal\s+(.+)$/i', $authHeader, $matches)) {
        $token = $matches[1];
    }

    // Bearer fallback
    if (!$token && preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
        $token = $matches[1];
    }

    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'PORTAL OTURUMU BULUNAMADI']);
        exit;
    }

    $data = portal_token_dogrula($token);
    if (!$data) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'PORTAL OTURUMU GEÇERSİZ VEYA SÜRESİ DOLMUŞ']);
        exit;
    }

    // Erişim hala aktif mi kontrol et
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM portal_erisim WHERE id = ? AND aktif = 1');
    $stmt->execute([$data['portal_erisim_id']]);
    $erisim = $stmt->fetch();

    if (!$erisim) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'PORTAL ERİŞİMİ KAPATILMIŞ']);
        exit;
    }

    // Bitiş tarihi kontrolü
    if ($erisim['bitis_tarihi'] && $erisim['bitis_tarihi'] < date('Y-m-d')) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'PORTAL ERİŞİM SÜRESİ DOLMUŞ']);
        exit;
    }

    return $erisim;
}

/**
 * Portal log kaydı
 */
function portal_logla($erisimId, $dosyaId, $islem, $detay = null) {
    try {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO portal_loglar (portal_erisim_id, dosya_id, islem, detay, ip_adresi, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $erisimId, $dosyaId, $islem, $detay,
            $_SERVER['REMOTE_ADDR'] ?? null,
            isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 500) : null
        ]);
    } catch (\Exception $e) {}
}
