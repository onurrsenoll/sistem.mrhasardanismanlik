const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef} = React;

/* ════════════════════════════════════════════════════════════════
   MR HASAR DANIŞMANLIK - SİSTEM YÖNETİMİ SAYFASI
   KULLANICI YÖNETİMİ | YETKİ YÖNETİMİ | FİRMA AYARLARI | LOG KAYITLARI
   ════════════════════════════════════════════════════════════════ */

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

/* ─── YETKİ MODÜL HARİTASI ─── */
const MODUL_YETKILERI = [
  {modul: 'dosya', label: 'DOSYA İŞLEMLERİ', icon: 'FolderOpen', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'ekle', label: 'EKLE'},
    {key: 'duzenle', label: 'DÜZENLE'},
    {key: 'sil', label: 'SİL'}
  ]},
  {modul: 'crm', label: 'CRM', icon: 'Users', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'ekle', label: 'EKLE'},
    {key: 'duzenle', label: 'DÜZENLE'},
    {key: 'sil', label: 'SİL'},
    {key: 'donustur', label: 'DÖNÜŞTÜR'}
  ]},
  {modul: 'hesaplamalar', label: 'HESAPLAMALAR', icon: 'Calculator', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'kullan', label: 'HESAPLA'}
  ]},
  {modul: 'servis', label: 'SERVİSLER', icon: 'Wrench', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'ekle', label: 'EKLE'},
    {key: 'duzenle', label: 'DÜZENLE'},
    {key: 'sil', label: 'SİL'}
  ]},
  {modul: 'ortaklar', label: 'ORTAKLAR', icon: 'Handshake', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'ekle', label: 'EKLE'},
    {key: 'duzenle', label: 'DÜZENLE'},
    {key: 'sil', label: 'SİL'}
  ]},
  {modul: 'muhasebe', label: 'MUHASEBE', icon: 'Landmark', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'ekle', label: 'EKLE'},
    {key: 'duzenle', label: 'DÜZENLE'},
    {key: 'sil', label: 'SİL'},
    {key: 'rapor', label: 'RAPOR'}
  ]},
  {modul: 'tanimlamalar', label: 'TANIMLAMALAR', icon: 'Database', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'ekle', label: 'EKLE'},
    {key: 'duzenle', label: 'DÜZENLE'},
    {key: 'sil', label: 'SİL'}
  ]},
  {modul: 'ajanda', label: 'AJANDA', icon: 'Calendar', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'ekle', label: 'EKLE'},
    {key: 'duzenle', label: 'DÜZENLE'},
    {key: 'sil', label: 'SİL'}
  ]},
  {modul: 'mesajlar', label: 'MESAJLAR', icon: 'Mail', islemler: [
    {key: 'goruntule', label: 'GÖRÜNTÜLE'},
    {key: 'gonder', label: 'GÖNDER'},
    {key: 'sil', label: 'SİL'}
  ]},
  {modul: 'sistem', label: 'SİSTEM', icon: 'Shield', islemler: [
    {key: 'kullanici_yonet', label: 'KULLANICI YÖNETİMİ'},
    {key: 'yetki_yonet', label: 'YETKİ YÖNETİMİ'},
    {key: 'ayarlar', label: 'AYARLAR'},
    {key: 'log', label: 'LOG GÖRÜNTÜLE'}
  ]}
];

/* ════════════════════════════════════════════════════════════════
   TAB 1 - KULLANICI YÖNETİMİ
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
      msg: `"${user.ad_soyad}" KULLANICISINI KALICI OLARAK SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ!`,
      action: 'delete'
    });
  };

  const confirmAction = async () => {
    if (!confirmState.id) return;
    if (confirmState.action === 'toggle') {
      await api.kullaniciUpdate({id: confirmState.id, aktif: confirmState.aktif});
    } else if (confirmState.action === 'delete') {
      /* KALICI SİLME - mode=hard */
      await api.req('/sistem/kullanici-delete.php?id=' + confirmState.id + '&mode=hard', {method: 'DELETE'});
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
   TAB 2 - YETKİ YÖNETİMİ
   ════════════════════════════════════════════════════════════════ */
