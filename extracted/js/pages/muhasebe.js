/* ============================================================
   MR HASAR DANIŞMANLIK – MUHASEBE MODÜLÜ (muhasebe.js)
   GELİR, GİDER, KOMİSYON, KASA, MALİYET ANALİZİ, RAPORLAR
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef, useMemo} = React;

/* ═══════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ – SEKME YAPISI
   ═══════════════════════════════════════════════════════════ */
MR.MuhasebePage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;

  const tumSekmeler = [
    {key:'gelir',    label:'GELİR YÖNETİMİ',     icon:'TrendingUp'},
    {key:'gider',    label:'GİDER YÖNETİMİ',      icon:'TrendingDown'},
    {key:'komisyon', label:'KOMİSYON / PRİM',      icon:'Percent'},
    {key:'kasa',     label:'KASA / BANKA',          icon:'Wallet'},
    {key:'ortakkasa',label:'ORTAK KASA',             icon:'Users'},
    {key:'maliyet',  label:'MALİYET ANALİZİ',      icon:'PieChart'},
    {key:'rapor',    label:'FİNANSAL RAPORLAR',     icon:'BarChart3'},
    {key:'kapanis',  label:'KAPANIŞ RAPORU',         icon:'FileCheck'},
    {key:'aysonu',   label:'AY SONU RAPORU',          icon:'CalendarCheck'}
  ];

  /* YETKİ BAZLI SEKME FİLTRELEME */
  const sekmeler = useMemo(() => {
    if (user?.rol === 'admin') return tumSekmeler;
    const yetkiler = user?.yetkiler;
    if (!yetkiler || Object.keys(yetkiler).length === 0) return tumSekmeler;
    return tumSekmeler.filter(s => { const v = yetkiler['muhasebe_muhasebe-' + s.key]; return v === undefined || v === 1; });
  }, [user?.rol, user?.yetkiler]);

  /* Aktif sekme: yetkisi yoksa ilk izinli sekmeye yönlendir */
  const aktifSekme = useMemo(() => {
    const hedef = subPage || 'gelir';
    if (sekmeler.some(s => s.key === hedef)) return hedef;
    return sekmeler.length > 0 ? sekmeler[0].key : 'gelir';
  }, [subPage, sekmeler]);

  return (
    <div className="fade-in">
      {/* SEKME BAR */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('muhasebe-' + s.key)}
              style={{
                flex:1, padding:'12px 8px', borderRadius:8, cursor:'pointer', textAlign:'center',
                background: aktif ? `${C.accent}22` : 'transparent',
                border: `1px solid ${aktif ? C.accent + '44' : 'transparent'}`,
                transition:'all .2s'
              }}
              onMouseEnter={e => { if(!aktif) e.currentTarget.style.background = C.bgHover; }}
              onMouseLeave={e => { if(!aktif) e.currentTarget.style.background = 'transparent'; }}>
              <LIcon name={s.icon} size={16} color={aktif ? C.accent : C.textMuted} style={{marginBottom:4}}/>
              <div style={{fontSize:11,fontWeight:aktif?700:500,color:aktif?C.accent:C.textSec,marginTop:4,letterSpacing:0.5}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* SEKME İÇERİKLERİ */}
      {aktifSekme === 'gelir'    && <GelirYonetimi setPage={setPage} user={user}/>}
      {aktifSekme === 'gider'    && <GiderYonetimi setPage={setPage} user={user}/>}
      {aktifSekme === 'komisyon' && <KomisyonPrim  setPage={setPage} user={user}/>}
      {aktifSekme === 'kasa'     && <KasaBanka     setPage={setPage} user={user}/>}
      {aktifSekme === 'ortakkasa' && <OrtakKasa    setPage={setPage} user={user}/>}
      {aktifSekme === 'maliyet'  && <MaliyetAnalizi setPage={setPage} user={user}/>}
      {aktifSekme === 'rapor'    && <FinansalRaporlar setPage={setPage} user={user}/>}
      {aktifSekme === 'kapanis'  && <KapanisRaporu setPage={setPage} user={user}/>}
      {aktifSekme === 'aysonu'   && <AySonuRaporu setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   YARDIMCI: UYARI / BAŞARI MESAJLARI
   ═══════════════════════════════════════════════════════════ */
const HataMesaji = ({mesaj}) => {
  const {C, LIcon} = MR;
  if (!mesaj) return null;
  return (
    <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
      <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{mesaj}
    </div>
  );
};
const BasariMesaji = ({mesaj}) => {
  const {C, LIcon} = MR;
  if (!mesaj) return null;
  return (
    <div style={{padding:10,background:`${C.success}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.success,border:`1px solid ${C.success}44`}}>
      <LIcon name="CheckCircle" size={14} color={C.success} style={{marginRight:6}}/>{mesaj}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1 – GELİR YÖNETİMİ
   ═══════════════════════════════════════════════════════════ */
const GelirYonetimi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, api, fmt, fmtInput, parseNum} = MR;
  const [gelirler, setGelirler] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState({kasa_id:'', dosya_id:'', tur:'DANIŞMANLIK ÜCRETİ', tutar:'', aciklama:'', tarih:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  /* FİLTRELER */
  const [kasaF, setKasaF] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [aramaF, setAramaF] = useState('');

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (kasaF) p.kasa_id = kasaF;
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    const [gR, kR] = await Promise.all([api.gelirList(p), api.kasaList()]);
    if (gR?.success) setGelirler(gR.data?.items || gR.data || []);
    if (kR?.success) setKasalar(kR.data || []);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, [kasaF, baslangic, bitis]);

  const aktifKasalar = useMemo(() => kasalar.filter(k => k.aktif !== false && k.aktif !== 0), [kasalar]);
  const kasaAdi = (id) => { const k = kasalar.find(k => k.id == id); return k ? k.ad : '-'; };

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    const buAy = new Date().toISOString().slice(0,7);
    const gecenAyD = new Date(); gecenAyD.setMonth(gecenAyD.getMonth()-1);
    const gecenAy = gecenAyD.toISOString().slice(0,7);
    let toplam = 0, buAyT = 0, gecenAyT = 0;
    gelirler.forEach(g => {
      const t = parseFloat(g.tutar) || 0;
      toplam += t;
      const tarih = (g.tarih || g.created_at || '').slice(0,7);
      if (tarih === buAy) buAyT += t;
      if (tarih === gecenAy) gecenAyT += t;
    });
    const ort = gelirler.length > 0 ? toplam / gelirler.length : 0;
    return {toplam, buAyT, gecenAyT, ort};
  }, [gelirler]);

  /* FİLTRELENMİŞ LİSTE */
  const filtrelenmis = useMemo(() => {
    if (!aramaF) return gelirler;
    const a = aramaF.toUpperCase();
    return gelirler.filter(g =>
      (g.aciklama || '').toUpperCase().includes(a) ||
      (g.dosya_no || '').toUpperCase().includes(a) ||
      (g.tur || '').toUpperCase().includes(a) ||
      (g.kasa_adi || kasaAdi(g.kasa_id)).toUpperCase().includes(a)
    );
  }, [gelirler, aramaF]);

  /* TOPLAM */
  const toplamTutar = useMemo(() => filtrelenmis.reduce((t, g) => t + (parseFloat(g.tutar) || 0), 0), [filtrelenmis]);

  const [gelirTurleri, setGelirTurleri] = useState(['DANIŞMANLIK ÜCRETİ','SİGORTA TAHSİLATI','MAHKEME TAZMİNATI','KOMİSYON','DİĞER GELİR']);
  useEffect(() => { api.tanimList({kategori:'gelir_turu'}).then(r => { if(r?.success && Array.isArray(r.data) && r.data.length > 0) setGelirTurleri(r.data.map(t=>t.deger)); }); }, []);

  /* YENİ GELİR MODAL */
  const yeniGelirAc = () => {
    setForm({kasa_id: aktifKasalar.length > 0 ? String(aktifKasalar[0].id) : '', dosya_id:'', tur:'DANIŞMANLIK ÜCRETİ', tutar:'', aciklama:'', tarih: new Date().toISOString().slice(0,10)});
    setHata(''); setBasari('');
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (!form.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); return; }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    setKayitLoading(true); setHata('');
    const gonder = {
      kasa_id: parseInt(form.kasa_id),
      tur: form.tur,
      tutar: tutarNum,
      aciklama: form.aciklama,
      tarih: form.tarih || undefined
    };
    if (form.dosya_id) gonder.dosya_id = parseInt(form.dosya_id);
    const r = await api.gelirCreate(gonder);
    if (r?.success) {
      setModalAcik(false);
      setBasari('GELİR BAŞARIYLA KAYDEDİLDİ');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  if (loading) return <Loading/>;

  return (
    <div>
      <BasariMesaji mesaj={basari}/>

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="TrendingUp" label="TOPLAM GELİR" value={fmt(istatistik.toplam)} color={C.success}/>
        <StatCard icon="Calendar" label="BU AY" value={fmt(istatistik.buAyT)} color={C.accent}/>
        <StatCard icon="CalendarDays" label="GEÇEN AY" value={fmt(istatistik.gecenAyT)} color={C.cyan}/>
        <StatCard icon="Activity" label="ORTALAMA" value={fmt(istatistik.ort)} color={C.purple}/>
      </div>

      {/* GELİR LİSTESİ */}
      <div style={S.card}>
        <SectionTitle icon="TrendingUp" title="GELİR KAYITLARI"
          sub={`TOPLAM ${gelirler.length} KAYIT`}
          right={
            <button style={{...S.btn,...S.btnS,fontSize:11}} onClick={yeniGelirAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ GELİR
            </button>
          }/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>KASA</label>
            <select style={{...S.select,width:180,fontSize:11}} value={kasaF} onChange={e => setKasaF(e.target.value)}>
              <option value="">TÜMÜ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BAŞLANGIÇ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={baslangic} onChange={e => setBaslangic(e.target.value)}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BİTİŞ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={bitis} onChange={e => setBitis(e.target.value)}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>ARAMA</label>
            <input style={{...S.input,width:200,fontSize:11}} value={aramaF} onChange={e => setAramaF(e.target.value)} placeholder="AÇIKLAMA, DOSYA NO..."/>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setKasaF('');setBaslangic('');setBitis('');setAramaF('');}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        {/* TABLO */}
        <div style={{overflowX:'auto'}}>
          {filtrelenmis.length === 0 ? (
            <EmptyState icon="TrendingUp" title="GELİR KAYDI BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN GELİR KAYDI BULUNMAMAKTADIR"/>
          ) : (
            <>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['TARİH','KASA','DOSYA NO','TÜR','TUTAR','AÇIKLAMA'].map(h =>
                      <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtrelenmis.map((g, i) => (
                    <tr key={g.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 12px',color:C.textSec,fontSize:11}}>{g.tarih || g.created_at?.split(' ')[0] || '-'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600}}>{g.kasa_adi || kasaAdi(g.kasa_id)}</td>
                      <td style={{padding:'10px 12px'}}>
                        {g.dosya_no ? (
                          <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => g.dosya_id && setPage('dosya-detay-' + g.dosya_id)}>
                            {g.dosya_no}
                          </span>
                        ) : <span style={{color:C.textMuted}}>-</span>}
                      </td>
                      <td style={{padding:'10px 12px'}}><Badge text={(g.tur || 'GELİR').toUpperCase()} color={C.success}/></td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:C.success,fontSize:12}}>+{fmt(parseFloat(g.tutar) || 0)}</td>
                      <td style={{padding:'10px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.aciklama || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ALT TOPLAM */}
              <div style={{padding:'14px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.success}08`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.textSec}}>
                  TOPLAM: <span style={{color:C.success,fontSize:14}}>{fmt(toplamTutar)}</span>
                </div>
                <div style={{fontSize:11,color:C.textMuted}}>{filtrelenmis.length} KAYIT</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* YENİ GELİR MODAL */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title="YENİ GELİR KAYDI" width="560px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA SEÇİMİ *">
            <select style={S.select} value={form.kasa_id} onChange={e => setForm(p => ({...p, kasa_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {aktifKasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>)}
            </select>
          </FormGroup>
          <FormGroup label="DOSYA NO (OPSİYONEL)">
            <input style={S.input} value={form.dosya_id} onChange={e => setForm(p => ({...p, dosya_id: e.target.value}))} placeholder="DOSYA ID"/>
          </FormGroup>
          <FormGroup label="GELİR TÜRÜ *">
            <select style={S.select} value={form.tur} onChange={e => setForm(p => ({...p, tur: e.target.value}))}>
              {gelirTurleri.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
              <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={form.tutar}
                onChange={e => setForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="TARİH">
            <input type="date" style={S.input} value={form.tarih} onChange={e => setForm(p => ({...p, tarih: e.target.value}))}/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:70}} value={form.aciklama} onChange={e => setForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="GELİR AÇIKLAMASI..."/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Plus" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'GELİR KAYDET'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 2 – GİDER YÖNETİMİ
   ═══════════════════════════════════════════════════════════ */
const GiderYonetimi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, api, fmt, fmtInput, parseNum} = MR;
  const [giderler, setGiderler] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState({kasa_id:'', dosya_id:'', kategori:'OFİS GİDERİ', tutar:'', aciklama:'', tarih:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  /* FİLTRELER */
  const [kasaF, setKasaF] = useState('');
  const [kategoriF, setKategoriF] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');

  const [giderKategorileri, setGiderKategorileri] = useState(['OFİS GİDERİ','PERSONEL GİDERİ','ULAŞIM','YAKIT','BİLİRKİŞİ ÜCRETİ','AVUKAT ÜCRETİ','KİRA','VERGİ / HARÇ','DOSYA MASRAFI','DİĞER GİDER']);
  useEffect(() => { api.tanimList({kategori:'gider_turu'}).then(r => { if(r?.success && Array.isArray(r.data) && r.data.length > 0) setGiderKategorileri(r.data.map(t=>t.deger)); }); }, []);

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (kasaF) p.kasa_id = kasaF;
    if (kategoriF) p.kategori = kategoriF;
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    const [gR, kR] = await Promise.all([api.giderList(p), api.kasaList()]);
    if (gR?.success) setGiderler(gR.data?.items || gR.data || []);
    if (kR?.success) setKasalar(kR.data || []);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, [kasaF, kategoriF, baslangic, bitis]);

  const aktifKasalar = useMemo(() => kasalar.filter(k => k.aktif !== false && k.aktif !== 0), [kasalar]);
  const kasaAdi = (id) => { const k = kasalar.find(k => k.id == id); return k ? k.ad : '-'; };

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    const buAy = new Date().toISOString().slice(0,7);
    const gecenAyD = new Date(); gecenAyD.setMonth(gecenAyD.getMonth()-1);
    const gecenAy = gecenAyD.toISOString().slice(0,7);
    let toplam = 0, buAyT = 0, gecenAyT = 0;
    giderler.forEach(g => {
      const t = parseFloat(g.tutar) || 0;
      toplam += t;
      const tarih = (g.tarih || g.created_at || '').slice(0,7);
      if (tarih === buAy) buAyT += t;
      if (tarih === gecenAy) gecenAyT += t;
    });
    const ort = giderler.length > 0 ? toplam / giderler.length : 0;
    return {toplam, buAyT, gecenAyT, ort};
  }, [giderler]);

  /* TOPLAM */
  const toplamTutar = useMemo(() => giderler.reduce((t, g) => t + (parseFloat(g.tutar) || 0), 0), [giderler]);

  const yeniGiderAc = () => {
    setForm({kasa_id: aktifKasalar.length > 0 ? String(aktifKasalar[0].id) : '', dosya_id:'', kategori:'OFİS GİDERİ', tutar:'', aciklama:'', tarih: new Date().toISOString().slice(0,10)});
    setHata(''); setBasari('');
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (!form.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); return; }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    if (!form.kategori) { setHata('KATEGORİ SEÇİMİ ZORUNLUDUR'); return; }
    setKayitLoading(true); setHata('');
    const gonder = {
      kasa_id: parseInt(form.kasa_id),
      kategori: form.kategori,
      tutar: tutarNum,
      aciklama: form.aciklama,
      tarih: form.tarih || undefined
    };
    if (form.dosya_id) gonder.dosya_id = parseInt(form.dosya_id);
    const r = await api.giderCreate(gonder);
    if (r?.success) {
      setModalAcik(false);
      setBasari('GİDER BAŞARIYLA KAYDEDİLDİ');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  if (loading) return <Loading/>;

  return (
    <div>
      <BasariMesaji mesaj={basari}/>

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="TrendingDown" label="TOPLAM GİDER" value={fmt(istatistik.toplam)} color={C.danger}/>
        <StatCard icon="Calendar" label="BU AY" value={fmt(istatistik.buAyT)} color={C.warning}/>
        <StatCard icon="CalendarDays" label="GEÇEN AY" value={fmt(istatistik.gecenAyT)} color={C.cyan}/>
        <StatCard icon="Activity" label="ORTALAMA" value={fmt(istatistik.ort)} color={C.purple}/>
      </div>

      {/* GİDER LİSTESİ */}
      <div style={S.card}>
        <SectionTitle icon="TrendingDown" title="GİDER KAYITLARI"
          sub={`TOPLAM ${giderler.length} KAYIT`}
          right={
            <button style={{...S.btn,...S.btnD,fontSize:11}} onClick={yeniGiderAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ GİDER
            </button>
          }/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>KASA</label>
            <select style={{...S.select,width:180,fontSize:11}} value={kasaF} onChange={e => setKasaF(e.target.value)}>
              <option value="">TÜMÜ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>KATEGORİ</label>
            <select style={{...S.select,width:180,fontSize:11}} value={kategoriF} onChange={e => setKategoriF(e.target.value)}>
              <option value="">TÜMÜ</option>
              {giderKategorileri.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BAŞLANGIÇ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={baslangic} onChange={e => setBaslangic(e.target.value)}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BİTİŞ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={bitis} onChange={e => setBitis(e.target.value)}/>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setKasaF('');setKategoriF('');setBaslangic('');setBitis('');}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        {/* TABLO */}
        <div style={{overflowX:'auto'}}>
          {giderler.length === 0 ? (
            <EmptyState icon="TrendingDown" title="GİDER KAYDI BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN GİDER KAYDI BULUNMAMAKTADIR"/>
          ) : (
            <>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['TARİH','KASA','DOSYA NO','KATEGORİ','TUTAR','AÇIKLAMA'].map(h =>
                      <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {giderler.map((g, i) => (
                    <tr key={g.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 12px',color:C.textSec,fontSize:11}}>{g.tarih || g.created_at?.split(' ')[0] || '-'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600}}>{g.kasa_adi || kasaAdi(g.kasa_id)}</td>
                      <td style={{padding:'10px 12px'}}>
                        {g.dosya_no ? (
                          <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => g.dosya_id && setPage('dosya-detay-' + g.dosya_id)}>
                            {g.dosya_no}
                          </span>
                        ) : <span style={{color:C.textMuted}}>-</span>}
                      </td>
                      <td style={{padding:'10px 12px'}}><Badge text={(g.kategori || 'GİDER').toUpperCase()} color={C.warning}/></td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:C.danger,fontSize:12}}>-{fmt(parseFloat(g.tutar) || 0)}</td>
                      <td style={{padding:'10px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.aciklama || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ALT TOPLAM */}
              <div style={{padding:'14px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.danger}08`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.textSec}}>
                  TOPLAM: <span style={{color:C.danger,fontSize:14}}>{fmt(toplamTutar)}</span>
                </div>
                <div style={{fontSize:11,color:C.textMuted}}>{giderler.length} KAYIT</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* YENİ GİDER MODAL */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title="YENİ GİDER KAYDI" width="560px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA SEÇİMİ *">
            <select style={S.select} value={form.kasa_id} onChange={e => setForm(p => ({...p, kasa_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {aktifKasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>)}
            </select>
          </FormGroup>
          <FormGroup label="DOSYA NO (OPSİYONEL)">
            <input style={S.input} value={form.dosya_id} onChange={e => setForm(p => ({...p, dosya_id: e.target.value}))} placeholder="DOSYA ID"/>
          </FormGroup>
          <FormGroup label="KATEGORİ *">
            <select style={S.select} value={form.kategori} onChange={e => setForm(p => ({...p, kategori: e.target.value}))}>
              {giderKategorileri.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
              <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={form.tutar}
                onChange={e => setForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="TARİH">
            <input type="date" style={S.input} value={form.tarih} onChange={e => setForm(p => ({...p, tarih: e.target.value}))}/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:70}} value={form.aciklama} onChange={e => setForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="GİDER AÇIKLAMASI..."/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnD}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Plus" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'GİDER KAYDET'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3 – KOMİSYON / PRİM
   ═══════════════════════════════════════════════════════════ */
const KomisyonPrim = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, fmt, fmtInput, parseNum} = MR;
  const [komisyonlar, setKomisyonlar] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [odeModalAcik, setOdeModalAcik] = useState(false);
  const [secilenKomisyon, setSecilenKomisyon] = useState(null);
  const [form, setForm] = useState({ilgili_tip:'ortak', ilgili_id:'', dosya_id:'', tutar:'', oran:'', aciklama:''});
  const [odeForm, setOdeForm] = useState({kasa_id:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const [confirm, setConfirm] = useState({open:false, msg:'', cb:null});

  /* FİLTRELER */
  const [durumF, setDurumF] = useState('');
  const [tipF, setTipF] = useState('');

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (durumF) p.durum = durumF;
    if (tipF) p.ilgili_tip = tipF;
    const [kR, kaR] = await Promise.all([api.komisyonList(p), api.kasaList()]);
    if (kR?.success) setKomisyonlar(kR.data?.items || kR.data || []);
    if (kaR?.success) setKasalar(kaR.data || []);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, [durumF, tipF]);

  const aktifKasalar = useMemo(() => kasalar.filter(k => k.aktif !== false && k.aktif !== 0), [kasalar]);

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    let toplam = 0, bekleyen = 0, onayli = 0, odenen = 0;
    komisyonlar.forEach(k => {
      const t = parseFloat(k.tutar) || 0;
      toplam += t;
      if (k.durum === 'bekliyor') bekleyen += t;
      if (k.durum === 'onaylandi') onayli += t;
      if (k.durum === 'odendi') odenen += t;
    });
    return {toplam, bekleyen, onayli, odenen};
  }, [komisyonlar]);

  const durumRenk = (d) => {
    if (d === 'bekliyor') return C.warning;
    if (d === 'onaylandi') return C.cyan;
    if (d === 'odendi') return C.success;
    return C.textMuted;
  };
  const durumLabel = (d) => {
    if (d === 'bekliyor') return 'BEKLİYOR';
    if (d === 'onaylandi') return 'ONAYLANDI';
    if (d === 'odendi') return 'ÖDENDİ';
    return (d || '').toUpperCase();
  };

  /* YENİ KOMİSYON */
  const yeniKomisyonAc = () => {
    setForm({ilgili_tip:'ortak', ilgili_id:'', dosya_id:'', tutar:'', oran:'', aciklama:''});
    setHata(''); setBasari('');
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (!form.ilgili_id) { setHata('İLGİLİ KİŞİ ID ZORUNLUDUR'); return; }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    setKayitLoading(true); setHata('');
    const gonder = {
      ilgili_tip: form.ilgili_tip,
      ilgili_id: parseInt(form.ilgili_id),
      tutar: tutarNum,
      oran: form.oran ? parseFloat(form.oran.replace(',','.')) : undefined,
      aciklama: form.aciklama
    };
    if (form.dosya_id) gonder.dosya_id = parseInt(form.dosya_id);
    const r = await api.komisyonOlustur(gonder);
    if (r?.success) {
      setModalAcik(false);
      setBasari('KOMİSYON BAŞARIYLA OLUŞTURULDU');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* ONAYLA */
  const onayla = (kom) => {
    setConfirm({
      open: true,
      msg: `${fmt(parseFloat(kom.tutar) || 0)} TUTARINDAKI KOMİSYONU ONAYLAMAK İSTİYOR MUSUNUZ?`,
      cb: async () => {
        setConfirm({open:false, msg:'', cb:null});
        const r = await api.komisyonOde({id: kom.id, durum:'onaylandi'});
        if (r?.success) { setBasari('KOMİSYON ONAYLANDI'); yukle(); setTimeout(() => setBasari(''), 3000); }
      }
    });
  };

  /* ÖDE MODAL */
  const odeAc = (kom) => {
    setSecilenKomisyon(kom);
    setOdeForm({kasa_id: aktifKasalar.length > 0 ? String(aktifKasalar[0].id) : ''});
    setHata('');
    setOdeModalAcik(true);
  };

  const odeKaydet = async () => {
    if (!odeForm.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); return; }
    if (!secilenKomisyon) return;
    setKayitLoading(true); setHata('');
    const r = await api.komisyonOde({id: secilenKomisyon.id, kasa_id: parseInt(odeForm.kasa_id)});
    if (r?.success) {
      setOdeModalAcik(false);
      setBasari('KOMİSYON ÖDEMESİ BAŞARIYLA GERÇEKLEŞTİRİLDİ');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'ÖDEME HATASI');
    }
    setKayitLoading(false);
  };

  if (loading) return <Loading/>;

  return (
    <div>
      <BasariMesaji mesaj={basari}/>

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="Percent" label="TOPLAM KOMİSYON" value={fmt(istatistik.toplam)} color={C.accent}/>
        <StatCard icon="Clock" label="BEKLEYEN" value={fmt(istatistik.bekleyen)} color={C.warning}/>
        <StatCard icon="CheckCircle" label="ONAYLI" value={fmt(istatistik.onayli)} color={C.cyan}/>
        <StatCard icon="TurkishLira" label="ÖDENEN" value={fmt(istatistik.odenen)} color={C.success}/>
      </div>

      {/* KOMİSYON LİSTESİ */}
      <div style={S.card}>
        <SectionTitle icon="Percent" title="KOMİSYON / PRİM KAYITLARI"
          sub={`TOPLAM ${komisyonlar.length} KAYIT`}
          right={
            <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={yeniKomisyonAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ KOMİSYON
            </button>
          }/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>DURUM</label>
            <select style={{...S.select,width:160,fontSize:11}} value={durumF} onChange={e => setDurumF(e.target.value)}>
              <option value="">TÜMÜ</option>
              <option value="bekliyor">BEKLİYOR</option>
              <option value="onaylandi">ONAYLANDI</option>
              <option value="odendi">ÖDENDİ</option>
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>İLGİLİ TİP</label>
            <select style={{...S.select,width:160,fontSize:11}} value={tipF} onChange={e => setTipF(e.target.value)}>
              <option value="">TÜMÜ</option>
              <option value="ortak">ORTAK</option>
              <option value="paydas">PAYDAŞ</option>
            </select>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setDurumF('');setTipF('');}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        {/* TABLO */}
        <div style={{overflowX:'auto'}}>
          {komisyonlar.length === 0 ? (
            <EmptyState icon="Percent" title="KOMİSYON KAYDI BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN KOMİSYON KAYDI BULUNMAMAKTADIR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['İLGİLİ','TİP','DOSYA NO','TUTAR','ORAN','DURUM','ÖDEME TARİHİ','İŞLEM'].map(h =>
                    <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {komisyonlar.map((k, i) => (
                  <tr key={k.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{k.ilgili_adi || k.ilgili_id || '-'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <Badge text={k.ilgili_tip === 'ortak' ? 'ORTAK' : 'PAYDAŞ'} color={k.ilgili_tip === 'ortak' ? C.purple : C.cyan}/>
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      {k.dosya_no ? (
                        <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => k.dosya_id && setPage('dosya-detay-' + k.dosya_id)}>
                          {k.dosya_no}
                        </span>
                      ) : <span style={{color:C.textMuted}}>-</span>}
                    </td>
                    <td style={{padding:'10px 12px',fontWeight:700,fontSize:12}}>{fmt(parseFloat(k.tutar) || 0)}</td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{k.oran ? `%${k.oran}` : '-'}</td>
                    <td style={{padding:'10px 12px'}}><Badge text={durumLabel(k.durum)} color={durumRenk(k.durum)}/></td>
                    <td style={{padding:'10px 12px',color:C.textSec,fontSize:11}}>{k.odeme_tarihi || '-'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{display:'flex',gap:6}}>
                        {k.durum === 'bekliyor' && (
                          <div onClick={() => onayla(k)} style={{width:28,height:28,borderRadius:7,background:'linear-gradient(180deg, #22d3ee 0%, #06b6d4 40%, #0891b2 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(6,182,212,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom:'1px solid #0e7490'}} title="ONAYLA">
                            <LIcon name="CheckCircle" size={13} color="#fff"/>
                          </div>
                        )}
                        {(k.durum === 'bekliyor' || k.durum === 'onaylandi') && (
                          <div onClick={() => odeAc(k)} style={{width:28,height:28,borderRadius:7,background:'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom:'1px solid #047857'}} title="ÖDE">
                            <LIcon name="Banknote" size={13} color="#fff"/>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* YENİ KOMİSYON MODAL */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title="YENİ KOMİSYON OLUŞTUR" width="560px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="İLGİLİ TİP *">
            <select style={S.select} value={form.ilgili_tip} onChange={e => setForm(p => ({...p, ilgili_tip: e.target.value}))}>
              <option value="ortak">ORTAK</option>
              <option value="paydas">PAYDAŞ</option>
            </select>
          </FormGroup>
          <FormGroup label="İLGİLİ ID *">
            <input style={S.input} value={form.ilgili_id} onChange={e => setForm(p => ({...p, ilgili_id: e.target.value}))} placeholder="ORTAK / PAYDAŞ ID"/>
          </FormGroup>
          <FormGroup label="DOSYA NO (OPSİYONEL)">
            <input style={S.input} value={form.dosya_id} onChange={e => setForm(p => ({...p, dosya_id: e.target.value}))} placeholder="DOSYA ID"/>
          </FormGroup>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
              <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={form.tutar}
                onChange={e => setForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="ORAN (%)">
            <input style={S.input} value={form.oran} onChange={e => setForm(p => ({...p, oran: e.target.value}))} placeholder="ÖRN: 10"/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:70}} value={form.aciklama} onChange={e => setForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="KOMİSYON AÇIKLAMASI..."/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Plus" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'KOMİSYON OLUŞTUR'}
          </button>
        </div>
      </Modal>

      {/* ÖDEME MODAL */}
      <Modal open={odeModalAcik} onClose={() => setOdeModalAcik(false)} title="KOMİSYON ÖDEMESİ" width="440px">
        <HataMesaji mesaj={hata}/>
        {secilenKomisyon && (
          <div style={{marginBottom:20,padding:16,background:C.bgHover,borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:11,color:C.textMuted}}>İLGİLİ</span>
              <span style={{fontSize:12,fontWeight:600}}>{secilenKomisyon.ilgili_adi || secilenKomisyon.ilgili_id}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:11,color:C.textMuted}}>ÖDENECEK TUTAR</span>
              <span style={{fontSize:16,fontWeight:800,color:C.success}}>{fmt(parseFloat(secilenKomisyon.tutar) || 0)}</span>
            </div>
          </div>
        )}
        <FormGroup label="ÖDEME KASASI *">
          <select style={S.select} value={odeForm.kasa_id} onChange={e => setOdeForm({kasa_id: e.target.value})}>
            <option value="">KASA SEÇİNİZ</option>
            {aktifKasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'}) - BAKİYE: {fmt(parseFloat(k.bakiye) || 0)}</option>)}
          </select>
        </FormGroup>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setOdeModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={odeKaydet} disabled={kayitLoading}>
            <LIcon name="Banknote" size={14} color="#fff"/> {kayitLoading ? 'ÖDENİYOR...' : 'ÖDEMEYİ ONAYLA'}
          </button>
        </div>
      </Modal>

      {/* ONAY DİALOG */}
      <Confirm open={confirm.open} message={confirm.msg}
        onConfirm={() => confirm.cb && confirm.cb()}
        onCancel={() => setConfirm({open:false, msg:'', cb:null})}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 4 – KASA / BANKA
   ═══════════════════════════════════════════════════════════ */
const KasaBanka = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, fmt, fmtInput, parseNum} = MR;
  const isAdmin = user?.rol === 'admin';
  const [kasalar, setKasalar] = useState([]);
  const [hareketler, setHareketler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kasaModalAcik, setKasaModalAcik] = useState(false);
  const [transferModalAcik, setTransferModalAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [kasaForm, setKasaForm] = useState({ad:'', tur:'nakit', banka_adi:'', iban:''});
  const [transferForm, setTransferForm] = useState({kaynak_id:'', hedef_id:'', tutar:'', aciklama:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const [confirm, setConfirm] = useState({open:false, msg:'', cb:null});
  /* BAKİYE DÜZELTME (SADECE ADMİN) */
  const [duzeltmeModal, setDuzeltmeModal] = useState(null);
  const [duzeltmeForm, setDuzeltmeForm] = useState({yeni_bakiye:'', aciklama:''});

  /* HAREKET DÜZENLEME / SİLME (SADECE ADMİN) */
  const [hareketDuzenleModal, setHareketDuzenleModal] = useState(null);
  const [hareketDuzenleForm, setHareketDuzenleForm] = useState({tutar:'', aciklama:'', islem_turu:''});

  /* HAREKET FİLTRELERİ */
  const [hKasaF, setHKasaF] = useState('');
  const [hTurF, setHTurF] = useState('');
  const [hBaslangic, setHBaslangic] = useState('');
  const [hBitis, setHBitis] = useState('');
  const [hLoading, setHLoading] = useState(false);

  const kasaYukle = async () => {
    setLoading(true);
    const r = await api.kasaList();
    if (r?.success) setKasalar(r.data || []);
    setLoading(false);
  };

  const hareketYukle = async () => {
    setHLoading(true);
    const p = {limit: 30};
    if (hKasaF) p.kasa_id = hKasaF;
    if (hTurF) p.tur = hTurF;
    if (hBaslangic) p.baslangic = hBaslangic;
    if (hBitis) p.bitis = hBitis;
    const r = await api.kasaHareketler(p);
    if (r?.success) setHareketler(r.data?.items || r.data || []);
    setHLoading(false);
  };

  useEffect(() => { kasaYukle(); }, []);
  useEffect(() => { hareketYukle(); }, [hKasaF, hTurF, hBaslangic, hBitis]);

  const aktifKasalar = useMemo(() => kasalar.filter(k => k.aktif !== false && k.aktif !== 0), [kasalar]);

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    const aktifler = kasalar.filter(k => k.aktif !== false && k.aktif !== 0);
    const topBakiye = aktifler.reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    const nakitBakiye = aktifler.filter(k => k.tur === 'nakit').reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    const bankaBakiye = aktifler.filter(k => k.tur === 'banka').reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    return {topBakiye, nakitBakiye, bankaBakiye, sayi: kasalar.length};
  }, [kasalar]);

  /* KASA YENİ / DÜZENLE */
  const yeniKasaAc = () => {
    setDuzenle(null);
    setKasaForm({ad:'', tur:'nakit', banka_adi:'', iban:''});
    setHata('');
    setKasaModalAcik(true);
  };

  const duzenleAc = (kasa) => {
    setDuzenle(kasa);
    setKasaForm({ad: kasa.ad || '', tur: kasa.tur || 'nakit', banka_adi: kasa.banka_adi || '', iban: kasa.iban || ''});
    setHata('');
    setKasaModalAcik(true);
  };

  const kasaKaydet = async () => {
    if (!kasaForm.ad.trim()) { setHata('KASA ADI ZORUNLUDUR'); return; }
    if (kasaForm.tur === 'banka' && !kasaForm.banka_adi.trim()) { setHata('BANKA ADI ZORUNLUDUR'); return; }
    setKayitLoading(true); setHata('');
    let r;
    if (duzenle) {
      r = await api.kasaUpdate({id: duzenle.id, ad: kasaForm.ad, banka_adi: kasaForm.banka_adi, iban: kasaForm.iban, aktif: duzenle.aktif});
    } else {
      r = await api.kasaCreate({ad: kasaForm.ad, tur: kasaForm.tur, banka_adi: kasaForm.banka_adi, iban: kasaForm.iban});
    }
    if (r?.success) {
      setKasaModalAcik(false);
      setBasari(duzenle ? 'KASA GÜNCELLENDİ' : 'KASA OLUŞTURULDU');
      kasaYukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* AKTİF / PASİF TOGGLE */
  const toggleAktif = (kasa) => {
    const yeniDurum = kasa.aktif === false || kasa.aktif === 0 ? true : false;
    const mesaj = yeniDurum ? `"${kasa.ad}" KASASINI AKTİF ETMEK İSTİYOR MUSUNUZ?` : `"${kasa.ad}" KASASINI PASİF YAPMAK İSTİYOR MUSUNUZ?`;
    setConfirm({
      open: true,
      msg: mesaj,
      cb: async () => {
        setConfirm({open:false, msg:'', cb:null});
        const r = await api.kasaUpdate({id: kasa.id, ad: kasa.ad, banka_adi: kasa.banka_adi, iban: kasa.iban, aktif: yeniDurum});
        if (r?.success) kasaYukle();
      }
    });
  };

  /* TRANSFER */
  const transferAc = () => {
    setTransferForm({kaynak_id:'', hedef_id:'', tutar:'', aciklama:''});
    setHata('');
    setTransferModalAcik(true);
  };

  const kaynakKasa = kasalar.find(k => k.id == transferForm.kaynak_id);
  const hedefKasa = kasalar.find(k => k.id == transferForm.hedef_id);

  const transferKaydet = async () => {
    if (!transferForm.kaynak_id) { setHata('KAYNAK KASA SEÇİMİ ZORUNLUDUR'); return; }
    if (!transferForm.hedef_id) { setHata('HEDEF KASA SEÇİMİ ZORUNLUDUR'); return; }
    if (transferForm.kaynak_id === transferForm.hedef_id) { setHata('KAYNAK VE HEDEF KASA AYNI OLAMAZ'); return; }
    const tutarNum = parseNum(transferForm.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    setKayitLoading(true); setHata('');
    const r = await api.kasaTransfer({
      kaynak_id: parseInt(transferForm.kaynak_id),
      hedef_id: parseInt(transferForm.hedef_id),
      tutar: tutarNum,
      aciklama: transferForm.aciklama
    });
    if (r?.success) {
      setTransferModalAcik(false);
      setBasari('TRANSFER BAŞARIYLA GERÇEKLEŞTİRİLDİ');
      kasaYukle(); hareketYukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'TRANSFER HATASI');
    }
    setKayitLoading(false);
  };

  const kasaAdi = (id) => { const k = kasalar.find(k => k.id == id); return k ? k.ad : '-'; };

  const turRenk = (tur) => {
    if (tur === 'gelir' || tur === 'komisyon') return C.success;
    if (tur === 'gider' || tur === 'masraf') return C.danger;
    if (tur === 'transfer') return C.warning;
    if (tur === 'duzeltme') return C.cyan || C.accent;
    return C.textSec;
  };
  const turLabel = (tur) => {
    const map = {gelir:'GELİR', gider:'GİDER', masraf:'MASRAF', komisyon:'KOMİSYON', transfer:'TRANSFER', duzeltme:'DÜZELTME'};
    return map[tur] || (tur || '').toUpperCase();
  };

  if (loading) return <Loading/>;

  return (
    <div>
      <BasariMesaji mesaj={basari}/>

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="Wallet" label="TOPLAM BAKİYE" value={fmt(istatistik.topBakiye)} color={C.accent}/>
        <StatCard icon="Banknote" label="NAKİT BAKİYE" value={fmt(istatistik.nakitBakiye)} color={C.success}/>
        <StatCard icon="Building2" label="BANKA BAKİYE" value={fmt(istatistik.bankaBakiye)} color={C.cyan}/>
        <StatCard icon="Hash" label="KASA SAYISI" value={istatistik.sayi} color={C.purple}/>
      </div>

      {/* KASA KARTLARI */}
      <div style={S.card}>
        <SectionTitle icon="Wallet" title="KASALAR"
          sub={`${kasalar.length} KASA TANIMLI`}
          right={isAdmin ? (
            <div style={{display:'flex',gap:8}}>
              <button style={{...S.btn,...S.btnD,fontSize:11}} onClick={()=>setConfirm({open:true,msg:'TÜM KASA BAKİYELERİNİ SIFIRLAMAK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ!',cb:async()=>{setConfirm({open:false,msg:'',cb:null});const r=await api.bakiyeSifirla();if(r?.success){setBasari('TÜM BAKİYELER SIFIRLANDI');kasaYukle();hareketYukle();setTimeout(()=>setBasari(''),4000);}else{setHata(r?.error||'SIFIRLAMA HATASI');setTimeout(()=>setHata(''),4000);}}})}>
                <LIcon name="RotateCcw" size={14} color="#fff"/> BAKİYELERİ SIFIRLA
              </button>
              <button style={{...S.btn,...S.btnW,fontSize:11}} onClick={transferAc}>
                <LIcon name="ArrowRightLeft" size={14} color="#000"/> TRANSFER
              </button>
              <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={yeniKasaAc}>
                <LIcon name="Plus" size={14} color="#fff"/> YENİ KASA
              </button>
            </div>
          ) : null}/>
        <div style={S.cardBody}>
          {kasalar.length === 0 ? (
            <EmptyState icon="Wallet" title="KASA BULUNAMADI" desc="YENİ KASA OLUŞTURMAK İÇİN YUKARIDAKI BUTONA TIKLAYIN"/>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {kasalar.map((kasa, idx) => {
                const pasif = kasa.aktif === false || kasa.aktif === 0;
                const bakiye = parseFloat(kasa.bakiye) || 0;
                const turRenk = kasa.tur === 'nakit' ? C.success : C.cyan;
                return (
                  <div key={kasa.id || idx} style={{
                    background: pasif ? `${C.bgHover}88` : C.bgCard,
                    borderRadius:12, border:`1px solid ${pasif ? C.border : turRenk + '33'}`,
                    padding:20, position:'relative', opacity: pasif ? 0.6 : 1, transition:'all .2s'
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{kasa.ad}</div>
                        <Badge text={kasa.tur === 'nakit' ? 'NAKİT' : 'BANKA'} color={turRenk}/>
                        {pasif && <span style={{marginLeft:6}}><Badge text="PASİF" color={C.danger}/></span>}
                      </div>
                      {isAdmin && (
                        <div style={{display:'flex',gap:6}}>
                          <div onClick={() => duzenleAc(kasa)} style={{width:30,height:30,borderRadius:7,background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom:'1px solid #1d4ed8'}} title="DÜZENLE">
                            <LIcon name="Pencil" size={13} color="#fff"/>
                          </div>
                          <div onClick={() => {setDuzeltmeModal(kasa);setDuzeltmeForm({yeni_bakiye:String(Math.round(parseFloat(kasa.bakiye)||0)),aciklama:''});}} style={{width:30,height:30,borderRadius:7,background:'linear-gradient(180deg, #fcd34d 0%, #f59e0b 40%, #d97706 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',borderBottom:'1px solid #b45309'}} title="BAKİYE DÜZELT">
                            <LIcon name="Calculator" size={13} color="#000"/>
                          </div>
                          <div onClick={() => toggleAktif(kasa)} style={{width:30,height:30,borderRadius:7,background: pasif ? 'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)' : 'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow: pasif ? '0 2px 8px -1px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 2px 8px -1px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom: pasif ? '1px solid #047857' : '1px solid #b91c1c'}} title={pasif ? 'AKTİF ET' : 'PASİF YAP'}>
                            <LIcon name={pasif ? 'ToggleRight' : 'ToggleLeft'} size={13} color="#fff"/>
                          </div>
                          <div onClick={() => setConfirm({open:true, msg:`"${kasa.ad}" KASASINI VE TÜM HAREKETLERİNİ KALICI OLARAK SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nBU İŞLEM GERİ ALINAMAZ!`, cb: async () => { setConfirm({open:false, msg:'', cb:null}); const r = await api.kasaDelete(kasa.id); if(r?.success){ setBasari('KASA BAŞARIYLA SİLİNDİ'); kasaYukle(); hareketYukle(); setTimeout(()=>setBasari(''),4000); } else { setHata(r?.error||'SİLME HATASI'); setTimeout(()=>setHata(''),4000); }}})} style={{width:30,height:30,borderRadius:7,background:'linear-gradient(180deg, #f87171 0%, #dc2626 40%, #991b1b 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(220,38,38,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom:'1px solid #7f1d1d'}} title="KASAYI SİL">
                            <LIcon name="Trash2" size={13} color="#fff"/>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:26,fontWeight:800,color: bakiye >= 0 ? C.success : C.danger, marginBottom:16, letterSpacing:-0.5}}>
                      {fmt(bakiye)}
                    </div>
                    {kasa.tur === 'banka' && (
                      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                        {kasa.banka_adi && (
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                            <LIcon name="Building2" size={12} color={C.textMuted}/>
                            <span style={{fontSize:11,color:C.textSec}}>{kasa.banka_adi}</span>
                          </div>
                        )}
                        {kasa.iban && (
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <LIcon name="CreditCard" size={12} color={C.textMuted}/>
                            <span style={{fontSize:10,color:C.textMuted,fontFamily:'monospace',letterSpacing:1}}>{kasa.iban}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* HAREKET LİSTESİ */}
      <div style={{...S.card, marginTop:20}}>
        <SectionTitle icon="ArrowLeftRight" title="KASA HAREKETLERİ" sub="SON 30 HAREKET"/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>KASA</label>
            <select style={{...S.select,width:180,fontSize:11}} value={hKasaF} onChange={e => setHKasaF(e.target.value)}>
              <option value="">TÜMÜ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>TÜR</label>
            <select style={{...S.select,width:140,fontSize:11}} value={hTurF} onChange={e => setHTurF(e.target.value)}>
              <option value="">TÜMÜ</option>
              <option value="gelir">GELİR</option>
              <option value="gider">GİDER</option>
              <option value="masraf">MASRAF</option>
              <option value="komisyon">KOMİSYON</option>
              <option value="transfer">TRANSFER</option>
              <option value="duzeltme">DÜZELTME</option>
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BAŞLANGIÇ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={hBaslangic} onChange={e => setHBaslangic(e.target.value)}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BİTİŞ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={hBitis} onChange={e => setHBitis(e.target.value)}/>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setHKasaF('');setHTurF('');setHBaslangic('');setHBitis('');}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          {hLoading ? <Loading/> : hareketler.length === 0 ? (
            <EmptyState icon="ArrowLeftRight" title="HAREKET BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN HAREKET BULUNMAMAKTADIR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['TARİH','KASA','TÜR','TUTAR','AÇIKLAMA','DOSYA NO', ...(isAdmin ? ['İŞLEM'] : [])].map(h =>
                    <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {hareketler.map((h, i) => {
                  const tutar = parseFloat(h.tutar) || 0;
                  const giris = h.tur === 'gelir' || h.tur === 'komisyon' || h.tur === 'duzeltme';
                  return (
                    <tr key={h.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 12px',color:C.textSec,fontSize:11}}>{h.tarih || h.created_at?.split(' ')[0] || '-'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600}}>{h.kasa_adi || kasaAdi(h.kasa_id)}</td>
                      <td style={{padding:'10px 12px'}}><Badge text={turLabel(h.tur)} color={turRenk(h.tur)}/></td>
                      <td style={{padding:'10px 12px',fontWeight:700,color: giris ? C.success : C.danger,fontSize:12}}>
                        {giris ? '+' : '-'}{fmt(tutar)}
                      </td>
                      <td style={{padding:'10px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.aciklama || '-'}</td>
                      <td style={{padding:'10px 12px'}}>
                        {h.dosya_no ? (
                          <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => h.dosya_id && setPage('dosya-detay-' + h.dosya_id)}>
                            {h.dosya_no}
                          </span>
                        ) : <span style={{color:C.textMuted}}>-</span>}
                      </td>
                      {isAdmin && (
                        <td style={{padding:'10px 12px'}}>
                          <div style={{display:'flex',gap:4}}>
                            <div onClick={() => { setHareketDuzenleModal(h); setHareketDuzenleForm({tutar: String(tutar), aciklama: h.aciklama || '', islem_turu: h.tur || h.islem_turu || ''}); setHata(''); }} style={{width:26,height:26,borderRadius:6,background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 6px -1px rgba(37,99,235,0.4)'}} title="DÜZENLE">
                              <LIcon name="Pencil" size={11} color="#fff"/>
                            </div>
                            <div onClick={() => setConfirm({open:true, msg:'BU HAREKETİ SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nKASA BAKİYESİ OTOMATİK GÜNCELLENECEKTİR.', cb: async () => { setConfirm({open:false,msg:'',cb:null}); const r = await api.kasaHareketSil(h.id); if(r?.success){ setBasari('HAREKET BAŞARIYLA SİLİNDİ'); kasaYukle(); hareketYukle(); setTimeout(()=>setBasari(''),4000); } else { setHata(r?.error||'SİLME HATASI'); setTimeout(()=>setHata(''),4000); }}})} style={{width:26,height:26,borderRadius:6,background:'linear-gradient(180deg, #f87171 0%, #dc2626 40%, #991b1b 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 6px -1px rgba(220,38,38,0.4)'}} title="SİL">
                              <LIcon name="Trash2" size={11} color="#fff"/>
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* YENİ / DÜZENLE KASA MODAL */}
      <Modal open={kasaModalAcik} onClose={() => setKasaModalAcik(false)} title={duzenle ? 'KASA DÜZENLE' : 'YENİ KASA OLUŞTUR'} width="500px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA ADI *">
            <input style={S.input} value={kasaForm.ad} onChange={e => setKasaForm(p => ({...p, ad: e.target.value.toUpperCase()}))} placeholder="KASA ADI"/>
          </FormGroup>
          <FormGroup label="TÜR *">
            <select style={S.select} value={kasaForm.tur} onChange={e => setKasaForm(p => ({...p, tur: e.target.value}))} disabled={!!duzenle}>
              <option value="nakit">NAKİT</option>
              <option value="banka">BANKA</option>
            </select>
          </FormGroup>
          {kasaForm.tur === 'banka' && (
            <>
              <FormGroup label="BANKA ADI">
                <input style={S.input} value={kasaForm.banka_adi} onChange={e => setKasaForm(p => ({...p, banka_adi: e.target.value.toUpperCase()}))} placeholder="BANKA ADI"/>
              </FormGroup>
              <FormGroup label="IBAN">
                <MR.IBANInput value={kasaForm.iban} onChange={v => setKasaForm(p => ({...p, iban: v}))}/>
              </FormGroup>
            </>
          )}
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setKasaModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={kasaKaydet} disabled={kayitLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
          </button>
        </div>
      </Modal>

      {/* BAKİYE DÜZELTME MODAL (SADECE ADMİN) */}
      <Modal open={!!duzeltmeModal} onClose={()=>setDuzeltmeModal(null)} title="BAKİYE DÜZELT" width="500px">
        {duzeltmeModal && (
          <div>
            <HataMesaji mesaj={hata}/>
            <div style={{padding:12,borderRadius:8,background:`${C.warning}11`,border:`1px solid ${C.warning}33`,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700}}>{duzeltmeModal.ad}</div>
              <div style={{fontSize:11,color:C.textSec,marginTop:4}}>MEVCUT BAKİYE: <strong style={{color:C.text,fontSize:16}}>{fmt(parseFloat(duzeltmeModal.bakiye)||0)}</strong></div>
            </div>
            <FormGroup label="YENİ BAKİYE (₺) *">
              <input style={{...S.input,fontSize:18,fontWeight:700}} value={duzeltmeForm.yeni_bakiye}
                onChange={e=>setDuzeltmeForm(f=>({...f,yeni_bakiye:e.target.value.replace(/[^0-9.,\-]/g,'')}))}
                placeholder="0"/>
            </FormGroup>
            <FormGroup label="DÜZELTME NEDENİ">
              <input style={S.input} value={duzeltmeForm.aciklama}
                onChange={e=>setDuzeltmeForm(f=>({...f,aciklama:e.target.value.toUpperCase()}))}
                placeholder="DÜZELTME NEDENİNİ YAZINIZ"/>
            </FormGroup>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:20}}>
              <button style={{...S.btn,...S.btnG}} onClick={()=>setDuzeltmeModal(null)}>İPTAL</button>
              <button style={{...S.btn,...S.btnW}} onClick={async()=>{
                const yb = parseNum(duzeltmeForm.yeni_bakiye);
                const r = await api.bakiyeDuzelt({kasa_id:duzeltmeModal.id, yeni_bakiye:yb, aciklama:duzeltmeForm.aciklama||'MANUEL DÜZELTME'});
                if(r?.success){setDuzeltmeModal(null);setBasari('BAKİYE DÜZELTİLDİ');kasaYukle();hareketYukle();setTimeout(()=>setBasari(''),4000);}
                else{setHata(r?.error||'DÜZELTME HATASI');setTimeout(()=>setHata(''),4000);}
              }}>
                <LIcon name="Calculator" size={14} color="#000"/> BAKİYE DÜZELT
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* TRANSFER MODAL */}
      <Modal open={transferModalAcik} onClose={() => setTransferModalAcik(false)} title="KASALAR ARASI TRANSFER" width="600px">
        <HataMesaji mesaj={hata}/>

        {/* GÖRSEL TRANSFER BÖLÜMÜ */}
        <div style={{display:'flex',alignItems:'stretch',gap:20,marginBottom:24}}>
          {/* KAYNAK KASA */}
          <div style={{flex:1,background:C.bgHover,borderRadius:12,padding:20,border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${C.danger}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <LIcon name="ArrowUpRight" size={18} color={C.danger}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>KAYNAK KASA</div>
                <div style={{fontSize:10,color:C.textMuted}}>PARA ÇIKIŞI</div>
              </div>
            </div>
            <select style={S.select} value={transferForm.kaynak_id} onChange={e => setTransferForm(p => ({...p, kaynak_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {aktifKasalar.filter(k => k.id != transferForm.hedef_id).map(k =>
                <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>
              )}
            </select>
            {kaynakKasa && (
              <div style={{marginTop:12,padding:10,background:C.bgCard,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>MEVCUT BAKİYE</div>
                <div style={{fontSize:20,fontWeight:800,color:C.text}}>{fmt(parseFloat(kaynakKasa.bakiye) || 0)}</div>
              </div>
            )}
          </div>

          {/* OK İŞARETİ */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minWidth:60}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:`${C.warning}22`,border:`2px solid ${C.warning}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <LIcon name="ArrowRight" size={24} color={C.warning}/>
            </div>
            {transferForm.tutar && (
              <div style={{fontSize:14,fontWeight:800,color:C.warning}}>
                ₺{fmtInput(transferForm.tutar)}
              </div>
            )}
          </div>

          {/* HEDEF KASA */}
          <div style={{flex:1,background:C.bgHover,borderRadius:12,padding:20,border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <LIcon name="ArrowDownLeft" size={18} color={C.success}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>HEDEF KASA</div>
                <div style={{fontSize:10,color:C.textMuted}}>PARA GİRİŞİ</div>
              </div>
            </div>
            <select style={S.select} value={transferForm.hedef_id} onChange={e => setTransferForm(p => ({...p, hedef_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {aktifKasalar.filter(k => k.id != transferForm.kaynak_id).map(k =>
                <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>
              )}
            </select>
            {hedefKasa && (
              <div style={{marginTop:12,padding:10,background:C.bgCard,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>MEVCUT BAKİYE</div>
                <div style={{fontSize:20,fontWeight:800,color:C.text}}>{fmt(parseFloat(hedefKasa.bakiye) || 0)}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="TRANSFER TUTARI *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
              <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={transferForm.tutar}
                onChange={e => setTransferForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="AÇIKLAMA">
            <input style={S.input} value={transferForm.aciklama} onChange={e => setTransferForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="TRANSFER AÇIKLAMASI"/>
          </FormGroup>
        </div>

        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setTransferModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnW}} onClick={transferKaydet} disabled={kayitLoading}>
            <LIcon name="ArrowRightLeft" size={14} color="#000"/> {kayitLoading ? 'TRANSFER EDİLİYOR...' : 'TRANSFER YAP'}
          </button>
        </div>
      </Modal>

      {/* HAREKET DÜZENLEME MODAL (SADECE ADMİN) */}
      <Modal open={!!hareketDuzenleModal} onClose={() => setHareketDuzenleModal(null)} title="HAREKET DÜZENLE" width="500px">
        {hareketDuzenleModal && (
          <div>
            <HataMesaji mesaj={hata}/>
            <div style={{padding:12,borderRadius:8,background:`${C.accent}11`,border:`1px solid ${C.accent}33`,marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{hareketDuzenleModal.kasa_adi || kasaAdi(hareketDuzenleModal.kasa_id)}</div>
                  <div style={{fontSize:11,color:C.textSec,marginTop:2}}>{hareketDuzenleModal.tarih || hareketDuzenleModal.created_at?.split(' ')[0] || '-'}</div>
                </div>
                <Badge text={turLabel(hareketDuzenleModal.tur)} color={turRenk(hareketDuzenleModal.tur)}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <FormGroup label="TUTAR (₺) *">
                <input style={{...S.input,fontSize:16,fontWeight:700}} value={hareketDuzenleForm.tutar}
                  onChange={e => setHareketDuzenleForm(f => ({...f, tutar: e.target.value.replace(/[^0-9.,\-]/g,'')}))}
                  placeholder="0"/>
              </FormGroup>
              <FormGroup label="İŞLEM TÜRÜ *">
                <select style={S.select} value={hareketDuzenleForm.islem_turu} onChange={e => setHareketDuzenleForm(f => ({...f, islem_turu: e.target.value}))}>
                  <option value="gelir">GELİR</option>
                  <option value="gider">GİDER</option>
                  <option value="giris">GİRİŞ</option>
                  <option value="cikis">ÇIKIŞ</option>
                  <option value="komisyon">KOMİSYON</option>
                  <option value="transfer">TRANSFER</option>
                  <option value="duzeltme">DÜZELTME</option>
                </select>
              </FormGroup>
            </div>
            <FormGroup label="AÇIKLAMA">
              <input style={S.input} value={hareketDuzenleForm.aciklama}
                onChange={e => setHareketDuzenleForm(f => ({...f, aciklama: e.target.value.toUpperCase()}))}
                placeholder="HAREKET AÇIKLAMASI"/>
            </FormGroup>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:20}}>
              <button style={{...S.btn,...S.btnG}} onClick={() => setHareketDuzenleModal(null)}>İPTAL</button>
              <button style={{...S.btn,...S.btnP}} onClick={async () => {
                const yeniTutar = parseNum(hareketDuzenleForm.tutar);
                if (yeniTutar <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
                const r = await api.kasaHareketGuncelle({
                  id: hareketDuzenleModal.id,
                  tutar: yeniTutar,
                  aciklama: hareketDuzenleForm.aciklama,
                  islem_turu: hareketDuzenleForm.islem_turu
                });
                if (r?.success) {
                  setHareketDuzenleModal(null);
                  setBasari('HAREKET BAŞARIYLA GÜNCELLENDİ');
                  kasaYukle(); hareketYukle();
                  setTimeout(() => setBasari(''), 4000);
                } else {
                  setHata(r?.error || 'GÜNCELLEME HATASI');
                  setTimeout(() => setHata(''), 4000);
                }
              }}>
                <LIcon name="Save" size={14} color="#fff"/> KAYDET
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ONAY DİALOG */}
      <Confirm open={confirm.open} message={confirm.msg}
        onConfirm={() => confirm.cb && confirm.cb()}
        onCancel={() => setConfirm({open:false, msg:'', cb:null})}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5 – MALİYET ANALİZİ
   ═══════════════════════════════════════════════════════════ */
const MaliyetAnalizi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, api, fmt} = MR;
  const [veriler, setVeriler] = useState([]);
  const [loading, setLoading] = useState(true);

  const yukle = async () => {
    setLoading(true);
    const r = await api.maliyetAnaliz();
    if (r?.success) {
      /* Backend dosyalar dizisi döner - alan adlarını frontend'e uyumlu yap */
      const raw = r.data?.dosyalar || r.data?.items || (Array.isArray(r.data) ? r.data : []);
      const mapped = raw.map(d => ({
        ...d,
        dosya_id: d.id || d.dosya_id,
        gelir: (parseFloat(d.toplam_gelir || d.gelir) || 0),
        gider: (parseFloat(d.toplam_gider || d.gider) || 0) + (parseFloat(d.toplam_masraf || d.masraf) || 0),
        komisyon: (parseFloat(d.toplam_komisyon || d.komisyon) || 0),
        musteri: d.musteri || d.musteri_adi || d.sigorta_sirket || d.dosya_turu || '-'
      }));
      setVeriler(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  /* ÖZET İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    let topGelir = 0, topGider = 0, topKomisyon = 0, karli = 0, zarari = 0;
    veriler.forEach(d => {
      const gelir = parseFloat(d.gelir) || 0;
      const gider = parseFloat(d.gider) || 0;
      const komisyon = parseFloat(d.komisyon) || 0;
      topGelir += gelir;
      topGider += gider;
      topKomisyon += komisyon;
      const net = gelir - gider - komisyon;
      if (net >= 0) karli++; else zarari++;
    });
    const netKar = topGelir - topGider - topKomisyon;
    const karMarji = topGelir > 0 ? ((netKar / topGelir) * 100).toFixed(1) : '0.0';
    return {topGelir, topGider, topKomisyon, netKar, karMarji, karli, zarari, toplam: veriler.length};
  }, [veriler]);

  if (loading) return <Loading/>;

  return (
    <div>
      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="TrendingUp" label="TOPLAM GELİR" value={fmt(istatistik.topGelir)} color={C.success}/>
        <StatCard icon="TrendingDown" label="TOPLAM GİDER" value={fmt(istatistik.topGider)} color={C.danger}/>
        <StatCard icon="Activity" label="NET KAR" value={fmt(istatistik.netKar)} color={istatistik.netKar >= 0 ? C.success : C.danger}/>
        <StatCard icon="PieChart" label="KAR MARJI" value={`%${istatistik.karMarji}`} color={C.purple}/>
      </div>

      {/* ÖZET BANNER */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:20}}>
        <div style={{background:`${C.success}11`,borderRadius:12,border:`1px solid ${C.success}33`,padding:16,textAlign:'center'}}>
          <div style={{fontSize:28,fontWeight:900,color:C.success}}>{istatistik.karli}</div>
          <div style={{fontSize:11,color:C.textSec,marginTop:4}}>KARLI DOSYA</div>
        </div>
        <div style={{background:`${C.danger}11`,borderRadius:12,border:`1px solid ${C.danger}33`,padding:16,textAlign:'center'}}>
          <div style={{fontSize:28,fontWeight:900,color:C.danger}}>{istatistik.zarari}</div>
          <div style={{fontSize:11,color:C.textSec,marginTop:4}}>ZARARDA DOSYA</div>
        </div>
        <div style={{background:`${C.accent}11`,borderRadius:12,border:`1px solid ${C.accent}33`,padding:16,textAlign:'center'}}>
          <div style={{fontSize:28,fontWeight:900,color:C.accent}}>{istatistik.toplam}</div>
          <div style={{fontSize:11,color:C.textSec,marginTop:4}}>TOPLAM DOSYA</div>
        </div>
      </div>

      {/* MALİYET TABLOSU */}
      <div style={S.card}>
        <SectionTitle icon="PieChart" title="DOSYA BAZLI MALİYET ANALİZİ"
          sub={`${veriler.length} DOSYA ANALİZ EDİLDİ`}
          right={
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={yukle}>
              <LIcon name="RefreshCw" size={13} color={C.textSec}/> YENİLE
            </button>
          }/>

        <div style={{overflowX:'auto'}}>
          {veriler.length === 0 ? (
            <EmptyState icon="PieChart" title="MALİYET VERİSİ YOK" desc="ANALİZ EDİLECEK DOSYA BULUNMAMAKTADIR"/>
          ) : (
            <>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['DOSYA NO','MÜŞTERİ','GELİR','GİDER','KOMİSYON','NET KAR','KAR MARJI %'].map(h =>
                      <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {veriler.map((d, i) => {
                    const gelir = parseFloat(d.gelir) || 0;
                    const gider = parseFloat(d.gider) || 0;
                    const komisyon = parseFloat(d.komisyon) || 0;
                    const net = gelir - gider - komisyon;
                    const marj = gelir > 0 ? ((net / gelir) * 100).toFixed(1) : '0.0';
                    const pozitif = net >= 0;
                    return (
                      <tr key={d.dosya_id || i} style={{borderBottom:`1px solid ${C.border}`,background: pozitif ? 'transparent' : `${C.danger}06`}}
                        onMouseEnter={e=>e.currentTarget.style.background= pozitif ? C.bgHover : `${C.danger}11`}
                        onMouseLeave={e=>e.currentTarget.style.background= pozitif ? 'transparent' : `${C.danger}06`}>
                        <td style={{padding:'10px 12px'}}>
                          <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => d.dosya_id && setPage('dosya-detay-' + d.dosya_id)}>
                            {d.dosya_no || d.dosya_id || '-'}
                          </span>
                        </td>
                        <td style={{padding:'10px 12px',fontWeight:600}}>{d.musteri || d.musteri_adi || '-'}</td>
                        <td style={{padding:'10px 12px',color:C.success,fontWeight:600}}>{fmt(gelir)}</td>
                        <td style={{padding:'10px 12px',color:C.danger,fontWeight:600}}>{fmt(gider)}</td>
                        <td style={{padding:'10px 12px',color:C.warning,fontWeight:600}}>{fmt(komisyon)}</td>
                        <td style={{padding:'10px 12px',fontWeight:700,color: pozitif ? C.success : C.danger,fontSize:12}}>
                          {pozitif ? '+' : ''}{fmt(net)}
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{flex:1,height:6,background:C.bgHover,borderRadius:3,overflow:'hidden',maxWidth:80}}>
                              <div style={{width: `${Math.min(Math.abs(parseFloat(marj)), 100)}%`, height:'100%', background: pozitif ? C.success : C.danger, borderRadius:3, transition:'width .3s'}}/>
                            </div>
                            <span style={{fontSize:11,fontWeight:700,color: pozitif ? C.success : C.danger}}>%{marj}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:`${C.accent}08`,borderTop:`2px solid ${C.border}`}}>
                    <td style={{padding:'12px',fontWeight:800,fontSize:12}} colSpan={2}>GENEL TOPLAM</td>
                    <td style={{padding:'12px',fontWeight:800,color:C.success,fontSize:12}}>{fmt(istatistik.topGelir)}</td>
                    <td style={{padding:'12px',fontWeight:800,color:C.danger,fontSize:12}}>{fmt(istatistik.topGider)}</td>
                    <td style={{padding:'12px',fontWeight:800,color:C.warning,fontSize:12}}>{fmt(istatistik.topKomisyon)}</td>
                    <td style={{padding:'12px',fontWeight:800,color: istatistik.netKar >= 0 ? C.success : C.danger,fontSize:12}}>{fmt(istatistik.netKar)}</td>
                    <td style={{padding:'12px',fontWeight:800,color:C.purple,fontSize:12}}>%{istatistik.karMarji}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 6 – FİNANSAL RAPORLAR
   ═══════════════════════════════════════════════════════════ */
const FinansalRaporlar = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, Badge, Loading, EmptyState, api, fmt} = MR;
  const [loading, setLoading] = useState(true);
  const [rapor, setRapor] = useState(null);
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    let data = null;
    const r = await api.finansalRapor(p);
    if (r?.success) data = r.data;
    else {
      const r2 = await api.muhasebeRapor(p);
      if (r2?.success) data = r2.data;
    }
    if (data) {
      /* Backend genel_ozet döner - düzleştir */
      const ozet = data.genel_ozet || {};
      const mapped = {
        toplam_gelir: ozet.toplam_gelir ?? data.toplam_gelir ?? 0,
        toplam_gider: (parseFloat(ozet.toplam_gider ?? data.toplam_gider ?? 0)) + (parseFloat(ozet.toplam_masraf ?? data.toplam_masraf ?? 0)),
        toplam_komisyon: ozet.toplam_komisyon ?? data.toplam_komisyon ?? 0,
        dosya_sayisi: (data.kaynak_analiz || []).reduce((t, k) => t + (parseInt(k.dosya_sayisi) || 0), 0) || data.dosya_sayisi || 0,
        /* aylik_trend → aylik */
        aylik: (data.aylik_trend || data.aylik || []).map(a => ({
          ...a,
          donem: a.ay || a.donem,
          gelir: parseFloat(a.gelir) || 0,
          gider: (parseFloat(a.gider) || 0) + (parseFloat(a.masraf) || 0)
        })),
        /* gider_ozet + gelir_ozet → kategoriler */
        kategoriler: [
          ...(data.gelir_ozet || []).map(g => ({kategori: g.gelir_turu || 'GELİR', tutar: parseFloat(g.toplam) || 0, tip:'gelir'})),
          ...(data.gider_ozet || []).map(g => ({kategori: g.gider_turu || 'GİDER', tutar: parseFloat(g.toplam) || 0, tip:'gider'})),
          ...(data.masraf_ozet || []).map(g => ({kategori: g.masraf_kalemi || 'MASRAF', tutar: parseFloat(g.toplam) || 0, tip:'masraf'})),
          ...(data.komisyon_ozet || []).map(g => ({kategori: g.komisyon_turu || 'KOMİSYON', tutar: parseFloat(g.toplam) || 0, tip:'komisyon'}))
        ].filter(k => k.tutar > 0).sort((a, b) => b.tutar - a.tutar),
        /* aylik_trend detay olarak kullan */
        detay: (data.aylik_trend || data.aylik || data.detay || []).map(a => ({
          donem: a.ay || a.donem,
          gelir: parseFloat(a.gelir) || 0,
          gider: (parseFloat(a.gider) || 0) + (parseFloat(a.masraf) || 0),
          komisyon: 0,
          dosya_sayisi: a.dosya_sayisi || ''
        })),
        kaynak_analiz: data.kaynak_analiz || [],
        kasalar: data.kasalar || []
      };
      setRapor(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  const raporGetir = () => { yukle(); };

  /* ÖZET BİLGİLER */
  const toplamGelir = parseFloat(rapor?.toplam_gelir) || 0;
  const toplamGider = parseFloat(rapor?.toplam_gider) || 0;
  const toplamKomisyon = parseFloat(rapor?.toplam_komisyon) || 0;
  const netKar = toplamGelir - toplamGider - toplamKomisyon;
  const dosyaSayisi = rapor?.dosya_sayisi || 0;

  /* AYLIK VERİLER */
  const aylikVeriler = rapor?.aylik || [];
  const maxAylikDeger = useMemo(() => {
    if (!aylikVeriler.length) return 1;
    return Math.max(...aylikVeriler.map(a => Math.max(parseFloat(a.gelir) || 0, parseFloat(a.gider) || 0)), 1);
  }, [aylikVeriler]);

  /* KATEGORİ DAĞILIMI */
  const kategoriler = rapor?.kategoriler || [];
  const kategoriToplam = useMemo(() => {
    return kategoriler.reduce((t, k) => t + (parseFloat(k.tutar) || 0), 0) || 1;
  }, [kategoriler]);

  const kategoriRenkler = [C.accent, C.success, C.warning, C.purple, C.cyan, C.pink, C.gold, C.danger];

  /* DETAY VERİLERİ */
  const detaylar = rapor?.detay || [];

  return (
    <div>
      {/* TARİH FİLTRE */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <LIcon name="Calendar" size={16} color={C.accent}/>
            <span style={{fontSize:13,fontWeight:700}}>RAPOR DÖNEMİ</span>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div>
              <label style={{...S.label,marginBottom:2}}>BAŞLANGIÇ</label>
              <input type="date" style={{...S.input,width:160,fontSize:11}} value={baslangic} onChange={e => setBaslangic(e.target.value)}/>
            </div>
            <div style={{paddingTop:16,color:C.textMuted}}>—</div>
            <div>
              <label style={{...S.label,marginBottom:2}}>BİTİŞ</label>
              <input type="date" style={{...S.input,width:160,fontSize:11}} value={bitis} onChange={e => setBitis(e.target.value)}/>
            </div>
          </div>
          <button style={{...S.btn,...S.btnP,fontSize:11,marginLeft:8}} onClick={raporGetir}>
            <LIcon name="Search" size={14} color="#fff"/> RAPOR GETİR
          </button>
          <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setBaslangic('');setBitis('');setRapor(null);setTimeout(yukle,100);}}>
            <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
          </button>
        </div>
      </div>

      {loading ? <Loading/> : !rapor ? (
        <EmptyState icon="BarChart3" title="RAPOR VERİSİ YOK" desc="RAPOR VERİLERİ YÜKLENEMEDİ"/>
      ) : (
        <>
          {/* ÖZET KARTLAR */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            <StatCard icon="TrendingUp" label="TOPLAM GELİR" value={fmt(toplamGelir)} color={C.success}/>
            <StatCard icon="TrendingDown" label="TOPLAM GİDER" value={fmt(toplamGider)} color={C.danger}/>
            <StatCard icon="Activity" label="NET KAR / ZARAR" value={fmt(netKar)} color={netKar >= 0 ? C.success : C.danger}/>
            <StatCard icon="FileText" label="DOSYA SAYISI" value={dosyaSayisi} color={C.purple}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
            {/* AYLIK TREND GRAFİĞİ */}
            <div style={S.card}>
              <SectionTitle icon="BarChart3" title="AYLIK TREND" sub="GELİR / GİDER KARŞILAŞTIRMASI"/>
              <div style={S.cardBody}>
                {aylikVeriler.length === 0 ? (
                  <EmptyState icon="BarChart3" title="AYLIK VERİ YOK" desc="SEÇİLEN DÖNEMDE AYLIK VERİ BULUNMAMAKTADIR"/>
                ) : (
                  <div>
                    {/* LEJANT */}
                    <div style={{display:'flex',gap:20,marginBottom:20,justifyContent:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:12,height:12,borderRadius:3,background:C.success}}/>
                        <span style={{fontSize:11,color:C.textSec,fontWeight:600}}>GELİR</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:12,height:12,borderRadius:3,background:C.danger}}/>
                        <span style={{fontSize:11,color:C.textSec,fontWeight:600}}>GİDER</span>
                      </div>
                    </div>

                    {/* BAR GRAFİĞİ */}
                    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:200,padding:'0 10px'}}>
                      {aylikVeriler.map((ay, i) => {
                        const gelir = parseFloat(ay.gelir) || 0;
                        const gider = parseFloat(ay.gider) || 0;
                        const gelirH = Math.max((gelir / maxAylikDeger) * 160, 2);
                        const giderH = Math.max((gider / maxAylikDeger) * 160, 2);
                        return (
                          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                            <div style={{display:'flex',alignItems:'flex-end',gap:3,height:170}}>
                              <div title={`GELİR: ${fmt(gelir)}`} style={{
                                width:16, height:gelirH, background:`linear-gradient(to top, ${C.success}, ${C.success}cc)`,
                                borderRadius:'4px 4px 0 0', cursor:'pointer', transition:'all .3s', minHeight:2
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
                              onMouseLeave={e => e.currentTarget.style.opacity='1'}/>
                              <div title={`GİDER: ${fmt(gider)}`} style={{
                                width:16, height:giderH, background:`linear-gradient(to top, ${C.danger}, ${C.danger}cc)`,
                                borderRadius:'4px 4px 0 0', cursor:'pointer', transition:'all .3s', minHeight:2
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
                              onMouseLeave={e => e.currentTarget.style.opacity='1'}/>
                            </div>
                            <div style={{fontSize:9,color:C.textMuted,fontWeight:600,marginTop:4,whiteSpace:'nowrap'}}>
                              {ay.ay || ay.donem || `AY ${i+1}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* SKALA */}
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:12,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                      <span style={{fontSize:9,color:C.textMuted}}>₺0</span>
                      <span style={{fontSize:9,color:C.textMuted}}>{fmt(maxAylikDeger / 2)}</span>
                      <span style={{fontSize:9,color:C.textMuted}}>{fmt(maxAylikDeger)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* KATEGORİ DAĞILIMI */}
            <div style={S.card}>
              <SectionTitle icon="PieChart" title="KATEGORİ DAĞILIMI" sub="GELİR / GİDER KATEGORİLERİ"/>
              <div style={S.cardBody}>
                {kategoriler.length === 0 ? (
                  <EmptyState icon="PieChart" title="KATEGORİ VERİSİ YOK" desc="KATEGORİ BAZLI VERİ BULUNMAMAKTADIR"/>
                ) : (
                  <div>
                    {/* HALKA GRAFİĞİ */}
                    <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
                      <div style={{width:120,height:120,borderRadius:'50%',background:`conic-gradient(${
                        kategoriler.map((k, i) => {
                          const yuzde = ((parseFloat(k.tutar) || 0) / kategoriToplam) * 100;
                          const oncekiToplam = kategoriler.slice(0, i).reduce((t, kk) => t + ((parseFloat(kk.tutar) || 0) / kategoriToplam) * 100, 0);
                          return `${kategoriRenkler[i % kategoriRenkler.length]} ${oncekiToplam}% ${oncekiToplam + yuzde}%`;
                        }).join(', ')
                      })`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <div style={{width:70,height:70,borderRadius:'50%',background:C.bgCard,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <span style={{fontSize:11,fontWeight:700,color:C.textSec}}>TOPLAM</span>
                        </div>
                      </div>
                    </div>

                    {/* KATEGORİ LİSTESİ */}
                    {kategoriler.map((k, i) => {
                      const tutar = parseFloat(k.tutar) || 0;
                      const yuzde = ((tutar / kategoriToplam) * 100).toFixed(1);
                      const renk = kategoriRenkler[i % kategoriRenkler.length];
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                          <div style={{width:10,height:10,borderRadius:3,background:renk,flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,fontWeight:600}}>{(k.kategori || k.tur || 'DİĞER').toUpperCase()}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:12,fontWeight:700,color:renk}}>{fmt(tutar)}</div>
                            <div style={{fontSize:9,color:C.textMuted}}>%{yuzde}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DETAYLI RAPOR TABLOSU */}
          {detaylar.length > 0 && (
            <div style={{...S.card, marginTop:20}}>
              <SectionTitle icon="FileText" title="DETAYLI RAPOR" sub="DÖNEM BAZLI GELİR-GİDER DETAYI"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {['DÖNEM','GELİR','GİDER','KOMİSYON','NET','DOSYA SAYISI'].map(h =>
                        <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {detaylar.map((d, i) => {
                      const gelir = parseFloat(d.gelir) || 0;
                      const gider = parseFloat(d.gider) || 0;
                      const komisyon = parseFloat(d.komisyon) || 0;
                      const net = gelir - gider - komisyon;
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'10px 12px',fontWeight:600}}>{d.donem || d.ay || '-'}</td>
                          <td style={{padding:'10px 12px',color:C.success,fontWeight:600}}>{fmt(gelir)}</td>
                          <td style={{padding:'10px 12px',color:C.danger,fontWeight:600}}>{fmt(gider)}</td>
                          <td style={{padding:'10px 12px',color:C.warning,fontWeight:600}}>{fmt(komisyon)}</td>
                          <td style={{padding:'10px 12px',fontWeight:700,color: net >= 0 ? C.success : C.danger}}>{fmt(net)}</td>
                          <td style={{padding:'10px 12px',color:C.textSec}}>{d.dosya_sayisi || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:`${C.accent}08`,borderTop:`2px solid ${C.border}`}}>
                      <td style={{padding:'12px',fontWeight:800,fontSize:12}}>TOPLAM</td>
                      <td style={{padding:'12px',fontWeight:800,color:C.success,fontSize:12}}>{fmt(toplamGelir)}</td>
                      <td style={{padding:'12px',fontWeight:800,color:C.danger,fontSize:12}}>{fmt(toplamGider)}</td>
                      <td style={{padding:'12px',fontWeight:800,color:C.warning,fontSize:12}}>{fmt(toplamKomisyon)}</td>
                      <td style={{padding:'12px',fontWeight:800,color:netKar >= 0 ? C.success : C.danger,fontSize:12}}>{fmt(netKar)}</td>
                      <td style={{padding:'12px',fontWeight:600,color:C.textSec}}>{dosyaSayisi || '-'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* NET KAR/ZARAR BANNER */}
          <div style={{marginTop:20,background: netKar >= 0 ? `${C.success}11` : `${C.danger}11`,borderRadius:12,border:`1px solid ${netKar >= 0 ? C.success + '33' : C.danger + '33'}`,padding:24,textAlign:'center'}}>
            <div style={{fontSize:12,color:C.textSec,fontWeight:600,marginBottom:8,letterSpacing:1}}>
              {baslangic || bitis ? 'SEÇİLEN DÖNEM' : 'GENEL'} NET SONUÇ
            </div>
            <div style={{fontSize:36,fontWeight:900,color: netKar >= 0 ? C.success : C.danger,letterSpacing:-1}}>
              {fmt(netKar)}
            </div>
            <div style={{marginTop:8}}>
              <Badge text={netKar >= 0 ? 'KAR' : 'ZARAR'} color={netKar >= 0 ? C.success : C.danger}/>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 7 – KAPANIŞ RAPORU (AVUKAT BAZLI + GENEL)
   ═══════════════════════════════════════════════════════════ */
const KapanisRaporu = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, Badge, Loading, EmptyState, api, fmt} = MR;
  const [loading, setLoading] = useState(false);
  const [rapor, setRapor] = useState(null);
  const [baslangic, setBaslangic] = useState(new Date().toISOString().slice(0,7) + '-01');
  const [bitis, setBitis] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0,10));
  const [gorunum, setGorunum] = useState('avukat'); // 'avukat' veya 'genel'
  const [seciliAvukat, setSeciliAvukat] = useState(null);

  const raporGetir = async () => {
    setLoading(true);
    const r = await api.kapanisRapor({baslangic, bitis});
    if (r?.success) setRapor(r.data);
    setLoading(false);
  };

  const donemAyarla = (ay) => {
    const d = new Date(ay + '-01');
    setBaslangic(d.toISOString().slice(0,10));
    const son = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setBitis(son.toISOString().slice(0,10));
  };

  const genelToplam = rapor?.genel_toplam || {};
  const avukatGruplari = rapor?.avukat_gruplari || [];
  const devir = rapor?.onceki_donem_devir || 0;

  // Tüm dosyalar düz liste
  const tumDosyalar = useMemo(() => {
    const list = [];
    avukatGruplari.forEach(g => { (g.dosyalar || []).forEach(d => list.push({...d, avukat_adi: g.avukat_adi})); });
    return list;
  }, [avukatGruplari]);

  return (
    <div>
      {/* DÖNEM SEÇİCİ */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{padding:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <LIcon name="Calendar" size={16} color={C.accent}/>
          <span style={{fontSize:12,fontWeight:700}}>DÖNEM:</span>
          <input type="month" value={baslangic.slice(0,7)}
            onChange={e => donemAyarla(e.target.value)}
            style={{...S.input,width:180,fontSize:12}}/>
          <button onClick={raporGetir} disabled={loading}
            style={{...S.btn,...S.btnP,fontSize:11,padding:'8px 20px'}}>
            <LIcon name="Search" size={14} color="#fff"/> {loading ? 'YÜKLENİYOR...' : 'RAPOR GETİR'}
          </button>
          <div style={{flex:1}}/>
          <div style={{display:'flex',gap:4}}>
            <button onClick={() => setGorunum('avukat')}
              style={{...S.btn,fontSize:10,padding:'6px 14px',
                background: gorunum==='avukat' ? `${C.accent}22` : 'transparent',
                border:`1px solid ${gorunum==='avukat' ? C.accent+'44' : C.border}`,
                color: gorunum==='avukat' ? C.accent : C.textSec}}>
              <LIcon name="Users" size={12}/> AVUKAT BAZLI
            </button>
            <button onClick={() => setGorunum('genel')}
              style={{...S.btn,fontSize:10,padding:'6px 14px',
                background: gorunum==='genel' ? `${C.accent}22` : 'transparent',
                border:`1px solid ${gorunum==='genel' ? C.accent+'44' : C.border}`,
                color: gorunum==='genel' ? C.accent : C.textSec}}>
              <LIcon name="List" size={12}/> GENEL
            </button>
          </div>
        </div>
      </div>

      {!rapor && !loading && (
        <EmptyState icon="FileCheck" title="KAPANIŞ RAPORU" desc="DÖNEM SEÇİP 'RAPOR GETİR' BUTONUNA BASIN"/>
      )}

      {loading && <Loading/>}

      {rapor && !loading && (
        <>
          {/* GENEL ÖZET KARTLARI */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            <StatCard icon="FileCheck" label="KAPANAN DOSYA" value={genelToplam.dosya_sayisi || 0} color={C.accent}/>
            <StatCard icon="TrendingUp" label="TOPLAM TAHSİLAT" value={fmt(genelToplam.toplam_tahsilat || 0)} color={C.success}/>
            <StatCard icon="TrendingDown" label="TOPLAM MASRAF" value={fmt(genelToplam.toplam_masraf || 0)} color={C.danger}/>
            <StatCard icon="DollarSign" label="NET KAR" value={fmt(genelToplam.toplam_net_kar || 0)} color={(genelToplam.toplam_net_kar||0) >= 0 ? C.success : C.danger}/>
          </div>

          {/* %50-%50 PAYLAŞIM BANNER */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:20}}>
            <div style={{...S.card,padding:16,textAlign:'center',background:`${C.accent}08`,border:`1px solid ${C.accent}22`}}>
              <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:4}}>BENİM PAYIM (%50)</div>
              <div style={{fontSize:22,fontWeight:900,color:C.accent}}>{fmt(genelToplam.toplam_benim_payim || 0)}</div>
            </div>
            <div style={{...S.card,padding:16,textAlign:'center',background:`${C.purple || '#8b5cf6'}08`,border:`1px solid ${C.purple || '#8b5cf6'}22`}}>
              <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:4}}>AVUKAT PAYI (%50)</div>
              <div style={{fontSize:22,fontWeight:900,color:C.purple || '#8b5cf6'}}>{fmt(genelToplam.toplam_avukat_payi || 0)}</div>
            </div>
            <div style={{...S.card,padding:16,textAlign:'center',background:`${C.warning}08`,border:`1px solid ${C.warning}22`}}>
              <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:4}}>YÖNLENDİREN ÜCRETLERİ</div>
              <div style={{fontSize:22,fontWeight:900,color:C.warning}}>{fmt(genelToplam.toplam_yonlendiren || 0)}</div>
            </div>
          </div>

          {/* ÖNCEKİ DÖNEM DEVİR */}
          {devir > 0 && (
            <div style={{...S.card,padding:14,marginBottom:20,background:`${C.warning}08`,border:`1px solid ${C.warning}22`,display:'flex',alignItems:'center',gap:10}}>
              <LIcon name="ArrowRight" size={16} color={C.warning}/>
              <span style={{fontSize:12,fontWeight:600}}>ÖNCEKİ DÖNEMDEN DEVİR (ÖDENMEMİŞ MASRAFLAR):</span>
              <span style={{fontSize:14,fontWeight:800,color:C.warning}}>{fmt(devir)}</span>
            </div>
          )}

          {/* AVUKAT BAZLI GÖRÜNÜM */}
          {gorunum === 'avukat' && (
            <div>
              {avukatGruplari.length === 0 ? (
                <EmptyState icon="Users" title="KAPANAN DOSYA YOK" desc="SEÇİLEN DÖNEMDE KAPANAN DOSYA BULUNMAMAKTADIR"/>
              ) : (
                avukatGruplari.map((g, gi) => (
                  <div key={gi} style={{...S.card, marginBottom:16}}>
                    {/* AVUKAT BAŞLIK */}
                    <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}06`,cursor:'pointer'}}
                      onClick={() => setSeciliAvukat(seciliAvukat === gi ? null : gi)}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <LIcon name="User" size={16} color={C.accent}/>
                        <span style={{fontSize:13,fontWeight:700}}>{g.avukat_adi}</span>
                        <Badge text={g.dosya_sayisi + ' DOSYA'} color={C.accent}/>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:16}}>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:9,color:C.textMuted}}>TAHSİLAT</div>
                          <div style={{fontSize:13,fontWeight:700,color:C.success}}>{fmt(g.toplam_tahsilat)}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:9,color:C.textMuted}}>MASRAF</div>
                          <div style={{fontSize:13,fontWeight:700,color:C.danger}}>{fmt(g.toplam_masraf)}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:9,color:C.textMuted}}>NET KAR</div>
                          <div style={{fontSize:13,fontWeight:700,color:g.toplam_net_kar >= 0 ? C.success : C.danger}}>{fmt(g.toplam_net_kar)}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:9,color:C.textMuted}}>BENİM PAYIM</div>
                          <div style={{fontSize:13,fontWeight:700,color:C.accent}}>{fmt(g.toplam_benim_payim)}</div>
                        </div>
                        <LIcon name={seciliAvukat === gi ? 'ChevronUp' : 'ChevronDown'} size={16} color={C.textMuted}/>
                      </div>
                    </div>

                    {/* DOSYA DETAYLARI TABLOSU */}
                    {seciliAvukat === gi && (
                      <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                          <thead>
                            <tr style={{background:C.bgHover}}>
                              {['DOSYA NO','MÜVEKKİL','TÜR','TAHSİLAT','MASRAF','YÖN. ÜCRET','NET KAR','PAY (%50)'].map(h =>
                                <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:700,fontSize:10,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {(g.dosyalar || []).map((d, di) => (
                              <tr key={di} style={{borderBottom:`1px solid ${C.border}`}}
                                onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                <td style={{padding:'8px 12px',fontWeight:600,color:C.accent}}>{d.dosya_no}</td>
                                <td style={{padding:'8px 12px'}}>{d.muvekkil}</td>
                                <td style={{padding:'8px 12px'}}><Badge text={d.dosya_turu} color={d.dosya_turu==='ADK'?C.accent:d.dosya_turu==='BH'?C.danger:d.dosya_turu==='MDK'?'#f59e0b':C.textMuted}/></td>
                                <td style={{padding:'8px 12px',fontWeight:600,color:C.success}}>{fmt(d.tahsilat)}</td>
                                <td style={{padding:'8px 12px',fontWeight:600,color:C.danger}}>{fmt(d.masraf)}</td>
                                <td style={{padding:'8px 12px',fontWeight:600,color:C.warning}}>{fmt(d.yonlendiren_ucret)}</td>
                                <td style={{padding:'8px 12px',fontWeight:700,color:d.net_kar >= 0 ? C.success : C.danger}}>{fmt(d.net_kar)}</td>
                                <td style={{padding:'8px 12px',fontWeight:700,color:C.accent}}>{fmt(d.benim_payim)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{background:`${C.accent}08`,borderTop:`2px solid ${C.border}`}}>
                              <td colSpan={3} style={{padding:'10px 12px',fontWeight:800,fontSize:11}}>TOPLAM ({g.dosya_sayisi} DOSYA)</td>
                              <td style={{padding:'10px 12px',fontWeight:800,color:C.success}}>{fmt(g.toplam_tahsilat)}</td>
                              <td style={{padding:'10px 12px',fontWeight:800,color:C.danger}}>{fmt(g.toplam_masraf)}</td>
                              <td style={{padding:'10px 12px',fontWeight:800,color:C.warning}}>{fmt(g.toplam_yonlendiren)}</td>
                              <td style={{padding:'10px 12px',fontWeight:800,color:g.toplam_net_kar >= 0 ? C.success : C.danger}}>{fmt(g.toplam_net_kar)}</td>
                              <td style={{padding:'10px 12px',fontWeight:800,color:C.accent}}>{fmt(g.toplam_benim_payim)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* GENEL GÖRÜNÜM - TÜM DOSYALAR TEK TABLODA */}
          {gorunum === 'genel' && (
            <div style={S.card}>
              <SectionTitle icon="FileCheck" title="TÜM KAPANAN DOSYALAR" sub={`${baslangic} — ${bitis} DÖNEMİ`}/>
              {tumDosyalar.length === 0 ? (
                <div style={S.cardBody}>
                  <EmptyState icon="FileCheck" title="KAPANAN DOSYA YOK" desc="SEÇİLEN DÖNEMDE KAPANAN DOSYA BULUNMAMAKTADIR"/>
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:C.bgHover}}>
                        {['#','DOSYA NO','MÜVEKKİL','TÜR','AVUKAT','TAHSİLAT','MASRAF','YÖN. ÜCRET','NET KAR','PAY (%50)'].map(h =>
                          <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:700,fontSize:10,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tumDosyalar.map((d, i) => (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'8px 12px',color:C.textMuted}}>{i+1}</td>
                          <td style={{padding:'8px 12px',fontWeight:600,color:C.accent}}>{d.dosya_no}</td>
                          <td style={{padding:'8px 12px'}}>{d.muvekkil}</td>
                          <td style={{padding:'8px 12px'}}><Badge text={d.dosya_turu} color={d.dosya_turu==='ADK'?C.accent:d.dosya_turu==='BH'?C.danger:d.dosya_turu==='MDK'?'#f59e0b':C.textMuted}/></td>
                          <td style={{padding:'8px 12px',fontSize:10}}>{d.avukat_adi}</td>
                          <td style={{padding:'8px 12px',fontWeight:600,color:C.success}}>{fmt(d.tahsilat)}</td>
                          <td style={{padding:'8px 12px',fontWeight:600,color:C.danger}}>{fmt(d.masraf)}</td>
                          <td style={{padding:'8px 12px',fontWeight:600,color:C.warning}}>{fmt(d.yonlendiren_ucret)}</td>
                          <td style={{padding:'8px 12px',fontWeight:700,color:d.net_kar >= 0 ? C.success : C.danger}}>{fmt(d.net_kar)}</td>
                          <td style={{padding:'8px 12px',fontWeight:700,color:C.accent}}>{fmt(d.benim_payim)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:`${C.accent}08`,borderTop:`2px solid ${C.border}`}}>
                        <td colSpan={5} style={{padding:'10px 12px',fontWeight:800,fontSize:11}}>GENEL TOPLAM ({genelToplam.dosya_sayisi} DOSYA)</td>
                        <td style={{padding:'10px 12px',fontWeight:800,color:C.success}}>{fmt(genelToplam.toplam_tahsilat)}</td>
                        <td style={{padding:'10px 12px',fontWeight:800,color:C.danger}}>{fmt(genelToplam.toplam_masraf)}</td>
                        <td style={{padding:'10px 12px',fontWeight:800,color:C.warning}}>{fmt(genelToplam.toplam_yonlendiren)}</td>
                        <td style={{padding:'10px 12px',fontWeight:800,color:(genelToplam.toplam_net_kar||0) >= 0 ? C.success : C.danger}}>{fmt(genelToplam.toplam_net_kar)}</td>
                        <td style={{padding:'10px 12px',fontWeight:800,color:C.accent}}>{fmt(genelToplam.toplam_benim_payim)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* GENEL SONUÇ BANNER */}
          <div style={{marginTop:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{background:`${C.success}11`,borderRadius:12,border:`1px solid ${C.success}33`,padding:20,textAlign:'center'}}>
              <div style={{fontSize:11,color:C.textSec,fontWeight:600,marginBottom:6,letterSpacing:0.5}}>GELEN ÖDEME (TAHSİLAT)</div>
              <div style={{fontSize:28,fontWeight:900,color:C.success}}>{fmt(genelToplam.toplam_tahsilat || 0)}</div>
            </div>
            <div style={{background:`${C.danger}11`,borderRadius:12,border:`1px solid ${C.danger}33`,padding:20,textAlign:'center'}}>
              <div style={{fontSize:11,color:C.textSec,fontWeight:600,marginBottom:6,letterSpacing:0.5}}>TOPLAM MASRAFLAR</div>
              <div style={{fontSize:28,fontWeight:900,color:C.danger}}>{fmt(genelToplam.toplam_masraf || 0)}</div>
            </div>
          </div>
          <div style={{marginTop:14,background:(genelToplam.toplam_net_kar||0) >= 0 ? `${C.success}11` : `${C.danger}11`,borderRadius:12,border:`1px solid ${(genelToplam.toplam_net_kar||0) >= 0 ? C.success+'33' : C.danger+'33'}`,padding:24,textAlign:'center'}}>
            <div style={{fontSize:12,color:C.textSec,fontWeight:600,marginBottom:8,letterSpacing:1}}>
              KALAN (NET KAR) — {baslangic.slice(0,7).replace('-','/')} DÖNEMİ
            </div>
            <div style={{fontSize:36,fontWeight:900,color:(genelToplam.toplam_net_kar||0) >= 0 ? C.success : C.danger,letterSpacing:-1}}>
              {fmt(genelToplam.toplam_net_kar || 0)}
            </div>
            <div style={{marginTop:8}}>
              <Badge text={(genelToplam.toplam_net_kar||0) >= 0 ? 'KAR' : 'ZARAR'} color={(genelToplam.toplam_net_kar||0) >= 0 ? C.success : C.danger}/>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5b – İŞ ORTAĞI ORTAK KASA
   İki iş ortağının tek kasadan ortak işlem yaptığı paylaşımlı kasa
   ═══════════════════════════════════════════════════════════ */
const OrtakKasa = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, api, fmt, fmtInput, parseNum} = MR;
  const [kasalar, setKasalar] = useState([]);
  const [ortaklar, setOrtaklar] = useState([]);
  const [hareketler, setHareketler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [hareketModal, setHareketModal] = useState(false);
  const [seciliKasa, setSeciliKasa] = useState(null);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const [kayitLoading, setKayitLoading] = useState(false);

  /* KASA FORMU */
  const [kasaForm, setKasaForm] = useState({ad:'', tip:'Nakit', banka_adi:'', hesap_no:'', iban:'', ortak1_id:'', ortak2_id:''});
  const kUp = (k,v) => setKasaForm(p=>({...p,[k]:v}));

  /* HAREKET FORMU */
  const [hForm, setHForm] = useState({islem_turu:'gelir', tutar:'', aciklama:'', tarih:''});
  const hUp = (k,v) => setHForm(p=>({...p,[k]:v}));

  const yukle = async () => {
    setLoading(true);
    const [kR, oR] = await Promise.all([api.kasaList(), api.ortakList({durum:'aktif',limit:200})]);
    if (kR?.success) {
      const tumKasalar = kR.data || [];
      setKasalar(tumKasalar.filter(k => k.ortak_kasa_tipi === 'ortak'));
    }
    if (oR?.success) setOrtaklar(oR.data?.items || oR.data || []);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  const ortakAdi = (id) => { const o = ortaklar.find(o => o.id == id); return o ? o.ad_soyad : '-'; };

  /* ORTAK KASA OLUŞTUR */
  const kasaOlustur = async () => {
    if (!kasaForm.ad.trim()) { setHata('KASA ADI GEREKLİ'); return; }
    if (!kasaForm.ortak1_id || !kasaForm.ortak2_id) { setHata('İKİ İŞ ORTAĞI SEÇİMİ ZORUNLUDUR'); return; }
    if (kasaForm.ortak1_id === kasaForm.ortak2_id) { setHata('İKİ FARKLI İŞ ORTAĞI SEÇİNİZ'); return; }
    setKayitLoading(true); setHata('');
    const r = await api.kasaCreate({
      ad: kasaForm.ad,
      tip: kasaForm.tip,
      banka_adi: kasaForm.banka_adi,
      hesap_no: kasaForm.hesap_no,
      iban: kasaForm.iban,
      ortak_kasa_tipi: 'ortak',
      ortak_ids: kasaForm.ortak1_id + ',' + kasaForm.ortak2_id
    });
    if (r?.success) {
      setModalAcik(false);
      setBasari('ORTAK KASA BAŞARIYLA OLUŞTURULDU');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* HAREKET EKLE */
  const hareketEkle = async () => {
    if (!seciliKasa) return;
    const tutarNum = parseNum(hForm.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    setKayitLoading(true); setHata('');
    const isGelir = hForm.islem_turu === 'gelir';
    if (isGelir) {
      const r = await api.gelirCreate({kasa_id:seciliKasa.id, tur:'ORTAK KASA GİRİŞ', tutar:tutarNum, aciklama:hForm.aciklama || 'ORTAK KASA GİRİŞ', tarih:hForm.tarih || undefined});
      if (r?.success) { setHareketModal(false); setBasari('GİRİŞ BAŞARIYLA KAYDEDİLDİ'); yukle(); setTimeout(()=>setBasari(''),3000); }
      else setHata(r?.error || 'KAYIT HATASI');
    } else {
      const r = await api.giderCreate({kasa_id:seciliKasa.id, kategori:'ORTAK KASA ÇIKIŞ', tutar:tutarNum, aciklama:hForm.aciklama || 'ORTAK KASA ÇIKIŞ', tarih:hForm.tarih || undefined});
      if (r?.success) { setHareketModal(false); setBasari('ÇIKIŞ BAŞARIYLA KAYDEDİLDİ'); yukle(); setTimeout(()=>setBasari(''),3000); }
      else setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* HAREKET LİSTESİ */
  const hareketYukle = async (kasaId) => {
    const r = await api.kasaHareketler({kasa_id:kasaId, limit:100});
    if (r?.success) setHareketler(r.data?.items || r.data || []);
  };

  const kasaDetayAc = (kasa) => {
    setSeciliKasa(kasa);
    hareketYukle(kasa.id);
  };

  const yeniKasaAc = () => {
    setKasaForm({ad:'İŞ ORTAĞI ORTAK KASA', tip:'Nakit', banka_adi:'', hesap_no:'', iban:'', ortak1_id:'', ortak2_id:''});
    setHata(''); setModalAcik(true);
  };

  const yeniHareketAc = () => {
    setHForm({islem_turu:'gelir', tutar:'', aciklama:'', tarih: new Date().toISOString().slice(0,10)});
    setHata(''); setHareketModal(true);
  };

  /* İSTATİSTİKLER */
  const toplamBakiye = useMemo(() => kasalar.reduce((t,k) => t + (parseFloat(k.bakiye)||0), 0), [kasalar]);

  return (
    <div className="fade-in">
      <SectionTitle icon="Users" title="İŞ ORTAĞI ORTAK KASA" sub="İKİ İŞ ORTAĞININ PAYLAŞIMLI KASASI"/>
      <BasariMesaji mesaj={basari}/>

      {/* ÜST İSTATİSTİKLER */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        <StatCard icon="Wallet" label="ORTAK KASA SAYISI" value={kasalar.length} color={C.accent}/>
        <StatCard icon="TrendingUp" label="TOPLAM BAKİYE" value={fmt(toplamBakiye)} color={C.success}/>
        <StatCard icon="Users" label="İŞ ORTAĞI SAYISI" value={ortaklar.length} color={C.purple}/>
      </div>

      {/* YENİ ORTAK KASA BUTONU */}
      <div style={{marginBottom:20}}>
        <button style={{...S.btn,...S.btnP}} onClick={yeniKasaAc}>
          <LIcon name="Plus" size={14} color="#fff"/> YENİ ORTAK KASA OLUŞTUR
        </button>
      </div>

      {loading ? <Loading/> : kasalar.length === 0 ? (
        <EmptyState icon="Users" title="ORTAK KASA BULUNAMADI" subtitle="YENİ ORTAK KASA OLUŞTURMAK İÇİN BUTONA TIKLAYIN"/>
      ) : (
        <div style={{display:'grid',gap:16}}>
          {kasalar.map(kasa => {
            const ortakIds = (kasa.ortak_ids || '').split(',').map(Number);
            const secili = seciliKasa?.id === kasa.id;
            return (
              <div key={kasa.id} style={{...S.card, border: secili ? `2px solid ${C.accent}` : `1px solid ${C.border}`}}>
                <div style={{...S.cardHead, cursor:'pointer'}} onClick={() => secili ? setSeciliKasa(null) : kasaDetayAc(kasa)}>
                  <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg, '+C.accent+'22, '+C.accent+'44)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <LIcon name="Users" size={18} color={C.accent}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:800,color:C.text}}>{kasa.ad}</div>
                    <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>
                      {ortakIds.map(id => ortakAdi(id)).join(' & ')} — {kasa.tip === 'Banka' ? 'BANKA' : 'NAKİT'}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:10,color:C.textMuted,fontWeight:600}}>BAKİYE</div>
                    <div style={{fontSize:22,fontWeight:900,color: (parseFloat(kasa.bakiye)||0) >= 0 ? C.success : C.danger}}>{fmt(kasa.bakiye)}</div>
                  </div>
                  <LIcon name={secili ? 'ChevronDown' : 'ChevronRight'} size={18} color={C.textMuted}/>
                </div>

                {/* DETAY BÖLÜMÜ */}
                {secili && (
                  <div style={{padding:20}}>
                    {/* ORTAKLAR */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                      {ortakIds.map(id => {
                        const ortak = ortaklar.find(o => o.id === id);
                        return ortak ? (
                          <div key={id} style={{padding:16,background:`${C.accent}08`,borderRadius:12,border:`1px solid ${C.accent}22`}}>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <div style={{width:40,height:40,borderRadius:10,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <LIcon name="User" size={18} color={C.accent}/>
                              </div>
                              <div>
                                <div style={{fontSize:13,fontWeight:700,color:C.text}}>{ortak.ad_soyad}</div>
                                <div style={{fontSize:10,color:C.textMuted}}>{ortak.firma || '-'} | %{ortak.odeme_orani || 0}</div>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>

                    {/* İŞLEM BUTONLARI */}
                    <div style={{display:'flex',gap:8,marginBottom:20}}>
                      <button style={{...S.btn,...S.btnP,fontSize:11,padding:'8px 16px'}} onClick={yeniHareketAc}>
                        <LIcon name="Plus" size={13} color="#fff"/> GİRİŞ / ÇIKIŞ
                      </button>
                    </div>

                    {/* HAREKET TABLOSU */}
                    <div style={{background:C.bgHover,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
                      <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8}}>
                        <LIcon name="ArrowLeftRight" size={14} color={C.accent}/>
                        <span style={{fontSize:13,fontWeight:700}}>ORTAK KASA HAREKETLERİ</span>
                        <Badge text={hareketler.length + ' KAYIT'} color={C.accent}/>
                      </div>
                      {hareketler.length === 0 ? (
                        <div style={{padding:30,textAlign:'center',color:C.textMuted,fontSize:12}}>
                          <LIcon name="ArrowLeftRight" size={28} color={C.textMuted} style={{opacity:0.3,marginBottom:8}}/>
                          <div>HENÜZ HAREKET KAYDI BULUNMAMAKTADIR</div>
                        </div>
                      ) : (
                        <div style={{overflowX:'auto'}}>
                          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                            <thead>
                              <tr style={{background:C.accent+'08'}}>
                                {['TARİH','İŞLEM TÜRÜ','TUTAR','BAKİYE SONRASI','AÇIKLAMA'].map(h =>
                                  <th key={h} style={{padding:'8px 12px',textAlign:'left',color:C.textMuted,fontWeight:800,fontSize:10,borderBottom:'2px solid '+C.border}}>{h}</th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {hareketler.map((h,i) => {
                                const tutar = parseFloat(h.tutar)||0;
                                const isGelir = h.islem_turu === 'gelir' || h.islem_turu === 'transfer_giris';
                                return (
                                  <tr key={h.id||i} style={{borderBottom:'1px solid '+C.border}}
                                    onMouseEnter={e => e.currentTarget.style.background=C.bgCard}
                                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                    <td style={{padding:'8px 12px',color:C.textSec}}>{h.created_at?.split(' ')[0] || '-'}</td>
                                    <td style={{padding:'8px 12px'}}>
                                      <Badge text={(h.islem_turu||'').toUpperCase()} color={isGelir ? C.success : C.danger}/>
                                    </td>
                                    <td style={{padding:'8px 12px',fontWeight:700,color:isGelir?C.success:C.danger}}>
                                      {isGelir?'+':'-'}{fmt(tutar)}
                                    </td>
                                    <td style={{padding:'8px 12px',fontWeight:600,color:C.accent}}>{fmt(h.bakiye_sonrasi)}</td>
                                    <td style={{padding:'8px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.aciklama||'-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* YENİ ORTAK KASA MODAL */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title="YENİ ORTAK KASA OLUŞTUR" width="600px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA ADI *" full>
            <input style={S.input} value={kasaForm.ad} onChange={e => kUp('ad', e.target.value.toUpperCase())} placeholder="ORTAK KASA ADI"/>
          </FormGroup>
          <FormGroup label="1. İŞ ORTAĞI *">
            <select style={S.select} value={kasaForm.ortak1_id} onChange={e => kUp('ortak1_id', e.target.value)}>
              <option value="">ORTAK SEÇİNİZ</option>
              {ortaklar.map(o => <option key={o.id} value={o.id}>{o.ad_soyad}{o.firma ? ' - '+o.firma : ''}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="2. İŞ ORTAĞI *">
            <select style={S.select} value={kasaForm.ortak2_id} onChange={e => kUp('ortak2_id', e.target.value)}>
              <option value="">ORTAK SEÇİNİZ</option>
              {ortaklar.filter(o => String(o.id) !== String(kasaForm.ortak1_id)).map(o => <option key={o.id} value={o.id}>{o.ad_soyad}{o.firma ? ' - '+o.firma : ''}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="TÜR">
            <select style={S.select} value={kasaForm.tip} onChange={e => kUp('tip', e.target.value)}>
              <option value="Nakit">NAKİT</option>
              <option value="Banka">BANKA</option>
            </select>
          </FormGroup>
          {kasaForm.tip === 'Banka' && (
            <>
              <FormGroup label="BANKA ADI">
                <input style={S.input} value={kasaForm.banka_adi} onChange={e => kUp('banka_adi', e.target.value.toUpperCase())} placeholder="BANKA ADI"/>
              </FormGroup>
              <FormGroup label="HESAP NO">
                <input style={S.input} value={kasaForm.hesap_no} onChange={e => kUp('hesap_no', e.target.value)} placeholder="HESAP NO"/>
              </FormGroup>
              <FormGroup label="IBAN" full>
                <input style={S.input} value={kasaForm.iban} onChange={e => kUp('iban', e.target.value.toUpperCase())} placeholder="TR..." maxLength={34}/>
              </FormGroup>
            </>
          )}
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={kasaOlustur} disabled={kayitLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'OLUŞTUR'}
          </button>
        </div>
      </Modal>

      {/* HAREKET EKLEME MODAL */}
      <Modal open={hareketModal} onClose={() => setHareketModal(false)} title={'ORTAK KASA İŞLEM — ' + (seciliKasa?.ad || '')} width="500px">
        <HataMesaji mesaj={hata}/>
        {seciliKasa && (
          <div style={{padding:12,background:C.accent+'11',borderRadius:8,marginBottom:16,border:'1px solid '+C.accent+'22'}}>
            <div style={{fontSize:12,fontWeight:700}}>BAKİYE: <span style={{color:C.success}}>{fmt(seciliKasa.bakiye)}</span></div>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="İŞLEM TÜRÜ *">
            <select style={S.select} value={hForm.islem_turu} onChange={e => hUp('islem_turu', e.target.value)}>
              <option value="gelir">GİRİŞ (+)</option>
              <option value="gider">ÇIKIŞ (-)</option>
            </select>
          </FormGroup>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:13,fontWeight:700}}>&#8378;</span>
              <input style={{...S.input,paddingLeft:26,fontWeight:700}} value={hForm.tutar}
                onChange={e => hUp('tutar', fmtInput(e.target.value))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="TARİH">
            <MR.DateInput value={hForm.tarih} onChange={v => hUp('tarih', v)}/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={hForm.aciklama}
              onChange={e => hUp('aciklama', e.target.value.toUpperCase())} placeholder="İŞLEM AÇIKLAMASI"/>
          </FormGroup>
        </div>
        <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setHareketModal(false)}>İPTAL</button>
          <button style={{...S.btn,...(hForm.islem_turu==='gelir' ? S.btnP : S.btnD)}} onClick={hareketEkle} disabled={kayitLoading}>
            <LIcon name={hForm.islem_turu==='gelir'?'TrendingUp':'TrendingDown'} size={14} color="#fff"/>
            {kayitLoading ? 'KAYDEDİLİYOR...' : (hForm.islem_turu==='gelir' ? 'GİRİŞ KAYDET' : 'ÇIKIŞ KAYDET')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 9 – AY SONU RAPORU (KAPSAMLI)
   PDF formatında: Ortak hesabı + MR net kazanç + Final özet
   ═══════════════════════════════════════════════════════════ */
const AySonuRaporu = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, api, fmt} = MR;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ay, setAy] = useState(new Date().toISOString().slice(0,7));
  const [ortakId, setOrtakId] = useState('');
  const [ortaklar, setOrtaklar] = useState([]);

  const yukle = async () => {
    setLoading(true);
    const p = {ay};
    if (ortakId) p.ortak_id = ortakId;
    const r = await api.aySonuRapor(p);
    if (r?.success) {
      setData(r.data);
      if (r.data?.ortaklar_listesi) setOrtaklar(r.data.ortaklar_listesi);
    }
    setLoading(false);
  };

  useEffect(() => { yukle(); }, [ay, ortakId]);

  const b1 = data?.bolum1;
  const b2 = data?.bolum2;
  const fin = data?.final;

  /* PDF yazdırma - Beyaz arka plan, okunabilir çıktı */
  const yazdir = () => {
    const el = document.getElementById('aysonu-rapor-icerik');
    if (!el) return;
    var w = window.open('', '_blank');
    var css = [
      'body{font-family:"Segoe UI",Tahoma,sans-serif;padding:30px 40px;color:#1a1a2e;background:#fff;font-size:12px;line-height:1.6}',
      'table{width:100%;border-collapse:collapse;margin:8px 0}',
      'th,td{border:1px solid #bbb;padding:8px 10px;text-align:left;font-size:11px}',
      'th{background:#eef0f4;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:.5px;font-size:10px}',
      'svg{display:none}',
      '@media print{body{padding:10px}@page{margin:12mm}}'
    ].join('');
    w.document.write('<html><head><title>AY SONU RAPORU - ' + (data?.donem?.ay_adi || ay) + '</title><style>' + css + '</style></head><body>' + el.innerHTML + '</body></html>');
    w.document.close();
    setTimeout(function(){
      try {
        /* Tüm elementlerin inline dark-theme stillerini temizle */
        var allEls = w.document.body.getElementsByTagName('*');
        for (var i = 0; i < allEls.length; i++) {
          var s = allEls[i].style;
          /* Arka planları temizle (koyu tema renkleri) */
          if (s.background) s.background = '';
          if (s.backgroundColor) s.backgroundColor = '';
          if (s.backgroundImage) s.backgroundImage = '';
          s.boxShadow = 'none';
          s.textShadow = 'none';
          /* Açık/beyaz yazı renklerini koyuya çevir */
          var c = w.getComputedStyle(allEls[i]).color;
          var m = c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          if (m) {
            var lum = (parseInt(m[1])*299 + parseInt(m[2])*587 + parseInt(m[3])*114) / 1000;
            if (lum > 180) allEls[i].style.color = '#1a1a2e';
          }
        }
        /* Tablo başlıklarını geri ayarla */
        var ths = w.document.getElementsByTagName('th');
        for (var j = 0; j < ths.length; j++) {
          ths[j].style.background = '#eef0f4';
          ths[j].style.color = '#333';
        }
        /* Toplam satırlarına hafif arka plan */
        var trs = w.document.getElementsByTagName('tr');
        for (var k = 0; k < trs.length; k++) {
          var cells = trs[k].getElementsByTagName('td');
          if (cells.length > 0) {
            var txt = (cells[0].textContent || '').toUpperCase();
            if (txt.includes('TOPLAM') || txt.includes('ÖZET') || txt.includes('KALAN')) {
              trs[k].style.background = '#f5f5fa';
              trs[k].style.fontWeight = '700';
            }
          }
        }
      } catch(e) { console.error('YAZDIR HATA:', e); }
      w.print();
    }, 400);
  };

  return (
    React.createElement('div', {className:'fade-in'},
      React.createElement(SectionTitle, {icon:'CalendarCheck', title:'AY SONU RAPORU', sub:'Kapsamlı aylık finansal rapor'}),

      /* FİLTRELER */
      React.createElement('div', {style:{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap',alignItems:'flex-end'}},
        React.createElement('div', null,
          React.createElement('label', {style:{fontSize:10,color:C.textMuted,fontWeight:600,display:'block',marginBottom:4}}, 'DÖNEM'),
          React.createElement('input', {type:'month', value:ay, onChange:function(e){setAy(e.target.value)}, style:Object.assign({},S.input,{width:180})})
        ),
        React.createElement('div', null,
          React.createElement('label', {style:{fontSize:10,color:C.textMuted,fontWeight:600,display:'block',marginBottom:4}}, 'ORTAK / YATIRIMCI'),
          React.createElement('select', {value:ortakId, onChange:function(e){setOrtakId(e.target.value)}, style:Object.assign({},S.input,{width:220})},
            React.createElement('option', {value:''}, '— TÜM DOSYALAR —'),
            ortaklar.map(function(o){ return React.createElement('option', {key:o.id, value:o.id}, o.ad_soyad + (o.firma ? ' (' + o.firma + ')' : '')); })
          )
        ),
        React.createElement('button', {onClick:yukle, style:Object.assign({},S.btn,S.btnP,{fontSize:12,padding:'10px 18px'})},
          React.createElement(LIcon, {name:'RefreshCw', size:14, color:'#fff'}), ' YENİLE'
        ),
        data && React.createElement('button', {onClick:yazdir, style:Object.assign({},S.btn,{fontSize:12,padding:'10px 18px',background:'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)',color:'#fff',fontWeight:800,border:'none',boxShadow:'0 4px 14px -2px rgba(16,185,129,0.55), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',borderBottom:'2px solid #047857'})},
          React.createElement(LIcon, {name:'Printer', size:14, color:'#fff'}), ' YAZDIR / PDF'
        )
      ),

      loading && React.createElement(Loading, null),
      !loading && !data && React.createElement(EmptyState, {icon:'FileText', title:'VERİ BULUNAMADI', subtitle:'Dönem seçimi yapın'}),

      !loading && data && React.createElement('div', {id:'aysonu-rapor-icerik'},

        /* BAŞLIK */
        React.createElement('div', {style:{textAlign:'center',marginBottom:24,padding:20,background:'linear-gradient(135deg, '+C.accent+'11, '+C.accent+'22)',borderRadius:16,border:'1px solid '+C.accent+'33'}},
          React.createElement('div', {style:{fontSize:13,color:C.textMuted,fontWeight:600,letterSpacing:1}}, 'MR HASAR DANIŞMANLIK'),
          React.createElement('div', {style:{fontSize:22,fontWeight:900,color:C.text,marginTop:4}}, 'KAPSAMLI AY SONU RAPORU'),
          React.createElement('div', {style:{fontSize:32,fontWeight:900,color:C.accent,marginTop:4}}, data.donem?.ay_adi || ay),
          data.ortak && React.createElement('div', {style:{marginTop:8}}, React.createElement(Badge, {text:data.ortak.ad_soyad, color:C.accent}))
        ),

        /* ═══ BÖLÜM 1 ═══ */
        b1 && b1.dosya_sayisi > 0 && React.createElement('div', {style:{marginBottom:24}},
          React.createElement('div', {style:{padding:14,background:(C.info||C.accent)+'11',borderRadius:12,border:'1px solid '+(C.info||C.accent)+'33',marginBottom:16}},
            React.createElement('div', {style:{fontSize:14,fontWeight:800,color:C.text}},
              'BÖLÜM 1: ' + (data.ortak ? data.ortak.ad_soyad + ' — DOSYA MASRAFLARI HESABI' : 'AYLIK DOSYA MASRAFLARI')
            )
          ),

          /* Ortaktan alınan ödeme */
          data.ortak && b1.ortak_toplam_odeme > 0 && React.createElement('div', {style:{background:C.bgCard,borderRadius:12,border:'1px solid '+C.border,padding:16,marginBottom:16}},
            React.createElement('div', {style:{fontSize:11,color:C.textSec,fontWeight:600,marginBottom:8}}, 'AY İÇİNDE ' + data.ortak.ad_soyad + '\'DAN ALINAN ÖDEME'),
            React.createElement('table', {style:{width:'100%',borderCollapse:'collapse'}},
              React.createElement('thead', null,
                React.createElement('tr', {style:{background:C.bgHover}},
                  React.createElement('th', {style:{padding:'8px 12px',textAlign:'left',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'AÇIKLAMA'),
                  React.createElement('th', {style:{padding:'8px 12px',textAlign:'right',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'TUTAR')
                )
              ),
              React.createElement('tbody', null,
                b1.ortak_odemeleri.map(function(o,i){
                  return React.createElement('tr', {key:i},
                    React.createElement('td', {style:{padding:'8px 12px',fontSize:11,borderBottom:'1px solid '+C.border+'22'}}, o.aciklama || (data.ortak.ad_soyad + ' - ' + (o.tur||'').toUpperCase())),
                    React.createElement('td', {style:{padding:'8px 12px',fontSize:12,fontWeight:700,textAlign:'right',color:C.success,borderBottom:'1px solid '+C.border+'22'}}, fmt(o.tutar))
                  );
                }),
                React.createElement('tr', {style:{background:C.bgHover}},
                  React.createElement('td', {style:{padding:'10px 12px',fontSize:12,fontWeight:800}}, 'TOPLAM ALINAN'),
                  React.createElement('td', {style:{padding:'10px 12px',fontSize:14,fontWeight:900,textAlign:'right',color:C.success}}, fmt(b1.ortak_toplam_odeme))
                )
              )
            )
          ),

          /* Dosya masrafları tablosu */
          React.createElement('div', {style:{background:C.bgCard,borderRadius:12,border:'1px solid '+C.border,padding:16,marginBottom:16}},
            React.createElement('div', {style:{fontSize:11,color:C.textSec,fontWeight:600,marginBottom:8}},
              (data.donem?.ay_adi||'') + ' DOSYA MASRAFLARI (' + b1.dosya_sayisi + ' DOSYA)'
            ),
            React.createElement('div', {style:{overflowX:'auto'}},
              React.createElement('table', {style:{width:'100%',borderCollapse:'collapse',minWidth:600}},
                React.createElement('thead', null,
                  React.createElement('tr', {style:{background:C.bgHover}},
                    React.createElement('th', {style:{padding:'8px 10px',textAlign:'left',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'TARİH'),
                    React.createElement('th', {style:{padding:'8px 10px',textAlign:'left',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'MAĞDUR ADI SOYADI'),
                    React.createElement('th', {style:{padding:'8px 10px',textAlign:'center',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'DOSYA TÜRÜ'),
                    React.createElement('th', {style:{padding:'8px 10px',textAlign:'center',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'KAYNAK'),
                    React.createElement('th', {style:{padding:'8px 10px',textAlign:'right',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'MASRAF')
                  )
                ),
                React.createElement('tbody', null,
                  (b1.dosyalar||[]).map(function(d,i){
                    return React.createElement('tr', {key:i, style:{background: i%2===0 ? 'transparent' : C.bgHover+'44'}},
                      React.createElement('td', {style:{padding:'6px 10px',fontSize:11,borderBottom:'1px solid '+C.border+'22'}},
                        d.acilis_tarihi ? new Date(d.acilis_tarihi).toLocaleDateString('tr-TR') : '-'
                      ),
                      React.createElement('td', {style:{padding:'6px 10px',fontSize:11,fontWeight:600,borderBottom:'1px solid '+C.border+'22'}}, d.magdur_adi || '-'),
                      React.createElement('td', {style:{padding:'6px 10px',fontSize:11,textAlign:'center',borderBottom:'1px solid '+C.border+'22'}},
                        React.createElement(Badge, {text:d.dosya_turu, color:d.dosya_turu==='ADK' ? (C.info||C.accent) : d.dosya_turu==='BH' ? C.warning : C.success})
                      ),
                      React.createElement('td', {style:{padding:'6px 10px',fontSize:10,textAlign:'center',borderBottom:'1px solid '+C.border+'22'}},
                        React.createElement(Badge, {text:d.kaynak_kisa, color:d.kaynak_kisa==='OFİS CRM' ? C.accent : C.warning})
                      ),
                      React.createElement('td', {style:{padding:'6px 10px',fontSize:12,fontWeight:700,textAlign:'right',borderBottom:'1px solid '+C.border+'22',color:C.danger}}, fmt(d.toplam_masraf))
                    );
                  }),
                  React.createElement('tr', {style:{background:C.bgHover}},
                    React.createElement('td', {colSpan:4, style:{padding:'10px 12px',fontSize:12,fontWeight:800}}, 'TOPLAM DOSYA MASRAFLARI'),
                    React.createElement('td', {style:{padding:'10px 12px',fontSize:14,fontWeight:900,textAlign:'right',color:C.danger}}, fmt(b1.toplam_dosya_masraf))
                  )
                )
              )
            )
          ),

          /* Dosya türü dağılımı */
          b1.tur_dagilimi && Object.keys(b1.tur_dagilimi).length > 0 && React.createElement('div', {style:{background:C.bgCard,borderRadius:12,border:'1px solid '+C.border,padding:16,marginBottom:16}},
            React.createElement('div', {style:{fontSize:11,color:C.textSec,fontWeight:600,marginBottom:8}}, 'DOSYA TÜRÜ DAĞILIMI'),
            React.createElement('table', {style:{width:'100%',borderCollapse:'collapse',maxWidth:400}},
              React.createElement('thead', null,
                React.createElement('tr', {style:{background:C.bgHover}},
                  React.createElement('th', {style:{padding:'8px 12px',textAlign:'left',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'DOSYA TÜRÜ'),
                  React.createElement('th', {style:{padding:'8px 12px',textAlign:'right',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'ADET')
                )
              ),
              React.createElement('tbody', null,
                Object.entries(b1.tur_dagilimi).map(function(e){
                  var tur=e[0], adet=e[1];
                  var turAdi = tur==='ADK' ? 'Araç Değer Kaybı (ADK)' : tur==='BH' ? 'Bedeni Hasar (BH)' : tur==='MDK' ? 'Maddi Hasar (MDK)' : tur;
                  return React.createElement('tr', {key:tur},
                    React.createElement('td', {style:{padding:'6px 12px',fontSize:11,borderBottom:'1px solid '+C.border+'22'}}, turAdi),
                    React.createElement('td', {style:{padding:'6px 12px',fontSize:12,fontWeight:700,textAlign:'right',borderBottom:'1px solid '+C.border+'22'}}, adet)
                  );
                }),
                React.createElement('tr', {style:{background:C.bgHover}},
                  React.createElement('td', {style:{padding:'8px 12px',fontSize:12,fontWeight:800}}, 'TOPLAM DOSYA'),
                  React.createElement('td', {style:{padding:'8px 12px',fontSize:14,fontWeight:900,textAlign:'right'}}, b1.dosya_sayisi)
                )
              )
            )
          ),

          /* Bölüm 1 Özet */
          data.ortak && React.createElement('div', {style:{background:C.warning+'11',borderRadius:12,border:'1px solid '+C.warning+'33',padding:20,marginBottom:16}},
            React.createElement('div', {style:{fontSize:12,fontWeight:800,color:C.text,marginBottom:12}}, 'BÖLÜM 1 ÖZET — ' + data.ortak.ad_soyad + ' HESABI'),
            React.createElement('table', {style:{width:'100%',borderCollapse:'collapse'}},
              React.createElement('tbody', null,
                b1.ortak_toplam_odeme > 0 && React.createElement('tr', null,
                  React.createElement('td', {style:{padding:'8px 0',fontSize:12}}, data.ortak.ad_soyad + '\'dan Alınan'),
                  React.createElement('td', {style:{padding:'8px 0',fontSize:14,fontWeight:700,textAlign:'right',color:C.success}}, fmt(b1.ortak_toplam_odeme))
                ),
                React.createElement('tr', null,
                  React.createElement('td', {style:{padding:'8px 0',fontSize:12}}, 'Dosya Masrafları (' + b1.dosya_sayisi + ' Dosya)'),
                  React.createElement('td', {style:{padding:'8px 0',fontSize:14,fontWeight:700,textAlign:'right',color:C.danger}}, fmt(b1.toplam_dosya_masraf))
                ),
                b1.diger_masraf_yarisi > 0 && React.createElement('tr', null,
                  React.createElement('td', {style:{padding:'8px 0',fontSize:12}}, 'Diğer Masraflar (Yarısı - ' + data.ortak.ad_soyad + ' Payı)'),
                  React.createElement('td', {style:{padding:'8px 0',fontSize:14,fontWeight:700,textAlign:'right',color:C.danger}}, fmt(b1.diger_masraf_yarisi))
                ),
                React.createElement('tr', {style:{borderTop:'2px solid '+C.border}},
                  React.createElement('td', {style:{padding:'12px 0',fontSize:13,fontWeight:800}}, b1.ortak_alacak >= 0 ? 'KALAN ALACAK (Tahsil Edilecek)' : 'KALAN BAKİYE (Ortak Lehine)'),
                  React.createElement('td', {style:{padding:'12px 0',fontSize:20,fontWeight:900,textAlign:'right',color: b1.ortak_alacak >= 0 ? C.danger : C.success}}, fmt(Math.abs(b1.ortak_alacak)))
                )
              )
            )
          )
        ),

        /* ═══ BÖLÜM 2: MR NET KAZANÇ ═══ */
        React.createElement('div', {style:{marginBottom:24}},
          React.createElement('div', {style:{padding:14,background:C.success+'11',borderRadius:12,border:'1px solid '+C.success+'33',marginBottom:16}},
            React.createElement('div', {style:{fontSize:14,fontWeight:800,color:C.text}}, 'BÖLÜM 2: MR HASAR NET KAZANÇ')
          ),

          /* Diğer masraflar */
          b2 && b2.diger_masraflar && b2.diger_masraflar.length > 0 && React.createElement('div', {style:{background:C.bgCard,borderRadius:12,border:'1px solid '+C.border,padding:16,marginBottom:16}},
            React.createElement('div', {style:{fontSize:11,color:C.textSec,fontWeight:600,marginBottom:8}}, 'DİĞER MASRAFLAR'),
            React.createElement('table', {style:{width:'100%',borderCollapse:'collapse'}},
              React.createElement('thead', null,
                React.createElement('tr', {style:{background:C.bgHover}},
                  React.createElement('th', {style:{padding:'8px 12px',textAlign:'left',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'AÇIKLAMA'),
                  React.createElement('th', {style:{padding:'8px 12px',textAlign:'right',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'TUTAR')
                )
              ),
              React.createElement('tbody', null,
                b2.diger_masraflar.map(function(m,i){
                  return React.createElement('tr', {key:i},
                    React.createElement('td', {style:{padding:'6px 12px',fontSize:11,borderBottom:'1px solid '+C.border+'22'}}, m.aciklama || m.gider_turu),
                    React.createElement('td', {style:{padding:'6px 12px',fontSize:12,fontWeight:700,textAlign:'right',color:C.danger,borderBottom:'1px solid '+C.border+'22'}}, fmt(m.tutar))
                  );
                }),
                React.createElement('tr', {style:{background:C.bgHover}},
                  React.createElement('td', {style:{padding:'10px 12px',fontSize:12,fontWeight:800}}, 'DİĞER MASRAFLAR TOPLAMI'),
                  React.createElement('td', {style:{padding:'10px 12px',fontSize:14,fontWeight:900,textAlign:'right',color:C.danger}}, fmt(b2.toplam_diger_masraf))
                )
              )
            )
          ),

          /* Kapanan dosyalar kazancı */
          b2 && React.createElement('div', {style:{background:C.bgCard,borderRadius:12,border:'1px solid '+C.border,padding:16,marginBottom:16}},
            React.createElement('div', {style:{fontSize:11,color:C.textSec,fontWeight:600,marginBottom:8}},
              (data.donem?.ay_adi||'') + ' KAPANAN DOSYALAR KAZANCI'
            ),
            b2.kapanan_dosyalar && b2.kapanan_dosyalar.length > 0
              ? React.createElement(React.Fragment, null,
                  React.createElement('div', {style:{overflowX:'auto'}},
                    React.createElement('table', {style:{width:'100%',borderCollapse:'collapse',minWidth:500}},
                      React.createElement('thead', null,
                        React.createElement('tr', {style:{background:C.bgHover}},
                          React.createElement('th', {style:{padding:'8px 10px',textAlign:'left',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'DOSYA NO'),
                          React.createElement('th', {style:{padding:'8px 10px',textAlign:'left',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'MAĞDUR'),
                          React.createElement('th', {style:{padding:'8px 10px',textAlign:'right',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'GELİR'),
                          React.createElement('th', {style:{padding:'8px 10px',textAlign:'right',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'MASRAF'),
                          React.createElement('th', {style:{padding:'8px 10px',textAlign:'right',fontSize:10,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'NET')
                        )
                      ),
                      React.createElement('tbody', null,
                        b2.kapanan_dosyalar.map(function(kd,i){
                          return React.createElement('tr', {key:i},
                            React.createElement('td', {style:{padding:'6px 10px',fontSize:11,fontWeight:600,borderBottom:'1px solid '+C.border+'22'}}, kd.dosya_no),
                            React.createElement('td', {style:{padding:'6px 10px',fontSize:11,borderBottom:'1px solid '+C.border+'22'}}, kd.magdur_adi || '-'),
                            React.createElement('td', {style:{padding:'6px 10px',fontSize:11,fontWeight:700,textAlign:'right',color:C.success,borderBottom:'1px solid '+C.border+'22'}}, fmt(kd.toplam_gelir)),
                            React.createElement('td', {style:{padding:'6px 10px',fontSize:11,fontWeight:700,textAlign:'right',color:C.danger,borderBottom:'1px solid '+C.border+'22'}}, fmt(kd.toplam_masraf)),
                            React.createElement('td', {style:{padding:'6px 10px',fontSize:12,fontWeight:800,textAlign:'right',color:kd.net_kar>=0?C.success:C.danger,borderBottom:'1px solid '+C.border+'22'}}, fmt(kd.net_kar))
                          );
                        })
                      )
                    )
                  ),
                  React.createElement('div', {style:{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}},
                    React.createElement('div', {style:{background:C.success+'11',borderRadius:8,padding:12,textAlign:'center'}},
                      React.createElement('div', {style:{fontSize:10,color:C.textMuted,fontWeight:600}}, 'POZİTİF TOPLAM'),
                      React.createElement('div', {style:{fontSize:16,fontWeight:900,color:C.success,marginTop:4}}, fmt(b2.pozitif_toplam))
                    ),
                    React.createElement('div', {style:{background:C.danger+'11',borderRadius:8,padding:12,textAlign:'center'}},
                      React.createElement('div', {style:{fontSize:10,color:C.textMuted,fontWeight:600}}, 'MAHSUPLAR'),
                      React.createElement('div', {style:{fontSize:16,fontWeight:900,color:C.danger,marginTop:4}}, fmt(b2.mahsup_toplam))
                    ),
                    React.createElement('div', {style:{background:C.accent+'11',borderRadius:8,padding:12,textAlign:'center'}},
                      React.createElement('div', {style:{fontSize:10,color:C.textMuted,fontWeight:600}}, 'NET KAZANÇ'),
                      React.createElement('div', {style:{fontSize:16,fontWeight:900,color:C.accent,marginTop:4}}, fmt(b2.kapanan_net_kazanc))
                    )
                  )
                )
              : React.createElement('div', {style:{textAlign:'center',padding:20,color:C.textMuted,fontSize:12}}, 'Bu dönemde kapanan dosya bulunmamaktadır.')
          ),

          /* Bölüm 2 Özet */
          b2 && React.createElement('div', {style:{background:C.success+'11',borderRadius:12,border:'1px solid '+C.success+'33',padding:20,marginBottom:16}},
            React.createElement('div', {style:{fontSize:12,fontWeight:800,color:C.text,marginBottom:12}}, 'BÖLÜM 2 ÖZET'),
            React.createElement('table', {style:{width:'100%',borderCollapse:'collapse'}},
              React.createElement('tbody', null,
                React.createElement('tr', null,
                  React.createElement('td', {style:{padding:'8px 0',fontSize:12}}, 'Kapanan Dosyalar Net Kazancı'),
                  React.createElement('td', {style:{padding:'8px 0',fontSize:14,fontWeight:700,textAlign:'right',color:C.success}}, fmt(b2.kapanan_net_kazanc))
                ),
                b2.diger_masraf_yarisi > 0 && React.createElement('tr', null,
                  React.createElement('td', {style:{padding:'8px 0',fontSize:12}}, 'Diğer Masraflar (Yarısı - MR Payı)'),
                  React.createElement('td', {style:{padding:'8px 0',fontSize:14,fontWeight:700,textAlign:'right',color:C.danger}}, fmt(b2.diger_masraf_yarisi))
                ),
                React.createElement('tr', {style:{borderTop:'2px solid '+C.border}},
                  React.createElement('td', {style:{padding:'12px 0',fontSize:13,fontWeight:800}}, 'BÖLÜM 2 NET (MR KASASINA GİREN)'),
                  React.createElement('td', {style:{padding:'12px 0',fontSize:20,fontWeight:900,textAlign:'right',color: b2.mr_net_kazanc>=0?C.success:C.danger}},
                    (b2.mr_net_kazanc>=0?'+':'')+fmt(b2.mr_net_kazanc)
                  )
                )
              )
            )
          )
        ),

        /* ═══ ORTAK KASA BÖLÜMÜ ═══ */
        data.ortak_kasalar && data.ortak_kasalar.length > 0 && React.createElement('div', {style:{marginBottom:24}},
          React.createElement('div', {style:{padding:14,background:(C.purple||C.accent)+'11',borderRadius:12,border:'1px solid '+(C.purple||C.accent)+'33',marginBottom:16}},
            React.createElement('div', {style:{fontSize:14,fontWeight:800,color:C.text}}, 'İŞ ORTAĞI ORTAK KASA DURUMU')
          ),
          data.ortak_kasalar.map(function(ok, idx) {
            return React.createElement('div', {key:idx, style:{background:C.bgCard,borderRadius:12,border:'1px solid '+C.border,padding:16,marginBottom:12}},
              React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}},
                React.createElement('div', null,
                  React.createElement('div', {style:{fontSize:13,fontWeight:700,color:C.text}}, ok.ad),
                  React.createElement('div', {style:{fontSize:11,color:C.textMuted,marginTop:2}}, (ok.ortak_adlari||[]).join(' & '))
                ),
                React.createElement('div', {style:{textAlign:'right'}},
                  React.createElement('div', {style:{fontSize:10,color:C.textMuted,fontWeight:600}}, 'GÜNCEL BAKİYE'),
                  React.createElement('div', {style:{fontSize:22,fontWeight:900,color: ok.bakiye>=0?C.success:C.danger}}, fmt(ok.bakiye))
                )
              ),
              React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}},
                React.createElement('div', {style:{background:C.success+'11',borderRadius:8,padding:10,textAlign:'center'}},
                  React.createElement('div', {style:{fontSize:9,color:C.textMuted,fontWeight:600}}, 'AY İÇİ GİRİŞ'),
                  React.createElement('div', {style:{fontSize:14,fontWeight:800,color:C.success,marginTop:2}}, fmt(ok.ay_giris))
                ),
                React.createElement('div', {style:{background:C.danger+'11',borderRadius:8,padding:10,textAlign:'center'}},
                  React.createElement('div', {style:{fontSize:9,color:C.textMuted,fontWeight:600}}, 'AY İÇİ ÇIKIŞ'),
                  React.createElement('div', {style:{fontSize:14,fontWeight:800,color:C.danger,marginTop:2}}, fmt(ok.ay_cikis))
                ),
                React.createElement('div', {style:{background:C.accent+'11',borderRadius:8,padding:10,textAlign:'center'}},
                  React.createElement('div', {style:{fontSize:9,color:C.textMuted,fontWeight:600}}, 'AY NET'),
                  React.createElement('div', {style:{fontSize:14,fontWeight:800,color:ok.ay_net>=0?C.success:C.danger,marginTop:2}}, (ok.ay_net>=0?'+':'')+fmt(ok.ay_net))
                )
              ),
              ok.hareketler && ok.hareketler.length > 0 && React.createElement('table', {style:{width:'100%',borderCollapse:'collapse'}},
                React.createElement('thead', null,
                  React.createElement('tr', {style:{background:C.bgHover}},
                    React.createElement('th', {style:{padding:'6px 10px',textAlign:'left',fontSize:9,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'TARİH'),
                    React.createElement('th', {style:{padding:'6px 10px',textAlign:'left',fontSize:9,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'TÜR'),
                    React.createElement('th', {style:{padding:'6px 10px',textAlign:'right',fontSize:9,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'TUTAR'),
                    React.createElement('th', {style:{padding:'6px 10px',textAlign:'left',fontSize:9,color:C.textMuted,fontWeight:700,borderBottom:'1px solid '+C.border}}, 'AÇIKLAMA')
                  )
                ),
                React.createElement('tbody', null,
                  ok.hareketler.map(function(h,i){
                    var isGelir = h.islem_turu==='gelir'||h.islem_turu==='transfer_giris';
                    return React.createElement('tr', {key:i},
                      React.createElement('td', {style:{padding:'5px 10px',fontSize:10,borderBottom:'1px solid '+C.border+'22'}}, (h.created_at||'').split(' ')[0]||'-'),
                      React.createElement('td', {style:{padding:'5px 10px',fontSize:10,borderBottom:'1px solid '+C.border+'22',color:isGelir?C.success:C.danger,fontWeight:600}}, (h.islem_turu||'').toUpperCase()),
                      React.createElement('td', {style:{padding:'5px 10px',fontSize:11,fontWeight:700,textAlign:'right',borderBottom:'1px solid '+C.border+'22',color:isGelir?C.success:C.danger}}, (isGelir?'+':'-')+fmt(h.tutar)),
                      React.createElement('td', {style:{padding:'5px 10px',fontSize:10,borderBottom:'1px solid '+C.border+'22',color:C.textSec}}, h.aciklama||'-')
                    );
                  })
                )
              )
            );
          })
        ),

        /* ═══ FİNAL ÖZET ═══ */
        fin && React.createElement('div', {style:{padding:24,background:'linear-gradient(135deg, '+C.accent+'11, '+C.accent+'22)',borderRadius:16,border:'1px solid '+C.accent+'33',marginBottom:20}},
          React.createElement('div', {style:{textAlign:'center',fontSize:16,fontWeight:900,color:C.text,marginBottom:16}},
            'FİNAL ÖZET — ' + (data.donem?.ay_adi||'') + ' DURUM RAPORU'
          ),
          React.createElement('div', {style:{display:'grid',gridTemplateColumns: data.ortak ? '1fr 1fr' : '1fr',gap:16}},
            data.ortak && React.createElement('div', {style:{background:C.bgCard,borderRadius:12,padding:20,textAlign:'center',border:'1px solid '+C.border}},
              React.createElement('div', {style:{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:4}}, data.ortak.ad_soyad + '\'DAN ALINACAK ALACAK'),
              React.createElement('div', {style:{fontSize:28,fontWeight:900,color: fin.ortak_alacak>=0?C.danger:C.success}}, fmt(Math.abs(fin.ortak_alacak)))
            ),
            React.createElement('div', {style:{background:C.bgCard,borderRadius:12,padding:20,textAlign:'center',border:'1px solid '+C.border}},
              React.createElement('div', {style:{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:4}}, 'MR KASASINA GİREN NET KAZANÇ'),
              React.createElement('div', {style:{fontSize:28,fontWeight:900,color: fin.mr_net_kazanc>=0?C.success:C.danger}}, (fin.mr_net_kazanc>=0?'+':'')+fmt(fin.mr_net_kazanc))
            )
          ),
          fin.toplam_diger_masraf > 0 && data.ortak && React.createElement('div', {style:{marginTop:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}},
            React.createElement('div', {style:{background:C.warning+'11',borderRadius:10,padding:14,border:'1px solid '+C.warning+'33'}},
              React.createElement('div', {style:{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:2}}, data.ortak.ad_soyad + ' PAYI'),
              React.createElement('div', {style:{fontSize:11,color:C.text}}, 'Diğer Masraflar (Yarısı): ', React.createElement('strong', null, fmt(fin.ortak_diger_masraf_payi)))
            ),
            React.createElement('div', {style:{background:C.accent+'11',borderRadius:10,padding:14,border:'1px solid '+C.accent+'33'}},
              React.createElement('div', {style:{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:2}}, 'MR PAYI'),
              React.createElement('div', {style:{fontSize:11,color:C.text}}, 'Diğer Masraflar (Yarısı): ', React.createElement('strong', null, fmt(fin.mr_diger_masraf_payi)))
            )
          ),
          fin.toplam_diger_masraf > 0 && data.ortak && React.createElement('div', {style:{marginTop:10,fontSize:10,color:C.textMuted,textAlign:'center',fontStyle:'italic'}},
            'Not: Diğer masraflar (' + fmt(fin.toplam_diger_masraf) + ') her zaman yarı yarıya ' + data.ortak.ad_soyad + ' ve MR arasında paylaştırılır.'
          )
        ),

        /* MR KASA NET KAZANCI - BÜYÜK BANNER */
        fin && React.createElement('div', {style:{padding:24,background:(fin.mr_net_kazanc>=0?C.success:C.danger)+'15',borderRadius:16,border:'2px solid '+(fin.mr_net_kazanc>=0?C.success+'44':C.danger+'44'),textAlign:'center'}},
          React.createElement('div', {style:{fontSize:13,fontWeight:700,color:C.textSec,letterSpacing:1,marginBottom:8}},
            (data.donem?.ay_adi||'') + ' MR KASA NET KAZANCI'
          ),
          React.createElement('div', {style:{fontSize:40,fontWeight:900,color:fin.mr_net_kazanc>=0?C.success:C.danger}},
            (fin.mr_net_kazanc>=0?'+':'')+fmt(fin.mr_net_kazanc)
          ),
          React.createElement('div', {style:{fontSize:11,color:C.textMuted,marginTop:6}},
            'MR Kasasına giren net tutar (Kapanan dosyalar - diğer masrafların yarısı)'
          )
        )
      )
    )
  );
};
