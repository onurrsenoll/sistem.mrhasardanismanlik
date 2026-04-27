<?php
/**
 * GET/POST/DELETE/PUT /api/v1/mail/hesaplar.php
 * Mail hesap yönetimi. Şifre AES-256-CBC ile güvenli saklanır.
 */

/* DEBUG MODU - fatal hatalari JSON ile donder */
ini_set('display_errors', 0);
error_reporting(E_ALL);
register_shutdown_function(function(){
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE])) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
        }
        echo json_encode([
            'success' => false,
            'error' => 'PHP FATAL: ' . $err['message'],
            'file' => basename($err['file']),
            'line' => $err['line']
        ], JSON_UNESCAPED_UNICODE);
    }
});

try {
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
mail_ensure_tables();
$user = auth_required();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Kullanıcının kendi hesapları (admin hepsini)
    if ($user['rol'] === 'admin') {
        $stmt = $db->query('SELECT id, kullanici_id, etiket, email, gonderen_adi, imap_host, imap_port, imap_encryption, smtp_host, smtp_port, smtp_encryption, kullanici_adi, aktif, son_sync, son_hata, created_at FROM mail_hesaplar ORDER BY id DESC');
    } else {
        $stmt = $db->prepare('SELECT id, kullanici_id, etiket, email, gonderen_adi, imap_host, imap_port, imap_encryption, smtp_host, smtp_port, smtp_encryption, kullanici_adi, aktif, son_sync, son_hata, created_at FROM mail_hesaplar WHERE kullanici_id = ? ORDER BY id DESC');
        $stmt->execute([(int)$user['id']]);
    }
    $items = $stmt->fetchAll();
    json_success(['items' => $items]);
}

if ($method === 'POST') {
    $body = get_json_body();
    require_fields($body, ['email', 'imap_host', 'smtp_host']);

    $sifre = $body['sifre'] ?? '';
    $sifreSifreli = !empty($sifre) ? mail_sifrele($sifre) : '';

    $stmt = $db->prepare('INSERT INTO mail_hesaplar (kullanici_id, etiket, email, gonderen_adi, imap_host, imap_port, imap_encryption, smtp_host, smtp_port, smtp_encryption, kullanici_adi, sifre_sifreli, aktif) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        (int)$user['id'],
        clean($body['etiket'] ?? ''),
        clean($body['email']),
        clean($body['gonderen_adi'] ?? ''),
        clean($body['imap_host']),
        (int)($body['imap_port'] ?? 993),
        clean($body['imap_encryption'] ?? 'ssl'),
        clean($body['smtp_host']),
        (int)($body['smtp_port'] ?? 465),
        clean($body['smtp_encryption'] ?? 'ssl'),
        clean($body['kullanici_adi'] ?? $body['email']),
        $sifreSifreli,
        isset($body['aktif']) ? (int)(bool)$body['aktif'] : 1
    ]);
    $id = (int)$db->lastInsertId();
    log_action($user['id'], 'mail_hesap_ekle', clean($body['email']), 'mail_hesaplar', $id);
    json_success(['id' => $id], 'Mail hesabı eklendi', 201);
}

if ($method === 'PUT') {
    $body = get_json_body();
    require_fields($body, ['id']);
    $id = (int)$body['id'];

    // Yetki
    $stmt = $db->prepare('SELECT kullanici_id FROM mail_hesaplar WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Mail hesabı bulunamadı', 404);
    if ($user['rol'] !== 'admin' && (int)$row['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);

    $sets = [];
    $params = [];
    $allowed = ['etiket','email','gonderen_adi','imap_host','imap_port','imap_encryption','smtp_host','smtp_port','smtp_encryption','kullanici_adi','aktif'];
    foreach ($allowed as $f) {
        if (array_key_exists($f, $body)) {
            $sets[] = "$f = ?";
            if (in_array($f, ['imap_port','smtp_port','aktif'], true)) $params[] = (int)$body[$f];
            else $params[] = clean($body[$f]);
        }
    }
    if (!empty($body['sifre'])) {
        $sets[] = 'sifre_sifreli = ?';
        $params[] = mail_sifrele($body['sifre']);
    }
    if (empty($sets)) json_error('Güncellenecek alan yok', 422);
    $params[] = $id;
    $db->prepare('UPDATE mail_hesaplar SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    log_action($user['id'], 'mail_hesap_guncelle', 'Hesap güncellendi', 'mail_hesaplar', $id);
    json_success(null, 'Güncellendi');
}

if ($method === 'DELETE') {
    $body = get_json_body();
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if (!$id) json_error('ID gerekli', 422);

    $stmt = $db->prepare('SELECT kullanici_id, email FROM mail_hesaplar WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Bulunamadı', 404);
    if ($user['rol'] !== 'admin' && (int)$row['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);

    $db->prepare('DELETE FROM mail_hesaplar WHERE id = ?')->execute([$id]);
    log_action($user['id'], 'mail_hesap_sil', $row['email'], 'mail_hesaplar', $id);
    json_success(null, 'Silindi');
}

json_error('Geçersiz method', 405);

} catch (\Throwable $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'error' => 'EXCEPTION: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ], JSON_UNESCAPED_UNICODE);
}
