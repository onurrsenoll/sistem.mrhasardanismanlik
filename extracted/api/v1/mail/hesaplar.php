<?php
/**
 * GET/POST /api/v1/mail/hesaplar.php
 * Mail hesaplarını listele veya yeni hesap ekle
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/../../config/mail_helper.php';

setup_headers();

$user = auth_required(['admin']);
$db = getDB();
mail_tablo_olustur($db);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->query("SELECT id, email, display_name, imap_sunucu, imap_port, smtp_sunucu, smtp_port, kullanici, guvenlik, aktif, son_sync, created_at FROM mail_hesaplari ORDER BY id");
    $items = $stmt->fetchAll();
    json_success(['items' => $items]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = get_json_body();
    require_fields($body, ['email', 'kullanici', 'sifre']);

    $stmt = $db->prepare("
        INSERT INTO mail_hesaplari (email, display_name, imap_sunucu, imap_port, smtp_sunucu, smtp_port, kullanici, sifre, guvenlik)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            display_name = VALUES(display_name),
            imap_sunucu = VALUES(imap_sunucu),
            imap_port = VALUES(imap_port),
            smtp_sunucu = VALUES(smtp_sunucu),
            smtp_port = VALUES(smtp_port),
            kullanici = VALUES(kullanici),
            sifre = VALUES(sifre),
            guvenlik = VALUES(guvenlik)
    ");
    $stmt->execute([
        $body['email'],
        $body['display_name'] ?? null,
        $body['imap_sunucu'] ?? 'mail.mrhasardanismanlik.com',
        (int)($body['imap_port'] ?? 993),
        $body['smtp_sunucu'] ?? 'mail.mrhasardanismanlik.com',
        (int)($body['smtp_port'] ?? 465),
        $body['kullanici'],
        $body['sifre'],
        $body['guvenlik'] ?? 'ssl'
    ]);

    log_action($user['id'], 'mail_hesap_ekle', 'Mail hesabı eklendi: ' . $body['email'], 'SİSTEM', null);
    json_success(['id' => $db->lastInsertId()], 'MAIL HESABI KAYDEDİLDİ');
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body = get_json_body();
    if (empty($body['id'])) json_error('ID GEREKLİ');
    $db->prepare("DELETE FROM mail_hesaplari WHERE id = ?")->execute([(int)$body['id']]);
    json_success(null, 'HESAP SİLİNDİ');
}
