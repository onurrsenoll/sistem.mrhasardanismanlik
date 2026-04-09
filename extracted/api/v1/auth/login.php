<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/helpers.php';

setup_headers();
ensure_2fa_columns();

// ═══ BRUTE FORCE KORUMASI: login_attempts tablosu ═══
function ensure_login_attempts_table() {
    static $done = false;
    if ($done) return;
    $done = true;
    try {
        $db = getDB();
        $db->exec("CREATE TABLE IF NOT EXISTS login_attempts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip_adresi VARCHAR(45) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            user_agent TEXT,
            cihaz_bilgi TEXT,
            basarili TINYINT(1) DEFAULT 0,
            engellendi TINYINT(1) DEFAULT 0,
            tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ip (ip_adresi),
            INDEX idx_tarih (tarih)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}
}

function get_client_ip() {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) return $_SERVER['HTTP_X_REAL_IP'];
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function check_brute_force($ip, $email) {
    $db = getDB();
    // Son 30 dakikadaki başarısız girişleri say
    $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM login_attempts WHERE ip_adresi = ? AND basarili = 0 AND tarih > DATE_SUB(NOW(), INTERVAL 30 MINUTE)");
    $stmt->execute([$ip]);
    $row = $stmt->fetch();
    return ($row['cnt'] ?? 0) >= 2; // 2 başarısız = engelle
}

function log_login_attempt($ip, $email, $basarili, $engellendi = false) {
    try {
        $db = getDB();
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 500) : '';
        $cihaz = json_encode([
            'ip' => $ip,
            'user_agent' => $ua,
            'accept_lang' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
            'referer' => $_SERVER['HTTP_REFERER'] ?? '',
            'tarih' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        $stmt = $db->prepare("INSERT INTO login_attempts (ip_adresi, email, user_agent, cihaz_bilgi, basarili, engellendi) VALUES (?,?,?,?,?,?)");
        $stmt->execute([$ip, $email, $ua, $cihaz, $basarili ? 1 : 0, $engellendi ? 1 : 0]);

        // Engellenen giriş → admin'e bildirim
        if ($engellendi) {
            try {
                $admins = $db->query("SELECT id FROM users WHERE rol = 'admin' AND aktif = 1")->fetchAll(PDO::FETCH_COLUMN);
                foreach ($admins as $adminId) {
                    $db->prepare("INSERT INTO bildirimler (kullanici_id, baslik, mesaj, tip, link) VALUES (?, 'TANIMSIZ GİRİŞ DENEMESİ ENGELLENDİ', ?, 'uyari', '/sistem-loglar')")
                       ->execute([$adminId, 'IP: '.$ip.' | Email: '.$email.' | Cihaz: '.$ua]);
                }
            } catch (Exception $e) {}
        }
    } catch (Exception $e) {}
}

ensure_login_attempts_table();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['status' => 'API aktif', 'endpoint' => 'login']);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!$body || empty($body['email']) || empty($body['sifre'])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Email ve sifre gerekli']);
    exit;
}

$clientIp = get_client_ip();
$emailInput = $body['email'];

// ═══ BRUTE FORCE KONTROL: 2 başarısız giriş sonrası engelle ═══
if (check_brute_force($clientIp, $emailInput)) {
    log_login_attempt($clientIp, $emailInput, false, true);
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'ÇOKLU BAŞARISIZ GİRİŞ. CİHAZINIZ 30 DAKİKA ENGELLENDİ. SİSTEM YÖNETİCİSİ BİLGİLENDİRİLDİ.']);
    exit;
}

try {
    $db = getDB();
    $stmt = $db->prepare('SELECT id, ad_soyad, email, sifre_hash, rol, telefon, aktif FROM users WHERE email = ?');
    $stmt->execute([$body['email']]);
    $user = $stmt->fetch();

    if (!$user) {
        log_login_attempt($clientIp, $emailInput, false);
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Email veya sifre hatali']);
        exit;
    }

    if (!$user['aktif']) {
        log_login_attempt($clientIp, $emailInput, false);
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Hesap devre disi']);
        exit;
    }

    if (!password_verify($body['sifre'], $user['sifre_hash'])) {
        log_login_attempt($clientIp, $emailInput, false);
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Email veya sifre hatali']);
        exit;
    }

    // Başarılı giriş - sayaçları sıfırla
    log_login_attempt($clientIp, $emailInput, true);

    // 2FA aktif mi kontrol et
    $totp_aktif = false;
    try {
        $stmt2fa = $db->prepare('SELECT totp_aktif FROM users WHERE id = ?');
        $stmt2fa->execute([$user['id']]);
        $row2fa = $stmt2fa->fetch();
        $totp_aktif = !empty($row2fa['totp_aktif']);
    } catch (Exception $e) {
        // 2FA sütunu henüz yoksa devam et
    }

    if ($totp_aktif) {
        // 2FA aktif - geçici token oluştur (5 dakika geçerli)
        $tempToken = jwt_create([
            'user_id' => $user['id'],
            'email' => $user['email'],
            'rol' => $user['rol'],
            'require_2fa' => true
        ]);

        unset($user['sifre_hash']);

        echo json_encode([
            'success' => true,
            'message' => '2FA dogrulama gerekli',
            'data' => [
                'require_2fa' => true,
                'temp_token' => $tempToken,
                'user' => $user
            ]
        ]);
        exit;
    }

    $token = jwt_create([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'rol' => $user['rol']
    ]);

    $stmt = $db->prepare('UPDATE users SET son_giris = NOW() WHERE id = ?');
    $stmt->execute([$user['id']]);

    unset($user['sifre_hash']);

    // Netsantral bilgilerini yukle (kolon yoksa sessizce gec)
    try {
        $stmtNS = $db->prepare('SELECT netsantral_dahili, netsantral_sip_sifre, netsantral_api_sifre FROM users WHERE id = ?');
        $stmtNS->execute([$user['id']]);
        $nsRow = $stmtNS->fetch();
        if ($nsRow) { $user = array_merge($user, $nsRow); }
    } catch (\Exception $e) {}

    // Kullanicinin yetkilerini yukle (tablo yoksa sessizce gec)
    try {
        $stmtY = $db->prepare('SELECT modul, islem FROM yetkiler WHERE kullanici_id = ? AND izin = 1');
        $stmtY->execute([$user['id']]);
        $yetkiRows = $stmtY->fetchAll();
        $yetkiObj = array();
        foreach ($yetkiRows as $yr) {
            $yetkiObj[$yr['modul'] . '_' . $yr['islem']] = 1;
        }
        $user['yetkiler'] = $yetkiObj;
    } catch (\Exception $e) {
        $user['yetkiler'] = array();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Giris basarili',
        'data' => [
            'token' => $token,
            'user' => $user
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Sunucu hatasi', 'detail' => $e->getMessage()]);
}
?>