/**
 * MR HASAR DANISMANLIK - SAHA DOSYALARI MODULU
 * SAHA PERSONELI DOSYA ONAY IS AKISI
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useMemo, useCallback} = React;

/* ═══ YARDIMCI FONKSİYONLAR ═══ */
const fmtTarih = (t) => t ? new Date(t).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-';
const fmtTarihSaat = (t) => t ? new Date(t).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-';

const HASAR_TIPLERI = ['TRAFİK KAZASI','DASK','YANGIN','SU BASKIN','HIRSIZLIK','DİĞER'];

const DURUM_RENK = (d, C) => ({
  beklemede: C.warning,
  onaylandi: C.success,
  reddedildi: C.danger,
  dosyaya_donustu: C.purple
}[d] || C.textMuted);

const DURUM_LABEL = {
  beklemede: 'BEKLEMEDE',
  onaylandi: 'ONAYLANDI',
  reddedildi: 'REDDEDİLDİ',
  dosyaya_donustu: 'DOSYAYA DÖNÜŞTÜ'
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
      {/* SEKME CUBUĞU */}
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
   DETAY MODAL BİLEŞENİ (TÜM SEKMELER KULLANIR)
   ═══════════════════════════════════════════════════════════ */
const SahaDetayModal = ({item, onClose, user, onOnayla, onReddet}) => {
  const {C, S, LIcon, Modal, Badge} = MR;
  if (!item) return null;

  const isAdmin = user?.rol === 'admin';
  const renk = DURUM_RENK(item.durum, C);

  const Satir = ({label, value}) => (
    <div style={{display:'flex',padding:'8px 0',borderBottom:`1px solid ${C.border}22`}}>
      <div style={{width:160,fontSize:11,fontWeight:600,color:C.textMuted}}>{label}</div>
      <div style={{flex:1,fontSize:12,fontWeight:500,color:C.text}}>{value || '-'}</div>
    </div>
  );

  return (
    <Modal open={true} onClose={onClose} title="SAHA DOSYA DETAYI" width="700px">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <Badge text={DURUM_LABEL[item.durum] || item.durum} color={renk}/>
        <span style={{fontSize:11,color:C.textMuted}}>#{item.id}</span>
      </div>

      {/* MÜŞTERİ BİLGİLERİ */}
      <div style={{...S.card, marginBottom:16}}>
        <div style={{...S.cardHead}}>
          <div style={{width:28,height:28,borderRadius:8,background:`${C.cyan}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <LIcon name="User" size={14} color={C.cyan}/>
          </div>
          <span style={{fontSize:12,fontWeight:700}}>MÜŞTERİ BİLGİLERİ</span>
        </div>
        <div style={{padding:16}}>
          <Satir label="MÜŞTERİ ADI" value={item.musteri_adi}/>
          <Satir label="TELEFON" value={item.musteri_telefon}/>
          <Satir label="TC KİMLİK" value={item.musteri_tc}/>
        </div>
      </div>

      {/* HASAR BİLGİLERİ */}
      <div style={{...S.card, marginBottom:16}}>
        <div style={{...S.cardHead}}>
          <div style={{width:28,height:28,borderRadius:8,background:`${C.warning}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <LIcon name="AlertTriangle" size={14} color={C.warning}/>
          </div>
          <span style={{fontSize:12,fontWeight:700}}>HASAR BİLGİLERİ</span>
        </div>
        <div style={{padding:16}}>
          <Satir label="HASAR TİPİ" value={item.hasar_tipi}/>
          <Satir label="HASAR TARİHİ" value={fmtTarih(item.hasar_tarihi)}/>
          <Satir label="HASAR YERİ" value={item.hasar_yeri}/>
          <Satir label="AÇIKLAMA" value={item.hasar_aciklama}/>
        </div>
      </div>

      {/* SİGORTA BİLGİLERİ */}
      <div style={{...S.card, marginBottom:16}}>
        <div style={{...S.cardHead}}>
          <div style={{width:28,height:28,borderRadius:8,background:`${C.purple}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <LIcon name="Shield" size={14} color={C.purple}/>
          </div>
          <span style={{fontSize:12,fontWeight:700}}>SİGORTA BİLGİLERİ</span>
        </div>
        <div style={{padding:16}}>
          <Satir label="SİGORTA ŞİRKETİ" value={item.sigorta_sirketi}/>
          <Satir label="POLİÇE NO" value={item.police_no}/>
          <Satir label="PLAKA" value={item.plaka}/>
          <Satir label="KARŞI PLAKA" value={item.karsi_plaka}/>
          <Satir label="KARŞI SİGORTA" value={item.karsi_sigorta}/>
        </div>
      </div>

      {/* İŞLEM BİLGİLERİ */}
      <div style={{...S.card, marginBottom:16}}>
        <div style={{...S.cardHead}}>
          <div style={{width:28,height:28,borderRadius:8,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <LIcon name="Info" size={14} color={C.accent}/>
          </div>
          <span style={{fontSize:12,fontWeight:700}}>İŞLEM BİLGİLERİ</span>
        </div>
        <div style={{padding:16}}>
          <Satir label="PERSONEL" value={item.personel_adi}/>
          <Satir label="KAYIT TARİHİ" value={fmtTarihSaat(item.created_at)}/>
          {item.onaylayan_adi && <Satir label="ONAYLAYAN" value={item.onaylayan_adi}/>}
          {item.onay_tarihi && <Satir label="ONAY TARİHİ" value={fmtTarihSaat(item.onay_tarihi)}/>}
          {item.onay_notu && <Satir label="ONAY NOTU" value={item.onay_notu}/>}
          {item.red_nedeni && <Satir label="RED NEDENİ" value={item.red_nedeni}/>}
          {item.dosya_no && <Satir label="DOSYA NO" value={item.dosya_no}/>}
          {item.dosyaya_donusme_tarihi && <Satir label="DÖNÜŞME TARİHİ" value={fmtTarihSaat(item.dosyaya_donusme_tarihi)}/>}
        </div>
      </div>

      {/* ADMİN İŞLEM BUTONLARI */}
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
   SEKME 1: ONAY BEKLEYEN (BEKLEMEDE)
   ═══════════════════════════════════════════════════════════ */
const SahaBekleyen = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [arama, setArama] = useState('');
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');

  // Detay modal
  const [detayItem, setDetayItem] = useState(null);

  // Onayla modal
  const [onayModal, setOnayModal] = useState(null);
  const [onayNotu, setOnayNotu] = useState('');
  const [onayLoading, setOnayLoading] = useState(false);

  // Reddet modal
  const [redModal, setRedModal] = useState(null);
  const [redNedeni, setRedNedeni] = useState('');
  const [redLoading, setRedLoading] = useState(false);

  const isAdmin = user?.rol === 'admin';

  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {durum: 'beklemede', limit: 500};
    if (arama.trim()) p.arama = arama.trim();
    const r = await api.sahaList(p);
    if (r?.success) {
      setData(r.data?.items || []);
      setToplam(r.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, [arama]);

  useEffect(() => { yukle(); }, []);

  const aramaYap = () => { yukle(); };

  // Onayla
  const onaylaGonder = async () => {
    if (!onayModal) return;
    setOnayLoading(true);
    const r = await api.sahaOnayla({id: onayModal.id, onay_notu: onayNotu});
    setOnayLoading(false);
    if (r?.success) {
      setOnayModal(null); setOnayNotu(''); setDetayItem(null);
      setBasari('SAHA DOSYASI ONAYLANDI'); setTimeout(()=>setBasari(''),4000);
      yukle();
    } else {
      setHata(r?.error || 'ONAYLAMA HATASI'); setTimeout(()=>setHata(''),4000);
    }
  };

  // Reddet
  const reddetGonder = async () => {
    if (!redModal || !redNedeni.trim()) { setHata('RED NEDENİ GİRİNİZ'); setTimeout(()=>setHata(''),3000); return; }
    setRedLoading(true);
    const r = await api.sahaReddet({id: redModal.id, red_nedeni: redNedeni});
    setRedLoading(false);
    if (r?.success) {
      setRedModal(null); setRedNedeni(''); setDetayItem(null);
      setBasari('SAHA DOSYASI REDDEDİLDİ'); setTimeout(()=>setBasari(''),4000);
      yukle();
    } else {
      setHata(r?.error || 'RED HATASI'); setTimeout(()=>setHata(''),4000);
    }
  };

  // İstatistikler
  const bugun = new Date().toISOString().slice(0,10);
  const bugunEklenen = data.filter(d => (d.created_at||'').slice(0,10) === bugun).length;
  const now = new Date();
  const haftaBasi = new Date(now); haftaBasi.setDate(now.getDate() - now.getDay());
  const haftaStr = haftaBasi.toISOString().slice(0,10);
  const buHafta = data.filter(d => (d.created_at||'').slice(0,10) >= haftaStr).length;

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && (
        <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.success}18`,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="CheckCircle" size={16} color={C.success}/><span style={{fontSize:12,fontWeight:600,color:C.success}}>{basari}</span>
        </div>
      )}
      {hata && (
        <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.danger}18`,border:`1px solid ${C.danger}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="AlertCircle" size={16} color={C.danger}/><span style={{fontSize:12,fontWeight:600,color:C.danger}}>{hata}</span>
        </div>
      )}

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="Clock" label="TOPLAM BEKLEYEN" value={toplam} color={C.warning}/>
        <StatCard icon="CalendarPlus" label="BUGÜN EKLENEN" value={bugunEklenen} color={C.cyan}/>
        <StatCard icon="CalendarRange" label="BU HAFTA" value={buHafta} color={C.accent}/>
      </div>

      {/* ARAMA */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{padding:16,display:'flex',gap:10}}>
          <input style={{...S.input,flex:1}} placeholder="MÜŞTERİ ADI, TELEFON, PLAKA ARA..." value={arama} onChange={e=>setArama(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter')aramaYap()}}/>
          <button style={{...S.btn,...S.btnP}} onClick={aramaYap}><LIcon name="Search" size={14}/> ARA</button>
        </div>
      </div>

      {/* TABLO */}
      <div style={S.card}>
        <SectionTitle icon="Clock" title="ONAY BEKLEYEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? (
            <EmptyState icon="Inbox" title="BEKLEYEN KAYIT YOK" desc="ONAY BEKLEYEN SAHA DOSYASI BULUNMUYOR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:`${C.accent}08`}}>
                  {['PERSONEL','MÜŞTERİ','TELEFON','HASAR TİPİ','TARİH','PLAKA','SİGORTA','İŞLEM'].map(h => (
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
                    onClick={() => setDetayItem(item)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi || '-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px'}}>{item.musteri_telefon || '-'}</td>
                    <td style={{padding:'10px 12px'}}><Badge text={item.hasar_tipi || '-'} color={C.warning}/></td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarih(item.hasar_tarihi)}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.plaka || '-'}</td>
                    <td style={{padding:'10px 12px',fontSize:11}}>{item.sigorta_sirketi || '-'}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:6}}>
                        {isAdmin && (
                          <>
                            <button style={{...S.btn,...S.btnS,padding:'6px 12px',fontSize:10}}
                              onClick={() => {setOnayModal(item); setOnayNotu('');}}>
                              <LIcon name="Check" size={12}/> ONAYLA
                            </button>
                            <button style={{...S.btn,...S.btnD,padding:'6px 12px',fontSize:10}}
                              onClick={() => {setRedModal(item); setRedNedeni('');}}>
                              <LIcon name="X" size={12}/> REDDET
                            </button>
                          </>
                        )}
                        {!isAdmin && (
                          <button style={{...S.btn,...S.btnP,padding:'6px 12px',fontSize:10}}
                            onClick={() => setDetayItem(item)}>
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

      {/* DETAY MODAL */}
      {detayItem && (
        <SahaDetayModal item={detayItem} onClose={() => setDetayItem(null)} user={user}
          onOnayla={(item) => {setOnayModal(item); setOnayNotu('');}}
          onReddet={(item) => {setRedModal(item); setRedNedeni('');}}
        />
      )}

      {/* ONAYLA MODAL */}
      <Modal open={!!onayModal} onClose={() => setOnayModal(null)} title="SAHA DOSYASINI ONAYLA" width="500px">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textSec,marginBottom:8}}>
            <strong>{onayModal?.musteri_adi}</strong> MÜŞTERİSİNE AİT SAHA DOSYASINI ONAYLAMAK İSTEDİĞİNİZE EMİN MİSİNİZ?
          </div>
          <FormGroup label="ONAY NOTU (OPSİYONEL)">
            <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={onayNotu} onChange={e=>setOnayNotu(e.target.value)} placeholder="ONAY İLE İLGİLİ NOT EKLEYEBİLİRSİNİZ..."/>
          </FormGroup>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setOnayModal(null)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={onaylaGonder} disabled={onayLoading}>
            <LIcon name="CheckCircle" size={14}/> {onayLoading ? 'ONAYLANIYOR...' : 'ONAYLA'}
          </button>
        </div>
      </Modal>

      {/* REDDET MODAL */}
      <Modal open={!!redModal} onClose={() => setRedModal(null)} title="SAHA DOSYASINI REDDET" width="500px">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:C.textSec,marginBottom:8}}>
            <strong>{redModal?.musteri_adi}</strong> MÜŞTERİSİNE AİT SAHA DOSYASINI REDDETMEK İSTEDİĞİNİZE EMİN MİSİNİZ?
          </div>
          <FormGroup label="RED NEDENİ *">
            <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={redNedeni} onChange={e=>setRedNedeni(e.target.value)} placeholder="RED NEDENİNİ GİRİNİZ..."/>
          </FormGroup>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setRedModal(null)}>İPTAL</button>
          <button style={{...S.btn,...S.btnD}} onClick={reddetGonder} disabled={redLoading}>
            <LIcon name="XCircle" size={14}/> {redLoading ? 'REDDEDİLİYOR...' : 'REDDET'}
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
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');
  const [detayItem, setDetayItem] = useState(null);
  const [donusturLoading, setDonusturLoading] = useState(null);

  const isAdmin = user?.rol === 'admin';

  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.sahaList({durum: 'onaylandi', limit: 500});
    if (r?.success) {
      setData(r.data?.items || []);
      setToplam(r.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  const dosyayaDonustur = async (item) => {
    setDonusturLoading(item.id);
    const r = await api.sahaDosyayaDonustur({id: item.id});
    setDonusturLoading(null);
    if (r?.success) {
      setBasari('DOSYAYA DÖNÜŞTÜRÜLDÜ: ' + (r.data?.dosya_no || '')); setTimeout(()=>setBasari(''),4000);
      yukle();
    } else {
      setHata(r?.error || 'DÖNÜŞTÜRME HATASI'); setTimeout(()=>setHata(''),4000);
    }
  };

  if (loading) return <Loading/>;

  return (
    <div>
      {basari && (
        <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.success}18`,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="CheckCircle" size={16} color={C.success}/><span style={{fontSize:12,fontWeight:600,color:C.success}}>{basari}</span>
        </div>
      )}
      {hata && (
        <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.danger}18`,border:`1px solid ${C.danger}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="AlertCircle" size={16} color={C.danger}/><span style={{fontSize:12,fontWeight:600,color:C.danger}}>{hata}</span>
        </div>
      )}

      {/* İSTATİSTİK */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="CheckCircle" label="TOPLAM ONAYLANAN" value={toplam} color={C.success}/>
      </div>

      {/* TABLO */}
      <div style={S.card}>
        <SectionTitle icon="CheckCircle" title="ONAYLANAN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? (
            <EmptyState icon="CheckCircle" title="ONAYLANAN KAYIT YOK" desc="HENÜZ ONAYLANMIŞ SAHA DOSYASI BULUNMUYOR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:`${C.accent}08`}}>
                  {['PERSONEL','MÜŞTERİ','TELEFON','PLAKA','ONAY TARİHİ','ONAYLAYAN','İŞLEM'].map(h => (
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
                    onClick={() => setDetayItem(item)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi || '-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px'}}>{item.musteri_telefon || '-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.plaka || '-'}</td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarihSaat(item.onay_tarihi)}</td>
                    <td style={{padding:'10px 12px'}}>{item.onaylayan_adi || '-'}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      {isAdmin && (
                        <button style={{...S.btn,background:`${C.accent}`,color:'#fff',padding:'6px 14px',fontSize:10}}
                          onClick={() => dosyayaDonustur(item)}
                          disabled={donusturLoading === item.id}>
                          <LIcon name="FolderPlus" size={12}/> {donusturLoading === item.id ? 'DÖNÜŞTÜRÜLÜYOR...' : 'DOSYAYA DÖNÜŞTÜR'}
                        </button>
                      )}
                      {!isAdmin && (
                        <button style={{...S.btn,...S.btnP,padding:'6px 12px',fontSize:10}}
                          onClick={() => setDetayItem(item)}>
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

      {/* DETAY MODAL */}
      {detayItem && (
        <SahaDetayModal item={detayItem} onClose={() => setDetayItem(null)} user={user}/>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3: REDDEDİLEN
   ═══════════════════════════════════════════════════════════ */
const SahaReddedilen = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, api} = MR;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [detayItem, setDetayItem] = useState(null);

  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.sahaList({durum: 'reddedildi', limit: 500});
    if (r?.success) {
      setData(r.data?.items || []);
      setToplam(r.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  if (loading) return <Loading/>;

  return (
    <div>
      {/* İSTATİSTİK */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="XCircle" label="TOPLAM REDDEDİLEN" value={toplam} color={C.danger}/>
      </div>

      {/* TABLO */}
      <div style={S.card}>
        <SectionTitle icon="XCircle" title="REDDEDİLEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? (
            <EmptyState icon="XCircle" title="REDDEDİLEN KAYIT YOK" desc="REDDEDİLMİŞ SAHA DOSYASI BULUNMUYOR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:`${C.accent}08`}}>
                  {['PERSONEL','MÜŞTERİ','TELEFON','PLAKA','RED TARİHİ','RED NEDENİ','İŞLEM'].map(h => (
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
                    onClick={() => setDetayItem(item)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi || '-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px'}}>{item.musteri_telefon || '-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.plaka || '-'}</td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarihSaat(item.onay_tarihi)}</td>
                    <td style={{padding:'10px 12px',color:C.danger,fontSize:11,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.red_nedeni || '-'}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      <button style={{...S.btn,...S.btnP,padding:'6px 12px',fontSize:10}}
                        onClick={() => setDetayItem(item)}>
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

      {/* DETAY MODAL */}
      {detayItem && (
        <SahaDetayModal item={detayItem} onClose={() => setDetayItem(null)} user={user}/>
      )}
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

  const yukle = useCallback(async () => {
    setLoading(true);
    const r = await api.sahaList({durum: 'dosyaya_donustu', limit: 500});
    if (r?.success) {
      setData(r.data?.items || []);
      setToplam(r.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { yukle(); }, []);

  if (loading) return <Loading/>;

  return (
    <div>
      {/* İSTATİSTİK */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20}}>
        <StatCard icon="FolderOpen" label="TOPLAM DÖNÜŞEN" value={toplam} color={C.purple}/>
      </div>

      {/* TABLO */}
      <div style={S.card}>
        <SectionTitle icon="FolderOpen" title="DOSYAYA DÖNÜŞEN SAHA DOSYALARI" sub={`${toplam} KAYIT`}/>
        <div style={{overflowX:'auto'}}>
          {data.length === 0 ? (
            <EmptyState icon="FolderOpen" title="DÖNÜŞEN KAYIT YOK" desc="DOSYAYA DÖNÜŞMÜŞ SAHA DOSYASI BULUNMUYOR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:`${C.accent}08`}}>
                  {['PERSONEL','MÜŞTERİ','PLAKA','DOSYA NO','DÖNÜŞME TARİHİ','İŞLEM'].map(h => (
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:10,color:C.textMuted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} style={{borderBottom:`1px solid ${C.border}22`,cursor:'pointer'}}
                    onClick={() => setDetayItem(item)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.personel_adi || '-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600,color:C.accent}}>{item.musteri_adi}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{item.plaka || '-'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <Badge text={item.dosya_no || '-'} color={C.purple}/>
                    </td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{fmtTarihSaat(item.dosyaya_donusme_tarihi)}</td>
                    <td style={{padding:'10px 12px'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:6}}>
                        {item.dosya_id && (
                          <button style={{...S.btn,...S.btnS,padding:'6px 12px',fontSize:10}}
                            onClick={() => setPage('dosya-detay-' + item.dosya_id)}>
                            <LIcon name="ExternalLink" size={12}/> DOSYAYA GİT
                          </button>
                        )}
                        <button style={{...S.btn,...S.btnG,padding:'6px 12px',fontSize:10}}
                          onClick={() => setDetayItem(item)}>
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

      {/* DETAY MODAL */}
      {detayItem && (
        <SahaDetayModal item={detayItem} onClose={() => setDetayItem(null)} user={user}/>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5: YENİ SAHA KAYDI FORMU
   ═══════════════════════════════════════════════════════════ */
const SahaYeniKayit = ({setPage, user}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, api} = MR;
  const [loading, setLoading] = useState(false);
  const [basari, setBasari] = useState('');
  const [hata, setHata] = useState('');

  const [form, setForm] = useState({
    musteri_adi: '',
    musteri_telefon: '',
    musteri_tc: '',
    hasar_tipi: '',
    hasar_tarihi: '',
    hasar_yeri: '',
    hasar_aciklama: '',
    sigorta_sirketi: '',
    police_no: '',
    plaka: '',
    karsi_plaka: '',
    karsi_sigorta: ''
  });

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const kaydet = async () => {
    if (!form.musteri_adi.trim()) {
      setHata('MÜŞTERİ ADI ZORUNLUDUR');
      setTimeout(() => setHata(''), 3000);
      return;
    }
    setLoading(true);
    setHata('');
    const r = await api.sahaCreate(form);
    setLoading(false);
    if (r?.success) {
      setBasari('ONAY İÇİN GÖNDERİLDİ');
      setTimeout(() => {
        setBasari('');
        setPage('saha-liste');
      }, 2000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
      setTimeout(() => setHata(''), 4000);
    }
  };

  return (
    <div className="fade-in">
      {basari && (
        <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.success}18`,border:`1px solid ${C.success}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="CheckCircle" size={16} color={C.success}/><span style={{fontSize:12,fontWeight:600,color:C.success}}>{basari}</span>
        </div>
      )}
      {hata && (
        <div style={{padding:'12px 20px',marginBottom:16,borderRadius:10,background:`${C.danger}18`,border:`1px solid ${C.danger}44`,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="AlertCircle" size={16} color={C.danger}/><span style={{fontSize:12,fontWeight:600,color:C.danger}}>{hata}</span>
        </div>
      )}

      {/* MÜŞTERİ BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{...S.cardHead}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${C.cyan}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <LIcon name="User" size={16} color={C.cyan}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>MÜŞTERİ BİLGİLERİ</div>
            <div style={{fontSize:11,color:C.textMuted}}>MÜŞTERİ İLETİŞİM BİLGİLERİ</div>
          </div>
        </div>
        <div style={{...S.cardBody}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            <FormGroup label="MÜŞTERİ ADI *">
              <input style={S.input} value={form.musteri_adi} onChange={e=>set('musteri_adi',e.target.value)} placeholder="MÜŞTERİ AD SOYAD"/>
            </FormGroup>
            <FormGroup label="TELEFON">
              <input style={S.input} value={form.musteri_telefon} onChange={e=>set('musteri_telefon',e.target.value)} placeholder="05XX XXX XX XX"/>
            </FormGroup>
            <FormGroup label="TC KİMLİK NO">
              <input style={S.input} value={form.musteri_tc} onChange={e=>set('musteri_tc',e.target.value)} placeholder="XXXXXXXXXXX" maxLength={11}/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* HASAR BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{...S.cardHead}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${C.warning}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <LIcon name="AlertTriangle" size={16} color={C.warning}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>HASAR BİLGİLERİ</div>
            <div style={{fontSize:11,color:C.textMuted}}>HASAR DETAYLARI</div>
          </div>
        </div>
        <div style={{...S.cardBody}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            <FormGroup label="HASAR TİPİ">
              <select style={S.select} value={form.hasar_tipi} onChange={e=>set('hasar_tipi',e.target.value)}>
                <option value="">SEÇİNİZ</option>
                {HASAR_TIPLERI.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="HASAR TARİHİ">
              <input type="date" style={S.input} value={form.hasar_tarihi} onChange={e=>set('hasar_tarihi',e.target.value)}/>
            </FormGroup>
            <FormGroup label="HASAR YERİ" full>
              <input style={S.input} value={form.hasar_yeri} onChange={e=>set('hasar_yeri',e.target.value)} placeholder="KAZA / HASAR YERİ ADRESI"/>
            </FormGroup>
            <FormGroup label="HASAR AÇIKLAMASI" full>
              <textarea style={{...S.input,minHeight:80,resize:'vertical'}} value={form.hasar_aciklama} onChange={e=>set('hasar_aciklama',e.target.value)} placeholder="HASAR İLE İLGİLİ DETAYLI AÇIKLAMA..."/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* SİGORTA BİLGİLERİ */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{...S.cardHead}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${C.purple}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <LIcon name="Shield" size={16} color={C.purple}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>SİGORTA BİLGİLERİ</div>
            <div style={{fontSize:11,color:C.textMuted}}>POLİÇE VE ARAÇ BİLGİLERİ</div>
          </div>
        </div>
        <div style={{...S.cardBody}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            <FormGroup label="SİGORTA ŞİRKETİ">
              <input style={S.input} value={form.sigorta_sirketi} onChange={e=>set('sigorta_sirketi',e.target.value)} placeholder="SİGORTA ŞİRKETİ ADI"/>
            </FormGroup>
            <FormGroup label="POLİÇE NO">
              <input style={S.input} value={form.police_no} onChange={e=>set('police_no',e.target.value)} placeholder="POLİÇE NUMARASI"/>
            </FormGroup>
            <FormGroup label="PLAKA">
              <input style={S.input} value={form.plaka} onChange={e=>set('plaka',e.target.value)} placeholder="MAĞDUR ARACI PLAKASI"/>
            </FormGroup>
            <FormGroup label="KARŞI PLAKA">
              <input style={S.input} value={form.karsi_plaka} onChange={e=>set('karsi_plaka',e.target.value)} placeholder="KARŞI TARAF PLAKASI"/>
            </FormGroup>
            <FormGroup label="KARŞI SİGORTA">
              <input style={S.input} value={form.karsi_sigorta} onChange={e=>set('karsi_sigorta',e.target.value)} placeholder="KARŞI TARAF SİGORTA ŞİRKETİ"/>
            </FormGroup>
          </div>
        </div>
      </div>

      {/* KAYDET BUTONU */}
      <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
        <button style={{...S.btn,...S.btnG}} onClick={() => setPage('saha-liste')}>
          <LIcon name="ArrowLeft" size={14}/> GERİ DÖN
        </button>
        <button style={{...S.btn,...S.btnS,padding:'12px 30px',fontSize:14}} onClick={kaydet} disabled={loading}>
          <LIcon name="Save" size={16}/> {loading ? 'KAYDEDİLİYOR...' : 'ONAYA GÖNDER'}
        </button>
      </div>
    </div>
  );
};
