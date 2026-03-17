/* ============================================================
   MR HASAR DANIŞMANLIK – PERSONEL YÖNETİMİ (personel.js)
   PERSONEL LİSTESİ, YENİ PERSONEL, HAKEDİŞ TAKİBİ
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef, useMemo, useCallback} = React;

/* ═══ PARA BİÇİMLENDİRME ═══ */
const paraBirim = (n) => {
  if (!n && n !== 0) return '₺0,00';
  return '₺' + Number(n).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
};

/* ═══ TARİH FORMAT ═══ */
const tarihFormat = (d) => {
  if (!d) return '-';
  const p = d.split('-');
  if (p.length === 3) return `${p[2]}.${p[1]}.${p[0]}`;
  return d;
};

/* ═══ DEPARTMANLAR ═══ */
const DEPARTMANLAR = ['HUKUK', 'SAHA', 'OFİS', 'MUHASEBE', 'İDARİ', 'BİLGİ TEKNOLOJİLERİ'];

/* ═══ OFİS ROLLERİ ═══ */
const OFIS_ROLLERI = ['OFİS ADK CRM', 'OFİS BH CRM', 'OFİS OPERASYON'];

/* ═══ BOŞ FORM ═══ */
const bosForm = () => ({
  ad_soyad: '', tc_kimlik: '', telefon: '', email: '',
  departman: '', pozisyon: '', maas: '', prim_adk: '', prim_bh: '',
  sgk_no: '', iban: '', il: '', adres: '',
  ise_baslama: '', durum: 'aktif', notlar: ''
});

/* ═══════════════════════════════════════════════════════════
   UYARI / BAŞARI MESAJLARI
   ═══════════════════════════════════════════════════════════ */
const HataMesaji = ({mesaj}) => {
  const {C, LIcon} = MR;
  if (!mesaj) return null;
  return (
    <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`,display:'flex',alignItems:'center',gap:6}}>
      <LIcon name="X" size={14} color={C.danger}/>{mesaj}
    </div>
  );
};

const BasariMesaji = ({mesaj}) => {
  const {C, LIcon} = MR;
  if (!mesaj) return null;
  return (
    <div style={{padding:10,background:`${C.success}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.success,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:6}}>
      <LIcon name="Check" size={14} color={C.success}/>{mesaj}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ – SEKME YAPISI
   ═══════════════════════════════════════════════════════════ */
