<?php
/**
 * POST /api/v1/muhasebe/mutabakat-kaydet.php
 * Body: { donem, devir, ay_ici_odemeler, sbm_sorgu, ekran_odeme, atk_masrafi,
 *         poz_adet, poz_toplam, mahsup_adet, mahsup_toplam,
 *         dosyalar:[{date,name,tip,tipKisa,kanal,tutar}], not_metni, durum }
 * UPSERT (donem unique) — varsa günceller.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman']);
$body = get_json_body();
require_fields($body, ['donem']);

$db = getDB();

// Defansif tablo oluştur
try {
    $db->exec("CREATE TABLE IF NOT EXISTS aylik_mutabakat_raporlari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        donem VARCHAR(7) NOT NULL,
        baslik VARCHAR(150) NOT NULL,
        durum ENUM('taslak','kesin') NOT NULL DEFAULT 'taslak',
        devir DECIMAL(14,2) NOT NULL DEFAULT 0,
        ay_ici_odemeler DECIMAL(14,2) NOT NULL DEFAULT 0,
        sbm_sorgu DECIMAL(14,2) NOT NULL DEFAULT 0,
        ekran_odeme DECIMAL(14,2) NOT NULL DEFAULT 0,
        atk_masrafi DECIMAL(14,2) NOT NULL DEFAULT 0,
        poz_adet INT NOT NULL DEFAULT 0,
        poz_toplam DECIMAL(14,2) NOT NULL DEFAULT 0,
        mahsup_adet INT NOT NULL DEFAULT 0,
        mahsup_toplam DECIMAL(14,2) NOT NULL DEFAULT 0,
        dosya_toplam DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum1_net DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum2_net DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum3_net DECIMAL(14,2) NOT NULL DEFAULT 0,
        final_bakiye DECIMAL(14,2) NOT NULL DEFAULT 0,
        dosyalar_json LONGTEXT DEFAULT NULL,
        not_metni TEXT DEFAULT NULL,
        olusturan_id INT NOT NULL,
        olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_donem (donem),
        INDEX idx_durum (durum)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (\Exception $e) {}

$donem = clean($body['donem']);
if (!preg_match('/^\d{4}-\d{2}$/', $donem)) json_error('Geçersiz dönem (YYYY-MM)', 422);

// Hesaplamalar (server side)
$dosyalar = is_array($body['dosyalar'] ?? null) ? $body['dosyalar'] : [];
$dosyaToplam = 0;
foreach ($dosyalar as $d) { $dosyaToplam += (float)($d['tutar'] ?? 0); }

$devir       = (float)($body['devir'] ?? 0);
$ayIci       = (float)($body['ay_ici_odemeler'] ?? 0);
$sbm         = (float)($body['sbm_sorgu'] ?? 0);
$ekran       = (float)($body['ekran_odeme'] ?? 0);
$atk         = (float)($body['atk_masrafi'] ?? 0);
$pozAdet     = (int)($body['poz_adet'] ?? 0);
$pozToplam   = (float)($body['poz_toplam'] ?? 0);
$mahsupAdet  = (int)($body['mahsup_adet'] ?? 0);
$mahsupTop   = (float)($body['mahsup_toplam'] ?? 0);
$durum       = in_array(($body['durum'] ?? 'taslak'), ['taslak','kesin'], true) ? $body['durum'] : 'taslak';
$not         = clean($body['not_metni'] ?? '');

$bolum1Net = round($dosyaToplam - $devir - $ayIci, 2);
$bolum2Net = round(($sbm / 2) + ($ekran / 2) + $atk, 2);
$bolum3Net = round($pozToplam - $mahsupTop, 2);
$final     = round($bolum1Net + $bolum2Net + $bolum3Net, 2);

$AY = ['','OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
$ayNo = (int)substr($donem, 5, 2);
$yil  = substr($donem, 0, 4);
$baslik = $AY[$ayNo] . ' ' . $yil . ' AY SONU RAPORU';

$dosyalarJson = json_encode($dosyalar, JSON_UNESCAPED_UNICODE);

try {
    // UPSERT
    $stmt = $db->prepare("SELECT id, durum FROM aylik_mutabakat_raporlari WHERE donem = ?");
    $stmt->execute([$donem]);
    $mevcut = $stmt->fetch();

    if ($mevcut) {
        if ($mevcut['durum'] === 'kesin' && empty($body['_force'])) {
            json_error('Bu dönem KESİN olarak kilitlenmiş. Önce taslağa çevirin.', 409);
        }
        $stmt = $db->prepare("UPDATE aylik_mutabakat_raporlari SET
            baslik=?, durum=?,
            devir=?, ay_ici_odemeler=?, sbm_sorgu=?, ekran_odeme=?, atk_masrafi=?,
            poz_adet=?, poz_toplam=?, mahsup_adet=?, mahsup_toplam=?,
            dosya_toplam=?, bolum1_net=?, bolum2_net=?, bolum3_net=?, final_bakiye=?,
            dosyalar_json=?, not_metni=?
            WHERE id=?");
        $stmt->execute([
            $baslik, $durum,
            $devir, $ayIci, $sbm, $ekran, $atk,
            $pozAdet, $pozToplam, $mahsupAdet, $mahsupTop,
            $dosyaToplam, $bolum1Net, $bolum2Net, $bolum3Net, $final,
            $dosyalarJson, $not ?: null,
            $mevcut['id']
        ]);
        $id = (int)$mevcut['id'];
        $islem = 'guncellendi';
    } else {
        $stmt = $db->prepare("INSERT INTO aylik_mutabakat_raporlari
            (donem, baslik, durum, devir, ay_ici_odemeler, sbm_sorgu, ekran_odeme, atk_masrafi,
             poz_adet, poz_toplam, mahsup_adet, mahsup_toplam,
             dosya_toplam, bolum1_net, bolum2_net, bolum3_net, final_bakiye,
             dosyalar_json, not_metni, olusturan_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $donem, $baslik, $durum,
            $devir, $ayIci, $sbm, $ekran, $atk,
            $pozAdet, $pozToplam, $mahsupAdet, $mahsupTop,
            $dosyaToplam, $bolum1Net, $bolum2Net, $bolum3Net, $final,
            $dosyalarJson, $not ?: null,
            $user['id']
        ]);
        $id = (int)$db->lastInsertId();
        $islem = 'olusturuldu';
    }

    log_action($user['id'], 'mutabakat_' . $islem, $baslik, 'aylik_mutabakat_raporlari', $id);

    json_success([
        'id'           => $id,
        'donem'        => $donem,
        'baslik'       => $baslik,
        'durum'        => $durum,
        'final_bakiye' => $final,
        'islem'        => $islem
    ], $baslik . ' ' . $islem);

} catch (\Exception $e) {
    json_error('Kayıt hatası: ' . $e->getMessage(), 500);
}
