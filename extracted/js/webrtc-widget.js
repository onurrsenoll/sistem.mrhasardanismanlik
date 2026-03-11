/**
 * MR HASAR DANISMANLIK - WEBRTC SOFTPHONE WIDGET v1.0
 * FLOATING TELEFON ARAYUZU - TUM SAYFALARDA GORUNUR
 * GELEN CAGRI POPUP + GIDEN ARAMA + SURE SAYACI + MUSTERI ESLESTIRME
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

  /* NETSANTRAL AYARLARINI LOCALSTORAGEDAN VEYA VARSAYILANDAN YÜKLE */
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
      console.log('[WEBRTC-WIDGET] NETSANTRAL AYARLARI EKSİK - DAHİLİ:', !!dahili, '| SIP:', !!sipSifre, '| WSS:', !!wssUrl);
      return;
    }

    /* API ŞİFRESİ (Netsantral originate için) */
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

/* ═══ WEBRTC YENİDEN BAŞLAT (AYARLAR DEĞİŞTİĞİNDE) ═══ */
MR.webrtcYenidenBaslat = async () => {
  if (MR.webrtcTelefon) {
    await MR.webrtcTelefon.durdur();
  }
  MR._webrtcBaslatildi = false;
  MR._webrtcConfig = null;
  /* DURDURMA TAMAMLANSIN DİYE KISA BEKLEMEe */
  await new Promise(r => setTimeout(r, 1500));
  MR.webrtcOtoBaslat(MR._currentUser || {});
};

/* ═══ GLOBAL ARAMA FONKSİYONU ═══ */
MR.webrtcAra = (numara, bilgi) => {
  if (!MR.webrtcTelefon || !MR.webrtcTelefon._kayitli) {
    MR.toast && MR.toast('WEBRTC TELEFON KAYITLI DEĞİL - LÜTFEN NETSANTRAL AYARLARINI KONTROL EDİN', 'error');
    return false;
  }
  /* ARAMA BİLGİSİNİ SAKLA (WIDGET'TA GÖSTERMEK İÇİN) */
  MR._sonAramaBilgi = bilgi || {};
  window.dispatchEvent(new CustomEvent('mr-webrtc-arama-basla', {
    detail: { numara: numara, bilgi: bilgi || {} }
  }));
  return MR.webrtcTelefon.ara(numara);
};

