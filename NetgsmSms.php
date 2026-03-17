<?php
/**
 * MR HASAR DANIŞMANLIK - NetGSM SMS Entegrasyon Modülü
 *
 * NetGSM SMS API v1 ile tam entegrasyon sağlar.
 * Tekli SMS, toplu SMS, rapor sorgulama, kredi sorgulama,
 * başlık listesi ve SMS iptal işlemleri desteklenir.
 *
 * @author  MR HASAR DANIŞMANLIK
 * @version 2.0.0
 * @since   2026-03-16
 *
 * Kullanım:
 *   $sms = new NetgsmSms();
 *   $sonuc = $sms->gonder('05321234567', 'Merhaba!');
 */

class NetgsmSms
{
    /** @var string NetGSM API kullanıcı kodu */
    private $kullaniciKodu;

    /** @var string NetGSM API şifresi */
    private $sifre;

    /** @var string SMS gönderim başlığı (sender/header) */
    private $baslik;

    /** @var bool SMS sistemi aktif mi */
    private $aktif;

    /** @var string Türkçe karakter desteği: 0=TR, 1=İngilizce */
    private $dil = '0';

    /** @var PDO Veritabanı bağlantısı */
    private $db;

    /** @var int cURL bağlantı zaman aşımı (saniye) */
    private $connectTimeout = 15;

    /** @var int cURL toplam zaman aşımı (saniye) */
    private $timeout = 30;

    // ═══════════════════════════════════════════════════════════
    // NetGSM API Endpoint'leri
    // ═══════════════════════════════════════════════════════════
    const API_SMS_GONDER     = 'https://api.netgsm.com.tr/sms/send/get';
    const API_SMS_GONDER_XML = 'https://api.netgsm.com.tr/sms/send/xml';
    const API_RAPOR          = 'https://api.netgsm.com.tr/sms/report';
    const API_KREDI          = 'https://api.netgsm.com.tr/balance/list/get';
    const API_BASLIK_LISTE   = 'https://api.netgsm.com.tr/sms/header';
    const API_SMS_IPTAL      = 'https://api.netgsm.com.tr/sms/cancel';
    const API_IYS_SORGULA    = 'https://api.netgsm.com.tr/sms/iys';

    // ═══════════════════════════════════════════════════════════
    // NetGSM Yanıt Kodları
    // ═══════════════════════════════════════════════════════════
    const YANIT_KODLARI = [
        '00'  => 'SMS başarıyla gönderildi',
        '01'  => 'SMS başarıyla gönderildi (kuyrukta)',
        '02'  => 'SMS başarıyla gönderildi (zamanlanmış)',
        '20'  => 'Mesaj metni bulunamadı',
        '30'  => 'Geçersiz kullanıcı adı veya şifre',
        '40'  => 'Mesaj başlığı (sender) tanımlı değil',
        '50'  => 'Abone üyelik sonlanmış',
        '51'  => 'SMS gönderim kısıtlaması',
        '60'  => 'Hata oluştu - tekrar deneyin',
        '70'  => 'Geçersiz parametre',
        '80'  => 'Sorgu limiti aşıldı',
        '85'  => 'Mükerrer gönderim',
        '100' => 'Sistem hatası',
        '101' => 'Sistemde kayıtlı değil',
    ];

    const BASARILI_KODLAR = ['00', '01', '02'];

    /**
     * @param PDO|null $db Veritabanı bağlantısı (null ise getDB() kullanılır)
     */
    public function __construct(?PDO $db = null)
    {
        if ($db) {
            $this->db = $db;
        } elseif (function_exists('getDB')) {
            $this->db = getDB();
        }

        $this->ayarlariYukle();
    }

    // ═══════════════════════════════════════════════════════════
    // TEKİL SMS GÖNDERME
    // ═══════════════════════════════════════════════════════════

