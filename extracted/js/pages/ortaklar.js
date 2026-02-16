/* ============================================================
   MR HASAR DANIŞMANLIK – ORTAKLAR & PAYDAŞLAR MODÜLÜ (ortaklar.js)
   İŞ ORTAKLARI (AVUKATLAR) + İŞ PAYDAŞLARI (ACENTELER, GALERİLER...)
   ÖDEME TAKİBİ, KOMİSYON YÖNETİMİ, FİNANSAL HAREKETLER
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useMemo} = React;

/* ═══════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ – SEKME YAPISI
   ═══════════════════════════════════════════════════════════ */
MR.OrtaklarPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'ortaklar';

  const sekmeler = [
    {key:'ortaklar',  label:'İŞ ORTAKLARI',   icon:'Briefcase'},
    {key:'paydaslar', label:'İŞ PAYDAŞLARI',  icon:'Network'}
  ];

  return (
    <div className="fade-in">
      {/* SEKME BAR */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('ortaklar-' + s.key)}
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
      {aktifSekme === 'ortaklar'  && <IsOrtaklari  setPage={setPage} user={user}/>}
      {aktifSekme === 'paydaslar' && <IsPaydaslari setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1 – İŞ ORTAKLARI (AVUKATLAR)
   ═══════════════════════════════════════════════════════════ */
const IsOrtaklari = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, fmt, fmtInput, parseNum} = MR;

  /* ─── STATE ─── */
  const [ortaklar, setOrtaklar] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [arama, setArama] = useState('');
  const [durumF, setDurumF] = useState('');
  const [ilF, setIlF] = useState('');

  /* MODAL STATE */
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');

  /* DETAY MODAL STATE */
  const [detayModal, setDetayModal] = useState(false);
  const [seciliOrtak, setSeciliOrtak] = useState(null);
  const [hareketler, setHareketler] = useState([]);
  const [hareketLoading, setHareketLoading] = useState(false);

  /* HAREKET EKLEME MODAL STATE */
  const [hareketModalAcik, setHareketModalAcik] = useState(false);
  const [hareketKayitLoading, setHareketKayitLoading] = useState(false);
  const [hareketHata, setHareketHata] = useState('');

  /* CONFIRM */
  const [confirm, setConfirm] = useState({open:false, msg:'', cb:null});

  /* SAYFALAMA */
  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  /* ─── FORM ─── */
  const bosForm = {ad_soyad:'', firma:'', telefon:'', email:'', adres:'', il:'', vergi_no:'', baro:'', sicil_no:'', odeme_orani:'', kasa_id:'', durum:'aktif', notlar:''};
  const [form, setForm] = useState({...bosForm});
  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  /* HAREKET FORMU */
  const bosHareketForm = {tur:'odeme', tutar:'', aciklama:'', tarih:'', dosya_id:''};
  const [hareketForm, setHareketForm] = useState({...bosHareketForm});
  const hUp = (k, v) => setHareketForm(p => ({...p, [k]: v}));

  /* ─── VERİ YÜKLE ─── */
  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {limit, offset};
    if (arama) p.q = arama;
    if (durumF) p.durum = durumF;
    if (ilF) p.il = ilF;
    const r = await api.ortakList(p);
    if (r?.success) {
      setOrtaklar(r.data?.items || r.data || []);
      setTotalCount(r.data?.pagination?.total || r.data?.toplam || (r.data?.items || r.data || []).length);
    }
    setLoading(false);
  }, [offset, arama, durumF, ilF]);

  const kasaYukle = useCallback(async () => {
    const r = await api.kasaList();
    if (r?.success) setKasalar((r.data || []).filter(k => k.aktif !== false && k.aktif !== 0));
  }, []);

  useEffect(() => { yukle(); }, [yukle]);
  useEffect(() => { kasaYukle(); }, []);

  /* ─── İSTATİSTİKLER ─── */
  const istatistik = useMemo(() => {
    const toplam = totalCount || ortaklar.length;
    const aktif = ortaklar.filter(o => o.durum === 'aktif').length;
    const pasif = ortaklar.filter(o => o.durum === 'pasif').length;
    const toplamOdeme = ortaklar.reduce((t, o) => t + (parseFloat(o.toplam_odeme) || 0), 0);
    return {toplam, aktif, pasif, toplamOdeme};
  }, [ortaklar, totalCount]);

  /* İLLER (FİLTRE İÇİN) */
  const iller = useMemo(() => {
    const set = new Set(ortaklar.map(o => o.il).filter(Boolean));
    return [...set].sort();
  }, [ortaklar]);

  /* ─── YENİ ORTAK MODAL AÇ ─── */
  const yeniOrtakAc = () => {
    setDuzenle(null);
    setForm({...bosForm});
    setHata('');
    setModalAcik(true);
  };

  /* DÜZENLE MODAL AÇ */
  const duzenleAc = (ortak) => {
    setDuzenle(ortak);
    setForm({
      ad_soyad: ortak.ad_soyad || '',
      firma: ortak.firma || '',
      telefon: ortak.telefon || '',
      email: ortak.email || '',
      adres: ortak.adres || '',
      il: ortak.il || '',
      vergi_no: ortak.vergi_no || '',
      baro: ortak.baro || '',
      sicil_no: ortak.sicil_no || '',
      odeme_orani: ortak.odeme_orani != null ? String(ortak.odeme_orani) : '',
      kasa_id: ortak.kasa_id ? String(ortak.kasa_id) : '',
      durum: ortak.durum || 'aktif',
      notlar: ortak.notlar || ''
    });
    setHata('');
    setModalAcik(true);
  };

  /* ─── KAYDET ─── */
  const kaydet = async () => {
    if (!form.ad_soyad.trim()) { setHata('AD SOYAD ZORUNLUDUR'); return; }
    setKayitLoading(true); setHata('');

    const gonder = {
      ...form,
      odeme_orani: form.odeme_orani ? parseFloat(form.odeme_orani) : 0,
      kasa_id: form.kasa_id ? parseInt(form.kasa_id) : null
    };

    let r;
    if (duzenle) {
      r = await api.ortakUpdate({id: duzenle.id, ...gonder});
    } else {
      r = await api.ortakCreate(gonder);
    }

    if (r?.success) {
      setModalAcik(false);
      yukle();
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* ─── SİL ─── */
  const silOnay = (ortak) => {
    setConfirm({
      open: true,
      msg: `"${ortak.ad_soyad}" İŞ ORTAĞINI SİLMEK İSTİYOR MUSUNUZ? BU İŞLEM GERİ ALINAMAZ.`,
      cb: async () => {
        setConfirm({open:false, msg:'', cb:null});
        const r = await api.ortakDelete(ortak.id);
        if (r?.success) yukle();
      }
    });
  };

  /* ─── DETAY MODAL AÇ ─── */
  const detayAc = async (ortak) => {
    setSeciliOrtak(ortak);
    setDetayModal(true);
    setHareketler([]);
    setHareketLoading(true);
    const r = await api.ortakHareketList({ortak_id: ortak.id});
    if (r?.success) setHareketler(r.data?.items || r.data || []);
    setHareketLoading(false);
  };

  /* ─── HAREKET EKLEME MODAL AÇ ─── */
  const hareketEkleAc = () => {
    setHareketForm({...bosHareketForm, tarih: new Date().toISOString().split('T')[0]});
    setHareketHata('');
    setHareketModalAcik(true);
  };

  /* HAREKET KAYDET */
  const hareketKaydet = async () => {
    const tutarNum = parseNum(hareketForm.tutar);
    if (tutarNum <= 0) { setHareketHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    if (!hareketForm.tarih) { setHareketHata('TARİH SEÇİNİZ'); return; }
    setHareketKayitLoading(true); setHareketHata('');

    const r = await api.ortakHareketEkle({
      ortak_id: seciliOrtak.id,
      tur: hareketForm.tur,
      tutar: tutarNum,
      aciklama: hareketForm.aciklama,
      tarih: hareketForm.tarih,
      dosya_id: hareketForm.dosya_id ? parseInt(hareketForm.dosya_id) : null
    });

    if (r?.success) {
      setHareketModalAcik(false);
      /* HAREKETLERİ YENİDEN YÜKLE */
      const r2 = await api.ortakHareketList({ortak_id: seciliOrtak.id});
      if (r2?.success) setHareketler(r2.data?.items || r2.data || []);
      yukle();
    } else {
      setHareketHata(r?.error || 'HAREKET KAYIT HATASI');
    }
    setHareketKayitLoading(false);
  };

  /* ─── HAREKET YARDIMCI FONKSİYONLAR ─── */
  const hareketTurRenk = (tur) => {
    if (tur === 'odeme') return C.danger;
    if (tur === 'tahsilat') return C.success;
    if (tur === 'masraf') return C.warning;
    return C.textSec;
  };
  const hareketTurLabel = (tur) => {
    if (tur === 'odeme') return 'ÖDEME';
    if (tur === 'tahsilat') return 'TAHSİLAT';
    if (tur === 'masraf') return 'MASRAF';
    return (tur || '-').toUpperCase();
  };
  const hareketTurIcon = (tur) => {
    if (tur === 'odeme') return 'ArrowUpRight';
    if (tur === 'tahsilat') return 'ArrowDownLeft';
    if (tur === 'masraf') return 'Receipt';
    return 'ArrowLeftRight';
  };

  /* HAREKET HESAPLAMA */
  const hareketOzet = useMemo(() => {
    const odeme = hareketler.filter(h => h.tur === 'odeme').reduce((t, h) => t + (parseFloat(h.tutar) || 0), 0);
    const tahsilat = hareketler.filter(h => h.tur === 'tahsilat').reduce((t, h) => t + (parseFloat(h.tutar) || 0), 0);
    const masraf = hareketler.filter(h => h.tur === 'masraf').reduce((t, h) => t + (parseFloat(h.tutar) || 0), 0);
    const bakiye = tahsilat - odeme - masraf;
    return {odeme, tahsilat, masraf, bakiye};
  }, [hareketler]);

  /* SAYFALAMA */
  const toplamSayfa = Math.ceil(totalCount / limit);
  const mevcutSayfa = Math.floor(offset / limit) + 1;

  if (loading) return <Loading/>;

  return (
    <div>
      {/* ─── İSTATİSTİK KARTLARI ─── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="Briefcase" label="TOPLAM ORTAK" value={istatistik.toplam} color={C.accent}/>
        <StatCard icon="UserCheck" label="AKTİF" value={istatistik.aktif} color={C.success}/>
        <StatCard icon="UserX" label="PASİF" value={istatistik.pasif} color={C.danger}/>
        <StatCard icon="Banknote" label="TOPLAM ÖDEME" value={fmt(istatistik.toplamOdeme)} color={C.purple}/>
      </div>

      {/* ─── ANA TABLO ─── */}
      <div style={S.card}>
        <SectionTitle icon="Briefcase" title="İŞ ORTAKLARI"
          sub={`TOPLAM ${totalCount} ORTAK KAYITLI`}
          right={
            <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={yeniOrtakAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ ORTAK
            </button>
          }/>

        {/* FİLTRE BAR */}
        <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input placeholder="AD SOYAD, FİRMA VEYA BARO ARA..." value={arama}
            onChange={e => {setArama(e.target.value.toUpperCase());setOffset(0);}}
            style={{...S.input, width:240, fontSize:11}}/>
          <select value={durumF} onChange={e => {setDurumF(e.target.value);setOffset(0);}} style={{...S.select, width:140, fontSize:11}}>
            <option value="">TÜM DURUMLAR</option>
            <option value="aktif">AKTİF</option>
            <option value="pasif">PASİF</option>
          </select>
          <select value={ilF} onChange={e => {setIlF(e.target.value);setOffset(0);}} style={{...S.select, width:150, fontSize:11}}>
            <option value="">TÜM İLLER</option>
            {iller.map(il => <option key={il} value={il}>{il}</option>)}
          </select>
          {(arama || durumF || ilF) && (
            <button style={{...S.btn,...S.btnG,fontSize:10,padding:'6px 12px'}} onClick={() => {setArama('');setDurumF('');setIlF('');setOffset(0);}}>
              <LIcon name="RotateCcw" size={12} color={C.textMuted}/> TEMİZLE
            </button>
          )}
        </div>

        {/* TABLO */}
        <div style={S.cardBody}>
          {ortaklar.length === 0 ? (
            <EmptyState icon="Briefcase" title="İŞ ORTAĞI BULUNAMADI" desc="YENİ İŞ ORTAĞI EKLEMEK İÇİN YUKARIDAKI BUTONA TIKLAYIN"/>
          ) : (
            <>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {['AD SOYAD','FİRMA','BARO','SİCİL NO','ÖDEME ORANI','İL','DURUM','İŞLEMLER'].map(h =>
                        <th key={h} style={{padding:'10px 10px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {ortaklar.map((ortak, i) => (
                      <tr key={ortak.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                        onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{padding:'10px 10px',fontWeight:600}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{width:32,height:32,borderRadius:8,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              <LIcon name="User" size={14} color={C.accent}/>
                            </div>
                            <div>
                              <div style={{fontWeight:700}}>{ortak.ad_soyad}</div>
                              {ortak.telefon && <div style={{fontSize:10,color:C.textMuted,marginTop:1}}>{ortak.telefon}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'10px 10px',color:C.textSec}}>{ortak.firma || '-'}</td>
                        <td style={{padding:'10px 10px',color:C.textSec}}>{ortak.baro || '-'}</td>
                        <td style={{padding:'10px 10px',color:C.textMuted,fontFamily:'monospace'}}>{ortak.sicil_no || '-'}</td>
                        <td style={{padding:'10px 10px'}}>
                          {ortak.odeme_orani ? (
                            <span style={{...S.badge(C.purple),fontSize:12,fontWeight:800}}>%{ortak.odeme_orani}</span>
                          ) : <span style={{color:C.textMuted}}>-</span>}
                        </td>
                        <td style={{padding:'10px 10px',color:C.textSec}}>{ortak.il || '-'}</td>
                        <td style={{padding:'10px 10px'}}>
                          <Badge text={ortak.durum === 'aktif' ? 'AKTİF' : 'PASİF'} color={ortak.durum === 'aktif' ? C.success : C.danger}/>
                        </td>
                        <td style={{padding:'10px 10px'}}>
                          <div style={{display:'flex',gap:4}}>
                            <div onClick={() => detayAc(ortak)} style={{width:28,height:28,borderRadius:6,background:`${C.cyan}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} title="DETAY VE HAREKETLER">
                              <LIcon name="Eye" size={13} color={C.cyan}/>
                            </div>
                            <div onClick={() => duzenleAc(ortak)} style={{width:28,height:28,borderRadius:6,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} title="DÜZENLE">
                              <LIcon name="Pencil" size={13} color={C.accent}/>
                            </div>
                            <div onClick={() => silOnay(ortak)} style={{width:28,height:28,borderRadius:6,background:`${C.danger}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} title="SİL">
                              <LIcon name="Trash2" size={13} color={C.danger}/>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SAYFALAMA */}
              {toplamSayfa > 1 && (
                <div style={{padding:'14px 20px',display:'flex',justifyContent:'center',alignItems:'center',gap:8,borderTop:`1px solid ${C.border}`,marginTop:8}}>
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
      </div>

      {/* ═══════════════════════════════════════════════════════
         YENİ / DÜZENLE MODAL
         ═══════════════════════════════════════════════════════ */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title={duzenle ? 'İŞ ORTAĞI DÜZENLE' : 'YENİ İŞ ORTAĞI EKLE'} width="720px">
        {hata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
          <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{hata}
        </div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="AD SOYAD *">
            <input style={S.input} value={form.ad_soyad} onChange={e => up('ad_soyad', e.target.value.toUpperCase())} placeholder="AD SOYAD"/>
          </FormGroup>
          <FormGroup label="FİRMA / HUKUK BÜROSU">
            <input style={S.input} value={form.firma} onChange={e => up('firma', e.target.value.toUpperCase())} placeholder="FİRMA ADI"/>
          </FormGroup>
          <FormGroup label="BARO">
            <input style={S.input} value={form.baro} onChange={e => up('baro', e.target.value.toUpperCase())} placeholder="İSTANBUL BAROSU"/>
          </FormGroup>
          <FormGroup label="SİCİL NO">
            <input style={S.input} value={form.sicil_no} onChange={e => up('sicil_no', e.target.value.toUpperCase())} placeholder="SİCİL NUMARASI"/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input style={S.input} value={form.telefon} onChange={e => up('telefon', e.target.value)} placeholder="05XX XXX XX XX"/>
          </FormGroup>
          <FormGroup label="E-POSTA">
            <input style={S.input} type="email" value={form.email} onChange={e => up('email', e.target.value)} placeholder="ORTAK@MAIL.COM"/>
          </FormGroup>
          <FormGroup label="İL">
            <select style={S.select} value={form.il} onChange={e => up('il', e.target.value)}>
              <option value="">İL SEÇİNİZ</option>
              {(MR.ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="VERGİ NO">
            <input style={S.input} value={form.vergi_no} onChange={e => up('vergi_no', e.target.value)} placeholder="VERGİ NUMARASI" maxLength={20}/>
          </FormGroup>
          <FormGroup label="ÖDEME ORANI (%)">
            <input style={S.input} type="number" min="0" max="100" step="0.01" value={form.odeme_orani} onChange={e => up('odeme_orani', e.target.value)} placeholder="ÖRN: 25"/>
          </FormGroup>
          <FormGroup label="KASA ATAMASI">
            <select style={S.select} value={form.kasa_id} onChange={e => up('kasa_id', e.target.value)}>
              <option value="">KASA SEÇİNİZ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>)}
            </select>
          </FormGroup>
          <FormGroup label="DURUM">
            <select style={S.select} value={form.durum} onChange={e => up('durum', e.target.value)}>
              <option value="aktif">AKTİF</option>
              <option value="pasif">PASİF</option>
            </select>
          </FormGroup>
          <FormGroup label="ADRES" full>
            <textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={form.adres} onChange={e => up('adres', e.target.value.toUpperCase())} placeholder="ADRES BİLGİSİ"/>
          </FormGroup>
          <FormGroup label="NOTLAR" full>
            <textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={form.notlar} onChange={e => up('notlar', e.target.value.toUpperCase())} placeholder="EK NOTLAR"/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : (duzenle ? 'GÜNCELLE' : 'KAYDET')}
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
         DETAY MODAL (BİLGİLER + FİNANSAL HAREKETLER)
         ═══════════════════════════════════════════════════════ */}
      <Modal open={detayModal} onClose={() => {setDetayModal(false);setSeciliOrtak(null);}} title={`İŞ ORTAĞI DETAY - ${seciliOrtak?.ad_soyad || ''}`} width="900px">
        {seciliOrtak && (
          <div>
            {/* ÜST BÖLÜM: BİLGİLER + ÖDEME ORANI */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,marginBottom:24}}>
              {/* SOL: KİŞİSEL BİLGİLER */}
              <div style={{background:C.bgHover,borderRadius:12,padding:20,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <LIcon name="User" size={16} color={C.accent}/>
                  KİŞİSEL BİLGİLER
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {[
                    {l:'AD SOYAD', v: seciliOrtak.ad_soyad, i:'User'},
                    {l:'FİRMA', v: seciliOrtak.firma, i:'Building2'},
                    {l:'BARO', v: seciliOrtak.baro, i:'Scale'},
                    {l:'SİCİL NO', v: seciliOrtak.sicil_no, i:'Hash'},
                    {l:'TELEFON', v: seciliOrtak.telefon, i:'Phone'},
                    {l:'E-POSTA', v: seciliOrtak.email, i:'Mail'},
                    {l:'İL', v: seciliOrtak.il, i:'MapPin'},
                    {l:'VERGİ NO', v: seciliOrtak.vergi_no, i:'FileText'},
                  ].map((item, idx) => (
                    <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0'}}>
                      <LIcon name={item.i} size={12} color={C.textMuted}/>
                      <div>
                        <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{item.l}</div>
                        <div style={{fontSize:12,fontWeight:600,color: item.v ? C.text : C.textMuted}}>{item.v || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {seciliOrtak.adres && (
                  <div style={{marginTop:12,padding:'8px 0',borderTop:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <LIcon name="MapPin" size={12} color={C.textMuted}/>
                      <div>
                        <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>ADRES</div>
                        <div style={{fontSize:11,color:C.textSec}}>{seciliOrtak.adres}</div>
                      </div>
                    </div>
                  </div>
                )}
                {seciliOrtak.notlar && (
                  <div style={{marginTop:8,padding:'8px 0',borderTop:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <LIcon name="FileText" size={12} color={C.textMuted}/>
                      <div>
                        <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>NOTLAR</div>
                        <div style={{fontSize:11,color:C.textSec}}>{seciliOrtak.notlar}</div>
                      </div>
                    </div>
                  </div>
                )}
                {seciliOrtak.kasa_adi && (
                  <div style={{marginTop:8,padding:'8px 0',borderTop:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <LIcon name="Wallet" size={12} color={C.textMuted}/>
                      <div>
                        <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>ATANMIŞ KASA</div>
                        <div style={{fontSize:11,color:C.textSec}}>{seciliOrtak.kasa_adi}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SAĞ: ÖDEME ORANI + FİNANSAL ÖZET */}
              <div>
                {/* ÖDEME ORANI GÖSTERGESI */}
                <div style={{background:`${C.purple}11`,borderRadius:12,padding:24,border:`1px solid ${C.purple}33`,textAlign:'center',marginBottom:16}}>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:600,letterSpacing:1,marginBottom:8}}>ÖDEME ORANI</div>
                  <div style={{fontSize:48,fontWeight:900,color:C.purple,letterSpacing:-1}}>
                    %{seciliOrtak.odeme_orani != null ? seciliOrtak.odeme_orani : '0'}
                  </div>
                  <div style={{marginTop:8}}>
                    <Badge text={seciliOrtak.durum === 'aktif' ? 'AKTİF' : 'PASİF'} color={seciliOrtak.durum === 'aktif' ? C.success : C.danger}/>
                  </div>
                </div>

                {/* BAKİYE ÖZET KARTLARI */}
                <div style={{display:'grid',gap:8}}>
                  <div style={{background:`${C.danger}11`,borderRadius:8,padding:12,border:`1px solid ${C.danger}33`}}>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TOPLAM ÖDEME</div>
                    <div style={{fontSize:18,fontWeight:800,color:C.danger}}>{fmt(hareketOzet.odeme)}</div>
                  </div>
                  <div style={{background:`${C.success}11`,borderRadius:8,padding:12,border:`1px solid ${C.success}33`}}>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TOPLAM TAHSİLAT</div>
                    <div style={{fontSize:18,fontWeight:800,color:C.success}}>{fmt(hareketOzet.tahsilat)}</div>
                  </div>
                  <div style={{background:`${C.warning}11`,borderRadius:8,padding:12,border:`1px solid ${C.warning}33`}}>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TOPLAM MASRAF</div>
                    <div style={{fontSize:18,fontWeight:800,color:C.warning}}>{fmt(hareketOzet.masraf)}</div>
                  </div>
                  <div style={{background: hareketOzet.bakiye >= 0 ? `${C.accent}11` : `${C.danger}11`,borderRadius:8,padding:12,border:`1px solid ${hareketOzet.bakiye >= 0 ? C.accent + '33' : C.danger + '33'}`}}>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>BAKİYE</div>
                    <div style={{fontSize:18,fontWeight:800,color: hareketOzet.bakiye >= 0 ? C.accent : C.danger}}>{fmt(hareketOzet.bakiye)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* FİNANSAL HAREKET TABLOSU */}
            <div style={{background:C.bgHover,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <LIcon name="ArrowLeftRight" size={14} color={C.accent}/>
                  <span style={{fontSize:13,fontWeight:700}}>FİNANSAL HAREKETLER</span>
                  <Badge text={`${hareketler.length} KAYIT`} color={C.accent}/>
                </div>
                <button style={{...S.btn,...S.btnS,fontSize:10,padding:'6px 14px'}} onClick={hareketEkleAc}>
                  <LIcon name="Plus" size={12} color="#fff"/> HAREKET EKLE
                </button>
              </div>
              {hareketLoading ? <Loading/> : hareketler.length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:C.textMuted,fontSize:12}}>
                  <LIcon name="ArrowLeftRight" size={32} color={C.textMuted} style={{opacity:0.3,marginBottom:12}}/>
                  <div>HENÜZ FİNANSAL HAREKET KAYDI BULUNMAMAKTADIR</div>
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:`${C.accent}08`}}>
                        {['TARİH','TÜR','TUTAR','DOSYA NO','AÇIKLAMA'].map(h =>
                          <th key={h} style={{padding:'8px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {hareketler.map((h, i) => {
                        const tutar = parseFloat(h.tutar) || 0;
                        return (
                          <tr key={h.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.bgCard}`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{padding:'8px 12px',color:C.textSec}}>{h.tarih || h.created_at?.split(' ')[0] || '-'}</td>
                            <td style={{padding:'8px 12px'}}>
                              <div style={{display:'flex',alignItems:'center',gap:4}}>
                                <LIcon name={hareketTurIcon(h.tur)} size={12} color={hareketTurRenk(h.tur)}/>
                                <Badge text={hareketTurLabel(h.tur)} color={hareketTurRenk(h.tur)}/>
                              </div>
                            </td>
                            <td style={{padding:'8px 12px',fontWeight:700,color: h.tur === 'tahsilat' ? C.success : C.danger}}>
                              {h.tur === 'tahsilat' ? '+' : '-'}{fmt(tutar)}
                            </td>
                            <td style={{padding:'8px 12px',color:C.accent,fontWeight:600}}>{h.dosya_id ? `#${h.dosya_id}` : '-'}</td>
                            <td style={{padding:'8px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.aciklama || '-'}</td>
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
      </Modal>

      {/* ═══════════════════════════════════════════════════════
         HAREKET EKLEME MODAL
         ═══════════════════════════════════════════════════════ */}
      <Modal open={hareketModalAcik} onClose={() => setHareketModalAcik(false)} title="YENİ FİNANSAL HAREKET EKLE" width="520px">
        {hareketHata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
          <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{hareketHata}
        </div>}

        {/* ORTAK BİLGİ BANNER */}
        {seciliOrtak && (
          <div style={{padding:12,background:`${C.accent}11`,borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',gap:10,border:`1px solid ${C.accent}22`}}>
            <LIcon name="User" size={16} color={C.accent}/>
            <div>
              <div style={{fontSize:12,fontWeight:700}}>{seciliOrtak.ad_soyad}</div>
              <div style={{fontSize:10,color:C.textMuted}}>{seciliOrtak.firma || '-'} | ÖDEME ORANI: %{seciliOrtak.odeme_orani || 0}</div>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="HAREKET TÜRÜ *">
            <select style={S.select} value={hareketForm.tur} onChange={e => hUp('tur', e.target.value)}>
              <option value="odeme">ÖDEME</option>
              <option value="tahsilat">TAHSİLAT</option>
              <option value="masraf">MASRAF</option>
            </select>
          </FormGroup>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:13,fontWeight:700}}>&#8378;</span>
              <input style={{...S.input,paddingLeft:26,fontWeight:700}} value={hareketForm.tutar}
                onChange={e => hUp('tutar', fmtInput(e.target.value))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="TARİH *">
            <input style={S.input} type="date" value={hareketForm.tarih} onChange={e => hUp('tarih', e.target.value)}/>
          </FormGroup>
          <FormGroup label="DOSYA NO">
            <input style={S.input} value={hareketForm.dosya_id} onChange={e => hUp('dosya_id', e.target.value)} placeholder="DOSYA ID (OPSİYONEL)" type="number"/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={hareketForm.aciklama}
              onChange={e => hUp('aciklama', e.target.value.toUpperCase())} placeholder="HAREKET AÇIKLAMASI"/>
          </FormGroup>
        </div>
        <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setHareketModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={hareketKaydet} disabled={hareketKayitLoading}>
            <LIcon name="Plus" size={14} color="#fff"/> {hareketKayitLoading ? 'KAYDEDİLİYOR...' : 'HAREKET EKLE'}
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
   SEKME 2 – İŞ PAYDAŞLARI (ACENTELER, GALERİLER, TAMİRCİLER)
   ═══════════════════════════════════════════════════════════ */
const IsPaydaslari = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, fmt, fmtInput, parseNum} = MR;

  /* ─── TÜR EŞLEŞTİRME ─── */
  const turMap = {
    'sigorta_acentesi': {label:'SİGORTA ACENTESİ', renk: C.accent, icon:'Shield'},
    'oto_galeri':       {label:'OTO GALERİ',        renk: C.purple, icon:'Car'},
    'oto_kiralama':     {label:'OTO KİRALAMA',      renk: C.cyan,   icon:'Key'},
    'tamirci':          {label:'TAMİRCİ',           renk: C.warning, icon:'Wrench'},
    'diger':            {label:'DİĞER',             renk: C.textSec, icon:'MoreHorizontal'}
  };
  const turLabel = (tur) => turMap[tur]?.label || (tur || '').toUpperCase() || '-';
  const turRenk = (tur) => turMap[tur]?.renk || C.textSec;
  const turIcon = (tur) => turMap[tur]?.icon || 'Building2';

  /* ─── STATE ─── */
  const [paydaslar, setPaydaslar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [arama, setArama] = useState('');
  const [durumF, setDurumF] = useState('');
  const [turF, setTurF] = useState('');

  /* MODAL STATE */
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');

  /* KOMİSYON TAKİP MODAL STATE */
  const [komisyonModal, setKomisyonModal] = useState(false);
  const [seciliPaydas, setSeciliPaydas] = useState(null);
  const [komisyonlar, setKomisyonlar] = useState([]);
  const [komisyonLoading, setKomisyonLoading] = useState(false);

  /* KOMİSYON EKLEME MODAL STATE */
  const [komisyonEkleModal, setKomisyonEkleModal] = useState(false);
  const [komisyonKayitLoading, setKomisyonKayitLoading] = useState(false);
  const [komisyonHata, setKomisyonHata] = useState('');

  /* CONFIRM */
  const [confirm, setConfirm] = useState({open:false, msg:'', cb:null});

  /* SAYFALAMA */
  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  /* ─── FORM ─── */
  const bosForm = {ad:'', tur:'sigorta_acentesi', yetkili:'', telefon:'', email:'', adres:'', il:'', komisyon_orani:'', durum:'aktif', notlar:''};
  const [form, setForm] = useState({...bosForm});
  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  /* KOMİSYON FORMU */
  const bosKomisyonForm = {tutar:'', aciklama:'', tarih:'', dosya_id:'', durum:'bekliyor'};
  const [komisyonForm, setKomisyonForm] = useState({...bosKomisyonForm});
  const kUp = (k, v) => setKomisyonForm(p => ({...p, [k]: v}));

  /* ─── VERİ YÜKLE ─── */
  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {limit, offset};
    if (arama) p.q = arama;
    if (durumF) p.durum = durumF;
    if (turF) p.tur = turF;
    const r = await api.paydasList(p);
    if (r?.success) {
      setPaydaslar(r.data?.items || r.data || []);
      setTotalCount(r.data?.pagination?.total || r.data?.toplam || (r.data?.items || r.data || []).length);
    }
    setLoading(false);
  }, [offset, arama, durumF, turF]);

  useEffect(() => { yukle(); }, [yukle]);

  /* ─── İSTATİSTİKLER ─── */
  const istatistik = useMemo(() => {
    const toplam = totalCount || paydaslar.length;
    const aktif = paydaslar.filter(p => p.durum === 'aktif').length;
    const bekleyenKomisyon = paydaslar.reduce((t, p) => t + (parseFloat(p.bekleyen_komisyon) || 0), 0);
    const odenenKomisyon = paydaslar.reduce((t, p) => t + (parseFloat(p.odenen_komisyon) || 0), 0);
    return {toplam, aktif, bekleyenKomisyon, odenenKomisyon};
  }, [paydaslar, totalCount]);

  /* ─── YENİ PAYDAŞ MODAL AÇ ─── */
  const yeniPaydasAc = () => {
    setDuzenle(null);
    setForm({...bosForm});
    setHata('');
    setModalAcik(true);
  };

  /* DÜZENLE MODAL AÇ */
  const duzenleAc = (paydas) => {
    setDuzenle(paydas);
    setForm({
      ad: paydas.ad || '',
      tur: paydas.tur || 'sigorta_acentesi',
      yetkili: paydas.yetkili || '',
      telefon: paydas.telefon || '',
      email: paydas.email || '',
      adres: paydas.adres || '',
      il: paydas.il || '',
      komisyon_orani: paydas.komisyon_orani != null ? String(paydas.komisyon_orani) : '',
      durum: paydas.durum || 'aktif',
      notlar: paydas.notlar || ''
    });
    setHata('');
    setModalAcik(true);
  };

  /* ─── KAYDET ─── */
  const kaydet = async () => {
    if (!form.ad.trim()) { setHata('PAYDAŞ ADI ZORUNLUDUR'); return; }
    if (!form.tur) { setHata('TÜR SEÇİMİ ZORUNLUDUR'); return; }
    setKayitLoading(true); setHata('');

    const gonder = {
      ...form,
      komisyon_orani: form.komisyon_orani ? parseFloat(form.komisyon_orani) : 0
    };

    let r;
    if (duzenle) {
      r = await api.paydasUpdate({id: duzenle.id, ...gonder});
    } else {
      r = await api.paydasCreate(gonder);
    }

    if (r?.success) {
      setModalAcik(false);
      yukle();
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* ─── SİL ─── */
  const silOnay = (paydas) => {
    setConfirm({
      open: true,
      msg: `"${paydas.ad}" İŞ PAYDAŞINI SİLMEK İSTİYOR MUSUNUZ? BU İŞLEM GERİ ALINAMAZ.`,
      cb: async () => {
        setConfirm({open:false, msg:'', cb:null});
        const r = await api.paydasDelete(paydas.id);
        if (r?.success) yukle();
      }
    });
  };

  /* ─── KOMİSYON TAKİP MODAL AÇ ─── */
  const komisyonAc = async (paydas) => {
    setSeciliPaydas(paydas);
    setKomisyonModal(true);
    setKomisyonlar([]);
    setKomisyonLoading(true);
    const r = await api.paydasKomisyonList({paydas_id: paydas.id});
    if (r?.success) setKomisyonlar(r.data?.items || r.data || []);
    setKomisyonLoading(false);
  };

  /* KOMİSYON HESAPLAMA */
  const komisyonOzet = useMemo(() => {
    const toplam = komisyonlar.reduce((t, k) => t + (parseFloat(k.tutar) || 0), 0);
    const bekliyor = komisyonlar.filter(k => k.durum === 'bekliyor').reduce((t, k) => t + (parseFloat(k.tutar) || 0), 0);
    const odendi = komisyonlar.filter(k => k.durum === 'odendi').reduce((t, k) => t + (parseFloat(k.tutar) || 0), 0);
    return {toplam, bekliyor, odendi};
  }, [komisyonlar]);

  /* ─── KOMİSYON EKLEME MODAL AÇ ─── */
  const komisyonEkleAc = () => {
    setKomisyonForm({...bosKomisyonForm, tarih: new Date().toISOString().split('T')[0]});
    setKomisyonHata('');
    setKomisyonEkleModal(true);
  };

  /* KOMİSYON KAYDET */
  const komisyonKaydet = async () => {
    const tutarNum = parseNum(komisyonForm.tutar);
    if (tutarNum <= 0) { setKomisyonHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    if (!komisyonForm.tarih) { setKomisyonHata('TARİH SEÇİNİZ'); return; }
    setKomisyonKayitLoading(true); setKomisyonHata('');

    const r = await api.paydasKomisyonEkle({
      paydas_id: seciliPaydas.id,
      tutar: tutarNum,
      aciklama: komisyonForm.aciklama,
      tarih: komisyonForm.tarih,
      dosya_id: komisyonForm.dosya_id ? parseInt(komisyonForm.dosya_id) : null,
      durum: komisyonForm.durum
    });

    if (r?.success) {
      setKomisyonEkleModal(false);
      /* KOMİSYONLARI YENİDEN YÜKLE */
      const r2 = await api.paydasKomisyonList({paydas_id: seciliPaydas.id});
      if (r2?.success) setKomisyonlar(r2.data?.items || r2.data || []);
      yukle();
    } else {
      setKomisyonHata(r?.error || 'KOMİSYON KAYIT HATASI');
    }
    setKomisyonKayitLoading(false);
  };

  /* SAYFALAMA */
  const toplamSayfa = Math.ceil(totalCount / limit);
  const mevcutSayfa = Math.floor(offset / limit) + 1;

  if (loading) return <Loading/>;

  return (
    <div>
      {/* ─── İSTATİSTİK KARTLARI ─── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="Network" label="TOPLAM PAYDAŞ" value={istatistik.toplam} color={C.accent}/>
        <StatCard icon="UserCheck" label="AKTİF" value={istatistik.aktif} color={C.success}/>
        <StatCard icon="Clock" label="BEKLEYEN KOMİSYON" value={fmt(istatistik.bekleyenKomisyon)} color={C.warning}/>
        <StatCard icon="Check" label="ÖDENEN KOMİSYON" value={fmt(istatistik.odenenKomisyon)} color={C.purple}/>
      </div>

      {/* ─── ANA TABLO ─── */}
      <div style={S.card}>
        <SectionTitle icon="Network" title="İŞ PAYDAŞLARI"
          sub={`TOPLAM ${totalCount} PAYDAŞ KAYITLI`}
          right={
            <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={yeniPaydasAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ PAYDAŞ
            </button>
          }/>

        {/* FİLTRE BAR */}
        <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input placeholder="AD, YETKİLİ VEYA İL ARA..." value={arama}
            onChange={e => {setArama(e.target.value.toUpperCase());setOffset(0);}}
            style={{...S.input, width:240, fontSize:11}}/>
          <select value={turF} onChange={e => {setTurF(e.target.value);setOffset(0);}} style={{...S.select, width:180, fontSize:11}}>
            <option value="">TÜM TÜRLER</option>
            <option value="sigorta_acentesi">SİGORTA ACENTESİ</option>
            <option value="oto_galeri">OTO GALERİ</option>
            <option value="oto_kiralama">OTO KİRALAMA</option>
            <option value="tamirci">TAMİRCİ</option>
            <option value="diger">DİĞER</option>
          </select>
          <select value={durumF} onChange={e => {setDurumF(e.target.value);setOffset(0);}} style={{...S.select, width:140, fontSize:11}}>
            <option value="">TÜM DURUMLAR</option>
            <option value="aktif">AKTİF</option>
            <option value="pasif">PASİF</option>
          </select>
          {(arama || turF || durumF) && (
            <button style={{...S.btn,...S.btnG,fontSize:10,padding:'6px 12px'}} onClick={() => {setArama('');setTurF('');setDurumF('');setOffset(0);}}>
              <LIcon name="RotateCcw" size={12} color={C.textMuted}/> TEMİZLE
            </button>
          )}
        </div>

        {/* TABLO */}
        <div style={S.cardBody}>
          {paydaslar.length === 0 ? (
            <EmptyState icon="Network" title="İŞ PAYDAŞI BULUNAMADI" desc="YENİ İŞ PAYDAŞI EKLEMEK İÇİN YUKARIDAKI BUTONA TIKLAYIN"/>
          ) : (
            <>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {['AD','TÜR','YETKİLİ','TELEFON','İL','KOMİSYON ORANI','DURUM','İŞLEMLER'].map(h =>
                        <th key={h} style={{padding:'10px 10px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paydaslar.map((paydas, i) => (
                      <tr key={paydas.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                        onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{padding:'10px 10px',fontWeight:600}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{width:32,height:32,borderRadius:8,background:`${turRenk(paydas.tur)}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              <LIcon name={turIcon(paydas.tur)} size={14} color={turRenk(paydas.tur)}/>
                            </div>
                            <div>
                              <div style={{fontWeight:700}}>{paydas.ad}</div>
                              {paydas.email && <div style={{fontSize:10,color:C.textMuted,marginTop:1}}>{paydas.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{padding:'10px 10px'}}><Badge text={turLabel(paydas.tur)} color={turRenk(paydas.tur)}/></td>
                        <td style={{padding:'10px 10px',color:C.textSec}}>{paydas.yetkili || '-'}</td>
                        <td style={{padding:'10px 10px',color:C.textSec}}>{paydas.telefon || '-'}</td>
                        <td style={{padding:'10px 10px',color:C.textSec}}>{paydas.il || '-'}</td>
                        <td style={{padding:'10px 10px'}}>
                          {paydas.komisyon_orani ? (
                            <span style={{...S.badge(C.gold),fontSize:11,fontWeight:700}}>%{paydas.komisyon_orani}</span>
                          ) : <span style={{color:C.textMuted}}>-</span>}
                        </td>
                        <td style={{padding:'10px 10px'}}>
                          <Badge text={paydas.durum === 'aktif' ? 'AKTİF' : 'PASİF'} color={paydas.durum === 'aktif' ? C.success : C.danger}/>
                        </td>
                        <td style={{padding:'10px 10px'}}>
                          <div style={{display:'flex',gap:4}}>
                            <div onClick={() => komisyonAc(paydas)} style={{width:28,height:28,borderRadius:6,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} title="KOMİSYON TAKİP">
                              <LIcon name="Banknote" size={13} color={C.gold}/>
                            </div>
                            <div onClick={() => duzenleAc(paydas)} style={{width:28,height:28,borderRadius:6,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} title="DÜZENLE">
                              <LIcon name="Pencil" size={13} color={C.accent}/>
                            </div>
                            <div onClick={() => silOnay(paydas)} style={{width:28,height:28,borderRadius:6,background:`${C.danger}22`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}} title="SİL">
                              <LIcon name="Trash2" size={13} color={C.danger}/>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SAYFALAMA */}
              {toplamSayfa > 1 && (
                <div style={{padding:'14px 20px',display:'flex',justifyContent:'center',alignItems:'center',gap:8,borderTop:`1px solid ${C.border}`,marginTop:8}}>
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
      </div>

      {/* ═══════════════════════════════════════════════════════
         YENİ / DÜZENLE MODAL
         ═══════════════════════════════════════════════════════ */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title={duzenle ? 'İŞ PAYDAŞI DÜZENLE' : 'YENİ İŞ PAYDAŞI EKLE'} width="680px">
        {hata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
          <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{hata}
        </div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="PAYDAŞ ADI *">
            <input style={S.input} value={form.ad} onChange={e => up('ad', e.target.value.toUpperCase())} placeholder="PAYDAŞ / FİRMA ADI"/>
          </FormGroup>
          <FormGroup label="TÜR *">
            <select style={S.select} value={form.tur} onChange={e => up('tur', e.target.value)}>
              <option value="sigorta_acentesi">SİGORTA ACENTESİ</option>
              <option value="oto_galeri">OTO GALERİ</option>
              <option value="oto_kiralama">OTO KİRALAMA</option>
              <option value="tamirci">TAMİRCİ</option>
              <option value="diger">DİĞER</option>
            </select>
          </FormGroup>
          <FormGroup label="YETKİLİ KİŞİ">
            <input style={S.input} value={form.yetkili} onChange={e => up('yetkili', e.target.value.toUpperCase())} placeholder="YETKİLİ AD SOYAD"/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input style={S.input} value={form.telefon} onChange={e => up('telefon', e.target.value)} placeholder="05XX XXX XX XX"/>
          </FormGroup>
          <FormGroup label="E-POSTA">
            <input style={S.input} type="email" value={form.email} onChange={e => up('email', e.target.value)} placeholder="FIRMA@MAIL.COM"/>
          </FormGroup>
          <FormGroup label="İL">
            <select style={S.select} value={form.il} onChange={e => up('il', e.target.value)}>
              <option value="">İL SEÇİNİZ</option>
              {(MR.ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="KOMİSYON ORANI (%)">
            <input style={S.input} type="number" min="0" max="100" step="0.01" value={form.komisyon_orani} onChange={e => up('komisyon_orani', e.target.value)} placeholder="ÖRN: 10"/>
          </FormGroup>
          <FormGroup label="DURUM">
            <select style={S.select} value={form.durum} onChange={e => up('durum', e.target.value)}>
              <option value="aktif">AKTİF</option>
              <option value="pasif">PASİF</option>
            </select>
          </FormGroup>
          <FormGroup label="ADRES" full>
            <textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={form.adres} onChange={e => up('adres', e.target.value.toUpperCase())} placeholder="ADRES BİLGİSİ"/>
          </FormGroup>
          <FormGroup label="NOTLAR" full>
            <textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={form.notlar} onChange={e => up('notlar', e.target.value.toUpperCase())} placeholder="EK NOTLAR"/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : (duzenle ? 'GÜNCELLE' : 'KAYDET')}
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
         KOMİSYON TAKİP MODAL (DETAY + KOMİSYON LİSTESİ)
         ═══════════════════════════════════════════════════════ */}
      <Modal open={komisyonModal} onClose={() => {setKomisyonModal(false);setSeciliPaydas(null);}} title={`KOMİSYON TAKİP - ${seciliPaydas?.ad || ''}`} width="900px">
        {seciliPaydas && (
          <div>
            {/* ÜST BÖLÜM: BİLGİLER + KOMİSYON ORANI */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,marginBottom:24}}>
              {/* SOL: FİRMA BİLGİLERİ */}
              <div style={{background:C.bgHover,borderRadius:12,padding:20,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                  <LIcon name={turIcon(seciliPaydas.tur)} size={16} color={turRenk(seciliPaydas.tur)}/>
                  PAYDAŞ BİLGİLERİ
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {[
                    {l:'PAYDAŞ ADI', v: seciliPaydas.ad, i:'Building2'},
                    {l:'TÜR', v: turLabel(seciliPaydas.tur), i:'Tag'},
                    {l:'YETKİLİ', v: seciliPaydas.yetkili, i:'User'},
                    {l:'TELEFON', v: seciliPaydas.telefon, i:'Phone'},
                    {l:'E-POSTA', v: seciliPaydas.email, i:'Mail'},
                    {l:'İL', v: seciliPaydas.il, i:'MapPin'},
                  ].map((item, idx) => (
                    <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0'}}>
                      <LIcon name={item.i} size={12} color={C.textMuted}/>
                      <div>
                        <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>{item.l}</div>
                        <div style={{fontSize:12,fontWeight:600,color: item.v ? C.text : C.textMuted}}>{item.v || '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {seciliPaydas.adres && (
                  <div style={{marginTop:12,padding:'8px 0',borderTop:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <LIcon name="MapPin" size={12} color={C.textMuted}/>
                      <div>
                        <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>ADRES</div>
                        <div style={{fontSize:11,color:C.textSec}}>{seciliPaydas.adres}</div>
                      </div>
                    </div>
                  </div>
                )}
                {seciliPaydas.notlar && (
                  <div style={{marginTop:8,padding:'8px 0',borderTop:`1px solid ${C.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <LIcon name="FileText" size={12} color={C.textMuted}/>
                      <div>
                        <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>NOTLAR</div>
                        <div style={{fontSize:11,color:C.textSec}}>{seciliPaydas.notlar}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SAĞ: KOMİSYON ORANI + ÖZET */}
              <div>
                {/* TÜR VE KOMİSYON ORANI GÖSTERGESI */}
                <div style={{background:`${turRenk(seciliPaydas.tur)}11`,borderRadius:12,padding:20,border:`1px solid ${turRenk(seciliPaydas.tur)}33`,textAlign:'center',marginBottom:16}}>
                  <Badge text={turLabel(seciliPaydas.tur)} color={turRenk(seciliPaydas.tur)}/>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:600,marginTop:12,letterSpacing:1}}>KOMİSYON ORANI</div>
                  <div style={{fontSize:42,fontWeight:900,color:turRenk(seciliPaydas.tur),letterSpacing:-1}}>
                    %{seciliPaydas.komisyon_orani != null ? seciliPaydas.komisyon_orani : '0'}
                  </div>
                  <div style={{marginTop:8}}>
                    <Badge text={seciliPaydas.durum === 'aktif' ? 'AKTİF' : 'PASİF'} color={seciliPaydas.durum === 'aktif' ? C.success : C.danger}/>
                  </div>
                </div>

                {/* KOMİSYON ÖZET KARTLARI */}
                <div style={{display:'grid',gap:8}}>
                  <div style={{background:`${C.accent}11`,borderRadius:8,padding:12,border:`1px solid ${C.accent}33`}}>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TOPLAM KOMİSYON</div>
                    <div style={{fontSize:18,fontWeight:800,color:C.accent}}>{fmt(komisyonOzet.toplam)}</div>
                  </div>
                  <div style={{background:`${C.warning}11`,borderRadius:8,padding:12,border:`1px solid ${C.warning}33`}}>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>BEKLEYEN</div>
                    <div style={{fontSize:18,fontWeight:800,color:C.warning}}>{fmt(komisyonOzet.bekliyor)}</div>
                  </div>
                  <div style={{background:`${C.success}11`,borderRadius:8,padding:12,border:`1px solid ${C.success}33`}}>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600}}>ÖDENEN</div>
                    <div style={{fontSize:18,fontWeight:800,color:C.success}}>{fmt(komisyonOzet.odendi)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* KOMİSYON TAKİP TABLOSU */}
            <div style={{background:C.bgHover,borderRadius:12,border:`1px solid ${C.border}`,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <LIcon name="Receipt" size={14} color={C.gold}/>
                  <span style={{fontSize:13,fontWeight:700}}>KOMİSYON KAYITLARI</span>
                  <Badge text={`${komisyonlar.length} KAYIT`} color={C.gold}/>
                </div>
                <button style={{...S.btn,...S.btnW,fontSize:10,padding:'6px 14px'}} onClick={komisyonEkleAc}>
                  <LIcon name="Plus" size={12} color="#000"/> KOMİSYON EKLE
                </button>
              </div>
              {komisyonLoading ? <Loading/> : komisyonlar.length === 0 ? (
                <div style={{padding:40,textAlign:'center',color:C.textMuted,fontSize:12}}>
                  <LIcon name="Receipt" size={32} color={C.textMuted} style={{opacity:0.3,marginBottom:12}}/>
                  <div>HENÜZ KOMİSYON KAYDI BULUNMAMAKTADIR</div>
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:`${C.gold}08`}}>
                        {['TARİH','TUTAR','DURUM','DOSYA NO','AÇIKLAMA'].map(h =>
                          <th key={h} style={{padding:'8px 12px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:10,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {komisyonlar.map((k, i) => {
                        const tutar = parseFloat(k.tutar) || 0;
                        return (
                          <tr key={k.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.bgCard}`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{padding:'8px 12px',color:C.textSec}}>{k.tarih || k.created_at?.split(' ')[0] || '-'}</td>
                            <td style={{padding:'8px 12px',fontWeight:700,color:C.gold}}>{fmt(tutar)}</td>
                            <td style={{padding:'8px 12px'}}>
                              <Badge text={k.durum === 'odendi' ? 'ÖDENDİ' : 'BEKLİYOR'} color={k.durum === 'odendi' ? C.success : C.warning}/>
                            </td>
                            <td style={{padding:'8px 12px',color:C.accent,fontWeight:600}}>{k.dosya_id ? `#${k.dosya_id}` : '-'}</td>
                            <td style={{padding:'8px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{k.aciklama || '-'}</td>
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
      </Modal>

      {/* ═══════════════════════════════════════════════════════
         KOMİSYON EKLEME MODAL
         ═══════════════════════════════════════════════════════ */}
      <Modal open={komisyonEkleModal} onClose={() => setKomisyonEkleModal(false)} title="YENİ KOMİSYON KAYDI" width="520px">
        {komisyonHata && <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
          <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{komisyonHata}
        </div>}

        {/* PAYDAŞ BİLGİ BANNER */}
        {seciliPaydas && (
          <div style={{padding:12,background:`${turRenk(seciliPaydas.tur)}11`,borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',gap:10,border:`1px solid ${turRenk(seciliPaydas.tur)}22`}}>
            <LIcon name={turIcon(seciliPaydas.tur)} size={16} color={turRenk(seciliPaydas.tur)}/>
            <div>
              <div style={{fontSize:12,fontWeight:700}}>{seciliPaydas.ad}</div>
              <div style={{fontSize:10,color:C.textMuted}}>{turLabel(seciliPaydas.tur)} | KOMİSYON ORANI: %{seciliPaydas.komisyon_orani || 0}</div>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:13,fontWeight:700}}>&#8378;</span>
              <input style={{...S.input,paddingLeft:26,fontWeight:700}} value={komisyonForm.tutar}
                onChange={e => kUp('tutar', fmtInput(e.target.value))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="TARİH *">
            <input style={S.input} type="date" value={komisyonForm.tarih} onChange={e => kUp('tarih', e.target.value)}/>
          </FormGroup>
          <FormGroup label="DURUM">
            <select style={S.select} value={komisyonForm.durum} onChange={e => kUp('durum', e.target.value)}>
              <option value="bekliyor">BEKLİYOR</option>
              <option value="odendi">ÖDENDİ</option>
            </select>
          </FormGroup>
          <FormGroup label="DOSYA NO">
            <input style={S.input} value={komisyonForm.dosya_id} onChange={e => kUp('dosya_id', e.target.value)} placeholder="DOSYA ID (OPSİYONEL)" type="number"/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:60,resize:'vertical'}} value={komisyonForm.aciklama}
              onChange={e => kUp('aciklama', e.target.value.toUpperCase())} placeholder="KOMİSYON AÇIKLAMASI"/>
          </FormGroup>
        </div>
        <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setKomisyonEkleModal(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnW}} onClick={komisyonKaydet} disabled={komisyonKayitLoading}>
            <LIcon name="Plus" size={14} color="#000"/> {komisyonKayitLoading ? 'KAYDEDİLİYOR...' : 'KOMİSYON EKLE'}
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
