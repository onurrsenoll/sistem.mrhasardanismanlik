/**
 * MR HASAR DANIŞMANLIK - SAHA DOSYALARI MODÜLÜ V2
 * SAHA PERSONELİ DOSYA ONAY İŞ AKIŞI
 * Görsel/PDF yükleme, Araç bilgileri, Mobil uyumlu
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useMemo, useCallback, useRef} = React;

/* ═══ SABİT VERİLER ═══ */
const HASAR_TIPLERI = ['TRAFİK KAZASI','DASK','YANGIN','SU BASKIN','HIRSIZLIK','DİĞER'];
const HASAR_DURUMLARI = [{v:'dosya_acik',l:'DOSYA AÇIK'},{v:'dosya_kapali',l:'DOSYA KAPALI'},{v:'onarim_devam',l:'ONARIM SÜRECİ DEVAM EDİYOR'}];
const DOSYA_KAYNAKLARI = ['YÖNLENDİREN','SERVİS','ACENTE','ANLAŞMALI KURUM','BİREYSEL BAŞVURU','DİĞER'];
const KUSUR_DURUMLARI = ['KUSURSUZ','TAM KUSURLU','YARI KUSURLU (%25)','YARI KUSURLU (%50)','YARI KUSURLU (%75)','BELİRSİZ'];

const fmtTarih = (t) => t ? new Date(t).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-';
const fmtTarihSaat = (t) => t ? new Date(t).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';

const DURUM_RENK = (d) => {
  const C = MR.C;
  return {taslak:C.textMuted, beklemede:C.warning, onaylandi:C.success, reddedildi:C.danger, dosyaya_donustu:C.purple}[d] || C.textMuted;
};
const DURUM_LABEL = {taslak:'TASLAK', beklemede:'ONAY BEKLİYOR', onaylandi:'ONAYLANDI', reddedildi:'REDDEDİLDİ', dosyaya_donustu:'DOSYAYA DÖNÜŞTÜ'};
const HASAR_DURUMU_LABEL = {dosya_acik:'DOSYA AÇIK', dosya_kapali:'DOSYA KAPALI', onarim_devam:'ONARIM DEVAM EDİYOR'};

