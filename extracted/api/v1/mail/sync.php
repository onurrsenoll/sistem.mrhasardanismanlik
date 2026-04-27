<?php
/**
 * POST /api/v1/mail/sync.php
 * IMAP'ten yeni mailleri çeker (INBOX + Sent), ekleri uploads/mail-ekler/ altina kaydeder.
 * Body: { hesap_id, son_n_gun (opsiyonel, varsayılan 30), max_mesaj (opsiyonel, varsayılan 100) }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';
require_once __DIR__ . '/helper.php';

setup_headers();
require_method('POST');
mail_ensure_tables();

@set_time_limit(180);
@ini_set('memory_limit', '512M');
$user = auth_required();
$db = getDB();
$body = get_json_body();
require_fields($body, ['hesap_id']);

$hesapId = (int)$body['hesap_id'];
$sonGun = max(1, (int)($body['son_n_gun'] ?? 30));
$maxMesaj = min(500, max(10, (int)($body['max_mesaj'] ?? 100)));

$stmt = $db->prepare('SELECT * FROM mail_hesaplar WHERE id = ?');
$stmt->execute([$hesapId]);
$hesap = $stmt->fetch();
if (!$hesap) json_error('Mail hesabı bulunamadı', 404);
if ($user['rol'] !== 'admin' && (int)$hesap['kullanici_id'] !== (int)$user['id']) json_error('Yetki yok', 403);
if (empty($hesap['aktif'])) json_error('HESAP PASİF — önce aktif edin', 400);

/* INBOX (gelen) + Sent variant'lari (giden) */
$klasorler = [
    ['adi' => 'INBOX', 'yon' => 'gelen', 'zorunlu' => true],
    ['adi' => 'INBOX.Sent', 'yon' => 'giden', 'zorunlu' => false],
    ['adi' => 'Sent', 'yon' => 'giden', 'zorunlu' => false]
];

$toplamYeni = 0;
$toplamGuncel = 0;
$toplamTaranan = 0;
$hatalar = [];
$sentBulundu = false;

