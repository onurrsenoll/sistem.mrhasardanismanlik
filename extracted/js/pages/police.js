/**
 * MR HASAR DANIŞMANLIK - POLİÇE TAKİP MODÜLÜ
 * POLİÇE LİSTESİ, YENİ POLİÇE, YENİLEME TAKİBİ, TAHSİLAT/CARİ, RAPORLAR, KAZANÇ
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useMemo, useCallback} = React;

/* ═══ SABİTLER ═══ */
const BRANSLAR = ['KASKO','TRAFİK','DASK','KONUT','İŞYERİ','SAĞLIK','HAYAT','YANGIN','NAKLİYAT','MÜHENDİSLİK','SORUMLULUK','FERDİ KAZA','DİĞER'];
const ODEME_SEKILLERI = [{v:'nakit',l:'NAKİT'},{v:'havale',l:'HAVALE/EFT'},{v:'kredi_karti',l:'KREDİ KARTI'},{v:'cek',l:'ÇEK'},{v:'diger',l:'DİĞER'}];
const DURUM_RENK = (d,C) => ({aktif:C.success, suresi_doldu:C.danger, iptal:C.textMuted, yenilendi:C.purple}[d] || C.textSec);
const DURUM_LABEL = {aktif:'AKTİF', suresi_doldu:'SÜRESİ DOLDU', iptal:'İPTAL', yenilendi:'YENİLENDİ'};
const TAHSILAT_RENK = (d,C) => ({tahsil_edildi:C.success, kismen_tahsil:C.warning, beklemede:C.danger}[d] || C.textMuted);
const TAHSILAT_LABEL = {tahsil_edildi:'TAHSİL EDİLDİ', kismen_tahsil:'KISMİ TAHSİL', beklemede:'BEKLEMEDE'};

