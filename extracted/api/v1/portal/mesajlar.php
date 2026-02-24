<?php
/**
 * GET  /api/v1/portal/mesajlar.php        - Mesajları listele
 * POST /api/v1/portal/mesajlar.php        - Yeni mesaj gönder
 * PUT  /api/v1/portal/mesajlar.php        - Mesajları okundu işaretle
 * Header: Authorization: Portal {token}
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/migration.php';

setup_headers();
ensure_portal_tables();

// Portal mesajlaşma ayar kontrolü
$db = getDB();
try {
    $stmtAyar = $db->query("SELECT deger FROM ayarlar WHERE anahtar = 'portal_mesaj_aktif' LIMIT 1");
    $ayar = $stmtAyar->fetch();
    if ($ayar && $ayar['deger'] === '0') {
        json_error('MESAJLAŞMA ÖZELLİĞİ KAPATILMIŞ', 403);
    }
} catch (\Exception $e) {}

$erisim = portal_auth_required();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // MESAJLARI LİSTELE
    $stmt = $db->prepare("SELECT pm.*, CASE WHEN pm.gonderen_tip = 'firma' THEN u.ad_soyad ELSE pe.ad_soyad END as gonderen_adi FROM portal_mesajlar pm LEFT JOIN users u ON u.id = pm.gonderen_id AND pm.gonderen_tip = 'firma' LEFT JOIN portal_erisim pe ON pe.id = pm.portal_erisim_id WHERE pm.dosya_id = ? ORDER BY pm.created_at ASC");
    $stmt->execute([$erisim['dosya_id']]);
    $mesajlar = $stmt->fetchAll();

    // Firma mesajlarını okundu işaretle
    $db->prepare("UPDATE portal_mesajlar SET okundu = 1 WHERE dosya_id = ? AND gonderen_tip = 'firma' AND okundu = 0")->execute([$erisim['dosya_id']]);

    json_success($mesajlar);

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // YENİ MESAJ GÖNDER
    $body = get_json_body();
    $mesaj = trim($body['mesaj'] ?? '');

    if (empty($mesaj)) {
        json_error('MESAJ METNİ GEREKLİ', 422);
    }

    if (mb_strlen($mesaj) > 2000) {
        json_error('MESAJ EN FAZLA 2000 KARAKTER OLABİLİR', 422);
    }

    $stmt = $db->prepare("INSERT INTO portal_mesajlar (dosya_id, portal_erisim_id, gonderen_tip, mesaj) VALUES (?, ?, 'musteri', ?)");
    $stmt->execute([$erisim['dosya_id'], $erisim['id'], clean($mesaj)]);

    portal_logla($erisim['id'], $erisim['dosya_id'], 'mesaj_gonder', 'Müşteri mesaj gönderdi');

    json_success(['id' => (int)$db->lastInsertId()], 'MESAJ GÖNDERİLDİ');

} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // TÜM FİRMA MESAJLARINI OKUNDU İŞARETLE
    $db->prepare("UPDATE portal_mesajlar SET okundu = 1 WHERE dosya_id = ? AND gonderen_tip = 'firma' AND okundu = 0")->execute([$erisim['dosya_id']]);
    json_success(null, 'MESAJLAR OKUNDU');

} else {
    json_error('DESTEKLENMEYEN METOD', 405);
}
