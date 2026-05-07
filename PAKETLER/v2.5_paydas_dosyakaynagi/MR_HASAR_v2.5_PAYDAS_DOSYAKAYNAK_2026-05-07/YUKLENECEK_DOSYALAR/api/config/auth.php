<?php
require_once __DIR__ . '/database.php';

function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_create($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload['iat'] = time();
    if (!isset($payload['exp'])) $payload['exp'] = time() + JWT_EXPIRE;
    if (!isset($payload['jti'])) $payload['jti'] = bin2hex(random_bytes(8));
    $base64Header = base64url_encode($header);
    $base64Payload = base64url_encode(json_encode($payload));
    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
    $base64Signature = base64url_encode($signature);
    return "$base64Header.$base64Payload.$base64Signature";
}

/* ═══ OTURUM YÖNETİMİ — oturumlar tablosu (logout blacklist) ═══ */
function token_hash($token) { return hash('sha256', $token); }

function session_register($userId, $token) {
    try {
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO oturumlar (kullanici_id, token_hash, ip_adresi, son_aktivite, gecerli) VALUES (?, ?, ?, NOW(), 1)');
        $stmt->execute([$userId, token_hash($token), $_SERVER['REMOTE_ADDR'] ?? null]);
        return (int)$db->lastInsertId();
    } catch (Exception $e) { error_log('[mr_hasar] session_register: '.$e->getMessage()); return 0; }
}

function session_revoke($token) {
    try {
        $db = getDB();
        $stmt = $db->prepare('UPDATE oturumlar SET gecerli = 0 WHERE token_hash = ?');
        $stmt->execute([token_hash($token)]);
        return $stmt->rowCount();
    } catch (Exception $e) { return 0; }
}

function session_revoke_all_for_user($userId, $exceptToken = null) {
    try {
        $db = getDB();
        if ($exceptToken) {
            $stmt = $db->prepare('UPDATE oturumlar SET gecerli = 0 WHERE kullanici_id = ? AND token_hash <> ?');
            $stmt->execute([$userId, token_hash($exceptToken)]);
        } else {
            $stmt = $db->prepare('UPDATE oturumlar SET gecerli = 0 WHERE kullanici_id = ?');
            $stmt->execute([$userId]);
        }
        return $stmt->rowCount();
    } catch (Exception $e) { return 0; }
}

function session_is_valid($token) {
    try {
        $db = getDB();
        $stmt = $db->prepare('SELECT gecerli FROM oturumlar WHERE token_hash = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([token_hash($token)]);
        $row = $stmt->fetch();
        // Backwards-compatible: kayıt yoksa migrasyon öncesi token, geçerli kabul et.
        if (!$row) return true;
        return (int)$row['gecerli'] === 1;
    } catch (Exception $e) { return true; }
}

function session_touch($token) {
    try {
        $db = getDB();
        $stmt = $db->prepare('UPDATE oturumlar SET son_aktivite = NOW() WHERE token_hash = ?');
        $stmt->execute([token_hash($token)]);
    } catch (Exception $e) {}
}

/* ═══ REFRESH TOKEN ═══ */
function refresh_token_issue($userId) {
    try {
        $db = getDB();
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + JWT_REFRESH_EXPIRE);
        $stmt = $db->prepare('INSERT INTO refresh_tokens (kullanici_id, token_hash, ip_adresi, expires_at, gecerli) VALUES (?, ?, ?, ?, 1)');
        $stmt->execute([$userId, hash('sha256', $token), $_SERVER['REMOTE_ADDR'] ?? null, $expiresAt]);
        return $token;
    } catch (Exception $e) { error_log('[mr_hasar] refresh_token_issue: '.$e->getMessage()); return null; }
}

function refresh_token_consume($token) {
    if (!$token) return null;
    try {
        $db = getDB();
        $hash = hash('sha256', $token);
        $stmt = $db->prepare('SELECT id, kullanici_id, expires_at, gecerli FROM refresh_tokens WHERE token_hash = ? LIMIT 1');
        $stmt->execute([$hash]);
        $row = $stmt->fetch();
        if (!$row || (int)$row['gecerli'] !== 1) return null;
        if (strtotime($row['expires_at']) < time()) return null;
        // Tek kullanımlık (rotation): kullanılan refresh tokeni iptal et.
        $upd = $db->prepare('UPDATE refresh_tokens SET gecerli = 0, used_at = NOW() WHERE id = ?');
        $upd->execute([$row['id']]);
        return (int)$row['kullanici_id'];
    } catch (Exception $e) { error_log('[mr_hasar] refresh_token_consume: '.$e->getMessage()); return null; }
}

