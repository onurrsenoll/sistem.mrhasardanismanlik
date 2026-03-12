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
   TAB 5 - NETSANTRAL AYARLARI
   ════════════════════════════════════════════════════════════════ */
/* ═══ NETSANTRAL ÇAĞRI GEÇMİŞİ BİLEŞENİ ═══ */
const NetsantralCagriGecmisi = () => {
  const {C, S, LIcon, Badge, Loading, StatCard, api} = MR;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({toplam: 0, gelen: 0, giden: 0, bugun: 0, toplam_sure: 0});
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [toplamKayit, setToplamKayit] = useState(0);
  const [yonF, setYonF] = useState('');
  const [search, setSearch] = useState('');
  const [tarihBas, setTarihBas] = useState('');
  const [tarihBit, setTarihBit] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = {page: sayfa, limit: 30};
      if (yonF) p.yon = yonF;
      if (search) p.q = search;
      if (tarihBas) p.tarih_baslangic = tarihBas;
      if (tarihBit) p.tarih_bitis = tarihBit;
      const r = await api.netsantralAramaList(p);
      if (r?.success) {
        const items = r.data?.items || [];
        setData(items);
        if (r.data?.stats) setStats(r.data.stats);
        if (r.data?.pagination) {
          setToplamSayfa(r.data.pagination.totalPages || 1);
          setToplamKayit(r.data.pagination.total || 0);
        }
        if (r.data?.debug_error) {
          console.warn('[NETSANTRAL ÇAĞRI GEÇMİŞİ] SQL HATASI:', r.data.debug_error);
        }
      } else {
        console.error('[NETSANTRAL ÇAĞRI GEÇMİŞİ] API HATASI:', r?.error);
      }
    } catch (err) {
      console.error('[NETSANTRAL ÇAĞRI GEÇMİŞİ] YÜKLEME HATASI:', err);
    }
    setLoading(false);
  }, [sayfa, yonF, search, tarihBas, tarihBit]);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (sayfa === 1 && !yonF && !search && !tarihBas && !tarihBit) return; // İLK YÜKLEME ZATEN YAPILDI
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [search, yonF, tarihBas, tarihBit, sayfa]);

  const fmtSure = (s) => {
    if (!s || s <= 0) return '-';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}DK ${sec}SN` : `${sec}SN`;
  };

  const durumRenk = (d) => {
    if (!d) return C.textMuted;
    const dl = d.toLowerCase();
    if (dl === 'gorusmede' || dl === 'baglandi') return C.success;
    if (dl === 'araniyor' || dl === 'calıyor') return C.warning;
    if (dl === 'sonlandi') return C.accent;
    if (dl === 'basarisiz') return C.danger;
    return C.textMuted;
  };

  const durumLabel = (d) => {
    if (!d) return 'BİLİNMİYOR';
    const dl = d.toLowerCase();
    if (dl === 'gorusmede' || dl === 'baglandi') return 'GÖRÜŞME';
    if (dl === 'araniyor' || dl === 'calıyor') return 'ARANIYOR';
    if (dl === 'sonlandi') return 'SONLANDI';
    if (dl === 'basarisiz') return 'BAŞARISIZ';
    return d.toUpperCase();
  };

  const thSt = {padding:'10px 12px', textAlign:'left', color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted, fontWeight:800, fontSize:12, borderBottom:`2px solid ${C.border}`, whiteSpace:'nowrap', position:'sticky', top:0, background:C.bgCard, zIndex:1, letterSpacing:0.3};
  const tdSt = {padding:'10px 12px', fontSize:12, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap', color: MR.tema==='koyu' ? '#cbd5e1' : C.text};

  return (
    <div style={S.card}>
      <div style={{...S.cardHead, justifyContent:'space-between'}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <LIcon name="PhoneCall" size={14} color={C.accent}/>
          <span style={{fontSize:13, fontWeight:700}}>ÇAĞRI GEÇMİŞİ</span>
          <Badge text={stats.toplam + ' TOPLAM'} color={C.accent}/>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <input placeholder="NUMARA VEYA İSİM ARA..." value={search} onChange={e => {setSearch(e.target.value); setSayfa(1);}}
            style={{...S.input, width:180, fontSize:10, padding:'6px 10px'}}/>
          <button onClick={load} style={{...S.btn,...S.btnP, padding:'6px 10px'}}>
            <LIcon name="RefreshCw" size={14} color="#fff"/>
          </button>
        </div>
      </div>

      {/* İSTATİSTİK BANTLARI */}
      <div style={{display:'flex', gap:0, borderBottom:`1px solid ${C.border}`}}>
        {[
          {label:'BUGÜN', value:stats.bugun, c:C.accent, icon:'Calendar'},
          {label:'GELEN', value:stats.gelen, c:C.success, icon:'PhoneIncoming'},
          {label:'GİDEN', value:stats.giden, c:C.purple, icon:'PhoneOutgoing'},
          {label:'TOPLAM SÜRE', value: fmtSure(stats.toplam_sure), c:C.cyan, icon:'Clock'}
        ].map((item,i) => (
          <div key={i} style={{
            flex:1, padding:'12px 16px', display:'flex', alignItems:'center', gap:10,
            borderRight: i < 3 ? `1px solid ${C.border}` : 'none',
            background:`${item.c}05`
          }}>
            <div style={{
              width:32, height:32, borderRadius:8, background:`${item.c}15`,
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <LIcon name={item.icon} size={14} color={item.c}/>
            </div>
            <div>
              <div style={{fontSize:16, fontWeight:800, color:item.c}}>{item.value}</div>
              <div style={{fontSize:9, color:C.textMuted}}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* FİLTRE */}
      <div style={{padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
        <span style={{fontSize:9, fontWeight:700, color:C.textMuted, marginRight:6}}>YÖN:</span>
        {[
          {val:'', label:'HEPSİ', c:C.accent},
          {val:'gelen', label:'GELEN', c:C.success},
          {val:'giden', label:'GİDEN', c:C.purple}
        ].map(d => (
          <span key={d.val} onClick={() => {setYonF(d.val); setSayfa(1);}}
            style={{
              padding:'5px 12px', borderRadius:20, fontSize:10, fontWeight: yonF === d.val ? 700 : 500,
              cursor:'pointer',
              background: yonF === d.val ? `${d.c}18` : 'transparent',
              color: yonF === d.val ? d.c : C.textSec,
              border:`1px solid ${yonF === d.val ? d.c + '44' : C.border}`
            }}>
            {d.label}
          </span>
        ))}
        <div style={{marginLeft:'auto', display:'flex', gap:6, alignItems:'center'}}>
          <span style={{fontSize:9, color:C.textMuted}}>TARİH:</span>
          <input type="date" value={tarihBas} onChange={e => {setTarihBas(e.target.value); setSayfa(1);}}
            style={{...S.input, width:130, fontSize:10, padding:'5px 8px'}}/>
          <span style={{fontSize:9, color:C.textMuted}}>-</span>
          <input type="date" value={tarihBit} onChange={e => {setTarihBit(e.target.value); setSayfa(1);}}
            style={{...S.input, width:130, fontSize:10, padding:'5px 8px'}}/>
        </div>
      </div>

      {/* TABLO */}
      {loading ? <Loading/> : data.length === 0 ? (
        <div style={{padding:40, textAlign:'center'}}>
          <LIcon name="PhoneOff" size={32} color={C.textMuted} style={{opacity:.3, marginBottom:8}}/>
          <div style={{fontSize:12, color:C.textMuted}}>ÇAĞRI KAYDI BULUNAMADI</div>
        </div>
      ) : (
        <div style={{overflowX:'auto', maxHeight:'calc(100vh - 700px)'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:11, minWidth:900}}>
            <thead>
              <tr style={{background:C.bgHover}}>
                <th style={thSt}>NO</th>
                <th style={thSt}>YÖN</th>
                <th style={thSt}>ARAYAN</th>
                <th style={thSt}>ARANAN</th>
                <th style={thSt}>ARAYAN ADI</th>
                <th style={thSt}>TARİH</th>
                <th style={thSt}>DURUM</th>
                <th style={thSt}>SÜRE</th>
                <th style={thSt}>CRM</th>
                <th style={thSt}>NOTLAR</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item.id} style={{
                  background: i % 2 === 1 ? `${C.bgHover}66` : 'transparent'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.accent}08`}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? `${C.bgHover}66` : 'transparent'}
                >
                  <td style={{...tdSt, fontWeight:700, color:C.accent, fontSize:10}}>{item.id}</td>
                  <td style={tdSt}>
                    <span style={{
                      padding:'3px 8px', borderRadius:6, fontSize:9, fontWeight:700,
                      background: item.yon === 'gelen' ? `${C.success}18` : `${C.purple}18`,
                      color: item.yon === 'gelen' ? C.success : C.purple,
                      display:'inline-flex', alignItems:'center', gap:4
                    }}>
                      <LIcon name={item.yon === 'gelen' ? 'PhoneIncoming' : 'PhoneOutgoing'} size={10}
                        color={item.yon === 'gelen' ? C.success : C.purple}/>
                      {item.yon === 'gelen' ? 'GELEN' : 'GİDEN'}
                    </span>
                  </td>
                  <td style={{...tdSt, fontFamily:'monospace', fontWeight:600}}>{item.arayan || '-'}</td>
                  <td style={{...tdSt, fontFamily:'monospace', fontWeight:600}}>{item.aranan || '-'}</td>
                  <td style={{...tdSt, fontWeight:600}}>{item.arayan_adi || item.crm_ad_soyad || '-'}</td>
                  <td style={{...tdSt, color:C.textMuted, fontSize:10}}>
                    {item.arama_tarihi ? new Date(item.arama_tarihi).toLocaleString('tr-TR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '-'}
                  </td>
                  <td style={tdSt}>
                    <span style={{
                      padding:'3px 8px', borderRadius:6, fontSize:9, fontWeight:700,
                      background: `${durumRenk(item.durum)}18`,
                      color: durumRenk(item.durum)
                    }}>
                      {durumLabel(item.durum)}
                    </span>
                  </td>
                  <td style={{...tdSt, fontWeight:700, color: item.sure > 0 ? C.text : C.textMuted}}>
                    {fmtSure(item.sure)}
                  </td>
                  <td style={tdSt}>
                    {item.crm_id ? (
                      <span style={{
                        padding:'2px 6px', borderRadius:4, fontSize:9, fontWeight:600,
                        background:`${C.accent}18`, color:C.accent, cursor:'pointer'
                      }} title={'CRM #' + item.crm_id}>
                        <LIcon name="User" size={10} color={C.accent}/> #{item.crm_id}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{...tdSt, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', color:C.textMuted, fontSize:10}}>
                    {item.notlar || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SAYFALAMA */}
      {data.length > 0 && (
        <div style={{padding:'12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{fontSize:10, color:C.textMuted}}>
            {toplamKayit} KAYIT
          </span>
          <div style={{display:'flex', alignItems:'center', gap:4}}>
            <button disabled={sayfa <= 1} onClick={() => setSayfa(s => Math.max(1, s - 1))}
              style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: sayfa <= 1 ? 0.4 : 1}}>&lsaquo;</button>
            {Array.from({length: Math.min(5, toplamSayfa)}, (_, i) => {
              let p = sayfa - 2 + i;
              if (p < 1) p = i + 1;
              if (p > toplamSayfa) p = toplamSayfa - (4 - i);
              if (p < 1) p = i + 1;
              return p;
            }).filter((v, i, a) => v >= 1 && v <= toplamSayfa && a.indexOf(v) === i).map(p => (
              <button key={p} onClick={() => setSayfa(p)}
                style={{
                  width:28, height:28, borderRadius:6, border:`1px solid ${p === sayfa ? C.accent : C.borderLight}`,
                  background: p === sayfa ? C.accent : 'transparent', color: p === sayfa ? '#fff' : C.textSec,
                  cursor:'pointer', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center'
                }}>{p}</button>
            ))}
            <button disabled={sayfa >= toplamSayfa} onClick={() => setSayfa(s => Math.min(toplamSayfa, s + 1))}
              style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: sayfa >= toplamSayfa ? 0.4 : 1}}>&rsaquo;</button>
            <span style={{fontSize:9, color:C.textMuted, marginLeft:6}}>SAYFA {sayfa} / {toplamSayfa}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══ WEBRTC AĞ TANILAMA BİLEŞENİ ═══ */
const AgTanilama = () => {
  const {C, S, LIcon} = MR;
  const [sonuc, setSonuc] = useState(null);
  const [calisiyor, setCalisiyor] = useState(false);

  const tanilamaYap = async () => {
    setCalisiyor(true);
    setSonuc(null);
    var raporlar = [];
    var uyarilar = [];
    var hatalar = [];

    try {
      /* 1. AĞ ARAYÜZLERI KONTROLÜ */
      raporlar.push('🔍 AĞ ARAYÜZLERI KONTROL EDİLİYOR...');

      /* 2. STUN TESTİ - PUBLIC IP BUL */
      var stunSonuc = await new Promise(function(resolve) {
        var pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        var publicIp = null;
        var candidates = [];
        var timeout = setTimeout(function() { pc.close(); resolve({ publicIp: publicIp, candidates: candidates }); }, 5000);
        pc.onicecandidate = function(e) {
          if (e.candidate) {
            candidates.push({ type: e.candidate.type, protocol: e.candidate.protocol, address: e.candidate.address || '' });
            if (e.candidate.type === 'srflx' && e.candidate.address) publicIp = e.candidate.address;
          } else {
            clearTimeout(timeout); pc.close(); resolve({ publicIp: publicIp, candidates: candidates });
          }
        };
        pc.createDataChannel('test');
        pc.createOffer().then(function(o) { pc.setLocalDescription(o); });
      });

      if (stunSonuc.publicIp) {
        raporlar.push('✅ STUN BAŞARILI - Public IP: ' + stunSonuc.publicIp);
        /* CLOUDFLARE IP KONTROLÜ */
        if (/^104\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\./.test(stunSonuc.publicIp) ||
            /^172\.(64|65|66|67|68|69|70|71)\./.test(stunSonuc.publicIp)) {
          uyarilar.push('⚠️ PUBLIC IP CLOUDFLARE ARALIĞINDA (' + stunSonuc.publicIp + ') - WARP/VPN AKTİF OLABİLİR!');
        }
      } else {
        hatalar.push('❌ STUN BAŞARISIZ - PUBLIC IP BULUNAMADI (güvenlik duvarı UDP engelliyor olabilir)');
      }

      /* HOST ADAY ANALİZİ */
      var dockerIps = stunSonuc.candidates.filter(function(c) {
        return c.type === 'host' && /^172\.(1[6-9]|2\d|3[01])\./.test(c.address);
      });
      if (dockerIps.length > 0) {
        uyarilar.push('⚠️ Docker/WSL ağ arayüzleri tespit edildi (' + dockerIps.length + ' adet) - ICE karışıklığına neden olabilir');
      }

      raporlar.push('📊 Toplam ICE adayı: ' + stunSonuc.candidates.length +
        ' (host:' + stunSonuc.candidates.filter(function(c) { return c.type === 'host'; }).length +
        ' srflx:' + stunSonuc.candidates.filter(function(c) { return c.type === 'srflx'; }).length +
        ' relay:' + stunSonuc.candidates.filter(function(c) { return c.type === 'relay'; }).length + ')');

      /* 3. NETSANTRAL TURN TESTİ */
      if (MR.webrtcTelefon && MR.webrtcTelefon._config.dahili) {
        raporlar.push('🔍 NETSANTRAL TURN SUNUCUSU TEST EDİLİYOR...');
        var turnSonuc = await new Promise(function(resolve) {
          var santralNo = (MR.webrtcTelefon._config.santralNo || '').replace(/^0+/, '');
          var authUser = MR.webrtcTelefon._config.dahili + (santralNo ? '-' + santralNo : '');
          var pc2 = new RTCPeerConnection({
            iceServers: [
              { urls: ['turn:sip6.netsantral.com:3478?transport=udp', 'turn:sip6.netsantral.com:3478?transport=tcp'],
                username: authUser, credential: MR.webrtcTelefon._config.sipSifre || '' }
            ],
            iceTransportPolicy: 'relay' /* SADECE RELAY ADAYLARI - TURN TESTİ */
          });
          var relayFound = false;
          var timeout2 = setTimeout(function() { pc2.close(); resolve(relayFound); }, 8000);
          pc2.onicecandidate = function(e) {
            if (e.candidate && e.candidate.type === 'relay') {
              relayFound = true;
              clearTimeout(timeout2); pc2.close(); resolve(true);
            } else if (!e.candidate) {
              clearTimeout(timeout2); pc2.close(); resolve(relayFound);
            }
          };
          pc2.createDataChannel('turntest');
          pc2.createOffer().then(function(o) { pc2.setLocalDescription(o); });
        });

        if (turnSonuc) {
          raporlar.push('✅ NETSANTRAL TURN ÇALIŞIYOR - Relay adayları mevcut');
        } else {
          hatalar.push('❌ NETSANTRAL TURN ÇALIŞMIYOR - sip6.netsantral.com:3478 yanıt vermiyor veya kimlik doğrulama hatası');
          uyarilar.push('⚠️ TURN olmadan NAT/VPN arkasındaki kullanıcılar arama yapamaz');
        }
      }

      /* 4. WSS BAĞLANTI TESTİ */
      raporlar.push('🔍 WSS BAĞLANTISI TEST EDİLİYOR...');
      var wssUrl = MR.webrtcTelefon?._config?.wssUrl || 'wss://sip6.netsantral.com:8089/ws';
      var wssSonuc = await new Promise(function(resolve) {
        try {
          var ws = new WebSocket(wssUrl);
          var timeout3 = setTimeout(function() { ws.close(); resolve(false); }, 5000);
          ws.onopen = function() { clearTimeout(timeout3); ws.close(); resolve(true); };
          ws.onerror = function() { clearTimeout(timeout3); resolve(false); };
        } catch(e) { resolve(false); }
      });
      if (wssSonuc) {
        raporlar.push('✅ WSS BAĞLANTISI BAŞARILI - ' + wssUrl);
      } else {
        hatalar.push('❌ WSS BAĞLANTISI BAŞARISIZ - ' + wssUrl);
      }

      /* WEBRTC KAYIT DURUMU */
      if (MR.webrtcTelefon && MR.webrtcTelefon._kayitli) {
        raporlar.push('✅ SIP KAYIT AKTİF');
      } else if (MR.webrtcTelefon) {
        uyarilar.push('⚠️ SIP KAYIT YOK - SIP şifresini kontrol edin');
      }

    } catch(e) {
      hatalar.push('❌ TANILAMA HATASI: ' + (e.message || e));
    }

    setSonuc({ raporlar: raporlar, uyarilar: uyarilar, hatalar: hatalar });
    setCalisiyor(false);
  };

  return React.createElement('div', null,
    React.createElement('button', {
      onClick: tanilamaYap, disabled: calisiyor,
      style: { ...S.btn, width: '100%', justifyContent: 'center', background: '#38bdf8', color: '#000',
        fontSize: 12, fontWeight: 700, padding: '10px 16px' }
    },
      calisiyor
        ? React.createElement(React.Fragment, null,
            React.createElement('div', { style: { width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)',
              borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite' } }),
            'TANILAMA YAPILIYOR...')
        : React.createElement(React.Fragment, null,
            React.createElement(LIcon, { name: 'Search', size: 14, color: '#000' }),
            'AĞ TANILAMA BAŞLAT')
    ),
    sonuc && React.createElement('div', { style: { marginTop: 12, padding: 12, borderRadius: 8,
      background: C.bg + '88', fontSize: 10, fontFamily: 'monospace', lineHeight: 2 } },
      sonuc.raporlar.map(function(r, i) {
        return React.createElement('div', { key: 'r' + i, style: { color: C.textSec } }, r);
      }),
      sonuc.uyarilar.map(function(u, i) {
        return React.createElement('div', { key: 'u' + i, style: { color: '#f59e0b', fontWeight: 600 } }, u);
      }),
      sonuc.hatalar.map(function(h, i) {
        return React.createElement('div', { key: 'h' + i, style: { color: C.danger, fontWeight: 700 } }, h);
      }),
      React.createElement('div', { style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid ' + C.border,
        fontSize: 9, color: C.textMuted } },
        sonuc.hatalar.length === 0
          ? 'SONUÇ: Ağ bağlantısı uygun görünüyor.'
          : 'ÇÖZÜM: Cloudflare WARP/VPN varsa kapatın. Docker Desktop aktifse WebRTC ile çakışabilir. Farklı bir ağda deneyin.'
      )
    )
  );
};

const NetsantralTab = () => {
  const {C, S, LIcon, Badge, Loading, StatCard, api} = MR;
  const [ayarlar, setAyarlar] = useState({
    netsantral_santral_no: '',
    netsantral_kullanici: '',
    netsantral_sifre: '',
    netsantral_dahili: '',
    netsantral_aktif: '0',
    netsantral_yonlendirme_modu: 'dynamic',
    netsantral_sip_sifre: '',
    netsantral_wss_url: 'wss://sip6.netsantral.com:8089/ws',
    netsantral_sip_domain: 'sip6.netsantral.com'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [mesaj, setMesaj] = useState({type: '', text: ''});
  const [testResult, setTestResult] = useState(null);
  const [queueStats, setQueueStats] = useState(null);

  /* AYARLAR YÜKLE */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await api.ayarlarList();
      if (r?.success) {
        const data = r.data || {};
        setAyarlar(prev => ({
          ...prev,
          netsantral_santral_no: data.netsantral_santral_no || '',
          netsantral_kullanici: data.netsantral_kullanici || '',
          netsantral_sifre: data.netsantral_sifre || '',
          netsantral_dahili: data.netsantral_dahili || '',
          netsantral_aktif: data.netsantral_aktif || '0',
          netsantral_yonlendirme_modu: data.netsantral_yonlendirme_modu || 'dynamic',
          netsantral_sip_sifre: data.netsantral_sip_sifre || '',
          netsantral_wss_url: data.netsantral_wss_url || 'wss://sip6.netsantral.com:8089/ws',
          netsantral_sip_domain: data.netsantral_sip_domain || 'sip6.netsantral.com'
        }));
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
      setMesaj({type: 'success', text: 'NETSANTRAL AYARLARI BAŞARIYLA KAYDEDİLDİ'});
      /* GLOBAL DEĞİŞKENLERİ ANINDA GÜNCELLE - FLOATING PANEL HEMEN KULLLANSIN */
      MR._netsantralDahili = ayarlar.netsantral_dahili || '';
      MR._netsantralAktif = ayarlar.netsantral_aktif === '1';
      MR._netsantralSantralNo = ayarlar.netsantral_santral_no || '';
      /* DİĞER BİLEŞENLERE AYARLARIN DEĞİŞTİĞİNİ BİLDİR */
      window.dispatchEvent(new CustomEvent('mr-netsantral-ayar-degisti', {
        detail: {
          dahili: MR._netsantralDahili,
          aktif: MR._netsantralAktif,
          santralNo: MR._netsantralSantralNo
        }
      }));
      console.log('[NETSANTRAL] AYARLAR GÜNCELLENDİ - DAHİLİ:', MR._netsantralDahili, '| AKTİF:', MR._netsantralAktif);
      /* WEBRTC TELEFONU YENİDEN BAŞLAT (SIP BİLGİLERİ DEĞİŞMİŞ OLABİLİR) */
      if (MR.webrtcTelefon && (ayarlar.netsantral_sip_sifre || ayarlar.netsantral_sifre) && ayarlar.netsantral_dahili) {
        MR.webrtcTelefon.durdur().then(() => {
          MR.webrtcTelefon.baslat({
            wssUrl: ayarlar.netsantral_wss_url || 'wss://sip6.netsantral.com:8089/ws',
            domain: ayarlar.netsantral_sip_domain || 'sip6.netsantral.com',
            dahili: ayarlar.netsantral_dahili,
            sipSifre: ayarlar.netsantral_sip_sifre || '',
            kullanici: ayarlar.netsantral_kullanici || '',
            apiSifre: ayarlar.netsantral_sifre || '',
            santralNo: ayarlar.netsantral_santral_no || MR._netsantralSantralNo || ''
          });
        });
      }
    } else {
      setMesaj({type: 'error', text: r?.error || 'AYARLAR KAYDEDİLİRKEN HATA OLUŞTU'});
    }
    setSaving(false);
    setTimeout(() => setMesaj({type: '', text: ''}), 4000);
  };

  /* BAĞLANTI TESTİ */
  const testBaglanti = async () => {
    setTesting(true);
    setTestResult(null);
    setMesaj({type: '', text: ''});

    // Önce ayarları kaydet
    await api.ayarlarGuncelle(ayarlar);

    // GLOBAL DEĞİŞKENLERİ GÜNCELLE (KAYIT SONRASI HEMEN AKTİF OLSUN)
    MR._netsantralDahili = ayarlar.netsantral_dahili || '';
    MR._netsantralAktif = ayarlar.netsantral_aktif === '1';
    MR._netsantralSantralNo = ayarlar.netsantral_santral_no || '';

    // Sonra test et
    const r = await api.netsantralTest();
    if (r?.success && r.data?.success_api) {
      const resp = r.data?.response || {};
      setTestResult({success: true, data: resp, debug: r.data?.debug});
      // Alternatif format başarılıysa bildir
      if (resp.oneri_santral_no) {
        setMesaj({type: 'success', text: 'BAĞLANTI BAŞARILI! ÖNERİ: SANTRAL NO\'YU "' + resp.oneri_santral_no + '" OLARAK GÜNCELLEYİN.'});
        up('netsantral_santral_no', resp.oneri_santral_no);
      } else {
        setMesaj({type: 'success', text: 'NETSANTRAL BAĞLANTISI BAŞARILI!'});
      }

      // Kuyruk bilgisini kaydet
      if (resp) {
        setQueueStats(resp);
      }
    } else {
      // NETGSM HATA KODU KONTROLÜ
      const resp = r?.data?.response || {};
      const debug = r?.data?.debug || {};
      const hataMesaj = resp.hata_mesaj || resp.raw_response || r?.error || 'BAĞLANTI HATASI';
      const hataKodu = resp.hata_kodu || '';
      const cozumOnerisi = resp.cozum_onerisi || '';
      const denemeSayisi = resp.deneme_sayisi || 0;
      const formatOnerisi = resp.format_onerisi || '';
      const hatKullaniciUyari = resp.hat_kullanici_uyari || '';
      const oneriSantralNo = resp.oneri_santral_no || '';
      const oneriMesaj = resp.oneri_mesaj || '';
      const errText = hataKodu ? `HATA KODU: ${hataKodu} - ${hataMesaj}` : hataMesaj;
      if (denemeSayisi > 1) {
        debug._denemeSayisi = denemeSayisi + ' FARKLI AYARLA DENENDİ';
      }
      // Eğer alternatif format önerisi varsa, çözüm olarak göster
      let fullCozum = cozumOnerisi;
      if (oneriMesaj) fullCozum = oneriMesaj;
      else if (formatOnerisi) fullCozum = (fullCozum ? fullCozum + '. ' : '') + formatOnerisi;
      if (hatKullaniciUyari) fullCozum = (fullCozum ? fullCozum + '. ' : '') + hatKullaniciUyari;
      setTestResult({success: false, error: errText, debug: debug, httpCode: r?.data?.http_code, cozumOnerisi: fullCozum, oneriSantralNo: oneriSantralNo});
      setMesaj({type: 'error', text: 'BAĞLANTI HATASI: ' + errText});
    }
    setTesting(false);
    setTimeout(() => setMesaj({type: '', text: ''}), 8000);
  };

  if (loading) return <Loading/>;

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
        {/* BAĞLANTI AYARLARI */}
        <div style={S.card}>
          <div style={{...S.cardHead, padding: '12px 16px'}}>
            <LIcon name="Phone" size={14} color={C.accent}/>
            <span style={{fontSize: 12, fontWeight: 700}}>NETSANTRAL BAĞLANTI AYARLARI</span>
          </div>
          <div style={{padding: 16}}>
            <div style={{display: 'grid', gap: 16}}>
              {/* AKTİF/PASİF */}
              <div style={{
                padding: '12px 16px', borderRadius: 10,
                background: ayarlar.netsantral_aktif === '1' ? `${C.success}15` : `${C.textMuted}10`,
                border: `1px solid ${ayarlar.netsantral_aktif === '1' ? C.success + '33' : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: ayarlar.netsantral_aktif === '1' ? C.success : C.textMuted,
                    boxShadow: ayarlar.netsantral_aktif === '1' ? `0 0 8px ${C.success}` : 'none'
                  }}/>
                  <span style={{fontSize: 12, fontWeight: 700,
                    color: ayarlar.netsantral_aktif === '1' ? C.success : C.textMuted
                  }}>
                    NETSANTRAL {ayarlar.netsantral_aktif === '1' ? 'AKTİF' : 'PASİF'}
                  </span>
                </div>
                <div onClick={() => up('netsantral_aktif', ayarlar.netsantral_aktif === '1' ? '0' : '1')} style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                  background: ayarlar.netsantral_aktif === '1' ? C.success : C.borderLight,
                  position: 'relative', transition: 'all .3s'
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff', position: 'absolute', top: 2,
                    left: ayarlar.netsantral_aktif === '1' ? 22 : 2,
                    transition: 'all .3s', boxShadow: '0 1px 4px rgba(0,0,0,.3)'
                  }}/>
                </div>
              </div>

              {/* SANTRAL NO */}
              <div>
                <label style={S.label}>SANTRAL NUMARASI *</label>
                <input style={S.input} value={ayarlar.netsantral_santral_no}
                  onChange={e => up('netsantral_santral_no', e.target.value)}
                  placeholder="08503625026502"/>
                <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                  NETGSM NETSANTRAL HAT NUMARANIZ. FORMAT: <strong>0850 + ABONE NO</strong> (ÖRN: 08503625026502).
                  NETGSM PANELİNDE ABONE BİLGİLERİ SAYFASINDAN "ABONE NO"YU ALIN VE BAŞINA 0850 EKLEYİN.
                </div>
              </div>

              {/* KULLANICI ADI */}
              <div>
                <label style={S.label}>KULLANICI ADI *</label>
                <input style={S.input} value={ayarlar.netsantral_kullanici}
                  onChange={e => up('netsantral_kullanici', e.target.value)}
                  placeholder="5550984254"/>
                <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                  NETGSM PANELİNDEKİ "KULLANICI ADI" (TELEFON NUMARANIZ). "HAT KULLANICI BİLGİSİ" SEKMESİNDEN DE KONTROL EDEBİLİRSİNİZ.
                </div>
              </div>

              {/* ŞİFRE */}
              <div>
                <label style={S.label}>ŞİFRE *</label>
                <input style={S.input} type="password" value={ayarlar.netsantral_sifre}
                  onChange={e => up('netsantral_sifre', e.target.value)}
                  placeholder="NETGSM PANEL ŞİFRENİZ"/>
                <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                  NETGSM PANELİNE GİRİŞ ŞİFRENİZ VEYA "HAT KULLANICI BİLGİSİ"NDEKİ ALT KULLANICI ŞİFRESİ
                </div>
              </div>

              {/* DAHİLİ */}
              <div>
                <label style={S.label}>VARSAYILAN DAHİLİ *</label>
                <input style={S.input} value={ayarlar.netsantral_dahili}
                  onChange={e => up('netsantral_dahili', e.target.value)}
                  placeholder="100"/>
                <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                  NETSANTRAL DAHİLİ NUMARANIZ (ÖRN: 100, 101, 102). GELEN ÇAĞRILAR BU DAHİLİYE YÖNLENDİRİLİR.
                  NETGSM NETSANTRAL PANELİNDEN DAHİLİ TANIMLAYIN.
                </div>
              </div>

              {/* ═══ WEBRTC TELEFON AYARLARI ═══ */}
              <div style={{gridColumn: '1/-1', borderTop: '2px solid #334155', paddingTop: 16, marginTop: 8}}>
                <div style={{fontSize: 13, fontWeight: 700, color: '#38bdf8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8}}>
                  <LIcon name="Phone" size={18}/> WEBRTC TELEFON (TARAYICIDAN DİREKT ARAMA)
                </div>
                <div style={{fontSize: 10, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6, background: '#1e293b', padding: 12, borderRadius: 8}}>
                  CRM EKRANINDAN DİREKT ARAMA YAPMAK İÇİN SIP ŞİFRENİZİ GİRİN.<br/>
                  TIKLA → KARŞI TARAF ÇALAR → KONUŞ → KAPAT. NETSİPP+ GEREKMİYOR!<br/>
                  <strong>ÖNEMLİ:</strong> NETSANTRAL PANELİNDE BAĞLANTI TİPİNİ "WSS" OLARAK DEĞİŞTİRİN.
                </div>
              </div>

              {/* SIP ŞİFRESİ */}
              <div>
                <label style={S.label}>SIP ŞİFRESİ (WEBRTC İÇİN) *</label>
                <input style={S.input} type="password" value={ayarlar.netsantral_sip_sifre}
                  onChange={e => up('netsantral_sip_sifre', e.target.value)}
                  placeholder="NETSANTRAL DAHİLİ SIP ŞİFRESİ"/>
                <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                  NETSİPP+ UYGULAMASI → AYARLAR → SIP AYARLARI → "ŞİFRE" ALANI.<br/>
                  SİSTEM OTOMATİK OLARAK ÜSTTEKİ KULLANICI/ŞİFRE İLE BİRLİKTE TÜM KOMBİNASYONLARI DENER.
                </div>
              </div>

              {/* WSS URL */}
              <div>
                <label style={S.label}>WSS BAĞLANTI ADRESİ</label>
                <input style={S.input} value={ayarlar.netsantral_wss_url}
                  onChange={e => up('netsantral_wss_url', e.target.value)}
                  placeholder="wss://sip6.netsantral.com:8089/ws"/>
                <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                  NETSANTRAL PANELİ → AYARLAR → DAHİLİ → GELİŞMİŞ AYARLAR → "WSS BAĞLANTI ADRESİ" ALANINDAKI URL.
                  GENELLİKLE: wss://sip6.netsantral.com:8089/ws
                </div>
              </div>

              {/* SIP DOMAIN */}
              <div>
                <label style={S.label}>SIP DOMAIN</label>
                <input style={S.input} value={ayarlar.netsantral_sip_domain}
                  onChange={e => up('netsantral_sip_domain', e.target.value)}
                  placeholder="sip6.netsantral.com"/>
                <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                  WSS ADRESİNDEKİ SUNUCU ADI. GENELLİKLE: sip6.netsantral.com
                </div>
              </div>

              {/* YÖNLENDİRME MODU */}
              <div>
                <label style={S.label}>GELEN ÇAĞRI YÖNLENDİRME MODU</label>
                <select style={S.select} value={ayarlar.netsantral_yonlendirme_modu}
                  onChange={e => up('netsantral_yonlendirme_modu', e.target.value)}>
                  <option value="dynamic">DİNAMİK - TTS + DAHİLİYE YÖNLENDIR (ÖNERİLEN)</option>
                  <option value="extensions">DİREKT - TTS'SİZ DAHİLİYE YÖNLENDIR</option>
                  <option value="tts">SADECE TTS - YÖNLENDİRME YOK</option>
                </select>
                <div style={{fontSize: 9, color: C.textMuted, marginTop: 4}}>
                  {ayarlar.netsantral_yonlendirme_modu === 'dynamic'
                    ? 'ARAYAN TANINIR → TTS İLE KARŞILANIR → DAHİLİYE AKTARILIR'
                    : ayarlar.netsantral_yonlendirme_modu === 'extensions'
                    ? 'DİREKT DAHİLİ NUMARASINA YÖNLENDİRİLİR (TTS OKUNMAZ)'
                    : 'SADECE HOŞGELDİNİZ MESAJI OKUNUR, IVR AKIŞI DEVAM EDER'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DURUM VE TEST */}
        <div style={{display: 'grid', gap: 16, alignContent: 'start'}}>
          {/* BAĞLANTI TESTİ */}
          <div style={S.card}>
            <div style={{...S.cardHead, padding: '12px 16px'}}>
              <LIcon name="Activity" size={14} color={C.accent}/>
              <span style={{fontSize: 12, fontWeight: 700}}>BAĞLANTI DURUMU</span>
            </div>
            <div style={{padding: 16}}>
              <button onClick={testBaglanti} disabled={testing} style={{
                ...S.btn, width: '100%', justifyContent: 'center',
                background: testing ? `${C.accent}55` : C.accent,
                color: '#fff', fontSize: 13, fontWeight: 700, padding: '12px 20px'
              }}>
                {testing ? (
                  <>
                    <div style={{width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite'}}/>
                    TEST EDİLİYOR...
                  </>
                ) : (
                  <>
                    <LIcon name="Wifi" size={16} color="#fff"/> BAĞLANTIYI TEST ET
                  </>
                )}
              </button>

              {testResult && (
                <div style={{
                  marginTop: 12, padding: 12, borderRadius: 8,
                  background: testResult.success ? `${C.success}15` : `${C.danger}15`,
                  border: `1px solid ${testResult.success ? C.success + '33' : C.danger + '33'}`
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6
                  }}>
                    <LIcon name={testResult.success ? 'CheckCircle' : 'XCircle'} size={16}
                      color={testResult.success ? C.success : C.danger}/>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: testResult.success ? C.success : C.danger
                    }}>
                      {testResult.success ? 'BAĞLANTI BAŞARILI' : 'BAĞLANTI HATASI'}
                    </span>
                  </div>
                  {testResult.error && (
                    <div style={{fontSize: 10, color: C.danger, wordBreak: 'break-all', marginBottom: 8}}>
                      {testResult.error}
                    </div>
                  )}
                  {/* ÇÖZÜM ÖNERİSİ */}
                  {!testResult.success && testResult.cozumOnerisi && (
                    <div style={{
                      marginTop: 4, marginBottom: 8, padding: '8px 10px', borderRadius: 6,
                      background: `${C.warning}15`, border: `1px solid ${C.warning}33`,
                      fontSize: 10, color: C.warning
                    }}>
                      <strong>ÇÖZÜM:</strong> {testResult.cozumOnerisi}
                      {testResult.oneriSantralNo && (
                        <div style={{marginTop:6}}>
                          <button onClick={() => {
                            up('netsantral_santral_no', testResult.oneriSantralNo);
                            setMesaj({type:'success', text:'SANTRAL NO "' + testResult.oneriSantralNo + '" OLARAK GÜNCELLENDİ. KAYDET VE TEKRAR TEST EDİN.'});
                          }} style={{...S.btn, background:C.warning, color:'#000', fontSize:10, padding:'6px 12px'}}>
                            <LIcon name="RefreshCw" size={11} color="#000"/>
                            SANTRAL NO'YU "{testResult.oneriSantralNo}" OLARAK GÜNCELLE
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {/* DEBUG BİLGİLERİ */}
                  {testResult.debug && (
                    <div style={{
                      marginTop: 6, padding: '8px 10px', borderRadius: 6,
                      background: `${C.bg}88`, fontSize: 9, fontFamily: 'monospace',
                      color: C.textMuted, lineHeight: 1.8
                    }}>
                      <div style={{fontWeight: 700, color: C.textSec, marginBottom: 4, fontSize: 10}}>DETAY BİLGİ</div>
                      {testResult.debug.api_url && <div>API URL: {testResult.debug.api_url}</div>}
                      {testResult.debug.santral_no_api && <div>SANTRAL NO (API): {testResult.debug.santral_no_api}</div>}
                      {testResult.debug.username_api && <div>KULLANICI (API): {testResult.debug.username_api}</div>}
                      {testResult.httpCode !== undefined && <div>HTTP KOD: {testResult.httpCode}</div>}
                      {testResult.debug.primary_ip && <div>SUNUCU IP: {testResult.debug.primary_ip}</div>}
                      {testResult.debug.sure && <div>SÜRE: {testResult.debug.sure}</div>}
                      {testResult.debug.deneme && <div>DENEME: {testResult.debug.deneme}</div>}
                      {testResult.debug.curl_error && <div style={{color: C.danger}}>CURL: {testResult.debug.curl_error}</div>}
                      {testResult.debug.curl_errno !== undefined && <div style={{color: C.danger}}>CURL ERRNO: {testResult.debug.curl_errno}</div>}
                    </div>
                  )}
                  {/* BAŞARILI İSE KUYRUK BİLGİSİ */}
                  {testResult.success && testResult.data && (
                    <div style={{
                      marginTop: 6, padding: '8px 10px', borderRadius: 6,
                      background: `${C.success}10`, fontSize: 10, color: C.success
                    }}>
                      NETGSM BAĞLANTISI AKTİF - GELEN/GİDEN ARAMA HAZIR
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* WEBRTC AĞ TANILAMA */}
          <div style={S.card}>
            <div style={{...S.cardHead, padding: '12px 16px'}}>
              <LIcon name="Globe" size={14} color="#38bdf8"/>
              <span style={{fontSize: 12, fontWeight: 700}}>WEBRTC AĞ TANILAMA</span>
            </div>
            <div style={{padding: 16}}>
              <AgTanilama />
            </div>
          </div>

        </div>
      </div>

      {/* KAYDET BUTONU */}
      <div style={{
        ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <div style={{fontSize: 12, color: C.textMuted}}>
          <LIcon name="Info" size={14} color={C.textMuted} style={{verticalAlign: 'middle'}}/>{' '}
          NETSANTRAL AYARLARINI KAYDETTİKTEN SONRA TEK EKRANDAN ARAMA YAPABİLİRSİNİZ
        </div>
        <button style={{
          ...S.btn, ...S.btnP, fontSize: 13, padding: '12px 32px', fontWeight: 700,
          opacity: saving ? 0.7 : 1
        }} onClick={kaydet} disabled={saving}>
          <LIcon name="Save" size={16} color="#fff"/>
          {saving ? 'KAYDEDİLİYOR...' : 'AYARLARI KAYDET'}
        </button>
      </div>

      {/* ═══ ÇAĞRI GEÇMİŞİ ═══ */}
      <NetsantralCagriGecmisi/>
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
    netsantral: {label: 'NETSANTRAL', icon: 'Phone'},
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
        {subPage === 'netsantral' && isAdmin && <NetsantralTab/>}
        {subPage === 'tema' && isAdmin && MR.TemaAyarlariTab && React.createElement(MR.TemaAyarlariTab)}
      </div>
    </div>
  );
};
