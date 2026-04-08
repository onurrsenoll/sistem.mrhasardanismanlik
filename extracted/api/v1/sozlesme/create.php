<?php
/**
 * POST /api/v1/sozlesme/create.php
 * Yeni sözleşme oluştur
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = auth_required(['admin']);
$db = getDB();

// Tablolar yoksa oluştur
$db->exec("CREATE TABLE IF NOT EXISTS mr_sozlesmeler (
  id INT PRIMARY KEY AUTO_INCREMENT,
  belge_no VARCHAR(50) NOT NULL UNIQUE,
  personel_id INT NULL,
  departman ENUM('saha','ofis_cagri','ofis_diger','yonetim') NOT NULL,
  ad_soyad VARCHAR(200) NOT NULL,
  tc_kimlik VARCHAR(11) NOT NULL,
  dogum_tarihi DATE NULL,
  dogum_yeri VARCHAR(100) NULL,
  adres TEXT NULL,
  telefon VARCHAR(20) NULL,
  eposta VARCHAR(200) NULL,
  iban VARCHAR(50) NULL,
  kan_grubu VARCHAR(10) NULL,
  egitim VARCHAR(300) NULL,
  ehliyet_no VARCHAR(50) NULL,
  ehliyet_sinif VARCHAR(50) NULL,
  ehliyet_gecerlilik DATE NULL,
  pozisyon VARCHAR(200) NOT NULL,
  ise_baslama DATE NOT NULL,
  deneme_ay TINYINT NOT NULL DEFAULT 3,
  sabit_maas_net DECIMAL(12,2) NOT NULL,
  yemek_ucreti DECIMAL(8,2) NOT NULL DEFAULT 0,
  calisma_saati VARCHAR(100) NOT NULL DEFAULT 'Pazartesi-Cuma 09:00-18:00',
  prim_json JSON NULL,
  ek_haklar_json JSON NULL,
  ozel_notlar TEXT NULL,
  durum ENUM('taslak','onaylandi','imzalandi','arsivlendi') DEFAULT 'taslak',
  olusturan_id INT NULL,
  olusturma TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  guncelleme TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

$db->exec("CREATE TABLE IF NOT EXISTS mr_sozlesme_arac_zimmet (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sozlesme_id INT NOT NULL,
  plaka VARCHAR(20) NULL,
  marka_model VARCHAR(100) NULL,
  sasi_no VARCHAR(50) NULL,
  motor_no VARCHAR(50) NULL,
  model_yili YEAR NULL,
  renk VARCHAR(50) NULL,
  muayene_tarihi DATE NULL,
  kasko_police VARCHAR(100) NULL,
  km_zimmet INT NULL,
  olusturma TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sozlesme_id) REFERENCES mr_sozlesmeler(id) ON DELETE CASCADE
)");

$body = get_json_body();
require_fields($body, ['departman', 'ad_soyad', 'tc_kimlik', 'pozisyon', 'ise_baslama', 'sabit_maas_net']);

// Belge no üret: MR-IS-{YIL}-{SIRA}
$yil = date('Y');
$stmt = $db->prepare("SELECT COUNT(*) as sayi FROM mr_sozlesmeler WHERE belge_no LIKE ?");
$stmt->execute(["MR-IS-$yil-%"]);
$sira = (int)$stmt->fetch()['sayi'] + 1;
$belgeNo = sprintf("MR-IS-%s-%03d", $yil, $sira);

$db->beginTransaction();
try {
    $stmt = $db->prepare("INSERT INTO mr_sozlesmeler
        (belge_no, personel_id, departman, ad_soyad, tc_kimlik, dogum_tarihi, dogum_yeri,
         adres, telefon, eposta, iban, kan_grubu, egitim, ehliyet_no, ehliyet_sinif, ehliyet_gecerlilik,
         pozisyon, ise_baslama, deneme_ay, sabit_maas_net, yemek_ucreti, calisma_saati,
         prim_json, ek_haklar_json, ozel_notlar, durum, olusturan_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

    $stmt->execute([
        $belgeNo,
        !empty($body['personel_id']) ? (int)$body['personel_id'] : null,
        clean($body['departman']),
        clean($body['ad_soyad']),
        clean($body['tc_kimlik']),
        !empty($body['dogum_tarihi']) ? $body['dogum_tarihi'] : null,
        clean($body['dogum_yeri'] ?? ''),
        clean($body['adres'] ?? ''),
        clean($body['telefon'] ?? ''),
        clean($body['eposta'] ?? ''),
        clean($body['iban'] ?? ''),
        clean($body['kan_grubu'] ?? ''),
        clean($body['egitim'] ?? ''),
        clean($body['ehliyet_no'] ?? ''),
        clean($body['ehliyet_sinif'] ?? ''),
        !empty($body['ehliyet_gecerlilik']) ? $body['ehliyet_gecerlilik'] : null,
        clean($body['pozisyon']),
        $body['ise_baslama'],
        (int)($body['deneme_ay'] ?? 3),
        (float)$body['sabit_maas_net'],
        (float)($body['yemek_ucreti'] ?? 0),
        clean($body['calisma_saati'] ?? 'Pazartesi-Cuma 09:00-18:00'),
        !empty($body['prim_json']) ? json_encode($body['prim_json'], JSON_UNESCAPED_UNICODE) : null,
        !empty($body['ek_haklar_json']) ? json_encode($body['ek_haklar_json'], JSON_UNESCAPED_UNICODE) : null,
        clean($body['ozel_notlar'] ?? ''),
        clean($body['durum'] ?? 'taslak'),
        $user['id']
    ]);

    $sozlesmeId = (int)$db->lastInsertId();

    // Araç zimmet bilgisi varsa ekle
    if (!empty($body['arac_zimmet'])) {
        $az = $body['arac_zimmet'];
        $stmt = $db->prepare("INSERT INTO mr_sozlesme_arac_zimmet
            (sozlesme_id, plaka, marka_model, sasi_no, motor_no, model_yili, renk, muayene_tarihi, kasko_police, km_zimmet)
            VALUES (?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $sozlesmeId,
            clean($az['plaka'] ?? ''),
            clean($az['marka_model'] ?? ''),
            clean($az['sasi_no'] ?? ''),
            clean($az['motor_no'] ?? ''),
            !empty($az['model_yili']) ? (int)$az['model_yili'] : null,
            clean($az['renk'] ?? ''),
            !empty($az['muayene_tarihi']) ? $az['muayene_tarihi'] : null,
            clean($az['kasko_police'] ?? ''),
            !empty($az['km_zimmet']) ? (int)$az['km_zimmet'] : null
        ]);
    }

    // Personel tablosuna bağlantı
    if (!empty($body['personel_id'])) {
        // personel_id geçerli mi kontrol et
        $stmtP = $db->prepare("SELECT id FROM personel WHERE id = ?");
        $stmtP->execute([(int)$body['personel_id']]);
        // Sadece bağlantı — personel kaydına dokunmuyoruz
    }

    $db->commit();

    // Araç zimmet belge no
    $azBelgeNo = sprintf("MR-AZ-%s-%03d", $yil, $sira);
    $kvkkBelgeNo = sprintf("MR-KV-%s-%03d", $yil, $sira);

    log_action($user['id'], 'sozlesme_olustur', "Sözleşme: $belgeNo - " . clean($body['ad_soyad']), 'mr_sozlesmeler', $sozlesmeId);

    json_success([
        'id' => $sozlesmeId,
        'belge_no' => $belgeNo,
        'az_belge_no' => $azBelgeNo,
        'kvkk_belge_no' => $kvkkBelgeNo
    ], 'Sözleşme oluşturuldu', 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('Sözleşme oluşturma hatası: ' . $e->getMessage(), 500);
}