function refresh_token_revoke_all($userId) {
    try {
        $db = getDB();
        $stmt = $db->prepare('UPDATE refresh_tokens SET gecerli = 0 WHERE kullanici_id = ?');
        $stmt->execute([$userId]);
    } catch (Exception $e) {}
}

function jwt_verify($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    $base64Header = $parts[0];
    $base64Payload = $parts[1];
    $base64Signature = $parts[2];
    $expectedSig = base64url_encode(hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true));
    if (!hash_equals($expectedSig, $base64Signature)) return false;
    $payload = json_decode(base64url_decode($base64Payload), true);
    if (!$payload) return false;
    if (isset($payload['exp']) && $payload['exp'] < time()) return false;
    return $payload;
}

function get_token_from_request() {
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '');
    if (preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
        return $matches[1];
    }
    if (isset($_COOKIE['mr_token'])) {
        return $_COOKIE['mr_token'];
    }
    // URL query param fallback (dosya indirme/önizleme - img src & yeni sekme için)
    if (isset($_GET['auth']) && !empty($_GET['auth'])) {
        return $_GET['auth'];
    }
    return null;
}

function auth_required($allowedRoles = array()) {
    $token = get_token_from_request();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Oturum bulunamadi']);
        exit;
    }
    $payload = jwt_verify($token);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Oturum suresi dolmus']);
        exit;
    }
    if (!session_is_valid($token)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Oturum iptal edilmis']);
        exit;
    }
    $db = getDB();
    $stmt = $db->prepare('SELECT id, ad_soyad, email, rol, telefon, avatar, aktif, created_at FROM users WHERE id = ?');
    $stmt->execute(array($payload['user_id']));
    $user = $stmt->fetch();
    if (!$user || !$user['aktif']) {
        http_response_code(403);
        echo json_encode(['error' => 'Hesap aktif degil']);
        exit;
    }

    // Netsantral bilgilerini yukle (kolon yoksa sessizce gec)
    try {
        $stmtNS = $db->prepare('SELECT netsantral_dahili, netsantral_sip_sifre, netsantral_api_sifre FROM users WHERE id = ?');
        $stmtNS->execute(array($user['id']));
        $nsRow = $stmtNS->fetch();
        if ($nsRow) { $user = array_merge($user, $nsRow); }
    } catch (\Exception $e) {}

    // Kullanicinin yetkilerini yukle (tablo yoksa sessizce gec)
    try {
        $stmtY = $db->prepare('SELECT modul, islem FROM yetkiler WHERE kullanici_id = ? AND izin = 1');
        $stmtY->execute(array($user['id']));
        $yetkiRows = $stmtY->fetchAll();
        $yetkiObj = array();
        foreach ($yetkiRows as $yr) {
            $yetkiObj[$yr['modul'] . '_' . $yr['islem']] = 1;
        }
        $user['yetkiler'] = $yetkiObj;
    } catch (\Exception $e) {
        $user['yetkiler'] = array();
    }

    // ═══ YETKİ MATRİS KONTROLÜ ═══
    // Rol bazlı kontrol kaldırıldı. Tüm erişim yetki matrisi üzerinden yönetilir.
    // Admin kullanıcılar has_yetki() içinde otomatik bypass edilir.
    if ($user['rol'] !== 'admin' && isset($GLOBALS['YETKI_MAP']) && function_exists('has_yetki')) {
        $scriptPath = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? $_SERVER['PHP_SELF'] ?? $_SERVER['SCRIPT_FILENAME'] ?? '');
        if (preg_match('#api/v1/(.+\.php)$#', $scriptPath, $m)) {
            $relPath = $m[1];
            if (isset($GLOBALS['YETKI_MAP'][$relPath])) {
                $yetki = $GLOBALS['YETKI_MAP'][$relPath];
                if (!has_yetki($user, $yetki[0], $yetki[1])) {
                    http_response_code(403);
                    echo json_encode(array('error' => 'Bu islem icin yetkiniz bulunmamaktadir', 'success' => false), JSON_UNESCAPED_UNICODE);
                    exit;
                }
            }
        }
    }

    session_touch($token);
    return $user;
}

function log_action($userId, $islem, $detay = null, $tabloAdi = null, $kayitId = null) {
    try {
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO log_kayitlari (kullanici_id, islem, tablo_adi, kayit_id, detay, ip_adresi, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute(array(
            $userId, $islem, $tabloAdi, $kayitId, $detay,
            isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
            isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 255) : null
        ));
    } catch (Exception $e) {}
}