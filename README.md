# NetSantral WebRTC Softphone – Sistem Entegrasyon Paketi

NetGSM Netsantral WSS protokolü ile tarayıcıdan gerçek zamanlı arama yapan WebRTC softphone modülü.  
**Sadece hazırlanan dosyalar** bu pakettedir.

---

## Paket İçeriği

```
netsantral-softphone-paket/
├── css/
│   └── netgsm-softphone.css    # Arama paneli stilleri
├── js/
│   ├── netgsm-softphone.js     # JsSIP WSS çekirdek
│   └── netgsm-softphone-ui.js  # Arama paneli arayüzü
├── .gitignore
└── README.md
```

---

## Sisteme Entegrasyon

### 1. Dosyaları projenize kopyalayın

- `css/netgsm-softphone.css` → projenizin `css/` klasörüne
- `js/netgsm-softphone.js` ve `js/netgsm-softphone-ui.js` → projenizin `js/` (veya `js/webrtc/`) klasörüne

### 2. HTML’e ekleyin

Ana sayfa veya layout’unuzun `<head>` ve sayfa sonu:

```html
<link rel="stylesheet" href="css/netgsm-softphone.css">

<!-- Sayfa sonunda, diğer script'lerden sonra -->
<script src="https://unpkg.com/jssip@3.10.1/dist/jssip.min.js"></script>
<script src="js/netgsm-softphone.js"></script>
<script src="js/netgsm-softphone-ui.js"></script>
<script>
  NetGSMSoftphoneUI.init({
    wssUrl: 'wss://sip.netsantral.com:8089/ws',
    sipUri: 'sip:102@sip.netsantral.com',
    sipDomain: 'sip.netsantral.com',
    password: 'DAHİLİ_ŞİFRENİZ',
    displayName: 'CRM 102',
    autoConnect: true
  });
</script>
```

### 3. Netsantral ayarlarından alacağınız bilgiler

- **WSS adresi:** Örn. `wss://sip.netsantral.com:8089/ws` veya `wss://sips.netsantral.com:8089/ws`
- **SIP Domain:** Örn. `sip.netsantral.com`
- **Dahili no:** 102 → SIP URI: `sip:102@sip.netsantral.com`
- **Dahili şifresi:** Netsantral dahili düzenleme ekranındaki şifre

### 4. CRM’de tıklayarak arama

Telefon numarasına tıklanınca arama başlatmak için:

```html
<a href="#" class="netgsm-click-to-call" data-netgsm-call="5321234567">532 123 45 67</a>
```

veya

```html
<span data-netgsm-call="5551234567">0555 123 45 67</span>
```

---

## Özellikler

- Sağ alt köşede **gizlenebilir arama paneli**
- **Bağlı / Bağlanıyor / Hata** durum göstergesi
- **Gelen arama:** Cevapla / Reddet + tarayıcıda zil sesi
- **Görüşme sırasında** Kapat butonu
- **CRM’de** `data-netgsm-call` veya `netgsm-click-to-call` ile tıklayarak arama

---

## GitHub’a Yükleme

Bu klasörü doğrudan GitHub deponuza yükleyebilirsiniz:

1. GitHub’da yeni bir repository oluşturun.
2. Bu `netsantral-softphone-paket` klasörünü açın.
3. Git kuruluysa:

   ```bash
   git init
   git add .
   git commit -m "NetSantral WebRTC Softphone paketi"
   git remote add origin https://github.com/KULLANICI_ADINIZ/repo-adi.git
   git branch -M main
   git push -u origin main
   ```

4. Veya klasörü ZIP’leyip GitHub’da “uploading an existing file” ile yükleyin.

---

## Bağımlılık

- **JsSIP** (tarayıcıda CDN ile yüklenir): `https://unpkg.com/jssip@3.10.1/dist/jssip.min.js`

Tarayıcı: HTTPS veya localhost gerekir (WebRTC/mikrofon izni için).