    /**
     * Tek bir numaraya SMS gönder
     *
     * @param string   $telefon     Alıcı telefon numarası (05XX formatı)
     * @param string   $mesaj       SMS mesaj metni
     * @param int|null $dosyaId     İlgili dosya ID (log için)
     * @param int|null $kullaniciId İşlemi yapan kullanıcı ID
     * @return array ['basarili' => bool, 'mesaj' => string, 'kod' => string, 'bulk_id' => string]
     */
    public function gonder(string $telefon, string $mesaj, ?int $dosyaId = null, ?int $kullaniciId = null): array
    {
        // Aktiflik kontrolü
        if (!$this->aktif) {
            return $this->hataSonuc('SMS sistemi aktif değil', 'PASIF', $telefon, $mesaj, $dosyaId, $kullaniciId);
        }

        // Ayar kontrolü
        if (empty($this->kullaniciKodu) || empty($this->sifre) || empty($this->baslik)) {
            return $this->hataSonuc('SMS ayarları eksik - Sistem > SMS Ayarları bölümünü kontrol edin', 'AYAR_EKSIK', $telefon, $mesaj, $dosyaId, $kullaniciId);
        }

        // Telefon normalizasyonu
        $tel = self::telefonNormalize($telefon);
        if (empty($tel)) {
            return $this->hataSonuc('Geçersiz telefon numarası: ' . $telefon, 'GECERSIZ_TEL', $telefon, $mesaj, $dosyaId, $kullaniciId);
        }

        // API isteği
        $params = [
            'usercode'  => $this->kullaniciKodu,
            'password'  => $this->sifre,
            'gsmno'     => $tel,
            'message'   => $mesaj,
            'msgheader' => $this->baslik,
            'dil'       => $this->dil,
        ];

        $response = $this->apiIstegi(self::API_SMS_GONDER, $params, 'GET');

        if ($response['hata']) {
            return $this->hataSonuc('Bağlantı hatası: ' . $response['hata'], 'CURL_HATA', $tel, $mesaj, $dosyaId, $kullaniciId);
        }

        return $this->yanitIsle($response['yanit'], $tel, $mesaj, $dosyaId, $kullaniciId);
    }

    // ═══════════════════════════════════════════════════════════
    // TOPLU SMS GÖNDERME
    // ═══════════════════════════════════════════════════════════

    /**
     * Birden fazla numaraya aynı mesajı gönder
     *
     * @param array    $telefonlar  Telefon numaraları dizisi
     * @param string   $mesaj       SMS mesaj metni
     * @param int|null $kullaniciId İşlemi yapan kullanıcı ID
     * @return array ['basarili' => int, 'basarisiz' => int, 'sonuclar' => array]
     */
    public function topluGonder(array $telefonlar, string $mesaj, ?int $kullaniciId = null): array
    {
        if (!$this->aktif) {
            return ['basarili' => 0, 'basarisiz' => count($telefonlar), 'sonuclar' => [], 'hata' => 'SMS sistemi aktif değil'];
        }

        if (empty($telefonlar)) {
            return ['basarili' => 0, 'basarisiz' => 0, 'sonuclar' => [], 'hata' => 'Telefon listesi boş'];
        }

        // Numaraları normalize et
        $normalTelefonlar = [];
        $gecersizler = [];
        foreach ($telefonlar as $tel) {
            $normal = self::telefonNormalize($tel);
            if ($normal) {
                $normalTelefonlar[] = $normal;
            } else {
                $gecersizler[] = $tel;
            }
        }

        if (empty($normalTelefonlar)) {
            return ['basarili' => 0, 'basarisiz' => count($telefonlar), 'sonuclar' => [], 'hata' => 'Geçerli telefon numarası bulunamadı'];
        }

        // NetGSM toplu SMS XML formatı
        $xml = $this->topluSmsXml($normalTelefonlar, $mesaj);

        $response = $this->apiIstegi(self::API_SMS_GONDER_XML, [], 'POST', $xml, 'application/xml');

        $basarili = 0;
        $basarisiz = count($gecersizler);
        $sonuclar = [];

        if ($response['hata']) {
            $basarisiz += count($normalTelefonlar);
            $sonuclar[] = ['hata' => $response['hata']];
        } else {
            $parts = explode(' ', trim($response['yanit']), 2);
            $kod = $parts[0] ?? '';

            if (in_array($kod, self::BASARILI_KODLAR)) {
                $basarili = count($normalTelefonlar);
                $bulkId = $parts[1] ?? '';
                $sonuclar[] = ['kod' => $kod, 'bulk_id' => $bulkId, 'mesaj' => 'Toplu SMS gönderildi'];

                // Log
                foreach ($normalTelefonlar as $tel) {
                    $this->logla($tel, $mesaj, null, $kullaniciId, 'gonderildi', 'Toplu SMS gönderildi', $bulkId);
                }
            } else {
                $basarisiz += count($normalTelefonlar);
                $hataMesaj = self::YANIT_KODLARI[$kod] ?? 'Bilinmeyen hata kodu: ' . $kod;
                $sonuclar[] = ['kod' => $kod, 'mesaj' => $hataMesaj];

                foreach ($normalTelefonlar as $tel) {
                    $this->logla($tel, $mesaj, null, $kullaniciId, 'hata', $hataMesaj);
                }
            }
        }

        // Geçersiz numaraları raporla
        foreach ($gecersizler as $tel) {
            $sonuclar[] = ['telefon' => $tel, 'mesaj' => 'Geçersiz numara'];
            $this->logla($tel, $mesaj, null, $kullaniciId, 'hata', 'Geçersiz telefon numarası');
        }

        return [
            'basarili'  => $basarili,
            'basarisiz' => $basarisiz,
            'sonuclar'  => $sonuclar,
        ];
    }

