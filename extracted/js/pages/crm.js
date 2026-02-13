const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useMemo, useRef} = React;

/* ═══════════════════════════════════════════
   CRM SAYFA YÖNLENDİRİCİ
   ═══════════════════════════════════════════ */
MR.CrmPage = ({setPage, user, view, crmId}) => {
  if (view === 'yeni') return <MR._CRMYeniInner setPage={setPage}/>;
  if (view === 'detay' && crmId) return <MR._CRMDetayInner setPage={setPage} crmId={crmId}/>;
  return <MR._CRMListesiInner setPage={setPage} user={user}/>;
};

/* ═══════════════════════════════════════════
   CRM LİSTESİ
   ═══════════════════════════════════════════ */
MR._CRMListesiInner = ({setPage, user}) => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, Modal, FormGroup, Confirm, api, ILLER} = MR;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [durumF, setDurumF] = useState('');
  const [stats, setStats] = useState({top: 0, tak: 0, olu: 0, neg: 0});

  // DÜZENLEME MODAL
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // DURUM DEĞİŞTİR DROPDOWN
  const [durumDropId, setDurumDropId] = useState(null);

  // SİL ONAY
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const durumlar = ['', 'Yeni', 'Takipte', 'Olumlu', 'Olumsuz'];
  const durumLabels = {'': 'TÜMÜ', 'Yeni': 'YENİ', 'Takipte': 'TAKİPTE', 'Olumlu': 'OLUMLU', 'Olumsuz': 'OLUMSUZ'};
  const kaynaklar = ['TELEFON', 'WEB FORMU', 'SOSYAL MEDYA', 'YÖNLENDİRME', 'DİĞER'];

  const dC = d => d === 'Olumlu' ? C.success : d === 'Takipte' ? C.warning : d === 'Yeni' ? C.cyan : d === 'Olumsuz' ? C.danger : C.textSec;

  const load = useCallback(async () => {
    setLoading(true);
    const p = {};
    if (filter) p.q = filter;
    if (durumF) p.durum = durumF;
    const r = await api.crmList(p);
    if (r?.success) {
      const items = r.data.items || [];
      setData(items);
      if (!filter && !durumF) {
        setStats({
          top: r.data.pagination?.total || items.length,
          tak: items.filter(c => c.durum === 'Takipte').length,
          olu: items.filter(c => c.durum === 'Olumlu').length,
          neg: items.filter(c => c.durum === 'Olumsuz').length
        });
      }
    }
    setLoading(false);
  }, [filter, durumF]);

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [filter, durumF]);

  // DÜZENLEME
  const openEdit = (crm) => {
    setEditData({
      id: crm.id,
      ad_soyad: crm.ad_soyad || '',
      tc_vergi_no: crm.tc_vergi_no || '',
      telefon: crm.telefon || '',
      email: crm.email || '',
      il: crm.il || '',
      ilce: crm.ilce || '',
      plaka: crm.plaka || '',
      marka: crm.marka || '',
      model_adi: crm.model_adi || '',
      arac_yili: crm.arac_yili || '',
      arac_km: crm.arac_km || '',
      olay_aciklama: crm.olay_aciklama || '',
      dosya_turu: crm.dosya_turu || 'ADK',
      kaynak: crm.kaynak || 'TELEFON',
      durum: crm.durum || 'Yeni',
      oncelik: crm.oncelik || 'NORMAL',
      not_text: ''
    });
    setEditError('');
    setEditModal(true);
  };

  const editUp = (k, v) => setEditData(p => ({...p, [k]: v}));

  const editKaydet = async () => {
    if (!editData.ad_soyad || !editData.telefon) {
      setEditError('AD VE TELEFON ZORUNLU');
      return;
    }
    setEditLoading(true);
    setEditError('');
    const r = await api.crmUpdate(editData);
    if (r?.success) {
      setEditModal(false);
      setEditData(null);
      load();
    } else {
      setEditError(r?.error || 'GÜNCELLEME HATASI');
    }
    setEditLoading(false);
  };

  // DURUM DEĞİŞTİR
  const durumDegistir = async (id, yeniDurum) => {
    setDurumDropId(null);
    const r = await api.crmUpdate({id, durum: yeniDurum});
    if (r?.success) load();
  };

  // SİL
  const handleSil = async () => {
    if (!deleteConfirm) return;
    const r = await api.crmDelete(deleteConfirm);
    if (r?.success) {
      setDeleteConfirm(null);
      load();
    }
  };

  const cellSt = {padding: '10px 8px'};
  const thSt = {padding: '10px 8px', textAlign: 'left', color: C.textMuted, fontWeight: 600, fontSize: 9, borderBottom: `1px solid ${C.border}`};
  const iconBtn = (bg) => ({
    width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: `${bg}22`, transition: 'all .2s'
  });

  return (
    <div className="fade-in">
      {/* STAT CARDS */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20}}>
        <StatCard icon="Users" label="TOPLAM KAYIT" value={stats.top} color={C.accent}/>
        <StatCard icon="Clock" label="TAKİPTE" value={stats.tak} color={C.warning}/>
        <StatCard icon="Check" label="OLUMLU" value={stats.olu} color={C.success}/>
        <StatCard icon="X" label="OLUMSUZ" value={stats.neg} color={C.danger}/>
      </div>

      <div style={S.card}>
        {/* HEADER */}
        <div style={{...S.cardHead, justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <LIcon name="Users" size={16} color={C.accent}/>
            <span style={{fontSize: 14, fontWeight: 700}}>CRM - POTANSİYEL MÜŞTERİLER</span>
            <Badge text={`${data.length} KAYIT`} color={C.accent}/>
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <input placeholder="AD VEYA TELEFON ARA..." value={filter} onChange={e => setFilter(e.target.value)}
              style={{...S.input, width: 220, fontSize: 11}}/>
            <button style={{...S.btn, ...S.btnP, fontSize: 11}} onClick={() => setPage('crm-yeni')}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ KAYIT
            </button>
          </div>
        </div>

        {/* DURUM FİLTRE TABS */}
        <div style={{padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6}}>
          {durumlar.map(d => (
            <span key={d || 'all'} onClick={() => setDurumF(d)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: durumF === d ? 700 : 400,
                cursor: 'pointer', background: durumF === d ? `${C.accent}22` : 'transparent',
                color: durumF === d ? C.accent : C.textSec, border: `1px solid ${durumF === d ? C.accent + '44' : C.border}`
              }}>
              {durumLabels[d]}
            </span>
          ))}
        </div>

        {/* TABLO */}
        {loading ? <Loading/> : (
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 1000}}>
              <thead>
                <tr style={{background: C.bgHover}}>
                  {['AD SOYAD', 'TELEFON', 'İL', 'TÜR', 'KAYNAK', 'DURUM', 'SON İLETİŞİM', 'İŞLEMLER'].map(h =>
                    <th key={h} style={thSt}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState icon="Users" title="CRM KAYDI BULUNAMADI" desc="YENİ CRM KAYDI OLUŞTURUN"/></td></tr>
                ) : data.map((c, i) => (
                  <tr key={c.id || i} style={{borderBottom: `1px solid ${C.border}`, position: 'relative'}}
                    onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{...cellSt, fontWeight: 600}}>{c.ad_soyad}</td>
                    <td style={{...cellSt, color: C.textSec}}>{c.telefon || '-'}</td>
                    <td style={cellSt}>{c.il || '-'}</td>
                    <td style={cellSt}><Badge text={c.dosya_turu || 'ADK'} color={c.dosya_turu === 'BH' ? C.purple : C.accent}/></td>
                    <td style={{...cellSt, color: C.textMuted}}>{c.kaynak || '-'}</td>
                    <td style={cellSt}><Badge text={c.durum || 'YENİ'} color={dC(c.durum)}/></td>
                    <td style={{...cellSt, color: C.textMuted}}>{c.son_iletisim || '-'}</td>
                    <td style={{...cellSt, position: 'relative'}}>
                      <div style={{display: 'flex', gap: 4, alignItems: 'center'}}>
                        {/* DETAY */}
                        <button style={iconBtn(C.accent)} title="DETAY"
                          onClick={() => setPage('crm-detay-' + c.id)}>
                          <LIcon name="Eye" size={13} color={C.accent}/>
                        </button>
                        {/* DÜZENLE */}
                        <button style={iconBtn(C.warning)} title="DÜZENLE"
                          onClick={() => openEdit(c)}>
                          <LIcon name="Edit3" size={13} color={C.warning}/>
                        </button>
                        {/* DURUM DEĞİŞTİR */}
                        <div style={{position: 'relative'}}>
                          <button style={iconBtn(C.cyan)} title="DURUM DEĞİŞTİR"
                            onClick={() => setDurumDropId(durumDropId === c.id ? null : c.id)}>
                            <LIcon name="RefreshCw" size={13} color={C.cyan}/>
                          </button>
                          {durumDropId === c.id && (
                            <div style={{
                              position: 'absolute', top: 32, right: 0, zIndex: 100,
                              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
                              boxShadow: '0 8px 24px rgba(0,0,0,.3)', minWidth: 140, overflow: 'hidden'
                            }}>
                              {['Yeni', 'Takipte', 'Olumlu', 'Olumsuz'].map(d => (
                                <div key={d} onClick={() => durumDegistir(c.id, d)}
                                  style={{
                                    padding: '8px 14px', fontSize: 11, cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.border}`,
                                    background: c.durum === d ? `${dC(d)}15` : 'transparent'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = `${dC(d)}22`}
                                  onMouseLeave={e => e.currentTarget.style.background = c.durum === d ? `${dC(d)}15` : 'transparent'}>
                                  <span style={{width: 8, height: 8, borderRadius: '50%', background: dC(d)}}/>
                                  {d.toUpperCase()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* SİL */}
                        <button style={iconBtn(C.danger)} title="SİL"
                          onClick={() => setDeleteConfirm(c.id)}>
                          <LIcon name="Trash2" size={13} color={C.danger}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DURUM DROPDOWN KAPATMA - GLOBAL CLICK */}
      {durumDropId && (
        <div style={{position: 'fixed', inset: 0, zIndex: 50}} onClick={() => setDurumDropId(null)}/>
      )}

      {/* DÜZENLEME MODAL */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="CRM KAYDI DÜZENLE" width="800px">
        {editData && (
          <div>
            {editError && (
              <div style={{padding:10, background:`${C.danger}22`, borderRadius:8, marginBottom:16, fontSize:12, color:C.danger}}>
                {editError}
              </div>
            )}
            {/* MÜŞTERİ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="User" size={12} color={C.accent}/> MÜŞTERİ BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:16}}>
              <FormGroup label="AD SOYAD *">
                <input style={S.input} value={editData.ad_soyad} onChange={e => editUp('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
              </FormGroup>
              <FormGroup label="TC / VERGİ NO">
                <input style={S.input} value={editData.tc_vergi_no} onChange={e => editUp('tc_vergi_no', e.target.value.replace(/[^0-9]/g,''))} placeholder="TC / VERGİ NO" maxLength={11}/>
              </FormGroup>
              <FormGroup label="TELEFON *">
                <input style={S.input} value={editData.telefon} onChange={e => editUp('telefon', e.target.value)} placeholder="05XX XXX XXXX"/>
              </FormGroup>
              <FormGroup label="E-POSTA">
                <input style={S.input} value={editData.email} onChange={e => editUp('email', e.target.value)} placeholder="E-POSTA"/>
              </FormGroup>
              <FormGroup label="İL">
                <select style={S.select} value={editData.il} onChange={e => editUp('il', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="İLÇE">
                <input style={S.input} value={editData.ilce} onChange={e => editUp('ilce', e.target.value)} placeholder="İLÇE"/>
              </FormGroup>
            </div>
            {/* ARAÇ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="Car" size={12} color={C.accent}/> ARAÇ BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:16}}>
              <FormGroup label="PLAKA">
                <input style={S.input} value={editData.plaka} onChange={e => editUp('plaka', e.target.value.toUpperCase())} placeholder="34 ABC 123"/>
              </FormGroup>
              <FormGroup label="MARKA">
                <MR.AracMarkaSelect value={editData.marka} onChange={v => { editUp('marka', v); setEditData(p => ({...p, model_adi:''})); }}/>
              </FormGroup>
              <FormGroup label="MODEL">
                <MR.AracModelSelect marka={editData.marka} value={editData.model_adi} onChange={v => editUp('model_adi', v)}/>
              </FormGroup>
              <FormGroup label="YIL">
                <select style={S.select} value={editData.arac_yili} onChange={e => editUp('arac_yili', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {Array.from({length:30}, (_,i) => new Date().getFullYear()-i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="KM">
                <input style={S.input} value={editData.arac_km} onChange={e => editUp('arac_km', e.target.value.replace(/[^0-9]/g,''))} placeholder="KM"/>
              </FormGroup>
              <div/>
            </div>
            {/* OLAY & DOSYA */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="FileText" size={12} color={C.accent}/> OLAY & DOSYA BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:14}}>
              <FormGroup label="TÜR">
                <select style={S.select} value={editData.dosya_turu} onChange={e => editUp('dosya_turu', e.target.value)}>
                  <option value="ADK">ADK</option>
                  <option value="BH">BEDENİ HASAR</option>
                </select>
              </FormGroup>
              <FormGroup label="KAYNAK">
                <select style={S.select} value={editData.kaynak} onChange={e => editUp('kaynak', e.target.value)}>
                  {kaynaklar.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="DURUM">
                <select style={S.select} value={editData.durum} onChange={e => editUp('durum', e.target.value)}>
                  {['Yeni','Takipte','Olumlu','Olumsuz'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="ÖNCELİK">
                <select style={S.select} value={editData.oncelik || 'NORMAL'} onChange={e => editUp('oncelik', e.target.value)}>
                  {['DÜŞÜK','NORMAL','YÜKSEK','ACİL'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormGroup>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr', gap:14}}>
              <FormGroup label="OLAY AÇIKLAMASI">
                <textarea style={{...S.input, minHeight:60}} value={editData.olay_aciklama || ''} onChange={e => editUp('olay_aciklama', e.target.value)} placeholder="OLAY AÇIKLAMASI..."/>
              </FormGroup>
              <FormGroup label="NOT">
                <textarea style={{...S.input, minHeight:50}} value={editData.not_text} onChange={e => editUp('not_text', e.target.value)} placeholder="GÖRÜŞME NOTU..."/>
              </FormGroup>
            </div>
            <div style={{marginTop:20, display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button style={{...S.btn, ...S.btnG}} onClick={() => setEditModal(false)}>İPTAL</button>
              <button style={{...S.btn, ...S.btnS}} onClick={editKaydet} disabled={editLoading}>
                <LIcon name="Save" size={14} color="#fff"/> {editLoading ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SİL ONAY */}
      <Confirm open={!!deleteConfirm} message="BU CRM KAYDINI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ." onConfirm={handleSil} onCancel={() => setDeleteConfirm(null)}/>
    </div>
  );
};

/* ═══════════════════════════════════════════
   CRM DETAY
   ═══════════════════════════════════════════ */
MR._CRMDetayInner = ({setPage, crmId}) => {
  const {C, S, LIcon, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, ILLER} = MR;
  const [crm, setCrm] = useState(null);
  const [loading, setLoading] = useState(true);

  // NOT EKLEME
  const [notText, setNotText] = useState('');
  const [notLoading, setNotLoading] = useState(false);

  // DÜZENLEME MODAL
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // SİL ONAY
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // DÖNÜŞTÜR ONAY
  const [donusturConfirm, setDonusturConfirm] = useState(false);
  const [donusturLoading, setDonusturLoading] = useState(false);

  const kaynaklar = ['TELEFON', 'WEB FORMU', 'SOSYAL MEDYA', 'YÖNLENDİRME', 'DİĞER'];
  const dC = d => d === 'Olumlu' ? C.success : d === 'Takipte' ? C.warning : d === 'Yeni' ? C.cyan : d === 'Olumsuz' ? C.danger : C.textSec;

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.crmGet(crmId);
    if (r?.success) setCrm(r.data);
    setLoading(false);
  }, [crmId]);

  useEffect(() => { load(); }, [crmId]);

  // NOT EKLE
  const notEkle = async () => {
    if (!notText.trim()) return;
    setNotLoading(true);
    const r = await api.crmNotEkle({crm_id: crmId, not_text: notText.trim()});
    if (r?.success) {
      setNotText('');
      load();
    }
    setNotLoading(false);
  };

  // DÜZENLEME
  const openEdit = () => {
    if (!crm) return;
    setEditData({
      id: crm.id,
      ad_soyad: crm.ad_soyad || '',
      tc_vergi_no: crm.tc_vergi_no || '',
      telefon: crm.telefon || '',
      email: crm.email || '',
      il: crm.il || '',
      ilce: crm.ilce || '',
      plaka: crm.plaka || '',
      marka: crm.marka || '',
      model_adi: crm.model_adi || '',
      arac_yili: crm.arac_yili || '',
      arac_km: crm.arac_km || '',
      olay_aciklama: crm.olay_aciklama || '',
      dosya_turu: crm.dosya_turu || 'ADK',
      kaynak: crm.kaynak || 'TELEFON',
      durum: crm.durum || 'Yeni',
      oncelik: crm.oncelik || 'NORMAL',
      not_text: ''
    });
    setEditError('');
    setEditModal(true);
  };

  const editUp = (k, v) => setEditData(p => ({...p, [k]: v}));

  const editKaydet = async () => {
    if (!editData.ad_soyad || !editData.telefon) {
      setEditError('AD VE TELEFON ZORUNLU');
      return;
    }
    setEditLoading(true);
    setEditError('');
    const r = await api.crmUpdate(editData);
    if (r?.success) {
      setEditModal(false);
      setEditData(null);
      load();
    } else {
      setEditError(r?.error || 'GÜNCELLEME HATASI');
    }
    setEditLoading(false);
  };

  // SİL
  const handleSil = async () => {
    const r = await api.crmDelete(crmId);
    if (r?.success) {
      setDeleteConfirm(false);
      setPage('crm-liste');
    }
  };

  // DÖNÜŞTÜR
  const handleDonustur = async () => {
    setDonusturLoading(true);
    const r = await api.crmDonustur({crm_id: crmId});
    if (r?.success) {
      setDonusturConfirm(false);
      if (r.data?.dosya_id) {
        setPage('dosya-detay-' + r.data.dosya_id);
      } else {
        setPage('dosya-liste');
      }
    }
    setDonusturLoading(false);
  };

  // DURUM DEĞİŞTİR
  const durumDegistir = async (yeniDurum) => {
    const r = await api.crmUpdate({id: crmId, durum: yeniDurum});
    if (r?.success) load();
  };

  if (loading) return <Loading/>;
  if (!crm) return <EmptyState icon="AlertCircle" title="CRM KAYDI BULUNAMADI" desc="GEÇERSİZ KAYIT"/>;

  const notlar = crm.notlar || [];
  const infoRow = (label, value) => (
    <div style={{display: 'flex', padding: '10px 0', borderBottom: `1px solid ${C.border}`}}>
      <div style={{width: 160, fontSize: 11, fontWeight: 600, color: C.textMuted}}>{label}</div>
      <div style={{flex: 1, fontSize: 12, fontWeight: 500}}>{value || '-'}</div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* GERİ BUTONU */}
      <button style={{...S.btn, ...S.btnG, marginBottom: 16, fontSize: 11}} onClick={() => setPage('crm-liste')}>
        <LIcon name="ArrowLeft" size={14}/> LİSTEYE DÖN
      </button>

      {/* HEADER CARD */}
      <div style={{...S.card, marginBottom: 16}}>
        <div style={{padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: `${C.accent}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <LIcon name="User" size={24} color={C.accent}/>
            </div>
            <div>
              <div style={{fontSize: 20, fontWeight: 800}}>
                {crm.ad_soyad}
                <span style={{marginLeft: 10}}>
                  <Badge text={crm.durum || 'YENİ'} color={dC(crm.durum)}/>
                </span>
              </div>
              <div style={{fontSize: 12, color: C.textSec, marginTop: 4, display: 'flex', gap: 10, alignItems: 'center'}}>
                <span>{crm.telefon || '-'}</span>
                <span style={{color: C.textMuted}}>|</span>
                <Badge text={crm.kaynak || 'TELEFON'} color={C.textSec}/>
                <Badge text={crm.dosya_turu || 'ADK'} color={crm.dosya_turu === 'BH' ? C.purple : C.accent}/>
              </div>
            </div>
          </div>
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <select value={crm.durum} onChange={e => durumDegistir(e.target.value)}
              style={{...S.select, width: 160, fontSize: 11, background: `${dC(crm.durum)}11`, border: `1px solid ${dC(crm.durum)}44`}}>
              {['Yeni', 'Takipte', 'Olumlu', 'Olumsuz'].map(d =>
                <option key={d} value={d}>{d.toUpperCase()}</option>
              )}
            </select>
            <button style={{...S.btn, ...S.btnP, fontSize: 11}} onClick={openEdit}>
              <LIcon name="Edit3" size={14} color="#fff"/> DÜZENLE
            </button>
            <button style={{...S.btn, ...S.btnS, fontSize: 11}} onClick={() => setDonusturConfirm(true)}>
              <LIcon name="ArrowRightCircle" size={14} color="#fff"/> DOSYAYA DÖNÜŞTÜR
            </button>
            <button style={{...S.btn, ...S.btnD, fontSize: 11}} onClick={() => setDeleteConfirm(true)}>
              <LIcon name="Trash2" size={14} color="#fff"/> SİL
            </button>
          </div>
        </div>
      </div>

      {/* İÇERİK GRİD */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
        {/* BİLGİLER */}
        <div style={S.card}>
          <SectionTitle icon="Info" title="MÜŞTERİ & ARAÇ BİLGİLERİ" sub="DETAY BİLGİLER"/>
          <div style={{padding: 20}}>
            {infoRow('AD SOYAD', crm.ad_soyad)}
            {infoRow('TC / VERGİ NO', crm.tc_vergi_no)}
            {infoRow('TELEFON', crm.telefon)}
            {infoRow('E-POSTA', crm.email)}
            {infoRow('İL / İLÇE', [crm.il, crm.ilce].filter(Boolean).join(' / ') || '-')}
            {crm.plaka && <div style={{padding:'6px 0', borderBottom:`1px solid ${C.border}`, marginTop:6}}>
              <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:6}}>ARAÇ BİLGİLERİ</div>
            </div>}
            {infoRow('PLAKA', crm.plaka)}
            {infoRow('MARKA / MODEL', [crm.marka, crm.model_adi].filter(Boolean).join(' - ') || '-')}
            {infoRow('YIL / KM', [crm.arac_yili, crm.arac_km ? crm.arac_km + ' KM' : ''].filter(Boolean).join(' / ') || '-')}
            <div style={{padding:'6px 0', borderBottom:`1px solid ${C.border}`, marginTop:6}}>
              <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:6}}>DOSYA BİLGİLERİ</div>
            </div>
            {infoRow('DOSYA TÜRÜ', crm.dosya_turu)}
            {infoRow('KAYNAK', crm.kaynak)}
            {infoRow('ÖNCELİK', crm.oncelik || 'NORMAL')}
            {infoRow('DURUM', (
              <Badge text={crm.durum || 'YENİ'} color={dC(crm.durum)}/>
            ))}
            {infoRow('ATANAN', crm.atanan_adi || '-')}
            {infoRow('KAYIT TARİHİ', crm.created_at || '-')}
            {infoRow('SON İLETİŞİM', crm.son_iletisim || '-')}
            {crm.olay_aciklama && (
              <div style={{marginTop:10}}>
                <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:6}}>OLAY AÇIKLAMASI</div>
                <div style={{fontSize:12, lineHeight:1.6, padding:10, background:`${C.accent}08`, borderRadius:8, border:`1px solid ${C.border}`}}>
                  {crm.olay_aciklama}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NOTLAR */}
        <div style={S.card}>
          <SectionTitle icon="MessageSquare" title="NOTLAR" sub={`${notlar.length} NOT KAYDI`}/>
          <div style={{padding: 20}}>
            {/* NOT EKLEME FORMU */}
            <div style={{marginBottom: 20}}>
              <textarea
                style={{...S.input, minHeight: 80, marginBottom: 10}}
                value={notText}
                onChange={e => setNotText(e.target.value)}
                placeholder="YENİ NOT YAZIN..."
              />
              <button style={{...S.btn, ...S.btnP, fontSize: 11}} onClick={notEkle} disabled={notLoading || !notText.trim()}>
                <LIcon name="Plus" size={14} color="#fff"/> {notLoading ? 'EKLENİYOR...' : 'NOT EKLE'}
              </button>
            </div>

            {/* NOT LİSTESİ */}
            <div style={{maxHeight: 400, overflowY: 'auto'}}>
              {notlar.length === 0 ? (
                <div style={{textAlign: 'center', padding: 30, color: C.textMuted, fontSize: 12}}>
                  HENÜZ NOT EKLENMEMİŞ
                </div>
              ) : notlar.map((n, i) => (
                <div key={n.id || i} style={{
                  padding: 14, marginBottom: 10, background: `${C.accent}08`, borderRadius: 10,
                  border: `1px solid ${C.border}`
                }}>
                  <div style={{fontSize: 12, lineHeight: 1.6, marginBottom: 8}}>{n.not_text || n.icerik || '-'}</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textMuted}}>
                    <span>{n.ekleyen_adi || 'SİSTEM'}</span>
                    <span>{n.created_at || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DÜZENLEME MODAL */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="CRM KAYDI DÜZENLE" width="800px">
        {editData && (
          <div>
            {editError && (
              <div style={{padding:10, background:`${C.danger}22`, borderRadius:8, marginBottom:16, fontSize:12, color:C.danger}}>
                {editError}
              </div>
            )}
            {/* MÜŞTERİ BİLGİLERİ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="User" size={12} color={C.accent}/> MÜŞTERİ BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:18}}>
              <FormGroup label="AD SOYAD *">
                <input style={S.input} value={editData.ad_soyad} onChange={e => editUp('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
              </FormGroup>
              <FormGroup label="TC / VERGİ NO">
                <input style={S.input} value={editData.tc_vergi_no} onChange={e => editUp('tc_vergi_no', e.target.value.replace(/[^0-9]/g,''))} placeholder="TC / VERGİ NO" maxLength={11}/>
              </FormGroup>
              <FormGroup label="TELEFON *">
                <input style={S.input} value={editData.telefon} onChange={e => editUp('telefon', e.target.value)} placeholder="05XX XXX XXXX"/>
              </FormGroup>
              <FormGroup label="E-POSTA">
                <input style={S.input} value={editData.email} onChange={e => editUp('email', e.target.value)} placeholder="E-POSTA"/>
              </FormGroup>
              <FormGroup label="İL">
                <select style={S.select} value={editData.il} onChange={e => editUp('il', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {ILLER.map(il => <option key={il} value={il}>{il}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="İLÇE">
                <input style={S.input} value={editData.ilce} onChange={e => editUp('ilce', e.target.value)} placeholder="İLÇE"/>
              </FormGroup>
            </div>
            {/* ARAÇ BİLGİLERİ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="Car" size={12} color={C.accent}/> ARAÇ BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:18}}>
              <FormGroup label="PLAKA">
                <input style={S.input} value={editData.plaka} onChange={e => editUp('plaka', e.target.value.toUpperCase())} placeholder="34 ABC 123"/>
              </FormGroup>
              <FormGroup label="MARKA">
                <MR.AracMarkaSelect value={editData.marka} onChange={v => { editUp('marka', v); setEditData(p => ({...p, model_adi:''})); }}/>
              </FormGroup>
              <FormGroup label="MODEL">
                <MR.AracModelSelect marka={editData.marka} value={editData.model_adi} onChange={v => editUp('model_adi', v)}/>
              </FormGroup>
              <FormGroup label="YIL">
                <select style={S.select} value={editData.arac_yili} onChange={e => editUp('arac_yili', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {Array.from({length:30}, (_,i) => new Date().getFullYear()-i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="KM">
                <input style={S.input} value={editData.arac_km} onChange={e => editUp('arac_km', e.target.value.replace(/[^0-9]/g,''))} placeholder="KM"/>
              </FormGroup>
              <div/>
            </div>
            {/* OLAY & DOSYA BİLGİLERİ */}
            <div style={{fontSize:11, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:10}}>
              <LIcon name="FileText" size={12} color={C.accent}/> OLAY & DOSYA BİLGİLERİ
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:14}}>
              <FormGroup label="TÜR">
                <select style={S.select} value={editData.dosya_turu} onChange={e => editUp('dosya_turu', e.target.value)}>
                  <option value="ADK">ADK</option>
                  <option value="BH">BEDENİ HASAR</option>
                </select>
              </FormGroup>
              <FormGroup label="KAYNAK">
                <select style={S.select} value={editData.kaynak} onChange={e => editUp('kaynak', e.target.value)}>
                  {kaynaklar.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="DURUM">
                <select style={S.select} value={editData.durum} onChange={e => editUp('durum', e.target.value)}>
                  {['Yeni','Takipte','Olumlu','Olumsuz'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="ÖNCELİK">
                <select style={S.select} value={editData.oncelik || 'NORMAL'} onChange={e => editUp('oncelik', e.target.value)}>
                  {['DÜŞÜK','NORMAL','YÜKSEK','ACİL'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormGroup>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr', gap:14}}>
              <FormGroup label="OLAY AÇIKLAMASI">
                <textarea style={{...S.input, minHeight:70}} value={editData.olay_aciklama || ''} onChange={e => editUp('olay_aciklama', e.target.value)} placeholder="OLAY AÇIKLAMASI..."/>
              </FormGroup>
              <FormGroup label="NOT">
                <textarea style={{...S.input, minHeight:60}} value={editData.not_text} onChange={e => editUp('not_text', e.target.value)} placeholder="GÖRÜŞME NOTU..."/>
              </FormGroup>
            </div>
            <div style={{marginTop:20, display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button style={{...S.btn, ...S.btnG}} onClick={() => setEditModal(false)}>İPTAL</button>
              <button style={{...S.btn, ...S.btnS}} onClick={editKaydet} disabled={editLoading}>
                <LIcon name="Save" size={14} color="#fff"/> {editLoading ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SİL ONAY */}
      <Confirm open={deleteConfirm} message="BU CRM KAYDINI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ." onConfirm={handleSil} onCancel={() => setDeleteConfirm(false)}/>

      {/* DÖNÜŞTÜR ONAY */}
      <Confirm open={donusturConfirm} message="BU CRM KAYDINI DOSYAYA DÖNÜŞTÜRMEK İSTEDİĞİNİZE EMİN MİSİNİZ? CRM KAYDI 'OLUMLU' OLARAK İŞARETLENECEK VE YENİ BİR DOSYA OLUŞTURULACAKTIR." onConfirm={handleDonustur} onCancel={() => setDonusturConfirm(false)}/>
    </div>
  );
};

/* ═══════════════════════════════════════════
   CRM YENİ KAYIT - ZENGİNLEŞTİRİLMİŞ EKRAN
   ═══════════════════════════════════════════ */
MR._CRMYeniInner = ({setPage}) => {
  const {C, S, LIcon, FormGroup, Badge, api, ILLER, AracMarkaSelect, AracModelSelect, Confirm} = MR;
  const kaynaklar = ['TELEFON', 'WEB FORMU', 'SOSYAL MEDYA', 'YÖNLENDİRME', 'DİĞER'];

  /* ── FORM STATE ── */
  const [f, sF] = useState({
    ad_soyad: '', tc_vergi_no: '', telefon: '', telefon2: '', email: '',
    il: '', ilce: '',
    plaka: '', marka: '', model_adi: '', arac_yili: '', arac_km: '',
    olay_aciklama: '',
    dosya_turu: 'ADK', kaynak: 'TELEFON', kaza_turu: 'TEK_TARAFLI', pozisyon: 'SURUCU',
    durum: 'Yeni', not_text: '', taslak: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedId, setSavedId] = useState(null);
  const [donusturConfirm, setDonusturConfirm] = useState(false);
  const up = (k, v) => { sF(p => ({...p, [k]: v})); setError(''); setSuccess(''); };

  /* ── DOSYA / SES / FOTOĞRAF STATE ── */
  const [ekler, setEkler] = useState([]); // {type:'dosya'|'ses'|'foto', file:File, preview:string|null, name:string}
  const [recording, setRecording] = useState(false);
  const mediaRecRef = useRef(null);
  const audioChunksRef = useRef([]);
  const dosyaInputRef = useRef(null);
  const fotoInputRef = useRef(null);

  const dosyaEkle = (files, type = 'dosya') => {
    const newFiles = Array.from(files).map(file => {
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      return {type, file, preview, name: file.name, size: file.size};
    });
    setEkler(prev => [...prev, ...newFiles]);
  };

  const dosyaSil = (idx) => {
    setEkler(prev => {
      const item = prev[idx];
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const sesKaydiBaslat = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const mediaRec = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRec.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {type: 'audio/webm'});
        const file = new File([blob], `ses_kaydi_${Date.now()}.webm`, {type: 'audio/webm'});
        setEkler(prev => [...prev, {type: 'ses', file, preview: null, name: file.name, size: file.size}]);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecRef.current = mediaRec;
      mediaRec.start();
      setRecording(true);
    } catch (e) {
      setError('MİKROFON ERİŞİMİ REDDEDILDI VEYA DESTEKLENMIYOR');
    }
  };

  const sesKaydiDurdur = () => {
    if (mediaRecRef.current && recording) {
      mediaRecRef.current.stop();
      setRecording(false);
    }
  };

  /* ── GELEN ÇAĞRI'DAN OTOMATİK DOLDURMA ── */
  useEffect(() => {
    if (MR._gelenCagriTelefon) {
      sF(p => ({...p, telefon: MR._gelenCagriTelefon, ad_soyad: MR._gelenCagriAdi || ''}));
      MR._gelenCagriTelefon = null;
      MR._gelenCagriAdi = null;
    }
  }, []);

  /* ── ÇAĞRI ZAMANLAYICI ── */
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callActive]);

  const toggleCall = () => {
    if (callActive) { setCallActive(false); setCallSeconds(0); }
    else { setCallActive(true); setCallSeconds(0); }
  };

  const fmtTime = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sc = String(s % 60).padStart(2, '0');
    return `${m}:${sc}`;
  };

  /* ── AI ANALİZ ── */
  const aiItems = useMemo(() => {
    const r = [];
    if (f.telefon.length >= 10) r.push({t: 'ÇAĞRI KAYDI OLUŞTURULDU.', c: C.success});
    if (f.dosya_turu === 'ADK') r.push({t: 'DEĞER KAYBI POTANSİYELİ YÜKSEK.', c: C.success});
    if (f.dosya_turu === 'BH') r.push({t: 'BEDENİ HASAR HESAPLAMASI GEREKLİ.', c: C.purple});
    if (f.kaza_turu === 'CIFT_TARAFLI') r.push({t: 'ÇİFT TARAFLI KAZA - KUSUR TESPİTİ GEREKLİ.', c: C.warning});
    if (f.pozisyon === 'YAYA') r.push({t: 'YAYA KAZASI - BEDENİ HASAR ÖNCELİKLİ.', c: C.danger});
    if (f.pozisyon === 'YOLCU') r.push({t: 'YOLCU POZİSYONU - TAZMİNAT HAKKI YÜKSEK.', c: C.success});
    if (f.arac_yili && parseInt(f.arac_yili) >= new Date().getFullYear() - 5) r.push({t: 'EKSPER RAPORU GEREKLİ.', c: C.success});
    if (f.plaka) r.push({t: 'ARAÇ BİLGİSİ TESPİT EDİLDİ.', c: C.success});
    if (f.olay_aciklama && f.olay_aciklama.length > 30) r.push({t: 'TAHKİM UYGUN OLABİLİR.', c: C.success});
    if (ekler.length > 0) r.push({t: `${ekler.length} DOSYA/EK EKLENDİ.`, c: C.cyan});
    return r;
  }, [f.telefon, f.dosya_turu, f.kaza_turu, f.pozisyon, f.arac_yili, f.plaka, f.olay_aciklama, ekler.length]);

  /* ── KAYDET ── */
  const kaydet = async (taslak = false) => {
    if (!taslak) {
      if (!f.ad_soyad.trim()) { setError('AD SOYAD ZORUNLU ALAN'); return null; }
      if (!f.telefon.trim()) { setError('TELEFON ZORUNLU ALAN'); return null; }
    } else {
      if (!f.ad_soyad.trim() && !f.telefon.trim()) { setError('TASLAK İÇİN EN AZ AD VEYA TELEFON GEREKLİ'); return null; }
    }
    if (f.email && !f.email.includes('@')) { setError('GEÇERSİZ E-POSTA ADRESİ'); return null; }
    setLoading(true); setError(''); setSuccess('');
    const data = {...f, taslak: taslak ? 1 : 0};
    const r = await api.crmCreate(data);
    if (r?.success) {
      const newId = r.data?.id;
      setSavedId(newId);
      // EKLERİ YÜKLE
      if (ekler.length > 0 && newId) {
        for (const ek of ekler) {
          try { await api.crmDosyaYukle(newId, ek.type, ek.file); } catch(e) {}
        }
      }
      setLoading(false);
      if (taslak) {
        setSuccess('TASLAK BAŞARIYLA KAYDEDİLDİ');
        return newId;
      } else {
        setPage('crm-detay-' + newId);
        return newId;
      }
    } else {
      setLoading(false);
      setError(r?.error || 'KAYIT OLUŞTURULURKEN HATA OLUŞTU');
      return null;
    }
  };

  /* ── DOSYAYA DÖNÜŞTÜR ── */
  const handleDonustur = async () => {
    setDonusturConfirm(false);
    if (!f.ad_soyad.trim()) { setError('DOSYAYA DÖNÜŞTÜRMEK İÇİN AD SOYAD ZORUNLU'); return; }
    if (!f.telefon.trim()) { setError('DOSYAYA DÖNÜŞTÜRMEK İÇİN TELEFON ZORUNLU'); return; }
    setLoading(true); setError('');
    const createR = await api.crmCreate({...f, taslak: 0, durum: 'Olumlu'});
    if (!createR?.success) { setError(createR?.error || 'CRM KAYDI OLUŞTURULAMADI'); setLoading(false); return; }
    const newId = createR.data?.id;
    const convR = await api.crmDonustur({crm_id: newId});
    setLoading(false);
    if (convR?.success && convR.data?.dosya_id) {
      setPage('dosya-detay-' + convR.data.dosya_id);
    } else {
      setPage('crm-detay-' + newId);
    }
  };

  /* ── FORM TEMİZLE ── */
  const [clearConfirm, setClearConfirm] = useState(false);
  const resetForm = () => {
    setClearConfirm(false);
    sF({ad_soyad:'',tc_vergi_no:'',telefon:'',telefon2:'',email:'',il:'',ilce:'',plaka:'',marka:'',model_adi:'',arac_yili:'',arac_km:'',olay_aciklama:'',dosya_turu:'ADK',kaynak:'TELEFON',kaza_turu:'TEK_TARAFLI',pozisyon:'SURUCU',durum:'Yeni',not_text:'',taslak:0});
    setError(''); setSuccess(''); setSavedId(null);
    setCallActive(false); setCallSeconds(0);
    ekler.forEach(e => { if (e.preview) URL.revokeObjectURL(e.preview); });
    setEkler([]); setRecording(false);
  };

  /* ── FIELDSET BİLEŞENİ ── */
  const Fieldset = ({title, icon, children}) => (
    <fieldset style={{
      border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '18px 20px 14px', marginBottom: 16, background: 'transparent'
    }}>
      <legend style={{
        padding: '4px 12px', fontSize: 12, fontWeight: 700, color: C.textSec,
        display: 'flex', alignItems: 'center', gap: 6, letterSpacing: 0.5
      }}>
        <LIcon name={icon} size={14} color={C.accent}/>
        {title}
      </legend>
      {children}
    </fieldset>
  );

  /* ── SOL PANEL BUTON STİLİ ── */
  const actionBtn = (color) => ({
    ...S.btn, width: '100%', justifyContent: 'flex-start',
    background: `${color}12`, border: `1px solid ${color}30`,
    color: color, fontSize: 12, padding: '11px 14px', borderRadius: 10
  });

  /* ── RENDER ── */
  return (
    <div className="fade-in">
      {/* ÜST BAR */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <button style={{...S.btn, ...S.btnG, fontSize: 11}} onClick={() => setPage('crm-liste')}>
          <LIcon name="ArrowLeft" size={14}/> LİSTEYE DÖN
        </button>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <LIcon name="UserPlus" size={16} color={C.accent}/>
          <span style={{fontSize:14, fontWeight:700}}>ÇAĞRI / CRM KAYIT EKRANI</span>
        </div>
        <div style={{fontSize:11, color:C.textMuted}}>
          {new Date().toLocaleDateString('tr-TR')} | {new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}
        </div>
      </div>

      {/* MESAJLAR */}
      {error && (
        <div style={{padding:'10px 16px', background:`${C.danger}15`, borderRadius:10, marginBottom:14, fontSize:12, color:C.danger, border:`1px solid ${C.danger}33`, display:'flex', alignItems:'center', gap:8}}>
          <LIcon name="AlertCircle" size={16} color={C.danger}/> {error}
        </div>
      )}
      {success && (
        <div style={{padding:'10px 16px', background:`${C.success}15`, borderRadius:10, marginBottom:14, fontSize:12, color:C.success, border:`1px solid ${C.success}33`, display:'flex', alignItems:'center', gap:8}}>
          <LIcon name="CheckCircle" size={16} color={C.success}/> {success}
        </div>
      )}

      {/* ═══ ANA İKİ SÜTUN LAYOUT ═══ */}
      <div style={{display:'flex', gap:16, alignItems:'flex-start'}}>

        {/* ═══ SOL PANEL - ANLIK ÇAĞRI & ANALİZ ═══ */}
        <div style={{width:310, minWidth:310, flexShrink:0}}>

          {/* ÇAĞRI PANELİ */}
          <div style={{...S.card, marginBottom:16}}>
            <div style={{...S.cardHead, padding:'12px 16px'}}>
              <LIcon name="Headphones" size={16} color={C.accent}/>
              <span style={{fontSize:12, fontWeight:700}}>ANLIK ÇAĞRI & ANALİZ</span>
            </div>
            <div style={{padding:16}}>
              {/* TELEFON NUMARASI */}
              <div style={{
                background: callActive ? `${C.success}18` : `${C.accent}15`,
                border: `1px solid ${callActive ? C.success : C.accent}40`,
                borderRadius: 10, padding: '14px 16px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all .3s'
              }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%',
                  background: callActive ? `${C.success}30` : `${C.accent}25`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  animation: callActive ? 'pulse 2s infinite' : 'none'
                }}>
                  <LIcon name={callActive ? 'PhoneCall' : 'Phone'} size={18} color={callActive ? C.success : C.accent}/>
                </div>
                <span style={{fontSize:18, fontWeight:800, letterSpacing:1.5, color: callActive ? C.success : C.text}}>
                  {f.telefon || '0XXX XXX XX XX'}
                </span>
              </div>

              {/* ZAMANLAYICI */}
              <div style={{
                display:'flex', alignItems:'center', gap:10,
                marginBottom:14, padding:'8px 0'
              }}>
                <LIcon name="Clock" size={16} color={callActive ? C.success : C.textMuted}/>
                <span style={{
                  fontSize:28, fontWeight:800, fontFamily:'monospace', letterSpacing:2,
                  color: callActive ? C.text : C.textMuted
                }}>
                  {fmtTime(callSeconds)}
                </span>
                {callActive && <Badge text="AKTIF" color={C.success}/>}
              </div>

              {/* ÇAĞRI KONTROL */}
              <button onClick={() => {
                toggleCall();
                if (!callActive && f.telefon.length >= 10) {
                  // NetSIPP Click-to-Call: SIP protokolü ile arama başlat
                  const cleanNum = f.telefon.replace(/\s/g,'').replace(/^0/, '90');
                  try { window.open('sip:' + cleanNum, '_self'); } catch(e) {}
                }
              }} style={{
                ...S.btn, width:'100%', justifyContent:'center',
                background: callActive ? C.danger : C.success,
                color:'#fff', padding:'12px', fontSize:13, borderRadius:10,
                transition:'all .2s'
              }}>
                <LIcon name={callActive ? 'PhoneOff' : 'PhoneCall'} size={16} color="#fff"/>
                {callActive ? 'ÇAĞRIYI SONLANDIR' : 'ÇAĞRI BAŞLAT'}
              </button>
              {/* NetSIPP DURUM */}
              <div style={{marginTop:8, display:'flex', alignItems:'center', gap:6, fontSize:10, color:C.textMuted}}>
                <span style={{width:6, height:6, borderRadius:'50%', background:C.success, display:'inline-block'}}/>
                NETSIPP BAĞLI
              </div>
            </div>
          </div>

          {/* AI ANALİZ PANELİ */}
          <div style={{...S.card}}>
            <div style={{...S.cardHead, padding:'12px 16px'}}>
              <LIcon name="Bot" size={16} color={C.accent}/>
              <span style={{fontSize:12, fontWeight:700}}>AI ANALİZ</span>
            </div>
            <div style={{padding:16}}>
              {/* ANALİZ SONUÇLARI */}
              {aiItems.length === 0 ? (
                <div style={{color:C.textMuted, fontSize:11, textAlign:'center', padding:'16px 0'}}>
                  <LIcon name="Brain" size={24} color={C.textMuted} style={{opacity:0.3, marginBottom:8, display:'block', margin:'0 auto 8px'}}/>
                  BİLGİ GİRİLDİKÇE AI ANALİZ<br/>SONUÇLARI OLUŞACAKTIR...
                </div>
              ) : (
                <div style={{marginBottom:16}}>
                  {aiItems.map((item, i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:8, padding:'8px 0',
                      borderBottom: i < aiItems.length-1 ? `1px solid ${C.border}` : 'none'
                    }}>
                      <LIcon name="CheckCircle" size={16} color={item.c}/>
                      <span style={{fontSize:11, fontWeight:500}}>{item.t}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* HIZLI İŞLEM BUTONLARI */}
              <div style={{display:'flex', flexDirection:'column', gap:8, marginTop: aiItems.length > 0 ? 0 : 12}}>
                <button style={actionBtn(C.accent)} onClick={() => setPage('hesap-adk')}>
                  <LIcon name="Calculator" size={16} color={C.accent}/> DEĞER KAYBI HESAPLA
                </button>
                <button style={actionBtn(C.purple)} onClick={() => setPage('hesap-bh')}>
                  <LIcon name="Stethoscope" size={16} color={C.purple}/> BEDENİ HASAR HESAPLA
                </button>
                <button style={actionBtn(C.success)} onClick={() => setDonusturConfirm(true)}>
                  <LIcon name="ArrowRightCircle" size={16} color={C.success}/> DOSYAYI ONAYA GÖNDER
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SAĞ PANEL - FORM ═══ */}
        <div style={{flex:1, minWidth:0}}>

          {/* ── MÜŞTERİ BİLGİLERİ ── */}
          <Fieldset title="MÜŞTERİ BİLGİLERİ" icon="User">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
              <FormGroup label="AD SOYAD *">
                <input style={S.input} value={f.ad_soyad} onChange={e => up('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
              </FormGroup>
              <FormGroup label="TC / VERGİ NO">
                <input style={S.input} value={f.tc_vergi_no} onChange={e => up('tc_vergi_no', e.target.value.replace(/[^0-9]/g,''))} placeholder="TC KİMLİK VEYA VERGİ NO" maxLength={11}/>
              </FormGroup>
              <FormGroup label="TELEFON *">
                <input style={S.input} value={f.telefon} onChange={e => up('telefon', e.target.value)} placeholder="05XX XXX XX XX"/>
              </FormGroup>
              <FormGroup label="E-POSTA">
                <input style={S.input} value={f.email} onChange={e => up('email', e.target.value)} placeholder="ORNEK@MAIL.COM"/>
              </FormGroup>
              <FormGroup label="İL">
                <select style={S.select} value={f.il} onChange={e => up('il', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {ILLER.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="İLÇE">
                <input style={S.input} value={f.ilce} onChange={e => up('ilce', e.target.value)} placeholder="İLÇE"/>
              </FormGroup>
            </div>
          </Fieldset>

          {/* ── ARAÇ BİLGİLERİ ── */}
          <Fieldset title="ARAÇ BİLGİLERİ" icon="Car">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14}}>
              <FormGroup label="PLAKA">
                <input style={S.input} value={f.plaka} onChange={e => up('plaka', e.target.value.toUpperCase())} placeholder="34 ABC 123"/>
              </FormGroup>
              <FormGroup label="MARKA">
                <AracMarkaSelect value={f.marka} onChange={v => { up('marka', v); sF(p => ({...p, model_adi:''})); }}/>
              </FormGroup>
              <FormGroup label="MODEL">
                <AracModelSelect marka={f.marka} value={f.model_adi} onChange={v => up('model_adi', v)}/>
              </FormGroup>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginTop:14}}>
              <FormGroup label="YIL">
                <select style={S.select} value={f.arac_yili} onChange={e => up('arac_yili', e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {Array.from({length:30}, (_,i) => new Date().getFullYear() - i).map(y =>
                    <option key={y} value={y}>{y}</option>
                  )}
                </select>
              </FormGroup>
              <FormGroup label="KM">
                <input style={S.input} value={f.arac_km} onChange={e => up('arac_km', e.target.value.replace(/[^0-9]/g,''))} placeholder="45000"/>
              </FormGroup>
              <div/>
            </div>
          </Fieldset>

          {/* ── OLAY BİLGİLERİ ── */}
          <Fieldset title="OLAY BİLGİLERİ" icon="FileText">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14}}>
              <FormGroup label="DOSYA TÜRÜ">
                <select style={S.select} value={f.dosya_turu} onChange={e => up('dosya_turu', e.target.value)}>
                  <option value="ADK">ADK</option>
                  <option value="BH">BEDENİ HASAR</option>
                </select>
              </FormGroup>
              <FormGroup label="KAYNAK">
                <select style={S.select} value={f.kaynak} onChange={e => up('kaynak', e.target.value)}>
                  {kaynaklar.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </FormGroup>
            </div>

            {/* ── KAZA TÜRÜ TOGGLE ── */}
            <FormGroup label="KAZA TÜRÜ">
              <div style={{display:'flex', gap:6}}>
                {[{v:'TEK_TARAFLI', l:'TEK TARAFLI', icon:'ArrowRight'}, {v:'CIFT_TARAFLI', l:'ÇİFT TARAFLI', icon:'ArrowLeftRight'}].map(opt => (
                  <button key={opt.v} type="button" onClick={() => up('kaza_turu', opt.v)}
                    style={{
                      flex:1, padding:'12px 10px', borderRadius:10,
                      border: `2px solid ${f.kaza_turu === opt.v ? C.accent : C.borderLight}`,
                      background: f.kaza_turu === opt.v ? `${C.accent}20` : C.bgInput,
                      color: f.kaza_turu === opt.v ? C.accent : C.textSec,
                      fontWeight: f.kaza_turu === opt.v ? 800 : 500,
                      fontSize:13, cursor:'pointer', transition:'all .2s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8
                    }}>
                    <LIcon name={opt.icon} size={16} color={f.kaza_turu === opt.v ? C.accent : C.textMuted}/>
                    {opt.l}
                  </button>
                ))}
              </div>
            </FormGroup>

            {/* ── POZİSYON TOGGLE ── */}
            <FormGroup label="POZİSYON">
              <div style={{display:'flex', gap:6, marginBottom:14}}>
                {[{v:'SURUCU', l:'SÜRÜCÜ', icon:'Steering'}, {v:'YOLCU', l:'YOLCU', icon:'Users'}, {v:'YAYA', l:'YAYA', icon:'PersonStanding'}].map(opt => (
                  <button key={opt.v} type="button" onClick={() => up('pozisyon', opt.v)}
                    style={{
                      flex:1, padding:'12px 10px', borderRadius:10,
                      border: `2px solid ${f.pozisyon === opt.v ? C.purple : C.borderLight}`,
                      background: f.pozisyon === opt.v ? `${C.purple}20` : C.bgInput,
                      color: f.pozisyon === opt.v ? C.purple : C.textSec,
                      fontWeight: f.pozisyon === opt.v ? 800 : 500,
                      fontSize:13, cursor:'pointer', transition:'all .2s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8
                    }}>
                    <LIcon name={opt.v === 'SURUCU' ? 'CircleUser' : opt.v === 'YOLCU' ? 'Users' : 'Footprints'} size={16} color={f.pozisyon === opt.v ? C.purple : C.textMuted}/>
                    {opt.l}
                  </button>
                ))}
              </div>
            </FormGroup>

            <FormGroup label="OLAY AÇIKLAMASI / GÖRÜŞME NOTU">
              <textarea style={{...S.input, minHeight:120}} value={f.olay_aciklama} onChange={e => up('olay_aciklama', e.target.value)} placeholder="MÜŞTERİ SAĞ ÖN ÇAMURLUK HASARLI, SİGORTA EKSPER BEKLİYOR, DEĞER KAYBI TALEP EDECEK..."/>
            </FormGroup>
          </Fieldset>

          {/* ── EKLER / MEDYA ── */}
          <Fieldset title="EKLER" icon="Paperclip">
            <div style={{display:'flex', gap:8, marginBottom:14, flexWrap:'wrap'}}>
              {/* SES KAYDI */}
              <button type="button" onClick={recording ? sesKaydiDurdur : sesKaydiBaslat}
                style={{
                  ...S.btn, flex:'1 1 auto', justifyContent:'center',
                  background: recording ? `${C.danger}20` : `${C.accent}12`,
                  border: `1px solid ${recording ? C.danger : C.accent}40`,
                  color: recording ? C.danger : C.accent, fontSize:12, padding:'11px 14px', borderRadius:10,
                  animation: recording ? 'pulse 1.5s infinite' : 'none'
                }}>
                <LIcon name={recording ? 'MicOff' : 'Mic'} size={16} color={recording ? C.danger : C.accent}/>
                {recording ? 'KAYDI DURDUR' : 'SES KAYDI'}
              </button>
              {/* DOSYA EKLE */}
              <button type="button" onClick={() => dosyaInputRef.current?.click()}
                style={{
                  ...S.btn, flex:'1 1 auto', justifyContent:'center',
                  background: `${C.success}12`, border: `1px solid ${C.success}40`,
                  color: C.success, fontSize:12, padding:'11px 14px', borderRadius:10
                }}>
                <LIcon name="FilePlus" size={16} color={C.success}/> DOSYA EKLE
              </button>
              {/* FOTOĞRAF YÜKLE */}
              <button type="button" onClick={() => fotoInputRef.current?.click()}
                style={{
                  ...S.btn, flex:'1 1 auto', justifyContent:'center',
                  background: `${C.purple}12`, border: `1px solid ${C.purple}40`,
                  color: C.purple, fontSize:12, padding:'11px 14px', borderRadius:10
                }}>
                <LIcon name="Camera" size={16} color={C.purple}/> FOTOĞRAF YÜKLE
              </button>
            </div>
            {/* GİZLİ FILE INPUT'LAR */}
            <input ref={dosyaInputRef} type="file" multiple style={{display:'none'}}
              onChange={e => { dosyaEkle(e.target.files, 'dosya'); e.target.value = ''; }}/>
            <input ref={fotoInputRef} type="file" accept="image/*" multiple capture="environment" style={{display:'none'}}
              onChange={e => { dosyaEkle(e.target.files, 'foto'); e.target.value = ''; }}/>

            {/* EK LİSTESİ */}
            {ekler.length > 0 && (
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {ekler.map((ek, i) => (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                    background: `${ek.type === 'ses' ? C.accent : ek.type === 'foto' ? C.purple : C.success}08`,
                    borderRadius:8, border:`1px solid ${C.border}`
                  }}>
                    <LIcon name={ek.type === 'ses' ? 'Mic' : ek.type === 'foto' ? 'Image' : 'File'} size={14}
                      color={ek.type === 'ses' ? C.accent : ek.type === 'foto' ? C.purple : C.success}/>
                    {ek.preview && <img src={ek.preview} style={{width:32, height:32, borderRadius:4, objectFit:'cover'}}/>}
                    <span style={{flex:1, fontSize:11, fontWeight:500}}>{ek.name}</span>
                    <span style={{fontSize:10, color:C.textMuted}}>{(ek.size/1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => dosyaSil(i)} style={{
                      background:'none', border:'none', cursor:'pointer', padding:2
                    }}>
                      <LIcon name="X" size={14} color={C.danger}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Fieldset>

        </div>
      </div>

      {/* ═══ ALT AKSİYON BAR ═══ */}
      <div style={{
        marginTop:20, padding:'18px 0 4px',
        display:'flex', justifyContent:'center', gap:12,
        borderTop:`1px solid ${C.border}`
      }}>
        <button style={{...S.btn, ...S.btnP, fontSize:13, padding:'12px 28px', borderRadius:10}} onClick={() => kaydet(true)} disabled={loading}>
          <LIcon name="Save" size={16} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'TASLAK KAYDET'}
        </button>
        <button style={{...S.btn, ...S.btnS, fontSize:13, padding:'12px 28px', borderRadius:10}} onClick={() => kaydet(false)} disabled={loading}>
          <LIcon name="Folder" size={16} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
        </button>
        <button style={{...S.btn, background:C.warning, color:'#000', fontSize:13, padding:'12px 28px', borderRadius:10}} onClick={() => setDonusturConfirm(true)} disabled={loading}>
          <LIcon name="ArrowRightCircle" size={16} color="#000"/> DOSYAYA DÖNÜŞTÜR
        </button>
        <button style={{...S.btn, ...S.btnD, fontSize:13, padding:'12px 28px', borderRadius:10}} onClick={() => setClearConfirm(true)}>
          <LIcon name="Trash2" size={16} color="#fff"/> TEMİZLE
        </button>
        <button style={{...S.btn, ...S.btnG, fontSize:13, padding:'12px 28px', borderRadius:10}} onClick={() => setPage('crm-liste')}>
          <LIcon name="XCircle" size={16}/> KAPAT
        </button>
      </div>

      {/* ═══ ONAY DİALOGLARI ═══ */}
      <Confirm open={clearConfirm} message="FORMU TEMİZLEMEK İSTEDİĞİNİZE EMİN MİSİNİZ? TÜM GİRİLEN BİLGİLER SİLİNECEKTİR." onConfirm={resetForm} onCancel={() => setClearConfirm(false)}/>
      <Confirm open={donusturConfirm} message="BU KAYDI DOĞRUDAN DOSYAYA DÖNÜŞTÜRMEK İSTİYOR MUSUNUZ? CRM KAYDI OLUŞTURULUP DOSYAYA DÖNÜŞTÜRÜLECEKTİR." onConfirm={handleDonustur} onCancel={() => setDonusturConfirm(false)}/>

      {/* PULSE ANİMASYON CSS */}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
};
