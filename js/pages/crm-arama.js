const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useMemo, useRef} = React;

/* ═══════════════════════════════════════════
   CRM ARAMA LİSTESİ / YÖNLENDİRME TAKİP
   EXCEL YÜKLEME + ARAMA TAKİP + TOPLU İŞLEM
   ═══════════════════════════════════════════ */
MR.CrmAramaPage = ({setPage, user}) => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, Modal, FormGroup, Confirm, api, ILLER} = MR;
  const hy = (islem) => MR.hasYetki(user, 'crm', islem);

  /* ── STATE ── */
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({toplam: 0, belirsiz: 0, alindi: 0, olumsuz: 0});

  /* FİLTRELER */
  const [search, setSearch] = useState('');
  const [durumF, setDurumF] = useState('');
  const [tarihBas, setTarihBas] = useState('');
  const [tarihBit, setTarihBit] = useState('');
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [toplamKayit, setToplamKayit] = useState(0);

  /* EXCEL YÜKLEME */
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelMsg, setExcelMsg] = useState('');
  const fileRef = useRef(null);

  /* TOPLU İŞLEM */
  const [secili, setSecili] = useState([]);
  const [topluIslem, setTopluIslem] = useState('');

  /* NOT MODAL */
  const [notModal, setNotModal] = useState(null);
  const [notText, setNotText] = useState('');
  const [notDurum, setNotDurum] = useState('');
  const [notNeden, setNotNeden] = useState('');
  const [notSonraki, setNotSonraki] = useState('');
  const [notLoading, setNotLoading] = useState(false);
  const [notlar, setNotlar] = useState([]);

  /* YENİ KAYIT / DÜZENLE MODAL */
  const [yeniModal, setYeniModal] = useState(false);
  const [duzenleId, setDuzenleId] = useState(null);
  const [yeniForm, setYeniForm] = useState({magdur_ad_soyad:'', magdur_tc:'', magdur_telefon:'', magdur_il:'', kaza_turu:'', magdur_ilce:''});
  const [yeniLoading, setYeniLoading] = useState(false);
  const yF = (k,v) => setYeniForm(p=>({...p,[k]:v}));
  const yeniKaydet = async () => {
    if (!yeniForm.magdur_ad_soyad.trim()) return alert('AD SOYAD GİRİNİZ');
    if (!yeniForm.magdur_telefon.trim()) return alert('TELEFON GİRİNİZ');
    setYeniLoading(true);
    let r;
    if (duzenleId) {
      r = await api.yonlendirmeUpdate({id: duzenleId, ...yeniForm});
    } else {
      r = await api.yonlendirmeImport({kayitlar:[yeniForm], batch_id:'M'+Date.now()});
    }
    setYeniLoading(false);
    if (r?.success) {
      setYeniModal(false); setDuzenleId(null);
      setYeniForm({magdur_ad_soyad:'', magdur_tc:'', magdur_telefon:'', magdur_il:'', kaza_turu:'', magdur_ilce:''});
      load();
    } else alert(r?.error || 'KAYIT HATASI');
  };

  /* KİŞİ DETAY MODAL */
  const [detayModal, setDetayModal] = useState(null);
  const openDetay = async (item) => {
    setDetayModal(item);
    setNotlar([]);
    const r = await api.yonlendirmeGet(item.id);
    if (r?.success && r.data?.notlar) setNotlar(r.data.notlar);
  };

  /* DURUM DEĞİŞTİR */
  const [durumDropId, setDurumDropId] = useState(null);
  const [durumDropPos, setDurumDropPos] = useState({top:0,left:0});
  const durumDegistir = async (id, yeniDurum) => {
    await api.yonlendirmeUpdate({id, durum: yeniDurum});
    setDurumDropId(null);
    load();
  };
  const openDurumDrop = (e, itemId) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDurumDropPos({top: rect.bottom + 4, left: rect.left - 40});
    setDurumDropId(durumDropId === itemId ? null : itemId);
  };

  /* SİL ONAY */
  const [silConfirm, setSilConfirm] = useState(false);

  const durumlar = ['', 'Belirsiz', 'Alindi', 'Olumsuz'];
  const durumLabels = {'': 'HEPSİ', 'Belirsiz': 'BELİRSİZ', 'Alindi': 'ALINDI', 'Olumsuz': 'OLUMSUZ'};
  const durumRenk = d => d === 'Alindi' ? C.success : d === 'Olumsuz' ? C.danger : C.warning;
  const GORUSME_SONUCLARI = [
    'OLUMLU – TEKRAR ARANACAK','OLUMLU – BELGE / BİLGİ BEKLENİYOR','OLUMLU – ZİYARET OLUŞTURULDU',
    'OLUMLU – SAHAYA AKTARILDI, TAKİP EDİLİYOR','MALULİYET VAR – TAKİP EDİLECEK',
    'RED – ARANMAK İSTEMİYOR','RED – MALULİYET YOK','OLUMSUZ – KUSURLU TARAF','ULAŞILAMADI'
  ];
  const sonucRenk = s => s?.startsWith('OLUMLU') || s?.startsWith('MALULİYET') ? C.success : s?.startsWith('RED') || s?.startsWith('OLUMSUZ') ? C.danger : C.warning;
  const nedenler = ['BAŞKA FİRMA İLE ANLAŞTI', 'İLGİLENMİYOR', 'TELEFON KAPALI / ULAŞILAMADI', 'MADDİ HASAR DÜŞÜK', 'ZAMAN AŞIMI', 'DİĞER'];
  const [sonDurumF, setSonDurumF] = useState('');

  /* ── VERİ YÜKLEME ── */
  const load = useCallback(async () => {
    setLoading(true);
    const p = {page: sayfa, limit: 100};
    if (search) p.q = search;
    if (durumF) p.durum = durumF;
    if (tarihBas) p.tarih_baslangic = tarihBas;
    if (tarihBit) p.tarih_bitis = tarihBit;
    const r = await api.yonlendirmeList(p);
    if (r?.success) {
      setData(r.data?.items || []);
      if (r.data?.stats) setStats(r.data.stats);
      if (r.data?.pagination) {
        setToplamSayfa(r.data.pagination.totalPages || 1);
        setToplamKayit(r.data.pagination.total || 0);
      }
    }
    setLoading(false);
  }, [search, durumF, tarihBas, tarihBit, sayfa]);

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t); }, [search, durumF, tarihBas, tarihBit, sayfa]);

  /* ── EXCEL DOSYA SEÇ ── */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);
    setExcelMsg('');
    setExcelData(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, {type: 'binary'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, {defval: ''});
        if (json.length === 0) { setExcelMsg('DOSYA BOŞ'); return; }
        setExcelData(json);
        setExcelMsg(json.length + ' KAYIT OKUNDU');
      } catch (err) {
        setExcelMsg('DOSYA OKUNAMADI: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  /* ── EXCEL YÜKLEME ── */
  const excelYukle = async () => {
    if (!excelData || excelData.length === 0) return;
    setExcelLoading(true);
    setExcelMsg('YÜKLENIYOR...');

    /* KOLON EŞLEMESİ - ESNEK */
    const colMap = (row) => {
      const get = (...keys) => {
        for (const k of keys) {
          for (const rk of Object.keys(row)) {
            if (rk.toUpperCase().replace(/[^A-ZÇĞIİÖŞÜ0-9]/g, '').includes(k.toUpperCase().replace(/[^A-ZÇĞIİÖŞÜ0-9]/g, ''))) {
              return String(row[rk] || '').trim();
            }
          }
        }
        return '';
      };
      return {
        yonlendiren: get('YÖNLENDİREN', 'YONLENDIREN', 'KAYNAK'),
        yonlendirme_tarihi: get('YÖNLENDİRME TARİHİ', 'YONLENDIRME TARIHI', 'TARİH', 'TARIH'),
        kaza_turu: get('KAZA TÜRÜ', 'KAZA TURU', 'TÜR', 'TUR'),
        magdur_ad_soyad: get('MAĞDUR AD SOYAD', 'MAGDUR AD SOYAD', 'AD SOYAD', 'ADSOYAD', 'İSİM', 'ISIM'),
        magdur_telefon: get('MAĞDUR TELEFON', 'MAGDUR TELEFON', 'TELEFON', 'TEL', 'GSM'),
        magdur_il: get('MAĞDUR İL', 'MAGDUR IL', 'İL', 'IL', 'ŞEHİR', 'SEHIR'),
        magdur_ilce: get('DETAY', 'MAĞDUR İLÇE', 'MAGDUR ILCE', 'İLÇE', 'ILCE'),
        magdur_tc: get('MAĞDUR TC', 'MAGDUR TC', 'TC', 'TC KİMLİK', 'TC KIMLIK', 'TCKIMLIK')
      };
    };

    const kayitlar = excelData.map(colMap).filter(r => r.magdur_ad_soyad || r.magdur_telefon);
    if (kayitlar.length === 0) {
      setExcelMsg('GEÇERLİ KAYIT BULUNAMADI. KOLON BAŞLIKLARINI KONTROL EDİN.');
      setExcelLoading(false);
      return;
    }

    /* MÜKERRER ELEME: Ad Soyad + Telefon aynı olanları filtrele */
    const benzersizMap = new Map();
    let elenenSayisi = 0;
    for (const k of kayitlar) {
      const anahtar = (k.magdur_ad_soyad||'').toUpperCase().trim() + '|' + (k.magdur_telefon||'').replace(/\D/g,'').trim();
      if (!benzersizMap.has(anahtar)) benzersizMap.set(anahtar, k);
      else elenenSayisi++;
    }
    const benzersizKayitlar = Array.from(benzersizMap.values());

    const batch_id = 'B' + Date.now();
    const r = await api.yonlendirmeImport({kayitlar: benzersizKayitlar, batch_id});
    setExcelLoading(false);
    if (r?.success) {
      const elenenInfo = elenenSayisi > 0 ? ` (${elenenSayisi} MÜKERRER ELENDİ)` : '';
      setExcelMsg((r.data?.count || benzersizKayitlar.length) + ' KAYIT BAŞARIYLA YÜKLENDİ' + elenenInfo);
      setExcelFile(null);
      setExcelData(null);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } else {
      setExcelMsg('HATA: ' + (r?.error || 'YÜKLEME BAŞARISIZ'));
    }
  };

  /* ── ŞABLON İNDİR ── */
  const sablonIndir = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['MAĞDUR AD SOYAD', 'MAĞDUR TC', 'MAĞDUR TELEFON', 'MAĞDUR İL', 'KAZA TÜRÜ', 'DETAY', 'YÖNLENDİREN', 'YÖNLENDİRME TARİHİ'],
      ['MEHMET DEMİR', '12345678901', '05321234567', 'İSTANBUL', 'ÇİFT TARAFLI', 'KADIKÖY / SAĞ ÖN HASAR', 'ÖRNEK KİŞİ', '2026-02-13']
    ]);
    ws['!cols'] = [{wch:22},{wch:14},{wch:16},{wch:14},{wch:16},{wch:24},{wch:18},{wch:18}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'YÖNLENDİRME');
    XLSX.writeFile(wb, 'yonlendirme_sablon.xlsx');
  };

  /* ── TOPLU İŞLEM ── */
  const topluIslemUygula = async () => {
    if (secili.length === 0 || !topluIslem) return;
    if (topluIslem === 'sil') { setSilConfirm(true); return; }
    const r = await api.yonlendirmeTopluIslem({ids: secili, islem: topluIslem});
    if (r?.success) { setSecili([]); setTopluIslem(''); load(); }
  };

  const topluSil = async () => {
    setSilConfirm(false);
    const r = await api.yonlendirmeTopluIslem({ids: secili, islem: 'sil'});
    if (r?.success) { setSecili([]); setTopluIslem(''); load(); }
  };

  /* ── CHECKBOX ── */
  const toggleSecili = (id) => {
    setSecili(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };
  const toggleAll = () => {
    if (secili.length === data.length) setSecili([]);
    else setSecili(data.map(d => d.id));
  };

  /* ── NOT MODAL AÇ ── */
  const openNot = async (item) => {
    setNotModal(item);
    setNotText('');
    setNotDurum('');
    setNotNeden('');
    setNotSonraki('');
    setNotlar([]);
    const r = await api.yonlendirmeGet(item.id);
    if (r?.success && r.data?.notlar) setNotlar(r.data.notlar);
  };

  /* ── NOT KAYDET ── */
  const notKaydet = async () => {
    if (!notText.trim()) return;
    setNotLoading(true);
    const d = {
      yonlendirme_id: notModal.id,
      not_text: notText.trim(),
      gorusme_durumu: notDurum || null,
      alinmama_nedeni: notNeden || null
    };
    if (notSonraki) d.sonraki_arama = notSonraki;
    const r = await api.yonlendirmeNotEkle(d);
    if (r?.success) {
      if (notDurum) await api.yonlendirmeUpdate({id: notModal.id, son_durum: notDurum}).catch(() => {});
      setNotText('');
      setNotDurum('');
      setNotNeden('');
      setNotSonraki('');
      /* NOTLARI YENİDEN YÜKLE */
      const r2 = await api.yonlendirmeGet(notModal.id);
      if (r2?.success && r2.data?.notlar) setNotlar(r2.data.notlar);
      load();
    }
    setNotLoading(false);
  };

  /* ── CRM'E AKTAR ── */
  const [aktarimLoading, setAktarimLoading] = useState(null);
  const [aktarimMsg, setAktarimMsg] = useState({type:'', text:''});
  const crmAktar = async (item) => {
    if (item.donusen_crm_id) return;
    if (!item.magdur_ad_soyad || !item.magdur_ad_soyad.trim()) {
      setAktarimMsg({type:'error', text:'CRM AKTARIMI İÇİN MAĞDUR AD SOYAD GEREKLİ'});
      setTimeout(() => setAktarimMsg({type:'', text:''}), 4000);
      return;
    }
    setAktarimLoading(item.id);
    setAktarimMsg({type:'', text:''});
    try {
      const d = {
        ad_soyad: item.magdur_ad_soyad,
        telefon: item.magdur_telefon || '',
        il: item.magdur_il || '',
        ilce: item.magdur_ilce || '',
        tc_vergi_no: item.magdur_tc || '',
        kaynak: 'YÖNLENDİRME',
        durum: 'Yeni',
        dosya_turu: 'ADK'
      };
      const r = await api.crmCreate(d);
      if (r?.success) {
        try {
          await api.yonlendirmeUpdate({id: item.id, donusen_crm_id: r.data?.id, son_durum: "CRM'E AKTARILDI"});
        } catch(e2) {}
        setAktarimMsg({type:'success', text: (item.magdur_ad_soyad || '') + ' CRM\'E BAŞARIYLA AKTARILDI'});
        setTimeout(() => setAktarimMsg({type:'', text:''}), 3000);
        load();
      } else {
        setAktarimMsg({type:'error', text:'CRM AKTARIMI HATASI: ' + (r?.error || 'BİLİNMEYEN HATA')});
        setTimeout(() => setAktarimMsg({type:'', text:''}), 5000);
      }
    } catch(e) {
      setAktarimMsg({type:'error', text:'CRM AKTARIMI SIRASINDA HATA: ' + (e?.message || 'BAĞLANTI HATASI')});
      setTimeout(() => setAktarimMsg({type:'', text:''}), 5000);
    }
    setAktarimLoading(null);
  };

  /* ── OTOMATİK ARAMA (AUTOCALL) ── */
  const [autocallLoading, setAutocallLoading] = useState(false);
  const [autocallMsg, setAutocallMsg] = useState({type:'', text:''});
  const [autocallListId, setAutocallListId] = useState(null);
  const [autocallListeler, setAutocallListeler] = useState([]);
  const [autocallRapor, setAutocallRapor] = useState(null);
  const [autocallModal, setAutocallModal] = useState(false);

  /* OTOMATİK ARAMA LİSTESİ OLUŞTUR - MEVCUT DATA'DAN */
  const autocallBaslat = async () => {
    const telefonlar = data.filter(d => d.magdur_telefon && d.durum !== 'Alindi').map(d => d.magdur_telefon);
    if (telefonlar.length === 0) {
      setAutocallMsg({type:'error', text:'ARANACAK NUMARA BULUNAMADI (ALINDI HARİÇ)'});
      setTimeout(() => setAutocallMsg({type:'', text:''}), 4000);
      return;
    }
    setAutocallLoading(true);
    setAutocallMsg({type:'', text:''});
    try {
      const listName = 'CRM_' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '_' + Date.now().toString(36).toUpperCase();
      const r = await api.autocallListeOlustur({
        list_name: listName,
        list_prefix: '110',
        list_type: 'static',
        numaralar: telefonlar
      });
      if (r?.success && r.data?.success_api) {
        const lid = r.data?.response?.list_id || r.data?.response?.data?.list_id || null;
        setAutocallListId(lid);
        setAutocallMsg({type:'success', text: telefonlar.length + ' NUMARA İLE OTOMATİK ARAMA LİSTESİ OLUŞTURULDU' + (lid ? ' (ID: ' + lid + ')' : '')});
      } else {
        const hata = r?.data?.response?.hata_mesaj || r?.error || 'OTOMATİK ARAMA LİSTESİ OLUŞTURULAMADI';
        setAutocallMsg({type:'error', text: hata});
      }
    } catch(e) {
      setAutocallMsg({type:'error', text:'BAĞLANTI HATASI: ' + (e?.message || '')});
    }
    setAutocallLoading(false);
    setTimeout(() => setAutocallMsg({type:'', text:''}), 8000);
  };

  /* OTOMATİK ARAMA LİSTELERİNİ YÜKLE */
  const autocallListeleriYukle = async () => {
    setAutocallModal(true);
    setAutocallLoading(true);
    try {
      const r = await api.autocallListeler();
      if (r?.success && r.data?.response) {
        setAutocallListeler(Array.isArray(r.data.response) ? r.data.response : (r.data.response?.data || []));
      }
    } catch(e) {}
    setAutocallLoading(false);
  };

  /* OTOMATİK ARAMA RAPORU */
  const autocallRaporAl = async (listId) => {
    try {
      const r = await api.autocallRapor(listId);
      if (r?.success) {
        setAutocallRapor(r.data?.response || null);
      }
    } catch(e) {}
  };

  /* OTOMATİK ARAMA DURDUR */
  const autocallDurdur = async (listId) => {
    try {
      const r = await api.autocallListeDurdur(listId);
      if (r?.success) {
        setAutocallMsg({type:'success', text:'LİSTE DURDURULDU'});
        autocallListeleriYukle();
      }
    } catch(e) {}
    setTimeout(() => setAutocallMsg({type:'', text:''}), 4000);
  };

  /* ── GİDEN ARAMA DURUMU ── */
  const [aramaAktif, setAramaAktif] = useState(null); // ARANMAKTA OLAN KAYIT ID'Sİ
  const [aramaMsg, setAramaMsg] = useState('');

  useEffect(() => {
    const handler = (e) => {
      const data = e.detail || {};
      if (data.basarili) {
        setAramaMsg('ÇAĞRI BAĞLANDI');
        setTimeout(() => { setAramaMsg(''); setAramaAktif(null); }, 4000);
      } else {
        setAramaMsg(data.hata || 'ARAMA BAŞLATILAMADI');
        setTimeout(() => { setAramaMsg(''); setAramaAktif(null); }, 5000);
      }
    };
    window.addEventListener('mr-arama-pbx-sonuc', handler);
    return () => window.removeEventListener('mr-arama-pbx-sonuc', handler);
  }, []);

  const aramaYap = (item) => {
    if (!item.magdur_telefon) return;
    /* ARAMA BAŞLAT VE KİŞİ KARTI AÇ - TÜM BİLGİLERİ AKTAR */
    localStorage.setItem('webrtc_new_call_phone', item.magdur_telefon);
    localStorage.setItem('webrtc_new_call_name', item.magdur_ad_soyad || '');
    if (item.magdur_il) localStorage.setItem('webrtc_new_call_il', item.magdur_il);
    if (item.magdur_ilce) localStorage.setItem('webrtc_new_call_ilce', item.magdur_ilce);
    if (item.magdur_tc) localStorage.setItem('webrtc_new_call_tc', item.magdur_tc);
    if (item.kaza_turu) localStorage.setItem('webrtc_new_call_kaza_turu', item.kaza_turu);
    if (MR.webrtcAra) {
      MR.webrtcAra(item.magdur_telefon, {ad: item.magdur_ad_soyad || '', il: item.magdur_il || ''});
      setAramaMsg('WEBRTC ARAMA BAŞLATILIYOR...');
      setAramaAktif(item.id);
      setTimeout(() => { setAramaMsg(''); setAramaAktif(null); }, 4000);
    } else {
      setAramaMsg('ARAMA SİSTEMİ DEVRE DIŞI');
      setTimeout(() => { setAramaMsg(''); }, 3000);
    }
    /* KİŞİ KARTI (CRM-YENİ) SAYFASINI AÇ */
    setPage('crm-yeni');
  };

  /* ── STİLLER ── */
  const FS = 11; /* TÜM HÜCRELER AYNI FONT BOYUTU */
  const isKoyu = MR.tema === 'koyu';
  const thSt = {padding:'7px 6px', textAlign:'left', color:isKoyu?'#FFFFFF':'#1e293b', fontWeight:800, fontSize:FS, borderBottom:`2px solid ${C.border}`, whiteSpace:'nowrap', position:'sticky', top:0, background:isKoyu?'#0f2342':'#1e40af', backgroundImage:isKoyu?'linear-gradient(135deg, #1e3a5f 0%, #0f2342 100%)':'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', zIndex:2, letterSpacing:0.3};
  const tdSt = {padding:'6px 6px', fontSize:FS, fontWeight:600, borderBottom:'none', whiteSpace:'nowrap', color:isKoyu?'#e2e8f0':'#1e293b'};
  const tdTrunc = {...tdSt, maxWidth:90, overflow:'hidden', textOverflow:'ellipsis'};
  const thSticky = {...thSt, position:'sticky', right:0, zIndex:3, background:isKoyu?'#0f2342':'#1e40af', backgroundImage:isKoyu?'linear-gradient(135deg, #1e3a5f 0%, #0f2342 100%)':'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'};
  const rowBgFn = (i, selected) => selected ? `${C.accent}18` : isKoyu ? (i%2===0?'#111827':'#0d1321') : (i%2===0?'#ffffff':'#f0f4ff');
  const tdStickyBgFn = (i, selected) => selected ? `${C.accent}18` : isKoyu ? (i%2===0?'#111827':'#0d1321') : (i%2===0?'#ffffff':'#f0f4ff');
  const rowSt = (i, selected) => ({
    background: rowBgFn(i, selected),
    transition:'all .25s ease',
    border: selected
      ? `1px solid ${C.accent}66`
      : isKoyu ? '1px solid rgba(6,182,212,0.15)' : '1px solid rgba(99,102,241,0.12)',
    borderRadius:8,
    boxShadow: isKoyu ? '0 1px 4px rgba(0,0,0,0.2)' : '0 1px 3px rgba(99,102,241,0.06)'
  });
  const iconBtn = (bg) => ({
    width:26, height:26, borderRadius:6, border:'none', cursor:'pointer',
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    background:`${bg}18`, transition:'all .2s'
  });
  const durumChip = (d) => {
    const c = durumRenk(d);
    return {
      padding:'3px 8px', borderRadius:6, fontSize:FS, fontWeight:700,
      display:'inline-flex', alignItems:'center', gap:4,
      background:`${c}18`, color:c
    };
  };

  /* ── RENDER ── */
  return (
    <div className="fade-in">

      {/* ═══ İSTATİSTİK KARTLARI - TAM GENİŞLİK 5 EŞİT KART ═══ */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:12}}>
        {[
          {icon:'Users', label:'TOPLAM', value:stats.toplam, c:C.accent},
          {icon:'Clock', label:'BELİRSİZ', value:stats.belirsiz, c:C.warning},
          {icon:'Check', label:'ALINDI', value:stats.alindi, c:C.success},
          {icon:'X', label:'OLUMSUZ', value:stats.olumsuz, c:C.danger},
          {icon:'PhoneCall', label:'BUGÜN', value:data.filter(d => d.sonraki_arama && new Date(d.sonraki_arama).toDateString() === new Date().toDateString()).length, c:C.cyan}
        ].map((s,i) => (
          <div key={i} style={{
            background:`${s.c}0a`, border:`1px solid ${s.c}20`,
            borderRadius:8, padding:'10px 6px', textAlign:'center'
          }}>
            <div style={{fontSize:20, fontWeight:800, color:s.c, lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:8, color:C.textMuted, marginTop:3, fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ GÜNLÜK ARAMA ÖZETİ + OTOMATİK ARAMA ═══ */}
      <div style={{marginBottom:12}}>
        <div style={S.card}>
          <div style={{...S.cardHead, padding:'8px 14px', justifyContent:'space-between'}}>
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <LIcon name="BarChart3" size={13} color={C.accent}/>
              <span style={{fontSize:11, fontWeight:700}}>GÜNLÜK ARAMA ÖZETİ</span>
            </div>
            <div style={{display:'flex', gap:4}}>
              <button style={{...S.btn, ...S.btnS, fontSize:8, padding:'4px 8px'}}
                onClick={autocallBaslat} disabled={autocallLoading || data.length === 0}>
                <LIcon name="PhoneOutgoing" size={10} color="#fff"/>
                {autocallLoading ? 'GÖNDERİLİYOR...' : 'OTO. ARAMA'}
              </button>
              <button style={{...S.btn, ...S.btnG, fontSize:8, padding:'4px 8px'}}
                onClick={autocallListeleriYukle}>
                <LIcon name="List" size={10} color={C.textSec}/> LİSTELER
              </button>
            </div>
          </div>
          {autocallMsg.text && (
            <div style={{padding:'6px 14px', background: autocallMsg.type === 'success' ? `${C.success}12` : `${C.danger}12`, fontSize:10, fontWeight:600, color: autocallMsg.type === 'success' ? C.success : C.danger, display:'flex', alignItems:'center', gap:4}}>
              <LIcon name={autocallMsg.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={12} color={autocallMsg.type === 'success' ? C.success : C.danger}/> {autocallMsg.text}
            </div>
          )}
          <div style={{padding:10}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6}}>
              {[
                {label:'BUGÜN', value: data.filter(d => d.gorusme_tarihi && new Date(d.gorusme_tarihi).toDateString() === new Date().toDateString()).length, c:C.accent},
                {label:'OLUMLU', value: data.filter(d => d.durum === 'Alindi' && d.gorusme_tarihi && new Date(d.gorusme_tarihi).toDateString() === new Date().toDateString()).length, c:C.success},
                {label:'TAKİP', value: data.filter(d => d.durum === 'Belirsiz').length, c:C.warning},
                {label:'ULAŞILMADI', value: data.filter(d => d.alinmama_nedeni && d.alinmama_nedeni.includes('ULAŞILAMADI')).length, c:C.danger}
              ].map((item,i) => (
                <div key={i} style={{
                  background:`${item.c}0a`, border:`1px solid ${item.c}20`,
                  borderRadius:8, padding:'8px 4px', textAlign:'center'
                }}>
                  <div style={{fontSize:18, fontWeight:800, color:item.c}}>{item.value}</div>
                  <div style={{fontSize:8, color:C.textMuted, marginTop:2}}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GİZLİ EXCEL INPUT */}
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFileSelect}/>
      {/* EXCEL DURUM MESAJI */}
      {(excelFile || excelMsg) && (
        <div style={{marginBottom:8, padding:'6px 14px', background:`${excelMsg.includes('BAŞARI') ? C.success : excelMsg.includes('HATA') || excelMsg.includes('BOŞ') ? C.danger : C.accent}10`, borderRadius:8, fontSize:10, fontWeight:600, color: excelMsg.includes('BAŞARI') ? C.success : excelMsg.includes('HATA') || excelMsg.includes('BOŞ') ? C.danger : C.textSec, display:'flex', alignItems:'center', gap:6}}>
          <LIcon name="FileSpreadsheet" size={12} color={excelMsg.includes('BAŞARI') ? C.success : C.accent}/>
          {excelFile ? excelFile.name : ''}{excelMsg ? ' - ' + excelMsg : ''}
          {excelData && !excelLoading && (
            <button style={{...S.btn, ...S.btnS, fontSize:8, padding:'3px 8px', marginLeft:6}} onClick={excelYukle}>
              <LIcon name="Upload" size={10} color="#fff"/> YÜKLE
            </button>
          )}
        </div>
      )}

      {/* ═══ ANA LİSTE KARTI ═══ */}
      <div style={S.card}>
        {/* BAŞLIK */}
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <LIcon name="PhoneCall" size={14} color={C.accent}/>
            <span style={{fontSize:13, fontWeight:700}}>CRM LİSTESİ</span>
            <Badge text={toplamKayit + ' KAYIT'} color={C.accent}/>
          </div>
          <div style={{display:'flex', gap:6, alignItems:'center'}}>
            {hy('crm-sablon-indir') && <button style={{...S.btn, ...S.btnG, fontSize:9, padding:'5px 10px', display:'flex', alignItems:'center', gap:4}} onClick={sablonIndir}>
              <LIcon name="Download" size={11} color={C.textSec}/> ŞABLON İNDİR
            </button>}
            {hy('crm-excel-yukle') && <button style={{...S.btn, ...S.btnP, fontSize:9, padding:'5px 10px', display:'flex', alignItems:'center', gap:4}} onClick={() => fileRef.current?.click()}>
              <LIcon name="Upload" size={11} color="#fff"/> EXCEL YÜKLE
            </button>}
            {hy('crm-yeni') && <button style={{...S.btn, fontSize:9, padding:'5px 10px', display:'flex', alignItems:'center', gap:4, background:C.success, color:'#fff'}} onClick={() => { setDuzenleId(null); setYeniForm({magdur_ad_soyad:'', magdur_tc:'', magdur_telefon:'', magdur_il:'', kaza_turu:'', magdur_ilce:''}); setYeniModal(true); }}>
              <LIcon name="UserPlus" size={11} color="#fff"/> YENİ KAYIT
            </button>}
            <input placeholder="AD, TELEFON, TC ARA..." value={search} onChange={e => {setSearch(e.target.value); setSayfa(1);}}
              style={{...S.input, width:200, fontSize:10, padding:'6px 10px'}}/>
          </div>
        </div>

        {/* FİLTRE TABS */}
        <div style={{padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
          <span style={{fontSize:9, fontWeight:700, color:C.textMuted, marginRight:6}}>YÖNLENDİRME DURUMU:</span>
          {durumlar.map(d => (
            <span key={d||'all'} onClick={() => {setDurumF(d); setSayfa(1);}}
              style={{
                padding:'5px 12px', borderRadius:20, fontSize:10, fontWeight: durumF === d ? 700 : 500,
                cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5,
                background: durumF === d ? `${d ? durumRenk(d) : C.accent}18` : 'transparent',
                color: durumF === d ? (d ? durumRenk(d) : C.accent) : C.textSec,
                border:`1px solid ${durumF === d ? (d ? durumRenk(d) : C.accent) + '44' : C.border}`
              }}>
              {durumLabels[d]}
              {d === '' && <span style={{background:`${C.accent}20`, padding:'0 5px', borderRadius:8, fontSize:8}}>{stats.toplam}</span>}
              {d === 'Belirsiz' && <span style={{background:`${C.warning}20`, padding:'0 5px', borderRadius:8, fontSize:8}}>{stats.belirsiz}</span>}
              {d === 'Alindi' && <span style={{background:`${C.success}20`, padding:'0 5px', borderRadius:8, fontSize:8}}>{stats.alindi}</span>}
              {d === 'Olumsuz' && <span style={{background:`${C.danger}20`, padding:'0 5px', borderRadius:8, fontSize:8}}>{stats.olumsuz}</span>}
            </span>
          ))}

          <div style={{marginLeft:'auto', display:'flex', gap:6, alignItems:'center'}}>
            <span style={{fontSize:9, color:C.textMuted}}>SONUÇ:</span>
            <select value={sonDurumF} onChange={e => {setSonDurumF(e.target.value); setSayfa(1);}}
              style={{...S.select, width:220, fontSize:10, padding:'5px 8px'}}>
              <option value="">HEPSİ</option>
              {GORUSME_SONUCLARI.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{fontSize:9, color:C.textMuted}}>TARİH:</span>
            <input type="date" value={tarihBas} onChange={e => {setTarihBas(e.target.value); setSayfa(1);}}
              style={{...S.input, width:130, fontSize:10, padding:'5px 8px'}}/>
            <span style={{fontSize:9, color:C.textMuted}}>-</span>
            <input type="date" value={tarihBit} onChange={e => {setTarihBit(e.target.value); setSayfa(1);}}
              style={{...S.input, width:130, fontSize:10, padding:'5px 8px'}}/>
          </div>
        </div>

        {/* GİDEN ARAMA DURUM MESAJI */}
        {aramaMsg && (
          <div style={{padding:'10px 16px', background: aramaMsg.includes('BAĞLANDI') ? `${C.success}15` : aramaMsg.includes('ARANIYOR') ? `${C.accent}15` : `${C.danger}15`, borderBottom:`1px solid ${aramaMsg.includes('BAĞLANDI') ? C.success : aramaMsg.includes('ARANIYOR') ? C.accent : C.danger}33`, fontSize:12, fontWeight:600, color: aramaMsg.includes('BAĞLANDI') ? C.success : aramaMsg.includes('ARANIYOR') ? C.accent : C.danger, display:'flex', alignItems:'center', gap:8}}>
            <LIcon name={aramaMsg.includes('BAĞLANDI') ? 'PhoneCall' : aramaMsg.includes('ARANIYOR') ? 'Phone' : 'PhoneOff'} size={16} color={aramaMsg.includes('BAĞLANDI') ? C.success : aramaMsg.includes('ARANIYOR') ? C.accent : C.danger}/> {aramaMsg}
          </div>
        )}

        {/* AKTARIM MESAJI */}
        {aktarimMsg.text && (
          <div style={{padding:'10px 16px', background: aktarimMsg.type === 'success' ? `${C.success}15` : `${C.danger}15`, borderBottom:`1px solid ${aktarimMsg.type === 'success' ? C.success : C.danger}33`, fontSize:12, fontWeight:600, color: aktarimMsg.type === 'success' ? C.success : C.danger, display:'flex', alignItems:'center', gap:8}}>
            <LIcon name={aktarimMsg.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={16} color={aktarimMsg.type === 'success' ? C.success : C.danger}/> {aktarimMsg.text}
          </div>
        )}

        {/* TABLO */}
        {loading ? <Loading/> : data.length === 0 ? (
          <EmptyState icon="PhoneCall" title="YÖNLENDİRME KAYDI BULUNAMADI" desc="EXCEL DOSYASI YÜKLEYEREK BAŞLAYIN"/>
        ) : (
          <div style={{overflowX:'auto', width:'100%', position:'relative'}}>
            <table style={{width:'100%', borderCollapse:'separate', borderSpacing:'0 3px', fontSize:FS, minWidth:900, tableLayout:'fixed'}}>
              <colgroup>
                <col style={{width:30}}/>{/* checkbox */}
                <col style={{width:120}}/>{/* AD SOYAD */}
                <col style={{width:90}}/>{/* TC */}
                <col style={{width:100}}/>{/* TELEFON */}
                <col style={{width:55}}/>{/* İL */}
                <col style={{width:60}}/>{/* TÜR */}
                <col style={{width:100}}/>{/* DETAY */}
                <col style={{width:72}}/>{/* GÖRÜŞME */}
                <col style={{width:72}}/>{/* DURUM */}
                <col style={{width:88}}/>{/* İŞLEM */}
              </colgroup>
              <thead>
                <tr style={{background:isKoyu?'#0f2342':'#1e40af', backgroundImage:isKoyu?'linear-gradient(135deg, #1e3a5f 0%, #0f2342 100%)':'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)'}}>
                  <th style={thSt}><input type="checkbox" checked={secili.length === data.length && data.length > 0} onChange={toggleAll}/></th>
                  <th style={thSt}>AD SOYAD</th>
                  <th style={thSt}>TC</th>
                  <th style={thSt}>TELEFON</th>
                  <th style={thSt}>İL</th>
                  <th style={thSt}>TÜR</th>
                  <th style={thSt}>DETAY</th>
                  <th style={thSt}>GÖRÜŞME</th>
                  <th style={thSt}>DURUM</th>
                  <th style={{...thSticky, textAlign:'center'}}>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {data.filter(item => !sonDurumF || item.son_durum === sonDurumF).map((item, i) => {
                  const sel = secili.includes(item.id);
                  return (
                  <tr key={item.id} style={{...rowSt(i, sel), cursor:'pointer'}}
                    onClick={() => openDetay(item)}
                    onMouseEnter={e => {if(!sel) {e.currentTarget.style.border=isKoyu?'1px solid rgba(6,182,212,0.45)':'1px solid rgba(99,102,241,0.35)';e.currentTarget.style.boxShadow=isKoyu?'0 0 8px rgba(6,182,212,0.18), 0 2px 8px rgba(0,0,0,0.15)':'0 0 8px rgba(99,102,241,0.12), 0 2px 6px rgba(99,102,241,0.08)';e.currentTarget.style.transform='translateY(-1px)';}}}
                    onMouseLeave={e => {if(!sel) {e.currentTarget.style.border=isKoyu?'1px solid rgba(6,182,212,0.15)':'1px solid rgba(99,102,241,0.12)';e.currentTarget.style.boxShadow=isKoyu?'0 1px 4px rgba(0,0,0,0.2)':'0 1px 3px rgba(99,102,241,0.06)';e.currentTarget.style.transform='translateY(0)';}}}
                  >
                    <td style={tdSt} onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel} onChange={() => toggleSecili(item.id)}/></td>
                    <td style={{...tdTrunc, fontWeight:600}} title={item.magdur_ad_soyad || ''}>{item.magdur_ad_soyad || '-'}</td>
                    <td style={{...tdSt, fontFamily:'monospace', fontSize:10}} title={item.magdur_tc || ''}>{item.magdur_tc || '-'}</td>
                    <td style={tdSt}>
                      <div style={{display:'flex', alignItems:'center', gap:4}}>
                        <span style={{minWidth:80, whiteSpace:'nowrap'}}>{item.magdur_telefon || '-'}</span>
                        {item.magdur_telefon && (
                          <button style={{...iconBtn(C.success), width:22, height:22, flexShrink:0}} title="ARA"
                            onClick={(e) => { e.stopPropagation(); aramaYap(item); }}>
                            <LIcon name="Phone" size={10} color={C.success}/>
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={tdTrunc} title={item.magdur_il || ''}>{item.magdur_il || '-'}</td>
                    <td style={tdSt}>
                      {item.kaza_turu ? (
                        <Badge text={item.kaza_turu?.length > 8 ? item.kaza_turu.slice(0,8)+'..' : item.kaza_turu} color={item.kaza_turu?.includes('ÇİFT') ? C.accent : C.purple}/>
                      ) : '-'}
                    </td>
                    <td style={tdTrunc} title={item.magdur_ilce || ''}>{item.magdur_ilce || '-'}</td>
                    <td style={tdSt}>{MR.tarihFmt ? MR.tarihFmt(item.gorusme_tarihi) : '-'}</td>
                    <td style={tdSt}>
                      <span style={durumChip(item.durum)}>
                        {item.durum === 'Alindi' ? '\u2714' : item.durum === 'Olumsuz' ? '\u2716' : '\u25CF'}{' '}
                        {durumLabels[item.durum] || 'BELİRSİZ'}
                      </span>
                    </td>
                    <td style={{...tdSt,position:'sticky',right:0,background:tdStickyBgFn(i,sel),textAlign:'center'}} onClick={e => e.stopPropagation()}>
                      <div style={{display:'flex', gap:3, justifyContent:'center'}}>
                        {hy('crm-not-ekle') && <button style={iconBtn(C.cyan)} title="NOT / DETAY" onClick={() => openNot(item)}>
                          <LIcon name="Eye" size={12} color={C.cyan}/>
                        </button>}
                        {hy('crm-duzenle') && <button style={iconBtn(C.warning)} title="DÜZENLE" onClick={() => { setYeniForm({magdur_ad_soyad:item.magdur_ad_soyad||'', magdur_tc:item.magdur_tc||'', magdur_telefon:item.magdur_telefon||'', magdur_il:item.magdur_il||'', kaza_turu:item.kaza_turu||'', magdur_ilce:item.magdur_ilce||''}); setDuzenleId(item.id); setYeniModal(true); }}>
                          <LIcon name="Edit3" size={12} color={C.warning}/>
                        </button>}
                        {hy('crm-durum-degistir') && <button style={iconBtn(C.purple)} title="DURUM DEĞİŞTİR" onClick={(e) => openDurumDrop(e, item.id)}>
                          <LIcon name="RefreshCw" size={12} color={C.purple}/>
                        </button>}
                        {hy('crm-ara') && <button style={{
                          ...iconBtn(aramaAktif === item.id ? C.accent : C.success),
                          background: aramaAktif === item.id ? `${C.accent}33` : `${C.success}18`,
                          minWidth: aramaAktif === item.id ? 60 : 26
                        }} title="ARA" onClick={() => aramaYap(item)}
                          disabled={aramaAktif === item.id}>
                          <LIcon name={aramaAktif === item.id ? 'PhoneCall' : 'Phone'} size={12}
                            color={aramaAktif === item.id ? C.accent : C.success}/>
                          {aramaAktif === item.id && <span style={{fontSize:8, color:C.accent, fontWeight:700}}>ARANIYOR</span>}
                        </button>}
                        {hy('crm-sil') && <button style={iconBtn(C.danger)} title="SİL" onClick={() => {setSecili([item.id]); setSilConfirm(true);}}>
                          <LIcon name="Trash2" size={12} color={C.danger}/>
                        </button>}
                        <button style={iconBtn(C.cyan)} title="SAHAYA AKTAR (KOPYALA)" onClick={() => {
                          const tarih = item.yonlendirme_tarihi ? (MR.tarihFmt ? MR.tarihFmt(item.yonlendirme_tarihi) : item.yonlendirme_tarihi) : '-';
                          const metin = `📋 SAHA GÖREVİ\n\n📌 Dosya Türü: ${item.kaza_turu || 'ADK'}\n👤 Ad Soyad: ${item.magdur_ad_soyad || '-'}\n📅 Kaza Tarihi: ${tarih}\n📞 Telefon: ${item.magdur_telefon || '-'}\n📍 İl: ${item.magdur_il || '-'}\n🆔 TC: ${item.magdur_tc || '-'}\n\n💬 Detay: ${item.magdur_ilce || '-'}`;
                          navigator.clipboard.writeText(metin).then(() => {
                            const btn = event.currentTarget;
                            btn.style.background = `${C.success}33`;
                            setTimeout(() => { btn.style.background = `${C.cyan}18`; }, 1500);
                          }).catch(() => alert(metin));
                        }}>
                          <LIcon name="Copy" size={12} color={C.cyan}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ALT BAR: SAYFALAMA & TOPLU İŞLEM */}
        {data.length > 0 && (
          <div style={{padding:'12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            {/* TOPLU İŞLEM */}
            <div style={{display:'flex', gap:6, alignItems:'center'}}>
              <select value={topluIslem} onChange={e => setTopluIslem(e.target.value)}
                style={{...S.select, width:200, fontSize:10, padding:'6px 10px'}}>
                <option value="">TOPLU İŞLEM SEÇİNİZ</option>
                <option value="alindi">SEÇİLENLERİ ALINDI YAP</option>
                <option value="olumsuz">SEÇİLENLERİ OLUMSUZ YAP</option>
                <option value="belirsiz">SEÇİLENLERİ BELİRSİZ YAP</option>
                <option value="sil">SEÇİLENLERİ SİL</option>
              </select>
              <button style={{...S.btn, ...S.btnP, fontSize:10, padding:'6px 14px'}}
                onClick={topluIslemUygula} disabled={secili.length === 0 || !topluIslem}>
                UYGULA ({secili.length})
              </button>
            </div>

            {/* SAYFALAMA */}
            <div style={{display:'flex', alignItems:'center', gap:4}}>
              <button disabled={sayfa <= 1} onClick={() => setSayfa(1)}
                style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: sayfa <= 1 ? 0.4 : 1}}>&laquo;</button>
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
              <button disabled={sayfa >= toplamSayfa} onClick={() => setSayfa(toplamSayfa)}
                style={{...S.btn, ...S.btnG, fontSize:10, padding:'4px 8px', opacity: sayfa >= toplamSayfa ? 0.4 : 1}}>&raquo;</button>

              <span style={{fontSize:9, color:C.textMuted, marginLeft:6}}>{toplamKayit} KAYITTAN {Math.min((sayfa-1)*100+1, toplamKayit)}-{Math.min(sayfa*100, toplamKayit)} GÖSTERİLİYOR (SAYFA {sayfa}/{toplamSayfa})</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ NOT MODAL ═══ */}
      <Modal open={!!notModal} onClose={() => setNotModal(null)} title={'GÖRÜŞME NOTLARI' + (notModal ? ' - ' + notModal.magdur_ad_soyad : '')} width="580px">
        {notModal && (
          <div>
            {/* MEVCUT NOTLAR */}
            {notlar.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:1, marginBottom:8}}>
                  <LIcon name="MessageSquare" size={12} color={C.accent}/> MEVCUT NOTLAR
                </div>
                <div style={{maxHeight:200, overflowY:'auto'}}>
                  {notlar.map((n, i) => (
                    <div key={n.id || i} style={{
                      background:`${C.accent}08`, border:`1px solid ${C.border}`,
                      borderRadius:10, padding:12, marginBottom:6
                    }}>
                      {n.gorusme_durumu && (
                        <span style={{...durumChip(n.gorusme_durumu === 'OLUMLU' ? 'Alindi' : n.gorusme_durumu === 'OLUMSUZ' ? 'Olumsuz' : 'Belirsiz'), marginBottom:6, display:'inline-flex'}}>
                          {n.gorusme_durumu}
                        </span>
                      )}
                      <div style={{fontSize:12, lineHeight:1.6, marginBottom:6}}>{n.not_text}</div>
                      <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:C.textMuted}}>
                        <span>{n.ekleyen_adi || 'SİSTEM'}</span>
                        <span>{MR.tarihFmt ? MR.tarihFmt(n.created_at) : (n.created_at || '-')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YENİ NOT */}
            <div style={{fontSize:10, fontWeight:700, color:C.success, letterSpacing:1, marginBottom:10}}>
              <LIcon name="Plus" size={12} color={C.success}/> YENİ NOT EKLE
            </div>

            <div style={{marginBottom:12}}>
              <FormGroup label="GÖRÜŞME SONUCU">
                <select style={{...S.select, fontSize:11}} value={notDurum} onChange={e => setNotDurum(e.target.value)}>
                  <option value="">SEÇİNİZ</option>
                  {GORUSME_SONUCLARI.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormGroup>
            </div>

            <div style={{marginBottom:12}}>
              <FormGroup label="GÖRÜŞME NOTU *">
                <textarea style={{...S.input, minHeight:80}} value={notText} onChange={e => setNotText(e.target.value)}
                  placeholder="GÖRÜŞME DETAYLARINI YAZINIZ..."/>
              </FormGroup>
            </div>

            <div style={{marginBottom:12}}>
              <FormGroup label="SONRAKİ ARAMA TARİHİ (OPSİYONEL)">
                <input type="datetime-local" style={{...S.input, fontSize:11}} value={notSonraki} onChange={e => setNotSonraki(e.target.value)}/>
              </FormGroup>
            </div>

            <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button style={{...S.btn, ...S.btnG}} onClick={() => setNotModal(null)}>İPTAL</button>
              <button style={{...S.btn, ...S.btnS}} onClick={notKaydet} disabled={notLoading || !notText.trim()}>
                <LIcon name="Save" size={14} color="#fff"/> {notLoading ? 'KAYDEDİLİYOR...' : 'NOTU KAYDET'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ OTOMATİK ARAMA LİSTELERİ MODAL ═══ */}
      <Modal open={autocallModal} onClose={() => {setAutocallModal(false); setAutocallRapor(null);}} title="OTOMATİK ARAMA LİSTELERİ (NETGSM)" width="680px">
        {autocallLoading ? <Loading/> : (
          <div>
            {autocallListeler.length === 0 ? (
              <EmptyState icon="PhoneOutgoing" title="OTOMATİK ARAMA LİSTESİ YOK" desc="Excel yükleyip 'Otomatik Arama Başlat' butonunu kullanarak yeni liste oluşturabilirsiniz."/>
            ) : (
              <div style={{maxHeight:400, overflowY:'auto'}}>
                {autocallListeler.map((liste, i) => (
                  <div key={liste.list_id || i} style={{
                    background:`${C.accent}08`, border:`1px solid ${C.border}`,
                    borderRadius:10, padding:14, marginBottom:8
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                      <div>
                        <span style={{fontWeight:700, fontSize:13, color:C.text}}>{liste.list_name || 'LİSTE #' + (liste.list_id || i)}</span>
                        {liste.list_id && <span style={{fontSize:10, color:C.textMuted, marginLeft:8}}>ID: {liste.list_id}</span>}
                      </div>
                      <div style={{display:'flex', gap:4}}>
                        <button style={{...S.btn, ...S.btnMini, ...S.btnMiniP}} onClick={() => autocallRaporAl(liste.list_id)}>
                          <LIcon name="BarChart3" size={10} color="#fff"/> RAPOR
                        </button>
                        <button style={{...S.btn, ...S.btnMini, ...S.btnMiniD}} onClick={() => autocallDurdur(liste.list_id)}>
                          <LIcon name="Square" size={10} color="#fff"/> DURDUR
                        </button>
                      </div>
                    </div>
                    {liste.status && <span style={{fontSize:10, color:C.textMuted}}>DURUM: {liste.status}</span>}
                    {liste.total_phones && <span style={{fontSize:10, color:C.textMuted, marginLeft:12}}>NUMARA: {liste.total_phones}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* RAPOR SONUÇLARI */}
            {autocallRapor && (
              <div style={{marginTop:16, padding:14, background:`${C.success}08`, border:`1px solid ${C.success}25`, borderRadius:10}}>
                <div style={{fontSize:12, fontWeight:700, color:C.success, marginBottom:8}}>
                  <LIcon name="BarChart3" size={14} color={C.success}/> ARAMA RAPORU
                </div>
                <pre style={{fontSize:11, color:C.text, whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:200, overflowY:'auto'}}>
                  {typeof autocallRapor === 'object' ? JSON.stringify(autocallRapor, null, 2) : String(autocallRapor)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* YENİ KAYIT MODAL */}
      <Modal open={yeniModal} onClose={() => {setYeniModal(false); setDuzenleId(null);}} title={duzenleId ? "KAYIT DÜZENLE" : "YENİ KAYIT EKLE"} width="520px">
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10}}>
          <FormGroup label="AD SOYAD *">
            <input style={{...S.input, padding:'8px 10px', fontSize:12}} value={yeniForm.magdur_ad_soyad} onChange={e => yF('magdur_ad_soyad', e.target.value.toUpperCase())} placeholder="AD SOYAD"/>
          </FormGroup>
          <FormGroup label="TC KİMLİK">
            <input style={{...S.input, padding:'8px 10px', fontSize:12}} value={yeniForm.magdur_tc} onChange={e => yF('magdur_tc', e.target.value.replace(/\D/g,''))} placeholder="TC KİMLİK" maxLength={11}/>
          </FormGroup>
          <FormGroup label="TELEFON *">
            <input style={{...S.input, padding:'8px 10px', fontSize:12}} value={yeniForm.magdur_telefon} onChange={e => yF('magdur_telefon', e.target.value)} placeholder="05XX XXX XX XX"/>
          </FormGroup>
          <FormGroup label="İL">
            <select style={{...S.select, padding:'8px 10px', fontSize:12}} value={yeniForm.magdur_il} onChange={e => yF('magdur_il', e.target.value)}>
              <option value="">İL SEÇİNİZ</option>
              {(ILLER || []).map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="TÜR">
            <div style={{display:'flex', gap:4}}>
              {['TEK TARAFLI','ÇİFT TARAFLI'].map(t => (
                <button key={t} type="button" onClick={() => yF('kaza_turu', t)}
                  style={{flex:1, padding:'7px 4px', borderRadius:6, fontSize:10, fontWeight:700, cursor:'pointer',
                    background: yeniForm.kaza_turu===t ? `${C.accent}` : 'transparent',
                    color: yeniForm.kaza_turu===t ? '#fff' : C.textSec,
                    border:`1px solid ${yeniForm.kaza_turu===t ? C.accent : C.border}`}}>
                  {t}
                </button>
              ))}
            </div>
          </FormGroup>
          <FormGroup label="DETAY">
            <input style={{...S.input, padding:'8px 10px', fontSize:12}} value={yeniForm.magdur_ilce} onChange={e => yF('magdur_ilce', e.target.value.toUpperCase())} placeholder="İLÇE / DETAY BİLGİ"/>
          </FormGroup>
        </div>
        <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
          <button style={{...S.btn, ...S.btnG}} onClick={() => setYeniModal(false)}>İPTAL</button>
          <button style={{...S.btn, ...S.btnS}} onClick={yeniKaydet} disabled={yeniLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {yeniLoading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
          </button>
        </div>
      </Modal>

      {/* DURUM DEĞİŞTİR DROPDOWN - TABLO DIŞINDA */}
      {durumDropId && (
        <div>
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:9998}} onClick={() => setDurumDropId(null)}/>
          <div style={{position:'fixed',top:durumDropPos.top,left:durumDropPos.left,zIndex:9999,background:isKoyu?'#1e293b':'#fff',border:`1px solid ${C.border}`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.25)',padding:4,minWidth:130}}>
            {[{v:'Belirsiz',l:'BELİRSİZ',c:C.warning},{v:'Alindi',l:'ALINDI',c:C.success},{v:'Olumsuz',l:'OLUMSUZ',c:C.danger}].map(d => (
              <div key={d.v} onClick={() => durumDegistir(durumDropId, d.v)}
                style={{padding:'8px 12px',fontSize:11,fontWeight:600,cursor:'pointer',borderRadius:4,color:d.c}}
                onMouseEnter={e=>e.currentTarget.style.background=`${d.c}15`}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {d.l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KİŞİ DETAY MODAL - TAM DETAY */}
      <Modal open={!!detayModal} onClose={() => setDetayModal(null)} title={'KİŞİ DETAY' + (detayModal ? ' - ' + (detayModal.magdur_ad_soyad || '') : '')} width="780px">
        {detayModal && (
          <div>
            {/* HEADER */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, padding:'10px 14px', background:isKoyu?'rgba(15,35,66,0.5)':'#f0f4ff', borderRadius:10, border:isKoyu?'1px solid rgba(6,182,212,0.2)':'1px solid #dbeafe'}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{width:42,height:42,borderRadius:10,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <LIcon name="User" size={20} color={C.accent}/>
                </div>
                <div>
                  <div style={{fontSize:16, fontWeight:800}}>{detayModal.magdur_ad_soyad || '-'}</div>
                  <div style={{fontSize:11, color:C.textMuted, display:'flex', gap:8, alignItems:'center', marginTop:2}}>
                    <span style={{fontFamily:'monospace'}}>{detayModal.magdur_telefon || '-'}</span>
                    {detayModal.kaza_turu && <Badge text={detayModal.kaza_turu} color={detayModal.kaza_turu?.includes('ÇİFT') ? C.accent : C.purple}/>}
                    <span style={{...durumChip(detayModal.durum), fontSize:9}}>{durumLabels[detayModal.durum] || 'BELİRSİZ'}</span>
                  </div>
                </div>
              </div>
              <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
                {hy('crm-ara') && detayModal.magdur_telefon && <button style={{...S.btn, background:C.success, color:'#fff', fontSize:10, padding:'6px 12px', borderRadius:6}} onClick={() => { setDetayModal(null); aramaYap(detayModal); }}>
                  <LIcon name="Phone" size={12} color="#fff"/> ARA
                </button>}
                {hy('crm-duzenle') && <button style={{...S.btn, background:`${C.warning}18`, color:C.warning, fontSize:10, padding:'6px 12px', borderRadius:6, border:`1px solid ${C.warning}33`}} onClick={() => { setDetayModal(null); setYeniForm({magdur_ad_soyad:detayModal.magdur_ad_soyad||'', magdur_tc:detayModal.magdur_tc||'', magdur_telefon:detayModal.magdur_telefon||'', magdur_il:detayModal.magdur_il||'', kaza_turu:detayModal.kaza_turu||'', magdur_ilce:detayModal.magdur_ilce||''}); setDuzenleId(detayModal.id); setYeniModal(true); }}>
                  <LIcon name="Edit3" size={12} color={C.warning}/> DÜZENLE
                </button>}
                {hy('crm-sil') && <button style={{...S.btn, background:`${C.danger}18`, color:C.danger, fontSize:10, padding:'6px 12px', borderRadius:6, border:`1px solid ${C.danger}33`}} onClick={() => { setSecili([detayModal.id]); setSilConfirm(true); setDetayModal(null); }}>
                  <LIcon name="Trash2" size={12} color={C.danger}/> SİL
                </button>}
                <button style={{...S.btn, background:`${C.cyan}18`, color:C.cyan, fontSize:10, padding:'6px 12px', borderRadius:6, border:`1px solid ${C.cyan}33`}} onClick={() => {
                  const d = detayModal;
                  const tarih = d.yonlendirme_tarihi ? (MR.tarihFmt ? MR.tarihFmt(d.yonlendirme_tarihi) : d.yonlendirme_tarihi) : '-';
                  const metin = `📋 SAHA GÖREVİ\n\n📌 Dosya Türü: ${d.kaza_turu || 'ADK'}\n👤 Ad Soyad: ${d.magdur_ad_soyad || '-'}\n📅 Kaza Tarihi: ${tarih}\n📞 Telefon: ${d.magdur_telefon || '-'}\n📍 İl: ${d.magdur_il || '-'}\n🆔 TC: ${d.magdur_tc || '-'}\n\n💬 Detay: ${d.magdur_ilce || '-'}`;
                  navigator.clipboard.writeText(metin).then(() => alert('PANOYA KOPYALANDI')).catch(() => alert(metin));
                }}>
                  <LIcon name="Copy" size={12} color={C.cyan}/> SAHAYA AKTAR
                </button>
              </div>
            </div>

            {/* İÇERİK: BİLGİLER + NOTLAR YAN YANA */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              {/* SOL: KİŞİ BİLGİLERİ */}
              <div style={{padding:12, background:isKoyu?'rgba(15,35,66,0.3)':'#fafbfc', borderRadius:8, border:isKoyu?'1px solid rgba(6,182,212,0.15)':'1px solid #e5e7eb'}}>
                <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:0.5, marginBottom:8}}>
                  <LIcon name="Info" size={11} color={C.accent}/> KİŞİ BİLGİLERİ
                </div>
                {[
                  {l:'AD SOYAD', v:detayModal.magdur_ad_soyad, b:true},
                  {l:'TC KİMLİK', v:detayModal.magdur_tc, mono:true},
                  {l:'TELEFON', v:detayModal.magdur_telefon, mono:true},
                  {l:'İL', v:detayModal.magdur_il},
                  {l:'TÜR', v:detayModal.kaza_turu},
                  {l:'DETAY', v:detayModal.magdur_ilce},
                  {l:'YÖNLENDİREN', v:detayModal.yonlendiren},
                  {l:'TARİH', v:detayModal.yonlendirme_tarihi ? (MR.tarihFmt ? MR.tarihFmt(detayModal.yonlendirme_tarihi) : detayModal.yonlendirme_tarihi) : '-'},
                  {l:'DURUM', v:durumLabels[detayModal.durum] || 'BELİRSİZ', c:durumRenk(detayModal.durum)},
                  {l:'SON DURUM', v:detayModal.son_durum, c:sonucRenk(detayModal.son_durum)}
                ].map((r,i) => (
                  <div key={i} style={{display:'flex', alignItems:'baseline', padding:'4px 0', borderBottom:`1px solid ${isKoyu?'rgba(255,255,255,0.05)':'#f0f0f0'}`, gap:6}}>
                    <span style={{fontSize:10, fontWeight:600, color:isKoyu?'#94a3b8':'#6b7280', whiteSpace:'nowrap'}}>{r.l}</span>
                    <span style={{flex:1, borderBottom:`1px dotted ${isKoyu?'rgba(255,255,255,0.08)':'#e5e7eb'}`, minWidth:20, height:1, alignSelf:'center'}}/>
                    <span style={{fontSize:11, fontWeight:r.b?800:600, color:r.c||(isKoyu?'#e2e8f0':'#1e293b'), fontFamily:r.mono?'monospace':'inherit'}}>{r.v || '-'}</span>
                  </div>
                ))}

                {/* DURUM DEĞİŞTİR */}
                {hy('crm-durum-degistir') && (
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:10, fontWeight:600, color:C.textMuted, marginBottom:4}}>DURUM DEĞİŞTİR</div>
                    <div style={{display:'flex', gap:4}}>
                      {[{v:'Belirsiz',l:'BELİRSİZ',c:C.warning},{v:'Alindi',l:'ALINDI',c:C.success},{v:'Olumsuz',l:'OLUMSUZ',c:C.danger}].map(d => (
                        <button key={d.v} onClick={async () => { await api.yonlendirmeUpdate({id:detayModal.id, durum:d.v}); setDetayModal({...detayModal, durum:d.v}); load(); }}
                          style={{flex:1, padding:'5px 4px', borderRadius:5, fontSize:9, fontWeight:700, cursor:'pointer',
                            background: detayModal.durum===d.v ? d.c : 'transparent',
                            color: detayModal.durum===d.v ? '#fff' : d.c,
                            border:`1px solid ${detayModal.durum===d.v ? d.c : d.c+'44'}`}}>
                          {d.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* GÖRÜŞME SONUCU SEÇİMİ */}
                <div style={{marginTop:10}}>
                  <FormGroup label="GÖRÜŞME SONUCU">
                    <select style={{...S.select, fontSize:10, padding:'6px 8px'}} value={detayModal.son_durum||''} onChange={async e => { const v = e.target.value; await api.yonlendirmeUpdate({id:detayModal.id, son_durum:v}); setDetayModal({...detayModal, son_durum:v}); load(); }}>
                      <option value="">SEÇİNİZ</option>
                      {GORUSME_SONUCLARI.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </FormGroup>
                </div>
              </div>

              {/* SAĞ: NOTLAR */}
              <div style={{padding:12, background:isKoyu?'rgba(15,35,66,0.3)':'#fafbfc', borderRadius:8, border:isKoyu?'1px solid rgba(6,182,212,0.15)':'1px solid #e5e7eb'}}>
                <div style={{fontSize:10, fontWeight:700, color:C.accent, letterSpacing:0.5, marginBottom:8}}>
                  <LIcon name="MessageSquare" size={11} color={C.accent}/> GÖRÜŞME NOTLARI ({notlar.length})
                </div>

                {/* YENİ NOT EKLE */}
                {hy('crm-not-ekle') && (
                  <div style={{marginBottom:10}}>
                    <textarea style={{...S.input, minHeight:50, fontSize:11, padding:'6px 8px', marginBottom:6}} value={notText} onChange={e => setNotText(e.target.value)} placeholder="YENİ NOT YAZIN..."/>
                    <button style={{...S.btn, ...S.btnS, fontSize:9, padding:'5px 12px', width:'100%', justifyContent:'center'}} disabled={notLoading || !notText.trim()} onClick={async () => {
                      if (!notText.trim()) return;
                      setNotLoading(true);
                      await api.yonlendirmeNotEkle({yonlendirme_id:detayModal.id, not_text:notText.trim(), gorusme_durumu:detayModal.son_durum||null});
                      setNotText('');
                      const r2 = await api.yonlendirmeGet(detayModal.id);
                      if (r2?.success && r2.data?.notlar) setNotlar(r2.data.notlar);
                      setNotLoading(false);
                      load();
                    }}>
                      <LIcon name="Plus" size={11} color="#fff"/> {notLoading ? 'KAYDEDİLİYOR...' : 'NOT EKLE'}
                    </button>
                  </div>
                )}

                {/* MEVCUT NOTLAR */}
                {notlar.length > 0 ? (
                  <div style={{maxHeight:250, overflowY:'auto'}}>
                    {notlar.map((n, i) => (
                      <div key={n.id || i} style={{background:isKoyu?'rgba(15,35,66,0.4)':`${C.accent}06`, border:`1px solid ${C.border}`, borderRadius:8, padding:8, marginBottom:5}}>
                        {n.gorusme_durumu && <span style={{padding:'2px 6px', borderRadius:4, fontSize:8, fontWeight:700, background:`${sonucRenk(n.gorusme_durumu)}18`, color:sonucRenk(n.gorusme_durumu), display:'inline-block', marginBottom:4}}>{n.gorusme_durumu}</span>}
                        <div style={{fontSize:11, lineHeight:1.5}}>{n.not_text}</div>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:9, color:C.textMuted, marginTop:4}}>
                          <span>{n.ekleyen_adi || 'SİSTEM'}</span>
                          <span>{MR.tarihFmt ? MR.tarihFmt(n.created_at) : (n.created_at || '-')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{fontSize:10, color:C.textMuted, textAlign:'center', padding:16}}>HENÜZ NOT EKLENMEMİŞ</div>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* SİL ONAY */}
      <Confirm open={silConfirm} message={`${secili.length} KAYDI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ.`}
        onConfirm={topluSil} onCancel={() => setSilConfirm(false)}/>
    </div>
  );
};
