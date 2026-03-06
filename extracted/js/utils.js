/* ============================================================
   MR HASAR DANIŞMANLIK – YARDIMCI FONKSİYONLAR (utils.js)
   PARA BİÇİMLENDİRME, TARİH, AKTÜERİYAL HESAPLAMALAR
   ============================================================ */

const MR = window.MR || (window.MR = {});

/* ---------- GİDEN ARAMA BAŞLAT (WEBRTC SOFTPHONE) ---------- */

/**
 * WEBRTC İLE TARAYICIDAN DİREK ARAMA BAŞLAT
 * AKIŞ: CRM'DE TIKLA → KARŞI TARAF DİREKT ÇALAR → KONUŞ → KAPAT
 * NETSİPP+ DAHİL HİÇBİR EKSTERNAl UYGULAMA GEREKMİYOR
 * SES TARAYICI MİKROFON/HOPARLÖR ÜZERİNDEN AKAR
 *
 * @param {string} telefon - ARANACAK TELEFON NUMARASI
 * @param {string} ad - ARANAN KİŞİNİN ADI (OPSİYONEL)
 * @param {boolean} otomatikCrmAc - CRM EKRANI AÇILSIN MI (VARSAYILAN: TRUE)
 */
MR.aramaBaslat = async function(telefon, ad, otomatikCrmAc) {
  if (!telefon) {
    alert('TELEFON NUMARASI BOŞ! LÜTFEN GEÇERLİ BİR NUMARA GİRİN.');
    return;
  }

  /* NUMARA TEMİZLEME VE NORMALİZASYON */
  let cleanNum = telefon.replace(/[\s\-\(\)\+]/g, '');
  if (cleanNum.startsWith('90') && cleanNum.length >= 12) {
    /* ZATEN 90 İLE BAŞLIYOR */
  } else if (cleanNum.startsWith('0') && cleanNum.length >= 11) {
    cleanNum = '90' + cleanNum.substring(1);
  } else if (cleanNum.length === 10 && /^[5]\d{9}$/.test(cleanNum)) {
    cleanNum = '90' + cleanNum;
  } else if (cleanNum.length === 10 && /^\d{10}$/.test(cleanNum)) {
    cleanNum = '90' + cleanNum;
  }

  console.log('[WEBRTC ARAMA] BAŞLATILIYOR:', cleanNum, '| AD:', ad || '-');

  /* NETSANTRAL AKTİF KONTROLÜ */
  if (MR._netsantralAktif === false) {
    const hata = 'NETSANTRAL PASİF DURUMDA! SİSTEM > AYARLAR > NETSANTRAL BÖLÜMÜNDEN AKTİF EDİN.';
    alert(hata);
    window.dispatchEvent(new CustomEvent('mr-arama-pbx-sonuc', {
      detail: { basarili: false, hata: hata, telefon: cleanNum, ad: ad || '' }
    }));
    return;
  }

  /* WEBRTC TELEFON KAYITLI MI KONTROL ET */
  if (!MR.webrtcTelefon || !MR.webrtcTelefon._kayitli) {
    const hata = 'WEBRTC TELEFON PBX\'E KAYITLI DEĞİL! SİSTEM > NETSANTRAL AYARLARINDAN SIP ŞİFRESİNİ GİRİN VE SAYFAYI YENİLEYİN.';
    alert(hata);
    window.dispatchEvent(new CustomEvent('mr-arama-pbx-sonuc', {
      detail: { basarili: false, hata: hata, telefon: cleanNum, ad: ad || '' }
    }));
    return;
  }

  /* AKTİF GÖRÜŞME KONTROLÜ - ZATEN GÖRÜŞME VARSA YENİ ARAMA BAŞLATMA */
  if (MR.webrtcTelefon._session) {
    console.warn('[WEBRTC ARAMA] ZATEN AKTİF GÖRÜŞME VAR - YENİ ARAMA ENGELLENDİ');
    alert('ZATEN AKTİF BİR GÖRÜŞME VAR! ÖNCE MEVCUT GÖRÜŞMEYI KAPATINIZ.');
    return;
  }

  /* GİDEN ÇAĞRI BİLDİRİMİ */
  window.dispatchEvent(new CustomEvent('mr-arama-baslat', {
    detail: { telefon: cleanNum, ad: ad || '', yon: 'giden', timestamp: Date.now() }
  }));

  /* WEBRTC İLE DİREKT ARAMA BAŞLAT - ÖNCE ÇAĞRIYI GÖNDERİYORUZ
     Tarayıcı → WebSocket → PBX → Karşı taraf çalar
     Hiçbir harici uygulama gerekmez
     NOT: API log kaydını beklemeden ÖNCE çağrıyı başlatıyoruz ki gecikme olmasın */
  let _aramaLogId = 0;

  try {
    const basarili = MR.webrtcTelefon.ara(cleanNum);
    if (basarili) {
      console.log('[WEBRTC ARAMA] ÇAĞRI GÖNDERİLDİ:', cleanNum);

      /* ARAMA LOGU OLUŞTUR (ÇAĞRI BAŞLADIKTAN SONRA - GECİKME YARATMAZ) */
      MR.api.netsantralAramaLogCreate({
        arayan: MR._netsantralDahili,
        aranan: cleanNum,
        arayan_adi: ad || '',
        yon: 'giden',
        durum: 'gorusmede'
      }).then(logR => {
        if (logR?.success && logR.data?.log_id) {
          _aramaLogId = logR.data.log_id;
        }
      }).catch(() => {});

      window.dispatchEvent(new CustomEvent('mr-arama-pbx-sonuc', {
        detail: { basarili: true, telefon: cleanNum, ad: ad || '', logId: _aramaLogId }
      }));
    } else {
      const hataMesaj = 'ARAMA BAŞLATILAMADI - WEBRTC BAĞLANTISINI KONTROL EDİN';
      window.dispatchEvent(new CustomEvent('mr-arama-pbx-sonuc', {
        detail: { basarili: false, hata: hataMesaj, telefon: cleanNum, ad: ad || '', logId: _aramaLogId }
      }));
    }
  } catch(e) {
    console.error('[WEBRTC ARAMA] HATA:', e);
    alert('WEBRTC ARAMA HATASI! TARAYICI MİKROFON İZNİNİ KONTROL EDİN.');
    window.dispatchEvent(new CustomEvent('mr-arama-pbx-sonuc', {
      detail: { basarili: false, hata: 'WEBRTC HATASI: ' + (e?.message || ''), telefon: cleanNum, ad: ad || '', logId: _aramaLogId }
    }));
  }

  /* OTOMATİK CRM KAYIT EKRANI AÇ */
  if (otomatikCrmAc !== false) {
    MR._gelenCagriTelefon = telefon;
    MR._gelenCagriAdi = ad || '';
    window.dispatchEvent(new CustomEvent('mr-arama-crm-ac'));
  }
};

