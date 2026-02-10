/* ============================================================
   MR HASAR DANIŞMANLIK – MUHASEBE MODÜLÜ (muhasebe.js)
   KASA YÖNETİMİ, HAREKETLER, GELİR, TRANSFER, RAPOR
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef, useMemo} = React;

/* ═══════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ – SEKME YAPISI
   ═══════════════════════════════════════════════════════════ */
MR.MuhasebePage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'kasa';

  const sekmeler = [
    {key:'kasa',       label:'KASA YÖNETİMİ', icon:'Wallet'},
    {key:'hareketler', label:'HAREKETLER',     icon:'ArrowLeftRight'},
    {key:'gelir',      label:'GELİR EKLE',     icon:'TrendingUp'},
    {key:'transfer',   label:'TRANSFER',       icon:'ArrowRightLeft'},
    {key:'rapor',      label:'RAPOR',          icon:'BarChart3'}
  ];

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
      {aktifSekme === 'kasa'       && <KasaYonetimi setPage={setPage} user={user}/>}
      {aktifSekme === 'hareketler' && <Hareketler   setPage={setPage} user={user}/>}
      {aktifSekme === 'gelir'      && <GelirEkle    setPage={setPage} user={user}/>}
      {aktifSekme === 'transfer'   && <Transfer     setPage={setPage} user={user}/>}
      {aktifSekme === 'rapor'      && <Rapor        setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1 – KASA YÖNETİMİ
   ═══════════════════════════════════════════════════════════ */
const KasaYonetimi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, fmt} = MR;
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [form, setForm] = useState({ad:'', tur:'nakit', banka_adi:'', iban:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [confirm, setConfirm] = useState({open:false, msg:'', cb:null});

  const yukle = async () => {
    setLoading(true);
    const r = await api.kasaList();
    if (r?.success) setKasalar(r.data || []);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    const aktifler = kasalar.filter(k => k.aktif !== false && k.aktif !== 0);
    const topBakiye = aktifler.reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    const nakitBakiye = aktifler.filter(k => k.tur === 'nakit').reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    const bankaBakiye = aktifler.filter(k => k.tur === 'banka').reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    return {topBakiye, nakitBakiye, bankaBakiye, sayi: kasalar.length};
  }, [kasalar]);

  /* YENİ / DÜZENLE MODAL AÇ */
  const yeniKasaAc = () => {
    setDuzenle(null);
    setForm({ad:'', tur:'nakit', banka_adi:'', iban:''});
    setHata('');
    setModalAcik(true);
  };

  const duzenleAc = (kasa) => {
    setDuzenle(kasa);
    setForm({ad: kasa.ad || '', tur: kasa.tur || 'nakit', banka_adi: kasa.banka_adi || '', iban: kasa.iban || ''});
    setHata('');
    setModalAcik(true);
  };

  /* KAYDET */
  const kaydet = async () => {
    if (!form.ad.trim()) { setHata('KASA ADI ZORUNLUDUR'); return; }
    if (form.tur === 'banka' && !form.banka_adi.trim()) { setHata('BANKA ADI ZORUNLUDUR'); return; }
    setKayitLoading(true); setHata('');

    let r;
    if (duzenle) {
      r = await api.kasaUpdate({id: duzenle.id, ad: form.ad, banka_adi: form.banka_adi, iban: form.iban, aktif: duzenle.aktif});
    } else {
      r = await api.kasaCreate({ad: form.ad, tur: form.tur, banka_adi: form.banka_adi, iban: form.iban});
    }

    if (r?.success) {
      setModalAcik(false);
      yukle();
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
        if (r?.success) yukle();
      }
    });
  };

  if (loading) return <Loading/>;

  return (
    <div>
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
          right={
            <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={yeniKasaAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ KASA
            </button>
          }/>
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
                    padding:20, position:'relative', opacity: pasif ? 0.6 : 1,
                    transition:'all .2s'
                  }}>
                    {/* ÜST: AD VE İŞLEMLER */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{kasa.ad}</div>
                        <Badge text={kasa.tur === 'nakit' ? 'NAKİT' : 'BANKA'} color={turRenk}/>
                        {pasif && <Badge text="PASİF" color={C.danger}/>}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <div onClick={() => duzenleAc(kasa)} style={{width:30,height:30,borderRadius:8,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                          title="DÜZENLE">
                          <LIcon name="Pencil" size={13} color={C.accent}/>
                        </div>
                        <div onClick={() => toggleAktif(kasa)} style={{width:30,height:30,borderRadius:8,background: pasif ? `${C.success}22` : `${C.danger}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                          title={pasif ? 'AKTİF ET' : 'PASİF YAP'}>
                          <LIcon name={pasif ? 'ToggleRight' : 'ToggleLeft'} size={13} color={pasif ? C.success : C.danger}/>
                        </div>
                      </div>
                    </div>

                    {/* BAKİYE */}
                    <div style={{fontSize:26,fontWeight:800,color: bakiye >= 0 ? C.success : C.danger, marginBottom:16, letterSpacing:-0.5}}>
                      {fmt(bakiye)}
                    </div>

                    {/* BANKA BİLGİLERİ */}
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

      {/* YENİ / DÜZENLE MODAL */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title={duzenle ? 'KASA DÜZENLE' : 'YENİ KASA OLUŞTUR'} width="500px">
        {hata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger}}>{hata}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA ADI *">
            <input style={S.input} value={form.ad} onChange={e => setForm(p => ({...p, ad: e.target.value.toUpperCase()}))} placeholder="KASA ADI"/>
          </FormGroup>
          <FormGroup label="TÜR *">
            <select style={S.select} value={form.tur} onChange={e => setForm(p => ({...p, tur: e.target.value}))} disabled={!!duzenle}>
              <option value="nakit">NAKİT</option>
              <option value="banka">BANKA</option>
            </select>
          </FormGroup>
          {form.tur === 'banka' && (
            <>
              <FormGroup label="BANKA ADI">
                <input style={S.input} value={form.banka_adi} onChange={e => setForm(p => ({...p, banka_adi: e.target.value.toUpperCase()}))} placeholder="BANKA ADI"/>
              </FormGroup>
              <FormGroup label="IBAN">
                <input style={S.input} value={form.iban} onChange={e => setForm(p => ({...p, iban: e.target.value.toUpperCase()}))} placeholder="TR00 0000 0000 0000 0000 0000 00" maxLength={32}/>
              </FormGroup>
            </>
          )}
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
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
   SEKME 2 – HAREKETLER
   ═══════════════════════════════════════════════════════════ */
const Hareketler = ({setPage, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, Loading, EmptyState, api, fmt} = MR;
  const [kasalar, setKasalar] = useState([]);
  const [hareketler, setHareketler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toplam, setToplam] = useState(0);

  /* FİLTRELER */
  const [kasaF, setKasaF] = useState('');
  const [turF, setTurF] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');

  /* SAYFALAMA */
  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const kasaYukle = async () => {
    const r = await api.kasaList();
    if (r?.success) setKasalar(r.data || []);
  };

  const yukle = async () => {
    setLoading(true);
    const p = {limit, offset};
    if (kasaF) p.kasa_id = kasaF;
    if (turF) p.tur = turF;
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    const r = await api.kasaHareketler(p);
    if (r?.success) {
      setHareketler(r.data?.items || r.data || []);
      setTotalCount(r.data?.pagination?.total || r.data?.toplam || (r.data?.items || r.data || []).length);
      setToplam(r.data?.toplam_tutar || 0);
    }
    setLoading(false);
  };

  useEffect(() => { kasaYukle(); }, []);
  useEffect(() => { yukle(); }, [kasaF, turF, baslangic, bitis, offset]);

  const kasaAdi = (id) => {
    const k = kasalar.find(k => k.id == id);
    return k ? k.ad : '-';
  };

  const turRenk = (tur) => {
    if (tur === 'giris' || tur === 'gelir' || tur === 'komisyon') return C.success;
    if (tur === 'cikis' || tur === 'gider') return C.danger;
    if (tur === 'transfer') return C.warning;
    return C.textSec;
  };

  const turLabel = (tur) => {
    const map = {giris:'GİRİŞ', cikis:'ÇIKIŞ', gelir:'GELİR', gider:'GİDER', komisyon:'KOMİSYON', transfer:'TRANSFER'};
    return map[tur] || (tur || '').toUpperCase();
  };

  const toplamSayfa = Math.ceil(totalCount / limit);
  const mevcutSayfa = Math.floor(offset / limit) + 1;

  /* TOPLAM HESAPLAMA */
  const hareketToplam = useMemo(() => {
    return hareketler.reduce((t, h) => {
      const tutar = parseFloat(h.tutar) || 0;
      if (h.tur === 'giris' || h.tur === 'gelir' || h.tur === 'komisyon') return t + tutar;
      if (h.tur === 'cikis' || h.tur === 'gider') return t - tutar;
      return t;
    }, 0);
  }, [hareketler]);

  return (
    <div>
      <div style={S.card}>
        <SectionTitle icon="ArrowLeftRight" title="KASA HAREKETLERİ"
          sub={`TOPLAM ${totalCount} HAREKET`}/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>KASA</label>
            <select style={{...S.select,width:180,fontSize:11}} value={kasaF} onChange={e => {setKasaF(e.target.value);setOffset(0);}}>
              <option value="">TÜMÜ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>TÜR</label>
            <select style={{...S.select,width:140,fontSize:11}} value={turF} onChange={e => {setTurF(e.target.value);setOffset(0);}}>
              <option value="">TÜMÜ</option>
              <option value="giris">GİRİŞ</option>
              <option value="cikis">ÇIKIŞ</option>
              <option value="transfer">TRANSFER</option>
              <option value="gelir">GELİR</option>
              <option value="komisyon">KOMİSYON</option>
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BAŞLANGIÇ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={baslangic} onChange={e => {setBaslangic(e.target.value);setOffset(0);}}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BİTİŞ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={bitis} onChange={e => {setBitis(e.target.value);setOffset(0);}}/>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setKasaF('');setTurF('');setBaslangic('');setBitis('');setOffset(0);}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        {/* TABLO */}
        {loading ? <Loading/> : (
          <div style={{overflowX:'auto'}}>
            {hareketler.length === 0 ? (
              <EmptyState icon="ArrowLeftRight" title="HAREKET BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN HAREKET BULUNMAMAKTADIR"/>
            ) : (
              <>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {['TARİH','KASA','TÜR','TUTAR','AÇIKLAMA','DOSYA NO'].map(h =>
                        <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {hareketler.map((h, i) => {
                      const tutar = parseFloat(h.tutar) || 0;
                      const giris = h.tur === 'giris' || h.tur === 'gelir' || h.tur === 'komisyon';
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* ALT TOPLAM */}
                <div style={{padding:'14px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}08`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.textSec}}>
                    SAYFA TOPLAMI: <span style={{color: hareketToplam >= 0 ? C.success : C.danger,fontSize:14}}>{fmt(hareketToplam)}</span>
                  </div>
                </div>

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
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3 – GELİR EKLE
   ═══════════════════════════════════════════════════════════ */
const GelirEkle = ({setPage, user}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, Badge, Loading, EmptyState, api, fmt, fmtInput, parseNum} = MR;
  const [kasalar, setKasalar] = useState([]);
  const [form, setForm] = useState({kasa_id:'', dosya_id:'', tur:'gelir', tutar:'', aciklama:''});
  const [loading, setLoading] = useState(false);
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const [sonGelirler, setSonGelirler] = useState([]);
  const [gelirLoading, setGelirLoading] = useState(true);

  const yukle = async () => {
    const r = await api.kasaList();
    if (r?.success) {
      const aktifler = (r.data || []).filter(k => k.aktif !== false && k.aktif !== 0);
      setKasalar(aktifler);
      if (aktifler.length > 0 && !form.kasa_id) setForm(p => ({...p, kasa_id: String(aktifler[0].id)}));
    }
  };

  const sonGelirYukle = async () => {
    setGelirLoading(true);
    const r = await api.kasaHareketler({tur:'gelir', limit:10});
    if (r?.success) setSonGelirler(r.data?.items || r.data || []);
    setGelirLoading(false);
  };

  useEffect(() => { yukle(); sonGelirYukle(); }, []);

  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  const tutarDegistir = (v) => {
    setForm(p => ({...p, tutar: fmtInput(v)}));
  };

  const kaydet = async () => {
    if (!form.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); return; }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    if (!form.aciklama.trim()) { setHata('AÇIKLAMA ZORUNLUDUR'); return; }

    setKayitLoading(true); setHata(''); setBasari('');

    const gonder = {
      kasa_id: parseInt(form.kasa_id),
      tur: form.tur,
      tutar: tutarNum,
      aciklama: form.aciklama
    };
    if (form.dosya_id) gonder.dosya_id = parseInt(form.dosya_id);

    const r = await api.gelirEkle(gonder);
    if (r?.success) {
      setBasari('GELİR BAŞARIYLA KAYDEDİLDİ');
      setForm(p => ({...p, dosya_id:'', tutar:'', aciklama:''}));
      sonGelirYukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  return (
    <div>
      {/* GELİR FORMU */}
      <div style={S.card}>
        <SectionTitle icon="TrendingUp" title="GELİR EKLE" sub="KASA HESABINA GELİR KAYDI OLUŞTURUN"/>
        <div style={S.cardBody}>
          {hata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
            <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{hata}
          </div>}
          {basari && <div style={{padding:10,background:`${C.success}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.success,border:`1px solid ${C.success}44`}}>
            <LIcon name="CheckCircle" size={14} color={C.success} style={{marginRight:6}}/>{basari}
          </div>}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:700}}>
            <FormGroup label="KASA SEÇİMİ *">
              <select style={S.select} value={form.kasa_id} onChange={e => up('kasa_id', e.target.value)}>
                <option value="">KASA SEÇİNİZ</option>
                {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>)}
              </select>
            </FormGroup>
            <FormGroup label="DOSYA NO (OPSİYONEL)">
              <input style={S.input} value={form.dosya_id} onChange={e => up('dosya_id', e.target.value)} placeholder="DOSYA ID"/>
            </FormGroup>
            <FormGroup label="TÜR *">
              <select style={S.select} value={form.tur} onChange={e => up('tur', e.target.value)}>
                <option value="gelir">GELİR</option>
                <option value="komisyon">KOMİSYON</option>
              </select>
            </FormGroup>
            <FormGroup label="TUTAR *">
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
                <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={form.tutar}
                  onChange={e => tutarDegistir(e.target.value)} placeholder="0,00"/>
              </div>
            </FormGroup>
            <FormGroup label="AÇIKLAMA *" full>
              <textarea style={{...S.input,minHeight:70}} value={form.aciklama} onChange={e => up('aciklama', e.target.value.toUpperCase())} placeholder="GELİR AÇIKLAMASI..."/>
            </FormGroup>
          </div>

          <div style={{marginTop:20,display:'flex',gap:8}}>
            <button style={{...S.btn,...S.btnS,fontSize:13}} onClick={kaydet} disabled={kayitLoading}>
              <LIcon name="Plus" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'GELİR KAYDET'}
            </button>
          </div>
        </div>
      </div>

      {/* SON GELİRLER */}
      <div style={{...S.card, marginTop:20}}>
        <SectionTitle icon="List" title="SON GELİR KAYITLARI" sub="SON 10 GELİR HAREKETİ"/>
        <div style={S.cardBody}>
          {gelirLoading ? <Loading/> : sonGelirler.length === 0 ? (
            <EmptyState icon="TrendingUp" title="GELİR KAYDI YOK" desc="HENÜZ GELİR KAYDI OLUŞTURULMAMIŞTIR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['TARİH','KASA','TÜR','TUTAR','AÇIKLAMA'].map(h =>
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sonGelirler.map((g, i) => (
                  <tr key={g.id || i} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{g.tarih || g.created_at?.split(' ')[0] || '-'}</td>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{g.kasa_adi || '-'}</td>
                    <td style={{padding:'10px 12px'}}><Badge text={g.tur === 'komisyon' ? 'KOMİSYON' : 'GELİR'} color={g.tur === 'komisyon' ? C.purple : C.success}/></td>
                    <td style={{padding:'10px 12px',fontWeight:700,color:C.success}}>+{fmt(parseFloat(g.tutar) || 0)}</td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{g.aciklama || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 4 – TRANSFER
   ═══════════════════════════════════════════════════════════ */
const Transfer = ({setPage, user}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, Badge, api, fmt, fmtInput, parseNum} = MR;
  const [kasalar, setKasalar] = useState([]);
  const [form, setForm] = useState({kaynak_id:'', hedef_id:'', tutar:'', aciklama:''});
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  useEffect(() => {
    (async () => {
      const r = await api.kasaList();
      if (r?.success) {
        const aktifler = (r.data || []).filter(k => k.aktif !== false && k.aktif !== 0);
        setKasalar(aktifler);
      }
    })();
  }, []);

  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  const kaynakKasa = kasalar.find(k => k.id == form.kaynak_id);
  const hedefKasa = kasalar.find(k => k.id == form.hedef_id);

  const kaydet = async () => {
    if (!form.kaynak_id) { setHata('KAYNAK KASA SEÇİMİ ZORUNLUDUR'); return; }
    if (!form.hedef_id) { setHata('HEDEF KASA SEÇİMİ ZORUNLUDUR'); return; }
    if (form.kaynak_id === form.hedef_id) { setHata('KAYNAK VE HEDEF KASA AYNI OLAMAZ'); return; }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }

    setLoading(true); setHata(''); setBasari('');

    const r = await api.kasaTransfer({
      kaynak_id: parseInt(form.kaynak_id),
      hedef_id: parseInt(form.hedef_id),
      tutar: tutarNum,
      aciklama: form.aciklama
    });

    if (r?.success) {
      setBasari('TRANSFER BAŞARIYLA GERÇEKLEŞTİRİLDİ');
      setForm({kaynak_id:'', hedef_id:'', tutar:'', aciklama:''});
      /* KASALARI TEKRAR YÜKLE */
      const r2 = await api.kasaList();
      if (r2?.success) setKasalar((r2.data || []).filter(k => k.aktif !== false && k.aktif !== 0));
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'TRANSFER HATASI');
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={S.card}>
        <SectionTitle icon="ArrowRightLeft" title="KASALAR ARASI TRANSFER" sub="BİR KASADAN DİĞERİNE PARA TRANSFERİ"/>
        <div style={S.cardBody}>
          {hata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
            <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{hata}
          </div>}
          {basari && <div style={{padding:10,background:`${C.success}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.success,border:`1px solid ${C.success}44`}}>
            <LIcon name="CheckCircle" size={14} color={C.success} style={{marginRight:6}}/>{basari}
          </div>}

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
              <select style={S.select} value={form.kaynak_id} onChange={e => up('kaynak_id', e.target.value)}>
                <option value="">KASA SEÇİNİZ</option>
                {kasalar.filter(k => k.id != form.hedef_id).map(k =>
                  <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>
                )}
              </select>
              {kaynakKasa && (
                <div style={{marginTop:12,padding:10,background:`${C.bgCard}`,borderRadius:8,border:`1px solid ${C.border}`}}>
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
              {form.tutar && (
                <div style={{fontSize:14,fontWeight:800,color:C.warning}}>
                  ₺{fmtInput(form.tutar)}
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
              <select style={S.select} value={form.hedef_id} onChange={e => up('hedef_id', e.target.value)}>
                <option value="">KASA SEÇİNİZ</option>
                {kasalar.filter(k => k.id != form.kaynak_id).map(k =>
                  <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>
                )}
              </select>
              {hedefKasa && (
                <div style={{marginTop:12,padding:10,background:`${C.bgCard}`,borderRadius:8,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>MEVCUT BAKİYE</div>
                  <div style={{fontSize:20,fontWeight:800,color:C.text}}>{fmt(parseFloat(hedefKasa.bakiye) || 0)}</div>
                </div>
              )}
            </div>
          </div>

          {/* TUTAR VE AÇIKLAMA */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:700}}>
            <FormGroup label="TRANSFER TUTARI *">
              <div style={{position:'relative'}}>
                <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
                <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={form.tutar}
                  onChange={e => setForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
              </div>
            </FormGroup>
            <FormGroup label="AÇIKLAMA">
              <input style={S.input} value={form.aciklama} onChange={e => up('aciklama', e.target.value.toUpperCase())} placeholder="TRANSFER AÇIKLAMASI"/>
            </FormGroup>
          </div>

          <div style={{marginTop:24,display:'flex',gap:8}}>
            <button style={{...S.btn,...S.btnW,fontSize:13}} onClick={kaydet} disabled={loading}>
              <LIcon name="ArrowRightLeft" size={14} color="#000"/> {loading ? 'TRANSFER EDİLİYOR...' : 'TRANSFER YAP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5 – RAPOR
   ═══════════════════════════════════════════════════════════ */
const Rapor = ({setPage, user}) => {
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
    const r = await api.muhasebeRapor(p);
    if (r?.success) setRapor(r.data || {});
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  const raporGetir = () => { yukle(); };

  /* ÖZET BİLGİLER */
  const toplamGelir = rapor?.toplam_gelir || 0;
  const toplamGider = rapor?.toplam_gider || 0;
  const netKar = toplamGelir - toplamGider;
  const dosyaOrt = rapor?.dosya_ortalama || (rapor?.dosya_sayisi ? (toplamGelir / rapor.dosya_sayisi) : 0);

  /* AYLIK VERİLER (GRAFİK İÇİN) */
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
          <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setBaslangic('');setBitis('');setTimeout(yukle,0);}}>
            <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
          </button>
        </div>
      </div>

      {loading ? <Loading/> : !rapor ? (
        <EmptyState icon="BarChart3" title="RAPOR VERİSİ YOK" desc="RAPOR VERİLERİ YÜKLENEMEDI"/>
      ) : (
        <>
          {/* ÖZET KARTLAR */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            <StatCard icon="TrendingUp" label="TOPLAM GELİR" value={fmt(toplamGelir)} color={C.success}/>
            <StatCard icon="TrendingDown" label="TOPLAM GİDER" value={fmt(toplamGider)} color={C.danger}/>
            <StatCard icon="Activity" label="NET KAR / ZARAR" value={fmt(netKar)} color={netKar >= 0 ? C.success : C.danger}/>
            <StatCard icon="FileText" label="DOSYA BAŞINA ORT." value={fmt(dosyaOrt)} color={C.purple}/>
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
                    {/* GRAFIK LEJANTI */}
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
                              {/* GELİR BAR */}
                              <div title={`GELİR: ${fmt(gelir)}`} style={{
                                width:16, height:gelirH, background:`linear-gradient(to top, ${C.success}, ${C.success}cc)`,
                                borderRadius:'4px 4px 0 0', cursor:'pointer', transition:'all .3s',
                                minHeight:2
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
                              onMouseLeave={e => e.currentTarget.style.opacity='1'}/>
                              {/* GİDER BAR */}
                              <div title={`GİDER: ${fmt(gider)}`} style={{
                                width:16, height:giderH, background:`linear-gradient(to top, ${C.danger}, ${C.danger}cc)`,
                                borderRadius:'4px 4px 0 0', cursor:'pointer', transition:'all .3s',
                                minHeight:2
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
              <SectionTitle icon="PieChart" title="KATEGORİ DAĞILIMI" sub="GELİR KATEGORİLERİ"/>
              <div style={S.cardBody}>
                {kategoriler.length === 0 ? (
                  <EmptyState icon="PieChart" title="KATEGORİ VERİSİ YOK" desc="KATEGORİ BAZLI VERİ BULUNMAMAKTADIR"/>
                ) : (
                  <div>
                    {/* BASİT HALKA GRAFİĞİ */}
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
          {rapor?.detay && rapor.detay.length > 0 && (
            <div style={{...S.card, marginTop:20}}>
              <SectionTitle icon="FileText" title="DETAYLI RAPOR" sub="DÖNEM BAZLI GELİR-GİDER DETAYI"/>
              <div style={S.cardBody}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {['DÖNEM','GELİR','GİDER','NET','DOSYA SAYISI'].map(h =>
                        <th key={h} style={{padding:'10px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rapor.detay.map((d, i) => {
                      const gelir = parseFloat(d.gelir) || 0;
                      const gider = parseFloat(d.gider) || 0;
                      const net = gelir - gider;
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'10px 12px',fontWeight:600}}>{d.donem || d.ay || '-'}</td>
                          <td style={{padding:'10px 12px',color:C.success,fontWeight:600}}>{fmt(gelir)}</td>
                          <td style={{padding:'10px 12px',color:C.danger,fontWeight:600}}>{fmt(gider)}</td>
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
                      <td style={{padding:'12px',fontWeight:800,color:netKar >= 0 ? C.success : C.danger,fontSize:12}}>{fmt(netKar)}</td>
                      <td style={{padding:'12px',fontWeight:600,color:C.textSec}}>{rapor.dosya_sayisi || '-'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* NET KAR/ZARAR BANNOSU */}
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
