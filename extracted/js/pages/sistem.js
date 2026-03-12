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
/* ─── YETKİ MODÜL HARİTASI (ALT MODÜL BAZLI) ─── */
/* Her modülün islemleri = menü alt öğeleri (sub-items) */
const MODUL_YETKILERI = [
  {modul: 'dosya', label: 'DOSYA İŞLEMLERİ', icon: 'FolderOpen', islemler: [
    {key: 'dosya-liste', label: 'DOSYA LİSTESİ'},
    {key: 'dosya-yeni', label: 'YENİ DOSYA'},
    {key: 'dosya-detay', label: 'DOSYA DETAY'},
    {key: 'dosya-duzenle', label: 'DOSYA DÜZENLE'},
    {key: 'dosya-sil', label: 'DOSYA SİL'},
    {key: 'dosya-toplu-sil', label: 'TOPLU SİLME'},
    {key: 'dosya-asama', label: 'AŞAMA DEĞİŞTİR'},
    {key: 'dosya-portal', label: 'PORTAL ERİŞİMİ OLUŞTUR'},
    {key: 'dosya-kapat', label: 'DOSYA KAPAT'},
    {key: 'dosya-masraf-ekle', label: 'MASRAF EKLE'},
    {key: 'dosya-masraf-sil', label: 'MASRAF SİL'},
    {key: 'dosya-masraf-ode', label: 'MASRAF ÖDE'},
    {key: 'dosya-evrak-yukle', label: 'EVRAK YÜKLE'},
    {key: 'dosya-evrak-sil', label: 'EVRAK SİL'},
    {key: 'dosya-evrak-indir', label: 'EVRAK İNDİR'},
    {key: 'dosya-hesap-ozeti', label: 'HESAP ÖZETİ GÖRÜNTÜLE'}
  ]},
  {modul: 'crm', label: 'CRM / SAHA', icon: 'Users', islemler: [
    {key: 'crm-liste', label: 'CRM LİSTESİ'},
    {key: 'crm-yeni', label: 'YENİ KAYIT'},
    {key: 'crm-duzenle', label: 'KAYIT DÜZENLE'},
    {key: 'crm-sil', label: 'KAYIT SİL'},
    {key: 'crm-toplu-sil', label: 'TOPLU SİLME'},
    {key: 'crm-arama', label: 'ARAMA LİSTESİ'},
    {key: 'saha-liste', label: 'SAHA DOSYALARI'},
    {key: 'saha-yeni', label: 'YENİ SAHA KAYDI'},
    {key: 'saha-duzenle', label: 'SAHA KAYDI DÜZENLE'},
    {key: 'saha-sil', label: 'SAHA KAYDI SİL'},
    {key: 'saha-onay', label: 'SAHA KAYDI ONAYLA'},
    {key: 'saha-red', label: 'SAHA KAYDI REDDET'}
  ]},
  {modul: 'hesaplamalar', label: 'HESAPLAMALAR', icon: 'Calculator', islemler: [
    {key: 'hesap-adk', label: 'ARAÇ DEĞER KAYBI'},
    {key: 'hesap-bh', label: 'BEDENİ HASAR'},
    {key: 'hesap-adk-rapor', label: 'ADK RAPOR OLUŞTUR'},
    {key: 'hesap-bh-rapor', label: 'BH RAPOR OLUŞTUR'}
  ]},
  {modul: 'paydaslar', label: 'PAYDAŞLAR / ORTAKLAR', icon: 'Handshake', islemler: [
    {key: 'ortaklar-ortaklar', label: 'İŞ ORTAKLARI'},
    {key: 'ortaklar-paydaslar', label: 'İŞ PAYDAŞLARI'},
    {key: 'ortaklar-yeni', label: 'YENİ ORTAK/PAYDAŞ'},
    {key: 'ortaklar-detay', label: 'ORTAK/PAYDAŞ DETAY'},
    {key: 'ortaklar-duzenle', label: 'DÜZENLE'},
    {key: 'ortaklar-sil', label: 'SİL'},
    {key: 'ortaklar-toplu-sil', label: 'ORTAK TOPLU SİLME'},
    {key: 'paydaslar-toplu-sil', label: 'PAYDAŞ TOPLU SİLME'},
    {key: 'personel-liste', label: 'PERSONEL'}
  ]},
  {modul: 'police', label: 'POLİÇE', icon: 'FileCheck', islemler: [
    {key: 'police-liste', label: 'POLİÇE LİSTESİ'},
    {key: 'police-yeni', label: 'YENİ POLİÇE'},
    {key: 'police-duzenle', label: 'POLİÇE DÜZENLE'},
    {key: 'police-sil', label: 'POLİÇE SİL'},
    {key: 'police-toplu-sil', label: 'TOPLU SİLME'},
    {key: 'police-excel', label: 'EXCEL İHRAÇ'},
    {key: 'police-yenileme', label: 'YENİLEME TAKİBİ'},
    {key: 'police-tahsilat', label: 'TAHSİLAT / CARİ'},
    {key: 'police-rapor', label: 'RAPORLAR'},
    {key: 'police-kazanc', label: 'KAZANÇ'}
  ]},
  {modul: 'muhasebe', label: 'MUHASEBE', icon: 'Landmark', islemler: [
    {key: 'muhasebe-gelir', label: 'GELİR YÖNETİMİ'},
    {key: 'muhasebe-gelir-ekle', label: 'GELİR EKLE'},
    {key: 'muhasebe-gelir-sil', label: 'GELİR SİL'},
    {key: 'muhasebe-gider', label: 'GİDER YÖNETİMİ'},
    {key: 'muhasebe-gider-ekle', label: 'GİDER EKLE'},
    {key: 'muhasebe-gider-sil', label: 'GİDER SİL'},
    {key: 'muhasebe-komisyon', label: 'KOMİSYON / PRİM'},
    {key: 'muhasebe-kasa', label: 'KASA / BANKA'},
    {key: 'muhasebe-kasa-sil', label: 'KASA SİL (SİSTEM YÖNETİCİSİ)'},
    {key: 'muhasebe-transfer', label: 'KASA TRANSFERİ'},
    {key: 'muhasebe-hareket-duzenle', label: 'HESAP HAREKETİ DÜZENLE (SİSTEM YÖNETİCİSİ)'},
    {key: 'muhasebe-hareket-sil', label: 'HESAP HAREKETİ SİL (SİSTEM YÖNETİCİSİ)'},
    {key: 'muhasebe-ortakkasa', label: 'ORTAK KASA'},
    {key: 'muhasebe-maliyet', label: 'MALİYET ANALİZİ'},
    {key: 'muhasebe-rapor', label: 'FİNANSAL RAPORLAR'},
    {key: 'muhasebe-kapanis', label: 'KAPANIŞ RAPORU'},
    {key: 'muhasebe-aysonu', label: 'AY SONU RAPORU'},
    {key: 'muhasebe-bakiye-sifirla', label: 'BAKİYE SIFIRLA (SİSTEM YÖNETİCİSİ)'},
    {key: 'personel-liste', label: 'PERSONEL LİSTESİ'},
    {key: 'personel-yeni', label: 'YENİ PERSONEL'},
    {key: 'personel-duzenle', label: 'PERSONEL DÜZENLE'},
    {key: 'personel-sil', label: 'PERSONEL SİL'},
    {key: 'personel-toplu-sil', label: 'PERSONEL TOPLU SİLME'},
    {key: 'personel-hakedis', label: 'HAKEDİŞ TAKİBİ'},
    {key: 'personel-maas-ode', label: 'PERSONEL MAAŞ/HAKEDİŞ ÖDEME'}
  ]},
  {modul: 'masraf', label: 'MASRAF YÖNETİMİ', icon: 'Receipt', islemler: [
    {key: 'masraf-goruntule', label: 'MASRAFLARI GÖRÜNTÜLE'},
    {key: 'masraf-ekle', label: 'MASRAF EKLE'},
    {key: 'masraf-duzenle', label: 'MASRAF DÜZENLE'},
    {key: 'masraf-sil', label: 'MASRAF SİL'},
    {key: 'masraf-ode', label: 'MASRAF ÖDE'}
  ]},
  {modul: 'evrak', label: 'EVRAK YÖNETİMİ', icon: 'FileUp', islemler: [
    {key: 'evrak-goruntule', label: 'EVRAK GÖRÜNTÜLE'},
    {key: 'evrak-yukle', label: 'EVRAK YÜKLE'},
    {key: 'evrak-sil', label: 'EVRAK SİL'},
    {key: 'evrak-indir', label: 'EVRAK İNDİR'}
  ]},
  {modul: 'ajanda', label: 'AJANDA', icon: 'Calendar', islemler: [
    {key: 'goruntule', label: 'AJANDA GÖRÜNTÜLE'},
    {key: 'ajanda-ekle', label: 'ETKİNLİK EKLE'},
    {key: 'ajanda-duzenle', label: 'ETKİNLİK DÜZENLE'},
    {key: 'ajanda-sil', label: 'ETKİNLİK SİL'},
    {key: 'ajanda-toplu-sil', label: 'TOPLU SİLME'}
  ]},
  {modul: 'mesajlar', label: 'MESAJLAR', icon: 'MessageSquare', islemler: [
    {key: 'mesaj-goruntule', label: 'MESAJLARI GÖRÜNTÜLE'},
    {key: 'mesaj-gonder', label: 'MESAJ GÖNDER'},
    {key: 'mesaj-sil', label: 'MESAJ SİL'},
    {key: 'mesaj-toplu-sil', label: 'TOPLU SİLME'}
  ]},
  {modul: 'bildirim', label: 'BİLDİRİMLER', icon: 'Bell', islemler: [
    {key: 'bildirim-goruntule', label: 'BİLDİRİMLERİ GÖRÜNTÜLE'},
    {key: 'bildirim-sil', label: 'BİLDİRİM SİL'}
  ]},
  {modul: 'ictihat', label: 'İÇTİHAT', icon: 'Scale', islemler: [
    {key: 'ictihat-yargitay', label: 'YARGITAY KARARLARI'},
    {key: 'ictihat-tahkim', label: 'TAHKİM KABUL ÖRNEKLERİ'},
    {key: 'ictihat-police-limit', label: 'POLİÇE LİMİT TABLOLARI'},
    {key: 'ictihat-kusur-emsal', label: 'KUSUR EMSAL DOSYALARI'}
  ]},
  {modul: 'sistem', label: 'SİSTEM', icon: 'Shield', islemler: [
    {key: 'sistem-kullanici', label: 'KULLANICI YÖNETİMİ'},
    {key: 'sistem-yetki', label: 'YETKİ YÖNETİMİ'},
    {key: 'sistem-ayarlar', label: 'FİRMA AYARLARI'},
    {key: 'sistem-sms', label: 'SMS BİLDİRİM'},
    {key: 'sistem-portal', label: 'PORTAL AYARLARI'},
    {key: 'sistem-guvenlik', label: 'CİHAZ GÜVENLİĞİ'},
    {key: 'sistem-2fa', label: '2FA YÖNETİMİ'},
    {key: 'sistem-veri', label: 'VERİ YÖNETİMİ'},
    {key: 'sistem-log', label: 'LOG KAYITLARI'},
    {key: 'mesajlar-sistem', label: 'SİSTEM BİLDİRİMLERİ'},
    {key: 'tanimlamalar-dosya', label: 'DOSYA TANIMLAMALARI'},
    {key: 'tanimlamalar-evrak', label: 'EVRAK TANIMLAMALARI'},
    {key: 'tanimlamalar-finansal', label: 'FİNANSAL TANIMLAMALAR'},
    {key: 'tanimlamalar-sablon', label: 'MATBU EVRAK / SÖZLEŞME'},
    {key: 'tanimlamalar-genel', label: 'GENEL TANIMLAMALAR'},
    {key: 'tanimlamalar-ekle', label: 'TANIMLAMA EKLE'},
    {key: 'tanimlamalar-duzenle', label: 'TANIMLAMA DÜZENLE'},
    {key: 'tanimlamalar-sil', label: 'TANIMLAMA SİL'},
    {key: 'tanimlamalar-sablon-ekle', label: 'ŞABLON EKLE'},
    {key: 'tanimlamalar-sablon-duzenle', label: 'ŞABLON DÜZENLE'},
    {key: 'sistem-konum', label: 'KONUM TAKİBİ'},
    {key: 'sistem-aktarim', label: 'TOPLU AKTARIM'}
  ]},
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
  const [sidebarLogoFile, setSidebarLogoFile] = useState(null);
  const [sidebarLogoPreview, setSidebarLogoPreview] = useState('');
  const [sidebarLogoUploading, setSidebarLogoUploading] = useState(false);
  const sidebarFileInputRef = useRef(null);
  const [apiTest, setApiTest] = useState({testing: false, sonuc: null});

  /* AYARLAR YÜKLE */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await api.ayarlarList();
      if (r?.success) {
        const data = r.data || {};
        setAyarlar(data);
        if (data.logo_url) setLogoPreview(data.logo_url);
        if (data.sidebar_logo_url) setSidebarLogoPreview(data.sidebar_logo_url);
      }
      setLoading(false);
    })();
  }, []);

  const up = (k, v) => setAyarlar(p => ({...p, [k]: v}));

  /* GEMİNİ API TESTİ */
  const geminiTestEt = async (key) => {
    setApiTest({testing: true, sonuc: null});
    try {
      const r = await api.geminiTest(key ? {api_key: key} : {});
      if (r?.success && r.data) {
        setApiTest({testing: false, sonuc: r.data});
      } else {
        setApiTest({testing: false, sonuc: {
          basarili: false,
          ozet: r?.error || 'TEST SIRASINDA HATA OLUŞTU',
          hata_detay: r?.error || 'BİLİNMEYEN HATA',
          curl_destegi: r?.data?.curl_destegi ?? null,
          file_get_contents_destegi: r?.data?.file_get_contents_destegi ?? null,
          yontem: r?.data?.yontem || '',
          http_kodu: r?.data?.http_kodu || 0
        }});
      }
    } catch(e) {
      setApiTest({testing: false, sonuc: {basarili: false, ozet: 'BAĞLANTI HATASI - SUNUCUYA ULAŞILAMIYOR', hata_detay: 'SUNUCUYA BAĞLANTI KURULAMADI', curl_destegi: null, file_get_contents_destegi: null}});
    }
  };

  /* AYARLARI KAYDET */
  const kaydet = async () => {
    setSaving(true);
    setMesaj({type: '', text: ''});
    const r = await api.ayarlarGuncelle(ayarlar);
    if (r?.success) {
      setMesaj({type: 'success', text: 'AYARLAR BAŞARIYLA KAYDEDİLDİ'});
      // KAYDETME SONRASI GEMİNİ API TESTİ YAP
      geminiTestEt(ayarlar.gemini_api_key);
    } else {
      setMesaj({type: 'error', text: r?.error || 'AYARLAR KAYDEDİLİRKEN HATA OLUŞTU'});
    }
    setSaving(false);
    setTimeout(() => setMesaj({type: '', text: ''}), 6000);
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

  /* SIDEBAR LOGO DOSYA SEÇ */
  const handleSidebarLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setMesaj({type: 'error', text: 'GEÇERSİZ DOSYA TİPİ. SADECE PNG, JPG VEYA SVG KABUL EDİLİR'});
      setTimeout(() => setMesaj({type: '', text: ''}), 4000);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMesaj({type: 'error', text: 'DOSYA BOYUTU ÇOK BÜYÜK. MAKSİMUM 2MB KABUL EDİLİR'});
      setTimeout(() => setMesaj({type: '', text: ''}), 4000);
      return;
    }
    setSidebarLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSidebarLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* SIDEBAR LOGO YÜKLE */
  const sidebarLogoYukle = async () => {
    if (!sidebarLogoFile) return;
    setSidebarLogoUploading(true);
    setMesaj({type: '', text: ''});
    const r = await api.sidebarLogoYukle(sidebarLogoFile);
    if (r?.success) {
      setMesaj({type: 'success', text: 'MENÜ LOGOSU BAŞARIYLA YÜKLENDİ'});
      setSidebarLogoFile(null);
      if (r.data?.sidebar_logo_url) {
        setSidebarLogoPreview(r.data.sidebar_logo_url);
        up('sidebar_logo_url', r.data.sidebar_logo_url);
        MR.sidebarLogoUrl = r.data.sidebar_logo_url;
        window.dispatchEvent(new Event('mr-sidebar-logo-degisti'));
      }
    } else {
      setMesaj({type: 'error', text: r?.error || 'MENÜ LOGOSU YÜKLENİRKEN HATA OLUŞTU'});
    }
    setSidebarLogoUploading(false);
    setTimeout(() => setMesaj({type: '', text: ''}), 4000);
  };

  /* SIDEBAR LOGO KALDIR */
  const sidebarLogoKaldir = () => {
    setSidebarLogoPreview('');
    setSidebarLogoFile(null);
    up('sidebar_logo_url', '');
    MR.sidebarLogoUrl = '';
    window.dispatchEvent(new Event('mr-sidebar-logo-degisti'));
    if (sidebarFileInputRef.current) sidebarFileInputRef.current.value = '';
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

        {/* ─── BÖLÜM 2B: MENÜ LOGOSU YÖNETİMİ ─── */}
        <div style={S.card}>
          <div style={{...S.cardHead, padding: '12px 16px'}}>
            <LIcon name="Layout" size={14} color={C.accent}/>
            <span style={{fontSize: 12, fontWeight: 700}}>MENÜ LOGOSU</span>
          </div>
          <div style={{padding: 16}}>
            <div style={{fontSize: 10, color: C.textMuted, marginBottom: 12}}>
              ÜST MENÜ ÇUBUĞUNUN SOL TARAFINDA GÖRÜNECEK LOGO. TIKLANDIĞINDA ANASAYFAYA YÖNLENDİRİR.
            </div>
            {/* ÖNİZLEME */}
            <div style={{
              width: '100%', minHeight: 100, borderRadius: 8,
              border: `2px dashed ${C.borderLight}`, background: C.bgHover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, overflow: 'hidden'
            }}>
              {sidebarLogoPreview ? (
                <img src={sidebarLogoPreview} alt="MENÜ LOGO" style={{maxWidth: '100%', maxHeight: 100, objectFit: 'contain', padding: 8}}/>
              ) : (
                <div style={{textAlign: 'center', padding: 20}}>
                  <LIcon name="Layout" size={28} color={C.textMuted}/>
                  <div style={{fontSize: 11, color: C.textMuted, marginTop: 8}}>MENÜ LOGOSU YÜKLENMEMİŞ</div>
                </div>
              )}
            </div>

            <div style={{fontSize: 10, color: C.textMuted, marginBottom: 12}}>
              KABUL EDİLEN FORMATLAR: PNG, JPG, SVG &middot; MAKSİMUM 2MB &middot; ÖNERİLEN: YATAY LOGO
            </div>

            <input type="file" ref={sidebarFileInputRef} accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              style={{display: 'none'}} onChange={handleSidebarLogoSelect}/>

            <div style={{display: 'flex', gap: 8}}>
              <button style={{...S.btn, ...S.btnP, fontSize: 11, padding: '8px 16px', flex: 1}}
                onClick={() => sidebarFileInputRef.current?.click()}>
                <LIcon name="Upload" size={14} color="#fff"/> LOGO SEÇ
              </button>
              {sidebarLogoFile && (
                <button style={{...S.btn, ...S.btnS, fontSize: 11, padding: '8px 16px', flex: 1,
                  opacity: sidebarLogoUploading ? 0.7 : 1}}
                  onClick={sidebarLogoYukle} disabled={sidebarLogoUploading}>
                  <LIcon name="Save" size={14} color="#fff"/>
                  {sidebarLogoUploading ? 'YÜKLENİYOR...' : 'LOGOYU YÜKLE'}
                </button>
              )}
              {sidebarLogoPreview && (
                <button style={{...S.btn, ...S.btnG, fontSize: 11, padding: '8px 16px',
                  color: C.danger, borderColor: C.danger + '33'}}
                  onClick={sidebarLogoKaldir}>
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

      {/* ─── BÖLÜM 4: AI API AYARLARI ─── */}
      <div style={{...S.card, marginBottom: 16}}>
        <div style={{...S.cardHead, padding: '12px 16px'}}>
          <LIcon name="Sparkles" size={14} color={C.warning}/>
          <span style={{fontSize: 12, fontWeight: 700}}>AI API AYARLARI</span>
          <span style={{...S.badge(C.accent), marginLeft: 8, fontSize: 9}}>GEMİNİ / OPENAI / CLAUDE</span>
          {apiTest.sonuc && (
            <span style={{
              ...S.badge(apiTest.sonuc.basarili ? C.success : C.danger),
              marginLeft: 8, fontSize: 9
            }}>
              {apiTest.sonuc.basarili ? 'API AKTİF' : 'API HATALI'}
            </span>
          )}
        </div>
        <div style={{padding: 16}}>
          <div style={{
            padding: '10px 14px', background: `${C.accent}10`, borderRadius: 8,
            border: `1px solid ${C.accent}20`, marginBottom: 16, fontSize: 11, color: C.textSec, lineHeight: 1.6
          }}>
            <LIcon name="Info" size={13} color={C.accent} style={{verticalAlign: 'middle'}}/>{' '}
            AI ANALİZ, MOTİVASYON SÖZLERİ, İÇTİHAT ARAMA VE OCR İÇİN API ANAHTARLARI.
            BİRDEN FAZLA PROVIDER TANIMLANIRSA ÖNCELİK: GEMİNİ {'>'} OPENAI {'>'} CLAUDE.
            OCR (EVRAK OKUMA) SADECE GEMİNİ İLE ÇALIŞIR.
            BOŞ BIRAKIRSANIZ VARSAYILAN ANAHTAR KULLANILIR.
          </div>
          <div style={{display: 'grid', gap: 16}}>
            {/* GOOGLE GEMİNİ */}
            <div>
              <label style={S.label}>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                  <span style={{width: 8, height: 8, borderRadius: '50%', background: '#4285F4', display: 'inline-block'}}/>
                  GOOGLE GEMİNİ API ANAHTARI
                  <span style={{...S.badge(C.accent), fontSize: 8, padding: '1px 6px'}}>ADK + BH + OCR + İÇTİHAT + MOTİVASYON</span>
                </span>
              </label>
              <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                <input style={{...S.input, flex: 1, fontFamily: 'monospace', fontSize: 12, letterSpacing: 0.5}}
                  value={ayarlar.gemini_api_key || ''}
                  onChange={e => up('gemini_api_key', e.target.value)}
                  placeholder="AIzaSy... (BOŞ BIRAKIRSANIZ VARSAYILAN KULLANILIR)"/>
                <button style={{
                  ...S.btn, background: C.accent, color: '#fff', fontSize: 11, padding: '10px 16px',
                  fontWeight: 700, whiteSpace: 'nowrap', opacity: apiTest.testing ? 0.7 : 1,
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6
                }} onClick={() => geminiTestEt(ayarlar.gemini_api_key)} disabled={apiTest.testing}>
                  <LIcon name={apiTest.testing ? 'Loader2' : 'Zap'} size={14} color="#fff"/>
                  {apiTest.testing ? 'TEST EDİLİYOR...' : 'TEST ET'}
                </button>
              </div>
              <div style={{fontSize: 10, color: C.textMuted, marginTop: 4}}>
                AISTUDIO.GOOGLE.COM ADRESINDEN ÜCRETSİZ API ANAHTARI ALABİLİRSİNİZ
              </div>
            </div>

            {/* OPENAI */}
            <div>
              <label style={S.label}>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                  <span style={{width: 8, height: 8, borderRadius: '50%', background: '#10a37f', display: 'inline-block'}}/>
                  OPENAI API ANAHTARI (GPT-4o-mini)
                  <span style={{...S.badge(C.success), fontSize: 8, padding: '1px 6px'}}>ADK + BH + İÇTİHAT</span>
                </span>
              </label>
              <input style={{...S.input, fontFamily: 'monospace', fontSize: 12, letterSpacing: 0.5}}
                value={ayarlar.openai_api_key || ''}
                onChange={e => up('openai_api_key', e.target.value)}
                placeholder="sk-proj-... (OPSİYONEL - GEMİNİ YOKSA KULLANILIR)"/>
              <div style={{fontSize: 10, color: C.textMuted, marginTop: 4}}>
                PLATFORM.OPENAI.COM ADRESINDEN API ANAHTARI ALABİLİRSİNİZ
              </div>
            </div>

            {/* CLAUDE / ANTHROPIC */}
            <div>
              <label style={S.label}>
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 6}}>
                  <span style={{width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block'}}/>
                  CLAUDE API ANAHTARI (Anthropic)
                  <span style={{...S.badge(C.warning), fontSize: 8, padding: '1px 6px'}}>ADK + BH + İÇTİHAT</span>
                </span>
              </label>
              <input style={{...S.input, fontFamily: 'monospace', fontSize: 12, letterSpacing: 0.5}}
                value={ayarlar.claude_api_key || ''}
                onChange={e => up('claude_api_key', e.target.value)}
                placeholder="sk-ant-... (OPSİYONEL - GEMİNİ VE OPENAI YOKSA KULLANILIR)"/>
              <div style={{fontSize: 10, color: C.textMuted, marginTop: 4}}>
                CONSOLE.ANTHROPIC.COM ADRESINDEN API ANAHTARI ALABİLİRSİNİZ
              </div>
            </div>

            {/* PROVIDER BİLGİ TABLOSU */}
            <div style={{
              padding: '10px 14px', background: `${C.bgHover}`, borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 10, color: C.textSec
            }}>
              <div style={{fontWeight: 700, marginBottom: 6, fontSize: 11}}>PROVIDER ÖZELLİK TABLOSU:</div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4}}>
                <span style={{fontWeight: 700}}>ÖZELLİK</span>
                <span style={{fontWeight: 700, color: '#4285F4'}}>GEMİNİ</span>
                <span style={{fontWeight: 700, color: '#10a37f'}}>OPENAI</span>
                <span style={{fontWeight: 700, color: '#d97706'}}>CLAUDE</span>

                <span>ADK ANALİZ</span><span>✓</span><span>✓</span><span>✓</span>
                <span>BH ANALİZ</span><span>✓</span><span>✓</span><span>✓</span>
                <span>RAYİÇ ARAŞTIRMA</span><span>✓</span><span>✓</span><span>✓</span>
                <span>İÇTİHAT ARAMA</span><span>✓</span><span>✓</span><span>✓</span>
                <span>OCR EVRAK OKUMA</span><span>✓</span><span>-</span><span>-</span>
                <span>MOTİVASYON</span><span>✓</span><span>✓</span><span>✓</span>
              </div>
            </div>
          </div>

          {/* API TEST SONUCU PANELİ */}
          {apiTest.testing && (
            <div style={{
              marginTop: 16, padding: '14px 16px', borderRadius: 10,
              background: `${C.accent}10`, border: `1px solid ${C.accent}30`,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{
                width: 20, height: 20, border: `2px solid ${C.accent}`,
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}/>
              <span style={{fontSize: 12, color: C.textSec, fontWeight: 600}}>
                GEMİNİ API TEST EDİLİYOR... LÜTFEN BEKLEYİN
              </span>
            </div>
          )}

          {apiTest.sonuc && !apiTest.testing && (
            <div style={{
              marginTop: 16, padding: '16px', borderRadius: 10,
              background: apiTest.sonuc.basarili ? `${C.success}10` : `${C.danger}10`,
              border: `1px solid ${apiTest.sonuc.basarili ? C.success : C.danger}30`
            }}>
              {/* BAŞLIK */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: apiTest.sonuc.basarili ? `${C.success}20` : `${C.danger}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <LIcon name={apiTest.sonuc.basarili ? 'CheckCircle' : 'XCircle'} size={18}
                    color={apiTest.sonuc.basarili ? C.success : C.danger}/>
                </div>
                <div>
                  <div style={{fontSize: 13, fontWeight: 700, color: apiTest.sonuc.basarili ? C.success : C.danger}}>
                    {apiTest.sonuc.basarili ? 'API BAŞARIYLA ÇALIŞIYOR!' : 'API ÇALIŞMIYOR!'}
                  </div>
                  <div style={{fontSize: 11, color: C.textSec, marginTop: 2}}>
                    {apiTest.sonuc.key_kaynak || ''}
                    {apiTest.sonuc.key_on_ek ? ` (${apiTest.sonuc.key_on_ek})` : ''}
                  </div>
                </div>
              </div>

              {/* DETAYLAR */}
              <div style={{
                display: 'grid', gap: 8, fontSize: 11, color: C.textSec
              }}>
                {/* GEREKÇE / HATA DETAYI */}
                {apiTest.sonuc.hata_detay && !apiTest.sonuc.basarili && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: `${C.danger}08`, border: `1px dashed ${C.danger}40`
                  }}>
                    <div style={{fontWeight: 700, color: C.danger, marginBottom: 4, fontSize: 11}}>
                      <LIcon name="AlertTriangle" size={12} color={C.danger} style={{verticalAlign: 'middle'}}/> HATA GEREKÇESİ:
                    </div>
                    <div style={{color: C.text, lineHeight: 1.6, fontWeight: 600}}>
                      {apiTest.sonuc.hata_detay}
                    </div>
                  </div>
                )}

                {/* TEKNİK BİLGİLER */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6,
                  padding: '10px 14px', borderRadius: 8, background: `${C.bgHover}`
                }}>
                  <div><span style={{color: C.textMuted}}>YÖNTEM:</span> <span style={{fontWeight: 600}}>{apiTest.sonuc.yontem || '-'}</span></div>
                  <div><span style={{color: C.textMuted}}>HTTP KODU:</span> <span style={{fontWeight: 600, color: apiTest.sonuc.http_kodu === 200 ? C.success : C.danger}}>{apiTest.sonuc.http_kodu || '-'}</span></div>
                  <div><span style={{color: C.textMuted}}>cURL:</span> <span style={{fontWeight: 600, color: apiTest.sonuc.curl_destegi === true ? C.success : apiTest.sonuc.curl_destegi === false ? C.danger : C.warning}}>{apiTest.sonuc.curl_destegi === true ? 'AKTİF' : apiTest.sonuc.curl_destegi === false ? 'KAPALI' : 'BİLİNMİYOR'}</span></div>
                  <div><span style={{color: C.textMuted}}>FILE_GET_CONTENTS:</span> <span style={{fontWeight: 600, color: apiTest.sonuc.file_get_contents_destegi === true ? C.success : apiTest.sonuc.file_get_contents_destegi === false ? C.danger : C.warning}}>{apiTest.sonuc.file_get_contents_destegi === true ? 'AKTİF' : apiTest.sonuc.file_get_contents_destegi === false ? 'KAPALI' : 'BİLİNMİYOR'}</span></div>
                </div>

                {/* BAŞARILI İSE ÖRNEK SÖZ */}
                {apiTest.sonuc.basarili && apiTest.sonuc.soz && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: `${C.success}08`, border: `1px dashed ${C.success}40`,
                    fontStyle: 'italic', color: C.text, lineHeight: 1.6
                  }}>
                    <div style={{fontWeight: 700, color: C.success, marginBottom: 4, fontSize: 10, fontStyle: 'normal'}}>
                      <LIcon name="Quote" size={12} color={C.success} style={{verticalAlign: 'middle'}}/> ÖRNEK YANIT:
                    </div>
                    "{apiTest.sonuc.soz}"
                  </div>
                )}

                {/* BAŞARISIZ İSE ÇÖZÜM ÖNERİLERİ */}
                {!apiTest.sonuc.basarili && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: `${C.warning}08`, border: `1px dashed ${C.warning}40`
                  }}>
                    <div style={{fontWeight: 700, color: C.warning, marginBottom: 6, fontSize: 11}}>
                      <LIcon name="Lightbulb" size={12} color={C.warning} style={{verticalAlign: 'middle'}}/> ÇÖZÜM ÖNERİLERİ:
                    </div>
                    <div style={{lineHeight: 1.8, color: C.textSec}}>
                      {apiTest.sonuc.http_kodu === 429 && '• KOTA DOLMUŞ: FARKLI BİR API ANAHTARI GİRİN VEYA 24 SAAT BEKLEYİN\n'}
                      {(apiTest.sonuc.http_kodu === 401 || apiTest.sonuc.http_kodu === 403) && '• AISTUDIO.GOOGLE.COM ADRESINDEN YENİ API ANAHTARI OLUŞTURUN\n'}
                      {apiTest.sonuc.http_kodu === 0 && '• SUNUCUNUZDA DIŞARI ÇIKIŞ (OUTBOUND) BAĞLANTISI KAPALI OLABİLİR - HOSTİNG FİRMANIZLA İLETİŞİME GEÇİN\n'}
                      • BOŞ BIRAKIRSANIZ VARSAYILAN ANAHTAR KULLANILIR<br/>
                      • API ÇALIŞMASA BİLE YEDEK SÖZLER OTOMATİK GÖSTERİLİR<br/>
                      • AISTUDIO.GOOGLE.COM ADRESİNDEN ÜCRETSİZ YENİ ANAHTAR ALABİLİRSİNİZ
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DOSYA KAYNAĞI BAZLI ÜCRETLENDİRME AYARLARI */}
      <div style={S.card}>
        <div style={{...S.cardHead, background: `linear-gradient(135deg, ${C.gold || '#f59e0b'}15, transparent)`}}>
          <LIcon name="Receipt" size={18} color={C.gold || '#f59e0b'}/>
          <span style={{fontWeight:700, fontSize:14}}>DOSYA KAYNAĞI BAZLI ÜCRETLENDİRME (OTOMATİK MASRAF)</span>
        </div>
        <div style={{padding: '16px 20px'}}>
          <div style={{
            padding: '10px 14px', background: `${C.gold || '#f59e0b'}10`, borderRadius: 8,
            border: `1px solid ${C.gold || '#f59e0b'}20`, marginBottom: 16, fontSize: 11, color: C.textSec, lineHeight: 1.6
          }}>
            <LIcon name="Info" size={13} color={C.gold || '#f59e0b'} style={{verticalAlign: 'middle'}}/>{' '}
            HER DOSYA AÇILIŞINDA, DOSYA KAYNAĞI VE DOSYA TÜRÜNE GÖRE İLGİLİ TUTARLAR OTOMATİK OLARAK MASRAFA EKLENİR.
            0 GİRERSENİZ O TÜR İÇİN OTOMATİK MASRAF EKLENMEZ.
          </div>

          {/* YÖNLENDİREN ÜCRETLERİ */}
          <div style={{marginBottom: 20}}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              padding: '8px 14px', background: `${C.warning || '#f59e0b'}08`, borderRadius: 8,
              border: `1px solid ${C.warning || '#f59e0b'}15`
            }}>
              <LIcon name="Users" size={15} color={C.warning || '#f59e0b'}/>
              <span style={{fontWeight: 700, fontSize: 13, color: C.text}}>PAYDAŞ / YÖNLENDİREN DOSYALARI</span>
              <span style={{fontSize: 10, color: C.textMuted, marginLeft: 'auto'}}>PAYDAŞ/YÖNLENDİREN KAYNAKLI DOSYALAR İÇİN</span>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
              <div>
                <label style={S.label}>ADK (ARAÇ DEĞER KAYBI) ₺</label>
                <input type="number" style={{...S.input, fontSize: 14, fontWeight: 700, textAlign: 'center'}}
                  value={ayarlar.yonlendiren_ucret_adk || ''}
                  onChange={e => up('yonlendiren_ucret_adk', e.target.value)}
                  placeholder="0"/>
              </div>
              <div>
                <label style={S.label}>BH (BEDENİ HASAR) ₺</label>
                <input type="number" style={{...S.input, fontSize: 14, fontWeight: 700, textAlign: 'center'}}
                  value={ayarlar.yonlendiren_ucret_bh || ''}
                  onChange={e => up('yonlendiren_ucret_bh', e.target.value)}
                  placeholder="0"/>
              </div>
              <div>
                <label style={S.label}>MDK (MOTOR DEĞER KAYBI) ₺</label>
                <input type="number" style={{...S.input, fontSize: 14, fontWeight: 700, textAlign: 'center'}}
                  value={ayarlar.yonlendiren_ucret_mdk || ''}
                  onChange={e => up('yonlendiren_ucret_mdk', e.target.value)}
                  placeholder="0"/>
              </div>
            </div>
          </div>

          {/* OFİS CRM ÜCRETLERİ */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
              padding: '8px 14px', background: `${C.accent}08`, borderRadius: 8,
              border: `1px solid ${C.accent}15`
            }}>
              <LIcon name="Monitor" size={15} color={C.accent}/>
              <span style={{fontWeight: 700, fontSize: 13, color: C.text}}>OFİS CRM DOSYALARI</span>
              <span style={{fontSize: 10, color: C.textMuted, marginLeft: 'auto'}}>OFİS CRM KAYNAKLI DOSYALAR İÇİN</span>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
              <div>
                <label style={S.label}>ADK (ARAÇ DEĞER KAYBI) ₺</label>
                <input type="number" style={{...S.input, fontSize: 14, fontWeight: 700, textAlign: 'center'}}
                  value={ayarlar.ofis_crm_ucret_adk || ''}
                  onChange={e => up('ofis_crm_ucret_adk', e.target.value)}
                  placeholder="0"/>
              </div>
              <div>
                <label style={S.label}>BH (BEDENİ HASAR) ₺</label>
                <input type="number" style={{...S.input, fontSize: 14, fontWeight: 700, textAlign: 'center'}}
                  value={ayarlar.ofis_crm_ucret_bh || ''}
                  onChange={e => up('ofis_crm_ucret_bh', e.target.value)}
                  placeholder="0"/>
              </div>
              <div>
                <label style={S.label}>MDK (MOTOR DEĞER KAYBI) ₺</label>
                <input type="number" style={{...S.input, fontSize: 14, fontWeight: 700, textAlign: 'center'}}
                  value={ayarlar.ofis_crm_ucret_mdk || ''}
                  onChange={e => up('ofis_crm_ucret_mdk', e.target.value)}
                  placeholder="0"/>
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

/* TEMA AYARLARI — AYRI DOSYADA: js/pages/tema-ayarlari.js → MR.TemaAyarlariTab */
/* ESKİ_TEMA_BASLANGIC
  palet: {
    accent: '#1a56db', accentLight: '#3b82f6',
    success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
    purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899',
    bg_koyu: '#0f172a', bgCard_koyu: '#1e293b',
    bg_acik: '#f8fafc', bgCard_acik: '#ffffff'
  },
  /* GÖRÜNÜM EFEKTLERİ */
  efekt: {
    shadow_yogunluk: 50,   /* 0-100 */
    border_radius: 16,      /* 0-30 */
    border_kalinlik: 1,     /* 0-4 */
    kabartma: 0,            /* 0=düz, 1=hafif, 2=belirgin, 3=3D */
    cam_efekt: 0            /* 0=kapalı, 1=hafif, 2=belirgin */
  },
  /* TİPOGRAFİ */
  tipografi: {
    font_olcek: 100,       /* 80-130 yüzde */
    font_agirlik: 600,     /* 300,400,500,600,700,800 */
    satir_yukseklik: 150   /* 120-200 yüzde */
  },
  /* KART VE SAYFA DÜZENİ */
  layout: {
    kart_boyut: 'orta',    /* kucuk, orta, buyuk */
    grid_sutun: 3,         /* 2,3,4 */
    ikon_boyut: 18,        /* 14-28 */
    ikon_stil: 'outline',  /* outline, filled */
    kart_aralik: 16        /* 8-32 */
  },
  /* BUTON STİLLERİ */
  buton: {
    stil: 'gradient',      /* duz, gradient, threed, cam */
    radius: 10,            /* 0-25 */
    hover: 'scale'         /* scale, glow, slide */
  }
};

/* RENK PALETLERİ — HAZIR TEMALAR */
const HAZIR_PALETLER = [
  {ad: 'VARSAYILAN MAVİ', accent: '#1a56db', accentLight: '#3b82f6', bg_koyu: '#0f172a', bgCard_koyu: '#1e293b', bg_acik: '#f8fafc', bgCard_acik: '#ffffff'},
  {ad: 'OKYANUS', accent: '#0891b2', accentLight: '#22d3ee', bg_koyu: '#0c1222', bgCard_koyu: '#162032', bg_acik: '#f0fdfa', bgCard_acik: '#ffffff'},
  {ad: 'ZÜMRÜT', accent: '#059669', accentLight: '#34d399', bg_koyu: '#0a1f1a', bgCard_koyu: '#132d25', bg_acik: '#f0fdf4', bgCard_acik: '#ffffff'},
  {ad: 'MOR RÜYA', accent: '#7c3aed', accentLight: '#a78bfa', bg_koyu: '#13082a', bgCard_koyu: '#1e1340', bg_acik: '#faf5ff', bgCard_acik: '#ffffff'},
  {ad: 'GÜNBATIMI', accent: '#ea580c', accentLight: '#fb923c', bg_koyu: '#1a0f08', bgCard_koyu: '#2a1a10', bg_acik: '#fff7ed', bgCard_acik: '#ffffff'},
  {ad: 'GÜL KURUSU', accent: '#be185d', accentLight: '#f472b6', bg_koyu: '#1a0a14', bgCard_koyu: '#2a1222', bg_acik: '#fdf2f8', bgCard_acik: '#ffffff'},
  {ad: 'ALTTIN', accent: '#b45309', accentLight: '#fbbf24', bg_koyu: '#1a1408', bgCard_koyu: '#2a2210', bg_acik: '#fffbeb', bgCard_acik: '#ffffff'},
  {ad: 'GECE MAVISI', accent: '#1e40af', accentLight: '#60a5fa', bg_koyu: '#020617', bgCard_koyu: '#0f172a', bg_acik: '#eff6ff', bgCard_acik: '#f8fafc'}
];

const TemaAyarlariTab = () => {
  const {C, S, LIcon, Badge, Loading, api} = MR;
  const [config, setConfig] = useState(JSON.parse(JSON.stringify(TEMA_VARSAYILAN)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mesaj, setMesaj] = useState({type: '', text: ''});
  const [aktifSekme, setAktifSekme] = useState('palet');

  /* MEVCUT TEMA CONFİG'İ YÜKLE */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await api.req('/sistem/tema-config.php');
      if (r?.success && r.data) {
        setConfig(prev => {
          const merged = JSON.parse(JSON.stringify(TEMA_VARSAYILAN));
          if (r.data.palet) Object.assign(merged.palet, r.data.palet);
          if (r.data.efekt) Object.assign(merged.efekt, r.data.efekt);
          if (r.data.tipografi) Object.assign(merged.tipografi, r.data.tipografi);
          if (r.data.layout) Object.assign(merged.layout, r.data.layout);
          if (r.data.buton) Object.assign(merged.buton, r.data.buton);
          return merged;
        });
      }
      setLoading(false);
    })();
  }, []);

  /* GÜNCELLEME YARDIMCILARI */
  const upPalet = (k, v) => setConfig(p => ({...p, palet: {...p.palet, [k]: v}}));
  const upEfekt = (k, v) => setConfig(p => ({...p, efekt: {...p.efekt, [k]: Number(v)}}));
  const upTipo = (k, v) => setConfig(p => ({...p, tipografi: {...p.tipografi, [k]: Number(v)}}));
  const upLayout = (k, v) => setConfig(p => ({...p, layout: {...p.layout, [k]: v}}));
  const upButon = (k, v) => setConfig(p => ({...p, buton: {...p.buton, [k]: v}}));

  /* KAYDET */
  const kaydet = async () => {
    setSaving(true);
    setMesaj({type: '', text: ''});
    const r = await api.ayarlarGuncelle({tema_config: JSON.stringify(config)});
    if (r?.success) {
      setMesaj({type: 'success', text: 'TEMA AYARLARI BAŞARIYLA KAYDEDİLDİ — TÜM KULLANICILAR İÇİN UYGULANACAK'});
      /* CANLI UYGULA */
      temaUygula(config);
    } else {
      setMesaj({type: 'error', text: r?.error || 'TEMA AYARLARI KAYDEDİLİRKEN HATA OLUŞTU'});
    }
    setSaving(false);
    setTimeout(() => setMesaj({type: '', text: ''}), 6000);
  };

  /* SIFIRLA */
  const sifirla = () => {
    setConfig(JSON.parse(JSON.stringify(TEMA_VARSAYILAN)));
    setMesaj({type: 'success', text: 'AYARLAR VARSAYILANA DÖNDÜRÜLDÜ — KAYDETMEDEN UYGULANMAZ'});
    setTimeout(() => setMesaj({type: '', text: ''}), 4000);
  };

  /* TEMAY CANLI UYGULA */
  const temaUygula = (cfg) => {
    if (!cfg) return;
    const isK = MR.tema === 'koyu';
    const p = cfg.palet || {};
    const e = cfg.efekt || {};
    const t = cfg.tipografi || {};
    const l = cfg.layout || {};
    const b = cfg.buton || {};

    /* RENK PALETİ UYGULA */
    if (p.accent) { MR.C.accent = p.accent; MR.TEMALAR.koyu.accent = p.accent; MR.TEMALAR.acik.accent = p.accent; }
    if (p.accentLight) { MR.C.accentLight = p.accentLight; MR.TEMALAR.koyu.accentLight = p.accentLight; MR.TEMALAR.acik.accentLight = p.accentLight; }
    if (p.success) { MR.C.success = p.success; MR.TEMALAR.koyu.success = p.success; MR.TEMALAR.acik.success = p.success; }
    if (p.warning) { MR.C.warning = p.warning; MR.TEMALAR.koyu.warning = p.warning; MR.TEMALAR.acik.warning = p.warning; }
    if (p.danger) { MR.C.danger = p.danger; MR.TEMALAR.koyu.danger = p.danger; MR.TEMALAR.acik.danger = p.danger; }
    if (p.purple) { MR.C.purple = p.purple; MR.TEMALAR.koyu.purple = p.purple; MR.TEMALAR.acik.purple = p.purple; }
    if (p.cyan) { MR.C.cyan = p.cyan; MR.TEMALAR.koyu.cyan = p.cyan; MR.TEMALAR.acik.cyan = p.cyan; }
    if (p.pink) { MR.C.pink = p.pink; MR.TEMALAR.koyu.pink = p.pink; MR.TEMALAR.acik.pink = p.pink; }
    if (p.bg_koyu) { MR.TEMALAR.koyu.bg = p.bg_koyu; MR.TEMALAR.koyu.bgGradient = p.bg_koyu; }
    if (p.bgCard_koyu) { MR.TEMALAR.koyu.bgCard = p.bgCard_koyu; }
    if (p.bg_acik) { MR.TEMALAR.acik.bg = p.bg_acik; MR.TEMALAR.acik.bgGradient = p.bg_acik; }
    if (p.bgCard_acik) { MR.TEMALAR.acik.bgCard = p.bgCard_acik; }
    /* MEVCUT TEMAYA YANSIT */
    if (isK) {
      if (p.bg_koyu) { MR.C.bg = p.bg_koyu; MR.C.bgGradient = p.bg_koyu; }
      if (p.bgCard_koyu) MR.C.bgCard = p.bgCard_koyu;
    } else {
      if (p.bg_acik) { MR.C.bg = p.bg_acik; MR.C.bgGradient = p.bg_acik; }
      if (p.bgCard_acik) MR.C.bgCard = p.bgCard_acik;
    }
    MR.C.accentGradient = `linear-gradient(135deg, ${MR.C.accentLight} 0%, ${MR.C.accent} 50%, ${p.accent || MR.C.accent} 100%)`;

    /* EFEKT UYGULA */
    const shadowMul = (e.shadow_yogunluk || 50) / 50;
    const bRad = e.border_radius ?? 16;
    const bWid = e.border_kalinlik ?? 1;

    MR.S.card.borderRadius = bRad;
    MR.S.card.border = `${bWid}px solid ${MR.C.border}`;
    MR.S.stat.borderRadius = bRad;
    MR.S.stat.border = `${bWid}px solid ${MR.C.border}`;
    MR.S.input.borderRadius = Math.min(bRad, 12);
    MR.S.select.borderRadius = Math.min(bRad, 12);

    /* GÖLGE YOĞUNLUĞU */
    if (shadowMul === 0) {
      MR.C.cardShadow = 'none';
      MR.C.statShadow = 'none';
    } else {
      const a1 = Math.round(0.2 * shadowMul * 100) / 100;
      const a2 = Math.round(0.1 * shadowMul * 100) / 100;
      MR.C.cardShadow = `0 ${Math.round(10 * shadowMul)}px ${Math.round(15 * shadowMul)}px -3px rgba(0,0,0,${a1}), 0 4px 6px -4px rgba(0,0,0,${a2})`;
      MR.C.statShadow = `0 ${Math.round(4 * shadowMul)}px ${Math.round(6 * shadowMul)}px -1px rgba(0,0,0,${a1}), 0 2px 4px -2px rgba(0,0,0,${a2})`;
    }
    MR.S.card.boxShadow = MR.C.cardShadow;
    MR.S.stat.boxShadow = MR.C.statShadow;

    /* BUTON STİLLERİ */
    const btnRad = b.radius ?? 10;
    MR.S.btn.borderRadius = btnRad;

    if (b.stil === 'duz') {
      MR.S.btnP = { background: MR.C.accent, color: '#fff', fontWeight: 800, border: 'none', boxShadow: 'none' };
      MR.S.btnS = { background: MR.C.accent, color: '#fff', fontWeight: 800, border: 'none', boxShadow: 'none' };
    } else if (b.stil === 'cam') {
      MR.S.btnP = {
        background: `${MR.C.accent}cc`, color: '#fff', fontWeight: 800, border: 'none',
        boxShadow: `0 8px 32px ${MR.C.accent}44`, backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      };
      MR.S.btnS = { ...MR.S.btnP };
    } else if (b.stil === 'threed') {
      const acHex = MR.C.accent;
      MR.S.btnP = {
        background: `linear-gradient(180deg, ${MR.C.accentLight} 0%, ${acHex} 40%, ${acHex} 100%)`,
        color: '#fff', fontWeight: 800, border: 'none',
        boxShadow: `0 6px 20px -2px ${acHex}66, 0 3px 6px -1px rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,0.3)`,
        borderBottom: `3px solid ${acHex}`, textShadow: '0 2px 4px rgba(0,0,0,0.2)'
      };
      MR.S.btnS = { ...MR.S.btnP };
    }
    /* gradient zaten varsayılan */

    MR._stilGuncelle();
  };

  /* CANLI ÖNİZLEME STİLLERİ OLUŞTUR */
  const onizlemeStilleri = () => {
    const p = config.palet;
    const e = config.efekt;
    const t = config.tipografi;
    const l = config.layout;
    const b = config.buton;
    const isK = MR.tema === 'koyu';
    const bgColor = isK ? (p.bg_koyu || '#0f172a') : (p.bg_acik || '#f8fafc');
    const cardBg = isK ? (p.bgCard_koyu || '#1e293b') : (p.bgCard_acik || '#ffffff');
    const textColor = isK ? '#f1f5f9' : '#1e293b';
    const textSec = isK ? '#cbd5e1' : '#475569';
    const border = isK ? '#334155' : '#e2e8f0';
    const shadowMul = (e.shadow_yogunluk || 50) / 50;
    const bRad = e.border_radius ?? 16;
    const bWid = e.border_kalinlik ?? 1;
    const fontScale = (t.font_olcek || 100) / 100;
    const lineH = (t.satir_yukseklik || 150) / 100;

    let btnBg = `linear-gradient(180deg, ${p.accentLight || '#3b82f6'} 0%, ${p.accent || '#1a56db'} 100%)`;
    let btnShadow = `0 4px 14px -2px ${p.accent || '#1a56db'}55`;
    let btnBorder = 'none';
    let btnExtra = {};
    if (b.stil === 'duz') { btnBg = p.accent || '#1a56db'; btnShadow = 'none'; }
    if (b.stil === 'threed') {
      btnBg = `linear-gradient(180deg, ${p.accentLight || '#3b82f6'} 0%, ${p.accent || '#1a56db'} 40%, ${p.accent || '#1a56db'} 100%)`;
      btnShadow = `0 6px 20px -2px ${p.accent || '#1a56db'}66, inset 0 2px 0 rgba(255,255,255,0.3)`;
      btnBorder = `3px solid ${p.accent || '#1a56db'}`;
    }
    if (b.stil === 'cam') {
      btnBg = `${p.accent || '#1a56db'}cc`;
      btnShadow = `0 8px 32px ${p.accent || '#1a56db'}44`;
      btnExtra = {backdropFilter: 'blur(8px)'};
    }

    const cardShadow = shadowMul === 0 ? 'none' :
      `0 ${Math.round(10*shadowMul)}px ${Math.round(15*shadowMul)}px -3px rgba(0,0,0,${Math.round(0.2*shadowMul*100)/100})`;

    const kabartmaStyle = e.kabartma === 1
      ? {boxShadow: `${cardShadow}, inset 0 1px 0 rgba(255,255,255,0.08)`}
      : e.kabartma === 2
      ? {boxShadow: `${cardShadow}, inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.1)`}
      : e.kabartma >= 3
      ? {boxShadow: `${cardShadow}, inset 0 3px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.15)`, borderTop: `1px solid rgba(255,255,255,0.1)`}
      : {boxShadow: cardShadow};

    const camStyle = e.cam_efekt === 1
      ? {background: `${cardBg}ee`, backdropFilter: 'blur(4px)'}
      : e.cam_efekt >= 2
      ? {background: `${cardBg}cc`, backdropFilter: 'blur(12px)'}
      : {};

    return {bgColor, cardBg, textColor, textSec, border, bRad, bWid, fontScale, lineH,
      btnBg, btnShadow, btnBorder, btnExtra, cardShadow, kabartmaStyle, camStyle,
      accentColor: p.accent || '#1a56db', accentLightColor: p.accentLight || '#3b82f6',
      kartPadding: l.kart_boyut === 'kucuk' ? 12 : l.kart_boyut === 'buyuk' ? 28 : 20,
      kartGap: l.kart_aralik || 16, iconSize: l.ikon_boyut || 18,
      gridCols: l.grid_sutun || 3, btnRadius: b.radius ?? 10
    };
  };

  if (loading) return React.createElement(Loading);

  const os = onizlemeStilleri();

  /* SEKME YAPISI */
  const sekmeler = [
    {id: 'palet', label: 'RENK PALETİ', icon: 'Palette'},
    {id: 'efekt', label: 'GÖRÜNÜM EFEKTLERİ', icon: 'Sparkles'},
    {id: 'tipografi', label: 'TİPOGRAFİ', icon: 'Type'},
    {id: 'layout', label: 'SAYFA DÜZENİ', icon: 'LayoutGrid'},
    {id: 'buton', label: 'BUTON STİLLERİ', icon: 'SquareMousePointer'},
    {id: 'onizleme', label: 'CANLI ÖNİZLEME', icon: 'Eye'}
  ];

  /* SLIDER BİLEŞENİ */
  const Slider = ({label, value, min, max, step, onChange, suffix, color}) => (
    React.createElement('div', {style: {marginBottom: 16}},
      React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}},
        React.createElement('label', {style: {...S.label, margin: 0}}, label),
        React.createElement('span', {style: {fontSize: 12, fontWeight: 800, color: color || C.accent, background: `${color || C.accent}18`, padding: '2px 10px', borderRadius: 6}}, value + (suffix || ''))
      ),
      React.createElement('input', {type: 'range', min, max, step: step || 1, value, onChange: e => onChange(e.target.value), style: {width: '100%', accentColor: color || C.accent, height: 6, cursor: 'pointer'}})
    )
  );

  /* RENK SEÇİCİ BİLEŞENİ */
  const RenkSecici = ({label, value, onChange, altText}) => (
    React.createElement('div', {style: {marginBottom: 14}},
      React.createElement('label', {style: {...S.label, fontSize: 11}}, label),
      React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: 8}},
        React.createElement('div', {style: {position: 'relative', width: 40, height: 36, borderRadius: 8, overflow: 'hidden', border: `2px solid ${C.border}`, cursor: 'pointer', flexShrink: 0}},
          React.createElement('input', {type: 'color', value: value || '#1a56db', onChange: e => onChange(e.target.value), style: {position: 'absolute', top: -8, left: -8, width: 56, height: 52, cursor: 'pointer', border: 'none', padding: 0}})
        ),
        React.createElement('input', {style: {...S.input, flex: 1, fontFamily: 'monospace', fontSize: 11, padding: '8px 12px'}, value: value || '', onChange: e => onChange(e.target.value), placeholder: '#000000'}),
        React.createElement('div', {style: {width: 24, height: 24, borderRadius: 6, background: value || '#1a56db', border: `1px solid ${C.border}`, flexShrink: 0}})
      ),
      altText && React.createElement('div', {style: {fontSize: 9, color: C.textMuted, marginTop: 3}}, altText)
    )
  );

  /* SEÇİM BUTONLARI */
  const SecimButonlari = ({label, secenekler, value, onChange}) => (
    React.createElement('div', {style: {marginBottom: 16}},
      React.createElement('label', {style: {...S.label}}, label),
      React.createElement('div', {style: {display: 'flex', gap: 6, flexWrap: 'wrap'}},
        secenekler.map(s =>
          React.createElement('button', {key: s.value, onClick: () => onChange(s.value), style: {
            ...S.btn, padding: '8px 16px', fontSize: 11, fontWeight: value === s.value ? 800 : 500,
            background: value === s.value ? `${C.accent}22` : C.bgHover,
            color: value === s.value ? C.accent : C.textSec,
            border: value === s.value ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
            borderRadius: 8, transition: 'all .2s'
          }},
            s.icon && React.createElement(LIcon, {name: s.icon, size: 14, color: value === s.value ? C.accent : C.textMuted, style: {marginRight: 4}}),
            s.label
          )
        )
      )
    )
  );

  return (
    React.createElement('div', null,
      /* MESAJ */
      mesaj.text && React.createElement('div', {style: {
        padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 12, fontWeight: 600,
        background: mesaj.type === 'success' ? `${C.success}22` : `${C.danger}22`,
        border: `1px solid ${mesaj.type === 'success' ? C.success + '44' : C.danger + '44'}`,
        color: mesaj.type === 'success' ? C.success : C.danger,
        display: 'flex', alignItems: 'center', gap: 8
      }},
        React.createElement(LIcon, {name: mesaj.type === 'success' ? 'CheckCircle' : 'AlertCircle', size: 16, color: mesaj.type === 'success' ? C.success : C.danger}),
        mesaj.text
      ),

      /* BİLGİ BANNERI */
      React.createElement('div', {style: {
        padding: 16, background: `${C.accent}08`, borderRadius: 12, border: `1px solid ${C.accent}22`,
        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14
      }},
        React.createElement('div', {style: {width: 44, height: 44, borderRadius: 12, background: `${C.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}},
          React.createElement(LIcon, {name: 'Palette', size: 22, color: C.accent})
        ),
        React.createElement('div', {style: {flex: 1}},
          React.createElement('div', {style: {fontSize: 14, fontWeight: 800, color: C.accent}}, 'TEMA AYARLARI PANELİ'),
          React.createElement('div', {style: {fontSize: 11, color: C.textSec, marginTop: 2}},
            'BURADA YAPACAĞINIZ DEĞİŞİKLİKLER KAYDETTİĞİNİZDE TÜM KULLANICILARA YANSIYACAKTIR. SADECE SİSTEM YÖNETİCİSİ BU SAYFAYA ERİŞEBİLİR. HİÇBİR VERİ DEĞİŞMEZ, SADECE GÖRÜNÜM ETKİLENİR.'
          )
        ),
        React.createElement(Badge, {text: 'SADECE ADMİN', color: C.danger})
      ),

      /* SEKMELER */
      React.createElement('div', {style: {display: 'flex', gap: 4, padding: 4, background: C.bgHover, borderRadius: 10, marginBottom: 16, flexWrap: 'wrap'}},
        sekmeler.map(s =>
          React.createElement('div', {key: s.id, onClick: () => setAktifSekme(s.id), style: {
            flex: 1, minWidth: 120, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
            background: aktifSekme === s.id ? C.bgCard : 'transparent',
            border: aktifSekme === s.id ? `1px solid ${C.border}` : '1px solid transparent',
            boxShadow: aktifSekme === s.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }},
            React.createElement(LIcon, {name: s.icon, size: 14, color: aktifSekme === s.id ? C.accent : C.textMuted}),
            React.createElement('span', {style: {fontSize: 10, fontWeight: aktifSekme === s.id ? 700 : 500, color: aktifSekme === s.id ? C.text : C.textMuted}}, s.label)
          )
        )
      ),

      /* ═══ BÖLÜM 1: RENK PALETİ ═══ */
      aktifSekme === 'palet' && React.createElement('div', {style: {display: 'flex', flexDirection: 'column', gap: 16}},
        /* HAZIR PALETLER */
        React.createElement('div', {style: S.card},
          React.createElement('div', {style: {...S.cardHead, padding: '12px 16px'}},
            React.createElement(LIcon, {name: 'Layers', size: 14, color: C.accent}),
            React.createElement('span', {style: {fontSize: 12, fontWeight: 700}}, 'HAZIR RENK PALETLERİ')
          ),
          React.createElement('div', {style: {padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10}},
            HAZIR_PALETLER.map((hp, i) =>
              React.createElement('div', {key: i, onClick: () => {
                upPalet('accent', hp.accent); upPalet('accentLight', hp.accentLight);
                upPalet('bg_koyu', hp.bg_koyu); upPalet('bgCard_koyu', hp.bgCard_koyu);
                upPalet('bg_acik', hp.bg_acik); upPalet('bgCard_acik', hp.bgCard_acik);
              }, style: {
                padding: 12, borderRadius: 10, cursor: 'pointer', border: config.palet.accent === hp.accent ? `2px solid ${hp.accent}` : `1px solid ${C.border}`,
                background: config.palet.accent === hp.accent ? `${hp.accent}15` : C.bgHover,
                transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 10
              }},
                React.createElement('div', {style: {display: 'flex', gap: 3}},
                  [hp.accent, hp.accentLight, hp.bg_koyu, hp.bgCard_koyu].map((c, ci) =>
                    React.createElement('div', {key: ci, style: {width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid rgba(0,0,0,0.1)'}})
                  )
                ),
                React.createElement('span', {style: {fontSize: 10, fontWeight: 700, color: config.palet.accent === hp.accent ? hp.accent : C.textSec}}, hp.ad)
              )
            )
          )
        ),

        /* ÖZEL RENKLER */
        React.createElement('div', {style: {...S.card}},
          React.createElement('div', {style: {...S.cardHead, padding: '12px 16px'}},
            React.createElement(LIcon, {name: 'Pipette', size: 14, color: C.accent}),
            React.createElement('span', {style: {fontSize: 12, fontWeight: 700}}, 'ÖZEL RENK AYARLARI')
          ),
          React.createElement('div', {style: {padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}},
            /* SOL KOLON - ANA RENKLER */
            React.createElement('div', null,
              React.createElement('div', {style: {fontSize: 11, fontWeight: 700, marginBottom: 12, color: C.text, padding: '6px 10px', background: `${C.accent}11`, borderRadius: 6}}, 'ANA RENKLER'),
              React.createElement(RenkSecici, {label: 'ANA RENK (ACCENT)', value: config.palet.accent, onChange: v => upPalet('accent', v), altText: 'BUTONLAR, LİNKLER, SEÇİLİ ÖĞELER'}),
              React.createElement(RenkSecici, {label: 'AÇIK ACCENT', value: config.palet.accentLight, onChange: v => upPalet('accentLight', v), altText: 'HOVER EFEKTLERİ, GRADIENT'}),
              React.createElement(RenkSecici, {label: 'BAŞARI RENGİ', value: config.palet.success, onChange: v => upPalet('success', v)}),
              React.createElement(RenkSecici, {label: 'UYARI RENGİ', value: config.palet.warning, onChange: v => upPalet('warning', v)}),
              React.createElement(RenkSecici, {label: 'TEHLİKE RENGİ', value: config.palet.danger, onChange: v => upPalet('danger', v)})
            ),
            /* SAĞ KOLON - EK RENKLER VE ARKAPLAN */
            React.createElement('div', null,
              React.createElement('div', {style: {fontSize: 11, fontWeight: 700, marginBottom: 12, color: C.text, padding: '6px 10px', background: `${C.purple}11`, borderRadius: 6}}, 'EK RENKLER VE ARKAPLAN'),
              React.createElement(RenkSecici, {label: 'MOR', value: config.palet.purple, onChange: v => upPalet('purple', v)}),
              React.createElement(RenkSecici, {label: 'TURKUAZ', value: config.palet.cyan, onChange: v => upPalet('cyan', v)}),
              React.createElement(RenkSecici, {label: 'PEMBE', value: config.palet.pink, onChange: v => upPalet('pink', v)}),
              React.createElement('div', {style: {height: 1, background: C.border, margin: '12px 0'}}),
              React.createElement(RenkSecici, {label: 'KOYU TEMA ARKAPLAN', value: config.palet.bg_koyu, onChange: v => upPalet('bg_koyu', v)}),
              React.createElement(RenkSecici, {label: 'KOYU TEMA KART', value: config.palet.bgCard_koyu, onChange: v => upPalet('bgCard_koyu', v)}),
              React.createElement(RenkSecici, {label: 'AÇIK TEMA ARKAPLAN', value: config.palet.bg_acik, onChange: v => upPalet('bg_acik', v)}),
              React.createElement(RenkSecici, {label: 'AÇIK TEMA KART', value: config.palet.bgCard_acik, onChange: v => upPalet('bgCard_acik', v)})
            )
          )
        )
      ),

      /* ═══ BÖLÜM 2: GÖRÜNÜM EFEKTLERİ ═══ */
      aktifSekme === 'efekt' && React.createElement('div', {style: S.card},
        React.createElement('div', {style: {...S.cardHead, padding: '12px 16px'}},
          React.createElement(LIcon, {name: 'Sparkles', size: 14, color: C.warning}),
          React.createElement('span', {style: {fontSize: 12, fontWeight: 700}}, 'GÖRÜNÜM EFEKTLERİ')
        ),
        React.createElement('div', {style: {padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}},
          React.createElement('div', null,
            React.createElement(Slider, {label: 'GÖLGE YOĞUNLUĞU', value: config.efekt.shadow_yogunluk, min: 0, max: 100, onChange: v => upEfekt('shadow_yogunluk', v), suffix: '%', color: C.accent}),
            React.createElement(Slider, {label: 'BORDER RADIUS (KÖŞE YUVARLAMASI)', value: config.efekt.border_radius, min: 0, max: 30, onChange: v => upEfekt('border_radius', v), suffix: 'PX', color: C.cyan}),
            React.createElement(Slider, {label: 'BORDER KALINLIĞI', value: config.efekt.border_kalinlik, min: 0, max: 4, onChange: v => upEfekt('border_kalinlik', v), suffix: 'PX', color: C.purple})
          ),
          React.createElement('div', null,
            React.createElement(SecimButonlari, {label: 'KABARTMA EFEKTİ', value: config.efekt.kabartma, onChange: v => upEfekt('kabartma', v), secenekler: [
              {value: 0, label: 'DÜZ', icon: 'Minus'},
              {value: 1, label: 'HAFİF', icon: 'Layers'},
              {value: 2, label: 'BELİRGİN', icon: 'Box'},
              {value: 3, label: '3D', icon: 'Boxes'}
            ]}),
            React.createElement(SecimButonlari, {label: 'CAM EFEKTİ (GLASSMORPHISM)', value: config.efekt.cam_efekt, onChange: v => upEfekt('cam_efekt', v), secenekler: [
              {value: 0, label: 'KAPALI', icon: 'X'},
              {value: 1, label: 'HAFİF', icon: 'Droplets'},
              {value: 2, label: 'BELİRGİN', icon: 'GlassWater'}
            ]}),

            /* EFEKTLERİN MİNİ ÖNİZLEMESİ */
            React.createElement('div', {style: {marginTop: 16}},
              React.createElement('label', {style: S.label}, 'ÖNİZLEME'),
              React.createElement('div', {style: {
                padding: os.kartPadding, borderRadius: os.bRad, border: `${os.bWid}px solid ${os.border}`,
                background: os.cardBg, ...os.kabartmaStyle, ...os.camStyle,
                transition: 'all .3s ease'
              }},
                React.createElement('div', {style: {fontSize: 12, fontWeight: 700, color: os.textColor, marginBottom: 8}}, 'ÖRNEK KART'),
                React.createElement('div', {style: {fontSize: 10, color: os.textSec, lineHeight: 1.6}}, 'Bu kart mevcut efekt ayarlarınızın nasıl göründüğünü gösteriyor. Gölge, köşe, kabartma ve cam efektlerinin kombinasyonunu buradan kontrol edebilirsiniz.'),
                React.createElement('div', {style: {display: 'flex', gap: 8, marginTop: 12}},
                  React.createElement('div', {style: {padding: '6px 12px', borderRadius: os.btnRadius, background: os.btnBg, color: '#fff', fontSize: 10, fontWeight: 700, boxShadow: os.btnShadow, borderBottom: os.btnBorder, ...os.btnExtra}}, 'BUTON'),
                  React.createElement('div', {style: {padding: '6px 12px', borderRadius: os.btnRadius, background: C.bgHover, color: os.textSec, fontSize: 10, fontWeight: 600, border: `1px solid ${os.border}`}}, 'İKİNCİL')
                )
              )
            )
          )
        )
      ),

      /* ═══ BÖLÜM 3: TİPOGRAFİ ═══ */
      aktifSekme === 'tipografi' && React.createElement('div', {style: S.card},
        React.createElement('div', {style: {...S.cardHead, padding: '12px 16px'}},
          React.createElement(LIcon, {name: 'Type', size: 14, color: C.purple}),
          React.createElement('span', {style: {fontSize: 12, fontWeight: 700}}, 'TİPOGRAFİ AYARLARI')
        ),
        React.createElement('div', {style: {padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}},
          React.createElement('div', null,
            React.createElement(Slider, {label: 'FONT BOYUT ÖLÇEĞİ', value: config.tipografi.font_olcek, min: 80, max: 130, onChange: v => upTipo('font_olcek', v), suffix: '%', color: C.purple}),
            React.createElement(Slider, {label: 'SATIR YÜKSEKLİĞİ', value: config.tipografi.satir_yukseklik, min: 120, max: 200, onChange: v => upTipo('satir_yukseklik', v), suffix: '%', color: C.cyan}),
            React.createElement(SecimButonlari, {label: 'FONT AĞIRLIĞI', value: config.tipografi.font_agirlik, onChange: v => upTipo('font_agirlik', v), secenekler: [
              {value: 300, label: 'İNCE'},
              {value: 400, label: 'NORMAL'},
              {value: 600, label: 'ORTA'},
              {value: 800, label: 'KALIN'}
            ]})
          ),
          /* TİPOGRAFİ ÖNİZLEME */
          React.createElement('div', null,
            React.createElement('label', {style: S.label}, 'ÖNİZLEME'),
            React.createElement('div', {style: {padding: 20, borderRadius: os.bRad, background: os.bgColor, border: `1px solid ${os.border}`}},
              React.createElement('div', {style: {fontSize: 18 * os.fontScale, fontWeight: config.tipografi.font_agirlik, color: os.textColor, lineHeight: os.lineH, marginBottom: 12}}, 'BAŞLIK METNİ'),
              React.createElement('div', {style: {fontSize: 13 * os.fontScale, fontWeight: Math.max(config.tipografi.font_agirlik - 200, 300), color: os.textSec, lineHeight: os.lineH, marginBottom: 8}}, 'Alt başlık metni — bu metin ikincil renkte gösterilir'),
              React.createElement('div', {style: {fontSize: 11 * os.fontScale, fontWeight: Math.max(config.tipografi.font_agirlik - 300, 300), color: os.textSec, lineHeight: os.lineH}}, 'Gövde metni örneği. Bu paragraf metnin gövde kısmını temsil eder. Font ölçeği, ağırlık ve satır yüksekliği burada uygulanmış olarak gösterilmektedir.'),
              React.createElement('div', {style: {marginTop: 12, display: 'flex', gap: 12}},
                React.createElement('span', {style: {fontSize: 9 * os.fontScale, fontWeight: 700, color: os.accentColor}}, 'BADGE ÖRNEĞİ'),
                React.createElement('span', {style: {fontSize: 9 * os.fontScale, fontWeight: 600, color: C.textMuted}}, 'KÜÇÜK METİN')
              )
            )
          )
        )
      ),

      /* ═══ BÖLÜM 4: SAYFA DÜZENİ ═══ */
      aktifSekme === 'layout' && React.createElement('div', {style: S.card},
        React.createElement('div', {style: {...S.cardHead, padding: '12px 16px'}},
          React.createElement(LIcon, {name: 'LayoutGrid', size: 14, color: C.success}),
          React.createElement('span', {style: {fontSize: 12, fontWeight: 700}}, 'KART VE SAYFA DÜZENİ')
        ),
        React.createElement('div', {style: {padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}},
          React.createElement('div', null,
            React.createElement(SecimButonlari, {label: 'KART BOYUTU', value: config.layout.kart_boyut, onChange: v => upLayout('kart_boyut', v), secenekler: [
              {value: 'kucuk', label: 'KÜÇÜK', icon: 'Minimize2'},
              {value: 'orta', label: 'ORTA', icon: 'Square'},
              {value: 'buyuk', label: 'BÜYÜK', icon: 'Maximize2'}
            ]}),
            React.createElement(SecimButonlari, {label: 'GRİD SÜTUN SAYISI', value: config.layout.grid_sutun, onChange: v => upLayout('grid_sutun', Number(v)), secenekler: [
              {value: 2, label: '2 SÜTUN'},
              {value: 3, label: '3 SÜTUN'},
              {value: 4, label: '4 SÜTUN'}
            ]}),
            React.createElement(Slider, {label: 'İKON BOYUTU', value: config.layout.ikon_boyut, min: 14, max: 28, onChange: v => upLayout('ikon_boyut', Number(v)), suffix: 'PX', color: C.success}),
            React.createElement(Slider, {label: 'KART ARALIĞI (GAP)', value: config.layout.kart_aralik, min: 8, max: 32, onChange: v => upLayout('kart_aralik', Number(v)), suffix: 'PX', color: C.warning}),
            React.createElement(SecimButonlari, {label: 'İKON STİLİ', value: config.layout.ikon_stil, onChange: v => upLayout('ikon_stil', v), secenekler: [
              {value: 'outline', label: 'ÇİZGİ (OUTLINE)', icon: 'Circle'},
              {value: 'filled', label: 'DOLU (FİLLED)', icon: 'CircleDot'}
            ]})
          ),
          /* LAYOUT ÖNİZLEME */
          React.createElement('div', null,
            React.createElement('label', {style: S.label}, 'ÖNİZLEME'),
            React.createElement('div', {style: {padding: 16, borderRadius: os.bRad, background: os.bgColor, border: `1px solid ${os.border}`}},
              React.createElement('div', {style: {display: 'grid', gridTemplateColumns: `repeat(${os.gridCols}, 1fr)`, gap: os.kartGap}},
                ['DOSYA', 'CRM', 'MUHASEBE', 'POLİÇE', 'AJANDA', 'HESAP'].slice(0, os.gridCols * 2).map((ad, i) =>
                  React.createElement('div', {key: i, style: {
                    padding: os.kartPadding, borderRadius: os.bRad, background: os.cardBg, border: `${os.bWid}px solid ${os.border}`,
                    boxShadow: os.cardShadow, textAlign: 'center', ...os.kabartmaStyle
                  }},
                    React.createElement('div', {style: {
                      width: os.iconSize + 12, height: os.iconSize + 12, borderRadius: os.bRad > 12 ? '50%' : 8,
                      background: `${os.accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px'
                    }},
                      React.createElement(LIcon, {name: ['FolderOpen', 'Users', 'Landmark', 'FileCheck', 'CalendarDays', 'Calculator'][i], size: os.iconSize, color: os.accentColor})
                    ),
                    React.createElement('div', {style: {fontSize: 9 * os.fontScale, fontWeight: 700, color: os.textColor}}, ad)
                  )
                )
              )
            )
          )
        )
      ),

      /* ═══ BÖLÜM 5: BUTON STİLLERİ ═══ */
      aktifSekme === 'buton' && React.createElement('div', {style: S.card},
        React.createElement('div', {style: {...S.cardHead, padding: '12px 16px'}},
          React.createElement(LIcon, {name: 'SquareMousePointer', size: 14, color: C.pink}),
          React.createElement('span', {style: {fontSize: 12, fontWeight: 700}}, 'BUTON STİLLERİ')
        ),
        React.createElement('div', {style: {padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}},
          React.createElement('div', null,
            React.createElement(SecimButonlari, {label: 'BUTON TİPİ', value: config.buton.stil, onChange: v => upButon('stil', v), secenekler: [
              {value: 'duz', label: 'DÜZ (FLAT)', icon: 'Minus'},
              {value: 'gradient', label: 'GRADİENT', icon: 'Blend'},
              {value: 'threed', label: '3D', icon: 'Box'},
              {value: 'cam', label: 'CAM', icon: 'GlassWater'}
            ]}),
            React.createElement(Slider, {label: 'BUTON KÖŞE YUVARLAMASI', value: config.buton.radius, min: 0, max: 25, onChange: v => upButon('radius', Number(v)), suffix: 'PX', color: C.pink}),
            React.createElement(SecimButonlari, {label: 'HOVER EFEKTİ', value: config.buton.hover, onChange: v => upButon('hover', v), secenekler: [
              {value: 'scale', label: 'BÜYÜTME', icon: 'Maximize2'},
              {value: 'glow', label: 'IŞILDAMA', icon: 'Sun'},
              {value: 'slide', label: 'KAYMA', icon: 'ArrowRight'}
            ]})
          ),
          /* BUTON ÖNİZLEME */
          React.createElement('div', null,
            React.createElement('label', {style: S.label}, 'ÖNİZLEME'),
            React.createElement('div', {style: {padding: 20, borderRadius: os.bRad, background: os.bgColor, border: `1px solid ${os.border}`}},
              React.createElement('div', {style: {fontSize: 11, fontWeight: 700, color: os.textColor, marginBottom: 14}}, 'BUTON ÇEŞİTLERİ'),
              React.createElement('div', {style: {display: 'flex', flexDirection: 'column', gap: 10}},
                /* PRIMARY */
                React.createElement('div', {style: {display: 'flex', gap: 8, flexWrap: 'wrap'}},
                  React.createElement('button', {style: {
                    padding: '10px 20px', borderRadius: os.btnRadius, background: os.btnBg, color: '#fff',
                    fontSize: 11, fontWeight: 700, border: 'none', borderBottom: os.btnBorder,
                    boxShadow: os.btnShadow, cursor: 'pointer', ...os.btnExtra
                  }}, 'ANA BUTON'),
                  React.createElement('button', {style: {
                    padding: '10px 20px', borderRadius: os.btnRadius, background: `linear-gradient(180deg, #34d399 0%, #10b981 100%)`,
                    color: '#fff', fontSize: 11, fontWeight: 700, border: 'none',
                    boxShadow: config.buton.stil !== 'duz' ? '0 4px 12px -2px rgba(16,185,129,0.4)' : 'none', cursor: 'pointer'
                  }}, 'BAŞARI'),
                  React.createElement('button', {style: {
                    padding: '10px 20px', borderRadius: os.btnRadius, background: config.buton.stil === 'duz' ? C.danger : `linear-gradient(180deg, #f87171 0%, #ef4444 100%)`,
                    color: '#fff', fontSize: 11, fontWeight: 700, border: 'none',
                    boxShadow: config.buton.stil !== 'duz' ? '0 4px 12px -2px rgba(239,68,68,0.4)' : 'none', cursor: 'pointer'
                  }}, 'TEHLİKE'),
                  React.createElement('button', {style: {
                    padding: '10px 20px', borderRadius: os.btnRadius, background: config.buton.stil === 'duz' ? C.warning : `linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)`,
                    color: '#000', fontSize: 11, fontWeight: 700, border: 'none',
                    boxShadow: config.buton.stil !== 'duz' ? '0 4px 12px -2px rgba(245,158,11,0.4)' : 'none', cursor: 'pointer'
                  }}, 'UYARI')
                ),
                /* GHOST */
                React.createElement('div', {style: {display: 'flex', gap: 8}},
                  React.createElement('button', {style: {
                    padding: '10px 20px', borderRadius: os.btnRadius, background: C.bgHover,
                    color: os.textSec, fontSize: 11, fontWeight: 600, border: `1px solid ${os.border}`, cursor: 'pointer'
                  }}, 'GHOST BUTON'),
                  React.createElement('button', {style: {
                    padding: '6px 10px', borderRadius: Math.min(os.btnRadius, 7), background: os.btnBg, color: '#fff',
                    fontSize: 9, fontWeight: 700, border: 'none', boxShadow: os.btnShadow, cursor: 'pointer', ...os.btnExtra
                  }}, 'MİNİ')
                )
              )
            )
          )
        )
      ),

      /* ═══ BÖLÜM 6: CANLI ÖNİZLEME ═══ */
      aktifSekme === 'onizleme' && React.createElement('div', {style: S.card},
        React.createElement('div', {style: {...S.cardHead, padding: '12px 16px'}},
          React.createElement(LIcon, {name: 'Eye', size: 14, color: C.accent}),
          React.createElement('span', {style: {fontSize: 12, fontWeight: 700}}, 'CANLI ÖNİZLEME — TÜM AYARLAR KOMBİNE')
        ),
        React.createElement('div', {style: {padding: 16}},
          /* TAM SAYFA ÖNİZLEME */
          React.createElement('div', {style: {
            padding: 24, borderRadius: os.bRad, background: os.bgColor, border: `1px solid ${os.border}`, minHeight: 400
          }},
            /* ÜST BAR */
            React.createElement('div', {style: {
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px',
              background: os.cardBg, borderRadius: os.bRad, marginBottom: os.kartGap,
              border: `${os.bWid}px solid ${os.border}`, ...os.kabartmaStyle, ...os.camStyle
            }},
              React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: 10}},
                React.createElement('div', {style: {width: 28, height: 28, borderRadius: 8, background: `${os.accentColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center'}},
                  React.createElement(LIcon, {name: 'Shield', size: 16, color: os.accentColor})
                ),
                React.createElement('span', {style: {fontSize: 14 * os.fontScale, fontWeight: config.tipografi.font_agirlik, color: os.textColor}}, 'SİSTEM PANELİ')
              ),
              React.createElement('div', {style: {display: 'flex', gap: 6}},
                React.createElement('div', {style: {padding: '4px 10px', borderRadius: 6, background: `${os.accentColor}18`, color: os.accentColor, fontSize: 9 * os.fontScale, fontWeight: 700}}, 'ADMİN'),
                React.createElement('div', {style: {padding: '4px 10px', borderRadius: 6, background: `${config.palet.success}18`, color: config.palet.success, fontSize: 9 * os.fontScale, fontWeight: 700}}, 'AKTİF')
              )
            ),

            /* STAT KARTLARI */
            React.createElement('div', {style: {display: 'grid', gridTemplateColumns: `repeat(${os.gridCols}, 1fr)`, gap: os.kartGap, marginBottom: os.kartGap}},
              [{label: 'TOPLAM DOSYA', val: '1.248', renk: os.accentColor, icon: 'FolderOpen'},
               {label: 'AKTİF CRM', val: '86', renk: config.palet.success, icon: 'Users'},
               {label: 'BU AY GELİR', val: '₺124.500', renk: config.palet.warning, icon: 'TrendingUp'}
              ].slice(0, os.gridCols).map((stat, i) =>
                React.createElement('div', {key: i, style: {
                  padding: os.kartPadding, borderRadius: os.bRad, background: os.cardBg,
                  border: `${os.bWid}px solid ${os.border}`, ...os.kabartmaStyle, ...os.camStyle
                }},
                  React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8}},
                    React.createElement('div', {style: {width: os.iconSize + 8, height: os.iconSize + 8, borderRadius: 8, background: `${stat.renk}18`, display: 'flex', alignItems: 'center', justifyContent: 'center'}},
                      React.createElement(LIcon, {name: stat.icon, size: os.iconSize, color: stat.renk})
                    ),
                    React.createElement('span', {style: {fontSize: 10 * os.fontScale, fontWeight: 600, color: os.textSec}}, stat.label)
                  ),
                  React.createElement('div', {style: {fontSize: 22 * os.fontScale, fontWeight: 800, color: stat.renk}}, stat.val)
                )
              )
            ),

            /* TABLO ÖNİZLEME */
            React.createElement('div', {style: {
              borderRadius: os.bRad, background: os.cardBg, border: `${os.bWid}px solid ${os.border}`,
              overflow: 'hidden', ...os.kabartmaStyle, ...os.camStyle
            }},
              React.createElement('div', {style: {
                padding: '12px 16px', borderBottom: `1px solid ${os.border}`, display: 'flex', alignItems: 'center', gap: 8
              }},
                React.createElement(LIcon, {name: 'List', size: os.iconSize, color: os.accentColor}),
                React.createElement('span', {style: {fontSize: 12 * os.fontScale, fontWeight: 700, color: os.textColor}}, 'SON İŞLEMLER')
              ),
              [
                {dosya: 'DSY-2024-001', durum: 'AKTİF', tarih: '12.03.2026', renk: config.palet.success},
                {dosya: 'DSY-2024-002', durum: 'BEKLİYOR', tarih: '11.03.2026', renk: config.palet.warning},
                {dosya: 'DSY-2024-003', durum: 'KAPALI', tarih: '10.03.2026', renk: config.palet.danger}
              ].map((row, i) =>
                React.createElement('div', {key: i, style: {
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: `${os.kartPadding * 0.6}px 16px`,
                  borderBottom: i < 2 ? `1px solid ${os.border}` : 'none',
                  fontSize: 11 * os.fontScale, lineHeight: os.lineH
                }},
                  React.createElement('span', {style: {fontWeight: 600, color: os.textColor}}, row.dosya),
                  React.createElement('span', {style: {
                    padding: '3px 10px', borderRadius: 999, fontSize: 9 * os.fontScale, fontWeight: 700,
                    background: `${row.renk}18`, color: row.renk
                  }}, row.durum),
                  React.createElement('span', {style: {color: os.textSec, fontSize: 10 * os.fontScale}}, row.tarih),
                  React.createElement('button', {style: {
                    padding: '5px 12px', borderRadius: Math.min(os.btnRadius, 7), background: os.btnBg,
                    color: '#fff', fontSize: 9, fontWeight: 700, border: 'none', cursor: 'pointer',
                    boxShadow: os.btnShadow, ...os.btnExtra
                  }}, 'GÖRÜNTÜLE')
                )
              )
            )
          )
        )
      ),

      /* ═══ KAYDET / SIFIRLA BUTONLARI ═══ */
      React.createElement('div', {style: {
        ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16
      }},
        React.createElement('div', {style: {display: 'flex', gap: 8}},
          React.createElement('button', {style: {
            ...S.btn, ...S.btnG, fontSize: 12, padding: '10px 20px'
          }, onClick: sifirla},
            React.createElement(LIcon, {name: 'RotateCcw', size: 14, color: C.textSec}),
            'VARSAYILANA DÖN'
          )
        ),
        React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: 12}},
          React.createElement('div', {style: {fontSize: 10, color: C.textMuted}},
            React.createElement(LIcon, {name: 'Info', size: 12, color: C.textMuted, style: {verticalAlign: 'middle'}}),
            ' KAYDETTİĞİNİZDE TÜM KULLANICILARA ANINDA YANSIR'
          ),
          React.createElement('button', {style: {
            ...S.btn, ...S.btnP, fontSize: 13, padding: '12px 32px', fontWeight: 700,
            opacity: saving ? 0.7 : 1
          }, onClick: kaydet, disabled: saving},
            React.createElement(LIcon, {name: 'Save', size: 16, color: '#fff'}),
            saving ? 'KAYDEDİLİYOR...' : 'TEMA AYARLARINI KAYDET'
          )
        )
      )
    )
  );
ESKİ_TEMA_SONU */

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
   TAB 6 - SMS BİLDİRİM AYARLARI
   DOSYA DURUM DEĞİŞİKLİĞİNDE OTOMATİK SMS GÖNDERİMİ
   ════════════════════════════════════════════════════════════════ */
const SmsTab = () => {
  const {C, S, LIcon, Badge, FormGroup, Loading, api, fmt} = MR;
  const [smsAltTab, setSmsAltTab] = useState('ayarlar');
  const [ayarlar, setAyarlar] = useState({sms_aktif:'0',sms_kullanici:'',sms_sifre:'',sms_baslik:''});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mesaj, setMesaj] = useState(null);
  const [testTel, setTestTel] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [loglar, setLoglar] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  // GELEN SMS STATE
  const [gelenSmsler, setGelenSmsler] = useState([]);
  const [gelenLoading, setGelenLoading] = useState(false);
  const [gelenPage, setGelenPage] = useState(1);
  const [gelenTotal, setGelenTotal] = useState(0);
  const [gelenOkunmamis, setGelenOkunmamis] = useState(0);
  const [gelenArama, setGelenArama] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await api.ayarlarList();
      if (r?.success && r.data) {
        const a = {};
        (Array.isArray(r.data) ? r.data : []).forEach(item => {
          if (item.anahtar && item.anahtar.startsWith('sms_')) a[item.anahtar] = item.deger || '';
        });
        if (Object.keys(a).length === 0 && typeof r.data === 'object' && !Array.isArray(r.data)) {
          Object.keys(r.data).forEach(k => {
            if (k.startsWith('sms_')) a[k] = r.data[k] || '';
          });
        }
        setAyarlar(prev => ({...prev, ...a}));
      }
      setLoading(false);
      smsLoglariYukle(1);
      gelenSmsYukle(1, '');
    })();
  }, []);

  const smsLoglariYukle = async (page) => {
    setLogLoading(true);
    const r = await api.smsLogList({page, limit: 15});
    if (r?.success && r.data) {
      setLoglar(r.data.items || []);
      setLogTotal(r.data.pagination?.total || 0);
      setLogPage(page);
    }
    setLogLoading(false);
  };

  const gelenSmsYukle = async (page, arama) => {
    setGelenLoading(true);
    const p = {page, limit: 20};
    if (arama) p.arama = arama;
    const r = await api.smsGelenList(p);
    if (r?.success && r.data) {
      setGelenSmsler(r.data.items || []);
      setGelenTotal(r.data.pagination?.total || 0);
      setGelenOkunmamis(r.data.okunmamis || 0);
      setGelenPage(page);
    }
    setGelenLoading(false);
  };

  const gelenOkunduYap = async (id) => {
    const r = await api.smsGelenOkundu(id ? {id} : {hepsi: true});
    if (r?.success) gelenSmsYukle(gelenPage, gelenArama);
  };

  const kaydet = async () => {
    setSaving(true); setMesaj(null);
    const r = await api.ayarlarGuncelle(ayarlar);
    if (r?.success) setMesaj({type:'success', text:'SMS AYARLARI KAYDEDİLDİ'});
    else setMesaj({type:'error', text: r?.error || 'KAYIT HATASI'});
    setSaving(false);
  };

  const testGonder = async () => {
    if (!testTel) { setMesaj({type:'error', text:'TEST TELEFON NUMARASI GİRİN'}); return; }
    setTestLoading(true); setMesaj(null);
    const r = await api.smsTest({telefon: testTel});
    if (r?.success && r.data?.basarili) {
      setMesaj({type:'success', text:'TEST SMS GÖNDERİLDİ: ' + testTel});
    } else {
      setMesaj({type:'error', text: r?.data?.mesaj || r?.error || 'SMS GÖNDERİLEMEDİ'});
    }
    setTestLoading(false);
    smsLoglariYukle(1);
  };

  const u = (k,v) => setAyarlar(p => ({...p, [k]: v}));

  const durumRenk = (d) => {
    if (d === 'gonderildi') return C.success;
    if (d === 'hata') return C.danger;
    if (d === 'pasif') return C.warning;
    return C.textMuted;
  };

  if (loading) return <Loading/>;

  return (
    <div style={{display:'flex', flexDirection:'column', gap:16}}>
      {/* SMS ALT TAB NAVİGASYONU */}
      <div style={{display:'flex', gap:4, padding:4, background:C.bgHover, borderRadius:10}}>
        {[
          {id:'ayarlar', label:'SMS AYARLARI', icon:'Settings', color:C.accent},
          {id:'gelen', label:'GELEN SMS', icon:'MessageCircle', color:C.success, badge: gelenOkunmamis},
          {id:'gonderilenler', label:'GÖNDERİLEN SMS', icon:'Send', color:C.warning}
        ].map(t => (
          <div key={t.id} onClick={() => { setSmsAltTab(t.id); if(t.id==='gelen') gelenSmsYukle(1, gelenArama); }}
            style={{flex:1, padding:'10px 16px', borderRadius:8, cursor:'pointer', textAlign:'center',
              background: smsAltTab===t.id ? C.bgCard : 'transparent',
              border: smsAltTab===t.id ? `1px solid ${C.border}` : '1px solid transparent',
              boxShadow: smsAltTab===t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
            <LIcon name={t.icon} size={14} color={smsAltTab===t.id ? t.color : C.textMuted}/>
            <span style={{fontSize:11, fontWeight: smsAltTab===t.id ? 700 : 500,
              color: smsAltTab===t.id ? C.text : C.textMuted}}>{t.label}</span>
            {t.badge > 0 && (
              <span style={{background:C.danger, color:'#fff', fontSize:9, fontWeight:800,
                padding:'2px 7px', borderRadius:10, minWidth:18, textAlign:'center'}}>
                {t.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ═══ GELEN SMS PANELİ ═══ */}
      {smsAltTab === 'gelen' && (
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {/* GELEN SMS BANNER */}
          <div style={{padding:16, background:`${C.success}11`, borderRadius:12, border:`1px solid ${C.success}33`, display:'flex', alignItems:'center', gap:12}}>
            <div style={{width:44, height:44, borderRadius:12, background:`${C.success}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
              <LIcon name="MessageCircle" size={22} color={C.success}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:800, color:C.success}}>GELEN SMS KUTUSU</div>
              <div style={{fontSize:11, color:C.textSec, marginTop:2}}>
                NETGSM İNTERAKTİF SMS İLE GELEN MESAJLAR OTOMATİK OLARAK BURADA LİSTELENİR.
              </div>
            </div>
            {gelenOkunmamis > 0 && (
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:24, fontWeight:900, color:C.danger}}>{gelenOkunmamis}</div>
                <div style={{fontSize:9, color:C.textMuted}}>OKUNMAMIŞ</div>
              </div>
            )}
          </div>

          {/* ARAMA + İŞLEMLER */}
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <div style={{flex:1, position:'relative'}}>
              <LIcon name="Search" size={14} color={C.textMuted} style={{position:'absolute', left:12, top:10}}/>
              <input value={gelenArama} onChange={e => setGelenArama(e.target.value)}
                onKeyDown={e => e.key==='Enter' && gelenSmsYukle(1, gelenArama)}
                placeholder="TELEFON VEYA MESAJ İÇERİĞİNDE ARA..."
                style={{...S.input, paddingLeft:36, fontSize:12}}/>
            </div>
            <button onClick={() => gelenSmsYukle(1, gelenArama)}
              style={{...S.btn, ...S.btnP, fontSize:10, padding:'10px 16px'}}>
              <LIcon name="Search" size={13} color="#fff"/> ARA
            </button>
            {gelenOkunmamis > 0 && (
              <button onClick={() => gelenOkunduYap(null)}
                style={{...S.btn, ...S.btnS, fontSize:10, padding:'10px 16px'}}>
                <LIcon name="CheckCircle" size={13} color="#fff"/> TÜMÜNÜ OKUNDU YAP
              </button>
            )}
            <button onClick={() => gelenSmsYukle(1, gelenArama)}
              style={{...S.btn, ...S.btnG, fontSize:10, padding:'10px 16px'}}>
              <LIcon name="RefreshCw" size={13}/> YENİLE
            </button>
          </div>

          {/* İSTATİSTİKLER */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
            <div style={{...S.stat, textAlign:'center'}}>
              <div style={{fontSize:20, fontWeight:800, color:C.success}}>{gelenTotal}</div>
              <div style={{fontSize:9, color:C.textMuted, marginTop:2}}>TOPLAM GELEN</div>
            </div>
            <div style={{...S.stat, textAlign:'center'}}>
              <div style={{fontSize:20, fontWeight:800, color:C.danger}}>{gelenOkunmamis}</div>
              <div style={{fontSize:9, color:C.textMuted, marginTop:2}}>OKUNMAMIŞ</div>
            </div>
            <div style={{...S.stat, textAlign:'center'}}>
              <div style={{fontSize:20, fontWeight:800, color:C.accent}}>{gelenTotal - gelenOkunmamis}</div>
              <div style={{fontSize:9, color:C.textMuted, marginTop:2}}>OKUNMUŞ</div>
            </div>
          </div>

          {/* GELEN SMS TABLOSU */}
          <div style={S.card}>
            <div style={{...S.cardHead, justifyContent:'space-between'}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <LIcon name="Inbox" size={16} color={C.success}/>
                <span style={{fontSize:13, fontWeight:700}}>GELEN MESAJLAR</span>
                <span style={{fontSize:10, color:C.textMuted}}>({gelenTotal} KAYIT)</span>
              </div>
            </div>
            {gelenLoading ? <div style={{padding:30, textAlign:'center'}}><Loading/></div> : (
              gelenSmsler.length > 0 ? (
                <div>
                  {gelenSmsler.map((sms, i) => (
                    <div key={i} onClick={() => { if(!sms.okundu || sms.okundu==='0' || sms.okundu===0) gelenOkunduYap(sms.id); }}
                      style={{padding:'14px 20px', borderBottom:`1px solid ${C.border}22`, cursor:'pointer',
                        background: (!sms.okundu || sms.okundu==='0' || sms.okundu===0) ? `${C.accent}06` : 'transparent',
                        transition:'all .2s'}}>
                      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:8}}>
                        <div style={{width:36, height:36, borderRadius:18,
                          background: (!sms.okundu || sms.okundu==='0' || sms.okundu===0) ? `${C.success}22` : `${C.textMuted}15`,
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                          <LIcon name={(!sms.okundu || sms.okundu==='0' || sms.okundu===0) ? 'Mail' : 'MailOpen'} size={16}
                            color={(!sms.okundu || sms.okundu==='0' || sms.okundu===0) ? C.success : C.textMuted}/>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:'flex', alignItems:'center', gap:8}}>
                            <span style={{fontSize:12, fontWeight: (!sms.okundu || sms.okundu==='0' || sms.okundu===0) ? 800 : 600, color:C.text}}>
                              {sms.gonderen_adi || 'BİLİNMEYEN'}
                            </span>
                            <span style={{fontSize:11, fontFamily:'monospace', color:C.textSec}}>{sms.gonderen}</span>
                            {sms.dosya_no && <Badge text={sms.dosya_no} color={C.accent}/>}
                            {(!sms.okundu || sms.okundu==='0' || sms.okundu===0) && (
                              <span style={{width:8, height:8, borderRadius:4, background:C.success, flexShrink:0}}/>
                            )}
                          </div>
                          <div style={{fontSize:10, color:C.textMuted, marginTop:2}}>
                            {sms.mesaj_tarihi ? new Date(sms.mesaj_tarihi).toLocaleString('tr-TR') : (sms.created_at ? new Date(sms.created_at).toLocaleString('tr-TR') : '-')}
                          </div>
                        </div>
                      </div>
                      <div style={{fontSize:12, color: (!sms.okundu || sms.okundu==='0' || sms.okundu===0) ? C.text : C.textSec,
                        lineHeight:1.6, marginLeft:48, fontWeight: (!sms.okundu || sms.okundu==='0' || sms.okundu===0) ? 600 : 400}}>
                        {sms.mesaj}
                      </div>
                    </div>
                  ))}
                  {/* SAYFALAMA */}
                  {gelenTotal > 20 && (
                    <div style={{padding:12, display:'flex', justifyContent:'center', gap:6}}>
                      {Array.from({length: Math.ceil(gelenTotal / 20)}, (_, i) => i + 1).slice(0, 10).map(p => (
                        <div key={p} onClick={() => gelenSmsYukle(p, gelenArama)}
                          style={{width:28, height:28, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontWeight: p===gelenPage ? 800 : 500, cursor:'pointer',
                            background: p===gelenPage ? `${C.accent}22` : 'transparent',
                            color: p===gelenPage ? C.accent : C.textMuted,
                            border:`1px solid ${p===gelenPage ? C.accent+'33' : 'transparent'}`}}>
                          {p}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{padding:40, textAlign:'center'}}>
                  <LIcon name="Inbox" size={36} color={C.textMuted} style={{opacity:0.2}}/>
                  <div style={{fontSize:13, fontWeight:600, color:C.textMuted, marginTop:12}}>HENÜZ GELEN SMS BULUNMUYOR</div>
                  <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>NETGSM İNTERAKTİF SMS WEBHOOK AKTİF EDİLDİĞİNDE GELEN MESAJLAR BURADA GÖRÜNECEK</div>
                </div>
              )
            )}
          </div>

          {/* WEBHOOK BİLGİ */}
          <div style={S.card}>
            <div style={{...S.cardHead, background:`${C.cyan}06`}}>
              <LIcon name="Webhook" size={16} color={C.cyan}/>
              <span style={{fontSize:13, fontWeight:700}}>WEBHOOK KURULUMU</span>
            </div>
            <div style={{padding:20, fontSize:11, color:C.textSec, lineHeight:1.8}}>
              <div style={{marginBottom:12}}>NETGSM PORTALINDAN AŞAĞIDAKİ AYARLARI YAPIN:</div>
              <div style={{display:'flex', gap:8, marginBottom:8}}>
                <div style={{width:24, height:24, borderRadius:12, background:`${C.accent}22`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:C.accent}}>1</div>
                <div><strong>PORTAL.NETGSM.COM.TR</strong> > SMS İŞLEMLERİ > İNTERAKTİF SMS > URL YÖNLENDİR</div>
              </div>
              <div style={{display:'flex', gap:8, marginBottom:8}}>
                <div style={{width:24, height:24, borderRadius:12, background:`${C.success}22`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:C.success}}>2</div>
                <div>URL ADRESİ: <code style={{background:C.bgHover, padding:'2px 8px', borderRadius:4, fontFamily:'monospace', fontSize:11}}>
                  {(ayarlar.site_url || 'https://sistem.mrhasardanismanlik.com')}/api/v1/sms/webhook.php
                </code></div>
              </div>
              <div style={{display:'flex', gap:8, marginBottom:8}}>
                <div style={{width:24, height:24, borderRadius:12, background:`${C.warning}22`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:C.warning}}>3</div>
                <div>HEADERS: <code style={{background:C.bgHover, padding:'2px 8px', borderRadius:4, fontFamily:'monospace', fontSize:11}}>
                  xapi-key:mr_hasar_2026
                </code></div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <div style={{width:24, height:24, borderRadius:12, background:`${C.purple}22`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:C.purple}}>4</div>
                <div>BASICAUTH: <strong>BOŞ BIRAKIN</strong> (XAPI-KEY YETERLİ)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GÖNDERİLEN SMS PANELİ (MEVCUT LOG) ═══ */}
      {smsAltTab === 'gonderilenler' && (
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {/* SMS LOG TABLOSU */}
          <div style={S.card}>
            <div style={{...S.cardHead, justifyContent:'space-between'}}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <LIcon name="List" size={16} color={C.accent}/>
                <span style={{fontSize:13, fontWeight:700}}>SMS GÖNDERİM GEÇMİŞİ</span>
                <span style={{fontSize:10, color:C.textMuted}}>({logTotal} KAYIT)</span>
              </div>
              <button onClick={() => smsLoglariYukle(1)} style={{...S.btn, ...S.btnG, fontSize:10, padding:'5px 12px'}}>
                <LIcon name="RefreshCw" size={12}/> YENİLE
              </button>
            </div>
            {logLoading ? <div style={{padding:30, textAlign:'center'}}><Loading/></div> : (
              loglar.length > 0 ? (
                <div>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                    <thead>
                      <tr style={{background:C.bgHover}}>
                        {['TARİH','TELEFON','DOSYA NO','DURUM','MESAJ','KULLANICI'].map(h =>
                          <th key={h} style={{padding:'8px 10px', textAlign:'left', color:C.textMuted, fontWeight:600, fontSize:9, borderBottom:`1px solid ${C.border}`}}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {loglar.map((log, i) => (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'8px 10px', fontSize:10, color:C.textMuted, whiteSpace:'nowrap'}}>
                            {log.created_at ? new Date(log.created_at).toLocaleString('tr-TR') : '-'}
                          </td>
                          <td style={{padding:'8px 10px', fontFamily:'monospace', fontSize:11, fontWeight:600}}>{log.telefon || '-'}</td>
                          <td style={{padding:'8px 10px'}}>
                            {log.dosya_no ? <Badge text={log.dosya_no} color={C.accent}/> : '-'}
                          </td>
                          <td style={{padding:'8px 10px'}}>
                            <Badge text={log.durum === 'gonderildi' ? 'GÖNDERİLDİ' : log.durum === 'hata' ? 'HATA' : (log.durum || '').toUpperCase()} color={durumRenk(log.durum)}/>
                          </td>
                          <td style={{padding:'8px 10px', fontSize:10, color:C.textSec, maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {log.sonuc_mesaj || log.mesaj || '-'}
                          </td>
                          <td style={{padding:'8px 10px', fontSize:10, color:C.textMuted}}>{log.kullanici_adi || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {logTotal > 15 && (
                    <div style={{padding:12, display:'flex', justifyContent:'center', gap:6}}>
                      {Array.from({length: Math.ceil(logTotal / 15)}, (_, i) => i + 1).slice(0, 10).map(p => (
                        <div key={p} onClick={() => smsLoglariYukle(p)}
                          style={{width:28, height:28, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, fontWeight: p===logPage ? 800 : 500, cursor:'pointer',
                            background: p===logPage ? `${C.accent}22` : 'transparent',
                            color: p===logPage ? C.accent : C.textMuted,
                            border:`1px solid ${p===logPage ? C.accent+'33' : 'transparent'}`}}>
                          {p}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{padding:40, textAlign:'center'}}>
                  <LIcon name="MessageSquare" size={36} color={C.textMuted} style={{opacity:0.2}}/>
                  <div style={{fontSize:13, fontWeight:600, color:C.textMuted, marginTop:12}}>HENÜZ SMS GÖNDERİMİ YAPILMADI</div>
                  <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>DOSYA DURUMU DEĞİŞTİĞİNDE SMS GÖNDERİMLERİ BURADA GÖRÜNECEK</div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ═══ SMS AYARLARI PANELİ ═══ */}
      {smsAltTab === 'ayarlar' && (
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
      {/* BİLGİ BANNER */}
      <div style={{padding:16, background:`${C.accent}11`, borderRadius:12, border:`1px solid ${C.accent}33`, display:'flex', alignItems:'center', gap:12}}>
        <div style={{width:44, height:44, borderRadius:12, background:`${C.accent}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
          <LIcon name="MessageSquare" size={22} color={C.accent}/>
        </div>
        <div>
          <div style={{fontSize:14, fontWeight:800, color:C.accent}}>OTOMATİK SMS BİLDİRİM SİSTEMİ</div>
          <div style={{fontSize:11, color:C.textSec, marginTop:2}}>
            DOSYA DURUMU HER DEĞİŞTİĞİNDE MAĞDURA OTOMATİK SMS GÖNDERİLİR. EVRAK YÜKLÜYSE PDF LİNKİ DE SMS İÇİNDE YER ALIR.
          </div>
        </div>
      </div>

      {/* MESAJ */}
      {mesaj && (
        <div style={{padding:12, background: mesaj.type==='success' ? `${C.success}18` : `${C.danger}18`,
          borderRadius:8, border:`1px solid ${mesaj.type==='success' ? C.success+'33' : C.danger+'33'}`,
          color: mesaj.type==='success' ? C.success : C.danger, fontSize:12, fontWeight:600,
          display:'flex', alignItems:'center', gap:8}}>
          <LIcon name={mesaj.type==='success' ? 'CheckCircle' : 'AlertCircle'} size={16}
            color={mesaj.type==='success' ? C.success : C.danger}/>
          {mesaj.text}
          <span style={{marginLeft:'auto', cursor:'pointer', opacity:0.6}} onClick={() => setMesaj(null)}>✕</span>
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        {/* SOL: AYARLAR */}
        <div style={S.card}>
          <div style={{...S.cardHead}}>
            <LIcon name="Settings" size={16} color={C.accent}/>
            <span style={{fontSize:13, fontWeight:700}}>NETGSM SMS AYARLARI</span>
          </div>
          <div style={{padding:20, display:'flex', flexDirection:'column', gap:14}}>
            {/* AKTİF/PASİF */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:12,
              background: ayarlar.sms_aktif==='1' ? `${C.success}11` : `${C.danger}08`,
              borderRadius:10, border:`1px solid ${ayarlar.sms_aktif==='1' ? C.success+'33' : C.danger+'22'}`}}>
              <div>
                <div style={{fontSize:12, fontWeight:700}}>SMS BİLDİRİM</div>
                <div style={{fontSize:10, color:C.textMuted, marginTop:2}}>
                  {ayarlar.sms_aktif==='1' ? 'DURUM DEĞİŞİKLİKLERİNDE SMS GÖNDERİLİYOR' : 'SMS GÖNDERİMİ KAPALI'}
                </div>
              </div>
              <div onClick={() => u('sms_aktif', ayarlar.sms_aktif==='1' ? '0' : '1')}
                style={{width:52, height:28, borderRadius:14, cursor:'pointer', transition:'all .3s',
                  background: ayarlar.sms_aktif==='1' ? C.success : C.borderLight, position:'relative'}}>
                <div style={{width:22, height:22, borderRadius:11, background:'#fff', position:'absolute', top:3,
                  left: ayarlar.sms_aktif==='1' ? 27 : 3, transition:'all .3s',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
              </div>
            </div>

            <FormGroup label="NETGSM KULLANICI ADI (USERCODE)">
              <input value={ayarlar.sms_kullanici||''} onChange={e => u('sms_kullanici', e.target.value)}
                placeholder="5550984254" style={{...S.input, fontSize:12}}/>
              <div style={{fontSize:9, color:C.textMuted, marginTop:4}}>
                NETGSM PANELİNDEKİ "KULLANICI ADI" (TELEFON NUMARANIZ). ABONELİK BİLGİLERİ SAYFASINDAN KONTROL EDİN.
              </div>
            </FormGroup>

            <FormGroup label="NETGSM ŞİFRE">
              <input type="password" value={ayarlar.sms_sifre||''} onChange={e => u('sms_sifre', e.target.value)}
                placeholder="••••••••" style={{...S.input, fontSize:12}}/>
              <div style={{fontSize:9, color:C.textMuted, marginTop:4}}>
                NETGSM PANELİNE GİRİŞ ŞİFRENİZ
              </div>
            </FormGroup>

            <FormGroup label="SMS BAŞLIĞI (SENDER / MSGHEADER)">
              <input value={ayarlar.sms_baslik||''} onChange={e => u('sms_baslik', e.target.value)}
                placeholder="MR HASAR" maxLength={11} style={{...S.input, fontSize:12}}/>
              <div style={{fontSize:9, color:C.textMuted, marginTop:4}}>
                NETGSM PANELİNDEN ONAYLANMIŞ GÖNDERİCİ ADI. "VARSAYILAN GÖNDERİCİ ADI" ALANIDIR (MAX 11 KARAKTER).
              </div>
            </FormGroup>

            <FormGroup label="SİTE URL (EVRAK LİNKLERİ İÇİN)">
              <input value={ayarlar.site_url||''} onChange={e => u('site_url', e.target.value)}
                placeholder="https://sistem.mrhasardanismanlik.com" style={{...S.input, fontSize:12}}/>
              <div style={{fontSize:9, color:C.textMuted, marginTop:4}}>
                EVRAK İNDİRME LİNKLERİ BU URL ÜZERİNDEN OLUŞTURULUR
              </div>
            </FormGroup>

            <button onClick={kaydet} disabled={saving}
              style={{...S.btn, ...S.btnS, justifyContent:'center', padding:14, fontSize:13, fontWeight:700}}>
              <LIcon name="Save" size={16} color="#fff"/>
              {saving ? 'KAYDEDİLİYOR...' : 'SMS AYARLARINI KAYDET'}
            </button>
          </div>
        </div>

        {/* SAĞ: TEST + BİLGİ */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {/* TEST SMS */}
          <div style={S.card}>
            <div style={{...S.cardHead}}>
              <LIcon name="Send" size={16} color={C.warning}/>
              <span style={{fontSize:13, fontWeight:700}}>SMS TEST GÖNDERİMİ</span>
            </div>
            <div style={{padding:20}}>
              <FormGroup label="TEST TELEFON NUMARASI">
                <div style={{display:'flex', gap:8}}>
                  <input value={testTel} onChange={e => setTestTel(e.target.value)}
                    placeholder="05XX XXX XX XX" style={{...S.input, fontSize:12, flex:1}}/>
                  <button onClick={testGonder} disabled={testLoading}
                    style={{...S.btn, ...S.btnW, fontSize:11, padding:'8px 16px', whiteSpace:'nowrap'}}>
                    <LIcon name="Send" size={13} color="#000"/>
                    {testLoading ? 'GÖNDERİLİYOR...' : 'TEST GÖNDER'}
                  </button>
                </div>
              </FormGroup>
            </div>
          </div>

          {/* NASIL ÇALIŞIR */}
          <div style={S.card}>
            <div style={{...S.cardHead, background:`${C.cyan}06`}}>
              <LIcon name="HelpCircle" size={16} color={C.cyan}/>
              <span style={{fontSize:13, fontWeight:700}}>NASIL ÇALIŞIR?</span>
            </div>
            <div style={{padding:20, fontSize:11, color:C.textSec, lineHeight:1.8}}>
              <div style={{display:'flex', gap:8, marginBottom:10}}>
                <div style={{width:24, height:24, borderRadius:12, background:`${C.accent}22`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:C.accent}}>1</div>
                <div>DOSYA DETAY SAYFASINDA DURUM (AŞAMA) DEĞİŞTİRİLİR</div>
              </div>
              <div style={{display:'flex', gap:8, marginBottom:10}}>
                <div style={{width:24, height:24, borderRadius:12, background:`${C.success}22`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:C.success}}>2</div>
                <div>SİSTEM OTOMATİK OLARAK MAĞDURUN TELEFONUNA SMS GÖNDER</div>
              </div>
              <div style={{display:'flex', gap:8, marginBottom:10}}>
                <div style={{width:24, height:24, borderRadius:12, background:`${C.warning}22`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:C.warning}}>3</div>
                <div>SMS İÇERİĞİ: YENİ DURUM BİLGİSİ + EVRAK PDF LİNKİ (VARSA)</div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <div style={{width:24, height:24, borderRadius:12, background:`${C.purple}22`, display:'flex',
                  alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:C.purple}}>4</div>
                <div>TÜM SMS GÖNDERİMLERİ LOGLANIR VE AŞAĞIDAKİ TABLODA GÖRÜNTÜLENİR</div>
              </div>
            </div>
          </div>

          {/* İSTATİSTİK */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
            <div style={{...S.stat, textAlign:'center'}}>
              <div style={{fontSize:20, fontWeight:800, color:C.success}}>{loglar.filter(l=>l.durum==='gonderildi').length}</div>
              <div style={{fontSize:9, color:C.textMuted, marginTop:2}}>BAŞARILI</div>
            </div>
            <div style={{...S.stat, textAlign:'center'}}>
              <div style={{fontSize:20, fontWeight:800, color:C.danger}}>{loglar.filter(l=>l.durum==='hata').length}</div>
              <div style={{fontSize:9, color:C.textMuted, marginTop:2}}>BAŞARISIZ</div>
            </div>
            <div style={{...S.stat, textAlign:'center'}}>
              <div style={{fontSize:20, fontWeight:800, color:C.accent}}>{logTotal}</div>
              <div style={{fontSize:9, color:C.textMuted, marginTop:2}}>TOPLAM</div>
            </div>
          </div>
        </div>
      </div>

        </div>
      )}
    </div>
  );
};



/* ════════════════════════════════════════════════════════════════
   TOPLU DOSYA AKTARIM TAB'I (SADECE ADMİN)
   ════════════════════════════════════════════════════════════════ */
const TopluAktarimTab = () => {
  const {C, S, LIcon, api} = MR;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sablonIndiriliyor, setSablonIndiriliyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');
  const [secilenDosya, setSecilenDosya] = useState(null);
  const fileRef = React.useRef(null);

  /* ŞABLON İNDİR (XLSX) */
  const sablonIndir = () => {
    setSablonIndiriliyor(true);
    try {
      const basliklar = [
        'T.C. NO','ADI SOYADI','DOSYA KAYNAĞI','DOSYA TÜRÜ','DAVALI ŞİRKET',
        'SİGORTA HASAR NO','KAZA TARİHİ','DOSYA AŞAMA DURUMU',
        'TELEFON','TELEFON 2','E-POSTA','POLİÇE NO','KAZA İL','KAZA İLÇE',
        'PLAKA','MARKA','MODEL','MODEL YILI','KARŞI PLAKA','KARŞI SİGORTA','NOTLAR'
      ];
      const ornek1 = [
        '12345678901','Ahmet Yılmaz','OFİS CRM','ADK','Axa Sigorta',
        'HSR-2026-001','15.01.2026','Dosya Açık',
        '0532 111 2233','','ahmet@email.com','POL-123456','İSTANBUL','KADIKÖY',
        '34 ABC 123','TOYOTA','COROLLA','2022','06 DEF 456','Allianz Sigorta','Toplu aktarım ile eklendi'
      ];
      const ornek2 = [
        '98765432109','Fatma Demir','YÖNLENDİREN','BH','Mapfre Sigorta',
        '','20.02.2026','Dosya Açık',
        '0533 444 5566','','','','ANKARA','ÇANKAYA',
        '','','','','','',''
      ];
      const ws = XLSX.utils.aoa_to_sheet([basliklar, ornek1, ornek2]);
      /* Sütun genişlikleri */
      ws['!cols'] = basliklar.map(b => ({wch: Math.max(b.length + 4, 14)}));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
      XLSX.writeFile(wb, 'dosya_toplu_aktarim_sablonu.xlsx');
    } catch(e) { setHata('İNDİRME HATASI: ' + e.message); }
    setSablonIndiriliyor(false);
  };

  /* DOSYA YÜKLE (XLSX/CSV) */
  const dosyaYukle = async () => {
    if (!secilenDosya) { setHata('LÜTFEN BİR EXCEL VEYA CSV DOSYASI SEÇİN'); return; }
    setYukleniyor(true); setHata(''); setSonuc(null);

    try {
      const token = MR.api?.token;
      const formData = new FormData();
      const ext = secilenDosya.name.split('.').pop().toLowerCase();

      if (['xlsx','xls'].includes(ext)) {
        /* Excel dosyasını oku ve CSV'ye çevir */
        const buf = await secilenDosya.arrayBuffer();
        const wb = XLSX.read(buf, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csvStr = XLSX.utils.sheet_to_csv(ws, {FS:';'});
        const csvBlob = new Blob(['\uFEFF' + csvStr], {type:'text/csv;charset=utf-8'});
        formData.append('dosya', csvBlob, secilenDosya.name.replace(/\.xlsx?$/i, '.csv'));
      } else {
        formData.append('dosya', secilenDosya);
      }

      const r = await fetch('/api/v1/dosya/excel-import.php', {
        method: 'POST',
        headers: token ? {'Authorization': 'Bearer ' + token} : {},
        body: formData
      });

      const json = await r.json();
      if (json.success) {
        setSonuc(json.data);
        setSecilenDosya(null);
        if (fileRef.current) fileRef.current.value = '';
      } else {
        setHata(json.error || 'AKTARIM HATASI');
      }
    } catch(e) {
      setHata('BAĞLANTI HATASI: ' + e.message);
    }
    setYukleniyor(false);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* BİLGİ KARTI */}
      <div style={{...S.card}}>
        <div style={{...S.cardHead}}>
          <LIcon name="FileSpreadsheet" size={16} color={C.accent}/>
          <span style={{fontWeight:700}}>TOPLU DOSYA AKTARIMI (EXCEL)</span>
        </div>
        <div style={{padding:16}}>
          <div style={{background:`${C.accent}08`,border:`1px solid ${C.accent}22`,borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              <LIcon name="Info" size={14} color={C.accent}/> NASIL KULLANILIR?
            </div>
            <ol style={{fontSize:11,color:C.textSec,lineHeight:1.8,margin:0,paddingLeft:20}}>
              <li><b>ŞABLON İNDİR</b> butonuna tıklayarak Excel şablonunu indirin</li>
              <li>Şablondaki örnek satırları silin, kendi verilerinizi doldurun</li>
              <li><b>DOSYA TÜRÜ</b> (ADK/BH) ve <b>ADI SOYADI</b> zorunlu alanlardır</li>
              <li>Kaza tarihi formatı: <b>GG.AA.YYYY</b> (örn: 15.01.2026)</li>
              <li>Excel dosyasını <b>YÜKLE</b> butonuyla sisteme aktarın</li>
            </ol>
          </div>

          {/* ŞABLON SÜTUN BİLGİSİ */}
          <div style={{background:C.bgInput,borderRadius:8,padding:12,marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:C.textMuted,marginBottom:8}}>ŞABLON ALANLARI:</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {['DOSYA TÜRÜ *','ADI SOYADI *','T.C. KİMLİK','TELEFON','TELEFON 2','E-POSTA',
                'SİGORTA ŞİRKETİ','HASAR NO','POLİÇE NO','KAZA TARİHİ','KAZA İL','KAZA İLÇE',
                'PLAKA','MARKA','MODEL','MODEL YILI','KARŞI PLAKA','KARŞI SİGORTA','DOSYA KAYNAĞI','AŞAMA','NOTLAR'
              ].map((s,i) => (
                <span key={i} style={{
                  fontSize:9,fontWeight:s.includes('*')?800:600,
                  padding:'3px 8px',borderRadius:4,
                  background:s.includes('*')?`${C.danger}18`:`${C.accent}12`,
                  color:s.includes('*')?C.danger:C.textSec,
                  border:`1px solid ${s.includes('*')?C.danger+'33':C.border}`
                }}>{s}</span>
              ))}
            </div>
            <div style={{fontSize:9,color:C.textMuted,marginTop:6}}>* Zorunlu alanlar</div>
          </div>

          {/* BUTONLAR */}
          <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
            {/* ŞABLON İNDİR */}
            <button onClick={sablonIndir} disabled={sablonIndiriliyor}
              style={{...S.btn,...S.btnP,padding:'12px 24px',fontSize:12,
                opacity:sablonIndiriliyor?0.6:1}}>
              <LIcon name="Download" size={16} color="#fff"/>
              {sablonIndiriliyor ? 'İNDİRİLİYOR...' : 'ŞABLON İNDİR (EXCEL)'}
            </button>

            {/* DOSYA SEÇ + YÜKLE */}
            <div style={{display:'flex',gap:8,alignItems:'center',flex:1,minWidth:280}}>
              <label style={{...S.btn,padding:'12px 24px',fontSize:12,fontWeight:700,borderRadius:10,cursor:'pointer',
                background:'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)',color:'#fff',border:'none',display:'flex',alignItems:'center',gap:8,
                boxShadow:'0 4px 14px -2px rgba(16,185,129,0.5), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',borderBottom:'2px solid #047857'}}>
                <LIcon name="Upload" size={16} color="#fff"/>
                DOSYA SEÇ
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" style={{display:'none'}}
                  onChange={e => { setSecilenDosya(e.target.files[0] || null); setHata(''); setSonuc(null); }}/>
              </label>
              {secilenDosya && (
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                  <div style={{fontSize:11,color:C.text,fontWeight:600,padding:'8px 12px',background:C.bgInput,borderRadius:8,border:`1px solid ${C.border}`,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    <LIcon name="FileText" size={12} color={C.accent} style={{marginRight:6}}/>
                    {secilenDosya.name} ({(secilenDosya.size/1024).toFixed(0)}KB)
                  </div>
                  <button onClick={dosyaYukle} disabled={yukleniyor}
                    style={{...S.btn,padding:'10px 20px',fontSize:12,fontWeight:700,borderRadius:10,cursor:'pointer',
                      background:C.warning,color:'#fff',border:'none',display:'flex',alignItems:'center',gap:6,
                      opacity:yukleniyor?0.6:1,whiteSpace:'nowrap'}}>
                    <LIcon name="Upload" size={14} color="#fff"/>
                    {yukleniyor ? 'AKTARILIYOR...' : 'AKTAR'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* HATA MESAJI */}
          {hata && (
            <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:`${C.danger}12`,border:`1px solid ${C.danger}33`,
              color:C.danger,fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="AlertTriangle" size={14} color={C.danger}/> {hata}
            </div>
          )}
        </div>
      </div>

      {/* SONUÇ KARTI */}
      {sonuc && (
        <div style={{...S.card}}>
          <div style={{...S.cardHead,background:`${sonuc.hatali > 0 ? C.warning : C.success}08`}}>
            <LIcon name={sonuc.hatali > 0 ? 'AlertCircle' : 'CheckCircle'} size={16} color={sonuc.hatali > 0 ? C.warning : C.success}/>
            <span style={{fontWeight:700}}>AKTARIM SONUCU</span>
          </div>
          <div style={{padding:16}}>
            {/* ÖZET */}
            <div style={{display:'flex',gap:12,marginBottom:16}}>
              <div style={{flex:1,padding:14,borderRadius:10,background:`${C.success}10`,border:`1px solid ${C.success}22`,textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:800,color:C.success}}>{sonuc.basarili}</div>
                <div style={{fontSize:10,fontWeight:600,color:C.success,marginTop:2}}>BAŞARILI</div>
              </div>
              <div style={{flex:1,padding:14,borderRadius:10,background:`${C.danger}10`,border:`1px solid ${C.danger}22`,textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:800,color:C.danger}}>{sonuc.hatali}</div>
                <div style={{fontSize:10,fontWeight:600,color:C.danger,marginTop:2}}>HATALI</div>
              </div>
              <div style={{flex:1,padding:14,borderRadius:10,background:`${C.accent}10`,border:`1px solid ${C.accent}22`,textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:800,color:C.accent}}>{sonuc.toplam}</div>
                <div style={{fontSize:10,fontWeight:600,color:C.accent,marginTop:2}}>TOPLAM</div>
              </div>
            </div>

            {/* OLUŞTURULAN DOSYALAR */}
            {sonuc.olusturulan?.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:C.success,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                  <LIcon name="Check" size={12} color={C.success}/> OLUŞTURULAN DOSYALAR
                </div>
                <div style={{maxHeight:300,overflowY:'auto',borderRadius:8,border:`1px solid ${C.border}`}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:C.bgInput}}>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:C.textMuted}}>SATIR</th>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:C.textMuted}}>DOSYA NO</th>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:C.textMuted}}>ADI SOYADI</th>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:C.textMuted}}>TÜR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sonuc.olusturulan.map((d,i) => (
                        <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                          <td style={{padding:'6px 10px',fontSize:10,color:C.textMuted}}>{d.satir}</td>
                          <td style={{padding:'6px 10px',fontSize:11,fontWeight:700,color:C.accent}}>{d.dosya_no}</td>
                          <td style={{padding:'6px 10px',fontSize:11,color:C.text}}>{d.ad_soyad}</td>
                          <td style={{padding:'6px 10px'}}><span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:d.dosya_turu==='ADK'?`${C.accent}18`:`${C.gold}18`,color:d.dosya_turu==='ADK'?C.accent:C.gold}}>{d.dosya_turu}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HATALAR */}
            {sonuc.hatalar?.length > 0 && (
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.danger,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                  <LIcon name="AlertTriangle" size={12} color={C.danger}/> HATALI SATIRLAR
                </div>
                <div style={{maxHeight:200,overflowY:'auto',background:`${C.danger}06`,borderRadius:8,padding:10,border:`1px solid ${C.danger}22`}}>
                  {sonuc.hatalar.map((h,i) => (
                    <div key={i} style={{fontSize:10,color:C.danger,padding:'4px 0',borderBottom:i<sonuc.hatalar.length-1?`1px solid ${C.danger}11`:'none'}}>
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   PORTAL AYARLARI TAB
   MÜŞTERİ/MAĞDUR PORTAL YÖNETİMİ & AYARLARI
   ════════════════════════════════════════════════════════════════ */
const PortalTab = () => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, Modal, FormGroup, Confirm, api} = MR;
  const [subTab, setSubTab] = useState('ayarlar');
  const [ayarlar, setAyarlar] = useState({});
  const [erisimler, setErisimler] = useState([]);
  const [loglar, setLoglar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({toplam:0, aktif:0, pasif:0, son7gun_aktif:0});
  const [arama, setArama] = useState('');
  const [confirmState, setConfirmState] = useState({open:false, id:null, msg:''});
  const [mesajModal, setMesajModal] = useState({open:false, dosyaId:null, dosyaNo:'', mesajlar:[], yeniMesaj:'', loading:false});

  /* Portal ayarları varsayılan değerler */
  const PORTAL_AYAR_KEYS = {
    portal_aktif: '1',
    portal_giris_yontemi: 'tc_telefon',
    portal_oturum_suresi: '120',
    portal_evrak_goster: '1',
    portal_evrak_indir: '1',
    portal_gecmis_goster: '1',
    portal_masraf_goster: '0',
    portal_mesaj_aktif: '1',
    portal_otomatik_olustur: '0',
    portal_karsilama: 'Hoş geldiniz. Dosyanızın güncel durumunu bu portal üzerinden takip edebilirsiniz.',
    portal_kvkk_metni: '6698 sayılı KVKK kapsamında kişisel verileriniz korunmaktadır.'
  };

  const loadAyarlar = async () => {
    const r = await api.ayarlarList();
    if (r?.success) {
      const data = r.data || {};
      const portalAyarlar = {};
      Object.keys(PORTAL_AYAR_KEYS).forEach(key => {
        portalAyarlar[key] = data[key] !== undefined ? data[key] : PORTAL_AYAR_KEYS[key];
      });
      setAyarlar(portalAyarlar);
    }
  };

  const loadErisimler = async () => {
    const params = arama ? `arama=${encodeURIComponent(arama)}&limit=50` : 'limit=50';
    const r = await api.req('/portal/erisim-list.php?' + params);
    if (r?.success) {
      const d = r.data || {};
      setErisimler(d.items || []);
      if (d.istatistik) setStats(d.istatistik);
    }
  };

  const loadLoglar = async () => {
    const r = await api.req('/portal/loglar.php?limit=50');
    if (r?.success) {
      setLoglar(r.data?.items || []);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAyarlar(), loadErisimler()]).then(() => setLoading(false));
  }, []);

  useEffect(() => { if (subTab === 'loglar') loadLoglar(); }, [subTab]);

  const [kaydetMesaj, setKaydetMesaj] = useState(null);

  const ayarKaydet = async () => {
    setSaving(true);
    setKaydetMesaj(null);
    const r = await api.ayarlarGuncelle(ayarlar);
    setSaving(false);
    if (r?.success) {
      setKaydetMesaj({type:'success', text:'PORTAL AYARLARI BAŞARIYLA KAYDEDİLDİ'});
      MR.toast?.('PORTAL AYARLARI KAYDEDİLDİ', 'success');
      setTimeout(() => setKaydetMesaj(null), 4000);
    } else {
      setKaydetMesaj({type:'error', text:'KAYIT HATASI: ' + (r?.error || 'BİLİNMEYEN HATA')});
      MR.toast?.('KAYIT HATASI: ' + (r?.error || ''), 'error');
    }
  };

  const up = (k, v) => setAyarlar(p => ({...p, [k]: v}));

  const erisimKapat = async (id) => {
    const r = await api.req('/portal/erisim-sil.php?id=' + id, {method: 'DELETE'});
    if (r?.success) { MR.toast?.('ERİŞİM KAPATILDI', 'success'); loadErisimler(); }
    else MR.toast?.(r?.error || 'HATA', 'error');
  };

  const erisimAktifPasif = async (id, aktif) => {
    const r = await api.req('/portal/erisim-guncelle.php', {method: 'PUT', body: JSON.stringify({id, aktif: aktif ? 1 : 0})});
    if (r?.success) { MR.toast?.(aktif ? 'ERİŞİM AKTİFLEŞTİRİLDİ' : 'ERİŞİM DURDURULDU', 'success'); loadErisimler(); }
  };

  const smsYenidenGonder = async (id) => {
    const r = await api.req('/portal/erisim-guncelle.php', {method: 'PUT', body: JSON.stringify({id, sms_gonder: true})});
    if (r?.success) MR.toast?.('PORTAL SMS YENİDEN GÖNDERİLDİ', 'success');
    else MR.toast?.(r?.error || 'SMS GÖNDERİLEMEDİ', 'error');
  };

  const mesajlariAc = async (dosyaId, dosyaNo) => {
    setMesajModal({open:true, dosyaId, dosyaNo, mesajlar:[], yeniMesaj:'', loading:true});
    const r = await api.req('/portal/portal-mesaj-list.php?dosya_id=' + dosyaId);
    setMesajModal(p => ({...p, mesajlar: r?.success ? (r.data || []) : [], loading:false}));
  };

  const firmaMesajGonder = async () => {
    if (!mesajModal.yeniMesaj.trim()) return;
    const r = await api.req('/portal/portal-mesaj-gonder.php', {method:'POST', body: JSON.stringify({dosya_id: mesajModal.dosyaId, mesaj: mesajModal.yeniMesaj})});
    if (r?.success) {
      setMesajModal(p => ({...p, yeniMesaj: ''}));
      const r2 = await api.req('/portal/portal-mesaj-list.php?dosya_id=' + mesajModal.dosyaId);
      setMesajModal(p => ({...p, mesajlar: r2?.success ? (r2.data || []) : p.mesajlar}));
    }
  };

  const formatTarih = (t) => {
    if(!t) return '-';
    try { return new Date(t).toLocaleDateString('tr-TR'); } catch(e) { return t; }
  };
  const formatTS = (t) => {
    if(!t) return '-';
    try { const d = new Date(t); return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}); } catch(e) { return t; }
  };

  if (loading) return React.createElement(Loading);

  const SUB_TABS = [
    {key:'ayarlar', label:'GENEL AYARLAR', icon:'Settings'},
    {key:'erisimler', label:'AKTİF PORTALLAR', icon:'Users'},
    {key:'loglar', label:'PORTAL LOGLARI', icon:'Activity'}
  ];

  const Sw = ({checked, onChange, label}) => (
    <div style={{display:'flex', alignItems:'center', gap:10, padding:'8px 0'}}>
      <div onClick={() => onChange(!checked)} style={{width:42, height:22, borderRadius:11, background:checked ? C.success : C.borderLight, cursor:'pointer', position:'relative', transition:'all .2s'}}>
        <div style={{width:18, height:18, borderRadius:9, background:'#fff', position:'absolute', top:2, left:checked ? 22 : 2, transition:'all .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)'}}/>
      </div>
      <span style={{fontSize:12, fontWeight:500, color:C.textSec}}>{label}</span>
    </div>
  );

  return (
    <div>
      {/* İSTATİSTİKLER */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:16}}>
        <div style={{...S.stat}}>
          <div style={{fontSize:10, fontWeight:600, color:C.textMuted, letterSpacing:.5}}>TOPLAM PORTAL</div>
          <div style={{fontSize:22, fontWeight:800, color:C.accent, marginTop:4}}>{stats.toplam || 0}</div>
        </div>
        <div style={{...S.stat}}>
          <div style={{fontSize:10, fontWeight:600, color:C.textMuted, letterSpacing:.5}}>AKTİF</div>
          <div style={{fontSize:22, fontWeight:800, color:C.success, marginTop:4}}>{stats.aktif || 0}</div>
        </div>
        <div style={{...S.stat}}>
          <div style={{fontSize:10, fontWeight:600, color:C.textMuted, letterSpacing:.5}}>PASİF</div>
          <div style={{fontSize:22, fontWeight:800, color:C.danger, marginTop:4}}>{stats.pasif || 0}</div>
        </div>
        <div style={{...S.stat}}>
          <div style={{fontSize:10, fontWeight:600, color:C.textMuted, letterSpacing:.5}}>SON 7 GÜN AKTİF</div>
          <div style={{fontSize:22, fontWeight:800, color:C.warning, marginTop:4}}>{stats.son7gun_aktif || 0}</div>
        </div>
      </div>

      {/* SUB TAB MENU */}
      <div style={{...S.card, marginBottom:16}}>
        <div style={{display:'flex', borderBottom:`1px solid ${C.border}`, padding:'0 12px'}}>
          {SUB_TABS.map(st => {
            const aktif = subTab === st.key;
            return (
              <div key={st.key} onClick={() => setSubTab(st.key)} style={{display:'flex', alignItems:'center', gap:6, padding:'12px 16px', cursor:'pointer', fontSize:11, fontWeight:aktif?700:500, color:aktif?C.accent:C.textSec, borderBottom:aktif?`2px solid ${C.accent}`:'2px solid transparent', transition:'all .2s', whiteSpace:'nowrap'}}>
                <LIcon name={st.icon} size={14} color={aktif?C.accent:C.textMuted}/> {st.label}
              </div>
            );
          })}
        </div>

        <div style={{...S.cardBody}}>
          {/* ═══ GENEL AYARLAR ═══ */}
          {subTab === 'ayarlar' && (
            <div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
                {/* SOL KOLON */}
                <div>
                  <div style={{fontSize:13, fontWeight:700, marginBottom:12, color:C.text}}>PORTAL SİSTEMİ</div>

                  <Sw checked={ayarlar.portal_aktif === '1'} onChange={v => up('portal_aktif', v?'1':'0')} label="PORTAL SİSTEMİ AKTİF"/>
                  <Sw checked={ayarlar.portal_otomatik_olustur === '1'} onChange={v => up('portal_otomatik_olustur', v?'1':'0')} label="DOSYA AÇILIŞINDA OTOMATİK PORTAL OLUŞTUR"/>

                  <div style={{marginTop:16}}>
                    <label style={S.label}>GİRİŞ YÖNTEMİ</label>
                    <select style={S.select} value={ayarlar.portal_giris_yontemi || 'sms_otp'} onChange={e => up('portal_giris_yontemi', e.target.value)}>
                      <option value="tc_telefon">TC KİMLİK + TELEFON (SMS GEREKTİRMEZ)</option>
                      <option value="link">DOĞRUDAN LİNK (KOPYALANABİLİR LİNK)</option>
                      <option value="sms_otp">SMS OTP (SMS ABONELİĞİ GEREKTİRİR)</option>
                    </select>
                  </div>

                  <div style={{marginTop:12}}>
                    <label style={S.label}>OTURUM SÜRESİ (DAKİKA)</label>
                    <input type="number" style={S.input} value={ayarlar.portal_oturum_suresi || '120'} onChange={e => up('portal_oturum_suresi', e.target.value)} min="15" max="1440"/>
                  </div>

                  <div style={{fontSize:13, fontWeight:700, marginTop:24, marginBottom:12, color:C.text}}>ERİŞİM İZİNLERİ</div>
                  <Sw checked={ayarlar.portal_evrak_goster === '1'} onChange={v => up('portal_evrak_goster', v?'1':'0')} label="EVRAKLARI GÖSTER"/>
                  <Sw checked={ayarlar.portal_evrak_indir === '1'} onChange={v => up('portal_evrak_indir', v?'1':'0')} label="EVRAK İNDİRMEYE İZİN VER"/>
                  <Sw checked={ayarlar.portal_gecmis_goster === '1'} onChange={v => up('portal_gecmis_goster', v?'1':'0')} label="AŞAMALAR / DOSYA SÜREÇLERİNİ GÖSTER"/>
                  <Sw checked={ayarlar.portal_masraf_goster === '1'} onChange={v => up('portal_masraf_goster', v?'1':'0')} label="MASRAFLARI GÖSTER"/>
                  <Sw checked={ayarlar.portal_mesaj_aktif === '1'} onChange={v => up('portal_mesaj_aktif', v?'1':'0')} label="MESAJLAŞMA ÖZELLİĞİ"/>
                </div>

                {/* SAĞ KOLON */}
                <div>
                  <div style={{fontSize:13, fontWeight:700, marginBottom:12, color:C.text}}>PORTAL İÇERİK</div>

                  <label style={S.label}>KARŞILAMA MESAJI</label>
                  <textarea style={{...S.input, height:80, resize:'vertical'}} value={ayarlar.portal_karsilama || ''} onChange={e => up('portal_karsilama', e.target.value)} placeholder="Müşteriye gösterilecek karşılama mesajı..."/>

                  <div style={{marginTop:12}}>
                    <label style={S.label}>KVKK BİLGİLENDİRME METNİ</label>
                    <textarea style={{...S.input, height:80, resize:'vertical'}} value={ayarlar.portal_kvkk_metni || ''} onChange={e => up('portal_kvkk_metni', e.target.value)} placeholder="KVKK aydınlatma metni..."/>
                  </div>

                  <div style={{marginTop:20, padding:16, background:`${C.accent}08`, borderRadius:10, border:`1px solid ${C.accent}22`}}>
                    <div style={{fontSize:12, fontWeight:700, color:C.accent, marginBottom:8}}>PORTAL NASIL ÇALIŞIR?</div>
                    <div style={{fontSize:11, color:C.textSec, lineHeight:1.7}}>
                      1. Dosya detayından PORTAL butonuna tıklayarak erişim oluşturun<br/>
                      2. Oluşan link ve giriş bilgilerini müşteriye iletin (WhatsApp, e-posta vb.)<br/>
                      3. Müşteri TC Kimlik + Telefon ile veya doğrudan link ile giriş yapar<br/>
                      4. Evrakları görüntüler, mesaj gönderir<br/>
                      5. Tüm giriş/çıkışlar KVKK uyumlu loglanır (SMS aboneliği gerekmez)
                    </div>
                  </div>

                  <div style={{marginTop:16, padding:16, background:`${C.warning}08`, borderRadius:10, border:`1px solid ${C.warning}22`}}>
                    <div style={{fontSize:12, fontWeight:700, color:C.warning, marginBottom:6}}>YASAL UYUM</div>
                    <div style={{fontSize:11, color:C.textSec, lineHeight:1.6}}>
                      - 6698 sayılı KVKK'ya uygun veri işleme<br/>
                      - Tüm portal erişimleri IP ve tarih bazlı loglanır<br/>
                      - Müşteri yalnızca kendi dosyasını görür<br/>
                      - OTP ile güvenli kimlik doğrulama<br/>
                      - Erişim süresi ve bitiş tarihi belirleme
                    </div>
                  </div>
                </div>
              </div>

              {kaydetMesaj && (
                <div style={{
                  marginTop:16, padding:'12px 16px', borderRadius:8, fontSize:12, fontWeight:600,
                  background: kaydetMesaj.type === 'success' ? '#dcfce7' : '#fee2e2',
                  color: kaydetMesaj.type === 'success' ? '#16a34a' : '#dc2626',
                  border: '1px solid ' + (kaydetMesaj.type === 'success' ? '#bbf7d0' : '#fecaca')
                }}>
                  {kaydetMesaj.text}
                </div>
              )}
              <div style={{marginTop:16, display:'flex', justifyContent:'flex-end'}}>
                <button onClick={ayarKaydet} disabled={saving} style={{...S.btn, ...S.btnP, opacity:saving?.5:1}}>
                  <LIcon name="Save" size={14}/> {saving ? 'KAYDEDİLİYOR...' : 'AYARLARI KAYDET'}
                </button>
              </div>
            </div>
          )}

          {/* ═══ AKTİF PORTALLAR ═══ */}
          {subTab === 'erisimler' && (
            <div>
              <div style={{display:'flex', gap:8, marginBottom:16}}>
                <input style={{...S.input, maxWidth:300}} placeholder="DOSYA NO, AD SOYAD VEYA TELEFON ARA..." value={arama} onChange={e => setArama(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadErisimler()}/>
                <button onClick={loadErisimler} style={{...S.btn, ...S.btnP}}>
                  <LIcon name="Search" size={14}/> ARA
                </button>
                <button onClick={() => {setArama(''); setTimeout(loadErisimler, 100);}} style={{...S.btn, ...S.btnG}}>
                  <LIcon name="RotateCcw" size={14}/> TEMİZLE
                </button>
              </div>

              {erisimler.length === 0 ? (
                <div style={{textAlign:'center', padding:40, color:C.textMuted, fontSize:13}}>
                  <LIcon name="Users" size={32} color={C.textMuted}/>
                  <div style={{marginTop:8}}>HENÜZ PORTAL ERİŞİMİ TANIMLANMAMIŞ</div>
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                    <thead>
                      <tr style={{borderBottom:`2px solid ${C.border}`}}>
                        {['DOSYA NO','MÜŞTERİ','TELEFON','GİRİŞ','DURUM','SON GİRİŞ','MESAJ','İŞLEMLER'].map(h => (
                          <th key={h} style={{padding:'10px 8px', textAlign:'left', fontWeight:700, fontSize:10, color:C.textMuted, letterSpacing:.5}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {erisimler.map(e => (
                        <tr key={e.id} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'10px 8px', fontWeight:700, color:C.accent}}>{e.dosya_no}</td>
                          <td style={{padding:'10px 8px', fontWeight:600}}>{e.ad_soyad}</td>
                          <td style={{padding:'10px 8px', color:C.textSec, fontSize:11}}>{e.telefon}</td>
                          <td style={{padding:'10px 8px'}}>
                            <span style={{...S.badge(e.giris_yontemi === 'sms_otp' ? C.accent : C.purple)}}>
                              {e.giris_yontemi === 'sms_otp' ? 'SMS OTP' : 'LİNK'}
                            </span>
                          </td>
                          <td style={{padding:'10px 8px'}}>
                            <span style={{...S.badge(e.aktif == 1 ? C.success : C.danger)}}>
                              {e.aktif == 1 ? 'AKTİF' : 'PASİF'}
                            </span>
                          </td>
                          <td style={{padding:'10px 8px', fontSize:11, color:C.textSec}}>{formatTS(e.son_giris)}</td>
                          <td style={{padding:'10px 8px'}}>
                            {e.okunmamis_mesaj > 0 && (
                              <span onClick={() => mesajlariAc(e.dosya_id, e.dosya_no)} style={{background:C.danger, color:'#fff', padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700, cursor:'pointer'}}>
                                {e.okunmamis_mesaj} YENİ
                              </span>
                            )}
                            {(!e.okunmamis_mesaj || e.okunmamis_mesaj == 0) && (
                              <span onClick={() => mesajlariAc(e.dosya_id, e.dosya_no)} style={{color:C.textMuted, fontSize:10, cursor:'pointer', textDecoration:'underline'}}>MESAJLAR</span>
                            )}
                          </td>
                          <td style={{padding:'10px 8px'}}>
                            <div style={{display:'flex', gap:4}}>
                              <button onClick={() => smsYenidenGonder(e.id)} title="SMS YENİDEN GÖNDER" style={{...S.btn, padding:'4px 8px', fontSize:10, ...S.btnP}}>
                                <LIcon name="MessageSquare" size={12}/>
                              </button>
                              <button onClick={() => erisimAktifPasif(e.id, e.aktif != 1)} title={e.aktif == 1 ? 'DURDUR' : 'AKTİFLEŞTİR'} style={{...S.btn, padding:'4px 8px', fontSize:10, background:e.aktif == 1 ? C.warning : C.success, color:'#fff'}}>
                                <LIcon name={e.aktif == 1 ? 'Pause' : 'Play'} size={12}/>
                              </button>
                              <button onClick={() => setConfirmState({open:true, id:e.id, msg:`${e.dosya_no} - ${e.ad_soyad} portal erişimi kapatılsın mı?`})} title="ERİŞİMİ KAPAT" style={{...S.btn, padding:'4px 8px', fontSize:10, ...S.btnD}}>
                                <LIcon name="Trash2" size={12}/>
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
          )}

          {/* ═══ PORTAL LOGLARI ═══ */}
          {subTab === 'loglar' && (
            <div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:12}}>
                <div style={{fontSize:13, fontWeight:700, color:C.text}}>PORTAL GİRİŞ / İŞLEM LOGLARI (KVKK)</div>
                <button onClick={loadLoglar} style={{...S.btn, ...S.btnG, padding:'6px 12px', fontSize:10}}>
                  <LIcon name="RotateCcw" size={12}/> YENİLE
                </button>
              </div>
              {loglar.length === 0 ? (
                <div style={{textAlign:'center', padding:40, color:C.textMuted, fontSize:13}}>
                  HENÜZ LOG KAYDI YOK
                </div>
              ) : (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                    <thead>
                      <tr style={{borderBottom:`2px solid ${C.border}`}}>
                        {['TARİH','MÜŞTERİ','DOSYA NO','İŞLEM','DETAY','IP ADRESİ'].map(h => (
                          <th key={h} style={{padding:'8px 6px', textAlign:'left', fontWeight:700, fontSize:10, color:C.textMuted}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loglar.map(l => (
                        <tr key={l.id} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'8px 6px', fontSize:10, color:C.textSec}}>{formatTS(l.created_at)}</td>
                          <td style={{padding:'8px 6px', fontWeight:600}}>{l.ad_soyad || '-'}</td>
                          <td style={{padding:'8px 6px', color:C.accent, fontWeight:600}}>{l.dosya_no || '-'}</td>
                          <td style={{padding:'8px 6px'}}>
                            <span style={{...S.badge(LOG_ISLEM_RENK(l.islem))}}>{l.islem}</span>
                          </td>
                          <td style={{padding:'8px 6px', color:C.textSec, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{l.detay || '-'}</td>
                          <td style={{padding:'8px 6px', fontSize:10, color:C.textMuted, fontFamily:'monospace'}}>{l.ip_adresi || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM DIALOG */}
      {confirmState.open && React.createElement(Confirm, {
        message: confirmState.msg,
        onConfirm: () => { erisimKapat(confirmState.id); setConfirmState({open:false, id:null, msg:''}); },
        onCancel: () => setConfirmState({open:false, id:null, msg:''})
      })}

      {/* MESAJ MODAL */}
      {mesajModal.open && React.createElement(Modal, {
        title: `PORTAL MESAJLARI - ${mesajModal.dosyaNo}`,
        onClose: () => setMesajModal({open:false, dosyaId:null, dosyaNo:'', mesajlar:[], yeniMesaj:'', loading:false}),
        width: 600
      },
        React.createElement('div', {style: {maxHeight:400, overflowY:'auto', marginBottom:12}},
          mesajModal.loading ? React.createElement('div', {style:{textAlign:'center', padding:20, color:C.textMuted}}, 'YÜKLENİYOR...') :
          mesajModal.mesajlar.length === 0 ? React.createElement('div', {style:{textAlign:'center', padding:20, color:C.textMuted, fontSize:12}}, 'HENÜZ MESAJ YOK') :
          mesajModal.mesajlar.map(m => React.createElement('div', {key:m.id, style:{marginBottom:8, maxWidth:'80%', marginLeft:m.gonderen_tip==='musteri'?0:'auto', marginRight:m.gonderen_tip==='firma'?0:'auto'}},
            React.createElement('div', {style:{padding:'8px 12px', borderRadius:10, fontSize:12, background:m.gonderen_tip==='musteri'?`${C.accent}11`:C.bgHover, border:`1px solid ${m.gonderen_tip==='musteri'?C.accent+'33':C.border}`}},
              React.createElement('div', {style:{fontSize:9, fontWeight:700, color:m.gonderen_tip==='musteri'?C.accent:C.success, marginBottom:2}}, m.gonderen_tip==='musteri' ? 'MÜŞTERİ' : (m.gonderen_adi || 'FİRMA')),
              m.mesaj
            ),
            React.createElement('div', {style:{fontSize:9, color:C.textMuted, marginTop:2, textAlign:m.gonderen_tip==='firma'?'right':'left'}}, formatTS(m.created_at))
          ))
        ),
        React.createElement('div', {style:{display:'flex', gap:8}},
          React.createElement('input', {style:{...S.input, flex:1}, placeholder:'Müşteriye mesaj yazın...', value:mesajModal.yeniMesaj, onChange:e => setMesajModal(p=>({...p, yeniMesaj:e.target.value})), onKeyDown:e => e.key==='Enter' && firmaMesajGonder()}),
          React.createElement('button', {style:{...S.btn, ...S.btnP}, onClick:firmaMesajGonder, disabled:!mesajModal.yeniMesaj.trim()}, React.createElement(LIcon, {name:'Send', size:14}), ' GÖNDER')
        )
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   VERİ YÖNETİMİ TAB — ADMİN TOPLU SİLME / SIFIRLAMA
   ════════════════════════════════════════════════════════════════ */
const VeriYonetimiTab = () => {
  const {C, S, LIcon, Confirm, api} = MR;
  const [confirm, setConfirm] = useState({open: false, msg: '', modul: ''});
  const [loading, setLoading] = useState('');
  const [sonuc, setSonuc] = useState('');
  const [hata, setHata] = useState('');

  const sifirla = async (modul) => {
    setConfirm({open: false, msg: '', modul: ''});
    setLoading(modul);
    setSonuc('');
    setHata('');
    try {
      const r = await api.topluSifirla(modul);
      if (r?.success) {
        setSonuc(r.detay || r.message || 'İŞLEM BAŞARILI');
        setTimeout(() => setSonuc(''), 6000);
      } else {
        setHata(r?.error || 'İŞLEM HATASI');
        setTimeout(() => setHata(''), 6000);
      }
    } catch (e) {
      setHata('BAĞLANTI HATASI: ' + e.message);
      setTimeout(() => setHata(''), 6000);
    }
    setLoading('');
  };

  const moduller = [
    {key: 'dosyalar', label: 'TÜM DOSYALAR', icon: 'FolderOpen', color: '#ef4444', desc: 'Tüm dosyalar ve ilişkili kayıtlar (evrak, masraf, mağdur, araç) kalıcı olarak silinir.'},
    {key: 'muhasebe', label: 'MUHASEBE (GELİR/GİDER/HAREKET)', icon: 'Landmark', color: '#f59e0b', desc: 'Tüm gelir/gider kayıtları, kasa hareketleri silinir ve bakiyeler sıfırlanır.'},
    {key: 'kasa', label: 'KASA HAREKETLERİ', icon: 'Wallet', color: '#3b82f6', desc: 'Tüm kasa hareketleri silinir ve bakiyeler sıfırlanır. Kasa tanımları korunur.'},
    {key: 'cari', label: 'CARİ / KOMİSYON', icon: 'Receipt', color: '#8b5cf6', desc: 'Tüm paydaş komisyon ve cari hareket kayıtları silinir.'},
    {key: 'crm', label: 'CRM KAYITLARI', icon: 'Users', color: '#06b6d4', desc: 'Tüm CRM kayıtları, notlar ve yüklenen dosyalar silinir.'},
    {key: 'police', label: 'POLİÇE KAYITLARI', icon: 'FileCheck', color: '#10b981', desc: 'Tüm poliçe ve tahsilat kayıtları silinir.'},
    {key: 'personel', label: 'PERSONEL KAYITLARI', icon: 'UserCog', color: '#ec4899', desc: 'Tüm personel ve hakediş kayıtları silinir.'},
    {key: 'ortaklar', label: 'İŞ ORTAKLARI', icon: 'Handshake', color: '#14b8a6', desc: 'Tüm iş ortağı ve hareket kayıtları silinir.'},
    {key: 'paydaslar', label: 'İŞ PAYDAŞLARI', icon: 'Link', color: '#a855f7', desc: 'Tüm iş paydaşı ve komisyon kayıtları silinir.'},
    {key: 'ajanda', label: 'AJANDA KAYITLARI', icon: 'Calendar', color: '#f97316', desc: 'Tüm ajanda ve hatırlatma kayıtları silinir.'},
    {key: 'mesajlar', label: 'MESAJLAR', icon: 'MessageSquare', color: '#6366f1', desc: 'Tüm sistem mesajları silinir.'},
    {key: 'bildirimler', label: 'BİLDİRİMLER', icon: 'Bell', color: '#64748b', desc: 'Tüm bildirim kayıtları silinir.'},
    {key: 'loglar', label: 'LOG KAYITLARI', icon: 'Activity', color: '#78716c', desc: 'Tüm sistem log kayıtları silinir.'}
  ];

  return (
    <div className="fade-in">
      {/* UYARI BANNERI */}
      <div style={{
        ...S.card, padding: '16px 20px', marginBottom: 20,
        background: `linear-gradient(135deg, ${C.danger}08, ${C.danger}03)`,
        border: `1px solid ${C.danger}30`
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: `${C.danger}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <LIcon name="AlertTriangle" size={22} color={C.danger}/>
          </div>
          <div>
            <div style={{fontSize: 14, fontWeight: 800, color: C.danger, marginBottom: 2}}>DİKKAT — VERİ SİLME İŞLEMLERİ</div>
            <div style={{fontSize: 11, color: C.textSec, lineHeight: 1.5}}>
              BU SAYFADA YAPILAN TÜM İŞLEMLER KALICI VE GERİ ALINAMAZ. HER İŞLEM LOG KAYITLARINA YAZILIR.
              SİLMEDEN ÖNCE VERİLERİNİZİ YEDEKLEMENİZ ÖNERİLİR.
            </div>
          </div>
        </div>
      </div>

      {/* SONUÇ / HATA */}
      {sonuc && (
        <div style={{...S.card, padding: '12px 20px', marginBottom: 16, background: `${C.success}11`, border: `1px solid ${C.success}33`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, color: C.success, fontWeight: 700, fontSize: 12}}>
            <LIcon name="CheckCircle" size={16}/> {sonuc}
          </div>
        </div>
      )}
      {hata && (
        <div style={{...S.card, padding: '12px 20px', marginBottom: 16, background: `${C.danger}11`, border: `1px solid ${C.danger}33`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, color: C.danger, fontWeight: 700, fontSize: 12}}>
            <LIcon name="AlertCircle" size={16}/> {hata}
          </div>
        </div>
      )}

      {/* MODÜL KARTLARI */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
        {moduller.map(m => (
          <div key={m.key} style={{
            ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
            opacity: loading === m.key ? 0.6 : 1, transition: 'all .2s'
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: `${m.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <LIcon name={m.icon} size={20} color={m.color}/>
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 2}}>{m.label}</div>
              <div style={{fontSize: 10, color: C.textMuted, lineHeight: 1.4}}>{m.desc}</div>
            </div>
            <button
              style={{
                ...S.btn, ...S.btnD, fontSize: 10, padding: '8px 14px', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap'
              }}
              disabled={!!loading}
              onClick={() => setConfirm({
                open: true,
                msg: `"${m.label}" MODÜLÜNE AİT TÜM VERİLER KALICI OLARAK SİLİNECEK!\n\nBU İŞLEM GERİ ALINAMAZ!\n\nDEVAM EDİLSİN Mİ?`,
                modul: m.key
              })}
            >
              {loading === m.key ? (
                <><LIcon name="Loader" size={12} color="#fff"/> İŞLENİYOR...</>
              ) : (
                <><LIcon name="Trash2" size={12} color="#fff"/> TÜM VERİLERİ SİL</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* ONAY MODALI */}
      <Confirm
        open={confirm.open}
        message={confirm.msg}
        onConfirm={() => sifirla(confirm.modul)}
        onCancel={() => setConfirm({open: false, msg: '', modul: ''})}
      />
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   CİHAZ GÜVENLİĞİ VE OTURUM YÖNETİMİ - 2FA GOOGLE AUTHENTICATOR
   ════════════════════════════════════════════════════════════════ */
const GuvenlikTab = () => {
  const {C, S, LIcon, api} = MR;
  const [loading, setLoading] = useState(false);
  const [twoFaAktif, setTwoFaAktif] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [mesaj, setMesaj] = useState(null);
  const [step, setStep] = useState('status'); // status, setup, verify

  useEffect(() => {
    load2faStatus();
  }, []);

  const load2faStatus = async () => {
    const r = await api.twoFaSetup('status');
    if (r?.success) {
      setTwoFaAktif(!!r.data?.totp_aktif);
    }
  };

  const startSetup = async () => {
    setLoading(true); setMesaj(null);
    const r = await api.twoFaSetup('generate');
    if (r?.success) {
      setSetupData(r.data);
      setStep('setup');
      setCode('');
    } else {
      setMesaj({type:'error', text: r?.error || 'KURULUM BAŞLATILAMADI'});
    }
    setLoading(false);
  };

  const verifyAndEnable = async () => {
    if (code.length !== 6) { setMesaj({type:'error', text:'6 HANELİ KOD GİRİN'}); return; }
    setLoading(true); setMesaj(null);
    const r = await api.twoFaSetup('verify_and_enable', code);
    if (r?.success) {
      setTwoFaAktif(true);
      setStep('status');
      setSetupData(null);
      setCode('');
      setMesaj({type:'success', text:'2FA BAŞARIYLA AKTİF EDİLDİ'});
    } else {
      setMesaj({type:'error', text: r?.error || 'DOĞRULAMA BAŞARISIZ'});
      setCode('');
    }
    setLoading(false);
  };

  const disable2fa = async () => {
    if (disableCode.length !== 6) { setMesaj({type:'error', text:'6 HANELİ KOD GİRİN'}); return; }
    setLoading(true); setMesaj(null);
    const r = await api.twoFaSetup('disable', disableCode);
    if (r?.success) {
      setTwoFaAktif(false);
      setDisableCode('');
      setMesaj({type:'success', text:'2FA DEVRE DIŞI BIRAKILDI'});
    } else {
      setMesaj({type:'error', text: r?.error || 'İŞLEM BAŞARISIZ'});
      setDisableCode('');
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      {mesaj && (
        <div style={{padding:'12px 16px',background:`${mesaj.type==='success'?C.success:C.danger}18`,
          border:`1px solid ${mesaj.type==='success'?C.success:C.danger}33`,borderRadius:12,marginBottom:16,
          fontSize:12,fontWeight:700,color:mesaj.type==='success'?C.success:C.danger,
          display:'flex',alignItems:'center',gap:8}}>
          <LIcon name={mesaj.type==='success'?'CheckCircle':'AlertCircle'} size={16} color={mesaj.type==='success'?C.success:C.danger}/>
          {mesaj.text}
        </div>
      )}

      {/* 2FA DURUM KARTI */}
      <div style={S.card}>
        <div style={{...S.cardHead,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${C.success}22`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <LIcon name="ShieldCheck" size={18} color={C.success}/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:800}}>2FA - GOOGLE AUTHENTICATOR</div>
            <div style={{fontSize:10,color:C.textMuted}}>İKİ FAKTÖRLÜ KİMLİK DOĞRULAMA</div>
          </div>
        </div>
        <div style={{padding:20}}>

          {/* DURUM GÖSTERGESİ */}
          <div style={{display:'flex',alignItems:'center',gap:16,padding:20,
            background: twoFaAktif ? `${C.success}11` : `${C.warning}11`,
            borderRadius:14,border:`1px solid ${twoFaAktif ? C.success : C.warning}33`,marginBottom:20}}>
            <div style={{width:52,height:52,borderRadius:16,
              background: twoFaAktif ? `${C.success}22` : `${C.warning}22`,
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <LIcon name={twoFaAktif ? 'ShieldCheck' : 'ShieldAlert'} size={26}
                color={twoFaAktif ? C.success : C.warning}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:900,color: twoFaAktif ? C.success : C.warning}}>
                {twoFaAktif ? '2FA AKTİF' : '2FA DEVRE DIŞI'}
              </div>
              <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>
                {twoFaAktif
                  ? 'HESABINIZ GOOGLE AUTHENTICATOR İLE KORUNUYOR'
                  : 'HESABINIZI KORUMAK İÇİN 2FA ETKİNLEŞTİRİN'}
              </div>
            </div>
            <div style={{
              padding:'6px 14px',borderRadius:20,fontSize:11,fontWeight:800,
              background: twoFaAktif ? `${C.success}22` : `${C.warning}22`,
              color: twoFaAktif ? C.success : C.warning,
              border:`1px solid ${twoFaAktif ? C.success : C.warning}44`
            }}>
              {twoFaAktif ? 'AKTİF' : 'KAPALI'}
            </div>
          </div>

          {/* 2FA AKTİF DEĞİLSE - KURULUM */}
          {!twoFaAktif && step === 'status' && (
            <div style={{textAlign:'center',padding:20}}>
              <div style={{fontSize:12,color:C.textSec,marginBottom:16,lineHeight:1.6}}>
                GOOGLE AUTHENTICATOR UYGULAMASINI TELEFONUNUZA İNDİRİN.<br/>
                ARDINCA AŞAĞIDAKI BUTONA TIKLAYARAK KURULUMU BAŞLATIN.
              </div>
              <button onClick={startSetup} disabled={loading} style={{
                ...S.btn,...S.btnS,padding:'14px 32px',fontSize:13,fontWeight:800,borderRadius:14}}>
                <LIcon name="ShieldCheck" size={16} color="#fff"/>
                {loading ? 'HAZIRLANIYOR...' : '2FA KURULUMUNU BAŞLAT'}
              </button>
            </div>
          )}

          {/* KURULUM ADIMI - QR KOD */}
          {!twoFaAktif && step === 'setup' && setupData && (
            <div>
              <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
                {/* QR KOD */}
                <div style={{textAlign:'center',flex:'0 0 auto'}}>
                  <div style={{padding:12,background:'#fff',borderRadius:14,display:'inline-block',marginBottom:10}}>
                    <img src={setupData.qr_url} alt="QR KOD" style={{width:180,height:180,display:'block'}}/>
                  </div>
                  <div style={{fontSize:9,color:C.textMuted}}>QR KODU TARAYIN</div>
                </div>

                {/* TALİMATLAR */}
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:800,color:C.accent,marginBottom:12}}>KURULUM ADIMLARI</div>

                  <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:12}}>
                    <div style={{width:24,height:24,borderRadius:8,background:`${C.accent}22`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:C.accent,flex:'0 0 24px'}}>1</div>
                    <div style={{fontSize:11,color:C.textSec}}>GOOGLE AUTHENTICATOR UYGULAMASINI AÇIN</div>
                  </div>

                  <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:12}}>
                    <div style={{width:24,height:24,borderRadius:8,background:`${C.accent}22`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:C.accent,flex:'0 0 24px'}}>2</div>
                    <div style={{fontSize:11,color:C.textSec}}>+ BUTONUNA DOKUNUN VE "QR KOD TARA" SEÇİN</div>
                  </div>

                  <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:12}}>
                    <div style={{width:24,height:24,borderRadius:8,background:`${C.accent}22`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:C.accent,flex:'0 0 24px'}}>3</div>
                    <div style={{fontSize:11,color:C.textSec}}>YANDAKI QR KODU TELEFONUNUZLA TARAYIN</div>
                  </div>

                  <div style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:16}}>
                    <div style={{width:24,height:24,borderRadius:8,background:`${C.accent}22`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:C.accent,flex:'0 0 24px'}}>4</div>
                    <div style={{fontSize:11,color:C.textSec}}>UYGULAMADA GÖRÜNEN 6 HANELİ KODU AŞAĞIYA GİRİN</div>
                  </div>

                  {/* MANUEL GİRİŞ ANAHTARI */}
                  <div style={{padding:10,background:`${C.accent}11`,borderRadius:10,border:`1px solid ${C.accent}33`,marginBottom:16}}>
                    <div style={{fontSize:9,color:C.textMuted,marginBottom:4,fontWeight:600}}>MANUEL ANAHTAR (QR TARAYAMIYORSANIZ)</div>
                    <div style={{fontSize:13,fontWeight:900,fontFamily:'monospace',color:C.accent,letterSpacing:2,wordBreak:'break-all'}}>
                      {setupData.secret}
                    </div>
                  </div>

                  {/* DOĞRULAMA KODU GİRİŞİ */}
                  <div style={{display:'flex',gap:10}}>
                    <input
                      type="text"
                      value={code}
                      onChange={e => { const v = e.target.value.replace(/\D/g,''); if (v.length <= 6) setCode(v); }}
                      placeholder="000000"
                      maxLength={6}
                      style={{...S.input,textAlign:'center',fontSize:22,fontWeight:900,letterSpacing:10,fontFamily:'monospace',flex:1}}
                    />
                    <button onClick={verifyAndEnable} disabled={loading || code.length !== 6} style={{
                      ...S.btn,...S.btnS,padding:'0 20px',fontSize:12,fontWeight:800,borderRadius:10,
                      opacity:(loading || code.length !== 6)?0.5:1}}>
                      {loading ? '...' : 'DOĞRULA'}
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => { setStep('status'); setSetupData(null); setCode(''); }}
                style={{background:'transparent',border:'none',color:C.textMuted,fontSize:11,fontWeight:600,
                  cursor:'pointer',marginTop:16,padding:8}}>
                VAZGEÇ
              </button>
            </div>
          )}

          {/* 2FA AKTİF - DEVRE DIŞI BIRAKMA */}
          {twoFaAktif && (
            <div>
              <div style={{padding:16,background:`${C.bgInput}`,borderRadius:12,border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:12}}>
                  2FA DEVRE DIŞI BIRAKMAK İÇİN DOĞRULAMA KODU GİRİN
                </div>
                <div style={{display:'flex',gap:10}}>
                  <input
                    type="text"
                    value={disableCode}
                    onChange={e => { const v = e.target.value.replace(/\D/g,''); if (v.length <= 6) setDisableCode(v); }}
                    placeholder="000000"
                    maxLength={6}
                    style={{...S.input,textAlign:'center',fontSize:18,fontWeight:900,letterSpacing:8,fontFamily:'monospace',flex:1}}
                  />
                  <button onClick={disable2fa} disabled={loading || disableCode.length !== 6} style={{
                    ...S.btn,background:C.danger,color:'#fff',padding:'0 20px',fontSize:11,fontWeight:800,borderRadius:10,
                    border:'none',cursor:'pointer',
                    opacity:(loading || disableCode.length !== 6)?0.5:1}}>
                    {loading ? '...' : 'DEVRE DIŞI BIRAK'}
                  </button>
                </div>
              </div>

              {/* GÜVENLİK BİLGİLERİ */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{padding:14,background:`${C.success}08`,borderRadius:12,border:`1px solid ${C.success}22`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <LIcon name="Lock" size={14} color={C.success}/>
                    <span style={{fontSize:10,fontWeight:700,color:C.success}}>GÜVENLİ GİRİŞ</span>
                  </div>
                  <div style={{fontSize:10,color:C.textMuted}}>HER GİRİŞTE GOOGLE AUTHENTICATOR KODU İSTENİR</div>
                </div>
                <div style={{padding:14,background:`${C.accent}08`,borderRadius:12,border:`1px solid ${C.accent}22`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <LIcon name="Smartphone" size={14} color={C.accent}/>
                    <span style={{fontSize:10,fontWeight:700,color:C.accent}}>CİHAZ BAĞLI</span>
                  </div>
                  <div style={{fontSize:10,color:C.textMuted}}>GOOGLE AUTHENTICATOR UYGULAMANIZ BAĞLI</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GÜVENLİK ÖNERİLERİ */}
      <div style={{...S.card,marginTop:16}}>
        <div style={{...S.cardHead,display:'flex',alignItems:'center',gap:10}}>
          <LIcon name="Info" size={16} color={C.accent}/>
          <span style={{fontSize:13,fontWeight:800}}>GÜVENLİK ÖNERİLERİ</span>
        </div>
        <div style={{padding:20}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[
              {icon:'ShieldCheck',title:'2FA KULLANIN',desc:'GOOGLE AUTHENTICATOR İLE HESABINIZI KORUYUN',color:C.success},
              {icon:'Key',title:'GÜÇLÜ ŞİFRE',desc:'EN AZ 8 KARAKTER, BÜYÜK/KÜÇÜK HARF VE RAKAM KULLANIN',color:C.warning},
              {icon:'LogOut',title:'OTURUM KAPAT',desc:'İŞİNİZ BİTTİĞİNDE OTURUMU KAPATMAYI UNUTMAYIN',color:C.danger},
              {icon:'Smartphone',title:'CİHAZ GÜVENLİĞİ',desc:'TELEFONUNUZA EKRAn KİLİDİ KOYUN',color:C.accent}
            ].map((item,i) => (
              <div key={i} style={{padding:14,background:`${item.color}08`,borderRadius:12,border:`1px solid ${item.color}22`}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                  <LIcon name={item.icon} size={14} color={item.color}/>
                  <span style={{fontSize:10,fontWeight:700,color:item.color}}>{item.title}</span>
                </div>
                <div style={{fontSize:10,color:C.textMuted}}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ - MR.SistemPage
   ════════════════════════════════════════════════════════════════ */

MR.SistemPage = ({setPage, user, subPage}) => {
  const {C, S, LIcon, SectionTitle} = MR;
  const isAdmin = user?.rol === 'admin';

  /* ALT MODÜL BAŞLIĞI */
  const modulBasliklar = {
    kullanici: {label: 'KULLANICI YÖNETİMİ', icon: 'UserCog'},
    yetki: {label: 'YETKİ YÖNETİMİ', icon: 'KeyRound'},
    ayarlar: {label: 'FİRMA AYARLARI', icon: 'Settings'},
    sms: {label: 'SMS BİLDİRİM', icon: 'MessageSquare'},
    portal: {label: 'PORTAL AYARLARI', icon: 'Globe'},
    guvenlik: {label: 'CİHAZ GÜVENLİĞİ VE OTURUM YÖNETİMİ', icon: 'ShieldCheck'},
    aktarim: {label: 'TOPLU AKTARIM', icon: 'FileSpreadsheet'},
    veri: {label: 'VERİ YÖNETİMİ', icon: 'DatabaseBackup'},
    log: {label: 'LOG KAYITLARI', icon: 'Activity'},
    tema: {label: 'TEMA AYARLARI', icon: 'Palette'}
  };
  const baslik = modulBasliklar[subPage] || {label: 'SİSTEM', icon: 'Settings'};

  return (
    <div className="fade-in">
      {/* BAŞLIK + GERİ BUTONU */}
      <div style={{...S.card, marginBottom: 20}}>
        <div style={{...S.cardHead, justifyContent: 'space-between'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <div onClick={() => setPage('sistem')} style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${C.textMuted}15`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s'
            }}
              onMouseEnter={e => e.currentTarget.style.background = `${C.accent}22`}
              onMouseLeave={e => e.currentTarget.style.background = `${C.textMuted}15`}
              title="SİSTEM ANA SAYFASINA DÖN"
            >
              <LIcon name="ArrowLeft" size={18} color={C.textSec}/>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: `${C.accent}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <LIcon name={baslik.icon} size={20} color={C.accent}/>
            </div>
            <div>
              <div style={{fontSize: 16, fontWeight: 800}}>{baslik.label}</div>
              <div style={{fontSize: 11, color: C.textMuted}}>SİSTEM YÖNETİMİ</div>
            </div>
          </div>
          {user && (
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <LIcon name="User" size={14} color={C.textMuted}/>
              <span style={{fontSize: 11, color: C.textSec}}>{user.ad_soyad}</span>
              <span style={{...S.badge(ROL_RENK[user.rol] || C.accent)}}>{ROL_LABEL[user.rol] || (user.rol || '').toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* İÇERİK */}
      <div className="fade-in">
        {subPage === 'kullanici' && isAdmin && <KullaniciTab/>}
        {subPage === 'yetki' && isAdmin && <YetkiTab/>}
        {subPage === 'ayarlar' && isAdmin && <AyarlarTab/>}
        {subPage === 'sms' && isAdmin && <SmsTab/>}
        {subPage === 'portal' && isAdmin && <PortalTab/>}
        {subPage === 'guvenlik' && MR.hasYetki(user,'sistem','sistem-guvenlik') && <GuvenlikTab/>}
        {subPage === 'aktarim' && isAdmin && <TopluAktarimTab/>}
        {subPage === 'veri' && isAdmin && <VeriYonetimiTab/>}
        {subPage === 'log' && isAdmin && <LogTab/>}
        {subPage === 'tema' && isAdmin && MR.TemaAyarlariTab && React.createElement(MR.TemaAyarlariTab)}
      </div>
    </div>
  );
};
