const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef} = React;

/* ════════════════════════════════════════════════════════════════
   MR HASAR DANIŞMANLIK - SİSTEM YÖNETİMİ SAYFASI
   TANIMLAMALAR | KULLANICI YÖNETİMİ | LOG KAYITLARI
   ════════════════════════════════════════════════════════════════ */

/* ─── TANIMLAMALAR KATEGORİ HARİTASI ─── */
const TANIM_KATEGORILER = [
  {key: 'dosya_turu',       label: 'DOSYA TÜRÜ',        icon: 'Folder'},
  {key: 'asama',            label: 'AŞAMA',             icon: 'Layers'},
  {key: 'sigorta_sirketi',  label: 'SİGORTA ŞİRKETİ',  icon: 'Shield'},
  {key: 'hasar_turu',       label: 'HASAR TÜRÜ',        icon: 'AlertCircle'},
  {key: 'evrak_turu',       label: 'EVRAK TÜRÜ',        icon: 'FileText'},
  {key: 'masraf_kalemi',    label: 'MASRAF KALEMİ',     icon: 'Receipt'},
  {key: 'oncelik',          label: 'ÖNCELİK',           icon: 'Zap'},
  {key: 'crm_durum',        label: 'CRM DURUM',         icon: 'Target'},
  {key: 'crm_kaynak',       label: 'CRM KAYNAK',        icon: 'Globe'},
  {key: 'il',               label: 'İL',                icon: 'MapPin'}
];

/* ─── ROL RENK HARİTASI ─── */
const ROL_RENK = {
  admin:    MR.C.danger,
  avukat:   MR.C.purple,
  uzman:    MR.C.accent,
  personel: MR.C.cyan,
  muhasebe: MR.C.success,
  portal:   MR.C.warning
};

const ROL_LABEL = {
  admin:    'ADMİN',
  avukat:   'AVUKAT',
  uzman:    'UZMAN',
  personel: 'PERSONEL',
  muhasebe: 'MUHASEBE',
  portal:   'PORTAL'
};

/* ─── LOG İŞLEM RENK HARİTASI ─── */
const LOG_ISLEM_RENK = (islem) => {
  if (!islem) return MR.C.textSec;
  const s = islem.toUpperCase();
  if (s.includes('SİL') || s.includes('DELETE') || s.includes('KALDIR')) return MR.C.danger;
  if (s.includes('OLUŞTUR') || s.includes('CREATE') || s.includes('EKLE') || s.includes('YENİ')) return MR.C.success;
  if (s.includes('GÜNCELLE') || s.includes('UPDATE') || s.includes('DÜZENLE')) return MR.C.warning;
  if (s.includes('GİRİŞ') || s.includes('LOGIN')) return MR.C.accent;
  if (s.includes('ÇIKIŞ') || s.includes('LOGOUT')) return MR.C.purple;
  return MR.C.cyan;
};

/* ════════════════════════════════════════════════════════════════
   TAB 1 - TANIMLAMALAR
   ════════════════════════════════════════════════════════════════ */
