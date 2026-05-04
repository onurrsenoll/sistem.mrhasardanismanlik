<?php
/**
 * POST /api/v1/muhasebe/aysonu-kaydet.php
 * AY SONU RAPORU snapshot — UPSERT (donem+ortak unique).
 *
 * Body:
 *   donem (YYYY-MM)
 *   ortak_id (opsiyonel)
 *   bolum1: {dosya_sayisi, toplam_masraf, devir, odemeler, alacak}
 *   bolum2: {kapanan_sayisi, toplam_kazanc, mahsup, net}
 *   final_bakiye
 *   rapor_data (tüm rapor JSON snapshot)
 *   not_metni
 *   durum (taslak|kesin)
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman']);
$body = get_json_body();
require_fields($body, ['donem']);

$db = getDB();

// Defansif tablo
try {
    $db->exec("CREATE TABLE IF NOT EXISTS aylik_mutabakat_raporlari (
        id INT AUTO_INCREMENT PRIMARY KEY,
        donem VARCHAR(7) NOT NULL,
        baslik VARCHAR(150) NOT NULL,
        durum ENUM('taslak','kesin') NOT NULL DEFAULT 'taslak',
        ortak_id INT DEFAULT NULL,
        bolum1_dosya_sayisi INT NOT NULL DEFAULT 0,
        bolum1_toplam_masraf DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum1_devir DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum1_odemeler DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum1_alacak DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum2_kapanan_sayisi INT NOT NULL DEFAULT 0,
        bolum2_toplam_kazanc DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum2_mahsup DECIMAL(14,2) NOT NULL DEFAULT 0,
        bolum2_net DECIMAL(14,2) NOT NULL DEFAULT 0,
        final_bakiye DECIMAL(14,2) NOT NULL DEFAULT 0,
        rapor_data LONGTEXT DEFAULT NULL,
        not_metni TEXT DEFAULT NULL,
        olusturan_id INT NOT NULL,
        olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_donem_ortak (donem, ortak_id),
        INDEX idx_durum (durum),
        INDEX idx_donem (donem)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci");
} catch (\Exception $e) {}

$donem = clean($body['donem']);
if (!preg_match('/^\d{4}-\d{2}$/', $donem)) json_error('Geçersiz dönem', 422);

$ortakId = !empty($body['ortak_id']) ? (int)$body['ortak_id'] : null;
$durum   = in_array(($body['durum'] ?? 'taslak'), ['taslak','kesin'], true) ? $body['durum'] : 'taslak';

$b1 = $body['bolum1'] ?? [];
$b2 = $body['bolum2'] ?? [];

$AY = ['','OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
$ayNo = (int)substr($donem, 5, 2);
$baslik = $AY[$ayNo] . ' ' . substr($donem, 0, 4) . ' AY SONU RAPORU';
if ($ortakId) {
    $stmt = $db->prepare("SELECT ad_soyad FROM ortaklar WHERE id = ?");
    $stmt->execute([$ortakId]);
    $ad = $stmt->fetchColumn();
    if ($ad) $baslik .= ' — ' . $ad;
}

$raporJson = is_array($body['rapor_data'] ?? null) ? json_encode($body['rapor_data'], JSON_UNESCAPED_UNICODE) : ($body['rapor_data'] ?? null);
$not = clean($body['not_metni'] ?? '');

try {
    $stmt = $db->prepare("SELECT id, durum FROM aylik_mutabakat_raporlari WHERE donem = ? AND (ortak_id <=> ?)");
    $stmt->execute([$donem, $ortakId]);
    $mevcut = $stmt->fetch();

    if ($mevcut) {
        if ($mevcut['durum'] === 'kesin' && empty($body['_force'])) {
            json_error('Bu dönem KESİN olarak kilitlenmiş. Önce taslağa çevirin.', 409);
        }
        $stmt = $db->prepare("UPDATE aylik_mutabakat_raporlari SET
            baslik=?, durum=?,
            bolum1_dosya_sayisi=?, bolum1_toplam_masraf=?, bolum1_devir=?, bolum1_odemeler=?, bolum1_alacak=?,
            bolum2_kapanan_sayisi=?, bolum2_toplam_kazanc=?, bolum2_mahsup=?, bolum2_net=?,
            final_bakiye=?, rapor_data=?, not_metni=?
            WHERE id=?");
        $stmt->execute([
            $baslik, $durum,
            (int)($b1['dosya_sayisi'] ?? 0), (float)($b1['toplam_masraf'] ?? 0),
            (float)($b1['devir'] ?? 0), (float)($b1['odemeler'] ?? 0), (float)($b1['alacak'] ?? 0),
            (int)($b2['kapanan_sayisi'] ?? 0), (float)($b2['toplam_kazanc'] ?? 0),
            (float)($b2['mahsup'] ?? 0), (float)($b2['net'] ?? 0),
            (float)($body['final_bakiye'] ?? 0),
            $raporJson, $not ?: null,
            $mevcut['id']
        ]);
        $id = (int)$mevcut['id'];
        $islem = 'guncellendi';
    } else {
        $stmt = $db->prepare("INSERT INTO aylik_mutabakat_raporlari
            (donem, baslik, durum, ortak_id,
             bolum1_dosya_sayisi, bolum1_toplam_masraf, bolum1_devir, bolum1_odemeler, bolum1_alacak,
             bolum2_kapanan_sayisi, bolum2_toplam_kazanc, bolum2_mahsup, bolum2_net,
             final_bakiye, rapor_data, not_metni, olusturan_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $donem, $baslik, $durum, $ortakId,
            (int)($b1['dosya_sayisi'] ?? 0), (float)($b1['toplam_masraf'] ?? 0),
            (float)($b1['devir'] ?? 0), (float)($b1['odemeler'] ?? 0), (float)($b1['alacak'] ?? 0),
            (int)($b2['kapanan_sayisi'] ?? 0), (float)($b2['toplam_kazanc'] ?? 0),
            (float)($b2['mahsup'] ?? 0), (float)($b2['net'] ?? 0),
            (float)($body['final_bakiye'] ?? 0),
            $raporJson, $not ?: null,
            $user['id']
        ]);
        $id = (int)$db->lastInsertId();
        $islem = 'olusturuldu';
    }

    log_action($user['id'], 'aysonu_' . $islem, $baslik, 'aylik_mutabakat_raporlari', $id);

    json_success([
        'id' => $id, 'donem' => $donem, 'baslik' => $baslik,
        'durum' => $durum, 'final_bakiye' => (float)($body['final_bakiye'] ?? 0),
        'islem' => $islem
    ], $baslik . ' ' . $islem);

} catch (\Exception $e) {
    json_error('Kayıt hatası: ' . $e->getMessage(), 500);
}