/* ---------- PARA BİÇİMLENDİRME ---------- */

/**
 * SAYIYI TÜRK LİRASI PARA BİÇİMİNDE FORMATLA (KURUŞ DAHİL)
 * @param {number} n - FORMATLANACAK SAYI
 * @returns {string} ÖRN: "₺1.234,56"
 */
MR.fmt = function(n){
  if(n == null || isNaN(n)) return '₺0,00';
  return '₺' + Number(n).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
};

/**
 * SAYIYI TÜRK LİRASI PARA BİÇİMİNDE FORMATLA (KURUŞSUZ)
 * @param {number} n - FORMATLANACAK SAYI
 * @returns {string} ÖRN: "₺1.235"
 */
MR.fmtK = function(n){
  if(n == null || isNaN(n)) return '₺0';
  return '₺' + Math.round(Number(n)).toLocaleString('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:0});
};

/**
 * TÜRK PARA BİÇİMİNDEKİ METNİ SAYIYA ÇEVİR
 * "1.234,56" VEYA "₺1.234,56" GİBİ GİRDİLERİ KABUL EDER
 * @param {string|number} v - PARSE EDİLECEK DEĞER
 * @returns {number} SAYISAL DEĞER
 */
MR.parseNum = function(v){
  if(v == null) return 0;
  if(typeof v === 'number') return v;
  var s = String(v).replace(/[₺\s]/g,'').replace(/\./g,'').replace(',','.');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

/**
 * GİRİŞ ALANINI TÜRK SAYI BİÇİMİNDE FORMATLA
 * @param {string} v - GİRİŞ DEĞERİ
 * @returns {string} FORMATLANMIŞ METİN (ÖRN: "1.234,56")
 */
MR.fmtInput = function(v){
  if(!v) return '';
  var temiz = String(v).replace(/[^0-9,]/g,'');
  var parcalar = temiz.split(',');
  var tamKisim = parcalar[0].replace(/^0+(?=\d)/,'');
  if(!tamKisim) tamKisim = '0';
  /* BİNLİK AYIRICI EKLE */
  tamKisim = tamKisim.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  if(parcalar.length > 1){
    return tamKisim + ',' + parcalar[1].slice(0,2);
  }
  return tamKisim;
};

/* ---------- PLAKA BİÇİMLENDİRME ---------- */

/**
 * TÜRKİYE PLAKA FORMATINI DÜZENLE
 * BOŞLUKLARI TEMİZLER VE BÜYÜK HARFE ÇEVİRİR
 * @param {string} v - PLAKA METNİ
 * @returns {string} FORMATLANMIŞ PLAKA (ÖRN: "34ABC123")
 */
MR.formatPlaka = function(v){
  if(!v) return '';
  return String(v).toUpperCase().replace(/[^A-ZÇĞIİÖŞÜ0-9]/g,'').slice(0,9);
};

/* ---------- TARİH FONKSİYONLARI ---------- */

/**
 * BUGÜNÜN TARİHİNİ YYYY-MM-DD FORMATINDA DÖNDÜR
 * @returns {string} ÖRN: "2025-06-15"
 */
MR.today = function(){
  var d = new Date();
  var yil  = d.getFullYear();
  var ay   = String(d.getMonth() + 1).padStart(2,'0');
  var gun  = String(d.getDate()).padStart(2,'0');
  return yil + '-' + ay + '-' + gun;
};

/**
 * İKİ TARİH ARASINDA YAŞ HESAPLA
 * @param {string} d - DOĞUM TARİHİ (YYYY-MM-DD)
 * @param {string} [k] - KARŞILAŞTIRMA TARİHİ (VARSAYILAN: BUGÜN)
 * @returns {number} TAM YAŞ
 */
MR.yasHesapla = function(d, k){
  if(!d) return 0;
  var dogum  = new Date(d);
  var karsi  = k ? new Date(k) : new Date();
  var yas    = karsi.getFullYear() - dogum.getFullYear();
  var ayFark = karsi.getMonth() - dogum.getMonth();
  if(ayFark < 0 || (ayFark === 0 && karsi.getDate() < dogum.getDate())){
    yas--;
  }
  return yas < 0 ? 0 : yas;
};

/* ---------- ASGARİ ÜCRET ARAMA ---------- */

/**
 * VERİLEN TARİH İÇİN GEÇERLİ ASGARİ ÜCRETİ BUL
 * @param {string} t - TARİH (YYYY-MM-DD)
 * @returns {object|null} EŞLEŞEN ASGARİ ÜCRET KAYDI VEYA NULL
 */
MR.asgariUcretBul = function(t){
  if(!t || !MR.ASGARI_UCRET) return null;
  var tarih = new Date(t);
  for(var i = 0; i < MR.ASGARI_UCRET.length; i++){
    var satir = MR.ASGARI_UCRET[i];
    var bas   = new Date(satir.bas);
    var bit   = new Date(satir.bit);
    if(tarih >= bas && tarih <= bit){
      return satir;
    }
  }
  /* TARİH ARALIKTA BULUNAMAZSA EN ESKİ KAYDI DÖNDÜR */
  return MR.ASGARI_UCRET[MR.ASGARI_UCRET.length - 1];
};

/* ---------- PMF YAŞAM TABLOSU SORGULAMA ---------- */

/**
 * PMF TABLOSUNDAN BEKLENEN YAŞAM SÜRESİNİ HESAPLA
 * ARA YAŞLAR İÇİN DOĞRUSAL İNTERPOLASYON UYGULAR
 * @param {string} tablo - TABLO ADI ("TRH2010", "CSO1980", "PMF1931")
 * @param {string} c     - CİNSİYET ("E" VEYA "K")
 * @param {number} y     - YAŞ
 * @returns {number} KALAN BEKLENEN ÖMÜR (YIL)
 */
MR.pmfDeger = function(tablo, c, y){
  if(!MR.PMF) return 0;
  var t = MR.PMF[tablo];
  if(!t) return 0;
  var veri = t[c];
  if(!veri) return 0;

  var yas = Number(y);
  if(yas < 0)   yas = 0;
  if(yas > 100) return 0;

  /* TAM DEĞER VARSA DOĞRUDAN DÖNDÜR */
  if(veri[yas] !== undefined) return veri[yas];

  /* İNTERPOLASYON: EN YAKIN ALT VE ÜST ANAHTARLARI BUL */
  var anahtarlar = Object.keys(veri).map(Number).sort(function(a,b){return a - b;});
  var alt = 0, ust = 100;
  for(var i = 0; i < anahtarlar.length; i++){
    if(anahtarlar[i] <= yas) alt = anahtarlar[i];
    if(anahtarlar[i] >= yas && ust === 100){
      ust = anahtarlar[i];
      break;
    }
  }
  if(alt === ust) return veri[alt];

  /* DOĞRUSAL İNTERPOLASYON */
  var oran = (yas - alt) / (ust - alt);
  var sonuc = veri[alt] + (veri[ust] - veri[alt]) * oran;
  return Math.round(sonuc * 100) / 100;
};

/* ---------- PROGRESİF RANT HESAPLAMASI ---------- */

/**
 * PROGRESİF RANT (1/LN) METODU İLE İSKONTO HESAPLA
 * YARGITAY UYGULAMASINDA KULLANILAN HESAPLAMA YÖNTEMİ
 * @param {number} y - KALAN YIL SAYISI
 * @param {number} [f] - FAİZ ORANI (VARSAYILAN: 0.10 YANI %10)
 * @returns {number} PROGRESİF RANT KATSAYISI
 */
MR.progresifRant = function(y, f){
  var yil  = Number(y) || 0;
  var faiz = Number(f) || 0.10;
  if(yil <= 0) return 0;
  if(faiz <= 0) return yil;

  var toplam = 0;
  for(var i = 1; i <= yil; i++){
    toplam += 1 / Math.pow(1 + faiz, i);
  }

  /* KÜSÜRATLI YIL KISMI */
  var tamYil   = Math.floor(yil);
  var kusurat  = yil - tamYil;
  if(kusurat > 0 && tamYil < yil){
    toplam += kusurat / Math.pow(1 + faiz, tamYil + 1);
  }

  return Math.round(toplam * 10000) / 10000;
};
