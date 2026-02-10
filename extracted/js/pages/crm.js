const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback} = React;

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
      telefon: crm.telefon || '',
      email: crm.email || '',
      il: crm.il || '',
      ilce: crm.ilce || '',
      dosya_turu: crm.dosya_turu || 'ADK',
      kaynak: crm.kaynak || 'TELEFON',
      durum: crm.durum || 'Yeni',
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
      <Modal open={editModal} onClose={() => setEditModal(false)} title="CRM KAYDI DÜZENLE" width="600px">
        {editData && (
          <div>
            {editError && (
              <div style={{padding: 10, background: `${C.danger}22`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: C.danger}}>
                {editError}
              </div>
            )}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
              <FormGroup label="AD SOYAD *">
                <input style={S.input} value={editData.ad_soyad} onChange={e => editUp('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
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
                  {['Yeni', 'Takipte', 'Olumlu', 'Olumsuz'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="NOT" full>
                <textarea style={{...S.input, minHeight: 70}} value={editData.not_text} onChange={e => editUp('not_text', e.target.value)} placeholder="GÖRÜŞME NOTU..."/>
              </FormGroup>
            </div>
            <div style={{marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
              <button style={{...S.btn, ...S.btnG}} onClick={() => setEditModal(false)}>İPTAL</button>
              <button style={{...S.btn, ...S.btnS}} onClick={editKaydet} disabled={editLoading}>
                <LIcon name="Save" size={14} color="#fff"/> {editLoading ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SİL ONAY */}
      <Confirm
        open={!!deleteConfirm}
        message="BU CRM KAYDINI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ."
        onConfirm={handleSil}
        onCancel={() => setDeleteConfirm(null)}
      />
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
      telefon: crm.telefon || '',
      email: crm.email || '',
      il: crm.il || '',
      ilce: crm.ilce || '',
      dosya_turu: crm.dosya_turu || 'ADK',
      kaynak: crm.kaynak || 'TELEFON',
      durum: crm.durum || 'Yeni',
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
          <SectionTitle icon="Info" title="BİLGİLER" sub="MÜŞTERİ DETAY BİLGİLERİ"/>
          <div style={{padding: 20}}>
            {infoRow('AD SOYAD', crm.ad_soyad)}
            {infoRow('TELEFON', crm.telefon)}
            {infoRow('E-POSTA', crm.email)}
            {infoRow('İL', crm.il)}
            {infoRow('İLÇE', crm.ilce)}
            {infoRow('DOSYA TÜRÜ', crm.dosya_turu)}
            {infoRow('KAYNAK', crm.kaynak)}
            {infoRow('DURUM', (
              <Badge text={crm.durum || 'YENİ'} color={dC(crm.durum)}/>
            ))}
            {infoRow('ATANAN', crm.atanan_adi || '-')}
            {infoRow('KAYIT TARİHİ', crm.created_at || '-')}
            {infoRow('SON İLETİŞİM', crm.son_iletisim || '-')}
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
      <Modal open={editModal} onClose={() => setEditModal(false)} title="CRM KAYDI DÜZENLE" width="600px">
        {editData && (
          <div>
            {editError && (
              <div style={{padding: 10, background: `${C.danger}22`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: C.danger}}>
                {editError}
              </div>
            )}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
              <FormGroup label="AD SOYAD *">
                <input style={S.input} value={editData.ad_soyad} onChange={e => editUp('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
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
                  {['Yeni', 'Takipte', 'Olumlu', 'Olumsuz'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="NOT" full>
                <textarea style={{...S.input, minHeight: 70}} value={editData.not_text} onChange={e => editUp('not_text', e.target.value)} placeholder="GÖRÜŞME NOTU..."/>
              </FormGroup>
            </div>
            <div style={{marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
              <button style={{...S.btn, ...S.btnG}} onClick={() => setEditModal(false)}>İPTAL</button>
              <button style={{...S.btn, ...S.btnS}} onClick={editKaydet} disabled={editLoading}>
                <LIcon name="Save" size={14} color="#fff"/> {editLoading ? 'KAYDEDİLİYOR...' : 'GÜNCELLE'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* SİL ONAY */}
      <Confirm
        open={deleteConfirm}
        message="BU CRM KAYDINI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ."
        onConfirm={handleSil}
        onCancel={() => setDeleteConfirm(false)}
      />

      {/* DÖNÜŞTÜR ONAY */}
      <Confirm
        open={donusturConfirm}
        message="BU CRM KAYDINI DOSYAYA DÖNÜŞTÜRMEK İSTEDİĞİNİZE EMİN MİSİNİZ? CRM KAYDI 'OLUMLU' OLARAK İŞARETLENECEK VE YENİ BİR DOSYA OLUŞTURULACAKTIR."
        onConfirm={handleDonustur}
        onCancel={() => setDonusturConfirm(false)}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════
   CRM YENİ KAYIT
   ═══════════════════════════════════════════ */
MR._CRMYeniInner = ({setPage}) => {
  const {C, S, LIcon, SectionTitle, FormGroup, api, ILLER} = MR;
  const kaynaklar = ['TELEFON', 'WEB FORMU', 'SOSYAL MEDYA', 'YÖNLENDİRME', 'DİĞER'];
  const [f, sF] = useState({ad_soyad: '', telefon: '', email: '', il: '', ilce: '', dosya_turu: 'ADK', kaynak: 'TELEFON', durum: 'Yeni', not_text: ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const up = (k, v) => sF(p => ({...p, [k]: v}));

  const kaydet = async () => {
    if (!f.ad_soyad.trim()) { setError('AD SOYAD ZORUNLU ALAN'); return; }
    if (!f.telefon.trim()) { setError('TELEFON ZORUNLU ALAN'); return; }
    if (f.email && !f.email.includes('@')) { setError('GEÇERSİZ E-POSTA ADRESİ'); return; }
    setLoading(true);
    setError('');
    const r = await api.crmCreate(f);
    if (r?.success) {
      setPage('crm-liste');
    } else {
      setError(r?.error || 'KAYIT OLUŞTURULURKEN HATA OLUŞTU');
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <button style={{...S.btn, ...S.btnG, marginBottom: 16, fontSize: 11}} onClick={() => setPage('crm-liste')}>
        <LIcon name="ArrowLeft" size={14}/> LİSTEYE DÖN
      </button>

      <div style={S.card}>
        <SectionTitle icon="UserPlus" title="YENİ CRM KAYDI" sub="POTANSİYEL MÜŞTERİ EKLE"/>
        <div style={S.cardBody}>
          {error && (
            <div style={{padding: 10, background: `${C.danger}22`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: C.danger, border: `1px solid ${C.danger}44`}}>
              {error}
            </div>
          )}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 700}}>
            <FormGroup label="AD SOYAD *">
              <input style={S.input} value={f.ad_soyad} onChange={e => up('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
            </FormGroup>
            <FormGroup label="TELEFON *">
              <input style={S.input} value={f.telefon} onChange={e => up('telefon', e.target.value)} placeholder="05XX XXX XXXX"/>
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
            <FormGroup label="TÜR">
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
            <FormGroup label="DURUM">
              <select style={S.select} value={f.durum} onChange={e => up('durum', e.target.value)}>
                {['Yeni', 'Takipte', 'Olumlu', 'Olumsuz'].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="NOT" full>
              <textarea style={{...S.input, minHeight: 80}} value={f.not_text} onChange={e => up('not_text', e.target.value)} placeholder="GÖRÜŞME NOTU..."/>
            </FormGroup>
          </div>
          <div style={{marginTop: 24, display: 'flex', gap: 8}}>
            <button style={{...S.btn, ...S.btnS, fontSize: 12}} onClick={kaydet} disabled={loading}>
              <LIcon name="Save" size={14} color="#fff"/> {loading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
            </button>
            <button style={{...S.btn, ...S.btnG, fontSize: 12}} onClick={() => setPage('crm-liste')}>
              <LIcon name="X" size={14}/> İPTAL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
