const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback} = React;

MR.AjandaPage = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, Confirm, api} = MR;

  const [gorevler, setGorevler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gorunum, setGorunum] = useState('takvim');
  const [ay, setAy] = useState(new Date().getMonth());
  const [yil, setYil] = useState(new Date().getFullYear());
  const [secilenGun, setSecilenGun] = useState(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenGorev, setDuzenGorev] = useState(null);
  const [silOnay, setSilOnay] = useState(null);
  const [oncelikF, setOncelikF] = useState('');
  const [durumF, setDurumF] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [secililer, setSecililer] = useState([]);
  const [topluSilConfirm, setTopluSilConfirm] = useState(false);
  const [topluSilLoading, setTopluSilLoading] = useState(false);

  const isAdmin = user?.rol === 'admin';

  const bosForm = {
    baslik: '', aciklama: '', tarih: '', bitis_tarihi: '', hatirlatma: '',
    oncelik: 'normal', renk: C.accent, dosya_id: ''
  };
  const [form, setForm] = useState({...bosForm});

  const oncelikRenk = (o) => {
    if (o === 'dusuk') return C.textMuted;
    if (o === 'normal') return C.accent;
    if (o === 'yuksek') return C.warning;
    if (o === 'acil') return C.danger;
    return C.accent;
  };

  const oncelikLabel = (o) => {
    if (o === 'dusuk') return 'DÜŞÜK';
    if (o === 'normal') return 'NORMAL';
    if (o === 'yuksek') return 'YÜKSEK';
    if (o === 'acil') return 'ACİL';
    return 'NORMAL';
  };

  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {limit: 500};
    if (gorunum === 'takvim') {
      p.ay = yil + '-' + String(ay + 1).padStart(2, '0');
    }
    if (oncelikF) p.oncelik = oncelikF;
    if (durumF === 'tamamlanmamis') p.tamamlandi = 0;
    if (durumF === 'tamamlanmis') p.tamamlandi = 1;
    const r = await api.ajandaList(p);
    if (r?.success) {
      setGorevler(r.data?.items || r.data || []);
    }
    setLoading(false);
  }, [ay, yil, gorunum, oncelikF, durumF]);

  useEffect(() => { yukle(); }, [yukle]);

  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  const modalAc = (gorev) => {
    if (gorev) {
      setDuzenGorev(gorev);
      setForm({
        baslik: gorev.baslik || '',
        aciklama: gorev.aciklama || '',
        tarih: gorev.tarih || '',
        bitis_tarihi: gorev.bitis_tarihi || '',
        hatirlatma: gorev.hatirlatma || '',
        oncelik: gorev.oncelik || 'normal',
        renk: gorev.renk || C.accent,
        dosya_id: gorev.dosya_id || ''
      });
    } else {
      setDuzenGorev(null);
      const varsayilanTarih = secilenGun
        ? yil + '-' + String(ay + 1).padStart(2, '0') + '-' + String(secilenGun).padStart(2, '0') + 'T09:00'
        : '';
      setForm({...bosForm, tarih: varsayilanTarih});
    }
    setError('');
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (!form.baslik.trim()) { setError('BAŞLIK ZORUNLUDUR'); return; }
    if (!form.tarih) { setError('TARİH ZORUNLUDUR'); return; }
    setSaving(true); setError('');
    const veri = {...form};
    if (!veri.dosya_id) delete veri.dosya_id;
    if (!veri.bitis_tarihi) delete veri.bitis_tarihi;
    if (!veri.hatirlatma) delete veri.hatirlatma;
    if (!veri.aciklama) delete veri.aciklama;

    let r;
    if (duzenGorev) {
      r = await api.ajandaUpdate({id: duzenGorev.id, ...veri});
    } else {
      r = await api.ajandaCreate(veri);
    }
    if (r?.success) {
      setModalAcik(false);
      setDuzenGorev(null);
      setForm({...bosForm});
      yukle();
    } else {
      setError(r?.error || 'KAYIT SIRASINDA HATA OLUŞTU');
    }
    setSaving(false);
  };

  const tamamlaToggle = async (gorev) => {
    const r = await api.ajandaUpdate({id: gorev.id, tamamlandi: gorev.tamamlandi ? 0 : 1});
    if (r?.success) yukle();
  };

  const sil = async () => {
    if (!silOnay) return;
    const r = await api.ajandaDelete(silOnay.id);
    if (r?.success) {
      setSilOnay(null);
      yukle();
    }
  };

  const toggleSecim = (id) => {
    setSecililer(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const tumunuSec = (liste) => {
    const ids = liste.map(g => g.id);
    const hepsiSecili = ids.length > 0 && ids.every(id => secililer.includes(id));
    if (hepsiSecili) {
      setSecililer(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSecililer(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const topluSil = async () => {
    if (secililer.length === 0) return;
    setTopluSilLoading(true);
    const r = await api.ajandaBulkDelete(secililer);
    if (r?.success) {
      setSecililer([]);
      setTopluSilConfirm(false);
      yukle();
    }
    setTopluSilLoading(false);
  };

  // ═══ İSTATİSTİKLER ═══
  const toplam = gorevler.length;
  const tamamlanan = gorevler.filter(g => g.tamamlandi).length;
  const bekleyen = toplam - tamamlanan;
  const acil = gorevler.filter(g => g.oncelik === 'acil' && !g.tamamlandi).length;

  // ═══ TAKVİM HESAPLAMALARI ═══
  const ayIsimleri = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
  const gunIsimleri = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];

  const ilkGun = new Date(yil, ay, 1);
  const sonGun = new Date(yil, ay + 1, 0);
  const gunSayisi = sonGun.getDate();
  let baslangicGunu = ilkGun.getDay() - 1;
  if (baslangicGunu < 0) baslangicGunu = 6;

  const bugun = new Date();
  const bugunStr = bugun.getFullYear() + '-' + String(bugun.getMonth() + 1).padStart(2, '0') + '-' + String(bugun.getDate()).padStart(2, '0');

  const gunGorevleri = (gun) => {
    const tarihStr = yil + '-' + String(ay + 1).padStart(2, '0') + '-' + String(gun).padStart(2, '0');
    return gorevler.filter(g => {
      if (!g.tarih) return false;
      const gt = g.tarih.substring(0, 10);
      return gt === tarihStr;
    });
  };

  const oncekiAy = () => {
    if (ay === 0) { setAy(11); setYil(yil - 1); }
    else setAy(ay - 1);
    setSecilenGun(null);
  };
  const sonrakiAy = () => {
    if (ay === 11) { setAy(0); setYil(yil + 1); }
    else setAy(ay + 1);
    setSecilenGun(null);
  };

  const secilenGunGorevleri = secilenGun ? gunGorevleri(secilenGun) : [];

  // ═══ RENK SEÇENEKLERİ ═══
  const renkSecenekleri = [C.accent, C.success, C.warning, C.danger, C.purple, C.cyan, C.pink, C.gold];

  // ═══ TAKVİM HÜCRELERİ ═══
  const takvimHucreleri = [];
  for (let i = 0; i < baslangicGunu; i++) {
    takvimHucreleri.push(null);
  }
  for (let g = 1; g <= gunSayisi; g++) {
    takvimHucreleri.push(g);
  }
  while (takvimHucreleri.length % 7 !== 0) {
    takvimHucreleri.push(null);
  }

  // ═══ LİSTE FİLTRELİ GÖREVLER ═══
  const filtrelenmis = gorevler.filter(g => {
    if (oncelikF && g.oncelik !== oncelikF) return false;
    if (durumF === 'tamamlanmamis' && g.tamamlandi) return false;
    if (durumF === 'tamamlanmis' && !g.tamamlandi) return false;
    return true;
  }).sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

  // ═══ ÖNCELİK FİLTRE SEÇENEKLERİ ═══
  const oncelikSecenekleri = [
    {v: '', l: 'TÜMÜ'},
    {v: 'dusuk', l: 'DÜŞÜK'},
    {v: 'normal', l: 'NORMAL'},
    {v: 'yuksek', l: 'YÜKSEK'},
    {v: 'acil', l: 'ACİL'}
  ];
  const durumSecenekleri = [
    {v: '', l: 'TÜMÜ'},
    {v: 'tamamlanmamis', l: 'TAMAMLANMAMIŞ'},
    {v: 'tamamlanmis', l: 'TAMAMLANMIŞ'}
  ];

  return (
    <div className="fade-in">
      {/* ═══ İSTATİSTİK KARTLARI ═══ */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        <StatCard icon="CalendarDays" label="TOPLAM GÖREV" value={toplam} color={C.accent}/>
        <StatCard icon="CheckCircle" label="TAMAMLANAN" value={tamamlanan} color={C.success}/>
        <StatCard icon="Clock" label="BEKLEYEN" value={bekleyen} color={C.warning}/>
        <StatCard icon="AlertTriangle" label="ACİL" value={acil} color={C.danger}/>
      </div>

      <div style={S.card}>
        {/* ═══ BAŞLIK VE KONTROLLER ═══ */}
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <LIcon name="CalendarDays" size={16} color={C.accent}/>
            <span style={{fontSize:14,fontWeight:700}}>AJANDA</span>
            <Badge text={toplam + ' GÖREV'} color={C.accent}/>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {/* GÖRÜNÜM DEĞİŞTİR */}
            <button
              style={{...S.btn,...(gorunum === 'takvim' ? S.btnP : S.btnG),fontSize:11,padding:'8px 14px'}}
              onClick={() => { setGorunum('takvim'); setSecilenGun(null); }}>
              <LIcon name="Calendar" size={14} color={gorunum === 'takvim' ? '#fff' : C.textSec}/> TAKVİM
            </button>
            <button
              style={{...S.btn,...(gorunum === 'liste' ? S.btnP : S.btnG),fontSize:11,padding:'8px 14px'}}
              onClick={() => setGorunum('liste')}>
              <LIcon name="List" size={14} color={gorunum === 'liste' ? '#fff' : C.textSec}/> LİSTE
            </button>
            {MR.hasYetki(user,'ajanda','ajanda-toplu-sil') && secililer.length > 0 && (
              <button style={{...S.btn,...S.btnD,fontSize:9,padding:'5px 10px',display:'flex',alignItems:'center',gap:4}} onClick={() => setTopluSilConfirm(true)}>
                <LIcon name="Trash2" size={12} color="#fff"/> TOPLU SİL ({secililer.length})
              </button>
            )}
            <button style={{...S.btn,...S.btnS,fontSize:11}} onClick={() => modalAc(null)}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ GÖREV
            </button>
          </div>
        </div>

        {loading ? <Loading/> : gorunum === 'takvim' ? (
          /* ═══════════════════════════════════════════════════════
             TAKVİM GÖRÜNÜMÜ
             ═══════════════════════════════════════════════════════ */
          <div style={{display:'flex'}}>
            {/* TAKVİM GRID */}
            <div style={{flex:1,padding:20}}>
              {/* AY NAVİGASYONU */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <button style={{...S.btn,...S.btnG,fontSize:11,padding:'8px 16px'}} onClick={oncekiAy}>
                  <LIcon name="ChevronLeft" size={14} color={C.textSec}/> ÖNCEKİ AY
                </button>
                <span style={{fontSize:16,fontWeight:800,letterSpacing:1}}>
                  {ayIsimleri[ay]} {yil}
                </span>
                <button style={{...S.btn,...S.btnG,fontSize:11,padding:'8px 16px'}} onClick={sonrakiAy}>
                  SONRAKİ AY <LIcon name="ChevronRight" size={14} color={C.textSec}/>
                </button>
              </div>

              {/* GÜN İSİMLERİ */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
                {gunIsimleri.map(g => (
                  <div key={g} style={{textAlign:'center',fontSize:10,fontWeight:700,color:C.textMuted,padding:'8px 0',letterSpacing:1}}>
                    {g}
                  </div>
                ))}
              </div>

              {/* TAKVİM HÜCRELERİ */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                {takvimHucreleri.map((gun, idx) => {
                  if (gun === null) {
                    return <div key={'bos-'+idx} style={{minHeight:80,background:'transparent',borderRadius:8}}/>;
                  }
                  const tarihStr = yil + '-' + String(ay + 1).padStart(2, '0') + '-' + String(gun).padStart(2, '0');
                  const bugunMu = tarihStr === bugunStr;
                  const seciliMi = secilenGun === gun;
                  const gunG = gunGorevleri(gun);

                  return (
                    <div key={'gun-'+gun}
                      onClick={() => setSecilenGun(seciliMi ? null : gun)}
                      style={{
                        minHeight:80, padding:6, borderRadius:8, cursor:'pointer',
                        background: seciliMi ? `${C.accent}15` : C.bgHover,
                        border: bugunMu ? `2px solid ${C.accent}` : seciliMi ? `2px solid ${C.accent}55` : `1px solid ${C.border}`,
                        transition:'all .2s',
                        position:'relative'
                      }}
                      onMouseEnter={e => { if (!seciliMi) e.currentTarget.style.background = `${C.accent}11`; }}
                      onMouseLeave={e => { if (!seciliMi) e.currentTarget.style.background = C.bgHover; }}
                    >
                      <div style={{
                        fontSize:12, fontWeight: bugunMu ? 800 : 600,
                        color: bugunMu ? C.accent : C.text,
                        marginBottom:4
                      }}>
                        {gun}
                      </div>
                      {/* GÖREV NOKTALARI */}
                      <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                        {gunG.slice(0, 4).map((g, i) => (
                          <div key={i} style={{
                            width:8, height:8, borderRadius:'50%',
                            background: g.renk || oncelikRenk(g.oncelik),
                            opacity: g.tamamlandi ? 0.4 : 1
                          }}/>
                        ))}
                        {gunG.length > 4 && (
                          <span style={{fontSize:8,color:C.textMuted,fontWeight:700}}>+{gunG.length - 4}</span>
                        )}
                      </div>
                      {/* MİNİ BAŞLIK */}
                      {gunG.length > 0 && gunG.length <= 2 && gunG.map((g, i) => (
                        <div key={'t-'+i} style={{
                          fontSize:8, marginTop:2, padding:'1px 4px', borderRadius:4,
                          background: `${g.renk || oncelikRenk(g.oncelik)}22`,
                          color: g.renk || oncelikRenk(g.oncelik),
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          textDecoration: g.tamamlandi ? 'line-through' : 'none',
                          opacity: g.tamamlandi ? 0.5 : 1
                        }}>
                          {g.baslik}
                        </div>
                      ))}
                      {gunG.length > 2 && (
                        <div style={{fontSize:8,color:C.textMuted,marginTop:2,fontWeight:600}}>
                          {gunG.length} GÖREV
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══ YAN PANEL - SEÇİLEN GÜN ═══ */}
            <div style={{
              width:300, borderLeft:`1px solid ${C.border}`, padding:20,
              display: secilenGun ? 'block' : 'none',
              maxHeight:'calc(100vh - 300px)', overflowY:'auto'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>
                    {secilenGun} {ayIsimleri[ay]} {yil}
                  </div>
                  <div style={{fontSize:10,color:C.textMuted}}>
                    {secilenGunGorevleri.length} GÖREV
                  </div>
                </div>
                <button style={{...S.btn,...S.btnP,fontSize:10,padding:'6px 10px'}} onClick={() => modalAc(null)}>
                  <LIcon name="Plus" size={12} color="#fff"/> EKLE
                </button>
              </div>

              {MR.hasYetki(user,'ajanda','ajanda-toplu-sil') && secilenGunGorevleri.length > 0 && (
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                  <input type="checkbox" checked={secilenGunGorevleri.length > 0 && secilenGunGorevleri.every(g => secililer.includes(g.id))} onChange={() => tumunuSec(secilenGunGorevleri)} style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                  <span style={{fontSize:9,color:C.textMuted,fontWeight:600}}>TÜMÜNÜ SEÇ</span>
                </div>
              )}

              {secilenGunGorevleri.length === 0 ? (
                <div style={{textAlign:'center',padding:30,color:C.textMuted}}>
                  <LIcon name="Calendar" size={32} color={C.textMuted} style={{opacity:0.3,marginBottom:8}}/>
                  <div style={{fontSize:11}}>BU GÜN İÇİN GÖREV YOK</div>
                </div>
              ) : secilenGunGorevleri.map((g, i) => (
                <div key={i} style={{
                  padding:12, borderRadius:8, marginBottom:8,
                  background: C.bgHover, border:`1px solid ${C.border}`,
                  borderLeft:`3px solid ${g.renk || oncelikRenk(g.oncelik)}`,
                  cursor:'pointer', transition:'all .2s'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    {/* SEÇİM CHECKBOX */}
                    {MR.hasYetki(user,'ajanda','ajanda-toplu-sil') && (
                      <input type="checkbox" checked={secililer.includes(g.id)} onChange={() => toggleSecim(g.id)} onClick={e => e.stopPropagation()} style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                    )}
                    {/* TAMAMLANDI CHECKBOX */}
                    <div onClick={(e) => { e.stopPropagation(); tamamlaToggle(g); }}
                      style={{
                        width:18, height:18, borderRadius:4, cursor:'pointer',
                        border: g.tamamlandi ? `2px solid ${C.success}` : `2px solid ${C.borderLight}`,
                        background: g.tamamlandi ? C.success : 'transparent',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        flexShrink:0
                      }}>
                      {g.tamamlandi && <LIcon name="Check" size={12} color="#fff"/>}
                    </div>
                    <span style={{
                      fontSize:12, fontWeight:600, flex:1,
                      textDecoration: g.tamamlandi ? 'line-through' : 'none',
                      color: g.tamamlandi ? C.textMuted : C.text
                    }}>
                      {g.baslik}
                    </span>
                  </div>
                  {g.aciklama && (
                    <div style={{fontSize:10,color:C.textMuted,marginBottom:6,marginLeft:26}}>{g.aciklama}</div>
                  )}
                  <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:26}}>
                    <Badge text={oncelikLabel(g.oncelik)} color={oncelikRenk(g.oncelik)}/>
                    {g.tarih && (
                      <span style={{fontSize:9,color:C.textMuted}}>
                        {g.tarih.substring(11, 16) || ''}
                      </span>
                    )}
                  </div>
                  <div style={{display:'flex',gap:4,marginTop:8,marginLeft:26}}>
                    <button style={{...S.btn,...S.btnG,fontSize:9,padding:'4px 8px'}} onClick={(e) => { e.stopPropagation(); modalAc(g); }}>
                      <LIcon name="Edit3" size={10} color={C.textSec}/> DÜZENLE
                    </button>
                    <button style={{...S.btn,...S.btnD,fontSize:9,padding:'4px 8px'}} onClick={(e) => { e.stopPropagation(); setSilOnay(g); }}>
                      <LIcon name="Trash2" size={10} color="#fff"/> SİL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════
             LİSTE GÖRÜNÜMÜ
             ═══════════════════════════════════════════════════════ */
          <div>
            {/* FİLTRELER */}
            <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
              {/* ÖNCELİK FİLTRESİ */}
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:10,color:C.textMuted,fontWeight:600}}>ÖNCELİK:</span>
                {oncelikSecenekleri.map(o => (
                  <span key={o.v} onClick={() => setOncelikF(o.v)}
                    style={{
                      padding:'5px 12px',borderRadius:20,fontSize:10,fontWeight:oncelikF===o.v?700:400,
                      cursor:'pointer',
                      background:oncelikF===o.v?`${C.accent}22`:'transparent',
                      color:oncelikF===o.v?C.accent:C.textSec,
                      border:`1px solid ${oncelikF===o.v?C.accent+'44':C.border}`
                    }}>
                    {o.l}
                  </span>
                ))}
              </div>
              {/* DURUM FİLTRESİ */}
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:10,color:C.textMuted,fontWeight:600}}>DURUM:</span>
                {durumSecenekleri.map(d => (
                  <span key={d.v} onClick={() => setDurumF(d.v)}
                    style={{
                      padding:'5px 12px',borderRadius:20,fontSize:10,fontWeight:durumF===d.v?700:400,
                      cursor:'pointer',
                      background:durumF===d.v?`${C.accent}22`:'transparent',
                      color:durumF===d.v?C.accent:C.textSec,
                      border:`1px solid ${durumF===d.v?C.accent+'44':C.border}`
                    }}>
                    {d.l}
                  </span>
                ))}
              </div>
            </div>

            {/* GÖREV LİSTESİ */}
            <div style={{overflowX:'auto'}}>
              {filtrelenmis.length === 0 ? (
                <EmptyState icon="CalendarDays" title="GÖREV BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN GÖREV BULUNMUYOR"/>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:700}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {MR.hasYetki(user,'ajanda','ajanda-toplu-sil') && (
                        <th style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`,width:36}}>
                          <input type="checkbox" checked={filtrelenmis.length > 0 && filtrelenmis.every(g => secililer.includes(g.id))} onChange={() => tumunuSec(filtrelenmis)} style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                        </th>
                      )}
                      {['', 'BAŞLIK', 'TARİH', 'BİTİŞ TARİHİ', 'ÖNCELİK', 'DURUM', 'İŞLEMLER'].map(h =>
                        <th key={h||'chk'} style={{padding:'10px 8px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrelenmis.map((g, i) => (
                      <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                        onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {/* SEÇİM CHECKBOX */}
                        {MR.hasYetki(user,'ajanda','ajanda-toplu-sil') && (
                          <td style={{padding:'10px 8px',width:36}}>
                            <input type="checkbox" checked={secililer.includes(g.id)} onChange={() => toggleSecim(g.id)} onClick={e => e.stopPropagation()} style={{cursor:'pointer',width:14,height:14,accentColor:C.accent}}/>
                          </td>
                        )}
                        {/* TAMAMLANDI CHECKBOX */}
                        <td style={{padding:'10px 8px',width:36}}>
                          <div onClick={() => tamamlaToggle(g)}
                            style={{
                              width:20,height:20,borderRadius:4,cursor:'pointer',
                              border: g.tamamlandi ? `2px solid ${C.success}` : `2px solid ${C.borderLight}`,
                              background: g.tamamlandi ? C.success : 'transparent',
                              display:'flex',alignItems:'center',justifyContent:'center'
                            }}>
                            {g.tamamlandi && <LIcon name="Check" size={14} color="#fff"/>}
                          </div>
                        </td>
                        {/* BAŞLIK */}
                        <td style={{padding:'10px 8px'}}>
                          <div style={{
                            fontWeight:600,
                            textDecoration: g.tamamlandi ? 'line-through' : 'none',
                            color: g.tamamlandi ? C.textMuted : C.text
                          }}>
                            {g.baslik}
                          </div>
                          {g.aciklama && (
                            <div style={{fontSize:10,color:C.textMuted,marginTop:2}}>{g.aciklama.substring(0, 60)}{g.aciklama.length > 60 ? '...' : ''}</div>
                          )}
                        </td>
                        {/* TARİH */}
                        <td style={{padding:'10px 8px',color:C.textSec,fontSize:10}}>
                          {g.tarih ? new Date(g.tarih).toLocaleString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'}
                        </td>
                        {/* BİTİŞ TARİHİ */}
                        <td style={{padding:'10px 8px',color:C.textMuted,fontSize:10}}>
                          {g.bitis_tarihi ? new Date(g.bitis_tarihi).toLocaleString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'}
                        </td>
                        {/* ÖNCELİK */}
                        <td style={{padding:'10px 8px'}}>
                          <Badge text={oncelikLabel(g.oncelik)} color={oncelikRenk(g.oncelik)}/>
                        </td>
                        {/* DURUM */}
                        <td style={{padding:'10px 8px'}}>
                          <Badge text={g.tamamlandi ? 'TAMAMLANDI' : 'BEKLEYEN'} color={g.tamamlandi ? C.success : C.warning}/>
                        </td>
                        {/* İŞLEMLER */}
                        <td style={{padding:'10px 8px'}}>
                          <div style={{display:'flex',gap:4}}>
                            <button style={{...S.btn,...S.btnG,fontSize:9,padding:'5px 10px'}} onClick={() => modalAc(g)}>
                              <LIcon name="Edit3" size={10} color={C.textSec}/> DÜZENLE
                            </button>
                            <button style={{...S.btn,...S.btnD,fontSize:9,padding:'5px 10px'}} onClick={() => setSilOnay(g)}>
                              <LIcon name="Trash2" size={10} color="#fff"/>
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
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
         GÖREV EKLEME / DÜZENLEME MODAL
         ═══════════════════════════════════════════════════════ */}
      <Modal open={modalAcik} onClose={() => { setModalAcik(false); setDuzenGorev(null); }} title={duzenGorev ? 'GÖREV DÜZENLE' : 'YENİ GÖREV OLUŞTUR'} width="600px">
        {error && (
          <div style={{padding:10,background:`${C.danger}22`,border:`1px solid ${C.danger}44`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger}}>{error}</div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="BAŞLIK *" full>
            <input style={S.input} value={form.baslik} onChange={e => up('baslik', e.target.value)} placeholder="GÖREV BAŞLIĞI"/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:70}} value={form.aciklama} onChange={e => up('aciklama', e.target.value)} placeholder="GÖREV AÇIKLAMASI..."/>
          </FormGroup>
          <FormGroup label="TARİH *">
            <input type="datetime-local" style={S.input} value={form.tarih} onChange={e => up('tarih', e.target.value)}/>
          </FormGroup>
          <FormGroup label="BİTİŞ TARİHİ">
            <input type="datetime-local" style={S.input} value={form.bitis_tarihi} onChange={e => up('bitis_tarihi', e.target.value)}/>
          </FormGroup>
          <FormGroup label="HATIRLATMA">
            <input type="datetime-local" style={S.input} value={form.hatirlatma} onChange={e => up('hatirlatma', e.target.value)}/>
          </FormGroup>
          <FormGroup label="ÖNCELİK">
            <select style={S.select} value={form.oncelik} onChange={e => up('oncelik', e.target.value)}>
              <option value="dusuk">DÜŞÜK</option>
              <option value="normal">NORMAL</option>
              <option value="yuksek">YÜKSEK</option>
              <option value="acil">ACİL</option>
            </select>
          </FormGroup>
          <FormGroup label="RENK">
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              {renkSecenekleri.map(r => (
                <div key={r} onClick={() => up('renk', r)}
                  style={{
                    width:28,height:28,borderRadius:6,background:r,cursor:'pointer',
                    border: form.renk === r ? '3px solid #fff' : '2px solid transparent',
                    boxShadow: form.renk === r ? `0 0 0 2px ${r}` : 'none',
                    transition:'all .2s'
                  }}/>
              ))}
            </div>
          </FormGroup>
          <FormGroup label="DOSYA ID (İSTEĞE BAĞLI)">
            <input style={S.input} value={form.dosya_id} onChange={e => up('dosya_id', e.target.value)} placeholder="DOSYA ID"/>
          </FormGroup>
        </div>
        <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => { setModalAcik(false); setDuzenGorev(null); }}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={kaydet} disabled={saving}>
            <LIcon name="Save" size={14} color="#fff"/> {saving ? 'KAYDEDİLİYOR...' : duzenGorev ? 'GÜNCELLE' : 'KAYDET'}
          </button>
        </div>
      </Modal>

      {/* ═══ SİLME ONAY ═══ */}
      <Confirm
        open={!!silOnay}
        message={'BU GÖREVİ SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? "' + (silOnay?.baslik || '') + '"'}
        onConfirm={sil}
        onCancel={() => setSilOnay(null)}
      />

      {/* ═══ TOPLU SİLME ONAY ═══ */}
      <Confirm
        open={topluSilConfirm}
        message={'SEÇİLEN ' + secililer.length + ' GÖREV KALICI OLARAK SİLİNECEK!\n\nBU İŞLEM GERİ ALINAMAZ! DEVAM EDİLSİN Mİ?'}
        onConfirm={topluSil}
        onCancel={() => setTopluSilConfirm(false)}
      />
    </div>
  );
};