/* UPSERT - eski bos icerikli kayitlar guncellenir */
$ins = $db->prepare('INSERT INTO mail_mesajlar (hesap_id, uid_imap, message_id, yon, klasor, gonderen, alici, cc, konu, govde_text, govde_html, ekler, tarih, okundu)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON DUPLICATE KEY UPDATE
      konu = VALUES(konu),
      govde_text = IF(LENGTH(VALUES(govde_text)) > LENGTH(IFNULL(govde_text,"")), VALUES(govde_text), govde_text),
      govde_html = IF(LENGTH(VALUES(govde_html)) > LENGTH(IFNULL(govde_html,"")), VALUES(govde_html), govde_html),
      ekler = IF(VALUES(ekler) IS NOT NULL AND VALUES(ekler) != "[]" , VALUES(ekler), ekler),
      gonderen = VALUES(gonderen),
      alici = VALUES(alici),
      tarih = VALUES(tarih),
      id = LAST_INSERT_ID(id)');

$dateSince = date('d-M-Y', strtotime('-' . $sonGun . ' days'));

foreach ($klasorler as $k) {
    $isInbox = $k['adi'] === 'INBOX';

    /* Sent variant'larindan biri bulunduysa digerini atla */
    if (!$isInbox && $sentBulundu) continue;

    try {
        $imapBox = @mail_imap_baglan($hesap, $k['adi']);
        if (!$imapBox) {
            if ($k['zorunlu']) throw new \Exception('IMAP bağlantı hatası: ' . imap_last_error());
            $hatalar[] = ['klasor' => $k['adi'], 'hata' => 'klasor bulunamadi'];
            continue;
        }
        if (!$isInbox) $sentBulundu = true;

        $search = imap_search($imapBox, 'SINCE "' . $dateSince . '"');
        if ($search === false) {
            imap_close($imapBox);
            continue;
        }

        rsort($search);
        $search = array_slice($search, 0, $maxMesaj);
        $toplamTaranan += count($search);

        foreach ($search as $num) {
            try {
                $uid = imap_uid($imapBox, $num);

                $overview = imap_fetch_overview($imapBox, $num, 0);
                if (empty($overview)) continue;
                $info = $overview[0];

                $tarih = isset($info->date) ? date('Y-m-d H:i:s', strtotime($info->date)) : date('Y-m-d H:i:s');
                $gonderen = $info->from ?? '';
                $alici = $info->to ?? ($hesap['email'] ?? '');
                $konu = isset($info->subject) ? imap_utf8($info->subject) : '';
                $messageId = $info->message_id ?? '';

                $struct = imap_fetchstructure($imapBox, $num);
                $parsed = mail_part_walk($imapBox, $num, $struct);
                $text = $parsed['text'];
                $html = $parsed['html'];
                $ekListesi = $parsed['ekler'];

                if (!$text && $html) $text = trim(strip_tags($html));

                /* Once mesaj kaydet/guncelle - sonra ekler dosyaya yazilacak */
                $ekJson = !empty($ekListesi) ? json_encode($ekListesi, JSON_UNESCAPED_UNICODE) : null;
                $ins->execute([
                    $hesapId,
                    (string)$uid,
                    $messageId,
                    $k['yon'],
                    $k['adi'],
                    $gonderen,
                    $alici,
                    $info->cc ?? '',
                    $konu,
                    mb_substr($text, 0, 100000, 'UTF-8'),
                    mb_substr($html, 0, 200000, 'UTF-8'),
                    $ekJson,
                    $tarih
                ]);
                $mesajId = (int)$db->lastInsertId();
                $rowCount = $ins->rowCount();
                if ($rowCount === 1) $toplamYeni++;
                elseif ($rowCount === 2) $toplamGuncel++;

                /* EKLERI fiziksel dosyaya yaz - sadece YENI/GUNCEL kayit icin ve dosyalar henuz yoksa */
                if (!empty($ekListesi) && $mesajId > 0) {
                    $klasor = mail_ek_klasor($hesapId, $mesajId);
                    foreach ($ekListesi as $idx => $ek) {
                        $hedefAd = $ek['ad'];
                        /* Guvenli dosya adi - directory traversal engelle */
                        $hedefAd = preg_replace('/[^A-Za-z0-9\._\-]/', '_', $hedefAd);
                        if (!$hedefAd) $hedefAd = 'ek-' . $idx;
                        $hedefPath = $klasor . '/' . $idx . '_' . $hedefAd;
                        if (file_exists($hedefPath)) continue; /* Once indirildi */
                        $raw = imap_fetchbody($imapBox, $num, $ek['partNum']);
                        if ($ek['encoding'] == 3) $raw = base64_decode($raw);
                        elseif ($ek['encoding'] == 4) $raw = quoted_printable_decode($raw);
                        @file_put_contents($hedefPath, $raw);
                    }
                }
            } catch (\Exception $ie) { /* tek mesaj hatasi */ }
        }
        imap_close($imapBox);
    } catch (\Exception $klasorHata) {
        if ($k['zorunlu']) {
            $db->prepare('UPDATE mail_hesaplar SET son_hata = ? WHERE id = ?')->execute([$klasorHata->getMessage(), $hesapId]);
            json_error('SYNC HATASI: ' . $klasorHata->getMessage(), 500);
        }
        $hatalar[] = ['klasor' => $k['adi'], 'hata' => $klasorHata->getMessage()];
    }
}

$db->prepare('UPDATE mail_hesaplar SET son_sync = NOW(), son_hata = NULL WHERE id = ?')->execute([$hesapId]);
log_action($user['id'], 'mail_sync', "Mail sync: $toplamYeni yeni / $toplamGuncel güncellendi / $toplamTaranan tarandı", 'mail_hesaplar', $hesapId);

json_success([
    'yeni' => $toplamYeni,
    'guncellenen' => $toplamGuncel,
    'toplam_taranan' => $toplamTaranan,
    'klasor_hatalari' => $hatalar
], "$toplamYeni yeni + $toplamGuncel güncellendi (INBOX + Gönderilenler)");