    // ═══════════════════════════════════════════════════════════
    // KREDİ SORGULAMA
    // ═══════════════════════════════════════════════════════════

    /**
     * NetGSM hesap bakiyesini (SMS kredisini) sorgula
     *
     * @return array ['basarili' => bool, 'kredi' => string, 'mesaj' => string]
     */
    public function krediSorgula(): array
    {
        $params = [
            'usercode' => $this->kullaniciKodu,
            'password' => $this->sifre,
            'stip'     => '1',
        ];

        $response = $this->apiIstegi(self::API_KREDI, $params, 'GET');

        if ($response['hata']) {
            return ['basarili' => false, 'kredi' => '0', 'mesaj' => 'Bağlantı hatası: ' . $response['hata']];
        }

        $yanit = trim($response['yanit']);

        if (in_array($yanit, ['30', '40', '100'])) {
            $hataMesaj = self::YANIT_KODLARI[$yanit] ?? 'Hata kodu: ' . $yanit;
            return ['basarili' => false, 'kredi' => '0', 'mesaj' => $hataMesaj];
        }

        return ['basarili' => true, 'kredi' => $yanit, 'mesaj' => 'Kalan kredi: ' . $yanit];
    }

    // ═══════════════════════════════════════════════════════════
    // RAPOR SORGULAMA (İletim Raporu)
    // ═══════════════════════════════════════════════════════════

    /**
     * SMS iletim raporu sorgula
     *
     * @param string $bulkId  NetGSM bulk ID
     * @param int    $tip     Rapor tipi (0=tümü, 1=iletildi, 2=iletilmedi)
     * @return array ['basarili' => bool, 'raporlar' => array, 'mesaj' => string]
     */
    public function raporSorgula(string $bulkId, int $tip = 0): array
    {
        $params = [
            'usercode' => $this->kullaniciKodu,
            'password' => $this->sifre,
            'bulkid'   => $bulkId,
            'type'     => $tip,
            'version'  => '2',
        ];

        $response = $this->apiIstegi(self::API_RAPOR, $params, 'GET');

        if ($response['hata']) {
            return ['basarili' => false, 'raporlar' => [], 'mesaj' => 'Bağlantı hatası: ' . $response['hata']];
        }

        $yanit = trim($response['yanit']);

        // Hata kodu kontrolü
        if (in_array($yanit, ['30', '40', '50', '60', '70', '100', '101'])) {
            $hataMesaj = self::YANIT_KODLARI[$yanit] ?? 'Hata kodu: ' . $yanit;
            return ['basarili' => false, 'raporlar' => [], 'mesaj' => $hataMesaj];
        }

        // Yanıtı satırlara böl ve parse et
        $satirlar = explode('<br>', $yanit);
        $raporlar = [];

        foreach ($satirlar as $satir) {
            $satir = trim($satir);
            if (empty($satir)) continue;

            $parcalar = explode(' ', $satir);
            if (count($parcalar) >= 2) {
                $raporlar[] = [
                    'telefon' => $parcalar[0],
                    'durum'   => $this->iletimDurumuAciklama($parcalar[1] ?? ''),
                    'kod'     => $parcalar[1] ?? '',
                    'tarih'   => $parcalar[2] ?? '',
                    'opertor' => $parcalar[3] ?? '',
                ];
            }
        }

        return [
            'basarili' => true,
            'raporlar' => $raporlar,
            'mesaj'    => count($raporlar) . ' adet rapor bulundu',
        ];
    }

    // ═══════════════════════════════════════════════════════════
    // BAŞLIK LİSTELEME
    // ═══════════════════════════════════════════════════════════