MR.PersonelPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'liste';

  const sekmeler = [
    {key:'liste',    label:'PERSONEL LİSTESİ',  icon:'Users'},
    {key:'yeni',     label:'YENİ PERSONEL',      icon:'UserPlus'},
    {key:'hakedis',  label:'HAKEDİŞ TAKİBİ',    icon:'Calculator'}
  ];

  return (
    <div className="fade-in">
      {/* SEKME BAR */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('personel-' + s.key)}
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
      {aktifSekme === 'liste'   && <PersonelListesi setPage={setPage} user={user}/>}
      {aktifSekme === 'yeni'    && <YeniPersonel    setPage={setPage} user={user}/>}
      {aktifSekme === 'hakedis' && <HakedisTakibi   setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1 – PERSONEL LİSTESİ
   ═══════════════════════════════════════════════════════════ */
const PersonelListesi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api} = MR;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [durumF, setDurumF] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [secililer, setSecililer] = useState([]);
  const [topluSilConfirm, setTopluSilConfirm] = useState(false);
  const [topluSilLoading, setTopluSilLoading] = useState(false);
  const isAdmin = user?.rol === 'admin';
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  /* MAAŞ/HAKEDİŞ ÖDEME MODAL */
  const [maasModal, setMaasModal] = useState(false);
  const [maasForm, setMaasForm] = useState({personel_id:'', personel_adi:'', kasa_id:'', tutar:'', aciklama:'', tarih:''});
  const [maasLoading, setMaasLoading] = useState(false);
  const [kasalar, setKasalar] = useState([]);

  useEffect(() => { api.kasaList().then(r => { if(r?.success) setKasalar((r.data || []).filter(k => k.aktif !== false && k.aktif !== 0)); }); }, []);

  const maasOdeAc = async (p) => {
    const {fmt, fmtInput} = MR;
    let tutar = p.maas || 0;
    /* En son bekleyen hakedişi bul */
    try {
      const r = await api.hakedisList({personel_id: p.id});
      if (r?.success) {
        const hList = r.data?.items || r.data || [];
        const bekleyen = hList.find(h => (h.odeme_durumu||'').toLowerCase() !== 'ödendi' && (h.odeme_durumu||'').toLowerCase() !== 'odendi');
        if (bekleyen && parseFloat(bekleyen.toplam_hakedis) > 0) tutar = bekleyen.toplam_hakedis;
      }
    } catch(e) {}
    setMaasForm({
      personel_id: p.id,
      personel_adi: p.ad_soyad,
      kasa_id: kasalar.length > 0 ? String(kasalar[0].id) : '',
      tutar: String(tutar),
      aciklama: p.ad_soyad + ' - MAAŞ/HAKEDİŞ ÖDEMESİ',
      tarih: new Date().toISOString().slice(0,10)
    });
    setHata('');
    setMaasModal(true);
  };

  const maasOdeKaydet = async () => {
    const {parseNum} = MR;
    if (!maasForm.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); setTimeout(()=>setHata(''),3000); return; }
    const tutarNum = parseFloat(String(maasForm.tutar).replace(/\./g,'').replace(',','.')) || 0;
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); setTimeout(()=>setHata(''),3000); return; }
    setMaasLoading(true); setHata('');
    const r = await api.hakedisOde({
      personel_id: maasForm.personel_id,
      kasa_id: parseInt(maasForm.kasa_id),
      tutar: tutarNum,
      aciklama: maasForm.aciklama,
      tarih: maasForm.tarih || undefined
    });
    if (r?.success) {
      setMaasModal(false);
      setBasari('MAAŞ/HAKEDİŞ ÖDEMESİ BAŞARIYLA KAYDEDİLDİ');
      setTimeout(() => setBasari(''), 3000);
      yukle();
    } else {
      setHata(r?.error || 'ÖDEME HATASI');
      setTimeout(() => setHata(''), 3000);
    }
    setMaasLoading(false);
  };

  /* DÜZENLEME MODAL */
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(bosForm());
  const [editLoading, setEditLoading] = useState(false);

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (search) p.q = search;
    if (durumF) p.durum = durumF;
    const r = await api.personelList(p);
    if (r?.success) setData(r.data?.items || r.data || []);
    else setHata(r?.error || 'VERİ YÜKLENEMEDİ');
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);
  useEffect(() => { const t = setTimeout(yukle, 400); return () => clearTimeout(t); }, [search, durumF]);

  /* İSTATİSTİKLER */
  const toplamPersonel = data.length;
  const aktifPersonel = data.filter(d => d.durum === 'aktif').length;
  const pasifPersonel = data.filter(d => (d.durum || '').toUpperCase() === 'PASİF').length;
  const toplamMaas = data.filter(d => d.durum === 'aktif').reduce((s, d) => s + (parseFloat(d.maas) || 0), 0);

  /* TOPLU SEÇİM */
  const toggleSecim = (id) => setSecililer(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const tumunuSec = () => { if (secililer.length === data.length) setSecililer([]); else setSecililer(data.map(d=>d.id)); };
  const topluSil = async () => {
    if (secililer.length === 0) return;
    setTopluSilLoading(true);
    const r = await api.personelBulkDelete(secililer);
    setTopluSilLoading(false);
    setTopluSilConfirm(false);
    if (r?.success) { setSecililer([]); yukle(); setBasari('SEÇİLEN PERSONELLER BAŞARIYLA SİLİNDİ'); setTimeout(() => setBasari(''), 3000); }
    else { setHata(r?.error || 'TOPLU SİLME HATASI'); setTimeout(() => setHata(''), 3000); }
  };

  /* SİL */
  const personelSil = async (id) => {
    const r = await api.personelDelete(id);
    if (r?.success) { yukle(); setDeleteConfirm(null); setBasari('PERSONEL BAŞARIYLA SİLİNDİ'); setTimeout(() => setBasari(''), 3000); }
    else { setHata(r?.error || 'SİLME HATASI'); setTimeout(() => setHata(''), 3000); }
  };

  /* DÜZENLE AÇ */
  const duzenleAc = (p) => {
    setEditForm({
      id: p.id,
      ad_soyad: p.ad_soyad || '',
      tc_kimlik: p.tc_kimlik || '',
      telefon: p.telefon || '',
      email: p.email || '',
      departman: p.departman || '',
      pozisyon: p.pozisyon || '',
      maas: p.maas || '',
      prim_adk: p.prim_adk || '',
      prim_bh: p.prim_bh || '',
      sgk_no: p.sgk_no || '',
      iban: p.iban || '',
      il: p.il || '',
      adres: p.adres || '',
      ise_baslama: p.ise_baslama || '',
      durum: p.durum || 'aktif',
      notlar: p.notlar || ''
    });
    setEditModal(true);
  };

  /* DÜZENLE KAYDET */
  const duzenleKaydet = async () => {
    if (!editForm.ad_soyad) { setHata('ADI SOYADI ZORUNLUDUR'); setTimeout(() => setHata(''), 3000); return; }
    setEditLoading(true);
    const r = await api.personelUpdate(editForm);
    if (r?.success) {
      setEditModal(false);
      setBasari('PERSONEL BAŞARIYLA GÜNCELLENDİ');
      setTimeout(() => setBasari(''), 3000);
      yukle();
    } else {
      setHata(r?.error || 'GÜNCELLEME HATASI');
      setTimeout(() => setHata(''), 3000);
    }
    setEditLoading(false);
  };

  const ef = (key, val) => setEditForm(p => ({...p, [key]: val}));

  const isKoyu = MR.tema === 'koyu';
  const thS = {padding:'10px 8px',textAlign:'left',fontWeight:800,fontSize:11,whiteSpace:'nowrap',borderBottom:`2px solid ${C.border}`,color:'#FFFFFF',position:'sticky',top:0,background:isKoyu?'#0f2342':'#1e40af',zIndex:1,letterSpacing:0.3};
  const tdS = {padding:'8px 8px',fontSize:12,fontWeight:600,whiteSpace:'nowrap',borderBottom:isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',color: isKoyu ? '#e2e8f0' : '#1e293b'};
  const pRowBg = (i) => isKoyu ? (i%2===0?'#111827':'#0d1321') : (i%2===0?'#ffffff':'#f0f4ff');
  const pRowSt = (i) => ({cursor:'pointer',backgroundColor:pRowBg(i),borderBottom:isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',borderLeft:isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)',boxShadow:isKoyu?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)',transition:'all .2s ease',borderRadius:8});

  return (
    <div>
      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
        <StatCard icon="Users"      label="TOPLAM PERSONEL" value={toplamPersonel} color={C.accent}/>
        <StatCard icon="Check"      label="AKTİF"           value={aktifPersonel}  color={C.success}/>
        <StatCard icon="X"          label="PASİF"           value={pasifPersonel}  color={C.danger}/>
        <StatCard icon="Wallet"     label="TOPLAM MAAŞ"     value={paraBirim(toplamMaas)} color={C.warning}/>
      </div>

      <HataMesaji mesaj={hata}/>
      <BasariMesaji mesaj={basari}/>

      {/* LİSTE KART */}
      <div style={S.card}>
        {/* FİLTRELER */}
        <div style={{padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${C.border}`,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <LIcon name="List" size={14} color={C.accent}/>
            <span style={{fontSize:13,fontWeight:700}}>PERSONEL LİSTESİ</span>
            <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:600,background:`${C.accent}18`,color:C.accent}}>{data.length} KİŞİ</span>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <input placeholder="ARA (İSİM, T.C., DEPARTMAN)" value={search} onChange={e => setSearch(e.target.value)}
              style={{...S.input, width:220, fontSize:10, padding:'6px 10px'}}/>
            <select value={durumF} onChange={e => setDurumF(e.target.value)} style={{...S.select, width:100, fontSize:10, padding:'6px 8px'}}>
              <option value="">TÜMÜ</option>
              <option value="aktif">AKTİF</option>
              <option value="pasif">PASİF</option>
            </select>
            {MR.hasYetki(user,'muhasebe','personel-toplu-sil') && secililer.length > 0 && (
              <button style={{...S.btn,...S.btnD,fontSize:9,padding:'5px 10px',display:'flex',alignItems:'center',gap:4}}
                onClick={() => setTopluSilConfirm(true)} disabled={topluSilLoading}>
                <LIcon name="Trash2" size={11} color="#fff"/> TOPLU SİL ({secililer.length})
              </button>
            )}
            <button style={{...S.btn,...S.btnP,fontSize:10,padding:'6px 14px'}} onClick={() => setPage('personel-yeni')}>
              <LIcon name="Plus" size={12} color="#fff"/> YENİ
            </button>
          </div>
        </div>

        {/* TABLO */}
        {loading ? <Loading/> : data.length === 0 ? (
          <EmptyState icon="Users" title="PERSONEL BULUNAMADI" desc="FİLTRELERİ KONTROL EDİN VEYA YENİ PERSONEL EKLEYİN"/>
        ) : (
          <div style={{overflowX:'auto',maxHeight:'calc(100vh - 340px)'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:1200}}>
              <thead>
                <tr>
                  {MR.hasYetki(user,'muhasebe','personel-toplu-sil') && <th style={{...thS,minWidth:35,textAlign:'center',padding:'8px 4px'}}>
                    <input type="checkbox" checked={data.length > 0 && secililer.length === data.length}
                      onChange={tumunuSec} style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                  </th>}
                  <th style={{...thS,minWidth:35,textAlign:'center'}}>#</th>
                  <th style={{...thS,minWidth:130}}>ADI SOYADI</th>
                  <th style={{...thS,minWidth:100}}>T.C. NO</th>
                  <th style={{...thS,minWidth:100}}>DEPARTMAN</th>
                  <th style={{...thS,minWidth:100}}>POZİSYON</th>
                  <th style={{...thS,minWidth:90,textAlign:'right'}}>MAAŞ (₺)</th>
                  <th style={{...thS,minWidth:80,textAlign:'right'}}>ADK PRİM</th>
                  <th style={{...thS,minWidth:80,textAlign:'right'}}>BH PRİM</th>
                  <th style={{...thS,minWidth:85}}>İŞE BAŞLAMA</th>
                  <th style={{...thS,minWidth:65,textAlign:'center'}}>DURUM</th>
                  <th style={{...thS,minWidth:70,textAlign:'center'}}>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={d.id || i}
                    style={pRowSt(i)}
                    onClick={() => duzenleAc(d)}
                    onMouseEnter={e => {if(isKoyu){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                    onMouseLeave={e => {e.currentTarget.style.backgroundColor=pRowBg(i);e.currentTarget.style.borderLeft=isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=isKoyu?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                    {MR.hasYetki(user,'muhasebe','personel-toplu-sil') && <td style={{...tdS,textAlign:'center',padding:'6px 4px'}} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={secililer.includes(d.id)} onChange={() => toggleSecim(d.id)}
                        style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                    </td>}
                    <td style={{...tdS,textAlign:'center',color:C.textMuted,fontWeight:600}}>{i+1}</td>
                    <td style={{...tdS,fontWeight:700,color:C.accent}}>{d.ad_soyad || '-'}</td>
                    <td style={{...tdS,fontFamily:'monospace',fontSize:10,color:C.textSec,letterSpacing:0.3}}>{d.tc_kimlik || '-'}</td>
                    <td style={tdS}>
                      <span style={{display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:9,fontWeight:600,
                        background:`${C.purple}18`,color:C.purple}}>
                        {d.departman || '-'}
                      </span>
                    </td>
                    <td style={{...tdS,color:C.textSec}}>{d.pozisyon || '-'}</td>
                    <td style={{...tdS,textAlign:'right',fontWeight:700,color:C.success,fontFamily:'monospace'}}>{paraBirim(d.maas)}</td>
                    <td style={{...tdS,textAlign:'right',fontFamily:'monospace',color:C.cyan}}>
                      {d.prim_adk ? paraBirim(d.prim_adk) + '/DOSYA' : '-'}
                    </td>
                    <td style={{...tdS,textAlign:'right',fontFamily:'monospace',color:C.purple}}>
                      {d.prim_bh ? paraBirim(d.prim_bh) + '/DOSYA' : '-'}
                    </td>
                    <td style={{...tdS,color:C.textMuted,fontSize:10}}>{tarihFormat(d.ise_baslama)}</td>
                    <td style={{...tdS,textAlign:'center'}}>
                      <Badge text={d.durum === 'aktif' ? 'AKTİF' : 'PASİF'} color={d.durum === 'aktif' ? C.success : C.danger}/>
                    </td>
                    <td style={{...tdS,textAlign:'center'}} onClick={e => e.stopPropagation()}>
                      <div style={{display:'flex',gap:4,justifyContent:'center',alignItems:'center',flexWrap:'wrap'}}>
                        {MR.hasYetki(user,'muhasebe','personel-maas-ode') && d.durum === 'aktif' && (
                          <span title="MAAŞ/HAKEDİŞ ÖDE" onClick={() => maasOdeAc(d)}
                            style={{cursor:'pointer',display:'flex',padding:'2px 6px',borderRadius:4,background:`${C.success}18`,gap:2,alignItems:'center'}}>
                            <LIcon name="Wallet" size={11} color={C.success}/>
                            <span style={{fontSize:8,fontWeight:700,color:C.success}}>ÖDE</span>
                          </span>
                        )}
                        <span title="DÜZENLE" onClick={() => duzenleAc(d)}
                          style={{cursor:'pointer',display:'flex',padding:2,borderRadius:4,background:`${C.accent}11`}}>
                          <LIcon name="Edit" size={12} color={C.accent}/>
                        </span>
                        <span title="SİL" onClick={() => setDeleteConfirm({id: d.id, text: d.ad_soyad})}
                          style={{cursor:'pointer',display:'flex',padding:2,borderRadius:4,background:`${C.danger}11`}}>
                          <LIcon name="Trash2" size={12} color={C.danger}/>
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DÜZENLEME MODAL */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="PERSONEL DÜZENLE" width="70vw">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="ADI SOYADI *">
            <input style={S.input} value={editForm.ad_soyad} onChange={e => ef('ad_soyad', e.target.value)} placeholder="ADI SOYADI"/>
          </FormGroup>
          <FormGroup label="T.C. KİMLİK NO">
            <input style={S.input} value={editForm.tc_kimlik} onChange={e => ef('tc_kimlik', e.target.value)} maxLength={11} placeholder="XXXXXXXXXXX"/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input style={S.input} value={editForm.telefon} onChange={e => ef('telefon', e.target.value)} placeholder="05XX XXX XX XX"/>
          </FormGroup>
          <FormGroup label="E-POSTA">
            <input style={S.input} type="email" value={editForm.email} onChange={e => ef('email', e.target.value)} placeholder="ORNEK@MRHASAR.COM"/>
          </FormGroup>
          <FormGroup label="DEPARTMAN">
            <select style={S.select} value={editForm.departman} onChange={e => {ef('departman', e.target.value); if(e.target.value !== 'OFİS') ef('pozisyon','');}}>
              <option value="">SEÇİNİZ</option>
              {DEPARTMANLAR.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormGroup>
          <FormGroup label={editForm.departman === 'OFİS' ? 'ROL' : 'POZİSYON'}>
            {editForm.departman === 'OFİS' ? (
              <select style={S.select} value={editForm.pozisyon} onChange={e => ef('pozisyon', e.target.value)}>
                <option value="">ROL SEÇİNİZ</option>
                {OFIS_ROLLERI.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input style={S.input} value={editForm.pozisyon} onChange={e => ef('pozisyon', e.target.value)} placeholder="POZİSYON"/>
            )}
          </FormGroup>
          <FormGroup label="MAAŞ (₺)">
            <input style={S.input} type="number" step="0.01" value={editForm.maas} onChange={e => ef('maas', e.target.value)} placeholder="0,00"/>
          </FormGroup>
          <FormGroup label="ADK PRİM (₺/DOSYA)">
            <input style={S.input} type="number" step="0.01" value={editForm.prim_adk} onChange={e => ef('prim_adk', e.target.value)} placeholder="0,00"/>
          </FormGroup>
          <FormGroup label="BH PRİM (₺/DOSYA)">
            <input style={S.input} type="number" step="0.01" value={editForm.prim_bh} onChange={e => ef('prim_bh', e.target.value)} placeholder="0,00"/>
          </FormGroup>
          <FormGroup label="SGK NO">
            <input style={S.input} value={editForm.sgk_no} onChange={e => ef('sgk_no', e.target.value)} placeholder="SGK NUMARASI"/>
          </FormGroup>
          <FormGroup label="IBAN">
            <MR.IBANInput value={editForm.iban} onChange={v => ef('iban', v)}/>
          </FormGroup>
          <FormGroup label="İL">
            <select style={S.select} value={editForm.il} onChange={e => ef('il', e.target.value)}>
              <option value="">SEÇİNİZ</option>
              {(MR.ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="ADRES">
            <input style={S.input} value={editForm.adres} onChange={e => ef('adres', e.target.value)} placeholder="ADRES"/>
          </FormGroup>
          <FormGroup label="İŞE BAŞLAMA TARİHİ">
            <MR.DateInput value={editForm.ise_baslama} onChange={v => ef('ise_baslama', v)}/>
          </FormGroup>
          <FormGroup label="DURUM">
            <select style={S.select} value={editForm.durum} onChange={e => ef('durum', e.target.value)}>
              <option value="aktif">AKTİF</option>
              <option value="pasif">PASİF</option>
            </select>
          </FormGroup>
          <FormGroup label="NOTLAR" full>
            <textarea style={{...S.input,minHeight:70,resize:'vertical'}} value={editForm.notlar} onChange={e => ef('notlar', e.target.value)} placeholder="NOTLAR"/>
          </FormGroup>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setEditModal(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP,opacity:editLoading?0.7:1}} onClick={duzenleKaydet} disabled={editLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {editLoading ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
          </button>
        </div>
      </Modal>

      {/* MAAŞ/HAKEDİŞ ÖDEME MODAL */}
      <Modal open={maasModal} onClose={() => setMaasModal(false)} title="MAAŞ / HAKEDİŞ ÖDEME" width="500px">
        <HataMesaji mesaj={hata}/>
        {maasForm.personel_adi && (
          <div style={{padding:'10px 14px',background:`${C.accent}11`,borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <LIcon name="User" size={16} color={C.accent}/>
            <span style={{fontSize:13,fontWeight:700,color:C.accent}}>{maasForm.personel_adi}</span>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA SEÇİMİ *">
            <select style={S.select} value={maasForm.kasa_id} onChange={e => setMaasForm(p => ({...p, kasa_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({paraBirim(k.bakiye)})</option>)}
            </select>
          </FormGroup>
          <FormGroup label="TUTAR (₺) *">
            <input style={{...S.input,fontSize:16,fontWeight:700}} value={maasForm.tutar}
              onChange={e => setMaasForm(p => ({...p, tutar: e.target.value}))} placeholder="0,00"/>
          </FormGroup>
          <FormGroup label="TARİH">
            <input type="date" style={S.input} value={maasForm.tarih} onChange={e => setMaasForm(p => ({...p, tarih: e.target.value}))}/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:60}} value={maasForm.aciklama} onChange={e => setMaasForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="AÇIKLAMA..."/>
          </FormGroup>
        </div>
        <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setMaasModal(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={maasOdeKaydet} disabled={maasLoading}>
            <LIcon name="Wallet" size={14} color="#fff"/> {maasLoading ? 'ÖDENİYOR...' : 'ÖDEME YAP'}
          </button>
        </div>
      </Modal>

      {/* SİLME ONAY */}
      <Confirm open={!!deleteConfirm} message={deleteConfirm ? `"${deleteConfirm.text}" PERSONEL SİLİNSİN Mİ?` : ''}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && personelSil(deleteConfirm.id)}/>

      {/* TOPLU SİLME ONAY */}
      <Confirm open={topluSilConfirm}
        message={`SEÇİLEN ${secililer.length} PERSONEL KALICI OLARAK SİLİNECEK!\n\nBU İŞLEM GERİ ALINAMAZ! DEVAM EDİLSİN Mİ?`}
        onCancel={() => setTopluSilConfirm(false)}
        onConfirm={topluSil}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 2 – YENİ PERSONEL
   ═══════════════════════════════════════════════════════════ */
const YeniPersonel = ({setPage, user}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, api} = MR;

  const [form, setForm] = useState(bosForm());
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  const f = (key, val) => setForm(p => ({...p, [key]: val}));

  const kaydet = async () => {
    /* VALİDASYON */
    if (!form.ad_soyad) { setHata('ADI SOYADI ZORUNLUDUR'); setTimeout(() => setHata(''), 4000); return; }
    if (!form.email) { setHata('E-POSTA ZORUNLUDUR (OTOMATİK KULLANICI OLUŞTURMA İÇİN)'); setTimeout(() => setHata(''), 4000); return; }
    if (form.tc_kimlik && form.tc_kimlik.length !== 11) { setHata('T.C. KİMLİK NO 11 HANELİ OLMALIDIR'); setTimeout(() => setHata(''), 4000); return; }

    setLoading(true);
    setHata('');
    const r = await api.personelCreate(form);
    if (r?.success) {
      const kullaniciMsg = r.data?.kullanici_olusturuldu
        ? ' | KULLANICI HESABI OTOMATİK OLUŞTURULDU (GEÇİCİ ŞİFRE: ' + (r.data.gecici_sifre || '123456') + ')'
        : '';
      setBasari('PERSONEL BAŞARIYLA OLUŞTURULDU' + kullaniciMsg);
      setForm(bosForm());
      setTimeout(() => {
        setBasari('');
        setPage('personel-liste');
      }, 5000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
      setTimeout(() => setHata(''), 4000);
    }
    setLoading(false);
  };

  return (
    <div style={S.card}>
      <SectionTitle icon="UserPlus" title="YENİ PERSONEL EKLE" sub="PERSONEL BİLGİLERİNİ GİRİN"/>
      <div style={S.cardBody}>
        <HataMesaji mesaj={hata}/>
        <BasariMesaji mesaj={basari}/>

        {/* BİLGİ KUTUSU */}
        <div style={{padding:12,background:`${C.accent}11`,borderRadius:8,marginBottom:20,fontSize:11,color:C.accent,border:`1px solid ${C.accent}33`,display:'flex',alignItems:'center',gap:8}}>
          <LIcon name="FileText" size={16} color={C.accent}/>
          <span>PERSONEL OLUŞTURULDUĞUNDA OTOMATİK OLARAK SİSTEM GİRİŞİ İÇİN KULLANICI HESABI OLUŞTURULACAKTIR</span>
        </div>

        {/* FORM */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="ADI SOYADI *">
            <input style={S.input} value={form.ad_soyad} onChange={e => f('ad_soyad', e.target.value)} placeholder="ADI SOYADI"/>
          </FormGroup>
          <FormGroup label="T.C. KİMLİK NO">
            <input style={S.input} value={form.tc_kimlik} onChange={e => f('tc_kimlik', e.target.value)} maxLength={11} placeholder="XXXXXXXXXXX"/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input style={S.input} value={form.telefon} onChange={e => f('telefon', e.target.value)} placeholder="05XX XXX XX XX"/>
          </FormGroup>
          <FormGroup label="E-POSTA *">
            <input style={S.input} type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="ORNEK@MRHASAR.COM"/>
          </FormGroup>
          <FormGroup label="DEPARTMAN">
            <select style={S.select} value={form.departman} onChange={e => {f('departman', e.target.value); if(e.target.value !== 'OFİS') f('pozisyon','');}}>
              <option value="">SEÇİNİZ</option>
              {DEPARTMANLAR.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormGroup>
          <FormGroup label={form.departman === 'OFİS' ? 'ROL' : 'POZİSYON'}>
            {form.departman === 'OFİS' ? (
              <select style={S.select} value={form.pozisyon} onChange={e => f('pozisyon', e.target.value)}>
                <option value="">ROL SEÇİNİZ</option>
                {OFIS_ROLLERI.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <input style={S.input} value={form.pozisyon} onChange={e => f('pozisyon', e.target.value)} placeholder="POZİSYON"/>
            )}
          </FormGroup>
          <FormGroup label="MAAŞ (₺)">
            <input style={S.input} type="number" step="0.01" value={form.maas} onChange={e => f('maas', e.target.value)} placeholder="0,00"/>
          </FormGroup>
          <FormGroup label="ADK PRİM (₺/DOSYA)">
            <input style={S.input} type="number" step="0.01" value={form.prim_adk} onChange={e => f('prim_adk', e.target.value)} placeholder="0,00"/>
          </FormGroup>
          <FormGroup label="BH PRİM (₺/DOSYA)">
            <input style={S.input} type="number" step="0.01" value={form.prim_bh} onChange={e => f('prim_bh', e.target.value)} placeholder="0,00"/>
          </FormGroup>
          <FormGroup label="SGK NO">
            <input style={S.input} value={form.sgk_no} onChange={e => f('sgk_no', e.target.value)} placeholder="SGK NUMARASI"/>
          </FormGroup>
          <FormGroup label="IBAN">
            <MR.IBANInput value={form.iban} onChange={v => f('iban', v)}/>
          </FormGroup>
          <FormGroup label="İL">
            <select style={S.select} value={form.il} onChange={e => f('il', e.target.value)}>
              <option value="">SEÇİNİZ</option>
              {(MR.ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="ADRES">
            <input style={S.input} value={form.adres} onChange={e => f('adres', e.target.value)} placeholder="ADRES"/>
          </FormGroup>
          <FormGroup label="İŞE BAŞLAMA TARİHİ">
            <MR.DateInput value={form.ise_baslama} onChange={v => f('ise_baslama', v)}/>
          </FormGroup>
          <FormGroup label="DURUM">
            <select style={S.select} value={form.durum} onChange={e => f('durum', e.target.value)}>
              <option value="aktif">AKTİF</option>
              <option value="pasif">PASİF</option>
            </select>
          </FormGroup>
          <FormGroup label="NOTLAR" full>
            <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={form.notlar} onChange={e => f('notlar', e.target.value)} placeholder="NOTLAR"/>
          </FormGroup>
        </div>

        {/* BUTONLAR */}
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setPage('personel-liste')}>
            <LIcon name="ArrowLeft" size={14} color={C.textSec}/> GERİ
          </button>
          <button style={{...S.btn,...S.btnP,opacity:loading?0.7:1}} onClick={kaydet} disabled={loading}>
            <LIcon name="Save" size={14} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3 – HAKEDİŞ TAKİBİ
   ═══════════════════════════════════════════════════════════ */
const HakedisTakibi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api} = MR;

  /* BUGÜNKÜ AY */
  const buAy = () => {
    const n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
  };

  const [donem, setDonem] = useState(buAy());
  const [personelF, setPersonelF] = useState('');
  const [personeller, setPersoneller] = useState([]);
  const [hakedisler, setHakedisler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hesapLoading, setHesapLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  /* KASA İLE ÖDEME MODAL */
  const [kasalar, setKasalar] = useState([]);
  const [kasaOdeModal, setKasaOdeModal] = useState(false);
  const [kasaOdeForm, setKasaOdeForm] = useState({hakedis_id:null, personel_adi:'', tutar:0, kasa_id:''});
  const [kasaOdeLoading, setKasaOdeLoading] = useState(false);

  useEffect(() => { api.kasaList().then(r => { if(r?.success) setKasalar((r.data || []).filter(k => k.aktif !== false && k.aktif !== 0)); }); }, []);

  /* TEK PERSONEL MODAL */
  const [tekModal, setTekModal] = useState(false);
  const [tekForm, setTekForm] = useState({
    personel_id: '', donem: buAy(), calisan_gun: 22,
    dosya_sayisi: 0, ek_prim: 0, kesinti: 0, notlar: ''
  });
  const [tekLoading, setTekLoading] = useState(false);

  /* SEÇİLEN PERSONEL BİLGİSİ (HESAPLAMA ÖNİZLEME) */
  const secilenPersonel = useMemo(() => {
    if (!tekForm.personel_id) return null;
    return personeller.find(p => String(p.id) === String(tekForm.personel_id));
  }, [tekForm.personel_id, personeller]);

  /* HESAPLAMA ÖNİZLEME */
  const hesapOnizleme = useMemo(() => {
    if (!secilenPersonel) return null;
    const aylikMaas = parseFloat(secilenPersonel.maas) || 0;
    const gunlukMaas = aylikMaas / 30;
    const calisanGun = parseInt(tekForm.calisan_gun) || 0;
    const dosyaSayisi = parseInt(tekForm.dosya_sayisi) || 0;
    const primAdk = parseFloat(secilenPersonel.prim_adk) || 0;
    const primBh = parseFloat(secilenPersonel.prim_bh) || 0;
    const primOrani = primAdk; // Varsayılan
    const ekPrim = parseFloat(tekForm.ek_prim) || 0;
    const kesinti = parseFloat(tekForm.kesinti) || 0;

    const maasHesap = gunlukMaas * calisanGun;
    const primHesap = dosyaSayisi * primOrani;
    const toplam = maasHesap + primHesap + ekPrim - kesinti;

    return { gunlukMaas, maasHesap, primHesap, ekPrim, kesinti, toplam };
  }, [secilenPersonel, tekForm]);

  /* VERİ YÜKLE */
  const personelYukle = async () => {
    const r = await api.personelList({durum: 'aktif'});
    if (r?.success) setPersoneller(r.data?.items || r.data || []);
  };

  const hakedisYukle = async () => {
    setLoading(true);
    const p = {donem};
    if (personelF) p.personel_id = personelF;
    const r = await api.hakedisList(p);
    if (r?.success) setHakedisler(r.data?.items || r.data || []);
    else setHata(r?.error || 'HAKEDİŞ VERİSİ YÜKLENEMEDİ');
    setLoading(false);
  };

  useEffect(() => { personelYukle(); }, []);
  useEffect(() => { hakedisYukle(); }, [donem, personelF]);

  /* İSTATİSTİKLER */
  const toplamHakedis = hakedisler.reduce((s, h) => s + (parseFloat(h.toplam_hakedis) || 0), 0);
  const odenenHakedis = hakedisler.filter(h => (h.odeme_durumu || '').toUpperCase() === 'ÖDENDİ').reduce((s, h) => s + (parseFloat(h.toplam_hakedis) || 0), 0);
  const bekleyenHakedis = toplamHakedis - odenenHakedis;
  const kayitSayisi = hakedisler.length;

  /* TÜM PERSONEL İÇİN HAKEDİŞ HESAPLA */
  const tumunuHesapla = async () => {
    if (!donem) { setHata('DÖNEM SEÇİNİZ'); setTimeout(() => setHata(''), 3000); return; }
    setHesapLoading(true);
    setHata('');
    const r = await api.hakedisHesapla({donem, tum_personel: true});
    if (r?.success) {
      setBasari('TÜM PERSONEL İÇİN HAKEDİŞ BAŞARIYLA HESAPLANDI (' + (r.data?.hesaplanan || 0) + ' PERSONEL)');
      setTimeout(() => setBasari(''), 4000);
      hakedisYukle();
    } else {
      setHata(r?.error || 'HAKEDİŞ HESAPLAMA HATASI');
      setTimeout(() => setHata(''), 4000);
    }
    setHesapLoading(false);
  };

  /* TEK PERSONEL HAKEDİŞ KAYDET */
  const tekHesaplaKaydet = async () => {
    if (!tekForm.personel_id) { setHata('PERSONEL SEÇİNİZ'); setTimeout(() => setHata(''), 3000); return; }
    if (!tekForm.donem) { setHata('DÖNEM SEÇİNİZ'); setTimeout(() => setHata(''), 3000); return; }
    setTekLoading(true);
    const r = await api.hakedisHesapla({
      personel_id: tekForm.personel_id,
      donem: tekForm.donem,
      calisan_gun: tekForm.calisan_gun,
      dosya_sayisi: tekForm.dosya_sayisi,
      ek_prim: tekForm.ek_prim,
      kesinti: tekForm.kesinti,
      notlar: tekForm.notlar
    });
    if (r?.success) {
      setTekModal(false);
      setBasari('HAKEDİŞ BAŞARIYLA HESAPLANDI VE KAYDEDİLDİ');
      setTimeout(() => setBasari(''), 3000);
      setTekForm({personel_id:'', donem:buAy(), calisan_gun:22, dosya_sayisi:0, ek_prim:0, kesinti:0, notlar:''});
      hakedisYukle();
    } else {
      setHata(r?.error || 'HAKEDİŞ KAYIT HATASI');
      setTimeout(() => setHata(''), 3000);
    }
    setTekLoading(false);
  };

  /* ÖDE - Kasa seçim modalını aç */
  const hakedisOdeAc = (h) => {
    setKasaOdeForm({
      hakedis_id: h.id,
      personel_adi: h.personel_adi || h.ad_soyad || '-',
      tutar: parseFloat(h.toplam_hakedis) || 0,
      kasa_id: kasalar.length > 0 ? String(kasalar[0].id) : ''
    });
    setHata('');
    setKasaOdeModal(true);
  };

  const hakedisOdeKaydet = async () => {
    if (!kasaOdeForm.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); setTimeout(()=>setHata(''),3000); return; }
    setKasaOdeLoading(true); setHata('');
    const r = await api.hakedisOde({id: kasaOdeForm.hakedis_id, kasa_id: parseInt(kasaOdeForm.kasa_id)});
    if (r?.success) {
      setKasaOdeModal(false);
      setBasari('ÖDEME BAŞARIYLA YAPILDI VE KASAYA İŞLENDİ');
      setTimeout(() => setBasari(''), 3000);
      hakedisYukle();
    } else {
      setHata(r?.error || 'ÖDEME HATASI');
      setTimeout(() => setHata(''), 3000);
    }
    setKasaOdeLoading(false);
  };

  const tf = (key, val) => setTekForm(p => ({...p, [key]: val}));

  /* DÖNEM ETİKETİ (2026-02 → ŞUBAT 2026) */
  const donemEtiket = (d) => {
    if (!d) return '-';
    const aylar = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
    const p = d.split('-');
    if (p.length === 2) return aylar[parseInt(p[1]) - 1] + ' ' + p[0];
    return d;
  };

  const isKoyu2 = MR.tema === 'koyu';
  const thS = {padding:'10px 8px',textAlign:'left',fontWeight:800,fontSize:11,whiteSpace:'nowrap',borderBottom:`2px solid ${C.border}`,color:'#FFFFFF',position:'sticky',top:0,background:isKoyu2?'#0f2342':'#1e40af',zIndex:1,letterSpacing:0.3};
  const tdS = {padding:'8px 8px',fontSize:12,fontWeight:600,whiteSpace:'nowrap',borderBottom:isKoyu2?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',color: isKoyu2 ? '#e2e8f0' : '#1e293b'};
  const hRowBg = (i) => isKoyu2 ? (i%2===0?'#111827':'#0d1321') : (i%2===0?'#ffffff':'#f0f4ff');
  const hRowSt = (i) => ({backgroundColor:hRowBg(i),borderBottom:isKoyu2?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)',borderLeft:isKoyu2?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)',boxShadow:isKoyu2?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)',transition:'all .2s ease',borderRadius:8});

  return (
    <div>
      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
        <StatCard icon="FileText"   label="KAYIT SAYISI"     value={kayitSayisi}              color={C.accent}/>
        <StatCard icon="Calculator" label="TOPLAM HAKEDİŞ"   value={paraBirim(toplamHakedis)} color={C.purple}/>
        <StatCard icon="Check"      label="ÖDENEN"           value={paraBirim(odenenHakedis)}  color={C.success}/>
        <StatCard icon="Clock"      label="BEKLEYEN"         value={paraBirim(bekleyenHakedis)} color={C.warning}/>
      </div>

      <HataMesaji mesaj={hata}/>
      <BasariMesaji mesaj={basari}/>

      {/* FİLTRE + BUTONLAR */}
      <div style={S.card}>
        <div style={{padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${C.border}`,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <LIcon name="Calculator" size={14} color={C.accent}/>
            <span style={{fontSize:13,fontWeight:700}}>HAKEDİŞ TAKİBİ</span>
            <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:600,background:`${C.accent}18`,color:C.accent}}>
              {donemEtiket(donem)}
            </span>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <label style={{fontSize:10,fontWeight:600,color:C.textMuted}}>DÖNEM:</label>
              <input type="month" style={{...S.input, width:140, fontSize:10, padding:'6px 8px'}} value={donem} onChange={e => setDonem(e.target.value)}/>
            </div>
            <select style={{...S.select, width:160, fontSize:10, padding:'6px 8px'}} value={personelF} onChange={e => setPersonelF(e.target.value)}>
              <option value="">TÜM PERSONEL</option>
              {personeller.map(p => <option key={p.id} value={p.id}>{p.ad_soyad}</option>)}
            </select>

            <div style={{width:1, height:24, background:C.border, margin:'0 2px'}}/>

            <button style={{...S.btn,...S.btnS,fontSize:9,padding:'5px 10px'}} onClick={() => {
              setTekForm({...tekForm, donem});
              setTekModal(true);
            }}>
              <LIcon name="UserPlus" size={11} color="#fff"/> TEK PERSONEL
            </button>
            <button style={{...S.btn,...S.btnP,fontSize:9,padding:'5px 10px',opacity:hesapLoading?0.7:1}} onClick={tumunuHesapla} disabled={hesapLoading}>
              <LIcon name="Calculator" size={11} color="#fff"/> {hesapLoading ? 'HESAPLANIYOR...' : 'TÜM PERSONEL İÇİN HAKEDİŞ HESAPLA'}
            </button>
          </div>
        </div>

        {/* HAKEDİŞ TABLOSU */}
        {loading ? <Loading/> : hakedisler.length === 0 ? (
          <EmptyState icon="Calculator" title="HAKEDİŞ KAYDI BULUNAMADI" desc="SEÇİLİ DÖNEM İÇİN HAKEDİŞ HESAPLAYIN VEYA DÖNEMİ DEĞİŞTİRİN"/>
        ) : (
          <div style={{overflowX:'auto',maxHeight:'calc(100vh - 380px)'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:1200}}>
              <thead>
                <tr>
                  <th style={{...thS,minWidth:130}}>PERSONEL</th>
                  <th style={{...thS,minWidth:90}}>DÖNEM</th>
                  <th style={{...thS,minWidth:65,textAlign:'center'}}>ÇALIŞAN GÜN</th>
                  <th style={{...thS,minWidth:70,textAlign:'center'}}>DOSYA SAYISI</th>
                  <th style={{...thS,minWidth:90,textAlign:'right'}}>MAAŞ (₺)</th>
                  <th style={{...thS,minWidth:80,textAlign:'right'}}>PRİM (₺)</th>
                  <th style={{...thS,minWidth:75,textAlign:'right'}}>EK PRİM (₺)</th>
                  <th style={{...thS,minWidth:75,textAlign:'right'}}>KESİNTİ (₺)</th>
                  <th style={{...thS,minWidth:100,textAlign:'right'}}>TOPLAM HAKEDİŞ (₺)</th>
                  <th style={{...thS,minWidth:85,textAlign:'center'}}>ÖDEME DURUMU</th>
                  <th style={{...thS,minWidth:60,textAlign:'center'}}>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {hakedisler.map((h, i) => (
                  <tr key={h.id || i}
                    style={hRowSt(i)}
                    onMouseEnter={e => {if(isKoyu2){e.currentTarget.style.borderLeft='3px solid rgba(6,182,212,0.8)';e.currentTarget.style.boxShadow='0 4px 16px rgba(6,182,212,0.15)';}else{e.currentTarget.style.borderLeft='3px solid rgba(99,102,241,0.6)';e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.15)';}e.currentTarget.style.transform='translateY(-1px)';}}
                    onMouseLeave={e => {e.currentTarget.style.backgroundColor=hRowBg(i);e.currentTarget.style.borderLeft=isKoyu2?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)';e.currentTarget.style.boxShadow=isKoyu2?'0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)':'0 1px 4px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(0)';}}>
                    <td style={{...tdS,fontWeight:700,color:C.accent}}>{h.personel_adi || h.ad_soyad || '-'}</td>
                    <td style={tdS}>{donemEtiket(h.donem)}</td>
                    <td style={{...tdS,textAlign:'center',fontFamily:'monospace'}}>{h.calisan_gun || '-'}</td>
                    <td style={{...tdS,textAlign:'center',fontFamily:'monospace',fontWeight:600}}>{h.dosya_sayisi || 0}</td>
                    <td style={{...tdS,textAlign:'right',fontFamily:'monospace'}}>{paraBirim(h.maas_hesap || h.maas)}</td>
                    <td style={{...tdS,textAlign:'right',fontFamily:'monospace',color:C.cyan}}>{paraBirim(h.prim_hesap || h.prim)}</td>
                    <td style={{...tdS,textAlign:'right',fontFamily:'monospace',color:C.success}}>{paraBirim(h.ek_prim)}</td>
                    <td style={{...tdS,textAlign:'right',fontFamily:'monospace',color:C.danger}}>{paraBirim(h.kesinti)}</td>
                    <td style={{...tdS,textAlign:'right',fontWeight:700,fontFamily:'monospace',fontSize:11,color:C.success}}>{paraBirim(h.toplam_hakedis)}</td>
                    <td style={{...tdS,textAlign:'center'}}>
                      <Badge
                        text={(h.odeme_durumu || 'BEKLİYOR').toUpperCase()}
                        color={(h.odeme_durumu || '').toUpperCase() === 'ÖDENDİ' ? C.success : C.warning}
                      />
                    </td>
                    <td style={{...tdS,textAlign:'center'}}>
                      {(h.odeme_durumu || '').toUpperCase() !== 'ÖDENDİ' && (
                        <button
                          style={{...S.btn,...S.btnS,fontSize:8,padding:'3px 8px'}}
                          onClick={() => hakedisOdeAc(h)}
                          title="KASA SEÇEREKÖDENDİ OLARAK İŞARETLE">
                          <LIcon name="Wallet" size={10} color="#fff"/> ÖDE
                        </button>
                      )}
                      {(h.odeme_durumu || '').toUpperCase() === 'ÖDENDİ' && (
                        <span style={{fontSize:9,color:C.success,fontWeight:600}}>
                          <LIcon name="Check" size={10} color={C.success}/> ÖDENDİ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* TOPLAM SATIRI */}
              <tfoot>
                <tr style={{background:`${C.accent}08`}}>
                  <td colSpan={4} style={{...tdS,fontWeight:700,fontSize:11,textAlign:'right',paddingRight:10,borderTop:`2px solid ${C.border}`}}>TOPLAM:</td>
                  <td style={{...tdS,textAlign:'right',fontWeight:700,fontFamily:'monospace',fontSize:11,borderTop:`2px solid ${C.border}`}}>
                    {paraBirim(hakedisler.reduce((s,h) => s + (parseFloat(h.maas_hesap || h.maas) || 0), 0))}
                  </td>
                  <td style={{...tdS,textAlign:'right',fontWeight:700,fontFamily:'monospace',fontSize:11,color:C.cyan,borderTop:`2px solid ${C.border}`}}>
                    {paraBirim(hakedisler.reduce((s,h) => s + (parseFloat(h.prim_hesap || h.prim) || 0), 0))}
                  </td>
                  <td style={{...tdS,textAlign:'right',fontWeight:700,fontFamily:'monospace',fontSize:11,color:C.success,borderTop:`2px solid ${C.border}`}}>
                    {paraBirim(hakedisler.reduce((s,h) => s + (parseFloat(h.ek_prim) || 0), 0))}
                  </td>
                  <td style={{...tdS,textAlign:'right',fontWeight:700,fontFamily:'monospace',fontSize:11,color:C.danger,borderTop:`2px solid ${C.border}`}}>
                    {paraBirim(hakedisler.reduce((s,h) => s + (parseFloat(h.kesinti) || 0), 0))}
                  </td>
                  <td style={{...tdS,textAlign:'right',fontWeight:800,fontFamily:'monospace',fontSize:12,color:C.success,borderTop:`2px solid ${C.border}`}}>
                    {paraBirim(toplamHakedis)}
                  </td>
                  <td colSpan={2} style={{...tdS,borderTop:`2px solid ${C.border}`}}/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* TEK PERSONEL HAKEDİŞ MODAL */}
      <Modal open={tekModal} onClose={() => setTekModal(false)} title="TEK PERSONEL HAKEDİŞ HESAPLA" width="60vw">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="PERSONEL *">
            <select style={S.select} value={tekForm.personel_id} onChange={e => tf('personel_id', e.target.value)}>
              <option value="">PERSONEL SEÇİNİZ</option>
              {personeller.map(p => <option key={p.id} value={p.id}>{p.ad_soyad} ({p.departman || '-'})</option>)}
            </select>
          </FormGroup>
          <FormGroup label="DÖNEM *">
            <input type="month" style={S.input} value={tekForm.donem} onChange={e => tf('donem', e.target.value)}/>
          </FormGroup>
          <FormGroup label="ÇALIŞAN GÜN">
            <input type="number" style={S.input} value={tekForm.calisan_gun} onChange={e => tf('calisan_gun', e.target.value)} min="0" max="31"/>
          </FormGroup>
          <FormGroup label="DOSYA SAYISI">
            <input type="number" style={S.input} value={tekForm.dosya_sayisi} onChange={e => tf('dosya_sayisi', e.target.value)} min="0"/>
          </FormGroup>
          <FormGroup label="EK PRİM (₺)">
            <input type="number" step="0.01" style={S.input} value={tekForm.ek_prim} onChange={e => tf('ek_prim', e.target.value)}/>
          </FormGroup>
          <FormGroup label="KESİNTİ (₺)">
            <input type="number" step="0.01" style={S.input} value={tekForm.kesinti} onChange={e => tf('kesinti', e.target.value)}/>
          </FormGroup>
          <FormGroup label="NOTLAR" full>
            <textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={tekForm.notlar} onChange={e => tf('notlar', e.target.value)} placeholder="NOTLAR"/>
          </FormGroup>
        </div>

        {/* HESAPLAMA ÖNİZLEME */}
        {secilenPersonel && hesapOnizleme && (
          <div style={{marginTop:20,padding:16,background:`${C.accent}08`,borderRadius:10,border:`1px solid ${C.accent}22`}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:12,color:C.accent,display:'flex',alignItems:'center',gap:6}}>
              <LIcon name="Calculator" size={14} color={C.accent}/> HESAPLAMA ÖNİZLEME
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:11}}>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{color:C.textMuted,fontWeight:600}}>PERSONEL:</span>
                <span style={{fontWeight:700,color:C.accent}}>{secilenPersonel.ad_soyad}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{color:C.textMuted,fontWeight:600}}>AYLIK MAAŞ:</span>
                <span style={{fontWeight:700}}>{paraBirim(secilenPersonel.maas)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{color:C.textMuted,fontWeight:600}}>GÜNLÜK MAAŞ:</span>
                <span style={{fontWeight:600,fontFamily:'monospace'}}>{paraBirim(hesapOnizleme.gunlukMaas)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{color:C.textMuted,fontWeight:600}}>ADK PRİM / BH PRİM:</span>
                <span style={{fontWeight:600,fontFamily:'monospace'}}>{paraBirim(secilenPersonel.prim_adk)}/DOSYA — {paraBirim(secilenPersonel.prim_bh)}/DOSYA</span>
              </div>

              <div style={{gridColumn:'span 2',borderTop:`1px solid ${C.border}`,paddingTop:8,marginTop:4}}/>

              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{color:C.textMuted,fontWeight:600}}>MAAŞ HESAP ({tekForm.calisan_gun} GÜN):</span>
                <span style={{fontWeight:700,fontFamily:'monospace'}}>{paraBirim(hesapOnizleme.maasHesap)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{color:C.textMuted,fontWeight:600}}>PRİM HESAP ({tekForm.dosya_sayisi} DOSYA):</span>
                <span style={{fontWeight:700,fontFamily:'monospace',color:C.cyan}}>{paraBirim(hesapOnizleme.primHesap)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{color:C.textMuted,fontWeight:600}}>EK PRİM:</span>
                <span style={{fontWeight:600,fontFamily:'monospace',color:C.success}}>{paraBirim(hesapOnizleme.ekPrim)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'6px 10px',background:C.bgCard,borderRadius:6,border:`1px solid ${C.border}`}}>
                <span style={{color:C.textMuted,fontWeight:600}}>KESİNTİ:</span>
                <span style={{fontWeight:600,fontFamily:'monospace',color:C.danger}}>-{paraBirim(hesapOnizleme.kesinti)}</span>
              </div>
            </div>

            {/* TOPLAM */}
            <div style={{marginTop:12,padding:'12px 16px',background:`${C.success}15`,borderRadius:8,border:`1px solid ${C.success}33`,
              display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:800,color:C.text}}>
                <LIcon name="Award" size={16} color={C.success} style={{marginRight:6}}/> TOPLAM HAKEDİŞ:
              </span>
              <span style={{fontSize:18,fontWeight:900,color:C.success,fontFamily:'monospace'}}>
                {paraBirim(hesapOnizleme.toplam)}
              </span>
            </div>

            {/* FORMÜL */}
            <div style={{marginTop:8,textAlign:'center',fontSize:9,color:C.textMuted}}>
              FORMÜL: (GÜNLÜK MAAŞ x ÇALIŞAN GÜN) + (DOSYA SAYISI x PRİM ORANI) + EK PRİM - KESİNTİ
            </div>
          </div>
        )}

        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setTekModal(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP,opacity:tekLoading?0.7:1}} onClick={tekHesaplaKaydet} disabled={tekLoading}>
            <LIcon name="Calculator" size={14} color="#fff"/> {tekLoading ? 'HESAPLANIYOR...' : 'HESAPLA VE KAYDET'}
          </button>
        </div>
      </Modal>

      {/* KASA İLE HAKEDİŞ ÖDEME MODAL */}
      <Modal open={kasaOdeModal} onClose={() => setKasaOdeModal(false)} title="HAKEDİŞ ÖDEME - KASA SEÇİMİ" width="450px">
        <HataMesaji mesaj={hata}/>
        {kasaOdeForm.personel_adi && (
          <div style={{padding:'10px 14px',background:`${C.accent}11`,borderRadius:8,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="User" size={16} color={C.accent}/>
              <span style={{fontSize:13,fontWeight:700,color:C.accent}}>{kasaOdeForm.personel_adi}</span>
            </div>
            <span style={{fontSize:14,fontWeight:800,color:C.success}}>{paraBirim(kasaOdeForm.tutar)}</span>
          </div>
        )}
        <FormGroup label="KASA SEÇİMİ *">
          <select style={S.select} value={kasaOdeForm.kasa_id} onChange={e => setKasaOdeForm(p => ({...p, kasa_id: e.target.value}))}>
            <option value="">KASA SEÇİNİZ</option>
            {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({paraBirim(k.bakiye)})</option>)}
          </select>
        </FormGroup>
        <div style={{marginTop:10,padding:10,background:`${C.warning}11`,borderRadius:6,fontSize:10,color:C.warning,fontWeight:600}}>
          <LIcon name="Info" size={12} color={C.warning}/> Seçilen kasadan {paraBirim(kasaOdeForm.tutar)} düşülecek ve gider kaydı oluşturulacaktır.
        </div>
        <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setKasaOdeModal(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={hakedisOdeKaydet} disabled={kasaOdeLoading}>
            <LIcon name="Wallet" size={14} color="#fff"/> {kasaOdeLoading ? 'ÖDENİYOR...' : 'ÖDEME YAP'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
