/**
 * MR HASAR DANISMANLIK - WEBRTC SOFTPHONE WIDGET v1.0
 * FLOATING TELEFON ARAYUZU - TUM SAYFALARDA GORUNUR
 * GELEN CAGRI POPUP + GIDEN ARAMA + SURE SAYACI + MUSTERI ESLESTIRME
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef, useMemo} = React;

/* ═══ NETSANTRAL YAPILANDIRMA ═══ */
MR._webrtcConfig = null;
MR._webrtcBaslatildi = false;

/* ═══ WEBRTC OTOMATİK BAŞLATMA ═══ */
MR.webrtcOtoBaslat = async (user) => {
  if (MR._webrtcBaslatildi || !MR.webrtcTelefon) return;
  if (!user) return;

  /* NETSANTRAL AYARLARINI LOCALSTORAGEDAN VEYA AYARLARDAN YÜKLE */
  var config = MR._webrtcConfig;
  if (!config) {
    /* ÖNCE KULLANICI BİLGİLERİNDE ARA */
    var dahili = user.netsantral_dahili || user.dahili || localStorage.getItem('mr_netsantral_dahili') || '';
    var sipSifre = user.netsantral_sip_sifre || user.sip_sifre || localStorage.getItem('mr_netsantral_sip_sifre') || '';
    var wssUrl = user.netsantral_wss || localStorage.getItem('mr_netsantral_wss') || '';
    var domain = user.netsantral_domain || localStorage.getItem('mr_netsantral_domain') || '';
    var santralNo = user.netsantral_no || user.santral_no || localStorage.getItem('mr_netsantral_no') || '';
    var kullanici = user.netsantral_kullanici || localStorage.getItem('mr_netsantral_kullanici') || '';

    /* AYARLAR API'DEN YÜKLE */
    if (!dahili || !sipSifre || !wssUrl) {
      try {
        var r = await MR.api.ayarlarList();
        if (r && r.success && r.data) {
          dahili = dahili || r.data.netsantral_dahili || '';
          sipSifre = sipSifre || r.data.netsantral_sip_sifre || '';
          wssUrl = wssUrl || r.data.netsantral_wss || '';
          domain = domain || r.data.netsantral_domain || '';
          santralNo = santralNo || r.data.netsantral_no || '';
          kullanici = kullanici || r.data.netsantral_kullanici || '';
        }
      } catch(e) {
        console.log('[WEBRTC-WIDGET] AYARLAR YÜKLENEMEDI:', e);
      }
    }

    if (!dahili || !sipSifre || !wssUrl) {
      console.log('[WEBRTC-WIDGET] NETSANTRAL AYARLARI EKSİK - DAHİLİ:', !!dahili, '| SIP:', !!sipSifre, '| WSS:', !!wssUrl);
      return;
    }

    config = {
      wssUrl: wssUrl,
      domain: domain || wssUrl.replace('wss://', '').replace(/:\d+.*/, '').replace(/\/.*/, ''),
      dahili: dahili,
      sipSifre: sipSifre,
      santralNo: santralNo,
      kullanici: kullanici
    };
    MR._webrtcConfig = config;
  }

  console.log('[WEBRTC-WIDGET] BAŞLATILIYOR - DAHİLİ:', config.dahili);
  MR._webrtcBaslatildi = true;
  MR.webrtcTelefon.baslat(config);
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
        case 'caliyor':
          setAramaDurumu(d.durum === 'araniyor' ? 'araniyor' : 'caliyor');
          if (d.detay && typeof d.detay === 'string') setKarsiTaraf(d.detay);
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
    /* İLK DURUM */
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