const TanimlamalarTab = () => {
  const {C, S, LIcon, Badge, Loading, EmptyState, Modal, Confirm, api} = MR;
  const [seciliKat, setSeciliKat] = useState(TANIM_KATEGORILER[0].key);
  const [degerler, setDegerler] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formDeger, setFormDeger] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState({open: false, id: null});
  const [dragIdx, setDragIdx] = useState(null);

  const seciliLabel = TANIM_KATEGORILER.find(k => k.key === seciliKat)?.label || '';

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.tanimList({kategori: seciliKat});
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setDegerler(Array.isArray(items) ? items : []);
    } else {
      setDegerler([]);
    }
    setLoading(false);
  }, [seciliKat]);

  useEffect(() => { load(); }, [load]);

  const yeniEkle = () => {
    setEditItem(null);
    setFormDeger('');
    setModalOpen(true);
  };

  const duzenle = (item) => {
    setEditItem(item);
    setFormDeger(item.deger || '');
    setModalOpen(true);
  };

  const kaydet = async () => {
    if (!formDeger.trim()) return;
    setSaving(true);
    let r;
    if (editItem) {
      r = await api.tanimUpdate({id: editItem.id, deger: formDeger.trim()});
    } else {
      r = await api.tanimCreate({kategori: seciliKat, deger: formDeger.trim()});
    }
    if (r?.success) {
      setModalOpen(false);
      setFormDeger('');
      setEditItem(null);
      await load();
    }
    setSaving(false);
  };

  const toggleAktif = async (item) => {
    await api.tanimUpdate({id: item.id, aktif: item.aktif ? 0 : 1});
    await load();
  };

  const silOnayla = (id) => {
    setConfirmState({open: true, id});
  };

  const sil = async () => {
    if (confirmState.id) {
      await api.tanimDelete(confirmState.id);
      setConfirmState({open: false, id: null});
      await load();
    }
  };

  /* ─── SIRALAMA (DRAG & DROP) ─── */
  const handleDragStart = (idx) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const yeni = [...degerler];
    const [moved] = yeni.splice(dragIdx, 1);
    yeni.splice(idx, 0, moved);
    setDegerler(yeni);
    setDragIdx(idx);
  };

  const handleDragEnd = async () => {
    setDragIdx(null);
    for (let i = 0; i < degerler.length; i++) {
      if (degerler[i].sira !== i + 1) {
        await api.tanimUpdate({id: degerler[i].id, sira: i + 1});
      }
    }
  };

  return (
    <div style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:16, minHeight:500}}>
      {/* SOL PANEL - KATEGORİLER */}
      <div style={{...S.card, height:'fit-content'}}>
        <div style={{...S.cardHead, padding:'12px 16px'}}>
          <LIcon name="Database" size={14} color={C.accent}/>
          <span style={{fontSize:12, fontWeight:700}}>KATEGORİLER</span>
        </div>
        <div style={{padding:8}}>
          {TANIM_KATEGORILER.map(kat => {
            const aktif = seciliKat === kat.key;
            return (
              <div key={kat.key} onClick={() => setSeciliKat(kat.key)}
                style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                  borderRadius:8, cursor:'pointer', marginBottom:2, transition:'all .2s',
                  background: aktif ? `${C.accent}18` : 'transparent',
                  borderLeft: aktif ? `3px solid ${C.accent}` : '3px solid transparent',
                  color: aktif ? C.accent : C.textSec
                }}
                onMouseEnter={e => { if (!aktif) e.currentTarget.style.background = C.bgHover; }}
                onMouseLeave={e => { if (!aktif) e.currentTarget.style.background = 'transparent'; }}>
                <LIcon name={kat.icon} size={14} color={aktif ? C.accent : C.textMuted}/>
                <span style={{fontSize:11, fontWeight: aktif ? 700 : 500}}>{kat.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SAG PANEL - DEGERLER */}
      <div style={S.card}>
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <LIcon name="List" size={14} color={C.accent}/>
            <span style={{fontSize:13, fontWeight:700}}>{seciliLabel}</span>
            <Badge text={`${degerler.length} KAYIT`} color={C.accent}/>
          </div>
          <button style={{...S.btn, ...S.btnP, fontSize:11, padding:'8px 16px'}} onClick={yeniEkle}>
            <LIcon name="Plus" size={14} color="#fff"/> YENİ EKLE
          </button>
        </div>

        {loading ? <Loading/> : degerler.length === 0 ? (
          <EmptyState icon="Database" title="TANIMLAMA BULUNAMADI" desc={`${seciliLabel} KATEGORİSİNDE HENÜZ KAYIT YOK`}/>
        ) : (
          <div style={{padding:12}}>
            {degerler.map((item, idx) => (
              <div key={item.id || idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                  borderRadius:8, marginBottom:4, transition:'all .2s',
                  background: dragIdx === idx ? `${C.accent}11` : 'transparent',
                  border: `1px solid ${dragIdx === idx ? C.accent + '44' : C.border}`,
                  opacity: item.aktif === 0 ? 0.5 : 1
                }}
                onMouseEnter={e => { if (dragIdx === null) e.currentTarget.style.background = C.bgHover; }}
                onMouseLeave={e => { if (dragIdx === null) e.currentTarget.style.background = 'transparent'; }}>

                {/* SIRALAMA TUTAMACI */}
                <div style={{cursor:'grab', color:C.textMuted, display:'flex', flexDirection:'column', gap:1, padding:'0 4px'}}
                  title="SIRALAMA">
                  <LIcon name="Menu" size={14} color={C.textMuted}/>
                </div>

                {/* SIRA NO */}
                <span style={{fontSize:10, color:C.textMuted, fontWeight:600, minWidth:20, textAlign:'center'}}>
                  {idx + 1}
                </span>

                {/* DEGER */}
                <span style={{flex:1, fontSize:13, fontWeight:600, color: item.aktif === 0 ? C.textMuted : C.text}}>
                  {item.deger}
                </span>

                {/* AKTİF/PASİF TOGGLE */}
                <div onClick={() => toggleAktif(item)} style={{cursor:'pointer', padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:700,
                  background: item.aktif !== 0 ? `${C.success}22` : `${C.danger}22`,
                  color: item.aktif !== 0 ? C.success : C.danger,
                  border: `1px solid ${item.aktif !== 0 ? C.success + '33' : C.danger + '33'}`}}>
                  {item.aktif !== 0 ? 'AKTİF' : 'PASİF'}
                </div>

                {/* DÜZENLE */}
                <div onClick={() => duzenle(item)} style={{cursor:'pointer', padding:6, borderRadius:6, transition:'all .2s'}}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.accent}22`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="DÜZENLE">
                  <LIcon name="Edit" size={14} color={C.accent}/>
                </div>

                {/* SİL */}
                <div onClick={() => silOnayla(item.id)} style={{cursor:'pointer', padding:6, borderRadius:6, transition:'all .2s'}}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.danger}22`}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="SİL">
                  <LIcon name="Trash2" size={14} color={C.danger}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EKLEME / DÜZENLEME MODAL */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'TANIMLAMA DÜZENLE' : 'YENİ TANIMLAMA EKLE'} width="440px">
        <div>
          <label style={S.label}>DEĞER</label>
          <input style={S.input} value={formDeger} onChange={e => setFormDeger(e.target.value)}
            placeholder="DEĞER GİRİNİZ" autoFocus
            onKeyDown={e => { if (e.key === 'Enter') kaydet(); }}/>
          <div style={{fontSize:10, color:C.textMuted, marginTop:8}}>
            KATEGORİ: <strong style={{color:C.accent}}>{seciliLabel}</strong>
          </div>
          <div style={{marginTop:20, display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button style={{...S.btn, ...S.btnG, fontSize:12}} onClick={() => setModalOpen(false)}>İPTAL</button>
            <button style={{...S.btn, ...S.btnS, fontSize:12, opacity: saving ? 0.7 : 1}} onClick={kaydet} disabled={saving}>
              <LIcon name="Save" size={14} color="#fff"/> {saving ? 'KAYDEDİLİYOR...' : 'KAYDET'}
            </button>
          </div>
        </div>
      </Modal>

      {/* SİLME ONAYI */}
      <Confirm open={confirmState.open}
        message="BU TANIMLAMAYI SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ?"
        onConfirm={sil}
        onCancel={() => setConfirmState({open: false, id: null})}/>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   TAB 2 - KULLANICI YÖNETİMİ
   ════════════════════════════════════════════════════════════════ */
const KullaniciTab = () => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, Modal, FormGroup, Confirm, api} = MR;
  const [kullanicilar, setKullanicilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState({open: false, id: null, msg: ''});

  const bos = {ad_soyad: '', email: '', sifre: '', telefon: '', rol: 'personel'};
  const [form, setForm] = useState({...bos});

  const up = (k, v) => setForm(p => ({...p, [k]: v}));

  const load = async () => {
    setLoading(true);
    const r = await api.kullaniciList();
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setKullanicilar(Array.isArray(items) ? items : []);
    } else {
      setKullanicilar([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toplam = kullanicilar.length;
  const aktifSayi = kullanicilar.filter(u => u.aktif !== 0 && u.aktif !== false).length;
  const pasifSayi = toplam - aktifSayi;

  const yeniKullanici = () => {
    setEditUser(null);
    setForm({...bos});
    setError('');
    setModalOpen(true);
  };

  const duzenle = (user) => {
    setEditUser(user);
    setForm({
      ad_soyad: user.ad_soyad || '',
      email: user.email || '',
      sifre: '',
      telefon: user.telefon || '',
      rol: user.rol || 'personel'
    });
    setError('');
    setModalOpen(true);
  };

  const kaydet = async () => {
    if (!form.ad_soyad.trim() || !form.email.trim()) {
      setError('AD SOYAD VE E-POSTA ZORUNLU ALANLARDIR');
      return;
    }
    if (!editUser && !form.sifre) {
      setError('YENİ KULLANICI İÇİN ŞİFRE ZORUNLUDUR');
      return;
    }
    setSaving(true);
    setError('');

    let r;
    if (editUser) {
      const payload = {
        id: editUser.id,
        ad_soyad: form.ad_soyad.trim(),
        email: form.email.trim(),
        telefon: form.telefon.trim(),
        rol: form.rol
      };
      if (form.sifre) payload.sifre = form.sifre;
      r = await api.kullaniciUpdate(payload);
    } else {
      r = await api.kullaniciCreate({
        ad_soyad: form.ad_soyad.trim(),
        email: form.email.trim(),
        sifre: form.sifre,
        telefon: form.telefon.trim(),
        rol: form.rol
      });
    }

    if (r?.success) {
      setModalOpen(false);
      setForm({...bos});
      setEditUser(null);
      await load();
    } else {
      setError(r?.error || 'BİR HATA OLUŞTU');
    }
    setSaving(false);
  };

  const toggleAktif = (user) => {
    const yeniDurum = user.aktif !== 0 && user.aktif !== false ? 0 : 1;
    const msg = yeniDurum === 0
      ? `"${user.ad_soyad}" KULLANICISINI PASİF YAPMAK İSTEDİĞİNİZDEN EMİN MİSİNİZ?`
      : `"${user.ad_soyad}" KULLANICISINI AKTİF YAPMAK İSTEDİĞİNİZDEN EMİN MİSİNİZ?`;
    setConfirmState({open: true, id: user.id, msg, action: 'toggle', aktif: yeniDurum});
  };

  const silKullanici = (user) => {
    setConfirmState({
      open: true, id: user.id,
      msg: `"${user.ad_soyad}" KULLANICISINI SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? (PASİF YAPILACAKTIR)`,
      action: 'delete'
    });
  };

  const confirmAction = async () => {
    if (!confirmState.id) return;
    if (confirmState.action === 'toggle') {
      await api.kullaniciUpdate({id: confirmState.id, aktif: confirmState.aktif});
    } else if (confirmState.action === 'delete') {
      await api.kullaniciDelete(confirmState.id);
    }
    setConfirmState({open: false, id: null, msg: ''});
    await load();
  };

  return (
    <div>
      {/* İSTATİSTİKLER */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20}}>
        <StatCard icon="Users" label="TOPLAM KULLANICI" value={toplam} color={C.accent}/>
        <StatCard icon="UserCheck" label="AKTİF" value={aktifSayi} color={C.success}/>
        <StatCard icon="User" label="PASİF" value={pasifSayi} color={C.danger}/>
      </div>

      {/* KULLANICI LİSTESİ */}
      <div style={S.card}>
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <LIcon name="Users" size={14} color={C.accent}/>
            <span style={{fontSize:13, fontWeight:700}}>KULLANICI YÖNETİMİ</span>
            <Badge text={`${toplam} KULLANICI`} color={C.accent}/>
          </div>
          <button style={{...S.btn, ...S.btnP, fontSize:11, padding:'8px 16px'}} onClick={yeniKullanici}>
            <LIcon name="UserPlus" size={14} color="#fff"/> YENİ KULLANICI
          </button>
        </div>

        {loading ? <Loading/> : kullanicilar.length === 0 ? (
          <EmptyState icon="Users" title="KULLANICI BULUNAMADI" desc="SİSTEMDE KAYITLI KULLANICI YOK"/>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:800}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['AD SOYAD', 'E-POSTA', 'TELEFON', 'ROL', 'DURUM', 'İŞLEMLER'].map(h =>
                    <th key={h} style={{padding:'10px 12px', textAlign:'left', color:C.textMuted, fontWeight:600, fontSize:9, borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {kullanicilar.map((u, i) => {
                  const aktif = u.aktif !== 0 && u.aktif !== false;
                  const rolRenk = ROL_RENK[u.rol] || C.textSec;
                  return (
                    <tr key={u.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{padding:'12px', fontWeight:600}}>
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                          <div style={{width:32, height:32, borderRadius:8, background:`${rolRenk}22`,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:rolRenk}}>
                            {(u.ad_soyad || '?')[0].toUpperCase()}
                          </div>
                          {u.ad_soyad}
                        </div>
                      </td>
                      <td style={{padding:'12px', color:C.textSec}}>{u.email}</td>
                      <td style={{padding:'12px', color:C.textSec}}>{u.telefon || '-'}</td>
                      <td style={{padding:'12px'}}>
                        <Badge text={ROL_LABEL[u.rol] || (u.rol || '').toUpperCase()} color={rolRenk}/>
                      </td>
                      <td style={{padding:'12px'}}>
                        <Badge text={aktif ? 'AKTİF' : 'PASİF'} color={aktif ? C.success : C.danger}/>
                      </td>
                      <td style={{padding:'12px'}}>
                        <div style={{display:'flex', gap:6}}>
                          <div onClick={() => duzenle(u)} style={{cursor:'pointer', padding:6, borderRadius:6, transition:'all .2s'}}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.accent}22`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            title="DÜZENLE">
                            <LIcon name="Edit" size={14} color={C.accent}/>
                          </div>
                          <div onClick={() => toggleAktif(u)} style={{cursor:'pointer', padding:6, borderRadius:6, transition:'all .2s'}}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.warning}22`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            title={aktif ? 'PASİF YAP' : 'AKTİF YAP'}>
                            <LIcon name={aktif ? 'XCircle' : 'CheckSquare'} size={14} color={aktif ? C.warning : C.success}/>
                          </div>
                          <div onClick={() => silKullanici(u)} style={{cursor:'pointer', padding:6, borderRadius:6, transition:'all .2s'}}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.danger}22`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            title="SİL">
                            <LIcon name="Trash2" size={14} color={C.danger}/>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* KULLANICI EKLEME / DÜZENLEME MODAL */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editUser ? 'KULLANICI DÜZENLE' : 'YENİ KULLANICI OLUŞTUR'} width="520px">
        <div>
          {error && (
            <div style={{padding:'10px 14px', background:`${C.danger}22`, border:`1px solid ${C.danger}44`,
              borderRadius:8, marginBottom:16, fontSize:12, color:C.danger}}>
              {error}
            </div>
          )}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <FormGroup label="AD SOYAD *">
              <input style={S.input} value={form.ad_soyad} onChange={e => up('ad_soyad', e.target.value)} placeholder="AD SOYAD"/>
            </FormGroup>
            <FormGroup label="E-POSTA *">
              <input style={S.input} type="email" value={form.email} onChange={e => up('email', e.target.value)} placeholder="E-POSTA ADRESİ"/>
            </FormGroup>
            <FormGroup label={editUser ? 'ŞİFRE (OPSIYONEL)' : 'ŞİFRE *'}>
              <input style={S.input} type="password" value={form.sifre} onChange={e => up('sifre', e.target.value)}
                placeholder={editUser ? 'BOŞSA DEĞİŞMEZ' : 'ŞİFRE GİRİNİZ'}/>
            </FormGroup>
            <FormGroup label="TELEFON">
              <input style={S.input} type="tel" value={form.telefon} onChange={e => up('telefon', e.target.value)} placeholder="05XX XXX XXXX"/>
            </FormGroup>
            <FormGroup label="ROL *" full>
              <select style={S.select} value={form.rol} onChange={e => up('rol', e.target.value)}>
                <option value="admin">ADMİN</option>
                <option value="avukat">AVUKAT</option>
                <option value="uzman">UZMAN</option>
                <option value="personel">PERSONEL</option>
                <option value="muhasebe">MUHASEBE</option>
                <option value="portal">PORTAL</option>
              </select>
            </FormGroup>
          </div>
          <div style={{marginTop:24, display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button style={{...S.btn, ...S.btnG, fontSize:12}} onClick={() => setModalOpen(false)}>İPTAL</button>
            <button style={{...S.btn, ...S.btnS, fontSize:12, opacity:saving ? 0.7 : 1}} onClick={kaydet} disabled={saving}>
              <LIcon name="Save" size={14} color="#fff"/> {saving ? 'KAYDEDİLİYOR...' : 'KAYDET'}
            </button>
          </div>
        </div>
      </Modal>

      {/* SİLME / DURUM DEĞİŞTİRME ONAYI */}
      <Confirm open={confirmState.open}
        message={confirmState.msg}
        onConfirm={confirmAction}
        onCancel={() => setConfirmState({open: false, id: null, msg: ''})}/>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   TAB 3 - LOG KAYITLARI
   ════════════════════════════════════════════════════════════════ */
const LogTab = () => {
  const {C, S, LIcon, Badge, Loading, EmptyState, api} = MR;
  const [loglar, setLoglar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sayfa, setSayfa] = useState(0);
  const [kullanicilar, setKullanicilar] = useState([]);
  const limit = 25;

  const [filtreler, setFiltreler] = useState({
    islem: '',
    kullanici_id: '',
    modul: '',
    baslangic: '',
    bitis: ''
  });

  const upF = (k, v) => setFiltreler(p => ({...p, [k]: v}));

  /* MODÜL SEÇENEKLERİ */
  const moduller = ['DOSYA', 'CRM', 'MUHASEBE', 'MASRAF', 'EVRAK', 'KULLANICI', 'TANIM', 'BİLDİRİM', 'AJANDA', 'SİSTEM', 'AUTH'];

  /* KULLANICI LİSTESİ (FİLTRE İÇİN) */
  useEffect(() => {
    (async () => {
      const r = await api.kullaniciList();
      if (r?.success) {
        const items = r.data?.items || r.data || [];
        setKullanicilar(Array.isArray(items) ? items : []);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const p = {limit, offset: sayfa * limit};
    if (filtreler.islem) p.islem = filtreler.islem;
    if (filtreler.kullanici_id) p.kullanici_id = filtreler.kullanici_id;
    if (filtreler.modul) p.modul = filtreler.modul;
    if (filtreler.baslangic) p.baslangic = filtreler.baslangic;
    if (filtreler.bitis) p.bitis = filtreler.bitis;

    const r = await api.loglar(p);
    if (r?.success) {
      const items = r.data?.items || r.data || [];
      setLoglar(Array.isArray(items) ? items : []);
      setTotal(r.data?.pagination?.total || r.data?.total || items.length || 0);
    } else {
      setLoglar([]);
      setTotal(0);
    }
    setLoading(false);
  }, [sayfa, filtreler]);

  useEffect(() => { load(); }, [load]);

  /* FİLTRE DEĞİŞTİĞİNDE SAYFAYI SIFIRLA */
  const filtreDegistir = (k, v) => {
    upF(k, v);
    setSayfa(0);
  };

  const toplamSayfa = Math.max(1, Math.ceil(total / limit));

  /* ─── CSV EXPORT ─── */
  const exportCSV = () => {
    if (loglar.length === 0) return;
    const headers = ['TARİH', 'KULLANICI', 'İŞLEM', 'DETAY', 'MODÜL', 'KAYIT ID'];
    const rows = loglar.map(l => [
      l.created_at || l.tarih || '',
      l.kullanici_adi || l.kullanici || '',
      l.islem || '',
      (l.detay || '').replace(/"/g, '""'),
      l.modul || '',
      l.kayit_id || ''
    ]);

    let csv = '\uFEFF'; /* BOM - EXCEL TÜRKÇE UYUMLULUĞU */
    csv += headers.join(';') + '\n';
    rows.forEach(row => {
      csv += row.map(v => `"${v}"`).join(';') + '\n';
    });

    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOG_KAYITLARI_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* FİLTRELERİ TEMİZLE */
  const filtreTemizle = () => {
    setFiltreler({islem: '', kullanici_id: '', modul: '', baslangic: '', bitis: ''});
    setSayfa(0);
  };

  const aktifFiltreSayisi = Object.values(filtreler).filter(v => v).length;

  return (
    <div>
      {/* FİLTRE ALANI */}
      <div style={{...S.card, marginBottom:16}}>
        <div style={{...S.cardHead, justifyContent:'space-between', padding:'12px 16px'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <LIcon name="Filter" size={14} color={C.accent}/>
            <span style={{fontSize:12, fontWeight:700}}>FİLTRELER</span>
            {aktifFiltreSayisi > 0 && <Badge text={`${aktifFiltreSayisi} FİLTRE AKTİF`} color={C.warning}/>}
          </div>
          <div style={{display:'flex', gap:8}}>
            {aktifFiltreSayisi > 0 && (
              <button style={{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px'}} onClick={filtreTemizle}>
                <LIcon name="X" size={12} color={C.textSec}/> TEMİZLE
              </button>
            )}
            <button style={{...S.btn, ...S.btnS, fontSize:10, padding:'6px 12px'}} onClick={exportCSV} disabled={loglar.length === 0}>
              <LIcon name="Download" size={12} color="#fff"/> CSV EXPORT
            </button>
          </div>
        </div>
        <div style={{padding:16, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12}}>
          <div>
            <label style={S.label}>İŞLEM</label>
            <input style={{...S.input, fontSize:11}} placeholder="İŞLEM ARA..."
              value={filtreler.islem} onChange={e => filtreDegistir('islem', e.target.value)}/>
          </div>
          <div>
            <label style={S.label}>KULLANICI</label>
            <select style={{...S.select, fontSize:11}} value={filtreler.kullanici_id}
              onChange={e => filtreDegistir('kullanici_id', e.target.value)}>
              <option value="">TÜMÜ</option>
              {kullanicilar.map(u => <option key={u.id} value={u.id}>{u.ad_soyad}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>MODÜL</label>
            <select style={{...S.select, fontSize:11}} value={filtreler.modul}
              onChange={e => filtreDegistir('modul', e.target.value)}>
              <option value="">TÜMÜ</option>
              {moduller.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>BAŞLANGIÇ TARİHİ</label>
            <input type="date" style={{...S.input, fontSize:11}} value={filtreler.baslangic}
              onChange={e => filtreDegistir('baslangic', e.target.value)}/>
          </div>
          <div>
            <label style={S.label}>BİTİŞ TARİHİ</label>
            <input type="date" style={{...S.input, fontSize:11}} value={filtreler.bitis}
              onChange={e => filtreDegistir('bitis', e.target.value)}/>
          </div>
        </div>
      </div>

      {/* LOG TABLOSU */}
      <div style={S.card}>
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <LIcon name="Activity" size={14} color={C.accent}/>
            <span style={{fontSize:13, fontWeight:700}}>LOG KAYITLARI</span>
            <Badge text={`${total} KAYIT`} color={C.accent}/>
          </div>
          <span style={{fontSize:10, color:C.textMuted}}>
            SAYFA {sayfa + 1} / {toplamSayfa}
          </span>
        </div>

        {loading ? <Loading/> : loglar.length === 0 ? (
          <EmptyState icon="Activity" title="LOG KAYDI BULUNAMADI" desc="FİLTRE KRİTERLERİNİZE UYGUN KAYIT BULUNMAMAKTADIR"/>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:900}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['TARİH', 'KULLANICI', 'İŞLEM', 'DETAY', 'MODÜL', 'KAYIT ID'].map(h =>
                    <th key={h} style={{padding:'10px 12px', textAlign:'left', color:C.textMuted, fontWeight:600, fontSize:9, borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loglar.map((log, i) => {
                  const islemRenk = LOG_ISLEM_RENK(log.islem);
                  return (
                    <tr key={log.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{padding:'10px 12px', color:C.textMuted, fontSize:10, whiteSpace:'nowrap'}}>
                        {log.created_at || log.tarih || '-'}
                      </td>
                      <td style={{padding:'10px 12px', fontWeight:600}}>
                        {log.kullanici_adi || log.kullanici || '-'}
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <Badge text={log.islem || '-'} color={islemRenk}/>
                      </td>
                      <td style={{padding:'10px 12px', color:C.textSec, maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {log.detay || '-'}
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <Badge text={log.modul || '-'} color={C.purple}/>
                      </td>
                      <td style={{padding:'10px 12px', color:C.textMuted, fontFamily:'monospace', fontSize:10}}>
                        {log.kayit_id || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SAYFALAMA */}
        {total > limit && (
          <div style={{padding:'14px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{fontSize:10, color:C.textMuted}}>
              TOPLAM {total} KAYIT | {sayfa * limit + 1} - {Math.min((sayfa + 1) * limit, total)} ARASI GÖSTERİLİYOR
            </span>
            <div style={{display:'flex', gap:4}}>
              <button onClick={() => setSayfa(0)} disabled={sayfa === 0}
                style={{...S.btn, ...S.btnG, fontSize:10, padding:'6px 10px', opacity: sayfa === 0 ? 0.4 : 1}}>
                <LIcon name="ChevronLeft" size={12} color={C.textSec}/>
                <LIcon name="ChevronLeft" size={12} color={C.textSec}/>
              </button>
              <button onClick={() => setSayfa(p => Math.max(0, p - 1))} disabled={sayfa === 0}
                style={{...S.btn, ...S.btnG, fontSize:10, padding:'6px 10px', opacity: sayfa === 0 ? 0.4 : 1}}>
                <LIcon name="ChevronLeft" size={12} color={C.textSec}/> ÖNCEKİ
              </button>

              {/* SAYFA NUMARALARI */}
              {(() => {
                const pages = [];
                const start = Math.max(0, sayfa - 2);
                const end = Math.min(toplamSayfa - 1, sayfa + 2);
                for (let p = start; p <= end; p++) {
                  pages.push(
                    <button key={p} onClick={() => setSayfa(p)}
                      style={{
                        ...S.btn, fontSize:10, padding:'6px 12px', minWidth:36,
                        background: p === sayfa ? C.accent : C.borderLight,
                        color: p === sayfa ? '#fff' : C.textSec,
                        fontWeight: p === sayfa ? 700 : 400
                      }}>
                      {p + 1}
                    </button>
                  );
                }
                return pages;
              })()}

              <button onClick={() => setSayfa(p => Math.min(toplamSayfa - 1, p + 1))} disabled={sayfa >= toplamSayfa - 1}
                style={{...S.btn, ...S.btnG, fontSize:10, padding:'6px 10px', opacity: sayfa >= toplamSayfa - 1 ? 0.4 : 1}}>
                SONRAKİ <LIcon name="ChevronRight" size={12} color={C.textSec}/>
              </button>
              <button onClick={() => setSayfa(toplamSayfa - 1)} disabled={sayfa >= toplamSayfa - 1}
                style={{...S.btn, ...S.btnG, fontSize:10, padding:'6px 10px', opacity: sayfa >= toplamSayfa - 1 ? 0.4 : 1}}>
                <LIcon name="ChevronRight" size={12} color={C.textSec}/>
                <LIcon name="ChevronRight" size={12} color={C.textSec}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ - MR.SistemPage
   ════════════════════════════════════════════════════════════════ */
MR.SistemPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon, SectionTitle} = MR;

  /* ─── TAB TANIMLAMALARI ─── */
  const tabs = [
    {key: 'tanimlamalar', label: 'TANIMLAMALAR',       icon: 'Database',     desc: 'KATEGORİ VE DEĞER YÖNETİMİ'},
    {key: 'kullanici',    label: 'KULLANICI YÖNETİMİ', icon: 'Users',        desc: 'KULLANICI OLUŞTUR, DÜZENLE, YÖNETİMİ'},
    {key: 'log',          label: 'LOG KAYITLARI',       icon: 'Activity',     desc: 'SİSTEM OLAY GEÇMİŞİ'}
  ];

  /* ADMİN DEĞİLSE KULLANICI TAB'INI GİZLE */
  const isAdmin = user?.rol === 'admin';
  const gorunenTabs = isAdmin ? tabs : tabs.filter(t => t.key !== 'kullanici');

  /* AKTİF TAB */
  const [aktifTab, setAktifTab] = useState(() => {
    if (subPage && gorunenTabs.some(t => t.key === subPage)) return subPage;
    return gorunenTabs[0]?.key || 'tanimlamalar';
  });

  /* subPage DEĞİŞTİĞİNDE TAB GÜNCELLE */
  useEffect(() => {
    if (subPage && gorunenTabs.some(t => t.key === subPage)) {
      setAktifTab(subPage);
    }
  }, [subPage]);

  const aktifTabInfo = tabs.find(t => t.key === aktifTab);

  return (
    <div className="fade-in">
      {/* BAŞLIK */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div style={{width:40, height:40, borderRadius:10, background:`${C.accent}22`,
              display:'flex', alignItems:'center', justifyContent:'center'}}>
              <LIcon name="Settings" size={20} color={C.accent}/>
            </div>
            <div>
              <div style={{fontSize:16, fontWeight:800}}>SİSTEM YÖNETİMİ</div>
              <div style={{fontSize:11, color:C.textMuted}}>TANIMLAMALAR, KULLANICILAR VE SİSTEM LOGLARI</div>
            </div>
          </div>
          {user && (
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <LIcon name="User" size={14} color={C.textMuted}/>
              <span style={{fontSize:11, color:C.textSec}}>{user.ad_soyad}</span>
              <span style={{...S.badge(ROL_RENK[user.rol] || C.accent)}}>{ROL_LABEL[user.rol] || (user.rol || '').toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* TAB MENÜSÜ */}
        <div style={{display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 16px'}}>
          {gorunenTabs.map(tab => {
            const aktif = aktifTab === tab.key;
            return (
              <div key={tab.key} onClick={() => setAktifTab(tab.key)}
                style={{
                  display:'flex', alignItems:'center', gap:8, padding:'14px 20px',
                  cursor:'pointer', position:'relative', transition:'all .2s',
                  color: aktif ? C.accent : C.textSec,
                  fontWeight: aktif ? 700 : 500, fontSize:12,
                  borderBottom: aktif ? `2px solid ${C.accent}` : '2px solid transparent'
                }}
                onMouseEnter={e => { if (!aktif) e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { if (!aktif) e.currentTarget.style.color = C.textSec; }}>
                <LIcon name={tab.icon} size={15} color={aktif ? C.accent : C.textMuted}/>
                {tab.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* TAB İÇERİĞİ */}
      <div key={aktifTab} className="fade-in">
        {aktifTab === 'tanimlamalar' && <TanimlamalarTab/>}
        {aktifTab === 'kullanici' && isAdmin && <KullaniciTab/>}
        {aktifTab === 'log' && <LogTab/>}
      </div>
    </div>
  );
};