const YetkiTab = () => {
  const {C, S, LIcon, Badge, Loading, EmptyState, api} = MR;
  const [kullanicilar, setKullanicilar] = useState([]);
  const [seciliKullanici, setSeciliKullanici] = useState('');
  const [yetkiler, setYetkiler] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mesaj, setMesaj] = useState({type: '', text: ''});
  const [kullaniciLoading, setKullaniciLoading] = useState(true);

  /* KULLANICI LİSTESİ YÜKLE */
  useEffect(() => {
    (async () => {
      setKullaniciLoading(true);
      const r = await api.kullaniciList();
      if (r?.success) {
        const items = r.data?.items || r.data || [];
        setKullanicilar(Array.isArray(items) ? items : []);
      }
      setKullaniciLoading(false);
    })();
  }, []);

  /* SEÇİLİ KULLANICI DEĞİŞTİĞİNDE YETKİLERİ YÜKLE */
  useEffect(() => {
    if (!seciliKullanici) {
      setYetkiler({});
      return;
    }
    (async () => {
      setLoading(true);
      setMesaj({type: '', text: ''});
      const r = await api.yetkiList({kullanici_id: seciliKullanici});
      if (r?.success) {
        const items = r.data?.items || r.data || [];
        const yMap = {};
        if (Array.isArray(items)) {
          items.forEach(y => {
            const key = `${y.modul}_${y.islem}`;
            yMap[key] = y.izin === 1 || y.izin === true || y.izin === '1';
          });
        }
        setYetkiler(yMap);
      } else {
        setYetkiler({});
      }
      setLoading(false);
    })();
  }, [seciliKullanici]);

  /* TEK YETKİ TOGGLE */
  const toggleYetki = (modul, islem) => {
    const key = `${modul}_${islem}`;
    setYetkiler(p => ({...p, [key]: !p[key]}));
  };

  /* MODÜL BAZLI TÜMÜNÜ SEÇ/KALDIR */
  const toggleModul = (modul, islemler) => {
    const hepsiSecili = islemler.every(i => yetkiler[`${modul}_${i.key}`]);
    const yeni = {...yetkiler};
    islemler.forEach(i => {
      yeni[`${modul}_${i.key}`] = !hepsiSecili;
    });
    setYetkiler(yeni);
  };

  /* MASTER TÜMÜNÜ SEÇ/KALDIR */
  const toggleHepsi = () => {
    let toplamIslem = 0;
    let seciliIslem = 0;
    MODUL_YETKILERI.forEach(m => {
      m.islemler.forEach(i => {
        toplamIslem++;
        if (yetkiler[`${m.modul}_${i.key}`]) seciliIslem++;
      });
    });
    const hepsiSecili = toplamIslem === seciliIslem;
    const yeni = {};
    MODUL_YETKILERI.forEach(m => {
      m.islemler.forEach(i => {
        yeni[`${m.modul}_${i.key}`] = !hepsiSecili;
      });
    });
    setYetkiler(yeni);
  };

  /* KAYDET */
  const kaydet = async () => {
    if (!seciliKullanici) return;
    setSaving(true);
    setMesaj({type: '', text: ''});

    const yetkiArr = [];
    MODUL_YETKILERI.forEach(m => {
      m.islemler.forEach(i => {
        yetkiArr.push({
          modul: m.modul,
          islem: i.key,
          izin: yetkiler[`${m.modul}_${i.key}`] ? 1 : 0
        });
      });
    });

    const r = await api.yetkiGuncelle({
      kullanici_id: seciliKullanici,
      yetkiler: yetkiArr
    });

    if (r?.success) {
      setMesaj({type: 'success', text: 'YETKİLER BAŞARIYLA KAYDEDİLDİ'});
    } else {
      setMesaj({type: 'error', text: r?.error || 'YETKİLER KAYDEDİLİRKEN HATA OLUŞTU'});
    }
    setSaving(false);
    setTimeout(() => setMesaj({type: '', text: ''}), 4000);
  };

  /* SEÇİLİ KULLANICI BİLGİSİ */
  const seciliUser = kullanicilar.find(u => String(u.id) === String(seciliKullanici));

  /* İSTATİSTİKLER */
  let toplamIslem = 0;
  let seciliIslem = 0;
  MODUL_YETKILERI.forEach(m => {
    m.islemler.forEach(i => {
      toplamIslem++;
      if (yetkiler[`${m.modul}_${i.key}`]) seciliIslem++;
    });
  });

  /* CHECKBOX BİLEŞENİ */
  const Checkbox = ({checked, onChange, label}) => (
    <div onClick={() => onChange(!checked)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer'
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? C.accent : C.borderLight}`,
        background: checked ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .2s', flexShrink: 0
      }}>
        {checked && <LIcon name="Check" size={14} color="#fff"/>}
      </div>
      <span style={{fontSize: 12, fontWeight: 500, color: checked ? C.text : C.textMuted}}>{label}</span>
    </div>
  );

  return (
    <div>
      {/* KULLANICI SEÇİCİ */}
      <div style={{...S.card, marginBottom: 16}}>
        <div style={{...S.cardHead, padding: '12px 16px'}}>
          <LIcon name="KeyRound" size={14} color={C.accent}/>
          <span style={{fontSize: 12, fontWeight: 700}}>KULLANICI SEÇİN</span>
        </div>
        <div style={{padding: 16}}>
          {kullaniciLoading ? <Loading/> : (
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <select style={{...S.select, flex: 1, maxWidth: 400}}
                value={seciliKullanici}
                onChange={e => setSeciliKullanici(e.target.value)}>
                <option value="">-- KULLANICI SEÇİNİZ --</option>
                {kullanicilar.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.ad_soyad} ({ROL_LABEL[u.rol] || (u.rol || '').toUpperCase()})
                  </option>
                ))}
              </select>
              {seciliUser && (
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: `${ROL_RENK[seciliUser.rol] || C.accent}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: ROL_RENK[seciliUser.rol] || C.accent
                  }}>
                    {(seciliUser.ad_soyad || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontSize: 13, fontWeight: 700}}>{seciliUser.ad_soyad}</div>
                    <div style={{fontSize: 10, color: C.textMuted}}>{seciliUser.email}</div>
                  </div>
                  <Badge text={ROL_LABEL[seciliUser.rol] || (seciliUser.rol || '').toUpperCase()}
                    color={ROL_RENK[seciliUser.rol] || C.accent}/>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MESAJ */}
      {mesaj.text && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 12, fontWeight: 600,
          background: mesaj.type === 'success' ? `${C.success}22` : `${C.danger}22`,
          border: `1px solid ${mesaj.type === 'success' ? C.success + '44' : C.danger + '44'}`,
          color: mesaj.type === 'success' ? C.success : C.danger,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <LIcon name={mesaj.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={16}
            color={mesaj.type === 'success' ? C.success : C.danger}/>
          {mesaj.text}
        </div>
      )}

      {!seciliKullanici ? (
        <EmptyState icon="KeyRound" title="KULLANICI SEÇİN"
          desc="YETKİLERİ DÜZENLEMEK İÇİN YUKARIDAKI LİSTEDEN BİR KULLANICI SEÇİNİZ"/>
      ) : loading ? <Loading/> : (
        <div>
          {/* BİLGİ BANNER */}
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 16,
            background: `${C.accent}11`, border: `1px solid ${C.accent}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <LIcon name="Info" size={16} color={C.accent}/>
              <span style={{fontSize: 12, color: C.textSec}}>
                <strong style={{color: C.text}}>{seciliUser?.ad_soyad}</strong> İÇİN YETKİLERİ DÜZENLİYORSUNUZ
                &nbsp;&middot;&nbsp; <strong style={{color: C.accent}}>{seciliIslem}</strong> / {toplamIslem} İZİN AKTİF
              </span>
            </div>
            <Checkbox checked={toplamIslem === seciliIslem && toplamIslem > 0}
              onChange={toggleHepsi} label="TÜMÜNÜ SEÇ"/>
          </div>

          {/* MODÜL KARTLARI */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20}}>
            {MODUL_YETKILERI.map(m => {
              const hepsiSecili = m.islemler.every(i => yetkiler[`${m.modul}_${i.key}`]);
              const birkacSecili = m.islemler.some(i => yetkiler[`${m.modul}_${i.key}`]) && !hepsiSecili;
              const seciliSay = m.islemler.filter(i => yetkiler[`${m.modul}_${i.key}`]).length;

              return (
                <div key={m.modul} style={{
                  ...S.card, overflow: 'hidden',
                  border: hepsiSecili ? `1px solid ${C.accent}44` :
                    birkacSecili ? `1px solid ${C.warning}44` : `1px solid ${C.border}`
                }}>
                  {/* MODÜL BAŞLIĞI */}
                  <div style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: hepsiSecili ? `${C.accent}11` : birkacSecili ? `${C.warning}08` : C.bgHover,
                    borderBottom: `1px solid ${C.border}`
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: hepsiSecili ? `${C.accent}22` : `${C.textMuted}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <LIcon name={m.icon} size={16} color={hepsiSecili ? C.accent : C.textMuted}/>
                      </div>
                      <div>
                        <div style={{fontSize: 12, fontWeight: 700, color: hepsiSecili ? C.accent : C.text}}>
                          {m.label}
                        </div>
                        <div style={{fontSize: 10, color: C.textMuted}}>
                          {seciliSay} / {m.islemler.length} İZİN AKTİF
                        </div>
                      </div>
                    </div>
                    <div onClick={() => toggleModul(m.modul, m.islemler)} style={{
                      cursor: 'pointer', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                      background: hepsiSecili ? `${C.danger}22` : `${C.accent}22`,
                      color: hepsiSecili ? C.danger : C.accent,
                      border: `1px solid ${hepsiSecili ? C.danger + '33' : C.accent + '33'}`,
                      transition: 'all .2s'
                    }}>
                      {hepsiSecili ? 'TÜMÜNÜ KALDIR' : 'TÜMÜNÜ SEÇ'}
                    </div>
                  </div>

                  {/* İŞLEM CHECKBOX'LARI */}
                  <div style={{padding: '8px 16px 12px'}}>
                    {m.islemler.map(i => (
                      <Checkbox key={i.key}
                        checked={!!yetkiler[`${m.modul}_${i.key}`]}
                        onChange={() => toggleYetki(m.modul, i.key)}
                        label={i.label}/>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* KAYDET BUTONU */}
          <div style={{
            ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{fontSize: 12, color: C.textMuted}}>
              <LIcon name="Info" size={14} color={C.textMuted} style={{verticalAlign: 'middle'}}/>{' '}
              DEĞİŞİKLİKLERİ KAYDETMEK İÇİN AŞAĞIDAKI BUTONA BASIN
            </div>
            <button style={{
              ...S.btn, ...S.btnP, fontSize: 13, padding: '12px 32px', fontWeight: 700,
              opacity: saving ? 0.7 : 1
            }} onClick={kaydet} disabled={saving}>
              <LIcon name="Save" size={16} color="#fff"/>
              {saving ? 'KAYDEDİLİYOR...' : 'YETKİLERİ KAYDET'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   TAB 3 - FİRMA AYARLARI
   ════════════════════════════════════════════════════════════════ */
const AyarlarTab = () => {
  const {C, S, LIcon, Badge, Loading, api} = MR;
  const [ayarlar, setAyarlar] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mesaj, setMesaj] = useState({type: '', text: ''});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef(null);

  /* AYARLAR YÜKLE */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await api.ayarlarList();
      if (r?.success) {
        const data = r.data || {};
        setAyarlar(data);
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
      setLoading(false);
    })();
  }, []);

  const up = (k, v) => setAyarlar(p => ({...p, [k]: v}));

  /* AYARLARI KAYDET */
  const kaydet = async () => {
    setSaving(true);
    setMesaj({type: '', text: ''});
    const r = await api.ayarlarGuncelle(ayarlar);
    if (r?.success) {
      setMesaj({type: 'success', text: 'AYARLAR BAŞARIYLA KAYDEDİLDİ'});
    } else {
      setMesaj({type: 'error', text: r?.error || 'AYARLAR KAYDEDİLİRKEN HATA OLUŞTU'});
    }
    setSaving(false);
    setTimeout(() => setMesaj({type: '', text: ''}), 4000);
  };

  /* LOGO DOSYA SEÇ */
  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    /* DOSYA TİPİ KONTROL */
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setMesaj({type: 'error', text: 'GEÇERSİZ DOSYA TİPİ. SADECE PNG, JPG VEYA SVG KABUL EDİLİR'});
      setTimeout(() => setMesaj({type: '', text: ''}), 4000);
      return;
    }

    /* BOYUT KONTROL (MAX 2MB) */
    if (file.size > 2 * 1024 * 1024) {
      setMesaj({type: 'error', text: 'DOSYA BOYUTU ÇOK BÜYÜK. MAKSİMUM 2MB KABUL EDİLİR'});
      setTimeout(() => setMesaj({type: '', text: ''}), 4000);
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* LOGO YÜKLE */
  const logoYukle = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    setMesaj({type: '', text: ''});
    const r = await api.logoYukle(logoFile);
    if (r?.success) {
      setMesaj({type: 'success', text: 'LOGO BAŞARIYLA YÜKLENDİ'});
      setLogoFile(null);
      if (r.data?.logo_url) {
        setLogoPreview(r.data.logo_url);
        up('logo_url', r.data.logo_url);
      }
    } else {
      setMesaj({type: 'error', text: r?.error || 'LOGO YÜKLENİRKEN HATA OLUŞTU'});
    }
    setLogoUploading(false);
    setTimeout(() => setMesaj({type: '', text: ''}), 4000);
  };

  /* LOGO KALDIR */
  const logoKaldir = () => {
    setLogoPreview('');
    setLogoFile(null);
    up('logo_url', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return <Loading/>;

  /* GÖRÜNÜM AYARLARI VARSAYILAN DEĞERLER */
  const baslikFontBoyut = parseInt(ayarlar.baslik_font_boyut) || 22;
  const baslikRenk = ayarlar.baslik_renk || '#ffffff';
  const sloganFontBoyut = parseInt(ayarlar.slogan_font_boyut) || 10;
  const sloganRenk = ayarlar.slogan_renk || '#94a3b8';

  return (
    <div>
      {/* MESAJ */}
      {mesaj.text && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 12, fontWeight: 600,
          background: mesaj.type === 'success' ? `${C.success}22` : `${C.danger}22`,
          border: `1px solid ${mesaj.type === 'success' ? C.success + '44' : C.danger + '44'}`,
          color: mesaj.type === 'success' ? C.success : C.danger,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <LIcon name={mesaj.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={16}
            color={mesaj.type === 'success' ? C.success : C.danger}/>
          {mesaj.text}
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
        {/* ─── BÖLÜM 1: FİRMA BİLGİLERİ ─── */}
        <div style={{...S.card, gridColumn: '1 / -1'}}>
          <div style={{...S.cardHead, padding: '12px 16px'}}>
            <LIcon name="Building2" size={14} color={C.accent}/>
            <span style={{fontSize: 12, fontWeight: 700}}>FİRMA BİLGİLERİ</span>
          </div>
          <div style={{padding: 16}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
              <div>
                <label style={S.label}>FİRMA ADI</label>
                <input style={S.input} value={ayarlar.firma_adi || ''}
                  onChange={e => up('firma_adi', e.target.value)} placeholder="FİRMA ADI GİRİNİZ"/>
              </div>
              <div>
                <label style={S.label}>SLOGAN</label>
                <input style={S.input} value={ayarlar.slogan || ''}
                  onChange={e => up('slogan', e.target.value)} placeholder="FİRMA SLOGANI"/>
              </div>
              <div>
                <label style={S.label}>TELEFON</label>
                <input style={S.input} type="tel" value={ayarlar.firma_telefon || ''}
                  onChange={e => up('firma_telefon', e.target.value)} placeholder="0XXX XXX XXXX"/>
              </div>
              <div>
                <label style={S.label}>E-POSTA</label>
                <input style={S.input} type="email" value={ayarlar.firma_email || ''}
                  onChange={e => up('firma_email', e.target.value)} placeholder="INFO@FIRMA.COM"/>
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={S.label}>ADRES</label>
                <textarea style={{...S.input, minHeight: 60, resize: 'vertical'}} value={ayarlar.firma_adres || ''}
                  onChange={e => up('firma_adres', e.target.value)} placeholder="FİRMA ADRESİ GİRİNİZ"/>
              </div>
              <div>
                <label style={S.label}>İL</label>
                <select style={S.select} value={ayarlar.firma_il || ''}
                  onChange={e => up('firma_il', e.target.value)}>
                  <option value="">İL SEÇİNİZ</option>
                  {(MR.ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>VERGİ DAİRESİ</label>
                <input style={S.input} value={ayarlar.vergi_dairesi || ''}
                  onChange={e => up('vergi_dairesi', e.target.value)} placeholder="VERGİ DAİRESİ"/>
              </div>
              <div>
                <label style={S.label}>VERGİ NO</label>
                <input style={S.input} value={ayarlar.vergi_no || ''}
                  onChange={e => up('vergi_no', e.target.value)} placeholder="VERGİ NUMARASI"/>
              </div>
            </div>
          </div>
        </div>

        {/* ─── BÖLÜM 2: LOGO YÖNETİMİ ─── */}
        <div style={S.card}>
          <div style={{...S.cardHead, padding: '12px 16px'}}>
            <LIcon name="Image" size={14} color={C.accent}/>
            <span style={{fontSize: 12, fontWeight: 700}}>LOGO YÖNETİMİ</span>
          </div>
          <div style={{padding: 16}}>
            {/* LOGO ÖNİZLEME */}
            <div style={{
              width: '100%', minHeight: 120, borderRadius: 8,
              border: `2px dashed ${C.borderLight}`, background: C.bgHover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, overflow: 'hidden'
            }}>
              {logoPreview ? (
                <img src={logoPreview} alt="LOGO" style={{maxWidth: '100%', maxHeight: 120, objectFit: 'contain'}}/>
              ) : (
                <div style={{textAlign: 'center', padding: 20}}>
                  <LIcon name="Image" size={32} color={C.textMuted}/>
                  <div style={{fontSize: 11, color: C.textMuted, marginTop: 8}}>LOGO YÜKLENMEMİŞ</div>
                </div>
              )}
            </div>

            <div style={{fontSize: 10, color: C.textMuted, marginBottom: 12}}>
              KABUL EDİLEN FORMATLAR: PNG, JPG, SVG &middot; MAKSİMUM 2MB
            </div>

            <input type="file" ref={fileInputRef} accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              style={{display: 'none'}} onChange={handleLogoSelect}/>

            <div style={{display: 'flex', gap: 8}}>
              <button style={{...S.btn, ...S.btnP, fontSize: 11, padding: '8px 16px', flex: 1}}
                onClick={() => fileInputRef.current?.click()}>
                <LIcon name="Upload" size={14} color="#fff"/> LOGO SEÇ
              </button>
              {logoFile && (
                <button style={{...S.btn, ...S.btnS, fontSize: 11, padding: '8px 16px', flex: 1,
                  opacity: logoUploading ? 0.7 : 1}}
                  onClick={logoYukle} disabled={logoUploading}>
                  <LIcon name="Save" size={14} color="#fff"/>
                  {logoUploading ? 'YÜKLENİYOR...' : 'LOGOYU YÜKLE'}
                </button>
              )}
              {logoPreview && (
                <button style={{...S.btn, ...S.btnG, fontSize: 11, padding: '8px 16px',
                  color: C.danger, borderColor: C.danger + '33'}}
                  onClick={logoKaldir}>
                  <LIcon name="Trash2" size={14} color={C.danger}/> KALDIR
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── BÖLÜM 3: GÖRÜNÜM AYARLARI ─── */}
        <div style={S.card}>
          <div style={{...S.cardHead, padding: '12px 16px'}}>
            <LIcon name="Palette" size={14} color={C.accent}/>
            <span style={{fontSize: 12, fontWeight: 700}}>GÖRÜNÜM AYARLARI</span>
          </div>
          <div style={{padding: 16}}>
            {/* CANLI ÖNİZLEME */}
            <div style={{
              background: '#0f172a', borderRadius: 8, padding: '16px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              {logoPreview && (
                <img src={logoPreview} alt="LOGO" style={{width: 36, height: 36, objectFit: 'contain', borderRadius: 4}}/>
              )}
              <div>
                <div style={{
                  fontSize: baslikFontBoyut, fontWeight: 800, color: baslikRenk,
                  lineHeight: 1.2, letterSpacing: '-0.5px'
                }}>
                  {ayarlar.firma_adi || 'MR HASAR'}
                </div>
                <div style={{
                  fontSize: sloganFontBoyut, fontWeight: 500, color: sloganRenk,
                  letterSpacing: '1px', marginTop: 2
                }}>
                  {ayarlar.slogan || 'DANIŞMANLIK'}
                </div>
              </div>
            </div>

            {/* BAŞLIK FONT BOYUTU */}
            <div style={{marginBottom: 16}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                <label style={{...S.label, margin: 0}}>BAŞLIK FONT BOYUTU</label>
                <span style={{fontSize: 11, fontWeight: 700, color: C.accent}}>{baslikFontBoyut}PX</span>
              </div>
              <input type="range" min="14" max="30" value={baslikFontBoyut}
                onChange={e => up('baslik_font_boyut', e.target.value)}
                style={{width: '100%', accentColor: C.accent}}/>
            </div>

            {/* BAŞLIK RENGİ */}
            <div style={{marginBottom: 16}}>
              <label style={S.label}>BAŞLIK RENGİ</label>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <input type="color" value={baslikRenk}
                  onChange={e => up('baslik_renk', e.target.value)}
                  style={{width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0}}/>
                <input style={{...S.input, flex: 1, fontFamily: 'monospace', fontSize: 11}} value={baslikRenk}
                  onChange={e => up('baslik_renk', e.target.value)} placeholder="#FFFFFF"/>
              </div>
            </div>

            {/* SLOGAN FONT BOYUTU */}
            <div style={{marginBottom: 16}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                <label style={{...S.label, margin: 0}}>SLOGAN FONT BOYUTU</label>
                <span style={{fontSize: 11, fontWeight: 700, color: C.accent}}>{sloganFontBoyut}PX</span>
              </div>
              <input type="range" min="8" max="16" value={sloganFontBoyut}
                onChange={e => up('slogan_font_boyut', e.target.value)}
                style={{width: '100%', accentColor: C.accent}}/>
            </div>

            {/* SLOGAN RENGİ */}
            <div>
              <label style={S.label}>SLOGAN RENGİ</label>
              <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <input type="color" value={sloganRenk}
                  onChange={e => up('slogan_renk', e.target.value)}
                  style={{width: 40, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0}}/>
                <input style={{...S.input, flex: 1, fontFamily: 'monospace', fontSize: 11}} value={sloganRenk}
                  onChange={e => up('slogan_renk', e.target.value)} placeholder="#94A3B8"/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KAYDET BUTONU */}
      <div style={{
        ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{fontSize: 12, color: C.textMuted}}>
          <LIcon name="Info" size={14} color={C.textMuted} style={{verticalAlign: 'middle'}}/>{' '}
          TÜM AYARLARI KAYDETMEK İÇİN BUTONA BASIN
        </div>
        <button style={{
          ...S.btn, ...S.btnP, fontSize: 13, padding: '12px 32px', fontWeight: 700,
          opacity: saving ? 0.7 : 1
        }} onClick={kaydet} disabled={saving}>
          <LIcon name="Save" size={16} color="#fff"/>
          {saving ? 'KAYDEDİLİYOR...' : 'AYARLARI KAYDET'}
        </button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   TAB 4 - LOG KAYITLARI
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
    {key: 'kullanici', label: 'KULLANICI YÖNETİMİ', icon: 'Users',     desc: 'KULLANICI OLUŞTUR, DÜZENLE, YÖNETİMİ'},
    {key: 'yetki',     label: 'YETKİ YÖNETİMİ',     icon: 'KeyRound',  desc: 'MODÜL BAZLI İZİN YÖNETİMİ'},
    {key: 'ayarlar',   label: 'FİRMA AYARLARI',      icon: 'Settings',  desc: 'LOGO, ÜNVAN, SLOGAN, BİLGİLER'},
    {key: 'log',       label: 'LOG KAYITLARI',        icon: 'Activity',  desc: 'SİSTEM OLAY GEÇMİŞİ'}
  ];

  /* ADMİN DEĞİLSE SADECE LOG TAB'INI GÖSTER */
  const isAdmin = user?.rol === 'admin';
  const gorunenTabs = isAdmin ? tabs : tabs.filter(t => t.key === 'log');

  /* AKTİF TAB */
  const [aktifTab, setAktifTab] = useState(() => {
    if (subPage && gorunenTabs.some(t => t.key === subPage)) return subPage;
    return gorunenTabs[0]?.key || 'kullanici';
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
              <div style={{fontSize:11, color:C.textMuted}}>KULLANICILAR, YETKİLER, AYARLAR VE SİSTEM LOGLARI</div>
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
        <div style={{display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 16px', overflowX:'auto'}}>
          {gorunenTabs.map(tab => {
            const aktif = aktifTab === tab.key;
            return (
              <div key={tab.key} onClick={() => setAktifTab(tab.key)}
                style={{
                  display:'flex', alignItems:'center', gap:8, padding:'14px 20px',
                  cursor:'pointer', position:'relative', transition:'all .2s',
                  color: aktif ? C.accent : C.textSec,
                  fontWeight: aktif ? 700 : 500, fontSize:12, whiteSpace:'nowrap',
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
        {aktifTab === 'kullanici' && isAdmin && <KullaniciTab/>}
        {aktifTab === 'yetki' && isAdmin && <YetkiTab/>}
        {aktifTab === 'ayarlar' && isAdmin && <AyarlarTab/>}
        {aktifTab === 'log' && <LogTab/>}
      </div>
    </div>
  );
};