/* ═══ UYARI/BAŞARI MESAJI ═══ */
const Msg = ({text, type, onClose}) => {
  const C = MR.C, LIcon = MR.LIcon;
  const renk = type === 'success' ? C.success : C.danger;
  return (
    <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${renk}18`,border:`1px solid ${renk}44`,display:'flex',alignItems:'center',gap:10}}>
      <LIcon name={type==='success'?'CheckCircle':'AlertCircle'} size={16} color={renk}/>
      <span style={{flex:1,fontSize:12,fontWeight:600,color:renk}}>{text}</span>
      {onClose && <span style={{cursor:'pointer',color:renk}} onClick={onClose}><LIcon name="X" size={14}/></span>}
    </div>
  );
};

/* ═══ MEDYA UPLOAD ZONE ═══ */
const MedyaUploadZone = ({sahaId, medyalar, setMedyalar}) => {
  const {C, S, LIcon, api} = MR;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hata, setHata] = useState('');
  const fileRef = useRef(null);

  const yukle = async (files) => {
    if (!files?.length || !sahaId) return;
    setYukleniyor(true); setHata('');
    for (const file of files) {
      const r = await api.sahaDosyaYukle(sahaId, file, '');
      if (!r?.success) { setHata(r?.error || 'YÜKLEME HATASI'); }
    }
    // Medya listesini yenile
    const lr = await api.sahaMedyaList(sahaId);
    if (lr?.success) setMedyalar(lr.data || []);
    setYukleniyor(false);
  };

  const sil = async (id) => {
    if (!confirm('BU DOSYAYI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?')) return;
    const r = await api.sahaDosyaSil(id);
    if (r?.success) {
      const lr = await api.sahaMedyaList(sahaId);
      if (lr?.success) setMedyalar(lr.data || []);
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); yukle(e.dataTransfer.files); };
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div>
      {hata && <Msg text={hata} type="error"/>}
      {/* DROP ZONE */}
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        style={{
          border:`2px dashed ${dragging ? C.accent : C.borderLight}`,
          borderRadius:12, padding:'30px 20px', textAlign:'center', cursor:'pointer',
          background: dragging ? `${C.accent}11` : C.bgInput,
          transition:'all .2s', marginBottom:16
        }}>
        <LIcon name="Upload" size={32} color={dragging ? C.accent : C.textMuted} style={{marginBottom:8}}/>
        <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>
          {yukleniyor ? 'YÜKLENİYOR...' : 'DOSYA YÜKLEMEK İÇİN TIKLAYIN VEYA SÜRÜKLEYİN'}
        </div>
        <div style={{fontSize:11,color:C.textMuted}}>JPG, PNG, PDF DOSYALARI DESTEKLENİR (MAX 20MB)</div>
        <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,application/pdf"
          onChange={e => {yukle(e.target.files); e.target.value='';}} style={{display:'none'}}/>
      </div>

      {/* MEDYA GRID */}
      {medyalar.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10}}>
          {medyalar.map(m => {
            const isImg = (m.mime_type||'').startsWith('image/');
            return (
              <div key={m.id} style={{position:'relative',borderRadius:8,overflow:'hidden',border:`1px solid ${C.border}`,background:C.bgCard}}>
                {isImg ? (
                  <img src={`/api/v1/saha/medya-download.php?id=${m.id}&mode=inline`} alt={m.dosya_adi}
                    style={{width:'100%',height:100,objectFit:'cover'}}/>
                ) : (
                  <div style={{width:'100%',height:100,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:8}}>
                    <LIcon name="FileText" size={28} color={C.danger}/>
                    <div style={{fontSize:9,color:C.textMuted,marginTop:4,textAlign:'center',wordBreak:'break-all',lineHeight:1.2}}>{m.dosya_adi}</div>
                  </div>
                )}
                <button onClick={() => sil(m.id)} style={{
                  position:'absolute',top:4,right:4,width:22,height:22,borderRadius:'50%',border:'none',
                  background:'rgba(239,68,68,0.9)',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12
                }}>✕</button>
                <div style={{padding:'4px 6px',fontSize:9,color:C.textMuted,borderTop:`1px solid ${C.border}`,textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>
                  {m.dosya_adi}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══ KART BAŞLIĞI (SECTION HEADER) ═══ */
const SectionHeader = ({icon, title, subtitle, color}) => {
  const {C, LIcon} = MR;
  const c = color || C.accent;
  return (
    <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,background: MR.tema === 'koyu' ? `${c}08` : `${c}05`}}>
      <div style={{width:36,height:36,borderRadius:10,background:`${c}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <LIcon name={icon} size={16} color={c}/>
      </div>
      <div>
        <div style={{fontSize:14,fontWeight:700}}>{title}</div>
        {subtitle && <div style={{fontSize:11,color:C.textMuted}}>{subtitle}</div>}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ANA SAHA SAYFA BİLEŞENİ
   ═══════════════════════════════════════════════════════════ */
MR.SahaPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'liste';

  const sekmeler = [
    {key:'liste',           label:'ONAY BEKLEYEN',     icon:'Clock'},
    {key:'onaylanan',       label:'ONAYLANAN',         icon:'CheckCircle'},
    {key:'reddedilen',      label:'REDDEDİLEN',        icon:'XCircle'},
    {key:'dosyaya_donusen', label:'DOSYAYA DÖNÜŞEN',   icon:'FolderOpen'},
    {key:'yeni',            label:'YENİ SAHA KAYDI',   icon:'Plus'}
  ];

  return (
    <div className="fade-in">
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`,overflowX:'auto'}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('saha-' + s.key)}
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
      {aktifSekme === 'liste'           && <SahaBekleyen setPage={setPage} user={user}/>}
      {aktifSekme === 'onaylanan'       && <SahaOnaylanan setPage={setPage} user={user}/>}
      {aktifSekme === 'reddedilen'      && <SahaReddedilen setPage={setPage} user={user}/>}
      {aktifSekme === 'dosyaya_donusen' && <SahaDosyayaDonusen setPage={setPage} user={user}/>}
      {aktifSekme === 'yeni'            && <SahaYeniKayit setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   DETAY MODAL
   ═══════════════════════════════════════════════════════════ */
const SahaDetayModal = ({item, onClose, user, onOnayla, onReddet}) => {
  const {C, S, LIcon, Modal, Badge, api} = MR;
  const [medyalar, setMedyalar] = useState([]);
  if (!item) return null;
  const isAdmin = user?.rol === 'admin';

  useEffect(() => {
    if (item?.id) api.sahaMedyaList(item.id).then(r => { if (r?.success) setMedyalar(r.data || []); });
  }, [item?.id]);

  const Satir = ({label, value}) => (
    <div style={{display:'flex',padding:'8px 0',borderBottom:`1px solid ${C.border}22`}}>
      <div style={{width:160,fontSize:11,fontWeight:600,color:C.textMuted}}>{label}</div>
      <div style={{flex:1,fontSize:12,fontWeight:500,color:C.text}}>{value || '-'}</div>
    </div>
  );

  return (
    <Modal open={true} onClose={onClose} title="SAHA DOSYA DETAYI" width="750px">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <Badge text={DURUM_LABEL[item.durum] || item.durum} color={DURUM_RENK(item.durum)}/>
        <span style={{fontSize:11,color:C.textMuted}}>#{item.id}</span>
      </div>

      {/* MÜŞTERİ */}
      <div style={{...S.card, marginBottom:12}}>
        <SectionHeader icon="User" title="MÜŞTERİ BİLGİLERİ" color={C.cyan}/>
        <div style={{padding:16}}>
          <Satir label="MÜŞTERİ ADI" value={item.musteri_adi}/>
          <Satir label="TELEFON" value={item.musteri_telefon}/>
          <Satir label="TC KİMLİK" value={item.musteri_tc}/>
        </div>
      </div>

      {/* HASAR */}
      <div style={{...S.card, marginBottom:12}}>
        <SectionHeader icon="AlertTriangle" title="HASAR BİLGİLERİ" color={C.warning}/>
        <div style={{padding:16}}>
          <Satir label="HASAR TİPİ" value={item.hasar_tipi}/>
          <Satir label="HASAR TARİHİ" value={fmtTarih(item.hasar_tarihi)}/>
          <Satir label="HASAR YERİ" value={item.hasar_yeri}/>
          <Satir label="AÇIKLAMA" value={item.hasar_aciklama}/>
          <Satir label="HASAR DURUMU" value={HASAR_DURUMU_LABEL[item.hasar_durumu] || item.hasar_durumu}/>
          <Satir label="GEÇMİŞ HASAR" value={item.gecmis_hasar === 'var' ? 'VAR' : 'YOK'}/>
          <Satir label="DOSYA KAYNAĞI" value={item.dosya_kaynagi}/>
        </div>
      </div>

      {/* ARAÇ */}
      <div style={{...S.card, marginBottom:12}}>
        <SectionHeader icon="Car" title="HASARLI ARAÇ BİLGİLERİ" color={C.accent}/>
        <div style={{padding:16}}>
          <Satir label="PLAKA" value={item.arac_plaka}/>
          <Satir label="MARKA" value={item.arac_marka}/>
          <Satir label="MODEL" value={item.arac_model}/>
          <Satir label="MODEL YILI" value={item.arac_model_yili}/>
          <Satir label="KM" value={item.arac_km}/>
          <Satir label="RENK" value={item.arac_renk}/>
          <Satir label="RUHSAT SAHİBİ" value={item.arac_ruhsat_sahibi}/>
          <Satir label="KUSUR DURUMU" value={item.arac_kusur_durumu}/>
          <Satir label="ŞASİ NO" value={item.arac_sasi_no}/>
        </div>
      </div>

      {/* KARŞI ARAÇ */}
      {(item.karsi_plaka || item.karsi_sigorta) && (
        <div style={{...S.card, marginBottom:12}}>
          <SectionHeader icon="ArrowLeftRight" title="KARŞI ARAÇ BİLGİLERİ" color={C.danger}/>
          <div style={{padding:16}}>
            <Satir label="KARŞI PLAKA" value={item.karsi_plaka}/>
            <Satir label="KARŞI SİGORTA" value={item.karsi_sigorta}/>
          </div>
        </div>
      )}

      {/* MEDYALAR */}
      {medyalar.length > 0 && (
        <div style={{...S.card, marginBottom:12}}>
          <SectionHeader icon="Camera" title={`YÜKLENEN GÖRSELLER / EVRAKLAR (${medyalar.length})`} color={C.gold}/>
          <div style={{padding:16}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:8}}>
              {medyalar.map(m => {
                const isImg = (m.mime_type||'').startsWith('image/');
                return (
                  <div key={m.id} style={{borderRadius:6,overflow:'hidden',border:`1px solid ${C.border}`}}>
                    {isImg ? (
                      <img src={`/api/v1/saha/medya-download.php?id=${m.id}&mode=inline`} style={{width:'100%',height:80,objectFit:'cover'}}/>
                    ) : (
                      <div style={{height:80,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                        <LIcon name="FileText" size={24} color={C.danger}/>
                        <div style={{fontSize:8,color:C.textMuted,marginTop:2}}>{m.dosya_adi}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* İŞLEM */}
      <div style={{...S.card, marginBottom:12}}>
        <SectionHeader icon="Info" title="İŞLEM BİLGİLERİ" color={C.accent}/>
        <div style={{padding:16}}>
          <Satir label="PERSONEL" value={item.personel_adi}/>
          <Satir label="KAYIT TARİHİ" value={fmtTarihSaat(item.created_at)}/>
          {item.onaylayan_adi && <Satir label="ONAYLAYAN" value={item.onaylayan_adi}/>}
          {item.onay_tarihi && <Satir label="ONAY TARİHİ" value={fmtTarihSaat(item.onay_tarihi)}/>}
          {item.onay_notu && <Satir label="ONAY NOTU" value={item.onay_notu}/>}
          {item.red_nedeni && <Satir label="RED NEDENİ" value={item.red_nedeni}/>}
          {item.sigorta_sirketi && <Satir label="SİGORTA ŞİRKETİ" value={item.sigorta_sirketi}/>}
          {item.police_no && <Satir label="POLİÇE NO" value={item.police_no}/>}
          {item.dosya_no && <Satir label="DOSYA NO" value={item.dosya_no}/>}
        </div>
      </div>

      {/* ADMİN BUTONLARI */}
      {isAdmin && item.durum === 'beklemede' && (
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
          <button style={{...S.btn,...S.btnS}} onClick={() => onOnayla && onOnayla(item)}>
            <LIcon name="CheckCircle" size={14}/> ONAYLA
          </button>
          <button style={{...S.btn,...S.btnD}} onClick={() => onReddet && onReddet(item)}>
            <LIcon name="XCircle" size={14}/> REDDET
          </button>
        </div>
      )}
    </Modal>
  );
};

/* ═══════════════════════════════════════════════════════════
   TABLO LİSTELEME YARDIMCISI
   ═══════════════════════════════════════════════════════════ */
const SahaListeTablosu = ({data, kolonlar, onRowClick, renderIslem, emptyIcon, emptyTitle, emptyDesc}) => {
  const {C, S, EmptyState} = MR;
  if (!data.length) return <EmptyState icon={emptyIcon||'Inbox'} title={emptyTitle||'KAYIT YOK'} desc={emptyDesc||''}/>;
  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead>
          <tr style={{background:`${C.accent}08`}}>
            {kolonlar.map(k => <th key={k} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{k}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={item.id||i} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
              onClick={() => onRowClick && onRowClick(item)}
              onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {renderIslem(item)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1: ONAY BEKLEYEN
   ═══════════════════════════════════════════════════════════ */
const SahaBekleyen = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [arama, setArama] = useState('');
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  const [detayItem, setDetayItem] = useState(null);
  const [onayModal, setOnayModal] = useState(null);
  const [onayNotu, setOnayNotu] = useState('');
  const [onayLoading, setOnayLoading] = useState(false);
  const [redModal, setRedModal] = useState(null);
  const [redNedeni, setRedNedeni] = useState('');
  const [redLoading, setRedLoading] = useState(false);
  const isAdmin = user?.rol === 'admin';

  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {durum:'beklemede', limit:500};
    if (arama.trim()) p.arama = arama.trim();
    const r = await api.sahaList(p);
    if (r?.success) { setData(r.data?.items||[]); setToplam(r.data?.pagination?.total||0); }
    setLoading(false);
  }, [arama]);

  useEffect(() => { yukle(); }, []);

  const onaylaGonder = async () => {
    if (!onayModal) return;
    setOnayLoading(true);
    const r = await api.sahaOnayla({id:onayModal.id, onay_notu:onayNotu});
    setOnayLoading(false);
    if (r?.success) { setOnayModal(null); setOnayNotu(''); setDetayItem(null); setBasari('SAHA DOSYASI ONAYLANDI'); setTimeout(()=>setBasari(''),4000); yukle(); }
    else { setHata(r?.error||'ONAYLAMA HATASI'); setTimeout(()=>setHata(''),4000); }
  };

  const reddetGonder = async () => {
    if (!redModal || !redNedeni.trim()) { setHata('RED NEDENİ GİRİNİZ'); setTimeout(()=>setHata(''),3000); return; }
    setRedLoading(true);
    const r = await api.sahaReddet({id:redModal.id, red_nedeni:redNedeni});
    setRedLoading(false);
    if (r?.success) { setRedModal(null); setRedNedeni(''); setDetayItem(null); setBasari('SAHA DOSYASI REDDEDİLDİ'); setTimeout(()=>setBasari(''),4000); yukle(); }
    else { setHata(r?.error||'RED HATASI'); setTimeout(()=>setHata(''),4000); }
  };

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && <Msg text={basari} type="success"/>}
      {hata && <Msg text={hata} type="error"/>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="Clock" label="TOPLAM BEKLEYEN" value={toplam} color={C.warning}/>
      </div>

      <div style={{...S.card, marginBottom:20}}>
        <div style={{padding:16,display:'flex',gap:10}}>
          <input style={{...S.input,flex:1}} placeholder="MÜŞTERİ ADI, TELEFON, PLAKA ARA..." value={arama}
            onChange={e=>setArama(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')yukle()}}/>
          <button style={{...S.btn,...S.btnP}} onClick={yukle}><LIcon name="Search" size={14}/> ARA</button>
        </div>
      </div>

      <div style={S.card}>
        <SectionTitle icon="Clock" title="ONAY BEKLEYEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? <EmptyState icon="Inbox" title="BEKLEYEN KAYIT YOK" desc="ONAY BEKLEYEN SAHA DOSYASI BULUNMUYOR"/> : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:`${C.accent}08`}}>
                  {['PERSONEL','MÜŞTERİ','TELEFON','HASAR TİPİ','PLAKA','KAYNAK','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(item=>(
                  <tr key={item.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
                    onClick={()=>setDetayItem(item)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi||'-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px'}}>{item.musteri_telefon||'-'}</td>
                    <td style={{padding:'10px 12px'}}><Badge text={item.hasar_tipi||'-'} color={C.warning}/></td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.arac_plaka||'-'}</td>
                    <td style={{padding:'10px 12px',fontSize:11}}>{item.dosya_kaynagi||'-'}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:6}}>
                        {isAdmin ? (<>
                          <button style={{...S.btn,...S.btnS,padding:'6px 12px',fontSize:10}} onClick={()=>{setOnayModal(item);setOnayNotu('');}}>
                            <LIcon name="Check" size={12}/> ONAYLA
                          </button>
                          <button style={{...S.btn,...S.btnD,padding:'6px 12px',fontSize:10}} onClick={()=>{setRedModal(item);setRedNedeni('');}}>
                            <LIcon name="X" size={12}/> REDDET
                          </button>
                        </>) : (
                          <button style={{...S.btn,...S.btnP,padding:'6px 12px',fontSize:10}} onClick={()=>setDetayItem(item)}>
                            <LIcon name="Eye" size={12}/> DETAY
                          </button>
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

      {detayItem && <SahaDetayModal item={detayItem} onClose={()=>setDetayItem(null)} user={user}
        onOnayla={i=>{setOnayModal(i);setOnayNotu('');}} onReddet={i=>{setRedModal(i);setRedNedeni('');}}/>}

      <Modal open={!!onayModal} onClose={()=>setOnayModal(null)} title="SAHA DOSYASINI ONAYLA" width="500px">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textSec,marginBottom:8}}><strong>{onayModal?.musteri_adi}</strong> MÜŞTERİSİNE AİT SAHA DOSYASINI ONAYLAMAK İSTEDİĞİNİZE EMİN MİSİNİZ?</div>
          <FormGroup label="ONAY NOTU (OPSİYONEL)">
            <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={onayNotu} onChange={e=>setOnayNotu(e.target.value)} placeholder="ONAY NOTU..."/>
          </FormGroup>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={()=>setOnayModal(null)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={onaylaGonder} disabled={onayLoading}>
            <LIcon name="CheckCircle" size={14}/> {onayLoading?'ONAYLANIYOR...':'ONAYLA'}
          </button>
        </div>
      </Modal>

      <Modal open={!!redModal} onClose={()=>setRedModal(null)} title="SAHA DOSYASINI REDDET" width="500px">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textSec,marginBottom:8}}><strong>{redModal?.musteri_adi}</strong> MÜŞTERİSİNE AİT SAHA DOSYASINI REDDETMEK İSTEDİĞİNİZE EMİN MİSİNİZ?</div>
          <FormGroup label="RED NEDENİ *">
            <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={redNedeni} onChange={e=>setRedNedeni(e.target.value)} placeholder="RED NEDENİNİ GİRİNİZ..."/>
          </FormGroup>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={()=>setRedModal(null)}>İPTAL</button>
          <button style={{...S.btn,...S.btnD}} onClick={reddetGonder} disabled={redLoading}>
            <LIcon name="XCircle" size={14}/> {redLoading?'REDDEDİLİYOR...':'REDDET'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 2: ONAYLANAN
   ═══════════════════════════════════════════════════════════ */
const SahaOnaylanan = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  const [detayItem, setDetayItem] = useState(null);
  // DOSYAYA DÖNÜŞTÜR MODALI
  const [donusturItem, setDonusturItem] = useState(null);
  const [donusturForm, setDonusturForm] = useState({sigorta_sirketi:'', police_no:''});
  const [donusturLoading, setDonusturLoading] = useState(false);
  const isAdmin = user?.rol === 'admin';

  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.sahaList({durum:'onaylandi', limit:500});
    if (r?.success) { setData(r.data?.items||[]); setToplam(r.data?.pagination?.total||0); }
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  const dosyayaDonustur = async () => {
    if (!donusturItem) return;
    if (!donusturForm.sigorta_sirketi.trim()) { setHata('SİGORTA ŞİRKETİ GEREKLİ'); setTimeout(()=>setHata(''),3000); return; }
    if (!donusturForm.police_no.trim()) { setHata('POLİÇE NO GEREKLİ'); setTimeout(()=>setHata(''),3000); return; }
    setDonusturLoading(true);
    const r = await api.sahaDosyayaDonustur({id:donusturItem.id, sigorta_sirketi:donusturForm.sigorta_sirketi, police_no:donusturForm.police_no});
    setDonusturLoading(false);
    if (r?.success) {
      setDonusturItem(null);
      setBasari('DOSYAYA DÖNÜŞTÜRÜLDÜ: ' + (r.data?.dosya_no||'')); setTimeout(()=>setBasari(''),4000);
      yukle();
    } else { setHata(r?.error||'DÖNÜŞTÜRME HATASI'); setTimeout(()=>setHata(''),4000); }
  };

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && <Msg text={basari} type="success"/>}
      {hata && <Msg text={hata} type="error"/>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="CheckCircle" label="TOPLAM ONAYLANAN" value={toplam} color={C.success}/>
      </div>

      <div style={S.card}>
        <SectionTitle icon="CheckCircle" title="ONAYLANAN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? <EmptyState icon="CheckCircle" title="ONAYLANAN KAYIT YOK" desc="HENÜZ ONAYLANMIŞ SAHA DOSYASI BULUNMUYOR"/> : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:`${C.accent}08`}}>
                  {['PERSONEL','MÜŞTERİ','TELEFON','PLAKA','ONAY TARİHİ','ONAYLAYAN','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(item=>(
                  <tr key={item.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
                    onClick={()=>setDetayItem(item)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi||'-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px'}}>{item.musteri_telefon||'-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.arac_plaka||'-'}</td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarihSaat(item.onay_tarihi)}</td>
                    <td style={{padding:'10px 12px'}}>{item.onaylayan_adi||'-'}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      {isAdmin ? (
                        <button style={{...S.btn,background:C.accent,color:'#fff',padding:'6px 14px',fontSize:10}}
                          onClick={()=>{setDonusturItem(item);setDonusturForm({sigorta_sirketi:'',police_no:''});}}>
                          <LIcon name="FolderPlus" size={12}/> DOSYAYA DÖNÜŞTÜR
                        </button>
                      ) : (
                        <button style={{...S.btn,...S.btnP,padding:'6px 12px',fontSize:10}} onClick={()=>setDetayItem(item)}>
                          <LIcon name="Eye" size={12}/> DETAY
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detayItem && <SahaDetayModal item={detayItem} onClose={()=>setDetayItem(null)} user={user}/>}

      {/* DOSYAYA DÖNÜŞTÜR MODAL */}
      <Modal open={!!donusturItem} onClose={()=>setDonusturItem(null)} title="DOSYAYA DÖNÜŞTÜR" width="500px">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textSec,marginBottom:12}}>
            <strong>{donusturItem?.musteri_adi}</strong> SAHA DOSYASINI SİSTEM DOSYASINA DÖNÜŞTÜRMEK İÇİN SİGORTA BİLGİLERİNİ GİRİNİZ.
          </div>
          <FormGroup label="SİGORTA ŞİRKETİ *">
            <input style={S.input} value={donusturForm.sigorta_sirketi} onChange={e=>setDonusturForm(f=>({...f,sigorta_sirketi:e.target.value}))} placeholder="SİGORTA ŞİRKETİ ADI"/>
          </FormGroup>
          <FormGroup label="POLİÇE NO *">
            <input style={S.input} value={donusturForm.police_no} onChange={e=>setDonusturForm(f=>({...f,police_no:e.target.value}))} placeholder="POLİÇE NUMARASI"/>
          </FormGroup>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={()=>setDonusturItem(null)}>İPTAL</button>
          <button style={{...S.btn,background:C.accent,color:'#fff'}} onClick={dosyayaDonustur} disabled={donusturLoading}>
            <LIcon name="FolderPlus" size={14}/> {donusturLoading?'DÖNÜŞTÜRÜLÜYOR...':'DOSYAYA DÖNÜŞTÜR'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3: REDDEDİLEN
   ═══════════════════════════════════════════════════════════ */
const SahaReddedilen = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, EmptyState, Loading, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [detayItem, setDetayItem] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await api.sahaList({durum:'reddedildi', limit:500});
      if (r?.success) { setData(r.data?.items||[]); setToplam(r.data?.pagination?.total||0); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading/>;

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="XCircle" label="TOPLAM REDDEDİLEN" value={toplam} color={C.danger}/>
      </div>
      <div style={S.card}>
        <SectionTitle icon="XCircle" title="REDDEDİLEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? <EmptyState icon="XCircle" title="REDDEDİLEN KAYIT YOK" desc="REDDEDİLMİŞ SAHA DOSYASI BULUNMUYOR"/> : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:`${C.accent}08`}}>
                  {['PERSONEL','MÜŞTERİ','PLAKA','RED TARİHİ','RED NEDENİ','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(item=>(
                  <tr key={item.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
                    onClick={()=>setDetayItem(item)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi||'-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.arac_plaka||'-'}</td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarihSaat(item.onay_tarihi)}</td>
                    <td style={{padding:'10px 12px',color:C.danger,fontSize:11,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.red_nedeni||'-'}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      <button style={{...S.btn,...S.btnP,padding:'6px 12px',fontSize:10}} onClick={()=>setDetayItem(item)}>
                        <LIcon name="Eye" size={12}/> DETAY
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {detayItem && <SahaDetayModal item={detayItem} onClose={()=>setDetayItem(null)} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 4: DOSYAYA DÖNÜŞEN
   ═══════════════════════════════════════════════════════════ */
const SahaDosyayaDonusen = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [detayItem, setDetayItem] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await api.sahaList({durum:'dosyaya_donustu', limit:500});
      if (r?.success) { setData(r.data?.items||[]); setToplam(r.data?.pagination?.total||0); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading/>;

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="FolderOpen" label="TOPLAM DÖNÜŞEN" value={toplam} color={C.purple}/>
      </div>
      <div style={S.card}>
        <SectionTitle icon="FolderOpen" title="DOSYAYA DÖNÜŞEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? <EmptyState icon="FolderOpen" title="DÖNÜŞEN KAYIT YOK" desc="DOSYAYA DÖNÜŞMÜŞ SAHA DOSYASI BULUNMUYOR"/> : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:`${C.accent}08`}}>
                  {['PERSONEL','MÜŞTERİ','PLAKA','DOSYA NO','DÖNÜŞME TARİHİ','İŞLEM'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(item=>(
                  <tr key={item.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
                    onClick={()=>setDetayItem(item)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi||'-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.arac_plaka||'-'}</td>
                    <td style={{padding:'10px 12px'}}><Badge text={item.dosya_no||'-'} color={C.purple}/></td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarihSaat(item.dosyaya_donusme_tarihi)}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:6}}>
                        {item.dosya_id && (
                          <button style={{...S.btn,...S.btnS,padding:'6px 12px',fontSize:10}} onClick={()=>setPage('dosya-detay-'+item.dosya_id)}>
                            <LIcon name="ExternalLink" size={12}/> DOSYAYA GİT
                          </button>
                        )}
                        <button style={{...S.btn,...S.btnG,padding:'6px 12px',fontSize:10}} onClick={()=>setDetayItem(item)}>
                          <LIcon name="Eye" size={12}/> DETAY
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {detayItem && <SahaDetayModal item={detayItem} onClose={()=>setDetayItem(null)} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5: YENİ SAHA KAYDI (MOBİL AĞIRLIKLI)
   ═══════════════════════════════════════════════════════════ */
const SahaYeniKayit = ({setPage, user}) => {
  const {C, S, LIcon, FormGroup, api} = MR;
  const [loading, setLoading] = useState(false);
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [medyalar, setMedyalar] = useState([]);
  const [onayaGonderLoading, setOnayaGonderLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [form, setForm] = useState({
    musteri_adi:'', musteri_telefon:'', musteri_tc:'',
    hasar_tipi:'', hasar_tarihi:'', hasar_yeri:'', hasar_aciklama:'',
    hasar_durumu:'dosya_acik', gecmis_hasar:'yok', dosya_kaynagi:'',
    arac_plaka:'', arac_marka:'', arac_model:'', arac_model_yili:'', arac_km:'',
    arac_ruhsat_sahibi:'', arac_kusur_durumu:'', arac_renk:'', arac_sasi_no:'',
    karsi_plaka:'', karsi_sigorta:''
  });

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const kaydet = async () => {
    if (!form.musteri_adi.trim()) { setHata('MÜŞTERİ ADI ZORUNLUDUR'); setTimeout(()=>setHata(''),3000); return; }
    setLoading(true); setHata('');
    const r = await api.sahaCreate(form);
    setLoading(false);
    if (r?.success) {
      setSavedId(r.data?.id);
      setBasari('SAHA DOSYASI TASLAK OLARAK KAYDEDİLDİ. ŞİMDİ GÖRSEL/PDF YÜKLEYEBİLİR VE ONAYA GÖNDEREBİLİRSİNİZ.');
      setTimeout(()=>setBasari(''),8000);
    } else {
      setHata(r?.error||'KAYIT HATASI'); setTimeout(()=>setHata(''),4000);
    }
  };

  const onayaGonder = async () => {
    if (!savedId) return;
    setOnayaGonderLoading(true);
    const r = await api.sahaOnayaGonder({id:savedId});
    setOnayaGonderLoading(false);
    if (r?.success) {
      setBasari('SAHA DOSYASI ONAYA GÖNDERİLDİ!');
      setTimeout(()=>{ setBasari(''); setPage('saha-liste'); }, 2000);
    } else {
      setHata(r?.error||'ONAYA GÖNDERME HATASI'); setTimeout(()=>setHata(''),4000);
    }
  };

  const grid2 = {display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)',gap:16};
  const grid3 = {display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',gap:16};

  return (
    <div className="fade-in" style={{maxWidth: isMobile ? '100%' : '66.66%', margin:'0 auto'}}>

      {basari && <Msg text={basari} type="success"/>}
      {hata && <Msg text={hata} type="error"/>}

      {/* KAYIT SONRASI ONAYA GÖNDER */}
      {savedId && (
        <div style={{padding:20,marginBottom:20,borderRadius:12,background:`${C.success}12`,border:`2px solid ${C.success}44`,textAlign:'center'}}>
          <LIcon name="CheckCircle" size={40} color={C.success} style={{marginBottom:10}}/>
          <div style={{fontSize:16,fontWeight:700,color:C.success,marginBottom:8}}>TASLAK KAYDEDİLDİ</div>
          <div style={{fontSize:12,color:C.textSec,marginBottom:16}}>GÖRSEL VE PDF YÜKLEYEBİLİR, ARDINDAN ONAYA GÖNDEREBİLİRSİNİZ.</div>
          <button style={{...S.btn,...S.btnS,padding:'14px 40px',fontSize:15,fontWeight:700}} onClick={onayaGonder} disabled={onayaGonderLoading}>
            <LIcon name="Send" size={18}/> {onayaGonderLoading ? 'GÖNDERİLİYOR...' : 'DOSYAYI ONAYA GÖNDER'}
          </button>
        </div>
      )}

      {/* 1. MÜŞTERİ BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="User" title="MÜŞTERİ BİLGİLERİ" subtitle="MÜŞTERİ İLETİŞİM BİLGİLERİ" color={C.cyan}/>
        <div style={{...S.cardBody}}>
          <div style={grid2}>
            <FormGroup label="MÜŞTERİ ADI *">
              <input style={S.input} value={form.musteri_adi} onChange={e=>set('musteri_adi',e.target.value)} placeholder="MÜŞTERİ AD SOYAD" disabled={!!savedId}/>
            </FormGroup>
            <FormGroup label="TELEFON">
              <input style={S.input} value={form.musteri_telefon} onChange={e=>set('musteri_telefon',e.target.value)} placeholder="05XX XXX XX XX" disabled={!!savedId}/>
            </FormGroup>
          </div>
          <div style={{marginTop:16}}>
            <FormGroup label="TC KİMLİK NO">
              <input style={{...S.input,maxWidth:300}} value={form.musteri_tc} onChange={e=>set('musteri_tc',e.target.value)} placeholder="XXXXXXXXXXX" maxLength={11} disabled={!!savedId}/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* 2. HASAR BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="AlertTriangle" title="HASAR BİLGİLERİ" subtitle="HASAR DETAYLARI" color={C.warning}/>
        <div style={{...S.cardBody}}>
          <div style={grid2}>
            <FormGroup label="HASAR TİPİ">
              <select style={S.select} value={form.hasar_tipi} onChange={e=>set('hasar_tipi',e.target.value)} disabled={!!savedId}>
                <option value="">SEÇİNİZ</option>
                {HASAR_TIPLERI.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="HASAR TARİHİ">
              <input type="date" style={S.input} value={form.hasar_tarihi} onChange={e=>set('hasar_tarihi',e.target.value)} disabled={!!savedId}/>
            </FormGroup>
          </div>
          <div style={{marginTop:16}}>
            <FormGroup label="HASAR YERİ">
              <input style={S.input} value={form.hasar_yeri} onChange={e=>set('hasar_yeri',e.target.value)} placeholder="KAZA / HASAR YERİ ADRESİ" disabled={!!savedId}/>
            </FormGroup>
          </div>
          <div style={{marginTop:16}}>
            <FormGroup label="HASAR AÇIKLAMASI">
              <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={form.hasar_aciklama} onChange={e=>set('hasar_aciklama',e.target.value)} placeholder="HASAR İLE İLGİLİ DETAYLI AÇIKLAMA..." disabled={!!savedId}/>
            </FormGroup>
          </div>
          <div style={{...grid2, marginTop:16}}>
            <FormGroup label="HASAR DURUMU">
              <select style={S.select} value={form.hasar_durumu} onChange={e=>set('hasar_durumu',e.target.value)} disabled={!!savedId}>
                {HASAR_DURUMLARI.map(d=><option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="GEÇMİŞ HASAR">
              <select style={S.select} value={form.gecmis_hasar} onChange={e=>set('gecmis_hasar',e.target.value)} disabled={!!savedId}>
                <option value="yok">YOK</option>
                <option value="var">VAR</option>
              </select>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* 3. DOSYA BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="Folder" title="DOSYA BİLGİLERİ" subtitle="DOSYA KAYNAĞI" color={C.purple}/>
        <div style={{...S.cardBody}}>
          <FormGroup label="DOSYA KAYNAĞI">
            <select style={S.select} value={form.dosya_kaynagi} onChange={e=>set('dosya_kaynagi',e.target.value)} disabled={!!savedId}>
              <option value="">SEÇİNİZ</option>
              {DOSYA_KAYNAKLARI.map(k=><option key={k} value={k}>{k}</option>)}
            </select>
          </FormGroup>
        </div>
      </div>

      {/* 4. HASARLI ARAÇ BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="Car" title="HASARLI ARAÇ BİLGİLERİ" subtitle="MAĞDUR ARACI" color={C.accent}/>
        <div style={{...S.cardBody}}>
          <div style={grid3}>
            <FormGroup label="PLAKA">
              <input style={S.input} value={form.arac_plaka} onChange={e=>set('arac_plaka',e.target.value)} placeholder="34 XX 1234" disabled={!!savedId}/>
            </FormGroup>
            <FormGroup label="MARKA">
              <input style={S.input} value={form.arac_marka} onChange={e=>set('arac_marka',e.target.value)} placeholder="ÖRN: TOYOTA" disabled={!!savedId}/>
            </FormGroup>
            <FormGroup label="MODEL">
              <input style={S.input} value={form.arac_model} onChange={e=>set('arac_model',e.target.value)} placeholder="ÖRN: COROLLA" disabled={!!savedId}/>
            </FormGroup>
          </div>
          <div style={{...grid3, marginTop:16}}>
            <FormGroup label="MODEL YILI">
              <input type="number" style={S.input} value={form.arac_model_yili} onChange={e=>set('arac_model_yili',e.target.value)} placeholder="2024" disabled={!!savedId}/>
            </FormGroup>
            <FormGroup label="KM">
              <input type="number" style={S.input} value={form.arac_km} onChange={e=>set('arac_km',e.target.value)} placeholder="45000" disabled={!!savedId}/>
            </FormGroup>
            <FormGroup label="RENK">
              <input style={S.input} value={form.arac_renk} onChange={e=>set('arac_renk',e.target.value)} placeholder="BEYAZ" disabled={!!savedId}/>
            </FormGroup>
          </div>
          <div style={{...grid2, marginTop:16}}>
            <FormGroup label="RUHSAT SAHİBİ">
              <input style={S.input} value={form.arac_ruhsat_sahibi} onChange={e=>set('arac_ruhsat_sahibi',e.target.value)} placeholder="RUHSAT SAHİBİ AD SOYAD" disabled={!!savedId}/>
            </FormGroup>
            <FormGroup label="KUSUR DURUMU">
              <select style={S.select} value={form.arac_kusur_durumu} onChange={e=>set('arac_kusur_durumu',e.target.value)} disabled={!!savedId}>
                <option value="">SEÇİNİZ</option>
                {KUSUR_DURUMLARI.map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </FormGroup>
          </div>
          <div style={{marginTop:16}}>
            <FormGroup label="ŞASİ NO">
              <input style={S.input} value={form.arac_sasi_no} onChange={e=>set('arac_sasi_no',e.target.value)} placeholder="ŞASİ NUMARASI" disabled={!!savedId}/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* 5. KARŞI ARAÇ */}
      <div style={{...S.card, marginBottom:20}}>
        <SectionHeader icon="ArrowLeftRight" title="KARŞI ARAÇ BİLGİLERİ" color={C.danger}/>
        <div style={{...S.cardBody}}>
          <div style={grid2}>
            <FormGroup label="KARŞI PLAKA">
              <input style={S.input} value={form.karsi_plaka} onChange={e=>set('karsi_plaka',e.target.value)} placeholder="KARŞI TARAF PLAKASI" disabled={!!savedId}/>
            </FormGroup>
            <FormGroup label="KARŞI SİGORTA">
              <input style={S.input} value={form.karsi_sigorta} onChange={e=>set('karsi_sigorta',e.target.value)} placeholder="KARŞI TARAF SİGORTA ŞİRKETİ" disabled={!!savedId}/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* 6. GÖRSEL VE EVRAK - SADECE KAYIT SONRASI */}
      {savedId && (
        <div style={{...S.card, marginBottom:20}}>
          <SectionHeader icon="Camera" title="GÖRSEL VE EVRAK YÜKLE" subtitle="FOTOĞRAF VE PDF DOSYALARI" color={C.gold}/>
          <div style={{...S.cardBody}}>
            <MedyaUploadZone sahaId={savedId} medyalar={medyalar} setMedyalar={setMedyalar}/>
          </div>
        </div>
      )}

      {/* BUTONLAR */}
      <div style={{display:'flex',justifyContent:'flex-end',gap:10,flexWrap:'wrap'}}>
        <button style={{...S.btn,...S.btnG}} onClick={()=>setPage('saha-liste')}>
          <LIcon name="ArrowLeft" size={14}/> GERİ DÖN
        </button>
        {!savedId ? (
          <button style={{...S.btn,...S.btnS,padding:'12px 30px',fontSize:14}} onClick={kaydet} disabled={loading}>
            <LIcon name="Save" size={16}/> {loading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
          </button>
        ) : (
          <button style={{...S.btn,...S.btnS,padding:'12px 30px',fontSize:14}} onClick={onayaGonder} disabled={onayaGonderLoading}>
            <LIcon name="Send" size={16}/> {onayaGonderLoading ? 'GÖNDERİLİYOR...' : 'DOSYAYI ONAYA GÖNDER'}
          </button>
        )}
      </div>
    </div>
  );
};
