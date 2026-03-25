/**
 * MR HASAR DANISMANLIK - WEBRTC SOFTPHONE WIDGET v3.0
 * SADECE GELEN ÇAĞRI POPUP'I (SAĞ ÜST KÖŞE)
 * Sağ alt floating widget KALDIRILDI - tüm çağrı kontrolü sol panel üzerinden
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef, useMemo} = React;

/* ═══ NETSANTRAL YAPILANDIRMA ═══ */
if (!MR._webrtcConfig) MR._webrtcConfig = null;
if (MR._webrtcBaslatildi === undefined) MR._webrtcBaslatildi = false;

/* ═══ VARSAYILAN NETSANTRAL AYARLARI ═══ */
MR._netsantralVarsayilan = {
  wssUrl: 'wss://sip6.netsantral.com:8089/ws',
  domain: 'sip6.netsantral.com',
  dahili: '102',
  sipSifre: 'mayaarHeK4',
  santralNo: '3625026502',
  kullanici: '102-3625026502'
};

/* ═══ WEBRTC OTOMATİK BAŞLATMA ═══ */
MR.webrtcOtoBaslat = async (user) => {
  if (MR._webrtcBaslatildi || !MR.webrtcTelefon) {
    console.log('[WEBRTC-WIDGET] ZATEN BAŞLATILMIŞ VEYA TELEFON MODÜLÜ YOK - ATLANIYOR');
    return;
  }
  if (!user) return;

  var config = MR._webrtcConfig;
  if (!config) {
    var def = MR._netsantralVarsayilan;
    var wssUrl = localStorage.getItem('mr_netsantral_wss') || def.wssUrl;
    var domain = localStorage.getItem('mr_netsantral_domain') || def.domain;
    var dahili = localStorage.getItem('mr_netsantral_dahili') || def.dahili;
    var sipSifre = localStorage.getItem('mr_netsantral_sip_sifre') || def.sipSifre;
    var santralNo = localStorage.getItem('mr_netsantral_no') || def.santralNo;
    var kullanici = localStorage.getItem('mr_netsantral_kullanici') || def.kullanici;

    if (!dahili || !sipSifre || !wssUrl) {
      console.log('[WEBRTC-WIDGET] NETSANTRAL AYARLARI EKSİK');
      return;
    }

    var apiSifre = localStorage.getItem('mr_netsantral_api_sifre') || '';

    config = {
      wssUrl: wssUrl,
      domain: domain || wssUrl.replace('wss://', '').replace(/:\d+.*/, '').replace(/\/.*/, ''),
      dahili: dahili,
      sipSifre: sipSifre,
      santralNo: santralNo,
      kullanici: kullanici,
      apiSifre: apiSifre
    };
    MR._webrtcConfig = config;
  }

  console.log('[WEBRTC-WIDGET] BAŞLATILIYOR - DAHİLİ:', config.dahili, '| WSS:', config.wssUrl);
  MR._webrtcBaslatildi = true;
  MR.webrtcTelefon.baslat(config);
};

/* ═══ WEBRTC YENİDEN BAŞLAT ═══ */
MR.webrtcYenidenBaslat = async () => {
  if (MR.webrtcTelefon) {
    await MR.webrtcTelefon.durdur();
  }
  MR._webrtcBaslatildi = false;
  MR._webrtcConfig = null;
  await new Promise(r => setTimeout(r, 1500));
  MR.webrtcOtoBaslat(MR._currentUser || {});
};

/* ═══ GLOBAL ARAMA FONKSİYONU ═══ */
MR.webrtcAra = (numara, bilgi) => {
  if (!MR.webrtcTelefon || !MR.webrtcTelefon._kayitli) {
    MR.toast && MR.toast('WEBRTC TELEFON KAYITLI DEĞİL - LÜTFEN NETSANTRAL AYARLARINI KONTROL EDİN', 'error');
    return false;
  }
  /* ARAMA BİLGİSİNİ SAKLA */
  MR._sonAramaBilgi = bilgi || {};
  window.dispatchEvent(new CustomEvent('mr-webrtc-arama-basla', {
    detail: { numara: numara, bilgi: bilgi || {} }
  }));
  return MR.webrtcTelefon.ara(numara);
};

