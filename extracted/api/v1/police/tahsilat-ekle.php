<?php
/**
 * POST /api/v1/police/tahsilat-ekle.php
 * Poliçe tahsilatı ekle, bakiye güncelle, opsiyonel kasa hareketi oluştur
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();
require_fields($body, ['police_id', 'tutar', 'tahsilat_tarihi']);

$db = getDB();

$policeId = (int)$body['police_id'];
$tutar = (float)$body['tutar'];
$tahsilatTarihi = $body['tahsilat_tarihi'];
$odemeSekli = clean($body['odeme_sekli'] ?? 'nakit');
$aciklama = clean($body['aciklama'] ?? '');
$kasaId = !empty($body['kasa_id']) ? (int)$body['kasa_id'] : null;

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);
/* v6 DÜZELTME: Kasa zorunlu — muhasebe defter tutarlılığı için */
if (!$kasaId) json_error('Tahsilatın kaydedileceği KASA seçimi zorunludur', 422);

// Poliçe kontrolü
$stmt = $db->prepare('SELECT id, police_no, musteri_adi, brut_prim, tahsil_edilen FROM policeler WHERE id = ?');
$stmt->execute([$policeId]);
$police = $stmt->fetch();
if (!$police) json_error('Poliçe bulunamadı', 404);

// Kasa kontrolü (varsa)
$kasa = null;
if ($kasaId) {
    $stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? AND aktif = 1');
    $stmt->execute([$kasaId]);
    $kasa = $stmt->fetch();
    if (!$kasa) json_error('Kasa bulunamadı', 404);
}

$db->beginTransaction();
try {
    // Tahsilat kaydı ekle
    $stmt = $db->prepare('INSERT INTO police_tahsilatlar (police_id, tutar, tahsilat_tarihi, odeme_sekli, aciklama, kasa_id, olusturan_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $policeId,
        $tutar,
        $tahsilatTarihi,
        $odemeSekli,
        $aciklama,
        $kasaId,
        $user['id']
    ]);
    $tahsilatId = (int)$db->lastInsertId();

    // Toplam tahsil edilen tutarı hesapla
    $stmt = $db->prepare('SELECT COALESCE(SUM(tutar), 0) as toplam FROM police_tahsilatlar WHERE police_id = ?');
    $stmt->execute([$policeId]);
    $toplamTahsil = (float)$stmt->fetch()['toplam'];

    // Tahsilat durumunu belirle
    $brutPrim = (float)$police['brut_prim'];
    if ($toplamTahsil >= $brutPrim) {
        $tahsilatDurumu = 'tahsil_edildi';
    } elseif ($toplamTahsil > 0) {
        $tahsilatDurumu = 'kismen_tahsil';
    } else {
        $tahsilatDurumu = 'beklemede';
    }

    // Poliçeyi güncelle
    $stmt = $db->prepare('UPDATE policeler SET tahsil_edilen = ?, tahsilat_durumu = ? WHERE id = ?');
    $stmt->execute([$toplamTahsil, $tahsilatDurumu, $policeId]);

    // Kasa hareketi oluştur (kasa seçildiyse)
    if ($kasa) {
        $yeniBakiye = (float)$kasa['bakiye'] + $tutar;

        $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
        $stmt->execute([$yeniBakiye, $kasaId]);

        $kasaAciklama = 'POLİÇE TAHSİLAT: ' . $police['police_no'];
        if ($aciklama !== '') {
            $kasaAciklama .= ' - ' . $aciklama;
        }

        $stmt = $db->prepare('INSERT INTO kasa_hareketleri (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id) VALUES (?, \'gelir\', ?, ?, ?, ?)');
        $stmt->execute([
            $kasaId,
            $tutar,
            $yeniBakiye,
            $kasaAciklama,
            $user['id']
        ]);

        /* v6 EKLEME: Muhasebe defteri gelir kaydı — zincir kopuk değil artık.
         * "gelirler" tablosu şeması zorunlu alanları düşündürülerek minimal kayıt yapılır.
         * Tablo yoksa try/catch içinde sessiz geçer; mevcut işleyişi bozmaz. */
        try {
            $db->exec("CREATE TABLE IF NOT EXISTS gelirler (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kasa_id INT DEFAULT NULL,
                tutar DECIMAL(12,2) NOT NULL DEFAULT 0,
                islem_tarihi DATE DEFAULT NULL,
                gelir_turu VARCHAR(60) DEFAULT NULL,
                aciklama TEXT DEFAULT NULL,
                kaynak VARCHAR(30) DEFAULT NULL,
                kaynak_id INT DEFAULT NULL,
                kullanici_id INT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_kaynak (kaynak, kaynak_id),
                INDEX idx_tarih (islem_tarihi)
            )");
            $gelirIns = $db->prepare('INSERT INTO gelirler (kasa_id, tutar, islem_tarihi, gelir_turu, aciklama, kaynak, kaynak_id, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $gelirIns->execute([
                $kasaId, $tutar, $tahsilatTarihi, 'POLİÇE TAHSİLATI',
                $kasaAciklama, 'police_tahsilat', $tahsilatId, $user['id']
            ]);
        } catch (\Exception $ge) { /* muhasebe defteri kaydı başarısız olursa sessiz geç */ }
    }

    $db->commit();

    log_action($user['id'], 'police_tahsilat', "Poliçe tahsilat: {$police['police_no']} +{$tutar} ₺", 'police_tahsilatlar', $tahsilatId);

    json_success([
        'id' => $tahsilatId,
        'toplam_tahsil' => $toplamTahsil,
        'tahsilat_durumu' => $tahsilatDurumu
    ], 'Tahsilat eklendi', 201);

} catch (Exception $e) {
    $db->rollBack();
    json_error('Tahsilat hatası: ' . $e->getMessage(), 500);
}
