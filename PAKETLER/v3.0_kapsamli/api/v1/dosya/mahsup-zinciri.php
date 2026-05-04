<?php
/**
 * /api/v1/dosya/mahsup-zinciri.php
 *
 * GET ?dosya_id=N
 *   - Belirli dosyanın mahsup zincirini (kaynak ve hedef) döndürür.
 * GET ?bekleyen=1
 *   - Tüm bekleyen mahsupları (henüz uygulanmamış) listeler.
 * POST { dosya_id, mahsup_uygulanan, hedef_dosya_id (opsiyonel) }
 *   - Manuel mahsup uygulaması (ileride kapanış olmayan durumlar için).
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();

$user = auth_required(['admin', 'uzman', 'personel']);
$db = getDB();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $bekleyen = !empty($_GET['bekleyen']);
    $dosyaId = !empty($_GET['dosya_id']) ? (int)$_GET['dosya_id'] : null;

    try {
        if ($bekleyen) {
            // Bekleyen mahsuplar listesi
            $stmt = $db->prepare("SELECT k.id, k.dosya_id, d.dosya_no, k.kapatma_tarihi,
                                         k.mahsup_edilecek, k.mahsup_uygulanan,
                                         (k.mahsup_edilecek - k.mahsup_uygulanan) as kalan,
                                         k.mahsup_durumu
                                  FROM dosya_kapanis_kayitlari k
                                  INNER JOIN dosyalar d ON d.id = k.dosya_id
                                  WHERE k.mahsup_durumu = 'beklemede'
                                    AND k.mahsup_edilecek > k.mahsup_uygulanan
                                  ORDER BY k.kapatma_tarihi ASC");
            $stmt->execute();
            $rows = $stmt->fetchAll();
            json_success(['bekleyen_mahsuplar' => $rows]);
        }

        if ($dosyaId) {
            // Bu dosyanın kapanış kaydı
            $stmt = $db->prepare("SELECT * FROM dosya_kapanis_kayitlari WHERE dosya_id = ?");
            $stmt->execute([$dosyaId]);
            $bu = $stmt->fetch();

            // Bu dosyanın kaynağı (yani: bu dosya başka bir dosyadan mahsup aldı mı?)
            $kaynak = null;
            if ($bu && !empty($bu['mahsup_kaynak_dosya_id'])) {
                $stmtK = $db->prepare("SELECT k.*, d.dosya_no FROM dosya_kapanis_kayitlari k INNER JOIN dosyalar d ON d.id = k.dosya_id WHERE k.dosya_id = ?");
                $stmtK->execute([$bu['mahsup_kaynak_dosya_id']]);
                $kaynak = $stmtK->fetch();
            }

            // Bu dosyadan mahsup alan dosyalar (zincirin sonu)
            $stmtH = $db->prepare("SELECT k.*, d.dosya_no FROM dosya_kapanis_kayitlari k INNER JOIN dosyalar d ON d.id = k.dosya_id WHERE k.mahsup_kaynak_dosya_id = ? ORDER BY k.kapatma_tarihi");
            $stmtH->execute([$dosyaId]);
            $hedefler = $stmtH->fetchAll();

            json_success([
                'dosya_id' => $dosyaId,
                'kapanis' => $bu,
                'mahsup_kaynak' => $kaynak,
                'mahsup_hedefler' => $hedefler
            ]);
        }

        json_error('dosya_id veya bekleyen=1 parametresi gerekli', 422);

    } catch (\Exception $e) {
        json_error('Mahsup sorgusu hatası: ' . $e->getMessage(), 500);
    }
}

if ($method === 'POST') {
    $body = get_json_body();
    require_fields($body, ['dosya_id', 'mahsup_uygulanan']);

    $dosyaId = (int)$body['dosya_id'];
    $mahsupUygulanan = (float)$body['mahsup_uygulanan'];

    if ($mahsupUygulanan <= 0) json_error('Mahsup tutarı 0\'dan büyük olmalı', 422);

    try {
        $db->beginTransaction();

        $stmt = $db->prepare("SELECT * FROM dosya_kapanis_kayitlari WHERE dosya_id = ?");
        $stmt->execute([$dosyaId]);
        $kayit = $stmt->fetch();
        if (!$kayit) {
            $db->rollBack();
            json_error('Bu dosyanın kapanış kaydı yok', 404);
        }

        $kalan = (float)$kayit['mahsup_edilecek'] - (float)$kayit['mahsup_uygulanan'];
        if ($mahsupUygulanan > $kalan) {
            $db->rollBack();
            json_error("Mahsup tutarı kalan miktardan büyük olamaz (kalan: ₺$kalan)", 422);
        }

        $yeniUygulanan = (float)$kayit['mahsup_uygulanan'] + $mahsupUygulanan;
        $yeniDurum = ($yeniUygulanan >= (float)$kayit['mahsup_edilecek']) ? 'tamamlandi' : 'beklemede';

        $stmt = $db->prepare("UPDATE dosya_kapanis_kayitlari SET mahsup_uygulanan = ?, mahsup_durumu = ? WHERE id = ?");
        $stmt->execute([$yeniUygulanan, $yeniDurum, $kayit['id']]);

        $db->commit();

        log_action($user['id'], 'mahsup_uygula', "Mahsup uygulandı dosya $dosyaId: ₺$mahsupUygulanan", 'dosya_kapanis_kayitlari', $kayit['id']);

        json_success([
            'kapanis_id' => $kayit['id'],
            'mahsup_uygulanan_toplam' => $yeniUygulanan,
            'mahsup_durumu' => $yeniDurum
        ], 'Mahsup başarıyla uygulandı');

    } catch (\Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        json_error('Mahsup uygulama hatası: ' . $e->getMessage(), 500);
    }
}

json_error('Yöntem desteklenmiyor', 405);