/* ═══ MÜŞTERI EŞLEŞTIRME ═══ */
MR._musteriEslestir = async (numara) => {
  if (!numara || !MR.api) return null;
  try {
    var temizNumara = numara.replace(/[\s\-\(\)\+]/g, '');
    var r = await MR.api.crmList({q: temizNumara, limit: 5});
    if (r && r.success && r.data && r.data.items && r.data.items.length > 0) {
      return { kaynak: 'CRM', kayitlar: r.data.items };
    }
    var r2 = await MR.api.yonlendirmeList({q: temizNumara, limit: 5});
    if (r2 && r2.success && r2.data && r2.data.items && r2.data.items.length > 0) {
      return { kaynak: 'YÖNLENDIRME', kayitlar: r2.data.items };
    }
    return null;
  } catch(e) {
    console.log('[WEBRTC-WIDGET] MÜŞTERİ EŞLEŞTIRME HATASI:', e);
    return null;
  }
};

/* ═══════════════════════════════════════════
   WEBRTC WIDGET v3.0
   SADECE GELEN ÇAĞRI POPUP'I (SAĞ ÜST KÖŞE)
   Sağ alt floating widget KALDIRILDI
   Tüm çağrı kontrolü sol panel ANLIK ÇAĞRI & ANALİZ üzerinden
   ═══════════════════════════════════════════ */