const fmt = (n) => (parseFloat(n)||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₺';
const parseNum = (v) => parseFloat(String(v).replace(/\./g,'').replace(',','.'))||0;
const fmtTarih = (t) => t ? new Date(t).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-';

/* ═══════════════════════════════════════════════════════════
   ANA POLİÇE SAYFA BİLEŞENİ
   ═══════════════════════════════════════════════════════════ */
MR.PolicePage = ({setPage, user, subPage}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, Confirm, api} = MR;
  const aktifSekme = subPage || 'liste';

  const sekmeler = [
    {key:'liste',    label:'POLİÇE LİSTESİ',   icon:'List'},
    {key:'yeni',     label:'YENİ POLİÇE',       icon:'Plus'},
    {key:'yenileme', label:'YENİLEME TAKİBİ',   icon:'RefreshCw'},
    {key:'tahsilat', label:'TAHSİLAT / CARİ',   icon:'Wallet'},
    {key:'rapor',    label:'RAPORLAR',           icon:'BarChart3'},
    {key:'kazanc',   label:'KAZANÇ',             icon:'TrendingUp'}
  ];

  return (
    <div className="fade-in">
      {/* SEKME ÇUBUĞU */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`,overflowX:'auto'}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('police-' + s.key)}
              style={{flex:1,padding:'12px 8px',borderRadius:8,cursor:'pointer',textAlign:'center',minWidth:100,
                background:aktif?`${C.accent}22`:'transparent',border:`1px solid ${aktif?C.accent+'44':'transparent'}`,transition:'all .2s'}}
              onMouseEnter={e=>{if(!aktif)e.currentTarget.style.background=C.bgHover}}
              onMouseLeave={e=>{if(!aktif)e.currentTarget.style.background='transparent'}}>
              <LIcon name={s.icon} size={16} color={aktif?C.accent:C.textMuted} style={{marginBottom:4}}/>
              <div style={{fontSize:10,fontWeight:aktif?700:500,color:aktif?C.accent:C.textSec,marginTop:4,letterSpacing:.5}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {aktifSekme === 'liste'    && <PoliceListe setPage={setPage} user={user}/>}
      {aktifSekme === 'yeni'     && <PoliceYeni setPage={setPage} user={user}/>}
      {aktifSekme === 'yenileme' && <PoliceYenileme setPage={setPage} user={user}/>}
      {aktifSekme === 'tahsilat' && <PoliceTahsilat setPage={setPage} user={user}/>}
      {aktifSekme === 'rapor'    && <PoliceRapor setPage={setPage} user={user}/>}
      {aktifSekme === 'kazanc'   && <PoliceKazanc setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1: POLİÇE LİSTESİ
   ═══════════════════════════════════════════════════════════ */
const PoliceListe = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, Confirm, api} = MR;
  const [loading, setLoading] = useState(true);
  const [policeler, setPoliceler] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [arama, setArama] = useState('');
  const [durumF, setDurumF] = useState('');
  const [bransF, setBransF] = useState('');
  const [tahsilatF, setTahsilatF] = useState('');
  const [detayModal, setDetayModal] = useState(null);
  const [silOnay, setSilOnay] = useState(null);
  const [basari, setBasari] = useState('');
  const [tahsilatForm, setTahsilatForm] = useState(null);
  const [kasalar, setKasalar] = useState([]);

  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {limit:500};
    if (arama.trim()) p.arama = arama.trim();
    if (durumF) p.durum = durumF;
    if (bransF) p.brans = bransF;
    if (tahsilatF) p.tahsilat_durumu = tahsilatF;
    const r = await api.policeList(p);
    if (r?.success) {
      setPoliceler(r.data?.items || r.data || []);
      setToplam(r.data?.total || (r.data?.items||r.data||[]).length);
    }
    setLoading(false);
  }, [arama, durumF, bransF, tahsilatF]);

  useEffect(() => { yukle(); api.kasaList().then(r => { if(r?.success) setKasalar(r.data||[]); }); }, []);
  useEffect(() => { yukle(); }, [durumF, bransF, tahsilatF]);

  const detayAc = async (p) => {
    const r = await api.policeGet(p.id);
    if (r?.success) setDetayModal(r.data);
    else setDetayModal(p);
  };

  const sil = async () => {
    if (!silOnay) return;
    const r = await api.policeDelete(silOnay.id);
    if (r?.success) { setSilOnay(null); setDetayModal(null); yukle(); setBasari('POLİÇE SİLİNDİ'); setTimeout(()=>setBasari(''),3000); }
  };

  const tahsilatKaydet = async () => {
    if (!tahsilatForm) return;
    const t = parseNum(tahsilatForm.tutar);
    if (t <= 0) return;
    const r = await api.policeTahsilatEkle({
      police_id: tahsilatForm.police_id,
      tutar: t,
      tahsilat_tarihi: tahsilatForm.tarih || new Date().toISOString().slice(0,10),
      odeme_sekli: tahsilatForm.odeme_sekli || 'nakit',
      kasa_id: tahsilatForm.kasa_id ? parseInt(tahsilatForm.kasa_id) : undefined,
      aciklama: tahsilatForm.aciklama || ''
    });
    if (r?.success) {
      setTahsilatForm(null);
      detayAc(detayModal);
      yukle();
      setBasari('TAHSİLAT EKLENDİ');
      setTimeout(()=>setBasari(''),3000);
    }
  };

  // İstatistikler
  const aktifSayi = policeler.filter(p=>p.durum==='aktif').length;
  const topPrim = policeler.reduce((t,p)=>t+(parseFloat(p.brut_prim)||0),0);
  const topTahsil = policeler.reduce((t,p)=>t+(parseFloat(p.tahsil_edilen)||0),0);
  const topBekleyen = topPrim - topTahsil;

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && (
        <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.success}18`,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="CheckCircle" size={16} color={C.success}/><span style={{fontSize:12,fontWeight:600,color:C.success}}>{basari}</span>
        </div>
      )}

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <StatCard icon="FileCheck" label="TOPLAM POLİÇE" value={toplam} color={C.accent}/>
        <StatCard icon="Shield" label="AKTİF POLİÇE" value={aktifSayi} color={C.success}/>
        <StatCard icon="Banknote" label="TOPLAM PRİM" value={fmt(topPrim)} color={C.purple}/>
        <StatCard icon="CheckCircle" label="TAHSİL EDİLEN" value={fmt(topTahsil)} color={C.cyan}/>
        <StatCard icon="Clock" label="BEKLEYEN" value={fmt(topBekleyen)} color={C.warning}/>
      </div>

      <div style={S.card}>
        <SectionTitle icon="List" title="POLİÇE LİSTESİ" sub={toplam + ' POLİÇE'}
          right={<button style={{...S.btn,...S.btnP,fontSize:10,padding:'8px 14px'}} onClick={()=>setPage('police-yeni')}><LIcon name="Plus" size={14} color="#fff"/> YENİ POLİÇE</button>}/>

        {/* FİLTRE */}
        <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{flex:1,minWidth:200,position:'relative'}}>
            <LIcon name="Search" size={14} color={C.textMuted} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
            <input style={{...S.input,paddingLeft:36,fontSize:12}} placeholder="POLİÇE NO, MÜŞTERİ, PLAKA ARA..."
              value={arama} onChange={e=>setArama(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')yukle()}}/>
          </div>
          <select style={{...S.select,width:140,fontSize:11}} value={durumF} onChange={e=>setDurumF(e.target.value)}>
            <option value="">TÜM DURUM</option>
            <option value="aktif">AKTİF</option>
            <option value="suresi_doldu">SÜRESİ DOLDU</option>
            <option value="iptal">İPTAL</option>
            <option value="yenilendi">YENİLENDİ</option>
          </select>
          <select style={{...S.select,width:140,fontSize:11}} value={bransF} onChange={e=>setBransF(e.target.value)}>
            <option value="">TÜM BRANŞ</option>
            {BRANSLAR.map(b=><option key={b} value={b}>{b}</option>)}
          </select>
          <select style={{...S.select,width:150,fontSize:11}} value={tahsilatF} onChange={e=>setTahsilatF(e.target.value)}>
            <option value="">TÜM TAHSİLAT</option>
            <option value="beklemede">BEKLEMEDE</option>
            <option value="kismen_tahsil">KISMİ TAHSİL</option>
            <option value="tahsil_edildi">TAHSİL EDİLDİ</option>
          </select>
        </div>

        {/* TABLO */}
        {policeler.length === 0 ? (
          <EmptyState icon="FileCheck" title="POLİÇE BULUNAMADI" desc="KAYITLI POLİÇE BULUNMUYOR VEYA FİLTREYE UYGUN SONUÇ YOK"/>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:1100}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['POLİÇE NO','MÜŞTERİ','SİGORTA ŞİRKETİ','BRANŞ','BRÜT PRİM','KOMİSYON','BAŞLANGIÇ','BİTİŞ','TAHSİLAT','DURUM','İŞLEM'].map(h=>
                    <th key={h} style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`,letterSpacing:.5}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {policeler.map((p,i)=>(
                  <tr key={p.id||i} style={{borderBottom:`1px solid ${C.border}`,cursor:'pointer',transition:'all .15s'}}
                    onClick={()=>detayAc(p)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 8px',fontWeight:700,color:C.accent,fontSize:12}}>{p.police_no}</td>
                    <td style={{padding:'10px 8px',fontWeight:600}}>{p.musteri_adi}</td>
                    <td style={{padding:'10px 8px',fontSize:10,color:C.textSec}}>{p.sigorta_sirketi}</td>
                    <td style={{padding:'10px 8px'}}><Badge text={p.brans} color={C.cyan}/></td>
                    <td style={{padding:'10px 8px',fontWeight:600}}>{fmt(p.brut_prim)}</td>
                    <td style={{padding:'10px 8px',color:C.success}}>{fmt(p.komisyon_tutari)}</td>
                    <td style={{padding:'10px 8px',fontSize:10,color:C.textMuted}}>{fmtTarih(p.baslangic_tarihi)}</td>
                    <td style={{padding:'10px 8px',fontSize:10,color:C.textMuted}}>{fmtTarih(p.bitis_tarihi)}</td>
                    <td style={{padding:'10px 8px'}}><Badge text={TAHSILAT_LABEL[p.tahsilat_durumu]||p.tahsilat_durumu} color={TAHSILAT_RENK(p.tahsilat_durumu,C)}/></td>
                    <td style={{padding:'10px 8px'}}><Badge text={DURUM_LABEL[p.durum]||p.durum} color={DURUM_RENK(p.durum,C)}/></td>
                    <td style={{padding:'10px 8px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:4}}>
                        <button style={{...S.btn,...S.btnP,fontSize:9,padding:'4px 8px'}} onClick={()=>detayAc(p)}>
                          <LIcon name="Eye" size={10} color="#fff"/>
                        </button>
                        {user?.rol === 'admin' && (
                          <button style={{...S.btn,...S.btnD,fontSize:9,padding:'4px 8px'}} onClick={()=>setSilOnay(p)}>
                            <LIcon name="Trash2" size={10} color="#fff"/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {policeler.length > 0 && (
          <div style={{padding:'10px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:10,color:C.textMuted}}>TOPLAM {policeler.length} POLİÇE</span>
            <span style={{fontSize:10,color:C.textMuted}}>BRÜT PRİM: {fmt(topPrim)}</span>
          </div>
        )}
      </div>

      {/* DETAY MODAL */}
      <Modal open={!!detayModal} onClose={()=>{setDetayModal(null);setTahsilatForm(null)}} title="POLİÇE DETAYI" width="850px">
        {detayModal && (()=>{
          const p = detayModal;
          const tahsilOran = (parseFloat(p.brut_prim)||1) > 0 ? ((parseFloat(p.tahsil_edilen)||0) / (parseFloat(p.brut_prim)||1) * 100) : 0;
          return (
            <div>
              {/* DURUM VE TEMEL BİLGİLER */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
                <div style={{padding:14,borderRadius:10,background:C.bgHover,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600,marginBottom:6}}>POLİÇE NO</div>
                  <div style={{fontSize:16,fontWeight:800,color:C.accent}}>{p.police_no}</div>
                  {p.yenileme_no && <div style={{fontSize:10,color:C.textMuted,marginTop:4}}>YENİLEME: {p.yenileme_no}</div>}
                </div>
                <div style={{padding:14,borderRadius:10,background:C.bgHover,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600,marginBottom:6}}>MÜŞTERİ</div>
                  <div style={{fontSize:14,fontWeight:700}}>{p.musteri_adi}</div>
                  {p.musteri_telefon && <div style={{fontSize:10,color:C.textMuted,marginTop:4}}>{p.musteri_telefon}</div>}
                </div>
                <div style={{padding:14,borderRadius:10,background:C.bgHover,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600,marginBottom:6}}>DURUM</div>
                  <Badge text={DURUM_LABEL[p.durum]||p.durum} color={DURUM_RENK(p.durum,C)}/>
                  <div style={{marginTop:6}}><Badge text={TAHSILAT_LABEL[p.tahsilat_durumu]||''} color={TAHSILAT_RENK(p.tahsilat_durumu,C)}/></div>
                </div>
              </div>

              {/* FİNANSAL BİLGİLER */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
                {[
                  {l:'BRÜT PRİM',v:fmt(p.brut_prim),c:C.accent},
                  {l:'NET PRİM',v:fmt(p.net_prim),c:C.purple},
                  {l:'KOMİSYON ('+((parseFloat(p.komisyon_orani)||0))+'%)',v:fmt(p.komisyon_tutari),c:C.success},
                  {l:'TAHSİL EDİLEN',v:fmt(p.tahsil_edilen),c:C.cyan}
                ].map((x,i)=>(
                  <div key={i} style={{padding:12,borderRadius:8,background:`${x.c}11`,border:`1px solid ${x.c}33`,textAlign:'center'}}>
                    <div style={{fontSize:9,color:x.c,fontWeight:600,marginBottom:4}}>{x.l}</div>
                    <div style={{fontSize:14,fontWeight:800,color:x.c}}>{x.v}</div>
                  </div>
                ))}
              </div>

              {/* TAHSİLAT PROGRESS BAR */}
              <div style={{marginBottom:16,padding:12,borderRadius:10,background:C.bgHover,border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:10,fontWeight:600,color:C.textSec}}>TAHSİLAT İLERLEME</span>
                  <span style={{fontSize:10,fontWeight:700,color:C.accent}}>{Math.min(tahsilOran,100).toFixed(1)}%</span>
                </div>
                <div style={{height:10,borderRadius:5,background:`${C.border}`,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:5,width:Math.min(tahsilOran,100)+'%',
                    background:tahsilOran>=100?C.success:tahsilOran>50?C.warning:C.danger,transition:'width .5s'}}/>
                </div>
              </div>

              {/* DETAY BİLGİLER */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                <div style={{padding:14,borderRadius:10,background:C.bgHover,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.textMuted,marginBottom:8}}>SİGORTA BİLGİLERİ</div>
                  {[['ŞİRKET',p.sigorta_sirketi],['BRANŞ',p.brans],['TÜR',{yeni:'YENİ',yenileme:'YENİLEME',zeyil:'ZEYİL'}[p.police_turu]||p.police_turu],['PLAKA',p.plaka||'-']].map(([l,v],i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:10,color:C.textMuted}}>{l}</span>
                      <span style={{fontSize:10,fontWeight:600,color:C.text}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{padding:14,borderRadius:10,background:C.bgHover,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.textMuted,marginBottom:8}}>TARİHLER</div>
                  {[['TANZİM',fmtTarih(p.tanzim_tarihi)],['BAŞLANGIÇ',fmtTarih(p.baslangic_tarihi)],['BİTİŞ',fmtTarih(p.bitis_tarihi)],['HATIRLATMA',p.hatirlatma_gun+' GÜN ÖNCE']].map(([l,v],i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:10,color:C.textMuted}}>{l}</span>
                      <span style={{fontSize:10,fontWeight:600,color:C.text}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TAHSİLATLAR LİSTESİ */}
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.text}}>TAHSİLATLAR</span>
                  <button style={{...S.btn,...S.btnS,fontSize:10,padding:'6px 12px'}}
                    onClick={()=>setTahsilatForm({police_id:p.id,tutar:'',tarih:new Date().toISOString().slice(0,10),odeme_sekli:'nakit',kasa_id:'',aciklama:''})}>
                    <LIcon name="Plus" size={12} color="#fff"/> TAHSİLAT EKLE
                  </button>
                </div>
                {(p.tahsilatlar && p.tahsilatlar.length > 0) ? (
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                    <thead><tr style={{background:C.bgHover}}>
                      {['TARİH','TUTAR','ÖDEME ŞEKLİ','KASA','AÇIKLAMA'].map(h=><th key={h} style={{padding:'8px',textAlign:'left',color:C.textMuted,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {p.tahsilatlar.map((t,i)=>(
                        <tr key={t.id||i} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:8}}>{fmtTarih(t.tahsilat_tarihi)}</td>
                          <td style={{padding:8,fontWeight:700,color:C.success}}>{fmt(t.tutar)}</td>
                          <td style={{padding:8}}>{ODEME_SEKILLERI.find(o=>o.v===t.odeme_sekli)?.l||t.odeme_sekli}</td>
                          <td style={{padding:8}}>{t.kasa_adi||'-'}</td>
                          <td style={{padding:8,color:C.textMuted}}>{t.aciklama||'-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <div style={{fontSize:10,color:C.textMuted,padding:12,textAlign:'center'}}>HENÜZ TAHSİLAT YAPILMAMIŞ</div>}
              </div>

              {/* TAHSİLAT EKLEME FORMU */}
              {tahsilatForm && (
                <div style={{padding:16,borderRadius:10,background:`${C.success}08`,border:`1px solid ${C.success}33`,marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.success,marginBottom:12}}>YENİ TAHSİLAT</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                    <FormGroup label="TUTAR *">
                      <input style={S.input} type="number" step="0.01" value={tahsilatForm.tutar} onChange={e=>setTahsilatForm({...tahsilatForm,tutar:e.target.value})} placeholder="0.00"/>
                    </FormGroup>
                    <FormGroup label="TARİH">
                      <input style={S.input} type="date" value={tahsilatForm.tarih} onChange={e=>setTahsilatForm({...tahsilatForm,tarih:e.target.value})}/>
                    </FormGroup>
                    <FormGroup label="ÖDEME ŞEKLİ">
                      <select style={S.select} value={tahsilatForm.odeme_sekli} onChange={e=>setTahsilatForm({...tahsilatForm,odeme_sekli:e.target.value})}>
                        {ODEME_SEKILLERI.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </FormGroup>
                    <FormGroup label="KASA">
                      <select style={S.select} value={tahsilatForm.kasa_id} onChange={e=>setTahsilatForm({...tahsilatForm,kasa_id:e.target.value})}>
                        <option value="">KASA SEÇİNİZ</option>
                        {kasalar.filter(k=>k.aktif).map(k=><option key={k.id} value={k.id}>{k.ad}</option>)}
                      </select>
                    </FormGroup>
                    <FormGroup label="AÇIKLAMA" full>
                      <input style={S.input} value={tahsilatForm.aciklama} onChange={e=>setTahsilatForm({...tahsilatForm,aciklama:e.target.value})} placeholder="AÇIKLAMA"/>
                    </FormGroup>
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button style={{...S.btn,...S.btnS,fontSize:11}} onClick={tahsilatKaydet}><LIcon name="Check" size={14} color="#fff"/> KAYDET</button>
                    <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={()=>setTahsilatForm(null)}><LIcon name="X" size={14} color={C.textSec}/> İPTAL</button>
                  </div>
                </div>
              )}

              {/* NOTLAR */}
              {p.notlar && (
                <div style={{padding:12,borderRadius:8,background:C.bgHover,border:`1px solid ${C.border}`,marginBottom:16}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:600,marginBottom:4}}>NOTLAR</div>
                  <div style={{fontSize:11,color:C.textSec,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{p.notlar}</div>
                </div>
              )}

              {/* BUTONLAR */}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end',borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                {user?.rol === 'admin' && <button style={{...S.btn,...S.btnD,fontSize:11}} onClick={()=>setSilOnay(p)}><LIcon name="Trash2" size={14} color="#fff"/> SİL</button>}
                <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={()=>{setDetayModal(null);setTahsilatForm(null)}}><LIcon name="X" size={14} color={C.textSec}/> KAPAT</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Confirm open={!!silOnay} message={'BU POLİÇEYİ SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? "' + (silOnay?.police_no||'') + '"'} onConfirm={sil} onCancel={()=>setSilOnay(null)}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 2: YENİ POLİÇE
   ═══════════════════════════════════════════════════════════ */
const PoliceYeni = ({setPage, user, prefill}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, api} = MR;
  const bosForm = {police_no:'',yenileme_no:'',police_turu:'yeni',sigorta_sirketi:'',brans:'',musteri_adi:'',musteri_tc:'',musteri_telefon:'',musteri_email:'',plaka:'',
    tanzim_tarihi:new Date().toISOString().slice(0,10),baslangic_tarihi:new Date().toISOString().slice(0,10),bitis_tarihi:'',
    brut_prim:'',net_prim:'',komisyon_orani:'',hatirlatma_gun:'30',notlar:''};
  const [form, setForm] = useState(prefill ? {...bosForm,...prefill} : {...bosForm});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const f = (k,v) => setForm(p => ({...p, [k]: v}));

  // Komisyon otomatik hesapla
  const komisyonTutari = useMemo(() => {
    const net = parseNum(form.net_prim);
    const oran = parseFloat(form.komisyon_orani) || 0;
    return net * oran / 100;
  }, [form.net_prim, form.komisyon_orani]);

  const kaydet = async () => {
    if (!form.police_no.trim()) { setHata('POLİÇE NO ZORUNLU'); return; }
    if (!form.sigorta_sirketi.trim()) { setHata('SİGORTA ŞİRKETİ ZORUNLU'); return; }
    if (!form.brans) { setHata('BRANŞ SEÇİNİZ'); return; }
    if (!form.musteri_adi.trim()) { setHata('MÜŞTERİ ADI ZORUNLU'); return; }
    if (!form.baslangic_tarihi) { setHata('BAŞLANGIÇ TARİHİ ZORUNLU'); return; }
    if (!form.bitis_tarihi) { setHata('BİTİŞ TARİHİ ZORUNLU'); return; }
    const brutPrim = parseNum(form.brut_prim);
    if (brutPrim <= 0) { setHata('BRÜT PRİM 0\'DAN BÜYÜK OLMALIDIR'); return; }

    setKayitLoading(true); setHata('');
    const gonder = {
      police_no: form.police_no.trim(),
      yenileme_no: form.yenileme_no.trim() || undefined,
      police_turu: form.police_turu,
      sigorta_sirketi: form.sigorta_sirketi.trim(),
      brans: form.brans,
      musteri_adi: form.musteri_adi.trim(),
      musteri_tc: form.musteri_tc.trim() || undefined,
      musteri_telefon: form.musteri_telefon.trim() || undefined,
      musteri_email: form.musteri_email.trim() || undefined,
      plaka: form.plaka.trim() || undefined,
      tanzim_tarihi: form.tanzim_tarihi,
      baslangic_tarihi: form.baslangic_tarihi,
      bitis_tarihi: form.bitis_tarihi,
      brut_prim: brutPrim,
      net_prim: parseNum(form.net_prim),
      komisyon_orani: parseFloat(form.komisyon_orani) || 0,
      komisyon_tutari: komisyonTutari,
      hatirlatma_gun: parseInt(form.hatirlatma_gun) || 30,
      notlar: form.notlar.trim() || undefined
    };

    const r = await api.policeCreate(gonder);
    if (r?.success) {
      setBasari('POLİÇE BAŞARIYLA KAYDEDİLDİ');
      setForm({...bosForm});
      setTimeout(() => setPage('police-liste'), 1500);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  return (
    <div style={S.card}>
      <SectionTitle icon="Plus" title="YENİ POLİÇE OLUŞTUR" sub="POLİÇE BİLGİLERİNİ GİRİNİZ"/>
      <div style={S.cardBody}>
        {hata && <div style={{padding:'12px 16px',marginBottom:16,borderRadius:8,background:`${C.danger}22`,border:`1px solid ${C.danger}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="AlertCircle" size={16} color={C.danger}/><span style={{fontSize:12,fontWeight:600,color:C.danger}}>{hata}</span></div>}
        {basari && <div style={{padding:'12px 16px',marginBottom:16,borderRadius:8,background:`${C.success}22`,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="CheckCircle" size={16} color={C.success}/><span style={{fontSize:12,fontWeight:600,color:C.success}}>{basari}</span></div>}

        {/* POLİÇE BİLGİLERİ */}
        <div style={{fontSize:11,fontWeight:700,color:C.accent,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><LIcon name="FileCheck" size={14} color={C.accent}/> POLİÇE BİLGİLERİ</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
          <FormGroup label="POLİÇE NO *"><input style={S.input} value={form.police_no} onChange={e=>f('police_no',e.target.value)} placeholder="POLİÇE NUMARASI"/></FormGroup>
          <FormGroup label="YENİLEME NO"><input style={S.input} value={form.yenileme_no} onChange={e=>f('yenileme_no',e.target.value)} placeholder="ESKİ POLİÇE NO (YENİLEME İSE)"/></FormGroup>
          <FormGroup label="POLİÇE TÜRÜ">
            <select style={S.select} value={form.police_turu} onChange={e=>f('police_turu',e.target.value)}>
              <option value="yeni">YENİ</option><option value="yenileme">YENİLEME</option><option value="zeyil">ZEYİL</option>
            </select>
          </FormGroup>
        </div>

        {/* SİGORTA BİLGİLERİ */}
        <div style={{fontSize:11,fontWeight:700,color:C.purple,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><LIcon name="Shield" size={14} color={C.purple}/> SİGORTA BİLGİLERİ</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
          <FormGroup label="SİGORTA ŞİRKETİ *"><input style={S.input} value={form.sigorta_sirketi} onChange={e=>f('sigorta_sirketi',e.target.value)} placeholder="SİGORTA ŞİRKETİ"/></FormGroup>
          <FormGroup label="BRANŞ *">
            <select style={S.select} value={form.brans} onChange={e=>f('brans',e.target.value)}>
              <option value="">BRANŞ SEÇİNİZ</option>
              {BRANSLAR.map(b=><option key={b} value={b}>{b}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="PLAKA"><input style={S.input} value={form.plaka} onChange={e=>f('plaka',e.target.value)} placeholder="PLAKA (ARAÇ SİGORTASI İÇİN)"/></FormGroup>
        </div>

        {/* MÜŞTERİ BİLGİLERİ */}
        <div style={{fontSize:11,fontWeight:700,color:C.cyan,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><LIcon name="User" size={14} color={C.cyan}/> MÜŞTERİ BİLGİLERİ</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
          <FormGroup label="MÜŞTERİ ADI *"><input style={S.input} value={form.musteri_adi} onChange={e=>f('musteri_adi',e.target.value)} placeholder="AD SOYAD / FİRMA ADI"/></FormGroup>
          <FormGroup label="TC KİMLİK NO"><input style={S.input} value={form.musteri_tc} onChange={e=>f('musteri_tc',e.target.value)} maxLength={11} placeholder="TC KİMLİK NO"/></FormGroup>
          <FormGroup label="TELEFON"><input style={S.input} value={form.musteri_telefon} onChange={e=>f('musteri_telefon',e.target.value)} placeholder="0532 XXX XX XX"/></FormGroup>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:16,marginBottom:20}}>
          <FormGroup label="E-POSTA"><input style={S.input} value={form.musteri_email} onChange={e=>f('musteri_email',e.target.value)} placeholder="E-POSTA ADRESİ"/></FormGroup>
        </div>

        {/* TARİHLER */}
        <div style={{fontSize:11,fontWeight:700,color:C.warning,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><LIcon name="Calendar" size={14} color={C.warning}/> TARİHLER</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
          <FormGroup label="TANZİM TARİHİ"><input style={S.input} type="date" value={form.tanzim_tarihi} onChange={e=>f('tanzim_tarihi',e.target.value)}/></FormGroup>
          <FormGroup label="BAŞLANGIÇ TARİHİ *"><input style={S.input} type="date" value={form.baslangic_tarihi} onChange={e=>f('baslangic_tarihi',e.target.value)}/></FormGroup>
          <FormGroup label="BİTİŞ TARİHİ *"><input style={S.input} type="date" value={form.bitis_tarihi} onChange={e=>f('bitis_tarihi',e.target.value)}/></FormGroup>
        </div>

        {/* FİNANSAL BİLGİLER */}
        <div style={{fontSize:11,fontWeight:700,color:C.success,marginBottom:12,display:'flex',alignItems:'center',gap:6}}><LIcon name="Banknote" size={14} color={C.success}/> FİNANSAL BİLGİLER</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:16,marginBottom:20}}>
          <FormGroup label="BRÜT PRİM *"><input style={S.input} type="number" step="0.01" value={form.brut_prim} onChange={e=>f('brut_prim',e.target.value)} placeholder="0.00"/></FormGroup>
          <FormGroup label="NET PRİM"><input style={S.input} type="number" step="0.01" value={form.net_prim} onChange={e=>f('net_prim',e.target.value)} placeholder="0.00"/></FormGroup>
          <FormGroup label="KOMİSYON ORANI (%)"><input style={S.input} type="number" step="0.01" value={form.komisyon_orani} onChange={e=>f('komisyon_orani',e.target.value)} placeholder="0.00"/></FormGroup>
          <FormGroup label="KOMİSYON TUTARI">
            <div style={{...S.input,display:'flex',alignItems:'center',background:`${C.success}11`,border:`1px solid ${C.success}33`,color:C.success,fontWeight:700}}>
              {fmt(komisyonTutari)}
            </div>
          </FormGroup>
        </div>

        {/* HATIRLATMA VE NOTLAR */}
        <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:16,marginBottom:20}}>
          <FormGroup label="HATIRLATMA (GÜN)"><input style={S.input} type="number" value={form.hatirlatma_gun} onChange={e=>f('hatirlatma_gun',e.target.value)} placeholder="30"/></FormGroup>
          <FormGroup label="NOTLAR"><textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={form.notlar} onChange={e=>f('notlar',e.target.value)} placeholder="NOTLAR"/></FormGroup>
        </div>

        {/* BUTONLAR */}
        <div style={{display:'flex',gap:10}}>
          <button style={{...S.btn,...S.btnP,fontSize:13,padding:'12px 28px',opacity:kayitLoading?.7:1}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Save" size={15} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'POLİÇEYİ KAYDET'}
          </button>
          <button style={{...S.btn,...S.btnG,fontSize:13,padding:'12px 28px'}} onClick={()=>{setForm({...bosForm});setHata('');setBasari('')}}>
            <LIcon name="X" size={15} color={C.textSec}/> TEMİZLE
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3: YENİLEME TAKİBİ
   ═══════════════════════════════════════════════════════════ */
const PoliceYenileme = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, Badge, EmptyState, Loading, api} = MR;
  const [loading, setLoading] = useState(true);
  const [policeler, setPoliceler] = useState([]);
  const [basari, setBasari] = useState('');

  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.policeList({durum:'aktif',limit:500});
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      const bugun = new Date();
      const yaklasan = items.filter(p => {
        const bitis = new Date(p.bitis_tarihi);
        const kalan = Math.ceil((bitis - bugun) / 86400000);
        return kalan >= 0 && kalan <= 90;
      }).map(p => {
        const bitis = new Date(p.bitis_tarihi);
        const kalan = Math.ceil((bitis - bugun) / 86400000);
        return {...p, kalan_gun: kalan};
      }).sort((a,b) => a.kalan_gun - b.kalan_gun);
      setPoliceler(yaklasan);
    }
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  const hatirlatmaGonder = async () => {
    const r = await api.policeHatirlatma();
    if (r?.success) {
      setBasari((r.data?.gonderilen || 0) + ' ADET HATIRLATMA BİLDİRİMİ GÖNDERİLDİ');
      setTimeout(() => setBasari(''), 4000);
    }
  };

  const yenile = (p) => {
    setPage('police-yeni');
    // prefill desteği olmadığından kullanıcı manuel dolduracak
  };

  const gun30 = policeler.filter(p => p.kalan_gun <= 30);
  const gun60 = policeler.filter(p => p.kalan_gun > 30 && p.kalan_gun <= 60);
  const gun90 = policeler.filter(p => p.kalan_gun > 60 && p.kalan_gun <= 90);

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.success}18`,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:10}}>
        <LIcon name="CheckCircle" size={16} color={C.success}/><span style={{fontSize:12,fontWeight:600,color:C.success}}>{basari}</span></div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        <StatCard icon="AlertTriangle" label="30 GÜN İÇİNDE" value={gun30.length} color={C.danger}/>
        <StatCard icon="Clock" label="60 GÜN İÇİNDE" value={gun60.length} color={C.warning}/>
        <StatCard icon="Calendar" label="90 GÜN İÇİNDE" value={gun90.length} color={C.cyan}/>
        <StatCard icon="RefreshCw" label="TOPLAM YAKLAŞAN" value={policeler.length} color={C.accent}/>
      </div>

      <div style={{marginBottom:12,display:'flex',justifyContent:'flex-end'}}>
        <button style={{...S.btn,...S.btnW,fontSize:11,padding:'8px 16px'}} onClick={hatirlatmaGonder}>
          <LIcon name="Bell" size={14} color="#000"/> HATIRLATMA GÖNDER
        </button>
      </div>

      {policeler.length === 0 ? (
        <div style={S.card}><EmptyState icon="CheckCircle" title="YAKLAŞAN YENİLEME YOK" desc="90 GÜN İÇİNDE BİTECEK POLİÇE BULUNMUYOR"/></div>
      ) : (
        [{label:'30 GÜN İÇİNDE (ACİL)',data:gun30,color:C.danger,icon:'AlertTriangle'},
         {label:'30-60 GÜN İÇİNDE',data:gun60,color:C.warning,icon:'Clock'},
         {label:'60-90 GÜN İÇİNDE',data:gun90,color:C.cyan,icon:'Calendar'}
        ].filter(g=>g.data.length>0).map((g,gi)=>(
          <div key={gi} style={{...S.card,marginBottom:16}}>
            <SectionTitle icon={g.icon} title={g.label} sub={g.data.length + ' POLİÇE'} iconColor={g.color}/>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
                <thead><tr style={{background:C.bgHover}}>
                  {['POLİÇE NO','MÜŞTERİ','BRANŞ','SİGORTA ŞİRKETİ','PLAKA','BİTİŞ TARİHİ','KALAN GÜN','PRİM','İŞLEM'].map(h=>
                    <th key={h} style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  )}
                </tr></thead>
                <tbody>
                  {g.data.map((p,i)=>(
                    <tr key={p.id||i} style={{borderBottom:`1px solid ${C.border}`,borderLeft:`3px solid ${g.color}`}}>
                      <td style={{padding:'10px 8px',fontWeight:700,color:C.accent}}>{p.police_no}</td>
                      <td style={{padding:'10px 8px',fontWeight:600}}>{p.musteri_adi}</td>
                      <td style={{padding:'10px 8px'}}><Badge text={p.brans} color={C.cyan}/></td>
                      <td style={{padding:'10px 8px',fontSize:10,color:C.textSec}}>{p.sigorta_sirketi}</td>
                      <td style={{padding:'10px 8px',fontSize:10}}>{p.plaka||'-'}</td>
                      <td style={{padding:'10px 8px',fontSize:10,fontWeight:600}}>{fmtTarih(p.bitis_tarihi)}</td>
                      <td style={{padding:'10px 8px'}}>
                        <span style={{padding:'4px 10px',borderRadius:12,fontSize:11,fontWeight:800,
                          background:`${g.color}22`,color:g.color,border:`1px solid ${g.color}44`}}>
                          {p.kalan_gun} GÜN
                        </span>
                      </td>
                      <td style={{padding:'10px 8px',fontWeight:600}}>{fmt(p.brut_prim)}</td>
                      <td style={{padding:'10px 8px'}}>
                        <button style={{...S.btn,...S.btnP,fontSize:9,padding:'5px 10px'}} onClick={()=>yenile(p)}>
                          <LIcon name="RefreshCw" size={10} color="#fff"/> YENİLE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 4: TAHSİLAT / CARİ
   ═══════════════════════════════════════════════════════════ */
const PoliceTahsilat = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, Badge, EmptyState, Loading, Modal, FormGroup, api} = MR;
  const [loading, setLoading] = useState(true);
  const [policeler, setPoliceler] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [tahsilatModal, setTahsilatModal] = useState(null);
  const [basari, setBasari] = useState('');
  const [tForm, setTForm] = useState({tutar:'',tarih:new Date().toISOString().slice(0,10),odeme_sekli:'nakit',kasa_id:'',aciklama:''});

  const yukle = useCallback(async () => {
    setLoading(true);
    const [pR, kR] = await Promise.all([api.policeList({limit:500}), api.kasaList()]);
    if (pR?.success) setPoliceler(pR.data?.items || pR.data || []);
    if (kR?.success) setKasalar(kR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  // Cari bakiye olan poliçeler (komisyon_tutari > 0 ve tahsil_edilen < brut_prim)
  const cariler = useMemo(() => {
    return policeler.filter(p => {
      const komisyon = parseFloat(p.komisyon_tutari) || 0;
      return komisyon > 0;
    }).map(p => {
      const komisyon = parseFloat(p.komisyon_tutari) || 0;
      const brutPrim = parseFloat(p.brut_prim) || 1;
      const tahsilEdilen = parseFloat(p.tahsil_edilen) || 0;
      const tahsilOran = tahsilEdilen / brutPrim;
      const tahsilKomisyon = komisyon * Math.min(tahsilOran, 1);
      const cariBakiye = komisyon - tahsilKomisyon;
      return {...p, tahsil_komisyon: tahsilKomisyon, cari_bakiye: cariBakiye};
    }).sort((a,b) => b.cari_bakiye - a.cari_bakiye);
  }, [policeler]);

  const topKomisyon = cariler.reduce((t,p) => t + (parseFloat(p.komisyon_tutari)||0), 0);
  const topTahsilKomisyon = cariler.reduce((t,p) => t + p.tahsil_komisyon, 0);
  const topCariBakiye = cariler.reduce((t,p) => t + p.cari_bakiye, 0);

  const tahsilatKaydet = async () => {
    if (!tahsilatModal) return;
    const t = parseNum(tForm.tutar);
    if (t <= 0) return;
    const r = await api.policeTahsilatEkle({
      police_id: tahsilatModal.id,
      tutar: t,
      tahsilat_tarihi: tForm.tarih,
      odeme_sekli: tForm.odeme_sekli,
      kasa_id: tForm.kasa_id ? parseInt(tForm.kasa_id) : undefined,
      aciklama: tForm.aciklama
    });
    if (r?.success) {
      setTahsilatModal(null);
      setTForm({tutar:'',tarih:new Date().toISOString().slice(0,10),odeme_sekli:'nakit',kasa_id:'',aciklama:''});
      yukle();
      setBasari('TAHSİLAT EKLENDİ');
      setTimeout(()=>setBasari(''),3000);
    }
  };

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.success}18`,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:10}}>
        <LIcon name="CheckCircle" size={16} color={C.success}/><span style={{fontSize:12,fontWeight:600,color:C.success}}>{basari}</span></div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        <StatCard icon="Banknote" label="TOPLAM KOMİSYON" value={fmt(topKomisyon)} color={C.accent}/>
        <StatCard icon="CheckCircle" label="TAHSİL EDİLEN KOMİSYON" value={fmt(topTahsilKomisyon)} color={C.success}/>
        <StatCard icon="Wallet" label="CARİ BAKİYE" value={fmt(topCariBakiye)} color={C.warning}/>
      </div>

      <div style={S.card}>
        <SectionTitle icon="Wallet" title="TAHSİLAT / CARİ BAKİYE TAKİBİ" sub={cariler.length + ' POLİÇE'}/>
        {cariler.length === 0 ? (
          <EmptyState icon="CheckCircle" title="CARİ BAKİYE BULUNMUYOR" desc="TÜM KOMİSYONLAR TAHSİL EDİLMİŞ"/>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:950}}>
              <thead><tr style={{background:C.bgHover}}>
                {['POLİÇE NO','MÜŞTERİ','BRANŞ','KOMİSYON','TAHSİL EDİLEN','CARİ BAKİYE','TAHSİLAT DURUM','İŞLEM'].map(h=>
                  <th key={h} style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                )}
              </tr></thead>
              <tbody>
                {cariler.map((p,i)=>(
                  <tr key={p.id||i} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:'10px 8px',fontWeight:700,color:C.accent}}>{p.police_no}</td>
                    <td style={{padding:'10px 8px',fontWeight:600}}>{p.musteri_adi}</td>
                    <td style={{padding:'10px 8px'}}><Badge text={p.brans} color={C.cyan}/></td>
                    <td style={{padding:'10px 8px',fontWeight:600}}>{fmt(p.komisyon_tutari)}</td>
                    <td style={{padding:'10px 8px',color:C.success}}>{fmt(p.tahsil_komisyon)}</td>
                    <td style={{padding:'10px 8px',fontWeight:700,color:p.cari_bakiye>0?C.warning:C.success}}>{fmt(p.cari_bakiye)}</td>
                    <td style={{padding:'10px 8px'}}><Badge text={TAHSILAT_LABEL[p.tahsilat_durumu]||''} color={TAHSILAT_RENK(p.tahsilat_durumu,C)}/></td>
                    <td style={{padding:'10px 8px'}}>
                      <button style={{...S.btn,...S.btnS,fontSize:9,padding:'5px 10px'}} onClick={()=>setTahsilatModal(p)}>
                        <LIcon name="Plus" size={10} color="#fff"/> TAHSİLAT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cariler.length > 0 && (
          <div style={{padding:'10px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:10,color:C.textMuted}}>TOPLAM {cariler.length} POLİÇE</span>
            <span style={{fontSize:10,fontWeight:700,color:C.warning}}>TOPLAM CARİ BAKİYE: {fmt(topCariBakiye)}</span>
          </div>
        )}
      </div>

      <Modal open={!!tahsilatModal} onClose={()=>setTahsilatModal(null)} title="TAHSİLAT EKLE" width="550px">
        {tahsilatModal && (
          <div>
            <div style={{padding:12,borderRadius:8,background:C.bgHover,border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:C.accent}}>{tahsilatModal.police_no}</div>
              <div style={{fontSize:11,color:C.textSec,marginTop:4}}>{tahsilatModal.musteri_adi} - {tahsilatModal.brans}</div>
              <div style={{fontSize:11,color:C.warning,fontWeight:600,marginTop:4}}>CARİ BAKİYE: {fmt(tahsilatModal.cari_bakiye)}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <FormGroup label="TUTAR *"><input style={S.input} type="number" step="0.01" value={tForm.tutar} onChange={e=>setTForm({...tForm,tutar:e.target.value})} placeholder="0.00"/></FormGroup>
              <FormGroup label="TARİH"><input style={S.input} type="date" value={tForm.tarih} onChange={e=>setTForm({...tForm,tarih:e.target.value})}/></FormGroup>
              <FormGroup label="ÖDEME ŞEKLİ"><select style={S.select} value={tForm.odeme_sekli} onChange={e=>setTForm({...tForm,odeme_sekli:e.target.value})}>{ODEME_SEKILLERI.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></FormGroup>
              <FormGroup label="KASA"><select style={S.select} value={tForm.kasa_id} onChange={e=>setTForm({...tForm,kasa_id:e.target.value})}><option value="">KASA SEÇİNİZ</option>{kasalar.filter(k=>k.aktif).map(k=><option key={k.id} value={k.id}>{k.ad}</option>)}</select></FormGroup>
            </div>
            <FormGroup label="AÇIKLAMA"><input style={S.input} value={tForm.aciklama} onChange={e=>setTForm({...tForm,aciklama:e.target.value})} placeholder="AÇIKLAMA"/></FormGroup>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button style={{...S.btn,...S.btnS,fontSize:12}} onClick={tahsilatKaydet}><LIcon name="Check" size={14} color="#fff"/> TAHSİLAT KAYDET</button>
              <button style={{...S.btn,...S.btnG,fontSize:12}} onClick={()=>setTahsilatModal(null)}><LIcon name="X" size={14} color={C.textSec}/> İPTAL</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5: RAPORLAR
   ═══════════════════════════════════════════════════════════ */
const PoliceRapor = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, Badge, EmptyState, Loading, api} = MR;
  const [loading, setLoading] = useState(false);
  const [rapor, setRapor] = useState(null);
  const [baslangic, setBaslangic] = useState(new Date().getFullYear()+'-01-01');
  const [bitis, setBitis] = useState(new Date().getFullYear()+'-12-31');

  const yukle = async () => {
    setLoading(true);
    const r = await api.policeRapor({baslangic, bitis});
    if (r?.success) setRapor(r.data);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  if (loading) return <Loading/>;

  const oz = rapor?.genel_ozet || {};
  const branslar = rapor?.brans_analiz || [];
  const sirketler = rapor?.sirket_analiz || [];
  const aylik = rapor?.aylik_uretim || [];
  const yenileme = rapor?.yenileme_bekleyen || [];
  const maxPrim = Math.max(...branslar.map(b => parseFloat(b.toplam_prim) || 0), 1);
  const maxAylik = Math.max(...aylik.map(a => parseFloat(a.toplam_prim) || 0), 1);

  return (
    <div>
      {/* FİLTRE */}
      <div style={{...S.card,marginBottom:16}}>
        <div style={{padding:'16px 20px',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <FormGroup label="BAŞLANGIÇ"><input style={{...S.input,width:160}} type="date" value={baslangic} onChange={e=>setBaslangic(e.target.value)}/></FormGroup>
          <FormGroup label="BİTİŞ"><input style={{...S.input,width:160}} type="date" value={bitis} onChange={e=>setBitis(e.target.value)}/></FormGroup>
          <button style={{...S.btn,...S.btnP,fontSize:11,padding:'10px 20px',marginTop:18}} onClick={yukle}>
            <LIcon name="BarChart3" size={14} color="#fff"/> RAPOR OLUŞTUR
          </button>
        </div>
      </div>

      {!rapor ? <div style={S.card}><EmptyState icon="BarChart3" title="RAPOR OLUŞTURUN" desc="TARİH ARALIĞI SEÇİP RAPOR OLUŞTUR BUTONUNA BASIN"/></div> : (
        <>
          {/* ÖZET KARTLAR */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:20}}>
            <StatCard icon="FileCheck" label="TOPLAM POLİÇE" value={oz.toplam_police||0} color={C.accent}/>
            <StatCard icon="Shield" label="AKTİF" value={oz.aktif_police||0} color={C.success}/>
            <StatCard icon="Banknote" label="TOPLAM PRİM" value={fmt(oz.toplam_prim)} color={C.purple}/>
            <StatCard icon="Percent" label="TOPLAM KOMİSYON" value={fmt(oz.toplam_komisyon)} color={C.cyan}/>
            <StatCard icon="CheckCircle" label="TAHSİL EDİLEN" value={fmt(oz.tahsil_edilen)} color={C.success}/>
            <StatCard icon="TrendingUp" label="NET KAZANÇ" value={fmt((parseFloat(oz.toplam_komisyon)||0))} color={C.gold}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            {/* BRANŞ ANALİZİ */}
            <div style={S.card}>
              <SectionTitle icon="PieChart" title="BRANŞ ANALİZİ" sub={branslar.length + ' BRANŞ'}/>
              <div style={S.cardBody}>
                {branslar.map((b,i)=>{
                  const prim = parseFloat(b.toplam_prim)||0;
                  const oran = prim/maxPrim*100;
                  return (
                    <div key={i} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:10,fontWeight:600}}>{b.brans} ({b.police_sayisi})</span>
                        <span style={{fontSize:10,fontWeight:700,color:C.accent}}>{fmt(prim)}</span>
                      </div>
                      <div style={{height:8,borderRadius:4,background:C.bgHover,overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:4,width:oran+'%',background:C.accent,transition:'width .5s'}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SİGORTA ŞİRKETİ ANALİZİ */}
            <div style={S.card}>
              <SectionTitle icon="Building" title="SİGORTA ŞİRKETİ ANALİZİ" sub={sirketler.length + ' ŞİRKET'}/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                  <thead><tr style={{background:C.bgHover}}>
                    {['ŞİRKET','POLİÇE','PRİM'].map(h=><th key={h} style={{padding:'8px',textAlign:'left',color:C.textMuted,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {sirketler.map((s,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:8,fontWeight:600}}>{s.sigorta_sirketi}</td>
                        <td style={{padding:8}}>{s.police_sayisi}</td>
                        <td style={{padding:8,fontWeight:700,color:C.accent}}>{fmt(s.toplam_prim)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* AYLIK ÜRETİM GRAFİĞİ */}
          <div style={{...S.card,marginBottom:16}}>
            <SectionTitle icon="BarChart3" title="AYLIK ÜRETİM" sub={aylik.length + ' AY'}/>
            <div style={S.cardBody}>
              <div style={{display:'flex',gap:8,alignItems:'flex-end',height:200,padding:'0 10px'}}>
                {aylik.map((a,i)=>{
                  const prim = parseFloat(a.toplam_prim)||0;
                  const h = (prim/maxAylik)*170;
                  return (
                    <div key={i} style={{flex:1,textAlign:'center',minWidth:40}}>
                      <div style={{fontSize:9,fontWeight:700,color:C.accent,marginBottom:4}}>{fmt(prim)}</div>
                      <div style={{height:h,background:`linear-gradient(180deg,${C.accent},${C.purple})`,borderRadius:'4px 4px 0 0',minHeight:4,transition:'height .5s'}}/>
                      <div style={{fontSize:8,color:C.textMuted,marginTop:4,fontWeight:600}}>{(a.donem||'').slice(5)}</div>
                      <div style={{fontSize:8,color:C.textMuted}}>{a.police_sayisi} AD</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* YENİLEME BEKLEYEN */}
          {yenileme.length > 0 && (
            <div style={S.card}>
              <SectionTitle icon="RefreshCw" title="YENİLEME BEKLEYEN (60 GÜN)" sub={yenileme.length + ' POLİÇE'} iconColor={C.warning}/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                  <thead><tr style={{background:C.bgHover}}>
                    {['POLİÇE NO','MÜŞTERİ','BRANŞ','BİTİŞ','KALAN GÜN','PRİM'].map(h=><th key={h} style={{padding:'8px',textAlign:'left',color:C.textMuted,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {yenileme.map((y,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}`,borderLeft:`3px solid ${(y.kalan_gun<=30)?C.danger:C.warning}`}}>
                        <td style={{padding:8,fontWeight:700,color:C.accent}}>{y.police_no}</td>
                        <td style={{padding:8}}>{y.musteri_adi}</td>
                        <td style={{padding:8}}><Badge text={y.brans} color={C.cyan}/></td>
                        <td style={{padding:8}}>{fmtTarih(y.bitis_tarihi)}</td>
                        <td style={{padding:8}}><span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,
                          background:y.kalan_gun<=30?`${C.danger}22`:`${C.warning}22`,color:y.kalan_gun<=30?C.danger:C.warning}}>
                          {y.kalan_gun} GÜN</span></td>
                        <td style={{padding:8,fontWeight:600}}>{fmt(y.brut_prim)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 6: KAZANÇ (MUHASEBE ALT MODÜLÜ)
   ═══════════════════════════════════════════════════════════ */
const PoliceKazanc = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, Badge, EmptyState, Loading, FormGroup, Modal, api} = MR;
  const [loading, setLoading] = useState(true);
  const [policeler, setPoliceler] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [kazancModal, setKazancModal] = useState(null);
  const [basari, setBasari] = useState('');
  const [donem, setDonem] = useState(new Date().toISOString().slice(0,7)); // YYYY-MM

  const yukle = useCallback(async () => {
    setLoading(true);
    const [pR, kR] = await Promise.all([api.policeList({limit:500}), api.kasaList()]);
    if (pR?.success) setPoliceler(pR.data?.items || pR.data || []);
    if (kR?.success) setKasalar(kR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  // Aylık gruplandırma
  const aylikData = useMemo(() => {
    const aylar = {};
    policeler.forEach(p => {
      const ay = (p.tanzim_tarihi || '').slice(0, 7);
      if (!aylar[ay]) aylar[ay] = {donem:ay, adet:0, toplam_prim:0, komisyon:0, tahsil_edilen:0};
      aylar[ay].adet++;
      aylar[ay].toplam_prim += parseFloat(p.brut_prim) || 0;
      aylar[ay].komisyon += parseFloat(p.komisyon_tutari) || 0;
      const brutPrim = parseFloat(p.brut_prim) || 1;
      const tahsilEdilen = parseFloat(p.tahsil_edilen) || 0;
      const komisyon = parseFloat(p.komisyon_tutari) || 0;
      const tahsilOran = Math.min(tahsilEdilen / brutPrim, 1);
      aylar[ay].tahsil_edilen += komisyon * tahsilOran;
    });
    return Object.values(aylar).sort((a,b) => b.donem.localeCompare(a.donem));
  }, [policeler]);

  const topKomisyon = policeler.reduce((t,p) => t + (parseFloat(p.komisyon_tutari)||0), 0);
  const topTahsilKomisyon = aylikData.reduce((t,a) => t + a.tahsil_edilen, 0);
  const topCariBakiye = topKomisyon - topTahsilKomisyon;
  const buAyData = aylikData.find(a => a.donem === new Date().toISOString().slice(0,7));
  const buAyKazanc = buAyData ? buAyData.tahsil_edilen : 0;

  // Kazanç girişi → gelir olarak kaydet
  const kazancKaydet = async () => {
    if (!kazancModal) return;
    const aktifKasalar = kasalar.filter(k => k.aktif);
    const kasaId = kazancModal.kasa_id || (aktifKasalar.length > 0 ? aktifKasalar[0].id : null);
    if (!kasaId) return;

    const r = await api.gelirCreate({
      gelir_turu: 'POLİÇE KOMİSYON',
      tutar: kazancModal.tutar,
      kasa_id: parseInt(kasaId),
      aciklama: 'POLİÇE KOMİSYON KAZANÇ - ' + kazancModal.donem,
      tarih: new Date().toISOString().slice(0,10)
    });
    if (r?.success) {
      setKazancModal(null);
      setBasari('KAZANÇ GELİR OLARAK KAYDEDİLDİ');
      setTimeout(()=>setBasari(''),3000);
    }
  };

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.success}18`,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:10}}>
        <LIcon name="CheckCircle" size={16} color={C.success}/><span style={{fontSize:12,fontWeight:600,color:C.success}}>{basari}</span></div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        <StatCard icon="Banknote" label="TOPLAM KOMİSYON" value={fmt(topKomisyon)} color={C.accent}/>
        <StatCard icon="CheckCircle" label="TAHSİL EDİLEN" value={fmt(topTahsilKomisyon)} color={C.success}/>
        <StatCard icon="Wallet" label="CARİ BAKİYE" value={fmt(topCariBakiye)} color={C.warning}/>
        <StatCard icon="TrendingUp" label="BU AY KAZANÇ" value={fmt(buAyKazanc)} color={C.gold}/>
      </div>

      <div style={S.card}>
        <SectionTitle icon="TrendingUp" title="AYLIK KAZANÇ TAKİBİ" sub="DÖNEM BAZINDA KOMİSYON VE TAHSİLAT"
          right={<div style={{fontSize:10,color:C.textMuted}}>TOPLAM {aylikData.length} DÖNEM</div>}/>
        {aylikData.length === 0 ? (
          <EmptyState icon="TrendingUp" title="KAZANÇ VERİSİ YOK" desc="HENÜZ POLİÇE KAYDI BULUNMUYOR"/>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
              <thead><tr style={{background:C.bgHover}}>
                {['DÖNEM','ÜRETİM ADEDİ','TOPLAM PRİM','KOMİSYON TUTARI','TAHSİL EDİLEN','CARİ BAKİYE','İŞLEM'].map(h=>
                  <th key={h} style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                )}
              </tr></thead>
              <tbody>
                {aylikData.map((a,i)=>{
                  const cari = a.komisyon - a.tahsil_edilen;
                  return (
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:'10px 8px',fontWeight:700,color:C.accent}}>{a.donem}</td>
                      <td style={{padding:'10px 8px',fontWeight:600}}>{a.adet}</td>
                      <td style={{padding:'10px 8px'}}>{fmt(a.toplam_prim)}</td>
                      <td style={{padding:'10px 8px',fontWeight:600,color:C.purple}}>{fmt(a.komisyon)}</td>
                      <td style={{padding:'10px 8px',color:C.success}}>{fmt(a.tahsil_edilen)}</td>
                      <td style={{padding:'10px 8px',fontWeight:700,color:cari>0?C.warning:C.success}}>{fmt(cari)}</td>
                      <td style={{padding:'10px 8px'}}>
                        {a.tahsil_edilen > 0 && (
                          <button style={{...S.btn,...S.btnS,fontSize:9,padding:'4px 8px'}}
                            onClick={()=>setKazancModal({donem:a.donem,tutar:a.tahsil_edilen,kasa_id:''})}>
                            <LIcon name="TrendingUp" size={10} color="#fff"/> KAZANÇ GİR
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:`${C.accent}11`,fontWeight:700}}>
                  <td style={{padding:'10px 8px',color:C.accent}}>TOPLAM</td>
                  <td style={{padding:'10px 8px'}}>{aylikData.reduce((t,a)=>t+a.adet,0)}</td>
                  <td style={{padding:'10px 8px'}}>{fmt(aylikData.reduce((t,a)=>t+a.toplam_prim,0))}</td>
                  <td style={{padding:'10px 8px',color:C.purple}}>{fmt(topKomisyon)}</td>
                  <td style={{padding:'10px 8px',color:C.success}}>{fmt(topTahsilKomisyon)}</td>
                  <td style={{padding:'10px 8px',color:C.warning}}>{fmt(topCariBakiye)}</td>
                  <td style={{padding:'10px 8px'}}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* KAZANÇ GİRİŞ MODAL */}
      <Modal open={!!kazancModal} onClose={()=>setKazancModal(null)} title="KAZANÇ GİRİŞİ" width="450px">
        {kazancModal && (
          <div>
            <div style={{padding:12,borderRadius:8,background:`${C.gold}11`,border:`1px solid ${C.gold}33`,marginBottom:16}}>
              <div style={{fontSize:10,color:C.gold,fontWeight:600}}>DÖNEM: {kazancModal.donem}</div>
              <div style={{fontSize:16,fontWeight:800,color:C.gold,marginTop:4}}>{fmt(kazancModal.tutar)}</div>
              <div style={{fontSize:10,color:C.textMuted,marginTop:4}}>BU TUTAR GELİR OLARAK MUHASEBE SİSTEMİNE KAYDEDİLECEK</div>
            </div>
            <FormGroup label="KASA">
              <select style={S.select} value={kazancModal.kasa_id} onChange={e=>setKazancModal({...kazancModal,kasa_id:e.target.value})}>
                <option value="">KASA SEÇİNİZ</option>
                {kasalar.filter(k=>k.aktif).map(k=><option key={k.id} value={k.id}>{k.ad}</option>)}
              </select>
            </FormGroup>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button style={{...S.btn,...S.btnS,fontSize:12}} onClick={kazancKaydet}><LIcon name="TrendingUp" size={14} color="#fff"/> KAZANÇ KAYDET</button>
              <button style={{...S.btn,...S.btnG,fontSize:12}} onClick={()=>setKazancModal(null)}><LIcon name="X" size={14} color={C.textSec}/> İPTAL</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
