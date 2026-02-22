/* ============================================================
   MR HASAR DANIŞMANLIK – SERVİS YÖNETİMİ MODÜLÜ (servis.js)
   SERVİS LİSTESİ, YENİ SERVİS, RAPOR, İHBAR YÖNETİMİ
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useMemo} = React;

/* ═══════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ – SEKME YAPISI
   ═══════════════════════════════════════════════════════════ */
MR.ServisPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'liste';

  const sekmeler = [
    {key:'liste',  label:'SERVİS LİSTESİ', icon:'Truck'},
    {key:'yeni',   label:'YENİ SERVİS',    icon:'Plus'},
    {key:'rapor',  label:'SERVİS RAPOR',   icon:'BarChart3'}
  ];

  return (
    <div className="fade-in">
      {/* SEKME BAR */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('servis-' + s.key)}
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
      {aktifSekme === 'liste' && <ServisListesi setPage={setPage} user={user}/>}
      {aktifSekme === 'yeni'  && <ServisYeni    setPage={setPage} user={user}/>}
      {aktifSekme === 'rapor' && <ServisRapor   setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   HİZMET TÜRLERİ SABİTİ
   ═══════════════════════════════════════════════════════════ */
const HIZMET_TURLERI = ['KAPORTACI', 'OTO BOYA', 'OTO CAM', 'OTO ELEKTRİK', 'ÇEKİCİ', 'EKSPERTİZ', 'DİĞER'];

const IHBAR_DURUMLARI = [
  {key:'YENİ',       label:'YENİ',       color: MR.C.accent},
  {key:'İŞLEMDE',    label:'İŞLEMDE',    color: MR.C.warning},
  {key:'TAMAMLANDI', label:'TAMAMLANDI', color: MR.C.success},
  {key:'İPTAL',      label:'İPTAL',      color: MR.C.danger}
];

const ihbarDurumRenk = (d) => {
  const found = IHBAR_DURUMLARI.find(x => x.key === d);
  return found ? found.color : MR.C.textSec;
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1 – SERVİS LİSTESİ
   ═══════════════════════════════════════════════════════════ */
const ServisListesi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, fmt, fmtInput, parseNum, ILLER} = MR;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({toplam:0, aktif:0, pasif:0, ihbar:0});

  /* FİLTRELER */
  const [durumF, setDurumF] = useState('');
  const [ilF, setIlF] = useState('');
  const [aramaF, setAramaF] = useState('');

  /* SAYFALAMA */
  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  /* DETAY MODAL */
  const [detayModal, setDetayModal] = useState(false);
  const [seciliServis, setSeciliServis] = useState(null);
  const [detayLoading, setDetayLoading] = useState(false);
  const [ihbarlar, setIhbarlar] = useState([]);
  const [ihbarLoading, setIhbarLoading] = useState(false);
  const [detayTab, setDetayTab] = useState('bilgi');

  /* DÜZENLE */
  const [duzenleModal, setDuzenleModal] = useState(false);
  const [duzenleForm, setDuzenleForm] = useState({});
  const [duzenleLoading, setDuzenleLoading] = useState(false);
  const [duzenleHata, setDuzenleHata] = useState('');

  /* İHBAR FORMU */
  const [ihbarForm, setIhbarForm] = useState({ihbar_turu:'', plaka:'', arac_bilgi:'', hasar_aciklama:'', asistans_durumu:''});
  const [ihbarKayitLoading, setIhbarKayitLoading] = useState(false);
  const [ihbarHata, setIhbarHata] = useState('');
  const [ihbarBasari, setIhbarBasari] = useState('');

  /* SİLME ONAY */
  const [confirm, setConfirm] = useState({open:false, msg:'', cb:null});

  /* TOPLU SİLME */
  const [secililer, setSecililer] = useState([]);
  const [topluSilConfirm, setTopluSilConfirm] = useState(false);
  const [topluSilLoading, setTopluSilLoading] = useState(false);
  const isAdmin = user?.rol === 'admin';

  /* VERİ YÜKLE */
  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {limit, offset};
    if (durumF) p.durum = durumF;
    if (ilF) p.il = ilF;
    if (aramaF) p.q = aramaF;
    const r = await api.servisList(p);
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setData(items);
      setTotalCount(r.data?.pagination?.total || items.length);
      if (!durumF && !ilF && !aramaF && offset === 0) {
        const topAll = r.data?.pagination?.total || items.length;
        const aktifS = items.filter(s => s.durum === 'AKTİF' || s.aktif === true || s.aktif === 1).length;
        const pasifS = items.filter(s => s.durum === 'PASİF' || s.aktif === false || s.aktif === 0).length;
        const ihbarT = items.reduce((t, s) => t + (parseInt(s.ihbar_sayisi) || 0), 0);
        setStats({toplam: topAll, aktif: aktifS || (topAll - pasifS), pasif: pasifS, ihbar: ihbarT});
      }
    }
    setLoading(false);
  }, [durumF, ilF, aramaF, offset]);

  useEffect(() => { yukle(); }, [yukle]);
  useEffect(() => { const t = setTimeout(() => { setOffset(0); yukle(); }, 400); return () => clearTimeout(t); }, [aramaF]);

  /* DETAY AÇ */
  const detayAc = async (servis) => {
    setDetayModal(true);
    setDetayLoading(true);
    setDetayTab('bilgi');
    setIhbarlar([]);
    const r = await api.servisGet(servis.id);
    if (r?.success) {
      setSeciliServis(r.data);
    } else {
      setSeciliServis(servis);
    }
    setDetayLoading(false);
    ihbarYukle(servis.id);
  };

  /* İHBARLARI YÜKLE */
  const ihbarYukle = async (servisId) => {
    setIhbarLoading(true);
    const r = await api.servisIhbarList({servis_id: servisId});
    if (r?.success) setIhbarlar(r.data?.items || r.data || []);
    setIhbarLoading(false);
  };

  /* DÜZENLE AÇ */
  const duzenleAc = (servis) => {
    setDuzenleForm({
      id: servis.id,
      firma_adi: servis.firma_adi || '',
      yetkili_adi: servis.yetkili_adi || '',
      telefon: servis.telefon || '',
      telefon2: servis.telefon2 || '',
      email: servis.email || '',
      adres: servis.adres || '',
      il: servis.il || '',
      ilce: servis.ilce || '',
      vergi_no: servis.vergi_no || '',
      hizmet_turleri: servis.hizmet_turleri || '',
      anlasma_kosullari: servis.anlasma_kosullari || '',
      komisyon_orani: servis.komisyon_orani || '',
      notlar: servis.notlar || '',
      durum: servis.durum || 'AKTİF'
    });
    setDuzenleHata('');
    setDuzenleModal(true);
  };

  /* DÜZENLE KAYDET */
  const duzenleKaydet = async () => {
    if (!duzenleForm.firma_adi?.trim()) { setDuzenleHata('FİRMA ADI ZORUNLUDUR'); return; }
    setDuzenleLoading(true); setDuzenleHata('');
    const r = await api.servisUpdate(duzenleForm);
    if (r?.success) {
      setDuzenleModal(false);
      yukle();
    } else {
      setDuzenleHata(r?.error || 'GÜNCELLEME HATASI');
    }
    setDuzenleLoading(false);
  };

  /* SİL */
  const silOnay = (servis) => {
    setConfirm({
      open: true,
      msg: `"${servis.firma_adi}" SERVİSİNİ SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?`,
      cb: async () => {
        setConfirm({open:false, msg:'', cb:null});
        const r = await api.servisDelete(servis.id);
        if (r?.success) yukle();
      }
    });
  };

  /* İHBAR KAYDET */
  const ihbarKaydet = async () => {
    if (!ihbarForm.ihbar_turu?.trim()) { setIhbarHata('İHBAR TÜRÜ ZORUNLUDUR'); return; }
    if (!ihbarForm.plaka?.trim()) { setIhbarHata('PLAKA ZORUNLUDUR'); return; }
    setIhbarKayitLoading(true); setIhbarHata(''); setIhbarBasari('');
    const gonder = {
      servis_id: seciliServis.id,
      ihbar_turu: ihbarForm.ihbar_turu,
      plaka: ihbarForm.plaka,
      arac_bilgi: ihbarForm.arac_bilgi,
      hasar_aciklama: ihbarForm.hasar_aciklama,
      asistans_durumu: ihbarForm.asistans_durumu,
      durum: 'YENİ'
    };
    const r = await api.servisIhbarCreate(gonder);
    if (r?.success) {
      setIhbarBasari('İHBAR BAŞARIYLA KAYDEDİLDİ');
      setIhbarForm({ihbar_turu:'', plaka:'', arac_bilgi:'', hasar_aciklama:'', asistans_durumu:''});
      ihbarYukle(seciliServis.id);
      setTimeout(() => setIhbarBasari(''), 3000);
    } else {
      setIhbarHata(r?.error || 'İHBAR KAYIT HATASI');
    }
    setIhbarKayitLoading(false);
  };

  /* İHBAR DURUM DEĞİŞTİR */
  const ihbarDurumDegistir = async (ihbar, yeniDurum) => {
    const r = await api.servisIhbarUpdate({id: ihbar.id, durum: yeniDurum});
    if (r?.success && seciliServis) ihbarYukle(seciliServis.id);
  };

  /* TOPLU SİLME FONKSİYONLARI */
  const toggleSecim = (id) => {
    setSecililer(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const tumunuSec = () => {
    if (secililer.length === data.length) {
      setSecililer([]);
    } else {
      setSecililer(data.map(s => s.id));
    }
  };

  const topluSil = async () => {
    setTopluSilLoading(true);
    const r = await api.servisBulkDelete(secililer);
    if (r?.success) {
      setSecililer([]);
      setTopluSilConfirm(false);
      yukle();
    }
    setTopluSilLoading(false);
  };

  /* HİZMET TÜRLERİ PARSE */
  const hizmetParse = (str) => {
    if (!str) return [];
    try { return JSON.parse(str); } catch(e) { return str.split(',').map(s => s.trim()).filter(Boolean); }
  };

  /* SAYFALAMA */
  const toplamSayfa = Math.ceil(totalCount / limit);
  const mevcutSayfa = Math.floor(offset / limit) + 1;

  return (
    <div>
      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="Truck" label="TOPLAM SERVİS" value={stats.toplam} color={C.accent}/>
        <StatCard icon="CheckCircle" label="AKTİF" value={stats.aktif} color={C.success}/>
        <StatCard icon="XCircle" label="PASİF" value={stats.pasif} color={C.danger}/>
        <StatCard icon="AlertTriangle" label="TOPLAM İHBAR" value={stats.ihbar} color={C.warning}/>
      </div>

      {/* SERVİS TABLOSU */}
      <div style={S.card}>
        <SectionTitle icon="Truck" title="SERVİS LİSTESİ"
          sub={`${totalCount} SERVİS KAYITLI`}
          right={
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              {isAdmin && secililer.length > 0 && (
                <button style={{...S.btn,...S.btnD,fontSize:9,padding:'5px 10px',display:'flex',alignItems:'center',gap:4}} onClick={() => setTopluSilConfirm(true)}>
                  <LIcon name="Trash2" size={13} color="#fff"/> TOPLU SİL ({secililer.length})
                </button>
              )}
              <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={() => setPage('servis-yeni')}>
                <LIcon name="Plus" size={14} color="#fff"/> YENİ SERVİS
              </button>
            </div>
          }/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>DURUM</label>
            <select style={{...S.select,width:140,fontSize:11}} value={durumF} onChange={e => {setDurumF(e.target.value);setOffset(0);}}>
              <option value="">TÜMÜ</option>
              <option value="AKTİF">AKTİF</option>
              <option value="PASİF">PASİF</option>
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>İL</label>
            <select style={{...S.select,width:160,fontSize:11}} value={ilF} onChange={e => {setIlF(e.target.value);setOffset(0);}}>
              <option value="">TÜMÜ</option>
              {(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>ARAMA</label>
            <input placeholder="FİRMA ADI, YETKİLİ, TELEFON..." value={aramaF} onChange={e => setAramaF(e.target.value)}
              style={{...S.input,width:220,fontSize:11}}/>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setDurumF('');setIlF('');setAramaF('');setOffset(0);}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        {/* TABLO */}
        {loading ? <Loading/> : (
          <div style={{overflowX:'auto'}}>
            {data.length === 0 ? (
              <EmptyState icon="Truck" title="SERVİS BULUNAMADI" desc="KAYITLI SERVİS BULUNMAMAKTADIR"/>
            ) : (
              <>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:1000}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {isAdmin && <th style={{padding:'10px 12px',textAlign:'center',borderBottom:`1px solid ${C.border}`,width:36}}>
                        <input type="checkbox" checked={data.length > 0 && secililer.length === data.length} onChange={tumunuSec} style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                      </th>}
                      {['FİRMA ADI','YETKİLİ','TELEFON','İL','HİZMET TÜRLERİ','DURUM','İŞLEMLER'].map(h =>
                        <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((s, i) => {
                      const aktif = s.durum === 'AKTİF' || s.aktif === true || s.aktif === 1;
                      const hizmetler = hizmetParse(s.hizmet_turleri);
                      return (
                        <tr key={s.id || i} style={{borderBottom:`1px solid ${C.border}`,cursor:'pointer'}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                          onClick={() => detayAc(s)}>
                          {isAdmin && <td style={{padding:'10px 12px',textAlign:'center'}} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={secililer.includes(s.id)} onChange={() => toggleSecim(s.id)} style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                          </td>}
                          <td style={{padding:'10px 12px',fontWeight:600}}>{s.firma_adi}</td>
                          <td style={{padding:'10px 12px',color:C.textSec}}>{s.yetkili_adi || '-'}</td>
                          <td style={{padding:'10px 12px',color:C.textSec}}>{s.telefon || '-'}</td>
                          <td style={{padding:'10px 12px'}}>{s.il || '-'}</td>
                          <td style={{padding:'10px 12px'}}>
                            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                              {hizmetler.length > 0 ? hizmetler.slice(0,3).map((h, hi) =>
                                <Badge key={hi} text={h} color={[C.accent, C.purple, C.cyan, C.pink, C.warning, C.success, C.gold][hi % 7]}/>
                              ) : <span style={{color:C.textMuted}}>-</span>}
                              {hizmetler.length > 3 && <Badge text={`+${hizmetler.length - 3}`} color={C.textSec}/>}
                            </div>
                          </td>
                          <td style={{padding:'10px 12px'}}><Badge text={aktif ? 'AKTİF' : 'PASİF'} color={aktif ? C.success : C.danger}/></td>
                          <td style={{padding:'10px 12px'}} onClick={e => e.stopPropagation()}>
                            <div style={{display:'flex',gap:6}}>
                              <div onClick={() => detayAc(s)}
                                style={{width:28,height:28,borderRadius:6,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                                title="DETAY">
                                <LIcon name="Eye" size={13} color={C.accent}/>
                              </div>
                              <div onClick={() => duzenleAc(s)}
                                style={{width:28,height:28,borderRadius:6,background:`${C.warning}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                                title="DÜZENLE">
                                <LIcon name="Pencil" size={13} color={C.warning}/>
                              </div>
                              <div onClick={() => silOnay(s)}
                                style={{width:28,height:28,borderRadius:6,background:`${C.danger}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                                title="SİL">
                                <LIcon name="Trash2" size={13} color={C.danger}/>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* SAYFALAMA */}
                {toplamSayfa > 1 && (
                  <div style={{padding:'14px 20px',display:'flex',justifyContent:'center',alignItems:'center',gap:8}}>
                    <button style={{...S.btn,...S.btnG,fontSize:11,padding:'6px 12px'}} disabled={mevcutSayfa <= 1}
                      onClick={() => setOffset(Math.max(0, offset - limit))}>
                      <LIcon name="ChevronLeft" size={14} color={C.textSec}/> ÖNCEKİ
                    </button>
                    <span style={{fontSize:12,color:C.textSec,fontWeight:600}}>
                      {mevcutSayfa} / {toplamSayfa}
                    </span>
                    <button style={{...S.btn,...S.btnG,fontSize:11,padding:'6px 12px'}} disabled={mevcutSayfa >= toplamSayfa}
                      onClick={() => setOffset(offset + limit)}>
                      SONRAKİ <LIcon name="ChevronRight" size={14} color={C.textSec}/>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ DETAY MODAL ═══ */}
      <Modal open={detayModal} onClose={() => setDetayModal(false)} title="SERVİS DETAY" width="80vw">
        {detayLoading ? <Loading/> : !seciliServis ? (
          <EmptyState icon="Truck" title="SERVİS VERİSİ YÜKLENEMEDİ" desc="TEKRAR DENEYİN"/>
        ) : (
          <div>
            {/* DETAY SEKMELERİ */}
            <div style={{display:'flex',gap:4,marginBottom:20}}>
              {[{key:'bilgi',label:'SERVİS BİLGİLERİ',icon:'Info'},{key:'ihbar',label:'İHBAR YÖNETİMİ',icon:'AlertTriangle'},{key:'finans',label:'FİNANSAL ÖZET',icon:'TurkishLira'}].map(t => (
                <div key={t.key} onClick={() => setDetayTab(t.key)}
                  style={{padding:'10px 20px',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:detayTab===t.key?700:500,
                    background:detayTab===t.key?`${C.accent}22`:'transparent',color:detayTab===t.key?C.accent:C.textSec,
                    border:`1px solid ${detayTab===t.key?C.accent+'44':C.border}`,display:'flex',alignItems:'center',gap:6}}>
                  <LIcon name={t.icon} size={14} color={detayTab===t.key?C.accent:C.textMuted}/> {t.label}
                </div>
              ))}
            </div>

            {/* SERVİS BİLGİLERİ */}
            {detayTab === 'bilgi' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>FİRMA ADI</div>
                  <div style={{fontSize:14,fontWeight:700}}>{seciliServis.firma_adi}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>YETKİLİ ADI</div>
                  <div style={{fontSize:14,fontWeight:600}}>{seciliServis.yetkili_adi || '-'}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>TELEFON</div>
                  <div style={{fontSize:13}}>{seciliServis.telefon || '-'}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>TELEFON 2</div>
                  <div style={{fontSize:13}}>{seciliServis.telefon2 || '-'}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>E-POSTA</div>
                  <div style={{fontSize:13}}>{seciliServis.email || '-'}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>İL / İLÇE</div>
                  <div style={{fontSize:13}}>{seciliServis.il || '-'} / {seciliServis.ilce || '-'}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16,gridColumn:'span 2'}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>ADRES</div>
                  <div style={{fontSize:13}}>{seciliServis.adres || '-'}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>VERGİ NO</div>
                  <div style={{fontSize:13}}>{seciliServis.vergi_no || '-'}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>KOMİSYON ORANI</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.accent}}>%{seciliServis.komisyon_orani || '0'}</div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>HİZMET TÜRLERİ</div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:4}}>
                    {hizmetParse(seciliServis.hizmet_turleri).map((h, i) =>
                      <Badge key={i} text={h} color={[C.accent,C.purple,C.cyan,C.pink,C.warning,C.success,C.gold][i % 7]}/>
                    )}
                    {hizmetParse(seciliServis.hizmet_turleri).length === 0 && <span style={{color:C.textMuted,fontSize:12}}>-</span>}
                  </div>
                </div>
                <div style={{background:C.bgHover,borderRadius:10,padding:16}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>DURUM</div>
                  <Badge text={seciliServis.durum || 'AKTİF'} color={(seciliServis.durum === 'PASİF' || seciliServis.aktif === false || seciliServis.aktif === 0) ? C.danger : C.success}/>
                </div>
                {seciliServis.anlasma_kosullari && (
                  <div style={{background:C.bgHover,borderRadius:10,padding:16,gridColumn:'span 2'}}>
                    <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>ANLAŞMA KOŞULLARI</div>
                    <div style={{fontSize:12,lineHeight:1.6}}>{seciliServis.anlasma_kosullari}</div>
                  </div>
                )}
                {seciliServis.notlar && (
                  <div style={{background:C.bgHover,borderRadius:10,padding:16,gridColumn:'span 2'}}>
                    <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>NOTLAR</div>
                    <div style={{fontSize:12,lineHeight:1.6}}>{seciliServis.notlar}</div>
                  </div>
                )}
              </div>
            )}

            {/* İHBAR YÖNETİMİ */}
            {detayTab === 'ihbar' && (
              <div>
                {/* İHBAR LİSTESİ */}
                <div style={{...S.card, marginBottom:20}}>
                  <SectionTitle icon="AlertTriangle" title="İHBAR LİSTESİ" sub={`${ihbarlar.length} İHBAR`}/>
                  <div style={S.cardBody}>
                    {ihbarLoading ? <Loading/> : ihbarlar.length === 0 ? (
                      <EmptyState icon="AlertTriangle" title="İHBAR BULUNAMADI" desc="BU SERVİSE AİT İHBAR KAYDI BULUNMAMAKTADIR"/>
                    ) : (
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead>
                          <tr style={{background:C.bgHover}}>
                            {['TARİH','İHBAR TÜRÜ','PLAKA','ARAÇ BİLGİ','HASAR','ASİSTANS','DURUM','İŞLEM'].map(h =>
                              <th key={h} style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {ihbarlar.map((ih, i) => (
                            <tr key={ih.id || i} style={{borderBottom:`1px solid ${C.border}`}}>
                              <td style={{padding:'10px 8px',color:C.textSec,fontSize:10}}>{ih.tarih || ih.created_at?.split(' ')[0] || '-'}</td>
                              <td style={{padding:'10px 8px',fontWeight:600}}>{ih.ihbar_turu || '-'}</td>
                              <td style={{padding:'10px 8px',fontWeight:600,color:C.accent}}>{ih.plaka || '-'}</td>
                              <td style={{padding:'10px 8px',color:C.textSec}}>{ih.arac_bilgi || '-'}</td>
                              <td style={{padding:'10px 8px',color:C.textSec,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ih.hasar_aciklama || '-'}</td>
                              <td style={{padding:'10px 8px',color:C.textSec}}>{ih.asistans_durumu || '-'}</td>
                              <td style={{padding:'10px 8px'}}><Badge text={ih.durum || 'YENİ'} color={ihbarDurumRenk(ih.durum)}/></td>
                              <td style={{padding:'10px 8px'}}>
                                <select style={{...S.select,width:120,fontSize:10,padding:'4px 8px'}}
                                  value={ih.durum || 'YENİ'}
                                  onChange={e => ihbarDurumDegistir(ih, e.target.value)}>
                                  {IHBAR_DURUMLARI.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* YENİ İHBAR FORMU */}
                <div style={S.card}>
                  <SectionTitle icon="Plus" title="YENİ İHBAR OLUŞTUR" sub="SERVİSE YENİ İHBAR KAYDI EKLE"/>
                  <div style={S.cardBody}>
                    {ihbarHata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
                      <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{ihbarHata}
                    </div>}
                    {ihbarBasari && <div style={{padding:10,background:`${C.success}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.success,border:`1px solid ${C.success}44`}}>
                      <LIcon name="CheckCircle" size={14} color={C.success} style={{marginRight:6}}/>{ihbarBasari}
                    </div>}

                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                      <FormGroup label="İHBAR TÜRÜ *">
                        <select style={S.select} value={ihbarForm.ihbar_turu} onChange={e => setIhbarForm(p => ({...p, ihbar_turu: e.target.value}))}>
                          <option value="">SEÇİNİZ</option>
                          <option value="KAZA">KAZA</option>
                          <option value="CAM KIRIGI">CAM KIRIGI</option>
                          <option value="HIRSIZLIK">HIRSIZLIK</option>
                          <option value="DOĞAL AFET">DOĞAL AFET</option>
                          <option value="YANGIN">YANGIN</option>
                          <option value="DİĞER">DİĞER</option>
                        </select>
                      </FormGroup>
                      <FormGroup label="PLAKA *">
                        <input style={S.input} value={ihbarForm.plaka} onChange={e => setIhbarForm(p => ({...p, plaka: e.target.value.toUpperCase()}))} placeholder="34 ABC 123"/>
                      </FormGroup>
                      <FormGroup label="ARAÇ BİLGİ">
                        <input style={S.input} value={ihbarForm.arac_bilgi} onChange={e => setIhbarForm(p => ({...p, arac_bilgi: e.target.value.toUpperCase()}))} placeholder="MARKA MODEL YIL"/>
                      </FormGroup>
                      <FormGroup label="ASİSTANS DURUMU">
                        <select style={S.select} value={ihbarForm.asistans_durumu} onChange={e => setIhbarForm(p => ({...p, asistans_durumu: e.target.value}))}>
                          <option value="">SEÇİNİZ</option>
                          <option value="GEREKLİ">GEREKLİ</option>
                          <option value="GEREKSİZ">GEREKSİZ</option>
                          <option value="TAMAMLANDI">TAMAMLANDI</option>
                        </select>
                      </FormGroup>
                      <FormGroup label="HASAR AÇIKLAMA" full>
                        <textarea style={{...S.input,minHeight:70}} value={ihbarForm.hasar_aciklama}
                          onChange={e => setIhbarForm(p => ({...p, hasar_aciklama: e.target.value.toUpperCase()}))} placeholder="HASAR DETAYLARI..."/>
                      </FormGroup>
                    </div>
                    <div style={{marginTop:16,display:'flex',gap:8}}>
                      <button style={{...S.btn,...S.btnS,fontSize:11}} onClick={ihbarKaydet} disabled={ihbarKayitLoading}>
                        <LIcon name="Plus" size={14} color="#fff"/> {ihbarKayitLoading ? 'KAYDEDİLİYOR...' : 'İHBAR KAYDET'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FİNANSAL ÖZET */}
            {detayTab === 'finans' && (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
                  <div style={{background:`${C.accent}11`,borderRadius:12,padding:20,border:`1px solid ${C.accent}33`,textAlign:'center'}}>
                    <div style={{fontSize:10,color:C.textMuted,marginBottom:8}}>TOPLAM İHBAR</div>
                    <div style={{fontSize:28,fontWeight:900,color:C.accent}}>{ihbarlar.length}</div>
                  </div>
                  <div style={{background:`${C.success}11`,borderRadius:12,padding:20,border:`1px solid ${C.success}33`,textAlign:'center'}}>
                    <div style={{fontSize:10,color:C.textMuted,marginBottom:8}}>TAMAMLANAN</div>
                    <div style={{fontSize:28,fontWeight:900,color:C.success}}>{ihbarlar.filter(ih => ih.durum === 'TAMAMLANDI').length}</div>
                  </div>
                  <div style={{background:`${C.warning}11`,borderRadius:12,padding:20,border:`1px solid ${C.warning}33`,textAlign:'center'}}>
                    <div style={{fontSize:10,color:C.textMuted,marginBottom:8}}>İŞLEMDEKİ</div>
                    <div style={{fontSize:28,fontWeight:900,color:C.warning}}>{ihbarlar.filter(ih => ih.durum === 'İŞLEMDE' || ih.durum === 'YENİ').length}</div>
                  </div>
                </div>

                <div style={S.card}>
                  <SectionTitle icon="TurkishLira" title="KOMİSYON BİLGİSİ" sub="SERVİS KOMİSYON DETAYI"/>
                  <div style={S.cardBody}>
                    <div style={{display:'flex',alignItems:'center',gap:20}}>
                      <div style={{width:80,height:80,borderRadius:'50%',background:`${C.accent}22`,border:`3px solid ${C.accent}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:22,fontWeight:900,color:C.accent}}>%{seciliServis.komisyon_orani || '0'}</span>
                      </div>
                      <div>
                        <div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>KOMİSYON ORANI</div>
                        <div style={{fontSize:16,fontWeight:700}}>BU SERVİS İÇİN BELİRLENEN KOMİSYON ORANI</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ═══ DÜZENLE MODAL ═══ */}
      <Modal open={duzenleModal} onClose={() => setDuzenleModal(false)} title="SERVİS DÜZENLE" width="700px">
        {duzenleHata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger}}>{duzenleHata}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="FİRMA ADI *">
            <input style={S.input} value={duzenleForm.firma_adi||''} onChange={e => setDuzenleForm(p => ({...p, firma_adi: e.target.value.toUpperCase()}))} placeholder="FİRMA ADI"/>
          </FormGroup>
          <FormGroup label="YETKİLİ ADI">
            <input style={S.input} value={duzenleForm.yetkili_adi||''} onChange={e => setDuzenleForm(p => ({...p, yetkili_adi: e.target.value.toUpperCase()}))} placeholder="YETKİLİ ADI"/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input style={S.input} value={duzenleForm.telefon||''} onChange={e => setDuzenleForm(p => ({...p, telefon: e.target.value}))} placeholder="05XX XXX XXXX"/>
          </FormGroup>
          <FormGroup label="TELEFON 2">
            <input style={S.input} value={duzenleForm.telefon2||''} onChange={e => setDuzenleForm(p => ({...p, telefon2: e.target.value}))} placeholder="05XX XXX XXXX"/>
          </FormGroup>
          <FormGroup label="E-POSTA">
            <input style={S.input} value={duzenleForm.email||''} onChange={e => setDuzenleForm(p => ({...p, email: e.target.value}))} placeholder="E-POSTA"/>
          </FormGroup>
          <FormGroup label="İL">
            <select style={S.select} value={duzenleForm.il||''} onChange={e => setDuzenleForm(p => ({...p, il: e.target.value}))}>
              <option value="">SEÇİNİZ</option>{(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="İLÇE">
            <input style={S.input} value={duzenleForm.ilce||''} onChange={e => setDuzenleForm(p => ({...p, ilce: e.target.value.toUpperCase()}))} placeholder="İLÇE"/>
          </FormGroup>
          <FormGroup label="VERGİ NO">
            <input style={S.input} value={duzenleForm.vergi_no||''} onChange={e => setDuzenleForm(p => ({...p, vergi_no: e.target.value}))} placeholder="VERGİ NO"/>
          </FormGroup>
          <FormGroup label="KOMİSYON ORANI (%)">
            <input type="number" style={S.input} value={duzenleForm.komisyon_orani||''} onChange={e => setDuzenleForm(p => ({...p, komisyon_orani: e.target.value}))} placeholder="0" min="0" max="100"/>
          </FormGroup>
          <FormGroup label="DURUM">
            <select style={S.select} value={duzenleForm.durum||'AKTİF'} onChange={e => setDuzenleForm(p => ({...p, durum: e.target.value}))}>
              <option value="AKTİF">AKTİF</option>
              <option value="PASİF">PASİF</option>
            </select>
          </FormGroup>
          <FormGroup label="ADRES" full>
            <textarea style={{...S.input,minHeight:60}} value={duzenleForm.adres||''} onChange={e => setDuzenleForm(p => ({...p, adres: e.target.value.toUpperCase()}))} placeholder="ADRES"/>
          </FormGroup>
          <FormGroup label="NOTLAR" full>
            <textarea style={{...S.input,minHeight:60}} value={duzenleForm.notlar||''} onChange={e => setDuzenleForm(p => ({...p, notlar: e.target.value.toUpperCase()}))} placeholder="NOTLAR"/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setDuzenleModal(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={duzenleKaydet} disabled={duzenleLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {duzenleLoading ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
          </button>
        </div>
      </Modal>

      {/* ONAY DİALOG */}
      <Confirm open={confirm.open} message={confirm.msg}
        onConfirm={() => confirm.cb && confirm.cb()}
        onCancel={() => setConfirm({open:false, msg:'', cb:null})}/>

      {/* TOPLU SİLME ONAY DİALOG */}
      <Confirm open={topluSilConfirm}
        message={`SEÇİLEN ${secililer.length} SERVİS KALICI OLARAK SİLİNECEK!\n\nBU İŞLEM GERİ ALINAMAZ! DEVAM EDİLSİN Mİ?`}
        onConfirm={topluSil}
        onCancel={() => setTopluSilConfirm(false)}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 2 – YENİ SERVİS
   ═══════════════════════════════════════════════════════════ */
const ServisYeni = ({setPage, user}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, api, ILLER} = MR;
  const [form, setForm] = useState({
    firma_adi:'', yetkili_adi:'', telefon:'', telefon2:'', email:'',
    adres:'', il:'', ilce:'', vergi_no:'', hizmet_turleri:[],
    anlasma_kosullari:'', komisyon_orani:'', notlar:''
  });
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  /* HİZMET TÜRÜ TOGGLE */
  const hizmetToggle = (tur) => {
    setForm(p => {
      const mevcut = p.hizmet_turleri || [];
      if (mevcut.includes(tur)) {
        return {...p, hizmet_turleri: mevcut.filter(t => t !== tur)};
      } else {
        return {...p, hizmet_turleri: [...mevcut, tur]};
      }
    });
  };

  const kaydet = async () => {
    if (!form.firma_adi.trim()) { setHata('FİRMA ADI ZORUNLUDUR'); return; }
    setLoading(true); setHata(''); setBasari('');

    const gonder = {
      ...form,
      hizmet_turleri: JSON.stringify(form.hizmet_turleri),
      komisyon_orani: parseFloat(form.komisyon_orani) || 0
    };

    const r = await api.servisCreate(gonder);
    if (r?.success) {
      setBasari('SERVİS BAŞARIYLA KAYDEDİLDİ');
      setTimeout(() => setPage('servis-liste'), 1500);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setLoading(false);
  };

  return (
    <div style={S.card} className="fade-in">
      <SectionTitle icon="Plus" title="YENİ SERVİS KAYDI" sub="YENİ SERVİS FİRMASI EKLE"/>
      <div style={S.cardBody}>
        {hata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
          <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{hata}
        </div>}
        {basari && <div style={{padding:10,background:`${C.success}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.success,border:`1px solid ${C.success}44`}}>
          <LIcon name="CheckCircle" size={14} color={C.success} style={{marginRight:6}}/>{basari}
        </div>}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,maxWidth:900}}>
          <FormGroup label="FİRMA ADI *">
            <input style={S.input} value={form.firma_adi} onChange={e => up('firma_adi', e.target.value.toUpperCase())} placeholder="FİRMA ADI"/>
          </FormGroup>
          <FormGroup label="YETKİLİ ADI">
            <input style={S.input} value={form.yetkili_adi} onChange={e => up('yetkili_adi', e.target.value.toUpperCase())} placeholder="YETKİLİ ADI"/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input style={S.input} value={form.telefon} onChange={e => up('telefon', e.target.value)} placeholder="05XX XXX XXXX"/>
          </FormGroup>
          <FormGroup label="TELEFON 2">
            <input style={S.input} value={form.telefon2} onChange={e => up('telefon2', e.target.value)} placeholder="05XX XXX XXXX"/>
          </FormGroup>
          <FormGroup label="E-POSTA">
            <input style={S.input} value={form.email} onChange={e => up('email', e.target.value)} placeholder="E-POSTA"/>
          </FormGroup>
          <FormGroup label="İL">
            <select style={S.select} value={form.il} onChange={e => up('il', e.target.value)}>
              <option value="">SEÇİNİZ</option>{(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="İLÇE">
            <input style={S.input} value={form.ilce} onChange={e => up('ilce', e.target.value.toUpperCase())} placeholder="İLÇE"/>
          </FormGroup>
          <FormGroup label="VERGİ NO">
            <input style={S.input} value={form.vergi_no} onChange={e => up('vergi_no', e.target.value)} placeholder="VERGİ NO"/>
          </FormGroup>
          <FormGroup label="KOMİSYON ORANI (%)">
            <input type="number" style={S.input} value={form.komisyon_orani} onChange={e => up('komisyon_orani', e.target.value)} placeholder="0" min="0" max="100"/>
          </FormGroup>
        </div>

        {/* HİZMET TÜRLERİ CHECKBOX GRUBU */}
        <div style={{marginTop:20}}>
          <label style={{...S.label,marginBottom:10}}>HİZMET TÜRLERİ</label>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {HIZMET_TURLERI.map(tur => {
              const secili = (form.hizmet_turleri || []).includes(tur);
              return (
                <div key={tur} onClick={() => hizmetToggle(tur)}
                  style={{
                    padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:secili?700:500,
                    background: secili ? `${C.accent}22` : C.bgHover,
                    color: secili ? C.accent : C.textSec,
                    border: `1px solid ${secili ? C.accent + '44' : C.border}`,
                    display:'flex', alignItems:'center', gap:6, transition:'all .2s'
                  }}>
                  <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${secili ? C.accent : C.textMuted}`,background: secili ? C.accent : 'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {secili && <LIcon name="Check" size={10} color="#fff"/>}
                  </div>
                  {tur}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:16,maxWidth:900,marginTop:20}}>
          <FormGroup label="ADRES">
            <textarea style={{...S.input,minHeight:60}} value={form.adres} onChange={e => up('adres', e.target.value.toUpperCase())} placeholder="ADRES"/>
          </FormGroup>
          <FormGroup label="ANLAŞMA KOŞULLARI">
            <textarea style={{...S.input,minHeight:80}} value={form.anlasma_kosullari} onChange={e => up('anlasma_kosullari', e.target.value.toUpperCase())} placeholder="ANLAŞMA KOŞULLARI VE DETAYLARI..."/>
          </FormGroup>
          <FormGroup label="NOTLAR">
            <textarea style={{...S.input,minHeight:60}} value={form.notlar} onChange={e => up('notlar', e.target.value.toUpperCase())} placeholder="EK NOTLAR..."/>
          </FormGroup>
        </div>

        <div style={{marginTop:24,display:'flex',gap:8}}>
          <button style={{...S.btn,...S.btnS,fontSize:13}} onClick={kaydet} disabled={loading}>
            <LIcon name="Save" size={14} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
          </button>
          <button style={{...S.btn,...S.btnG}} onClick={() => setPage('servis-liste')}>İPTAL</button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3 – SERVİS RAPOR
   ═══════════════════════════════════════════════════════════ */
const ServisRapor = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, Badge, Loading, EmptyState, api, fmt} = MR;
  const [loading, setLoading] = useState(true);
  const [rapor, setRapor] = useState(null);

  const yukle = async () => {
    setLoading(true);
    const r = await api.servisRapor();
    if (r?.success) setRapor(r.data || {});
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  const aktifServis = rapor?.aktif_servis || 0;
  const toplamIhbar = rapor?.toplam_ihbar || 0;
  const islemdeki = rapor?.islemdeki_ihbar || 0;
  const tamamlanan = rapor?.tamamlanan_ihbar || 0;

  /* İHBAR DURUM DAĞILIMI */
  const durumDagilimi = rapor?.durum_dagilimi || [];
  const maxDurumDeger = useMemo(() => {
    if (!durumDagilimi.length) return 1;
    return Math.max(...durumDagilimi.map(d => parseInt(d.sayi) || 0), 1);
  }, [durumDagilimi]);

  /* SERVİS BAZLI İHBAR TABLOSU */
  const servisIhbarlar = rapor?.servis_bazli || [];

  return (
    <div>
      {loading ? <Loading/> : !rapor ? (
        <EmptyState icon="BarChart3" title="RAPOR VERİSİ YOK" desc="RAPOR VERİLERİ YÜKLENEMEDI"/>
      ) : (
        <>
          {/* ÖZET KARTLAR */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            <StatCard icon="Truck" label="AKTİF SERVİS" value={aktifServis} color={C.success}/>
            <StatCard icon="AlertTriangle" label="TOPLAM İHBAR" value={toplamIhbar} color={C.accent}/>
            <StatCard icon="Clock" label="İŞLEMDEKİ İHBAR" value={islemdeki} color={C.warning}/>
            <StatCard icon="CheckCircle" label="TAMAMLANAN İHBAR" value={tamamlanan} color={C.success}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            {/* İHBAR DURUM DAĞILIMI GRAFİĞİ */}
            <div style={S.card}>
              <SectionTitle icon="BarChart3" title="İHBAR DURUM DAĞILIMI" sub="DURUMLARA GÖRE İHBAR SAYILARI"/>
              <div style={S.cardBody}>
                {durumDagilimi.length === 0 ? (
                  <EmptyState icon="BarChart3" title="VERİ YOK" desc="İHBAR DURUM VERİSİ BULUNMAMAKTADIR"/>
                ) : (
                  <div>
                    {durumDagilimi.map((d, i) => {
                      const sayi = parseInt(d.sayi) || 0;
                      const yuzde = maxDurumDeger > 0 ? (sayi / maxDurumDeger) * 100 : 0;
                      const renk = ihbarDurumRenk(d.durum);
                      return (
                        <div key={i} style={{marginBottom:16}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <Badge text={d.durum || 'BELİRSİZ'} color={renk}/>
                            </div>
                            <span style={{fontSize:14,fontWeight:800,color:renk}}>{sayi}</span>
                          </div>
                          <div style={{height:8,background:C.bgHover,borderRadius:4,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${yuzde}%`,background:`linear-gradient(to right, ${renk}, ${renk}cc)`,borderRadius:4,transition:'width .5s ease'}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* İHBAR TÜR DAĞILIMI */}
            <div style={S.card}>
              <SectionTitle icon="PieChart" title="İHBAR TÜR DAĞILIMI" sub="TÜRLERE GÖRE İHBAR SAYILARI"/>
              <div style={S.cardBody}>
                {!rapor?.tur_dagilimi || rapor.tur_dagilimi.length === 0 ? (
                  <EmptyState icon="PieChart" title="VERİ YOK" desc="İHBAR TÜR VERİSİ BULUNMAMAKTADIR"/>
                ) : (
                  <div>
                    {(rapor.tur_dagilimi || []).map((t, i) => {
                      const sayi = parseInt(t.sayi) || 0;
                      const renkler = [C.accent, C.success, C.warning, C.purple, C.cyan, C.pink, C.danger];
                      const renk = renkler[i % renkler.length];
                      const topSayi = (rapor.tur_dagilimi || []).reduce((tt, x) => tt + (parseInt(x.sayi) || 0), 0) || 1;
                      const yuzde = ((sayi / topSayi) * 100).toFixed(1);
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:`1px solid ${C.border}`}}>
                          <div style={{width:10,height:10,borderRadius:3,background:renk,flexShrink:0}}/>
                          <div style={{flex:1,fontSize:12,fontWeight:600}}>{(t.tur || t.ihbar_turu || 'DİĞER').toUpperCase()}</div>
                          <div style={{textAlign:'right'}}>
                            <span style={{fontSize:14,fontWeight:800,color:renk}}>{sayi}</span>
                            <span style={{fontSize:10,color:C.textMuted,marginLeft:6}}>%{yuzde}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SERVİS BAZLI İHBAR TABLOSU */}
          <div style={{...S.card, marginTop:20}}>
            <SectionTitle icon="List" title="SERVİS BAZLI İHBAR TABLOSU" sub="HER SERVİSİN İHBAR DAĞILIMI"/>
            <div style={S.cardBody}>
              {servisIhbarlar.length === 0 ? (
                <EmptyState icon="Truck" title="VERİ YOK" desc="SERVİS BAZLI İHBAR VERİSİ BULUNMAMAKTADIR"/>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {['SERVİS','YENİ','İŞLEMDE','TAMAMLANDI','İPTAL','TOPLAM'].map(h =>
                        <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {servisIhbarlar.map((s, i) => {
                      const yeni = parseInt(s.yeni) || 0;
                      const islemde = parseInt(s.islemde) || 0;
                      const tamamlandi = parseInt(s.tamamlandi) || 0;
                      const iptal = parseInt(s.iptal) || 0;
                      const toplam = yeni + islemde + tamamlandi + iptal;
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'10px 12px',fontWeight:600}}>{s.firma_adi || s.servis_adi || '-'}</td>
                          <td style={{padding:'10px 12px'}}><Badge text={String(yeni)} color={C.accent}/></td>
                          <td style={{padding:'10px 12px'}}><Badge text={String(islemde)} color={C.warning}/></td>
                          <td style={{padding:'10px 12px'}}><Badge text={String(tamamlandi)} color={C.success}/></td>
                          <td style={{padding:'10px 12px'}}><Badge text={String(iptal)} color={C.danger}/></td>
                          <td style={{padding:'10px 12px',fontWeight:800,fontSize:13}}>{toplam}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:`${C.accent}08`,borderTop:`2px solid ${C.border}`}}>
                      <td style={{padding:'12px',fontWeight:800,fontSize:12}}>GENEL TOPLAM</td>
                      <td style={{padding:'12px',fontWeight:700,color:C.accent}}>{servisIhbarlar.reduce((t,s) => t + (parseInt(s.yeni)||0), 0)}</td>
                      <td style={{padding:'12px',fontWeight:700,color:C.warning}}>{servisIhbarlar.reduce((t,s) => t + (parseInt(s.islemde)||0), 0)}</td>
                      <td style={{padding:'12px',fontWeight:700,color:C.success}}>{servisIhbarlar.reduce((t,s) => t + (parseInt(s.tamamlandi)||0), 0)}</td>
                      <td style={{padding:'12px',fontWeight:700,color:C.danger}}>{servisIhbarlar.reduce((t,s) => t + (parseInt(s.iptal)||0), 0)}</td>
                      <td style={{padding:'12px',fontWeight:900,fontSize:14}}>{servisIhbarlar.reduce((t,s) => t + (parseInt(s.yeni)||0) + (parseInt(s.islemde)||0) + (parseInt(s.tamamlandi)||0) + (parseInt(s.iptal)||0), 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