    /**
     * Tanımlı SMS başlıklarını (sender) listele
     *
     * @return array ['basarili' => bool, 'basliklar' => array, 'mesaj' => string]
     */
    public function baslikListele(): array
    {
        $params = [
            'usercode' => $this->kullaniciKodu,
            'password' => $this->sifre,
        ];

        $response = $this->apiIstegi(self::API_BASLIK_LISTE, $params, 'GET');

        if ($response['hata']) {
            return ['basarili' => false, 'basliklar' => [], 'mesaj' => 'Bağlantı hatası: ' . $response['hata']];
        }

        $yanit = trim($response['yanit']);

        if (in_array($yanit, ['30', '40', '100'])) {
            $hataMesaj = self::YANIT_KODLARI[$yanit] ?? 'Hata kodu: ' . $yanit;
            return ['basarili' => false, 'basliklar' => [], 'mesaj' => $hataMesaj];
        }

        $basliklar = array_filter(array_map('trim', explode('<br>', $yanit)));

        return [
            'basarili'  => true,
            'basliklar' => array_values($basliklar),
            'mesaj'     => count($basliklar) . ' adet başlık bulundu',
        ];
    }

    // ═══════════════════════════════════════════════════════════
    // SMS İPTAL
    // ═══════════════════════════════════════════════════════════

    /**
     * Zamanlanmış SMS gönderimini iptal et
     *
     * @param string $bulkId NetGSM bulk ID
     * @return array ['basarili' => bool, 'mesaj' => string]
     */
    public function smsIptal(string $bulkId): array
    {
        $params = [
            'usercode' => $this->kullaniciKodu,
            'password' => $this->sifre,
            'bulkid'   => $bulkId,
        ];

        $response = $this->apiIstegi(self::API_SMS_IPTAL, $params, 'GET');

        if ($response['hata']) {
            return ['basarili' => false, 'mesaj' => 'Bağlantı hatası: ' . $response['hata']];
        }

        $yanit = trim($response['yanit']);

        if (in_array($yanit, ['00', '01'])) {
            return ['basarili' => true, 'mesaj' => 'SMS gönderimi iptal edildi'];
        }

        $hataMesaj = self::YANIT_KODLARI[$yanit] ?? 'İptal başarısız, hata kodu: ' . $yanit;
        return ['basarili' => false, 'mesaj' => $hataMesaj];
    }

    // ═══════════════════════════════════════════════════════════
    // DOSYA DURUM DEĞİŞİKLİĞİ SMS'İ
    // ═══════════════════════════════════════════════════════════

