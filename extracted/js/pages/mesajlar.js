/**
 * MR HASAR DANIŞMANLIK - MESAJLAR SAYFASI
 * GELEN KUTUSU, GİDEN KUTUSU, YENİ MESAJ, SİSTEM BİLDİRİMLERİ
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useMemo, useCallback} = React;

// ═══ ZAMAN FORMATLAMA ═══
function mesajZamanOnce(tarih) {
  if (!tarih) return '-';
  const fark = Date.now() - new Date(tarih).getTime();
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return 'AZ ÖNCE';
  if (dk < 60) return dk + ' DAKİKA ÖNCE';
  const saat = Math.floor(dk / 60);
  if (saat < 24) return saat + ' SAAT ÖNCE';
  const gun = Math.floor(saat / 24);
  if (gun < 7) return gun + ' GÜN ÖNCE';
  if (gun < 30) return Math.floor(gun / 7) + ' HAFTA ÖNCE';
  return new Date(tarih).toLocaleDateString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric'});
}

function mesajTarihFormat(tarih) {
  if (!tarih) return '-';
  return new Date(tarih).toLocaleString('tr-TR', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

function mesajGunGrup(tarih) {
  if (!tarih) return 'BİLİNMEYEN TARİH';
  const d = new Date(tarih);
  const bugun = new Date();
  const dun = new Date(); dun.setDate(dun.getDate() - 1);
  if (d.toDateString() === bugun.toDateString()) return 'BUGÜN';
  if (d.toDateString() === dun.toDateString()) return 'DÜN';
  return d.toLocaleDateString('tr-TR', {day:'2-digit', month:'long', year:'numeric'}).toUpperCase();
}

MR.MesajlarPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, Confirm, api} = MR;

  // ═══ AKTİF SEKME (subPage ROUTING) ═══
  const aktifSekme = subPage || 'gelen';

  // ═══ SEKME TANIMLARI ═══
  const sekmeler = [
    {key:'gelen', label:'GELEN KUTUSU', icon:'Inbox'},
    {key:'giden', label:'GİDEN KUTUSU', icon:'Send'},
    {key:'yeni', label:'YENİ MESAJ', icon:'PenSquare'},
    {key:'sistem', label:'SİSTEM BİLDİRİMLERİ', icon:'Bell'}
  ];

  // ═══ GENEL STATE ═══
  const [loading, setLoading] = useState(true);
  const [silOnay, setSilOnay] = useState(null);
  const [silTur, setSilTur] = useState('mesaj'); // 'mesaj' veya 'bildirim'
  const [error, setError] = useState('');
  const [basariMesaji, setBasariMesaji] = useState('');

  // ═══ GELEN KUTUSU STATE ═══
  const [gelenMesajlar, setGelenMesajlar] = useState([]);
  const [gelenArama, setGelenArama] = useState('');
  const [sadeceOkunmamis, setSadeceOkunmamis] = useState(false);
  const [detayModal, setDetayModal] = useState(null);
  const [detayYon, setDetayYon] = useState('gelen');

  // ═══ GİDEN KUTUSU STATE ═══
  const [gidenMesajlar, setGidenMesajlar] = useState([]);
  const [gidenArama, setGidenArama] = useState('');

  // ═══ YENİ MESAJ STATE ═══
  const [kullanicilar, setKullanicilar] = useState([]);
  const bosForm = {alici_id:'', konu:'', icerik:'', oncelik:'normal'};
  const [form, setForm] = useState({...bosForm});
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // ═══ SİSTEM BİLDİRİMLERİ STATE ═══
  const [bildirimler, setBildirimler] = useState([]);

  // ═══ TOPLU SİLME STATE (ADMIN) ═══
  const [secililer, setSecililer] = useState([]);
  const [topluSilConfirm, setTopluSilConfirm] = useState(false);
  const [topluSilLoading, setTopluSilLoading] = useState(false);

  const isAdmin = user?.rol === 'admin' || user?.rol === 'yonetici';

  // ═══ FORM GÜNCELLE ═══
  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  // ═══ BAŞARI MESAJINI OTOMATİK GİZLE ═══
  useEffect(() => {
    if (basariMesaji) {
      const t = setTimeout(() => setBasariMesaji(''), 4000);
      return () => clearTimeout(t);
    }
  }, [basariMesaji]);

  // ═══ VERİ YÜKLEME FONKSİYONLARI ═══
  const gelenYukle = useCallback(async () => {
    const p = {limit: 500};
    if (sadeceOkunmamis) p.okunmamis = 1;
    if (gelenArama.trim()) p.arama = gelenArama.trim();
    const r = await api.mesajList(p);
    if (r?.success) {
      setGelenMesajlar(r.data?.items || r.data || []);
    }
  }, [sadeceOkunmamis, gelenArama]);

  const gidenYukle = useCallback(async () => {
    const p = {limit: 500};
    if (gidenArama.trim()) p.arama = gidenArama.trim();
    const r = await api.mesajGiden(p);
    if (r?.success) {
      setGidenMesajlar(r.data?.items || r.data || []);
    }
  }, [gidenArama]);

  const bildirimYukle = useCallback(async () => {
    const p = {limit: 500};
    const r = await api.bildirimList(p);
    if (r?.success) {
      setBildirimler(r.data?.items || r.data || []);
    }
  }, []);

  const kullaniciYukle = useCallback(async () => {
    const r = await api.kullaniciList({limit: 200});
    if (r?.success) {
      setKullanicilar(r.data?.items || r.data || []);
    }
  }, []);

  // ═══ İLK YÜKLEME ═══
  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([gelenYukle(), gidenYukle(), bildirimYukle(), kullaniciYukle()]);
      setLoading(false);
    })();
  }, []);

  // ═══ SEKME DEĞİŞTİĞİNDE YENİDEN YÜKLE ═══
  useEffect(() => {
    setSecililer([]);
    if (aktifSekme === 'gelen') gelenYukle();
    else if (aktifSekme === 'giden') gidenYukle();
    else if (aktifSekme === 'sistem') bildirimYukle();
  }, [aktifSekme]);

  // ═══ GELEN FİLTRE DEĞİŞTİĞİNDE YÜKLE ═══
  useEffect(() => {
    if (aktifSekme === 'gelen') gelenYukle();
  }, [sadeceOkunmamis, gelenArama]);

  // ═══ ÖNCELİK RENK VE LABEL ═══
  const oncelikRenk = (o) => {
    if (o === 'yuksek') return C.warning;
    if (o === 'acil') return C.danger;
    return C.textSec;
  };

  const oncelikLabel = (o) => {
    if (o === 'yuksek') return 'YÜKSEK';
    if (o === 'acil') return 'ACİL';
    return 'NORMAL';
  };

  // ═══ BİLDİRİM TÜR İKON VE RENK ═══
  const bildirimTurBilgi = (tur) => {
    if (tur === 'info') return {icon:'Info', color:C.accent, label:'BİLGİ'};
    if (tur === 'uyari') return {icon:'AlertTriangle', color:C.warning, label:'UYARI'};
    if (tur === 'hata') return {icon:'XCircle', color:C.danger, label:'HATA'};
    if (tur === 'basari') return {icon:'CheckCircle', color:C.success, label:'BAŞARI'};
    return {icon:'Bell', color:C.accent, label:'BİLGİ'};
  };

  // ═══ AVATAR RENK ═══
  const avatarRenk = (isim) => {
    const renkler = [C.accent, C.success, C.warning, C.danger, C.purple, C.cyan, C.pink, C.gold];
    if (!isim) return renkler[0];
    let hash = 0;
    for (let i = 0; i < isim.length; i++) hash = isim.charCodeAt(i) + ((hash << 5) - hash);
    return renkler[Math.abs(hash) % renkler.length];
  };

  // ═══ İSTATİSTİKLER ═══
  const gelenToplam = gelenMesajlar.length;
  const gelenOkunmamis = gelenMesajlar.filter(m => !m.okundu).length;
  const gelenYuksek = gelenMesajlar.filter(m => m.oncelik === 'yuksek' && !m.okundu).length;
  const gelenAcil = gelenMesajlar.filter(m => m.oncelik === 'acil' && !m.okundu).length;
  const bildirimOkunmamis = bildirimler.filter(b => !b.okundu).length;

  // ═══ FİLTRELENMİŞ GELEN MESAJLAR ═══
  const filtrelenmisGelen = useMemo(() => {
    return gelenMesajlar.filter(m => {
      if (sadeceOkunmamis && m.okundu) return false;
      if (gelenArama.trim()) {
        const ara = gelenArama.toLowerCase();
        const konuUygun = (m.konu || '').toLowerCase().includes(ara);
        const gonderenUygun = (m.gonderen_adi || '').toLowerCase().includes(ara);
        if (!konuUygun && !gonderenUygun) return false;
      }
      return true;
    });
  }, [gelenMesajlar, sadeceOkunmamis, gelenArama]);

  // ═══ FİLTRELENMİŞ GİDEN MESAJLAR ═══
  const filtrelenmisGiden = useMemo(() => {
    return gidenMesajlar.filter(m => {
      if (gidenArama.trim()) {
        const ara = gidenArama.toLowerCase();
        const konuUygun = (m.konu || '').toLowerCase().includes(ara);
        const aliciUygun = (m.alici_adi || '').toLowerCase().includes(ara);
        if (!konuUygun && !aliciUygun) return false;
      }
      return true;
    });
  }, [gidenMesajlar, gidenArama]);

  // ═══ BİLDİRİMLERİ TARİHE GÖRE GRUPLA ═══
  const grupluBildirimler = useMemo(() => {
    const gruplar = {};
    bildirimler.forEach(b => {
      const gun = mesajGunGrup(b.created_at);
      if (!gruplar[gun]) gruplar[gun] = [];
      gruplar[gun].push(b);
    });
    return gruplar;
  }, [bildirimler]);

  // ═══ MESAJ DETAY AÇ ═══
  const mesajDetayAc = async (mesaj, yon) => {
    // DETAY YÜKLE
    const r = await api.mesajGet(mesaj.id);
    const detay = r?.success ? (r.data || mesaj) : mesaj;
    setDetayYon(yon);
    setDetayModal(detay);
    // OKUNDU İŞARETLE (GELEN MESAJLARDA)
    if (!mesaj.okundu && yon === 'gelen') {
      await api.mesajOku({id: mesaj.id});
      setGelenMesajlar(prev => prev.map(m => m.id === mesaj.id ? {...m, okundu: 1} : m));
    }
  };

  // ═══ TÜMÜNÜ OKUNDU İŞARETLE ═══
  const tumunuOkunduIsaretle = async () => {
    const r = await api.mesajOku({tumu: true});
    if (r?.success) {
      gelenYukle();
      setBasariMesaji('TÜM MESAJLAR OKUNDU OLARAK İŞARETLENDİ');
    }
  };

  // ═══ MESAJ SİL ═══
  const mesajSil = async () => {
    if (!silOnay) return;
    if (silTur === 'bildirim') {
      const r = await api.bildirimDelete(silOnay.id);
      if (r?.success) {
        setSilOnay(null);
        bildirimYukle();
        setBasariMesaji('BİLDİRİM SİLİNDİ');
      }
    } else {
      const r = await api.mesajDelete(silOnay.id);
      if (r?.success) {
        setSilOnay(null);
        setDetayModal(null);
        gelenYukle();
        gidenYukle();
        setBasariMesaji('MESAJ BAŞARIYLA SİLİNDİ');
      }
    }
  };

  // ═══ YENİ MESAJ GÖNDER ═══
  const mesajGonder = async () => {
    if (!form.alici_id) { setError('ALICI SEÇİNİZ'); return; }
    if (!form.konu.trim()) { setError('KONU GİRİNİZ'); return; }
    if (!form.icerik.trim()) { setError('MESAJ İÇERİĞİ GİRİNİZ'); return; }
    setGonderiliyor(true); setError('');
    const veri = {
      alici_id: parseInt(form.alici_id),
      konu: form.konu.trim(),
      icerik: form.icerik.trim(),
      oncelik: form.oncelik
    };
    const r = await api.mesajCreate(veri);
    if (r?.success) {
      setForm({...bosForm});
      setBasariMesaji('MESAJ BAŞARIYLA GÖNDERİLDİ');
      gidenYukle();
      setTimeout(() => setPage('mesajlar-giden'), 500);
    } else {
      setError(r?.error || 'MESAJ GÖNDERİLEMEDİ');
    }
    setGonderiliyor(false);
  };

  // ═══ YANITLA ═══
  const yanitla = (mesaj) => {
    setDetayModal(null);
    setForm({
      alici_id: String(mesaj.gonderen_id || ''),
      konu: (mesaj.konu || '').startsWith('YNT: ') ? mesaj.konu : 'YNT: ' + (mesaj.konu || ''),
      icerik: '\n\n--- ORİJİNAL MESAJ ---\n' + (mesaj.icerik || ''),
      oncelik: mesaj.oncelik || 'normal'
    });
    setPage('mesajlar-yeni');
  };

  // ═══ İLET ═══
  const ilet = (mesaj) => {
    setDetayModal(null);
    setForm({
      alici_id: '',
      konu: 'İLT: ' + (mesaj.konu || ''),
      icerik: '\n\n--- İLETİLEN MESAJ ---\nGÖNDEREN: ' + (mesaj.gonderen_adi || '') + '\nTARİH: ' + mesajTarihFormat(mesaj.created_at) + '\n\n' + (mesaj.icerik || ''),
      oncelik: mesaj.oncelik || 'normal'
    });
    setPage('mesajlar-yeni');
  };

  // ═══ BİLDİRİM OKUNDU İŞARETLE ═══
  const bildirimOkunduIsaretle = async (bildirim) => {
    if (bildirim.okundu) return;
    const r = await api.bildirimOku({id: bildirim.id});
    if (r?.success) bildirimYukle();
  };

  // ═══ TÜMÜNÜ OKUNDU İŞARETLE (BİLDİRİMLER) ═══
  const bildirimTumunuOku = async () => {
    const r = await api.bildirimOku({tumu: true});
    if (r?.success) {
      bildirimYukle();
      setBasariMesaji('TÜM BİLDİRİMLER OKUNDU OLARAK İŞARETLENDİ');
    }
  };

  // ═══ TOPLU SİLME FONKSİYONLARI (ADMIN) ═══
  const toggleSecim = (id) => {
    setSecililer(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const tumunuSec = (liste) => {
    const tumIds = liste.map(m => m.id);
    const hepsiSecili = tumIds.length > 0 && tumIds.every(id => secililer.includes(id));
    if (hepsiSecili) {
      setSecililer(prev => prev.filter(id => !tumIds.includes(id)));
    } else {
      setSecililer(prev => [...new Set([...prev, ...tumIds])]);
    }
  };

  const topluSil = async () => {
    if (secililer.length === 0) return;
    setTopluSilLoading(true);
    try {
      const r = await api.mesajBulkDelete(secililer);
      if (r?.success) {
        setSecililer([]);
        setTopluSilConfirm(false);
        await Promise.all([gelenYukle(), gidenYukle()]);
        setBasariMesaji(secililer.length + ' MESAJ BAŞARIYLA SİLİNDİ');
      } else {
        setError(r?.error || 'TOPLU SİLME İŞLEMİ BAŞARISIZ');
        setTopluSilConfirm(false);
      }
    } catch (err) {
      setError('TOPLU SİLME İŞLEMİ SIRASINDA HATA OLUŞTU');
      setTopluSilConfirm(false);
    }
    setTopluSilLoading(false);
  };

  if (loading) return <Loading/>;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="fade-in">
      {/* ═══ BAŞARI MESAJI ═══ */}
      {basariMesaji && (
        <div style={{
          padding:'12px 20px', marginBottom:16, borderRadius:10,
          background:`${C.success}18`, border:`1px solid ${C.success}44`,
          display:'flex', alignItems:'center', gap:10
        }}>
          <LIcon name="CheckCircle" size={16} color={C.success}/>
          <span style={{fontSize:12,fontWeight:600,color:C.success}}>{basariMesaji}</span>
        </div>
      )}

      {/* ═══ İSTATİSTİK KARTLARI ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <StatCard icon="Inbox" label="TOPLAM MESAJ" value={gelenToplam} color={C.accent}/>
        <StatCard icon="MailWarning" label="OKUNMAMIŞ" value={gelenOkunmamis} color={C.warning}/>
        <StatCard icon="AlertTriangle" label="YÜKSEK ÖNCELİK" value={gelenYuksek} color={C.gold}/>
        <StatCard icon="Zap" label="ACİL MESAJ" value={gelenAcil} color={C.danger}/>
        <StatCard icon="Bell" label="BİLDİRİM" value={bildirimOkunmamis} color={C.purple}/>
      </div>

      {/* ═══ SEKME ÇUBUĞU ═══ */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          const sayi = s.key === 'gelen' ? gelenOkunmamis : s.key === 'sistem' ? bildirimOkunmamis : 0;
          return (
            <div key={s.key} onClick={() => { setPage('mesajlar-' + s.key); setError(''); }}
              style={{
                flex:1, padding:'12px 8px', borderRadius:8, cursor:'pointer', textAlign:'center',
                background: aktif ? `${C.accent}22` : 'transparent',
                border: `1px solid ${aktif ? C.accent + '44' : 'transparent'}`,
                transition:'all .2s',
                position:'relative'
              }}
              onMouseEnter={e => { if(!aktif) e.currentTarget.style.background = C.bgHover; }}
              onMouseLeave={e => { if(!aktif) e.currentTarget.style.background = 'transparent'; }}>
              <LIcon name={s.icon} size={16} color={aktif ? C.accent : C.textMuted} style={{marginBottom:4}}/>
              <div style={{fontSize:11,fontWeight:aktif?700:500,color:aktif?C.accent:C.textSec,marginTop:4,letterSpacing:0.5}}>
                {s.label}
              </div>
              {sayi > 0 && (
                <div style={{
                  position:'absolute', top:4, right:8,
                  minWidth:18, height:18, borderRadius:9, padding:'0 5px',
                  background:C.danger, color:'#fff',
                  fontSize:9, fontWeight:800,
                  display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                  {sayi}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         SEKME 1: GELEN KUTUSU
         ═══════════════════════════════════════════════════════════ */}
      {aktifSekme === 'gelen' && (
        <div style={S.card}>
          <SectionTitle icon="Inbox" title="GELEN KUTUSU"
            sub={gelenToplam + ' MESAJ, ' + gelenOkunmamis + ' OKUNMAMIŞ'}
            right={
              <div style={{display:'flex',gap:6}}>
                {gelenOkunmamis > 0 && (
                  <button style={{...S.btn,...S.btnW,fontSize:10,padding:'8px 12px'}} onClick={tumunuOkunduIsaretle}>
                    <LIcon name="CheckCheck" size={14} color="#000"/> TÜMÜNÜ OKUNDU İŞARETLE
                  </button>
                )}
                <button style={{...S.btn,...S.btnP,fontSize:10,padding:'8px 12px'}}
                  onClick={() => setPage('mesajlar-yeni')}>
                  <LIcon name="PenSquare" size={14} color="#fff"/> YENİ MESAJ
                </button>
              </div>
            }
          />

          {/* ═══ FİLTRE ÇUBUĞU ═══ */}
          <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            {/* ARAMA */}
            <div style={{flex:1,minWidth:200,position:'relative'}}>
              <LIcon name="Search" size={14} color={C.textMuted} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
              <input
                style={{...S.input,paddingLeft:36,fontSize:12}}
                placeholder="MESAJ ARA (KONU, GÖNDEREN)..."
                value={gelenArama}
                onChange={e => setGelenArama(e.target.value)}
              />
            </div>
            {/* OKUNMAMIŞ TOGGLE */}
            <div
              onClick={() => setSadeceOkunmamis(!sadeceOkunmamis)}
              style={{
                display:'flex', alignItems:'center', gap:8, padding:'8px 16px',
                borderRadius:8, cursor:'pointer',
                background: sadeceOkunmamis ? `${C.warning}22` : 'transparent',
                border: `1px solid ${sadeceOkunmamis ? C.warning + '44' : C.border}`,
                transition:'all .2s'
              }}>
              <div style={{
                width:18, height:18, borderRadius:4,
                border: sadeceOkunmamis ? `2px solid ${C.warning}` : `2px solid ${C.borderLight}`,
                background: sadeceOkunmamis ? C.warning : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                {sadeceOkunmamis && <LIcon name="Check" size={12} color="#000"/>}
              </div>
              <span style={{fontSize:11,fontWeight:600,color:sadeceOkunmamis?C.warning:C.textSec}}>
                SADECE OKUNMAMIŞ ({gelenOkunmamis})
              </span>
            </div>
          </div>

          {/* ═══ GELEN MESAJ TABLOSU ═══ */}
          {filtrelenmisGelen.length === 0 ? (
            <EmptyState icon="Inbox" title="MESAJ BULUNAMADI"
              desc={sadeceOkunmamis ? 'TÜM MESAJLAR OKUNMUŞ DURUMDA' : gelenArama ? '"' + gelenArama.toUpperCase() + '" İÇİN SONUÇ BULUNAMADI' : 'GELEN KUTUNUZDA HENÜZ MESAJ BULUNMUYOR'}/>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:750}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['','GÖNDEREN','KONU','ÖNCELİK','TARİH','DURUM'].map(h =>
                      <th key={h||'dot'} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`,letterSpacing:0.5}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtrelenmisGelen.map((m, i) => {
                    const okunmadi = !m.okundu;
                    const gRenk = avatarRenk(m.gonderen_adi);
                    return (
                      <tr key={m.id || i}
                        onClick={() => mesajDetayAc(m, 'gelen')}
                        style={{
                          borderBottom:`1px solid ${C.border}`,
                          borderLeft: okunmadi ? `3px solid ${C.accent}` : '3px solid transparent',
                          cursor:'pointer',
                          background: okunmadi ? `${C.accent}06` : 'transparent',
                          transition:'all .15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${C.accent}11`}
                        onMouseLeave={e => e.currentTarget.style.background = okunmadi ? `${C.accent}06` : 'transparent'}>
                        {/* OKUNMADI NOKTASI */}
                        <td style={{padding:'12px 8px',width:24,textAlign:'center'}}>
                          {okunmadi && (
                            <div style={{width:8,height:8,borderRadius:'50%',background:C.accent,margin:'0 auto'}}/>
                          )}
                        </td>
                        {/* GÖNDEREN */}
                        <td style={{padding:'12px',fontWeight:okunmadi?700:500,color:okunmadi?C.text:C.textSec,fontSize:12}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{
                              width:30,height:30,borderRadius:'50%',flexShrink:0,
                              background:`${gRenk}22`,border:`1.5px solid ${gRenk}44`,
                              display:'flex',alignItems:'center',justifyContent:'center',
                              fontSize:12,fontWeight:800,color:gRenk
                            }}>
                              {(m.gonderen_adi || 'B').charAt(0).toUpperCase()}
                            </div>
                            <span>{m.gonderen_adi || 'BİLİNMEYEN'}</span>
                          </div>
                        </td>
                        {/* KONU */}
                        <td style={{padding:'12px'}}>
                          <div style={{fontWeight:okunmadi?700:500,color:okunmadi?C.text:C.textSec,fontSize:12}}>
                            {m.konu || '(KONU YOK)'}
                          </div>
                          {m.icerik && (
                            <div style={{fontSize:10,color:C.textMuted,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:320}}>
                              {m.icerik.substring(0, 80)}{m.icerik.length > 80 ? '...' : ''}
                            </div>
                          )}
                        </td>
                        {/* ÖNCELİK */}
                        <td style={{padding:'12px'}}>
                          <Badge text={oncelikLabel(m.oncelik)} color={oncelikRenk(m.oncelik)}/>
                        </td>
                        {/* TARİH */}
                        <td style={{padding:'12px',fontSize:10,color:C.textMuted,whiteSpace:'nowrap'}}>
                          <div>{mesajZamanOnce(m.created_at)}</div>
                          <div style={{fontSize:9,marginTop:2}}>{mesajTarihFormat(m.created_at)}</div>
                        </td>
                        {/* DURUM */}
                        <td style={{padding:'12px'}}>
                          <Badge text={okunmadi ? 'OKUNMADI' : 'OKUNDU'} color={okunmadi ? C.warning : C.success}/>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* SONUÇ SAYISI */}
          {filtrelenmisGelen.length > 0 && (
            <div style={{padding:'10px 20px',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:10,color:C.textMuted}}>
                TOPLAM {filtrelenmisGelen.length} MESAJ GÖSTERİLİYOR
              </span>
              <span style={{fontSize:10,color:C.textMuted}}>
                {gelenOkunmamis} OKUNMAMIŞ
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         SEKME 2: GİDEN KUTUSU
         ═══════════════════════════════════════════════════════════ */}
      {aktifSekme === 'giden' && (
        <div style={S.card}>
          <SectionTitle icon="Send" title="GİDEN KUTUSU"
            sub={gidenMesajlar.length + ' GÖNDERİLEN MESAJ'}
            right={
              <button style={{...S.btn,...S.btnP,fontSize:10,padding:'8px 12px'}}
                onClick={() => setPage('mesajlar-yeni')}>
                <LIcon name="PenSquare" size={14} color="#fff"/> YENİ MESAJ
              </button>
            }
          />

          {/* ═══ ARAMA ═══ */}
          <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`}}>
            <div style={{maxWidth:400,position:'relative'}}>
              <LIcon name="Search" size={14} color={C.textMuted} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
              <input
                style={{...S.input,paddingLeft:36,fontSize:12}}
                placeholder="GÖNDERİLEN MESAJLARDA ARA..."
                value={gidenArama}
                onChange={e => setGidenArama(e.target.value)}
              />
            </div>
          </div>

          {/* ═══ GİDEN MESAJ TABLOSU ═══ */}
          {filtrelenmisGiden.length === 0 ? (
            <EmptyState icon="Send" title="GÖNDERİLEN MESAJ YOK"
              desc={gidenArama ? 'ARAMA KRİTERLERİNE UYGUN MESAJ BULUNAMADI' : 'HENÜZ MESAJ GÖNDERMEDİNİZ'}/>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:750}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['ALICI','KONU','ÖNCELİK','TARİH','OKUNDU','İŞLEM'].map(h =>
                      <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`,letterSpacing:0.5}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtrelenmisGiden.map((m, i) => {
                    const aRenk = avatarRenk(m.alici_adi);
                    return (
                      <tr key={m.id || i}
                        onClick={() => mesajDetayAc(m, 'giden')}
                        style={{borderBottom:`1px solid ${C.border}`,cursor:'pointer',transition:'all .15s'}}
                        onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {/* ALICI */}
                        <td style={{padding:'12px',fontSize:12}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{
                              width:30,height:30,borderRadius:'50%',flexShrink:0,
                              background:`${aRenk}22`,border:`1.5px solid ${aRenk}44`,
                              display:'flex',alignItems:'center',justifyContent:'center',
                              fontSize:12,fontWeight:800,color:aRenk
                            }}>
                              {(m.alici_adi || 'B').charAt(0).toUpperCase()}
                            </div>
                            <span style={{fontWeight:600}}>{m.alici_adi || 'BİLİNMEYEN'}</span>
                          </div>
                        </td>
                        {/* KONU */}
                        <td style={{padding:'12px'}}>
                          <div style={{fontWeight:600,color:C.text,fontSize:12}}>{m.konu || '(KONU YOK)'}</div>
                          {m.icerik && (
                            <div style={{fontSize:10,color:C.textMuted,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:320}}>
                              {m.icerik.substring(0, 80)}{m.icerik.length > 80 ? '...' : ''}
                            </div>
                          )}
                        </td>
                        {/* ÖNCELİK */}
                        <td style={{padding:'12px'}}>
                          <Badge text={oncelikLabel(m.oncelik)} color={oncelikRenk(m.oncelik)}/>
                        </td>
                        {/* TARİH */}
                        <td style={{padding:'12px',fontSize:10,color:C.textMuted,whiteSpace:'nowrap'}}>
                          <div>{mesajZamanOnce(m.created_at)}</div>
                          <div style={{fontSize:9,marginTop:2}}>{mesajTarihFormat(m.created_at)}</div>
                        </td>
                        {/* OKUNDU DURUMU */}
                        <td style={{padding:'12px'}}>
                          {m.okundu ? (
                            <div>
                              <Badge text="OKUNDU" color={C.success}/>
                              {m.okunma_tarihi && (
                                <div style={{fontSize:9,color:C.textMuted,marginTop:4}}>{mesajTarihFormat(m.okunma_tarihi)}</div>
                              )}
                            </div>
                          ) : (
                            <Badge text="OKUNMADI" color={C.textMuted}/>
                          )}
                        </td>
                        {/* İŞLEM */}
                        <td style={{padding:'12px'}} onClick={e => e.stopPropagation()}>
                          <button style={{...S.btn,...S.btnD,fontSize:9,padding:'5px 10px'}}
                            onClick={() => { setSilTur('mesaj'); setSilOnay(m); }}>
                            <LIcon name="Trash2" size={10} color="#fff"/> SİL
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* SONUÇ SAYISI */}
          {filtrelenmisGiden.length > 0 && (
            <div style={{padding:'10px 20px',borderTop:`1px solid ${C.border}`}}>
              <span style={{fontSize:10,color:C.textMuted}}>
                TOPLAM {filtrelenmisGiden.length} GÖNDERİLEN MESAJ
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         SEKME 3: YENİ MESAJ
         ═══════════════════════════════════════════════════════════ */}
      {aktifSekme === 'yeni' && (
        <div style={S.card}>
          <SectionTitle icon="PenSquare" title="YENİ MESAJ OLUŞTUR"
            sub="KULLANICIYA MESAJ GÖNDERMEK İÇİN FORMU DOLDURUNUZ"/>
          <div style={S.cardBody}>
            {/* HATA MESAJI */}
            {error && (
              <div style={{
                padding:'12px 16px', marginBottom:16, borderRadius:8,
                background:`${C.danger}22`, border:`1px solid ${C.danger}44`,
                display:'flex', alignItems:'center', gap:10
              }}>
                <LIcon name="AlertCircle" size={16} color={C.danger}/>
                <span style={{fontSize:12,fontWeight:600,color:C.danger}}>{error}</span>
              </div>
            )}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,maxWidth:800}}>
              {/* ALICI */}
              <FormGroup label="ALICI *">
                <select style={S.select} value={form.alici_id} onChange={e => up('alici_id', e.target.value)}>
                  <option value="">ALICI SEÇİNİZ</option>
                  {kullanicilar.filter(k => k.id !== user?.id).map(k => (
                    <option key={k.id} value={k.id}>{k.ad_soyad || k.email}</option>
                  ))}
                </select>
              </FormGroup>

              {/* ÖNCELİK */}
              <FormGroup label="ÖNCELİK">
                <select style={S.select} value={form.oncelik} onChange={e => up('oncelik', e.target.value)}>
                  <option value="normal">NORMAL</option>
                  <option value="yuksek">YÜKSEK</option>
                  <option value="acil">ACİL</option>
                </select>
              </FormGroup>

              {/* KONU */}
              <FormGroup label="KONU *" full>
                <input style={S.input} value={form.konu}
                  onChange={e => up('konu', e.target.value)}
                  placeholder="MESAJ KONUSU"
                  maxLength={200}
                />
                <div style={{fontSize:9,color:C.textMuted,marginTop:4,textAlign:'right'}}>
                  {form.konu.length}/200 KARAKTER
                </div>
              </FormGroup>

              {/* İÇERİK */}
              <FormGroup label="MESAJ İÇERİĞİ *" full>
                <textarea
                  style={{...S.input,minHeight:180,resize:'vertical',lineHeight:1.6,fontFamily:'inherit'}}
                  value={form.icerik}
                  onChange={e => up('icerik', e.target.value)}
                  placeholder="MESAJINIZI BURAYA YAZINIZ..."
                />
              </FormGroup>
            </div>

            {/* ÖNCELİK UYARISI - ACİL */}
            {form.oncelik === 'acil' && (
              <div style={{
                padding:'12px 16px', marginTop:16, borderRadius:8, maxWidth:800,
                background:`${C.danger}11`, border:`1px solid ${C.danger}33`,
                display:'flex', alignItems:'center', gap:10
              }}>
                <LIcon name="Zap" size={16} color={C.danger}/>
                <span style={{fontSize:11,color:C.danger,fontWeight:600}}>
                  ACİL ÖNCELİKLİ MESAJLAR ALICIYA ANINDA BİLDİRİM OLARAK GÖNDERİLİR
                </span>
              </div>
            )}

            {/* ÖNCELİK UYARISI - YÜKSEK */}
            {form.oncelik === 'yuksek' && (
              <div style={{
                padding:'12px 16px', marginTop:16, borderRadius:8, maxWidth:800,
                background:`${C.warning}11`, border:`1px solid ${C.warning}33`,
                display:'flex', alignItems:'center', gap:10
              }}>
                <LIcon name="AlertTriangle" size={16} color={C.warning}/>
                <span style={{fontSize:11,color:C.warning,fontWeight:600}}>
                  YÜKSEK ÖNCELİKLİ MESAJ OLARAK İŞARETLENECEK
                </span>
              </div>
            )}

            {/* ═══ ÖNİZLEME ═══ */}
            {(form.konu.trim() || form.icerik.trim()) && (
              <div style={{
                marginTop:20, padding:16, borderRadius:10, maxWidth:800,
                background:C.bgHover, border:`1px solid ${C.border}`
              }}>
                <div style={{fontSize:10,color:C.textMuted,fontWeight:700,marginBottom:12,letterSpacing:0.5}}>ÖNİZLEME</div>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{
                    width:36,height:36,borderRadius:'50%',flexShrink:0,
                    background:`${C.accent}22`,border:`1.5px solid ${C.accent}44`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:14,fontWeight:800,color:C.accent
                  }}>
                    {(user?.ad_soyad || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.text}}>{form.konu || '(KONU YOK)'}</span>
                      <Badge text={oncelikLabel(form.oncelik)} color={oncelikRenk(form.oncelik)}/>
                    </div>
                    {form.alici_id && (
                      <div style={{fontSize:10,color:C.textMuted,marginBottom:6}}>
                        ALICI: {kullanicilar.find(k => String(k.id) === String(form.alici_id))?.ad_soyad || 'SEÇİLEN KULLANICI'}
                      </div>
                    )}
                    <div style={{fontSize:12,color:C.textSec,lineHeight:1.6,whiteSpace:'pre-wrap'}}>
                      {form.icerik || '(İÇERİK YOK)'}
                    </div>
                    <div style={{fontSize:10,color:C.textMuted,marginTop:8}}>
                      <LIcon name="Clock" size={10} color={C.textMuted} style={{marginRight:4,verticalAlign:'middle'}}/>
                      AZ ÖNCE
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ BUTONLAR ═══ */}
            <div style={{marginTop:24,display:'flex',gap:10,maxWidth:800}}>
              <button
                style={{...S.btn,...S.btnP,fontSize:13,padding:'12px 28px',opacity:gonderiliyor?0.7:1}}
                onClick={mesajGonder}
                disabled={gonderiliyor}>
                <LIcon name="Send" size={15} color="#fff"/>
                {gonderiliyor ? 'GÖNDERİLİYOR...' : 'MESAJI GÖNDER'}
              </button>
              <button
                style={{...S.btn,...S.btnG,fontSize:13,padding:'12px 28px'}}
                onClick={() => { setForm({...bosForm}); setError(''); }}>
                <LIcon name="X" size={15} color={C.textSec}/> TEMİZLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         SEKME 4: SİSTEM BİLDİRİMLERİ
         ═══════════════════════════════════════════════════════════ */}
      {aktifSekme === 'sistem' && (
        <div style={S.card}>
          <SectionTitle icon="Bell" title="SİSTEM BİLDİRİMLERİ"
            sub={bildirimler.length + ' BİLDİRİM, ' + bildirimOkunmamis + ' OKUNMAMIŞ'}
            right={
              bildirimOkunmamis > 0 ? (
                <button style={{...S.btn,...S.btnW,fontSize:10,padding:'8px 14px'}}
                  onClick={bildirimTumunuOku}>
                  <LIcon name="CheckCheck" size={14} color="#000"/> TÜMÜNÜ OKUNDU İŞARETLE
                </button>
              ) : null
            }
          />

          {/* ═══ BİLDİRİM LİSTESİ (TARİHE GÖRE GRUPLU) ═══ */}
          {bildirimler.length === 0 ? (
            <EmptyState icon="Bell" title="BİLDİRİM BULUNAMADI" desc="HENÜZ SİSTEM BİLDİRİMİ BULUNMUYOR"/>
          ) : (
            <div style={S.cardBody}>
              {Object.entries(grupluBildirimler).map(([gun, liste]) => (
                <div key={gun} style={{marginBottom:24}}>
                  {/* GÜN BAŞLIĞI */}
                  <div style={{
                    fontSize:10, fontWeight:700, color:C.textMuted, letterSpacing:1,
                    marginBottom:10, paddingBottom:6,
                    borderBottom:`1px solid ${C.border}`,
                    display:'flex', alignItems:'center', gap:8
                  }}>
                    <LIcon name="Calendar" size={12} color={C.textMuted}/>
                    {gun}
                    <span style={{
                      fontSize:9, padding:'2px 8px', borderRadius:10,
                      background:C.bgHover, color:C.textMuted
                    }}>
                      {liste.length} BİLDİRİM
                    </span>
                  </div>

                  {/* BİLDİRİMLER */}
                  {liste.map((b, i) => {
                    const {icon, color, label} = bildirimTurBilgi(b.tur);
                    const okunmadi = !b.okundu;
                    return (
                      <div key={b.id || i}
                        onClick={() => {
                          bildirimOkunduIsaretle(b);
                          if (b.link) setPage(b.link);
                        }}
                        style={{
                          display:'flex', alignItems:'flex-start', gap:14,
                          padding:'14px 16px', borderRadius:10, marginBottom:6,
                          cursor: b.link ? 'pointer' : 'default',
                          background: okunmadi ? `${color}08` : 'transparent',
                          border: `1px solid ${okunmadi ? color + '33' : C.border}`,
                          transition:'all .2s',
                          position:'relative'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${color}11`}
                        onMouseLeave={e => e.currentTarget.style.background = okunmadi ? `${color}08` : 'transparent'}>

                        {/* OKUNMADI NOKTASI */}
                        {okunmadi && (
                          <div style={{
                            position:'absolute', top:8, right:8,
                            width:8, height:8, borderRadius:'50%',
                            background:color
                          }}/>
                        )}

                        {/* İKON */}
                        <div style={{
                          width:40, height:40, borderRadius:10, flexShrink:0,
                          background:`${color}22`,
                          display:'flex', alignItems:'center', justifyContent:'center'
                        }}>
                          <LIcon name={icon} size={18} color={color}/>
                        </div>

                        {/* İÇERİK */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                            <span style={{
                              fontSize:13, fontWeight:okunmadi?700:500,
                              color:okunmadi?C.text:C.textSec
                            }}>
                              {b.baslik}
                            </span>
                            <Badge text={label} color={color}/>
                          </div>
                          {b.icerik && (
                            <div style={{
                              fontSize:12, color:okunmadi?C.textSec:C.textMuted,
                              lineHeight:1.5, marginBottom:6
                            }}>
                              {b.icerik}
                            </div>
                          )}
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <span style={{fontSize:10,color:C.textMuted}}>
                              <LIcon name="Clock" size={10} color={C.textMuted} style={{marginRight:4,verticalAlign:'middle'}}/>
                              {mesajZamanOnce(b.created_at)}
                            </span>
                            {b.link && (
                              <span style={{fontSize:10,color:C.accent,fontWeight:600}}>
                                <LIcon name="ExternalLink" size={10} color={C.accent} style={{marginRight:4,verticalAlign:'middle'}}/>
                                DETAY İÇİN TIKLAYIN
                              </span>
                            )}
                            {okunmadi && (
                              <span style={{fontSize:9,color:color,fontWeight:700}}>YENİ</span>
                            )}
                          </div>
                        </div>

                        {/* AKSIYON BUTONLARI */}
                        <div style={{flexShrink:0,display:'flex',alignItems:'center',gap:6}} onClick={e => e.stopPropagation()}>
                          {okunmadi && (
                            <button style={{...S.btn,...S.btnG,fontSize:9,padding:'5px 10px'}}
                              onClick={() => bildirimOkunduIsaretle(b)}>
                              <LIcon name="Eye" size={10} color={C.textSec}/> OKU
                            </button>
                          )}
                          <button style={{...S.btn,...S.btnD,fontSize:9,padding:'5px 10px'}}
                            onClick={() => { setSilTur('bildirim'); setSilOnay(b); }}>
                            <LIcon name="Trash2" size={10} color="#fff"/> SİL
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* BİLDİRİM SAYISI */}
          {bildirimler.length > 0 && (
            <div style={{padding:'10px 20px',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:10,color:C.textMuted}}>
                TOPLAM {bildirimler.length} BİLDİRİM
              </span>
              <span style={{fontSize:10,color:C.textMuted}}>
                {bildirimOkunmamis} OKUNMAMIŞ
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         MESAJ DETAY MODAL
         ═══════════════════════════════════════════════════════════ */}
      <Modal open={!!detayModal} onClose={() => setDetayModal(null)}
        title={detayYon === 'gelen' ? 'GELEN MESAJ DETAYI' : 'GÖNDERİLEN MESAJ DETAYI'} width="700px">
        {detayModal && (() => {
          const kisiLabel = detayYon === 'gelen' ? 'GÖNDEREN' : 'ALICI';
          const kisiAdi = detayYon === 'gelen'
            ? (detayModal.gonderen_adi || 'BİLİNMEYEN')
            : (detayModal.alici_adi || 'BİLİNMEYEN');
          const karsiKisiLabel = detayYon === 'gelen' ? 'ALICI' : 'GÖNDEREN';
          const karsiKisiAdi = detayYon === 'gelen'
            ? (user?.ad_soyad || user?.email || 'BEN')
            : (detayModal.gonderen_adi || user?.ad_soyad || 'BEN');
          const renk = avatarRenk(kisiAdi);

          return (
            <div>
              {/* MESAJ BAŞLIK BİLGİLERİ */}
              <div style={{
                padding:16, borderRadius:10, marginBottom:16,
                background:C.bgHover, border:`1px solid ${C.border}`
              }}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  {/* GÖNDEREN */}
                  <div>
                    <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:6}}>{kisiLabel}</div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{
                        width:34,height:34,borderRadius:'50%',
                        background:`${renk}22`,border:`1.5px solid ${renk}44`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:14,fontWeight:800,color:renk
                      }}>
                        {kisiAdi.charAt(0).toUpperCase()}
                      </div>
                      <span style={{fontSize:13,fontWeight:600}}>{kisiAdi}</span>
                    </div>
                  </div>
                  {/* ALICI */}
                  <div>
                    <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:6}}>{karsiKisiLabel}</div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{
                        width:34,height:34,borderRadius:'50%',
                        background:`${C.purple}22`,border:`1.5px solid ${C.purple}44`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:14,fontWeight:800,color:C.purple
                      }}>
                        {karsiKisiAdi.charAt(0).toUpperCase()}
                      </div>
                      <span style={{fontSize:13,fontWeight:600}}>{karsiKisiAdi}</span>
                    </div>
                  </div>
                  {/* TARİH VE ÖNCELİK */}
                  <div>
                    <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:4}}>TARİH</div>
                    <div style={{fontSize:11,color:C.textSec}}>
                      {mesajTarihFormat(detayModal.created_at)}
                      <span style={{marginLeft:6,color:C.textMuted,fontSize:10}}>({mesajZamanOnce(detayModal.created_at)})</span>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:4}}>ÖNCELİK</div>
                    <Badge text={oncelikLabel(detayModal.oncelik)} color={oncelikRenk(detayModal.oncelik)}/>
                  </div>
                </div>

                {/* OKUNMA BİLGİSİ */}
                {detayModal.okundu && detayModal.okunma_tarihi && (
                  <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
                    <LIcon name="Eye" size={12} color={C.success}/>
                    <span style={{fontSize:10,color:C.success,fontWeight:600}}>
                      OKUNMA TARİHİ: {mesajTarihFormat(detayModal.okunma_tarihi)}
                    </span>
                  </div>
                )}
              </div>

              {/* KONU */}
              <div style={{fontSize:18,fontWeight:800,marginBottom:16,color:C.text,letterSpacing:0.3}}>
                {detayModal.konu || 'KONUSUZ'}
              </div>

              {/* MESAJ İÇERİĞİ */}
              <div style={{
                padding:20, borderRadius:10,
                background:C.bg, border:`1px solid ${C.border}`,
                minHeight:120
              }}>
                <div style={{fontSize:10,color:C.textMuted,fontWeight:700,marginBottom:10,letterSpacing:0.5}}>MESAJ İÇERİĞİ</div>
                <div style={{
                  fontSize:13, color:C.text, lineHeight:1.8,
                  whiteSpace:'pre-wrap', wordBreak:'break-word'
                }}>
                  {detayModal.icerik || '(İÇERİK YOK)'}
                </div>
              </div>

              {/* DOSYA BAĞLANTISI */}
              {detayModal.dosya_id && (
                <div style={{
                  display:'flex',alignItems:'center',gap:10,marginTop:16,
                  padding:'10px 14px',borderRadius:8,
                  background:`${C.accent}11`,border:`1px solid ${C.accent}33`
                }}>
                  <LIcon name="Link" size={16} color={C.accent}/>
                  <span style={{fontSize:12,color:C.accent,fontWeight:600}}>DOSYA BAĞLANTISI:</span>
                  <span
                    style={{fontSize:12,color:C.accentLight,cursor:'pointer',textDecoration:'underline'}}
                    onClick={() => { setDetayModal(null); setPage('dosya-detay-' + detayModal.dosya_id); }}>
                    DOSYA #{detayModal.dosya_id}
                  </span>
                </div>
              )}

              {/* AKSIYON BUTONLARI */}
              <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'space-between',borderTop:`1px solid ${C.border}`,paddingTop:16}}>
                <div style={{display:'flex',gap:8}}>
                  {/* YANITLA - SADECE GELEN MESAJLARDA */}
                  {detayYon === 'gelen' && detayModal.gonderen_id && detayModal.gonderen_id !== user?.id && (
                    <button style={{...S.btn,...S.btnP,fontSize:12}} onClick={() => yanitla(detayModal)}>
                      <LIcon name="Reply" size={14} color="#fff"/> YANITLA
                    </button>
                  )}
                  {/* İLET */}
                  <button style={{...S.btn,...S.btnG,fontSize:12}} onClick={() => ilet(detayModal)}>
                    <LIcon name="Forward" size={14} color={C.textSec}/> İLET
                  </button>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {/* SİL */}
                  <button style={{...S.btn,...S.btnD,fontSize:12}}
                    onClick={() => { setSilTur('mesaj'); setSilOnay(detayModal); }}>
                    <LIcon name="Trash2" size={14} color="#fff"/> SİL
                  </button>
                  {/* KAPAT */}
                  <button style={{...S.btn,...S.btnG,fontSize:12}}
                    onClick={() => setDetayModal(null)}>
                    <LIcon name="X" size={14} color={C.textSec}/> KAPAT
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ═══ SİLME ONAY DİYALOGU ═══ */}
      <Confirm
        open={!!silOnay}
        message={
          silTur === 'bildirim'
            ? 'BU BİLDİRİMİ SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? "' + (silOnay?.baslik || '') + '"'
            : 'BU MESAJI SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? "' + (silOnay?.konu || '') + '"'
        }
        onConfirm={mesajSil}
        onCancel={() => setSilOnay(null)}
      />
    </div>
  );
};