MR.WebrtcWidget = ({user, setPage}) => {
  const {C, LIcon} = MR;

  /* DURUM STATE'LERİ - SADECE GELEN ÇAĞRI İÇİN */
  const [aramaDurumu, setAramaDurumu] = useState('bos');
  const [karsiTaraf, setKarsiTaraf] = useState('');
  const [karsiTarafAdi, setKarsiTarafAdi] = useState('');
  const [eslestirme, setEslestirme] = useState(null);

  /* WEBRTC DURUM DİNLEYİCİ */
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      switch(d.durum) {
        case 'gelen-cagri':
          setAramaDurumu('gelen');
          if (d.detay) {
            setKarsiTaraf(d.detay.arayan || '');
            setKarsiTarafAdi(d.detay.arayanAdi || '');
          }
          /* MÜŞTERİ EŞLEŞTIRME */
          if (d.detay && d.detay.arayan) {
            MR._musteriEslestir(d.detay.arayan).then(r => { if (r) setEslestirme(r); });
          }
          break;
        case 'gorusmede':
          /* Cevaplanınca popup kapansın */
          if (aramaDurumu === 'gelen') setAramaDurumu('bos');
          break;
        case 'kapandi':
        case 'reddedildi':
          setAramaDurumu('bos');
          setEslestirme(null);
          setKarsiTarafAdi('');
          break;
        case 'baglanti-koptu':
        case 'durduruldu':
        case 'kayit-kaldirildi':
          setAramaDurumu('bos');
          break;
      }
    };
    window.addEventListener('mr-webrtc-durum', handler);
    return () => window.removeEventListener('mr-webrtc-durum', handler);
  }, [aramaDurumu]);

  /* GİDEN ARAMA BAŞLATMA DİNLEYİCİ - crm-yeni sayfasına yönlendir */
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      if (d.bilgi) {
        localStorage.setItem('webrtc_new_call_phone', d.numara || '');
        localStorage.setItem('webrtc_new_call_name', d.bilgi.ad || d.bilgi.ad_soyad || '');
        if (d.bilgi.il) localStorage.setItem('webrtc_new_call_il', d.bilgi.il);
        if (d.bilgi.dosya_turu) localStorage.setItem('webrtc_new_call_dosya_turu', d.bilgi.dosya_turu);
        /* Sayfa yönlendirmesi CRM listesi tarafından yapılıyor, burada tekrar yapma */
      } else if (d.numara) {
        localStorage.setItem('webrtc_new_call_phone', d.numara || '');
        localStorage.setItem('webrtc_new_call_name', '');
      }
    };
    window.addEventListener('mr-webrtc-arama-basla', handler);
    return () => window.removeEventListener('mr-webrtc-arama-basla', handler);
  }, [setPage]);

  /* CEVAPLA - CRM'DE ARA + CRM-YENİ AÇ */
  const cevapla = async () => {
    if (!MR.webrtcTelefon) return;
    MR.webrtcTelefon.cevapla();

    /* CRM'de arayan numarayı ara */
    var numara = karsiTaraf || '';
    var ad = karsiTarafAdi || '';

    /* Eşleştirme zaten yapıldıysa oradan al */
    if (!ad && eslestirme && eslestirme.kayitlar && eslestirme.kayitlar.length > 0) {
      var k = eslestirme.kayitlar[0];
      ad = k.ad_soyad || k.magdur_ad_soyad || '';
    }

    /* Eşleştirme henüz gelmemişse tekrar dene */
    if (!ad && numara && MR.api) {
      try {
        var r = await MR._musteriEslestir(numara);
        if (r && r.kayitlar && r.kayitlar.length > 0) {
          var kk = r.kayitlar[0];
          ad = kk.ad_soyad || kk.magdur_ad_soyad || '';
        }
      } catch(e) {}
    }

    /* localStorage'a yaz - crm-yeni okuyacak */
    localStorage.setItem('webrtc_new_call_phone', numara);
    localStorage.setItem('webrtc_new_call_name', ad);
    setPage('crm-yeni');
  };

  /* REDDET */
  const reddet = () => {
    if (MR.webrtcTelefon) MR.webrtcTelefon.reddet();
  };

  const isK = MR.tema === 'koyu';

  /* ═══════════════════════════════════════
     SADECE GELEN ÇAĞRI POPUP'I - SAĞ ÜST KÖŞE
     Boşta veya aktif görüşmede: HİÇBİR ŞEY RENDER ETME
     ═══════════════════════════════════════ */
  if (aramaDurumu !== 'gelen') return null;

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 99999,
      width: 320,
      background: isK ? '#1e293b' : '#fff',
      border: '2px solid #10b981',
      borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 0 40px rgba(16,185,129,0.15)',
      animation: 'fadeIn .3s ease'
    }}>
      {/* HEADER - GELEN ÇAĞRI */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(16,185,129,0.2)',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 1.5s infinite', flexShrink: 0
        }}>
          <LIcon name="PhoneIncoming" size={18} color="#10b981"/>
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontSize: 10, fontWeight: 700, color: '#10b981', letterSpacing: 1.5, marginBottom: 2}}>
            GELEN ÇAĞRI
          </div>
          <div style={{fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
            {karsiTaraf || 'BİLİNMEYEN'}
          </div>
          {karsiTarafAdi && (
            <div style={{fontSize: 12, color: C.textSec, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{karsiTarafAdi}</div>
          )}
        </div>
      </div>

      {/* MÜŞTERİ EŞLEŞTIRME */}
      {eslestirme && (
        <div style={{padding: '8px 14px', borderBottom: '1px solid ' + C.border}}>
          <div style={{fontSize: 9, fontWeight: 700, color: C.accent, marginBottom: 4, letterSpacing: 1}}>
            <LIcon name="UserCheck" size={10} color={C.accent}/> {eslestirme.kaynak} EŞLEŞME
          </div>
          {eslestirme.kayitlar.slice(0, 1).map((k, i) => (
            <div key={i} style={{
              background: C.accent + '0a', border: '1px solid ' + C.accent + '22',
              borderRadius: 6, padding: '5px 8px',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <LIcon name="User" size={12} color={C.accent}/>
              <div>
                <div style={{fontSize: 11, fontWeight: 700, color: C.text}}>{k.ad_soyad || k.magdur_ad_soyad || '-'}</div>
                <div style={{fontSize: 9, color: C.textMuted}}>{k.telefon || k.magdur_telefon || ''} {k.il ? '| ' + k.il : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BUTONLAR - REDDET + CEVAPLA */}
      <div style={{padding: '10px 14px', display: 'flex', gap: 8}}>
        <button onClick={reddet} style={{
          flex: 1, padding: '10px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(180deg, #f87171, #dc2626)',
          color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 3px 10px rgba(220,38,38,0.3)'
        }}>
          <LIcon name="PhoneOff" size={15} color="#fff"/> REDDET
        </button>
        <button onClick={cevapla} style={{
          flex: 1, padding: '10px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(180deg, #34d399, #059669)',
          color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 3px 10px rgba(5,150,105,0.3)',
          animation: 'pulse 1.5s infinite'
        }}>
          <LIcon name="Phone" size={15} color="#fff"/> CEVAPLA
        </button>
      </div>
    </div>
  );
};

/* ═══ NETSIPP DURUM BİLEŞENİ ═══ */
MR._NetsippDurum = () => {
  const {C, LIcon} = MR;
  const [kayitli, setKayitli] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setKayitli(!!(e.detail && e.detail.kayitli));
    };
    window.addEventListener('mr-webrtc-durum', handler);
    if (MR.webrtcTelefon) setKayitli(MR.webrtcTelefon._kayitli);
    return () => window.removeEventListener('mr-webrtc-durum', handler);
  }, []);

  return (
    <div style={{
      marginTop: 6, padding: '5px 10px', borderRadius: 6,
      background: kayitli ? (C.success + '12') : (C.warning + '12'),
      border: '1px solid ' + (kayitli ? C.success : C.warning) + '30',
      fontSize: 9, fontWeight: 600,
      color: kayitli ? C.success : C.warning,
      display: 'flex', alignItems: 'center', gap: 5
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: kayitli ? C.success : C.warning
      }}/>
      {kayitli ? 'NETSANTRAL BAĞLI' : 'NETSANTRAL BAĞLANTI BEKLENİYOR'}
    </div>
  );
};

/* ═══ SES AYARLARI PANELİ ═══ */
MR._SesAyarlariPaneli = () => {
  const {C, S, LIcon} = MR;
  const [acik, setAcik] = useState(false);
  const [ayarlar, setAyarlar] = useState({});
  const [cihazlar, setCihazlar] = useState({mikrofonlar: [], hoparlorler: []});

  useEffect(() => {
    if (acik && MR.webrtcTelefon) {
      MR.webrtcTelefon.cihazlariListele().then(function(d) {
        setCihazlar(d || {mikrofonlar: [], hoparlorler: []});
      });
      setAyarlar(MR.webrtcTelefon.getSesAyarlari());
    }
  }, [acik]);

  const guncelle = (key, val) => {
    setAyarlar(p => ({...p, [key]: val}));
    if (MR.webrtcTelefon) MR.webrtcTelefon.sesAyarla(key, val);
  };

  const sliderSt = {width:'100%', accentColor: C.accent, cursor:'pointer', height:6};

  return (
    <div style={{...S.card, marginBottom:16}}>
      <div style={{...S.cardHead, padding:'12px 16px', cursor:'pointer', justifyContent:'space-between'}} onClick={() => setAcik(!acik)}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <LIcon name="Volume2" size={16} color={C.cyan}/>
          <span style={{fontSize:12, fontWeight:700}}>SES & MİKROFON AYARLARI</span>
        </div>
        <LIcon name={acik ? 'ChevronUp' : 'ChevronDown'} size={14} color={C.textMuted}/>
      </div>
      {acik && (
        <div style={{padding:16}}>
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:10, fontWeight:700, color:C.textSec}}>HOPARLÖR SESİ</span>
              <span style={{fontSize:10, fontWeight:800, color:C.accent}}>{Math.round((ayarlar.volume || 1) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={ayarlar.volume || 1}
              onChange={e => guncelle('volume', parseFloat(e.target.value))} style={sliderSt}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:10, fontWeight:700, color:C.textSec}}>ÇALMA SESİ (GİDEN)</span>
              <span style={{fontSize:10, fontWeight:800, color:C.accent}}>{Math.round((ayarlar.ringbackVolume || 0.3) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={ayarlar.ringbackVolume || 0.3}
              onChange={e => guncelle('ringbackVolume', parseFloat(e.target.value))} style={sliderSt}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:10, fontWeight:700, color:C.textSec}}>ZİL SESİ (GELEN)</span>
              <span style={{fontSize:10, fontWeight:800, color:C.accent}}>{Math.round((ayarlar.ringtoneVolume || 0.5) * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={ayarlar.ringtoneVolume || 0.5}
              onChange={e => guncelle('ringtoneVolume', parseFloat(e.target.value))} style={sliderSt}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
              <span style={{fontSize:10, fontWeight:700, color:C.textSec}}>MİKROFON SEVİYESİ</span>
              <span style={{fontSize:10, fontWeight:800, color:C.accent}}>{Math.round((ayarlar.mikrofonGain || 1) * 100)}%</span>
            </div>
            <input type="range" min="0.1" max="3.0" step="0.1" value={ayarlar.mikrofonGain || 1}
              onChange={e => guncelle('mikrofonGain', parseFloat(e.target.value))} style={sliderSt}/>
          </div>
          {cihazlar.mikrofonlar.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10, fontWeight:700, color:C.textSec, marginBottom:6}}>MİKROFON CİHAZI</div>
              <select style={{...S.select, fontSize:10, padding:'6px 10px'}} value={ayarlar.mikrofonId || ''}
                onChange={e => guncelle('mikrofonId', e.target.value)}>
                <option value="">VARSAYILAN MİKROFON</option>
                {cihazlar.mikrofonlar.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || ('MİKROFON ' + (i+1))}</option>)}
              </select>
            </div>
          )}
          {cihazlar.hoparlorler.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10, fontWeight:700, color:C.textSec, marginBottom:6}}>HOPARLÖR CİHAZI</div>
              <select style={{...S.select, fontSize:10, padding:'6px 10px'}} value={ayarlar.hoparlörId || ''}
                onChange={e => guncelle('hoparlörId', e.target.value)}>
                <option value="">VARSAYILAN HOPARLÖR</option>
                {cihazlar.hoparlorler.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || ('HOPARLÖR ' + (i+1))}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══ NETSANTRAL AYARLARI - TAM SAYFA (SİSTEM MENÜSÜNDEN ERİŞİLİR) ═══ */
MR.NetsantralAyarlariPage = ({setPage, user}) => {
  const {C, S, LIcon, FormGroup} = MR;
  const def = MR._netsantralVarsayilan;

  /* ═══ YETKİ KONTROL ═══ */
  const yetkiGoruntule = user?.rol === 'admin' || MR.hasYetki(user, 'netsantral', 'netsantral-goruntule');
  const yetkiDuzenle = user?.rol === 'admin' || MR.hasYetki(user, 'netsantral', 'netsantral-duzenle');
  const yetkiSifreGor = user?.rol === 'admin' || MR.hasYetki(user, 'netsantral', 'netsantral-sifre-gor');
  const yetkiApiDuzenle = user?.rol === 'admin' || MR.hasYetki(user, 'netsantral', 'netsantral-api-duzenle');
  const yetkiTest = user?.rol === 'admin' || MR.hasYetki(user, 'netsantral', 'netsantral-test');
  const yetkiYenidenBaslat = user?.rol === 'admin' || MR.hasYetki(user, 'netsantral', 'netsantral-yeniden-baslat');

  /* FORM STATE */
  const [wss, setWss] = useState(localStorage.getItem('mr_netsantral_wss') || def.wssUrl);
  const [domain, setDomain] = useState(localStorage.getItem('mr_netsantral_domain') || def.domain);
  const [dahili, setDahili] = useState(localStorage.getItem('mr_netsantral_dahili') || def.dahili);
  const [sipSifre, setSipSifre] = useState(localStorage.getItem('mr_netsantral_sip_sifre') || def.sipSifre);
  const [santralNo, setSantralNo] = useState(localStorage.getItem('mr_netsantral_no') || def.santralNo);
  const [kullanici, setKullanici] = useState(localStorage.getItem('mr_netsantral_kullanici') || def.kullanici);
  const [apiSifre, setApiSifre] = useState(localStorage.getItem('mr_netsantral_api_sifre') || '');
  const [sipPort, setSipPort] = useState(localStorage.getItem('mr_netsantral_sip_port') || '5060');
  const [kayitSuresi, setKayitSuresi] = useState(localStorage.getItem('mr_netsantral_kayit_suresi') || '300');
  const [outboundProxy, setOutboundProxy] = useState(localStorage.getItem('mr_netsantral_outbound_proxy') || '');

  /* BAĞLANTI DURUMU */
  const [bagli, setBagli] = useState(false);
  const [baglantiDetay, setBaglantiDetay] = useState('');
  const [sonKontrol, setSonKontrol] = useState('');
  const [testYapiliyor, setTestYapiliyor] = useState(false);
  const [kayitDurumu, setKayitDurumu] = useState('');

  /* WEBRTC DURUM DİNLE */
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      setBagli(!!d.kayitli);
      if (d.durum === 'kayitli') {
        setBaglantiDetay('SIP KAYDI BAŞARILI - DAHİLİ: ' + (MR._webrtcConfig?.dahili || '-'));
      } else if (d.durum === 'hata') {
        setBaglantiDetay(d.detay || 'BİLİNMEYEN HATA');
      } else if (d.durum === 'baglanti-koptu') {
        setBaglantiDetay('BAĞLANTI KOPTU');
      } else if (d.durum === 'durduruldu') {
        setBaglantiDetay('BAĞLANTI DURDURULDU');
      }
    };
    window.addEventListener('mr-webrtc-durum', handler);
    if (MR.webrtcTelefon) {
      setBagli(MR.webrtcTelefon._kayitli);
      if (MR.webrtcTelefon._kayitli) setBaglantiDetay('SIP KAYDI BAŞARILI');
    }
    return () => window.removeEventListener('mr-webrtc-durum', handler);
  }, []);

  /* BAĞLANTI TEST */
  const baglantiTest = async () => {
    setTestYapiliyor(true);
    setBaglantiDetay('TEST EDİLİYOR...');
    var simdi = new Date().toLocaleString('tr-TR');
    setSonKontrol(simdi);

    /* 1. WSS BAĞLANTI TESTİ */
    var wssUrl = wss || def.wssUrl;
    try {
      var testResult = await new Promise((resolve, reject) => {
        var ws = new WebSocket(wssUrl);
        var timeout = setTimeout(() => { ws.close(); reject('ZAMAN AŞIMI - WSS SUNUCUSUNA ERİŞİM SAĞLANAMADI'); }, 5000);
        ws.onopen = () => { clearTimeout(timeout); ws.close(); resolve('WSS BAĞLANTISI BAŞARILI'); };
        ws.onerror = () => { clearTimeout(timeout); reject('WSS SUNUCUSUNA ERİŞİM SAĞLANAMADI - URL VEYA PORT HATALI OLABİLİR'); };
      });
      setBaglantiDetay(testResult);

      /* 2. SIP KAYIT TESTİ - MR.webrtcYenidenBaslat çağrılır */
      if (!MR.webrtcTelefon?._kayitli) {
        setBaglantiDetay('WSS BAĞLANTISI OK - SIP KAYDI DENENİYOR...');
        MR.webrtcYenidenBaslat();
        /* SIP sonucu event dinleyiciden gelecek */
      }
    } catch(err) {
      setBaglantiDetay(typeof err === 'string' ? err : 'WSS BAĞLANTI HATASI: ' + (err?.message || ''));
    }
    setTestYapiliyor(false);
  };

  /* KAYDET */
  const kaydet = () => {
    localStorage.setItem('mr_netsantral_wss', wss);
    localStorage.setItem('mr_netsantral_domain', domain);
    localStorage.setItem('mr_netsantral_dahili', dahili);
    localStorage.setItem('mr_netsantral_sip_sifre', sipSifre);
    localStorage.setItem('mr_netsantral_no', santralNo);
    localStorage.setItem('mr_netsantral_kullanici', kullanici);
    localStorage.setItem('mr_netsantral_api_sifre', apiSifre);
    localStorage.setItem('mr_netsantral_sip_port', sipPort);
    localStorage.setItem('mr_netsantral_kayit_suresi', kayitSuresi);
    localStorage.setItem('mr_netsantral_outbound_proxy', outboundProxy);
    setKayitDurumu('KAYDEDİLDİ');
    setTimeout(() => setKayitDurumu(''), 3000);
    MR.webrtcYenidenBaslat();
  };

  /* YETKİSİZ ERİŞİM GUARD */
  if (!yetkiGoruntule) {
    return <div style={{padding:40,textAlign:'center',color:C.danger,fontWeight:800,fontSize:16}}>
      <LIcon name="ShieldAlert" size={48} color={C.danger}/>
      <div style={{marginTop:12}}>BU SAYFAYI GÖRÜNTÜLEME YETKİNİZ BULUNMAMAKTADIR</div>
    </div>;
  }

  return (
    <div className="fade-in">

      {/* ═══ BAĞLANTI DURUMU KARTI ═══ */}
      <div style={{...S.card, marginBottom:16}}>
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{
              width:14, height:14, borderRadius:'50%',
              background: bagli ? C.success : C.danger,
              boxShadow: bagli ? ('0 0 10px ' + C.success + '60') : ('0 0 10px ' + C.danger + '40'),
              animation: bagli ? 'none' : 'pulse 2s infinite'
            }}/>
            <span style={{fontSize:14, fontWeight:800}}>BAĞLANTI DURUMU</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            {sonKontrol && <span style={{fontSize:9, color:C.textMuted}}>SON KONTROL: {sonKontrol}</span>}
            {yetkiTest && <button onClick={baglantiTest} disabled={testYapiliyor} style={{
              ...S.btn, ...S.btnP, fontSize:11, padding:'8px 16px',
              opacity: testYapiliyor ? 0.6 : 1
            }}>
              <LIcon name="Wifi" size={14} color="#fff"/> {testYapiliyor ? 'TEST EDİLİYOR...' : 'BAGLANTIYI TEST ET'}
            </button>}
          </div>
        </div>
        <div style={{padding:20}}>
          <div style={{
            padding:'16px 20px', borderRadius:12,
            background: bagli ? `${C.success}10` : `${C.danger}10`,
            border: `2px solid ${bagli ? C.success : C.danger}30`,
            display:'flex', alignItems:'center', gap:14
          }}>
            <div style={{
              width:48, height:48, borderRadius:'50%',
              background: bagli ? `${C.success}20` : `${C.danger}20`,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
            }}>
              <LIcon name={bagli ? 'Wifi' : 'WifiOff'} size={24} color={bagli ? C.success : C.danger}/>
            </div>
            <div>
              <div style={{fontSize:18, fontWeight:800, color: bagli ? C.success : C.danger, marginBottom:4}}>
                {bagli ? 'BAĞLI' : 'BAĞLI DEĞİL'}
              </div>
              <div style={{fontSize:12, color:C.textSec, lineHeight:1.5}}>
                {baglantiDetay || (bagli ? 'NETSANTRAL SIP SUNUCUSUNA BAĞLI' : 'SIP SUNUCUSUNA BAĞLANTI YOK')}
              </div>
              {MR._webrtcConfig && bagli && (
                <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>
                  DAHİLİ: {MR._webrtcConfig.dahili} | WSS: {MR._webrtcConfig.wssUrl}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ İKİ SÜTUN: SIP AYARLARI + PROXY ═══ */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>

        {/* SIP / WSS BAĞLANTI BİLGİLERİ */}
        <div style={S.card}>
          <div style={S.cardHead}>
            <LIcon name="Phone" size={16} color={C.accent}/>
            <span style={{fontSize:13, fontWeight:700}}>SIP / WSS BAĞLANTI BİLGİLERİ</span>
          </div>
          <div style={{padding:20}}>
            <div style={{display:'grid', gap:14}}>
              <FormGroup label="WSS URL *">
                <input style={{...S.input, opacity: yetkiDuzenle ? 1 : 0.6}} value={wss} onChange={e => setWss(e.target.value)} placeholder="wss://sip6.netsantral.com:8089/ws" readOnly={!yetkiDuzenle}/>
              </FormGroup>
              <FormGroup label="SIP ALAN ADI / DOMAIN">
                <input style={{...S.input, opacity: yetkiDuzenle ? 1 : 0.6}} value={domain} onChange={e => setDomain(e.target.value)} placeholder="sip6.netsantral.com" readOnly={!yetkiDuzenle}/>
              </FormGroup>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <FormGroup label="SIP KULLANICI ADI (DAHİLİ) *">
                  <input style={{...S.input, opacity: yetkiDuzenle ? 1 : 0.6}} value={dahili} onChange={e => setDahili(e.target.value)} placeholder="102" readOnly={!yetkiDuzenle}/>
                </FormGroup>
                <FormGroup label="SIP ŞİFRESİ *">
                  <input type={yetkiSifreGor ? 'password' : 'text'} style={{...S.input, textTransform:'none', opacity: yetkiDuzenle ? 1 : 0.6}} value={yetkiSifreGor ? sipSifre : (sipSifre ? '••••••••' : '')} onChange={e => { if(yetkiDuzenle) setSipSifre(e.target.value); }} placeholder="SIP ŞİFRENİZ" readOnly={!yetkiDuzenle || !yetkiSifreGor}/>
                </FormGroup>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <FormGroup label="KAYIT SÜRESİ (SANİYE)">
                  <input style={{...S.input, opacity: yetkiDuzenle ? 1 : 0.6}} value={kayitSuresi} onChange={e => setKayitSuresi(e.target.value.replace(/[^0-9]/g,''))} placeholder="300" readOnly={!yetkiDuzenle}/>
                </FormGroup>
                <FormGroup label="SIP PORT">
                  <input style={{...S.input, opacity: yetkiDuzenle ? 1 : 0.6}} value={sipPort} onChange={e => setSipPort(e.target.value.replace(/[^0-9]/g,''))} placeholder="5060" readOnly={!yetkiDuzenle}/>
                </FormGroup>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <FormGroup label="SANTRAL NO">
                  <input style={{...S.input, opacity: yetkiDuzenle ? 1 : 0.6}} value={santralNo} onChange={e => setSantralNo(e.target.value)} placeholder="3625026502" readOnly={!yetkiDuzenle}/>
                </FormGroup>
                <FormGroup label="KULLANICI ADI (TAM)">
                  <input style={{...S.input, opacity: yetkiDuzenle ? 1 : 0.6}} value={kullanici} onChange={e => setKullanici(e.target.value)} placeholder="102-3625026502" readOnly={!yetkiDuzenle}/>
                </FormGroup>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: PROXY + API + STUN/TURN */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>

          {/* SIP PROXY / OUTBOUND */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <LIcon name="ArrowRightLeft" size={16} color={C.purple}/>
              <span style={{fontSize:13, fontWeight:700}}>SIP PROXY / OUTBOUND</span>
            </div>
            <div style={{padding:20}}>
              <FormGroup label="OUTBOUND PROXY (OPSİYONEL)">
                <input style={{...S.input, opacity: yetkiDuzenle ? 1 : 0.6}} value={outboundProxy} onChange={e => setOutboundProxy(e.target.value)} placeholder="BOŞ BIRAKILABILIR" readOnly={!yetkiDuzenle}/>
              </FormGroup>
              <div style={{
                marginTop:14, padding:12, borderRadius:10,
                background:`${C.textMuted}08`, border:`1px solid ${C.border}`
              }}>
                <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:6}}>
                  <LIcon name="Globe" size={12} color={C.textMuted}/>
                  <span style={{fontSize:11, fontWeight:700, color:C.textMuted}}>STUN / TURN</span>
                </div>
                <div style={{fontSize:11, color:C.textMuted, lineHeight:1.6}}>
                  KULLANILMIYOR - PBX MEDIA RELAY SAĞLIYOR
                </div>
              </div>
            </div>
          </div>

          {/* NETGSM API */}
          <div style={S.card}>
            <div style={S.cardHead}>
              <LIcon name="Key" size={16} color={C.cyan}/>
              <span style={{fontSize:13, fontWeight:700}}>NETGSM API (ÇAĞRI BAŞLATMA)</span>
            </div>
            <div style={{padding:20}}>
              <div style={{fontSize:11, color:C.textSec, marginBottom:12, lineHeight:1.6}}>
                CRM ÜZERİNDEN ARAMA YAPMAK İÇİN NETGSM API ŞİFRENİZİ GİRİN.
                BU ŞİFRE SIP ŞİFRESİNDEN FARKLIDIR.
              </div>
              <FormGroup label="API ŞİFRESİ *">
                <input type="password" style={{...S.input, textTransform:'none', opacity: yetkiApiDuzenle ? 1 : 0.6}} value={yetkiApiDuzenle ? apiSifre : (apiSifre ? '••••••••' : '')} onChange={e => { if(yetkiApiDuzenle) setApiSifre(e.target.value); }} placeholder="NETGSM API ŞİFRENİZ" readOnly={!yetkiApiDuzenle}/>
              </FormGroup>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KAYDET BUTONU ═══ */}
      <div style={{...S.card, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          {yetkiDuzenle && <button onClick={kaydet} style={{...S.btn, ...S.btnP, fontSize:13, padding:'12px 24px'}}>
            <LIcon name="Save" size={16} color="#fff"/> KAYDET & BAĞLAN
          </button>}
          {!yetkiDuzenle && yetkiYenidenBaslat && <button onClick={() => MR.webrtcYenidenBaslat()} style={{...S.btn, ...S.btnP, fontSize:13, padding:'12px 24px', background:C.cyan}}>
            <LIcon name="RefreshCw" size={16} color="#fff"/> YENİDEN BAŞLAT
          </button>}
          {kayitDurumu && (
            <span style={{fontSize:12, fontWeight:700, color:C.success}}>
              <LIcon name="CheckCircle" size={16} color={C.success}/> {kayitDurumu}
            </span>
          )}
        </div>
        <div style={{fontSize:10, color:C.textMuted}}>
          {MR._webrtcConfig ? 'SON YAPILANDIRMA: DAHİLİ ' + (MR._webrtcConfig.dahili || '-') : 'HENÜZ YAPILANDIRILMAMIŞ'}
        </div>
      </div>

      {/* ═══ BİLGİ PANELİ ═══ */}
      <div style={{
        marginTop:16, padding:16, borderRadius:12,
        background:C.accent+'06', border:'1px solid '+C.accent+'15',
        fontSize:11, color:C.textSec, lineHeight:1.8
      }}>
        <div style={{fontWeight:700, color:C.accent, marginBottom:6, fontSize:12}}>
          <LIcon name="Info" size={14} color={C.accent}/> BAĞLANTI REHBERİ
        </div>
        <div>WSS URL: NETSANTRAL PANELİNDEN ALINIR (WSS://SİP_SUNUCU:PORT/WS)</div>
        <div>DAHİLİ: NETSIPP UYGULAMASINDA KULLANDIĞINIZ DAHİLİ NUMARA</div>
        <div>SIP ŞİFRESİ: NETSANTRAL PANELİNDEN ALINAN SIP/WEBRTC ŞİFRESİ</div>
        <div>SANTRAL NO: 10 HANELİ MÜŞTERİ SANTRAL NUMARASI</div>
        <div>API ŞİFRESİ: NETGSM ALT KULLANICI API ŞİFRESİ (GİDEN ARAMA İÇİN)</div>
        <div style={{marginTop:8, fontWeight:700, color:C.warning}}>
          <LIcon name="AlertTriangle" size={12} color={C.warning}/> ÖNEMLİ: DAHİLİ BAĞLANTI TİPİ NETSANTRAL PANELİNDE "WSS" OLMALI (UDP DEĞİL)
        </div>
      </div>
    </div>
  );
};