    /**
     * Dosya durum değişikliğinde otomatik SMS gönder
     * Evrak linki varsa mesaja eklenir
     *
     * @param int      $dosyaId      Dosya ID
     * @param string   $eskiAsama    Önceki aşama
     * @param string   $yeniAsama    Yeni aşama
     * @param int|null $kullaniciId  İşlemi yapan kullanıcı
     * @return array|null Gönderim sonucu veya null
     */
    public function durumDegisikligiSms(int $dosyaId, string $eskiAsama, string $yeniAsama, ?int $kullaniciId = null): ?array
    {
        if (!$this->db || !$this->aktif) return null;

        // Dosya + mağdur bilgisi
        $stmt = $this->db->prepare("
            SELECT d.dosya_no, d.dosya_turu, m.ad_soyad, m.telefon, m.telefon2
            FROM dosyalar d
            LEFT JOIN magdurlar m ON m.dosya_id = d.id
            WHERE d.id = ?
        ");
        $stmt->execute([$dosyaId]);
        $bilgi = $stmt->fetch();

        if (!$bilgi || empty($bilgi['telefon'])) return null;

        // Firma adı
        $firmaAdi = $this->ayarOku('firma_adi', 'MR HASAR DANISMANLIK');

        // Site URL
        $siteUrl = $this->ayarOku('site_url', '');
        if (empty($siteUrl)) {
            $protokol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'] ?? 'sistem.mrhasardanismanlik.com';
            $siteUrl = $protokol . '://' . $host;
        }
        $siteUrl = rtrim($siteUrl, '/');

        $musteriAdi = $bilgi['ad_soyad'] ?: 'SAYIN MUSTERIMIZ';
        $dosyaNo = $bilgi['dosya_no'];

        // Son evrak linki
        $evrakLink = '';
        try {
            $stmtEvrak = $this->db->prepare("
                SELECT id FROM evraklar WHERE dosya_id = ? ORDER BY created_at DESC LIMIT 1
            ");
            $stmtEvrak->execute([$dosyaId]);
            $sonEvrak = $stmtEvrak->fetch();
            if ($sonEvrak) {
                $token = $this->evrakToken($sonEvrak['id']);
                $evrakLink = $siteUrl . '/api/v1/evrak/download.php?id=' . $sonEvrak['id'] . '&token=' . $token;
            }
        } catch (\Exception $e) {}

        // Mesaj oluştur
        $mesaj = "Sayin {$musteriAdi}, {$dosyaNo} nolu dosyanizin guncellenmis durumu: {$yeniAsama}";
        if (!empty($evrakLink)) {
            $mesaj .= " Ilgili evrak: {$evrakLink}";
        }
        $mesaj .= " - {$firmaAdi}";

        return $this->gonder($bilgi['telefon'], $mesaj, $dosyaId, $kullaniciId);
    }

    // ═══════════════════════════════════════════════════════════
    // YARDIMCI METODLAR
    // ═══════════════════════════════════════════════════════════

    /**
     * Telefon numarasını 90XXXXXXXXXX formatına normalize et
     *
     * @param string $tel Telefon numarası
     * @return string Normalize edilmiş numara veya boş string
     */
    public static function telefonNormalize(string $tel): string
    {
        $tel = preg_replace('/[\s\-\(\)\+]/', '', $tel);
        if (empty($tel)) return '';

        // 05XX -> 905XX
        if (substr($tel, 0, 1) === '0' && strlen($tel) === 11) {
            $tel = '9' . $tel;
        }
        // 5XX -> 905XX
        if (substr($tel, 0, 1) === '5' && strlen($tel) === 10) {
            $tel = '90' . $tel;
        }

        if (strlen($tel) === 12 && substr($tel, 0, 2) === '90') {
            return $tel;
        }

        return '';
    }

    /**
     * SMS ayarlarını veritabanından yükle
     */
    private function ayarlariYukle(): void
    {
        $this->aktif = false;
        $this->kullaniciKodu = '';
        $this->sifre = '';
        $this->baslik = '';

        if (!$this->db) return;

        try {
            $stmt = $this->db->query("SELECT anahtar, deger FROM ayarlar WHERE anahtar LIKE 'sms_%'");
            while ($row = $stmt->fetch()) {
                switch ($row['anahtar']) {
                    case 'sms_aktif':
                        $this->aktif = ($row['deger'] === '1');
                        break;
                    case 'sms_kullanici':
                        $this->kullaniciKodu = $row['deger'];
                        break;
                    case 'sms_sifre':
                        $this->sifre = $row['deger'];
                        break;
                    case 'sms_baslik':
                        $this->baslik = $row['deger'];
                        break;
                }
            }
        } catch (\Exception $e) {}
    }

    /**
     * Manuel olarak kimlik bilgilerini ayarla (veritabanısız kullanım için)
     */
    public function kimlikAyarla(string $kullaniciKodu, string $sifre, string $baslik): self
    {
        $this->kullaniciKodu = $kullaniciKodu;
        $this->sifre = $sifre;
        $this->baslik = $baslik;
        $this->aktif = true;
        return $this;
    }

    /**
     * NetGSM API isteği gönder
     */
    private function apiIstegi(string $url, array $params = [], string $method = 'GET', ?string $body = null, string $contentType = 'text/plain'): array
    {
        if ($method === 'GET' && !empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => $this->connectTimeout,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_IPRESOLVE      => CURL_IPRESOLVE_V4,
            CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_1_1,
            CURLOPT_HTTPHEADER     => [
                'User-Agent: MR-Hasar-CRM/2.0',
                'Accept: text/plain',
            ],
        ]);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'User-Agent: MR-Hasar-CRM/2.0',
                    'Content-Type: ' . $contentType,
                ]);
            } elseif (!empty($params)) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
            }
        }

        $response = curl_exec($ch);
        $error = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return [
            'yanit'    => $response ?: '',
            'hata'     => $error ?: null,
            'httpKodu' => $httpCode,
        ];
    }

    /**
     * API yanıtını işle
     */
    private function yanitIsle(string $yanit, string $telefon, string $mesaj, ?int $dosyaId, ?int $kullaniciId): array
    {
        $rawResponse = trim($yanit);
        $parts = explode(' ', $rawResponse, 2);
        $kod = $parts[0] ?? '';

        if (in_array($kod, self::BASARILI_KODLAR)) {
            $bulkId = $parts[1] ?? '';
            $sonuc = [
                'basarili' => true,
                'mesaj'    => 'SMS gönderildi',
                'kod'      => $kod,
                'bulk_id'  => $bulkId,
            ];
            $this->logla($telefon, $mesaj, $dosyaId, $kullaniciId, 'gonderildi', $sonuc['mesaj'], $bulkId);
        } else {
            $hataMesaj = self::YANIT_KODLARI[$kod] ?? 'NetGSM hata kodu: ' . $kod;
            $sonuc = [
                'basarili' => false,
                'mesaj'    => $hataMesaj,
                'kod'      => $kod,
                'bulk_id'  => '',
            ];
            $this->logla($telefon, $mesaj, $dosyaId, $kullaniciId, 'hata', $hataMesaj);
        }

        return $sonuc;
    }

    /**
     * Hata sonucu oluştur ve logla
     */
    private function hataSonuc(string $hataMesaj, string $kod, string $telefon, string $mesaj, ?int $dosyaId, ?int $kullaniciId): array
    {
        $sonuc = ['basarili' => false, 'mesaj' => $hataMesaj, 'kod' => $kod, 'bulk_id' => ''];
        $this->logla($telefon, $mesaj, $dosyaId, $kullaniciId, 'hata', $hataMesaj);
        return $sonuc;
    }

    /**
     * SMS log kaydı
     */
    private function logla(string $telefon, string $mesaj, ?int $dosyaId, ?int $kullaniciId, string $durum, string $sonucMesaj, ?string $bulkId = null): void
    {
        if (!$this->db) return;

        try {
            $stmt = $this->db->prepare("
                INSERT INTO sms_loglari (telefon, mesaj, dosya_id, kullanici_id, durum, sonuc_mesaj, bulk_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $telefon,
                mb_substr($mesaj, 0, 1000),
                $dosyaId,
                $kullaniciId,
                $durum,
                mb_substr($sonucMesaj, 0, 500),
                $bulkId,
            ]);
        } catch (\Exception $e) {
            // Log hatası sessizce geçilir
        }
    }

    /**
     * Toplu SMS için XML oluştur
     */
    private function topluSmsXml(array $telefonlar, string $mesaj): string
    {
        $numaralar = '';
        foreach ($telefonlar as $tel) {
            $numaralar .= '<no>' . htmlspecialchars($tel, ENT_XML1) . '</no>';
        }

        return '<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
    <header>
        <company dession="0">Netgsm</company>
        <usercode>' . htmlspecialchars($this->kullaniciKodu, ENT_XML1) . '</usercode>
        <password>' . htmlspecialchars($this->sifre, ENT_XML1) . '</password>
        <type>1:n</type>
        <msgheader>' . htmlspecialchars($this->baslik, ENT_XML1) . '</msgheader>
    </header>
    <body>
        <msg><![CDATA[' . $mesaj . ']]></msg>
        ' . $numaralar . '
    </body>
</mainbody>';
    }

    /**
     * Evrak indirme token oluştur (7 gün geçerli)
     */
    private function evrakToken(int $evrakId): string
    {
        $secret = defined('JWT_SECRET') ? JWT_SECRET : 'mr-hasar-default-secret';
        $payload = $evrakId . '|' . (time() + 604800) . '|sms';
        return base64_encode(hash_hmac('sha256', $payload, $secret, true) . '|' . $payload);
    }

    /**
     * Veritabanından ayar oku
     */
    private function ayarOku(string $anahtar, string $varsayilan = ''): string
    {
        if (!$this->db) return $varsayilan;

        try {
            $stmt = $this->db->prepare("SELECT deger FROM ayarlar WHERE anahtar = ? LIMIT 1");
            $stmt->execute([$anahtar]);
            $row = $stmt->fetch();
            return ($row && !empty($row['deger'])) ? $row['deger'] : $varsayilan;
        } catch (\Exception $e) {
            return $varsayilan;
        }
    }

    /**
     * İletim durumu açıklaması
     */
    private function iletimDurumuAciklama(string $kod): string
    {
        $durumlar = [
            '0' => 'İletildi',
            '1' => 'İletilmedi',
            '2' => 'Zaman aşımı',
            '3' => 'Hatalı numara',
            '4' => 'Operatör hatası',
            '5' => 'Telefon kapalı',
            '6' => 'Bilinmiyor',
            '11' => 'Bekliyor',
            '12' => 'Bekliyor',
        ];

        return $durumlar[$kod] ?? 'Durum kodu: ' . $kod;
    }

    /**
     * SMS aktif mi?
     */
    public function aktifMi(): bool
    {
        return $this->aktif;
    }

    /**
     * Mevcut başlığı getir
     */
    public function getBaslik(): string
    {
        return $this->baslik;
    }
}