/* ═══ MÜŞTERI EŞLEŞTIRME - GELEN NUMARA İLE DB SORGUSU ═══ */
MR._musteriEslestir = async (numara) => {
  if (!numara || !MR.api) return null;
  try {
    var temizNumara = numara.replace(/[\s\-\(\)\+]/g, '');
    /* CRM'DEN ARA */
    var r = await MR.api.crmList({q: temizNumara, limit: 5});
    if (r && r.success && r.data && r.data.items && r.data.items.length > 0) {
      return { kaynak: 'CRM', kayitlar: r.data.items };
    }
    /* YÖNLENDİRME LİSTESİNDEN ARA */
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
   FLOATING SOFTPHONE WIDGET
   TÜM SAYFALARDA GÖRÜNEN TELEFON ARAYÜZÜ
   ═══════════════════════════════════════════ */
MR.WebrtcWidget = ({user, setPage}) => {
  const {C, S, LIcon} = MR;

  /* DURUM STATE'LERİ */
  const [kayitli, setKayitli] = useState(false);
  const [aramaDurumu, setAramaDurumu] = useState('bos'); /* bos, araniyor, caliyor, gorusmede, gelen */
  const [karsiTaraf, setKarsiTaraf] = useState('');
  const [karsiTarafAdi, setKarsiTarafAdi] = useState('');
  const [eslestirme, setEslestirme] = useState(null);
  const [mute, setMute] = useState(false);
  const [hata, setHata] = useState('');
  const [panelAcik, setPanelAcik] = useState(false);
  const [numInput, setNumInput] = useState('');
  const [sureSn, setSureSn] = useState(0);
  const timerRef = useRef(null);
  const [gelenCagriPopup, setGelenCagriPopup] = useState(false);

  /* WEBRTC DURUM DİNLEYİCİ */
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      setKayitli(!!d.kayitli);
      setMute(!!d.mute);

      switch(d.durum) {
        case 'kayitli':
          setHata('');
          break;
        case 'hata':
          setHata(d.detay || 'BİLİNMEYEN HATA');
          setTimeout(() => setHata(''), 8000);
          break;
        case 'araniyor':
          setAramaDurumu('araniyor');
          if (d.detay && typeof d.detay === 'string') setKarsiTaraf(d.detay);
          setPanelAcik(true);
          break;
        case 'caliyor':
          /* GELEN ÇAĞRI İÇİN: aramaDurumu 'gelen' İSE DEĞİŞTİRME - CEVAPLA BUTONU KAYBOLMASIN */
          setAramaDurumu(prev => prev === 'gelen' ? 'gelen' : 'caliyor');
          setPanelAcik(true);
          break;
        case 'gelen-cagri':
          setAramaDurumu('gelen');
          if (d.detay) {
            setKarsiTaraf(d.detay.arayan || '');
            setKarsiTarafAdi(d.detay.arayanAdi || '');
          }
          setGelenCagriPopup(true);
          setPanelAcik(true);
          /* MÜŞTERİ EŞLEŞTIRME */
          if (d.detay && d.detay.arayan) {
            MR._musteriEslestir(d.detay.arayan).then(r => { if (r) setEslestirme(r); });
          }
          break;
        case 'gorusmede':
          setAramaDurumu('gorusmede');
          setGelenCagriPopup(false);
          break;
        case 'kapandi':
        case 'reddedildi':
          setAramaDurumu('bos');
          setGelenCagriPopup(false);
          setEslestirme(null);
          setKarsiTarafAdi('');
          setSureSn(0);
          break;
        case 'baglanti-koptu':
        case 'durduruldu':
        case 'kayit-kaldirildi':
          setKayitli(false);
          setAramaDurumu('bos');
          break;
      }
    };

    window.addEventListener('mr-webrtc-durum', handler);
    return () => window.removeEventListener('mr-webrtc-durum', handler);
  }, []);

  /* GİDEN ARAMA BAŞLATMA DİNLEYİCİ */
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      if (d.numara) setKarsiTaraf(d.numara);
      if (d.bilgi) {
        setKarsiTarafAdi(d.bilgi.ad || d.bilgi.ad_soyad || '');
      }
      setPanelAcik(true);
    };
    window.addEventListener('mr-webrtc-arama-basla', handler);
    return () => window.removeEventListener('mr-webrtc-arama-basla', handler);
  }, []);

  /* GÖRÜŞME SÜRE SAYACI */
  useEffect(() => {
    if (aramaDurumu === 'gorusmede') {
      setSureSn(0);
      timerRef.current = setInterval(() => {
        setSureSn(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [aramaDurumu]);

  /* SÜRE FORMATLAMA */
  const fmtSure = (sn) => {
    var dk = Math.floor(sn / 60);
    var s = sn % 60;
    return (dk < 10 ? '0' : '') + dk + ':' + (s < 10 ? '0' : '') + s;
  };

  /* ARAMA YAP (WIDGET'TAN) */
  const aramaYap = () => {
    var num = numInput.trim();
    if (!num) return;
    MR.webrtcAra(num);
    setNumInput('');
  };

  /* CEVAPLA */
  const cevapla = () => {
    if (MR.webrtcTelefon) {
      MR.webrtcTelefon.cevapla();
      setGelenCagriPopup(false);
    }
  };

  /* REDDET */
  const reddet = () => {
    if (MR.webrtcTelefon) {
      MR.webrtcTelefon.reddet();
      setGelenCagriPopup(false);
    }
  };

  /* KAPAT */
  const kapat = () => {
    if (MR.webrtcTelefon) MR.webrtcTelefon.kapat();
  };

  /* SESSİZ TOGGLE */
  const sesizToggle = () => {
    if (MR.webrtcTelefon) MR.webrtcTelefon.sesizToggle();
  };

  /* MÜŞTERİ KARTINA GİT */
  const musteriGit = (kayit, kaynak) => {
    if (kaynak === 'CRM' && kayit.id) {
      setPage('crm-detay-' + kayit.id);
    }
  };

  const isK = MR.tema === 'koyu';
  const aktif = aramaDurumu !== 'bos';
  const gelen = aramaDurumu === 'gelen';

  /* ═══ GELEN ÇAĞRI POPUP ═══ */
  if (gelenCagriPopup && gelen) {
    return (
      <React.Fragment>
        {/* OVERLAY */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 99998,
          animation: 'fadeIn .2s ease'
        }}/>

        {/* POPUP */}
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99999, width: 380,
          background: isK ? '#1e293b' : '#fff',
          border: `2px solid ${C.success}`,
          borderRadius: 20, padding: 0,
          boxShadow: `0 25px 50px rgba(0,0,0,0.3), 0 0 60px ${C.success}30`,
          animation: 'fadeIn .3s ease', overflow: 'hidden'
        }}>
          {/* HEADER */}
          <div style={{
            background: `linear-gradient(135deg, ${C.success}22, ${C.success}08)`,
            padding: '20px 24px', textAlign: 'center',
            borderBottom: `1px solid ${C.success}33`
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: `${C.success}22`, border: `3px solid ${C.success}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px', animation: 'pulse 1.5s infinite'
            }}>
              <LIcon name="PhoneIncoming" size={28} color={C.success}/>
            </div>
            <div style={{fontSize: 11, fontWeight: 700, color: C.success, letterSpacing: 2, marginBottom: 6}}>
              GELEN ÇAĞRI
            </div>
            <div style={{fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: 1}}>
              {karsiTaraf || 'BİLİNMEYEN NUMARA'}
            </div>
            {karsiTarafAdi && (
              <div style={{fontSize: 14, color: C.textSec, marginTop: 4}}>{karsiTarafAdi}</div>
            )}
          </div>

          {/* MÜŞTERİ EŞLEŞTIRME */}
          {eslestirme && (
            <div style={{padding: '12px 20px', borderBottom: `1px solid ${C.border}`}}>
              <div style={{fontSize: 10, fontWeight: 700, color: C.accent, marginBottom: 8, letterSpacing: 1}}>
                <LIcon name="UserCheck" size={12} color={C.accent}/> MÜŞTERİ EŞLEŞME ({eslestirme.kaynak})
              </div>
              {eslestirme.kayitlar.slice(0, 2).map((k, i) => (
                <div key={i} onClick={() => musteriGit(k, eslestirme.kaynak)} style={{
                  background: `${C.accent}0a`, border: `1px solid ${C.accent}22`,
                  borderRadius: 8, padding: '8px 12px', marginBottom: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <LIcon name="User" size={14} color={C.accent}/>
                  <div>
                    <div style={{fontSize: 12, fontWeight: 700}}>{k.ad_soyad || k.magdur_ad_soyad || '-'}</div>
                    <div style={{fontSize: 10, color: C.textMuted}}>{k.telefon || k.magdur_telefon || ''} {k.il ? '| ' + k.il : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* BUTONLAR */}
          <div style={{padding: '20px 24px', display: 'flex', gap: 12}}>
            <button onClick={reddet} style={{
              flex: 1, padding: '14px', borderRadius: 12, border: 'none',
              background: `linear-gradient(180deg, #f87171, #dc2626)`,
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(220,38,38,0.4)'
            }}>
              <LIcon name="PhoneOff" size={18} color="#fff"/> REDDET
            </button>
            <button onClick={cevapla} style={{
              flex: 1, padding: '14px', borderRadius: 12, border: 'none',
              background: `linear-gradient(180deg, #34d399, #059669)`,
              color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(5,150,105,0.4)',
              animation: 'pulse 1.5s infinite'
            }}>
              <LIcon name="Phone" size={18} color="#fff"/> CEVAPLA
            </button>
          </div>
        </div>
      </React.Fragment>
    );
  }

  /* ═══ FLOATING BUTON (KAPALI) ═══ */
  if (!panelAcik) {
    return (
      <div onClick={() => setPanelAcik(true)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9990,
        width: 54, height: 54, borderRadius: '50%',
        background: kayitli
          ? (aktif ? `linear-gradient(135deg, ${C.success}, #059669)` : `linear-gradient(135deg, ${C.accent}, #1d4ed8)`)
          : `linear-gradient(135deg, ${C.textMuted}, #475569)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', boxShadow: `0 8px 25px rgba(0,0,0,0.3)`,
        transition: 'all .3s', animation: gelen ? 'pulse 1s infinite' : 'none'
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <LIcon name={aktif ? 'PhoneCall' : 'Phone'} size={22} color="#fff"/>
        {/* DURUM BADGE */}
        {kayitli && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 14, height: 14, borderRadius: '50%',
            background: aktif ? C.success : '#10b981',
            border: `2px solid ${isK ? '#1e293b' : '#fff'}`
          }}/>
        )}
        {/* AKTİF GÖRÜŞME SÜRE BADGE */}
        {aramaDurumu === 'gorusmede' && (
          <div style={{
            position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
            background: C.success, color: '#fff', fontSize: 9, fontWeight: 800,
            padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap',
            fontFamily: 'monospace'
          }}>{fmtSure(sureSn)}</div>
        )}
      </div>
    );
  }

  /* ═══ AÇIK PANEL ═══ */
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9990,
      width: 320, maxHeight: 'calc(100vh - 100px)',
      background: isK ? '#1e293b' : '#fff',
      border: `1px solid ${C.border}`,
      borderRadius: 16, overflow: 'hidden',
      boxShadow: `0 20px 40px rgba(0,0,0,0.25)`,
      animation: 'fadeIn .2s ease'
    }}>
      {/* HEADER */}
      <div style={{
        background: kayitli
          ? (aktif ? `linear-gradient(135deg, ${C.success}22, ${C.success}0a)` : `linear-gradient(135deg, ${C.accent}18, ${C.accent}08)`)
          : `linear-gradient(135deg, ${C.textMuted}15, ${C.textMuted}05)`,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: kayitli ? (aktif ? C.success : '#10b981') : C.danger,
            boxShadow: kayitli ? `0 0 8px ${kayitli && aktif ? C.success : '#10b981'}60` : 'none'
          }}/>
          <span style={{fontSize: 11, fontWeight: 800, color: C.text}}>
            {kayitli ? (aktif ? 'AKTİF GÖRÜŞME' : 'NETSANTRAL HAZIR') : 'BAĞLANTI YOK'}
          </span>
        </div>
        <div style={{display: 'flex', gap: 4}}>
          <div onClick={() => setPanelAcik(false)} style={{
            width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${C.textMuted}15`
          }}>
            <LIcon name="Minus" size={14} color={C.textMuted}/>
          </div>
        </div>
      </div>

      {/* HATA MESAJI */}
      {hata && (
        <div style={{
          padding: '8px 16px', fontSize: 10, fontWeight: 600,
          background: `${C.danger}12`, color: C.danger,
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <LIcon name="AlertCircle" size={12} color={C.danger}/> {hata}
        </div>
      )}

      {/* AKTİF GÖRÜŞME PANELI */}
      {aktif && (
        <div style={{padding: 16}}>
          {/* KARŞİ TARAF */}
          <div style={{textAlign: 'center', marginBottom: 14}}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: aramaDurumu === 'gorusmede' ? `${C.success}20` : `${C.accent}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 8px',
              animation: (aramaDurumu === 'araniyor' || aramaDurumu === 'caliyor') ? 'pulse 2s infinite' : 'none'
            }}>
              <LIcon name={aramaDurumu === 'gelen' ? 'PhoneIncoming' : 'PhoneCall'} size={22}
                color={aramaDurumu === 'gorusmede' ? C.success : C.accent}/>
            </div>
            <div style={{fontSize: 18, fontWeight: 800, letterSpacing: 1, color: C.text}}>
              {karsiTaraf || 'BİLİNMEYEN'}
            </div>
            {karsiTarafAdi && (
              <div style={{fontSize: 12, color: C.textSec, marginTop: 2}}>{karsiTarafAdi}</div>
            )}
            <div style={{fontSize: 10, fontWeight: 700, color: aramaDurumu === 'gorusmede' ? C.success : C.warning, marginTop: 6, letterSpacing: 1}}>
              {aramaDurumu === 'araniyor' ? 'ARANIYOR...' :
               aramaDurumu === 'caliyor' ? 'ÇALIYOR...' :
               aramaDurumu === 'gelen' ? 'GELEN ÇAĞRI' :
               aramaDurumu === 'gorusmede' ? fmtSure(sureSn) : ''}
            </div>
          </div>

          {/* MÜŞTERİ EŞLEŞTIRME (GELEN ÇAĞRI İÇİN) */}
          {eslestirme && (
            <div style={{marginBottom: 12}}>
              <div style={{fontSize: 9, fontWeight: 700, color: C.accent, marginBottom: 6, letterSpacing: 1}}>
                MÜŞTERİ ({eslestirme.kaynak})
              </div>
              {eslestirme.kayitlar.slice(0, 1).map((k, i) => (
                <div key={i} onClick={() => musteriGit(k, eslestirme.kaynak)} style={{
                  background: `${C.accent}0a`, border: `1px solid ${C.accent}22`,
                  borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <LIcon name="User" size={12} color={C.accent}/>
                  <div>
                    <div style={{fontSize: 11, fontWeight: 700}}>{k.ad_soyad || k.magdur_ad_soyad || '-'}</div>
                    <div style={{fontSize: 9, color: C.textMuted}}>{k.il || k.magdur_il || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* KONTROL BUTONLARI */}
          <div style={{display: 'flex', gap: 8, justifyContent: 'center'}}>
            {/* GELEN ÇAĞRI: CEVAPLA + REDDET */}
            {aramaDurumu === 'gelen' && (
              <React.Fragment>
                <button onClick={reddet} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: `linear-gradient(180deg, #f87171, #dc2626)`,
                  color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <LIcon name="PhoneOff" size={14} color="#fff"/> REDDET
                </button>
                <button onClick={cevapla} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: `linear-gradient(180deg, #34d399, #059669)`,
                  color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <LIcon name="Phone" size={14} color="#fff"/> CEVAPLA
                </button>
              </React.Fragment>
            )}
            {/* GİDEN ARAMA / GÖRÜŞME: SESSİZ + KAPAT */}
            {(aramaDurumu === 'araniyor' || aramaDurumu === 'caliyor' || aramaDurumu === 'gorusmede') && (
              <React.Fragment>
                {aramaDurumu === 'gorusmede' && (
                  <button onClick={sesizToggle} style={{
                    width: 44, height: 44, borderRadius: 10, border: 'none',
                    background: mute ? `${C.warning}22` : `${C.textMuted}15`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }} title={mute ? 'SESİ AÇ' : 'SESSİZE AL'}>
                    <LIcon name={mute ? 'MicOff' : 'Mic'} size={18} color={mute ? C.warning : C.textSec}/>
                  </button>
                )}
                <button onClick={kapat} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: `linear-gradient(180deg, #f87171, #dc2626)`,
                  color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 4px 12px rgba(220,38,38,0.3)'
                }}>
                  <LIcon name="PhoneOff" size={14} color="#fff"/> KAPAT
                </button>
              </React.Fragment>
            )}
          </div>
        </div>
      )}

      {/* NUMARA GİRİŞ (AKTİF GÖRÜŞME YOKSA) */}
      {!aktif && kayitli && (
        <div style={{padding: 16}}>
          <div style={{display: 'flex', gap: 6, marginBottom: 10}}>
            <input
              value={numInput} onChange={e => setNumInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') aramaYap(); }}
              placeholder="NUMARA GİRİN..."
              style={{
                flex: 1, padding: '10px 12px', fontSize: 13, fontWeight: 700,
                background: isK ? '#0f172a' : '#f1f5f9',
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, outline: 'none', letterSpacing: 1
              }}
            />
            <button onClick={aramaYap} disabled={!numInput.trim()} style={{
              width: 42, height: 42, borderRadius: 8, border: 'none',
              background: numInput.trim() ? `linear-gradient(180deg, #34d399, #059669)` : `${C.textMuted}15`,
              cursor: numInput.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <LIcon name="Phone" size={18} color={numInput.trim() ? '#fff' : C.textMuted}/>
            </button>
          </div>

          {/* TUŞTAKIMI */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4}}>
            {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
              <button key={key} onClick={() => setNumInput(p => p + key)} style={{
                padding: '10px', borderRadius: 8, border: 'none',
                background: `${C.textMuted}10`, color: C.text,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                transition: 'all .1s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.accent}20`}
                onMouseLeave={e => e.currentTarget.style.background = `${C.textMuted}10`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* SİL BUTONU */}
          {numInput && (
            <div style={{display: 'flex', justifyContent: 'center', marginTop: 6}}>
              <button onClick={() => setNumInput(p => p.slice(0, -1))} style={{
                padding: '4px 16px', borderRadius: 6, border: 'none',
                background: `${C.textMuted}10`, color: C.textMuted,
                fontSize: 10, fontWeight: 700, cursor: 'pointer'
              }}>
                <LIcon name="Delete" size={14} color={C.textMuted}/> SİL
              </button>
            </div>
          )}
        </div>
      )}

      {/* KAYITLI DEĞİL MESAJI */}
      {!kayitli && (
        <div style={{padding: 16, textAlign: 'center'}}>
          <LIcon name="WifiOff" size={28} color={C.textMuted} style={{opacity: 0.5, marginBottom: 8}}/>
          <div style={{fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6}}>
            NETSANTRAL'E BAĞLI DEĞİL
          </div>
          <div style={{fontSize: 10, color: C.textMuted, lineHeight: 1.6}}>
            SİSTEM AYARLARINDAN NETSANTRAL BİLGİLERİNİZİ GİRDİĞİNİZDEN EMİN OLUN
          </div>
          {user && (
            <button onClick={() => MR.webrtcOtoBaslat(user)} style={{
              marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none',
              background: `${C.accent}22`, color: C.accent,
              fontSize: 10, fontWeight: 700, cursor: 'pointer'
            }}>
              <LIcon name="RefreshCw" size={12} color={C.accent}/> TEKRAR BAĞLAN
            </button>
          )}
        </div>
      )}

      {/* ALT BAR */}
      <div style={{
        padding: '8px 16px', borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 9, color: C.textMuted
      }}>
        <span>{MR._webrtcConfig ? 'DAHİLİ: ' + (MR._webrtcConfig.dahili || '-') : 'YAPILANDIRILMAMIŞ'}</span>
        <span style={{color: kayitli ? '#10b981' : C.danger}}>
          {kayitli ? 'KAYITLI' : 'KAYITSIZ'}
        </span>
      </div>
    </div>
  );
};

/* ═══ NETSIPP DURUM BİLEŞENİ (CRM YENİ KAYIT SAYFASI İÇİN) ═══ */
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
      background: kayitli ? `${C.success}12` : `${C.warning}12`,
      border: `1px solid ${kayitli ? C.success : C.warning}30`,
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

/* ═══ SES AYARLARI PANELİ (CRM YENİ KAYIT SAYFASI İÇİN) ═══ */
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

/* ═══ NETSANTRAL AYARLARI PANELİ (PROFİL SAYFASINDA GÖRÜNECEk) ═══ */
MR.NetsantralAyarlari = () => {
  const {C, S, LIcon, FormGroup} = MR;
  const def = MR._netsantralVarsayilan;
  const [wss, setWss] = useState(localStorage.getItem('mr_netsantral_wss') || def.wssUrl);
  const [domain, setDomain] = useState(localStorage.getItem('mr_netsantral_domain') || def.domain);
  const [dahili, setDahili] = useState(localStorage.getItem('mr_netsantral_dahili') || def.dahili);
  const [sipSifre, setSipSifre] = useState(localStorage.getItem('mr_netsantral_sip_sifre') || def.sipSifre);
  const [santralNo, setSantralNo] = useState(localStorage.getItem('mr_netsantral_no') || def.santralNo);
  const [kullanici, setKullanici] = useState(localStorage.getItem('mr_netsantral_kullanici') || def.kullanici);
  const [apiSifre, setApiSifre] = useState(localStorage.getItem('mr_netsantral_api_sifre') || '');
  const [kayitDurumu, setKayitDurumu] = useState('');
  const [bagli, setBagli] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setBagli(!!(e.detail && e.detail.kayitli));
    };
    window.addEventListener('mr-webrtc-durum', handler);
    if (MR.webrtcTelefon) setBagli(MR.webrtcTelefon._kayitli);
    return () => window.removeEventListener('mr-webrtc-durum', handler);
  }, []);

  const kaydet = () => {
    localStorage.setItem('mr_netsantral_wss', wss);
    localStorage.setItem('mr_netsantral_domain', domain);
    localStorage.setItem('mr_netsantral_dahili', dahili);
    localStorage.setItem('mr_netsantral_sip_sifre', sipSifre);
    localStorage.setItem('mr_netsantral_no', santralNo);
    localStorage.setItem('mr_netsantral_kullanici', kullanici);
    localStorage.setItem('mr_netsantral_api_sifre', apiSifre);
    setKayitDurumu('KAYDEDİLDİ');
    setTimeout(() => setKayitDurumu(''), 3000);
    MR.webrtcYenidenBaslat();
  };

  return (
    <div style={{...S.card, marginTop: 20}}>
      <div style={{...S.cardHead, justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <LIcon name="Phone" size={16} color={C.accent}/>
          <span style={{fontSize:14, fontWeight:700}}>NETSANTRAL / WEBRTC AYARLARI</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:6}}>
          <div style={{
            width:10, height:10, borderRadius:'50%',
            background: bagli ? C.success : C.danger,
            boxShadow: bagli ? `0 0 8px ${C.success}60` : 'none'
          }}/>
          <span style={{fontSize:10, fontWeight:700, color: bagli ? C.success : C.danger}}>
            {bagli ? 'BAĞLI' : 'BAĞLI DEĞİL'}
          </span>
        </div>
      </div>
      <div style={{padding:22}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
          <FormGroup label="WSS URL *">
            <input style={S.input} value={wss} onChange={e => setWss(e.target.value)} placeholder="wss://sip6.netsantral.com:8089/ws"/>
          </FormGroup>
          <FormGroup label="SIP DOMAIN">
            <input style={S.input} value={domain} onChange={e => setDomain(e.target.value)} placeholder="sip6.netsantral.com"/>
          </FormGroup>
          <FormGroup label="DAHİLİ NUMARA *">
            <input style={S.input} value={dahili} onChange={e => setDahili(e.target.value)} placeholder="102"/>
          </FormGroup>
          <FormGroup label="SIP ŞİFRESİ *">
            <input type="password" style={{...S.input, textTransform:'none'}} value={sipSifre} onChange={e => setSipSifre(e.target.value)} placeholder="SIP ŞİFRENİZ"/>
          </FormGroup>
          <FormGroup label="SANTRAL NO">
            <input style={S.input} value={santralNo} onChange={e => setSantralNo(e.target.value)} placeholder="3625026502"/>
          </FormGroup>
          <FormGroup label="KULLANICI ADI (TAM)">
            <input style={S.input} value={kullanici} onChange={e => setKullanici(e.target.value)} placeholder="102-3625026502"/>
          </FormGroup>
        </div>
        <div style={{marginTop:14, padding:14, borderRadius:10, background:`${C.accent}08`, border:`1px solid ${C.accent}20`}}>
          <div style={{fontSize:11, fontWeight:700, color:C.accent, marginBottom:10}}>
            <LIcon name="Key" size={12} color={C.accent}/> NETSANTRAL API (ÇAĞRI BAŞLATMA)
          </div>
          <div style={{fontSize:10, color:C.textSec, marginBottom:10, lineHeight:1.6}}>
            CRM ÜZERİNDEN ARAMA YAPMAK İÇİN NETGSM API ŞİFRENİZİ GİRİN.
            BU ŞİFRE SIP ŞİFRESİNDEN FARKLIDIR - NETGSM PANELİNDEN ALT KULLANICI API ŞİFRESİ.
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr', gap:10}}>
            <FormGroup label="API ŞİFRESİ *">
              <input type="password" style={{...S.input, textTransform:'none'}} value={apiSifre} onChange={e => setApiSifre(e.target.value)} placeholder="NETGSM API ŞİFRENİZ"/>
            </FormGroup>
          </div>
        </div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16}}>
          <button onClick={kaydet} style={{...S.btn, ...S.btnP}}>
            <LIcon name="Save" size={14} color="#fff"/> KAYDET & BAĞLAN
          </button>
          {kayitDurumu && (
            <span style={{fontSize:11, fontWeight:700, color:C.success}}>
              <LIcon name="CheckCircle" size={14} color={C.success}/> {kayitDurumu}
            </span>
          )}
        </div>
        <div style={{
          marginTop:14, padding:12, borderRadius:10,
          background:`${C.accent}08`, border:`1px solid ${C.accent}15`,
          fontSize:10, color:C.textSec, lineHeight:1.8
        }}>
          <div style={{fontWeight:700, color:C.accent, marginBottom:4}}>
            <LIcon name="Info" size={12} color={C.accent}/> BAĞLANTI BİLGİLERİ
          </div>
          <div>WSS URL: NETSANTRAL PANELİNDEN ALINIR (WSS://...)</div>
          <div>DAHİLİ: NETSIPP UYGULAMASINDA KULLANDIĞINIZ DAHİLİ NUMARA</div>
          <div>SIP ŞİFRESİ: NETSANTRAL PANELİNDEN ALINAN SIP/WEBRTC ŞİFRESİ</div>
          <div>SANTRAL NO: 10 HANELİ MÜŞTERİ SANTRAL NUMARASI</div>
          <div>API ŞİFRESİ: NETGSM ALT KULLANICI API ŞİFRESİ (ARAMA BAŞLATMAK İÇİN)</div>
          <div style={{marginTop:6, fontWeight:700, color:C.warning}}>
            <LIcon name="AlertTriangle" size={12} color={C.warning}/> ÖNEMLİ: DAHİLİ BAĞLANTI TİPİ NETSANTRAL PANELİNDE "WSS" OLMALI (UDP DEĞİL)
          </div>
        </div>
      </div>
    </div>
  );
};
