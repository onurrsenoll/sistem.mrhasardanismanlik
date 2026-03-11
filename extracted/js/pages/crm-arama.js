const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useMemo, useRef} = React;

/* ═══════════════════════════════════════════
   CRM ARAMA LİSTESİ / YÖNLENDİRME TAKİP
   EXCEL YÜKLEME + ARAMA TAKİP + TOPLU İŞLEM
   ═══════════════════════════════════════════ */
MR.CrmAramaPage = ({setPage, user}) => {
  const {C, S, LIcon, Badge, StatCard, Loading, EmptyState, Modal, FormGroup, Confirm, api, ILLER} = MR;

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

  /* SİL ONAY */
  const [silConfirm, setSilConfirm] = useState(false);

  const durumlar = ['', 'Belirsiz', 'Alindi', 'Olumsuz'];
  const durumLabels = {'': 'HEPSİ', 'Belirsiz': 'BELİRSİZ', 'Alindi': 'ALINDI', 'Olumsuz': 'OLUMSUZ'};
  const durumRenk = d => d === 'Alindi' ? C.success : d === 'Olumsuz' ? C.danger : C.warning;
  const nedenler = ['BAŞKA FİRMA İLE ANLAŞTI', 'İLGİLENMİYOR', 'TELEFON KAPALI / ULAŞILAMADI', 'MADDİ HASAR DÜŞÜK', 'ZAMAN AŞIMI', 'DİĞER'];

  /* ── VERİ YÜKLEME ── */
  const load = useCallback(async () => {
    setLoading(true);
    const p = {page: sayfa, limit: 50};
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
        magdur_ilce: get('MAĞDUR İLÇE', 'MAGDUR ILCE', 'İLÇE', 'ILCE'),
        magdur_tc: get('MAĞDUR TC', 'MAGDUR TC', 'TC', 'TC KİMLİK', 'TC KIMLIK', 'TCKIMLIK')
      };
    };

    const kayitlar = excelData.map(colMap).filter(r => r.magdur_ad_soyad || r.magdur_telefon);
    if (kayitlar.length === 0) {
      setExcelMsg('GEÇERLİ KAYIT BULUNAMADI. KOLON BAŞLIKLARINI KONTROL EDİN.');
      setExcelLoading(false);
      return;
    }

    const batch_id = 'B' + Date.now();
    const r = await api.yonlendirmeImport({kayitlar, batch_id});
    setExcelLoading(false);
    if (r?.success) {
      setExcelMsg(r.data?.count + ' KAYIT BAŞARIYLA YÜKLENDİ');
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
      ['YÖNLENDİREN', 'YÖNLENDİRME TARİHİ', 'KAZA TÜRÜ', 'MAĞDUR AD SOYAD', 'MAĞDUR TELEFON', 'MAĞDUR İL', 'MAĞDUR İLÇE', 'MAĞDUR TC'],
      ['ÖRNEK KİŞİ', '2026-02-13', 'ÇİFT TARAFLI', 'MEHMET DEMİR', '05321234567', 'İSTANBUL', 'KADIKÖY', '12345678901']
    ]);
    ws['!cols'] = [{wch:18},{wch:18},{wch:16},{wch:22},{wch:16},{wch:14},{wch:14},{wch:14}];
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
    if (MR.webrtcAra) {
      MR.webrtcAra(item.magdur_telefon, {ad: item.magdur_ad_soyad || ''});
      setAramaMsg('WEBRTC ARAMA BAŞLATILIYOR...');
      setAramaAktif(item.id);
      setTimeout(() => { setAramaMsg(''); setAramaAktif(null); }, 4000);
    } else {
      setAramaMsg('ARAMA SİSTEMİ DEVRE DIŞI');
      setTimeout(() => { setAramaMsg(''); }, 3000);
    }
  };

  /* ── STİLLER ── */
  const thSt = {padding:'10px 8px', textAlign:'left', color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted, fontWeight:800, fontSize:11, borderBottom:`2px solid ${C.border}`, whiteSpace:'nowrap', position:'sticky', top:0, background:C.bgCard, zIndex:1, letterSpacing:0.3};
  const tdSt = {padding:'8px 8px', fontSize:12, fontWeight:600, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap', color: MR.tema==='koyu' ? '#cbd5e1' : C.text};
  const iconBtn = (bg) => ({
    width:26, height:26, borderRadius:6, border:'none', cursor:'pointer',
    display:'inline-flex', alignItems:'center', justifyContent:'center',
    background:`${bg}18`, transition:'all .2s'
  });
  const durumChip = (d) => {
    const c = durumRenk(d);
    return {
      padding:'3px 8px', borderRadius:6, fontSize:9, fontWeight:700,
      display:'inline-flex', alignItems:'center', gap:4,
      background:`${c}18`, color:c
    };
  };

  /* ── RENDER ── */
  return (
    <div className="fade-in">

      {/* ═══ İSTATİSTİK KARTLARI ═══ */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16}}>
        <StatCard icon="Users" label="TOPLAM YÖNLENDİRME" value={stats.toplam} color={C.accent}/>
        <StatCard icon="Clock" label="BELİRSİZ" value={stats.belirsiz} color={C.warning}/>
        <StatCard icon="Check" label="ALINDI" value={stats.alindi} color={C.success}/>
        <StatCard icon="X" label="OLUMSUZ" value={stats.olumsuz} color={C.danger}/>
        <StatCard icon="PhoneCall" label="BUGÜN ARANACAK" value={data.filter(d => d.sonraki_arama && new Date(d.sonraki_arama).toDateString() === new Date().toDateString()).length} color={C.cyan}/>
      </div>

      {/* ═══ EXCEL YÜKLEME & GÜNLÜK ÖZET ═══ */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>

        {/* EXCEL YÜKLEME */}
        <div style={S.card}>
          <div style={{...S.cardHead, padding:'10px 16px'}}>
            <LIcon name="FileSpreadsheet" size={14} color={C.accent}/>
            <span style={{fontSize:12, fontWeight:700}}>DATA YÜKLEME (EXCEL)</span>
          </div>
          <div style={{padding:16}}>
            <div onClick={() => fileRef.current?.click()} style={{
              border:`2px dashed ${C.borderLight}`, borderRadius:12, padding:24,
              textAlign:'center', cursor:'pointer', transition:'all .3s',
              background:`${C.accent}05`
            }}
              onMouseEnter={e => {e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = `${C.accent}10`;}}
              onMouseLeave={e => {e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = `${C.accent}05`;}}
              onDragOver={e => {e.preventDefault(); e.currentTarget.style.borderColor = C.accent;}}
              onDrop={e => {e.preventDefault(); e.currentTarget.style.borderColor = C.borderLight; if(e.dataTransfer.files[0]) {const dt = new DataTransfer(); dt.items.add(e.dataTransfer.files[0]); fileRef.current.files = dt.files; handleFileSelect({target:{files:e.dataTransfer.files}});}}}
            >
              <LIcon name="Upload" size={28} color={C.textMuted} style={{opacity:0.5, marginBottom:6}}/>
              <div style={{fontSize:12, fontWeight:700, color:C.textSec, marginBottom:4}}>EXCEL DOSYASI SÜRÜKLE VEYA TIKLA</div>
              <div style={{fontSize:10, color:C.textMuted}}>ŞABLON FORMATINDA .XLSX / .XLS / .CSV DOSYASI SEÇİN</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFileSelect}/>
            </div>
            <div style={{marginTop:12, display:'flex', gap:8, alignItems:'center', justifyContent:'space-between'}}>
              <button style={{...S.btn, ...S.btnP, fontSize:11, padding:'8px 14px'}} onClick={sablonIndir}>
                <LIcon name="Download" size={14} color="#fff"/> ŞABLON İNDİR
              </button>
              <button style={{...S.btn, ...S.btnS, fontSize:11, padding:'8px 14px'}} onClick={excelYukle}
                disabled={!excelData || excelLoading}>
                <LIcon name="Upload" size={14} color="#fff"/> {excelLoading ? 'YÜKLENİYOR...' : 'YÜKLE'}
              </button>
              <span style={{fontSize:10, color: excelMsg.includes('BAŞARI') ? C.success : excelMsg.includes('HATA') || excelMsg.includes('BOŞ') ? C.danger : C.textMuted}}>
                {excelFile ? excelFile.name + (excelMsg ? ' - ' + excelMsg : '') : 'DOSYA SEÇİLMEDİ'}
              </span>
            </div>
          </div>
        </div>

        {/* GÜNLÜK ARAMA ÖZETİ + OTOMATİK ARAMA */}
        <div style={S.card}>
          <div style={{...S.cardHead, padding:'10px 16px', justifyContent:'space-between'}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <LIcon name="BarChart3" size={14} color={C.accent}/>
              <span style={{fontSize:12, fontWeight:700}}>GÜNLÜK ARAMA ÖZETİ</span>
            </div>
            <div style={{display:'flex', gap:6}}>
              <button style={{...S.btn, ...S.btnS, fontSize:9, padding:'5px 10px'}}
                onClick={autocallBaslat} disabled={autocallLoading || data.length === 0}
                title="LİSTEDEKİ NUMARALARI OTOMATİK ARAMA LİSTESİ OLARAK NETGSM'E GÖNDER">
                <LIcon name="PhoneOutgoing" size={12} color="#fff"/>
                {autocallLoading ? 'GÖNDERİLİYOR...' : 'OTOMATİK ARAMA BAŞLAT'}
              </button>
              <button style={{...S.btn, ...S.btnG, fontSize:9, padding:'5px 10px'}}
                onClick={autocallListeleriYukle} title="OTOMATİK ARAMA LİSTELERİ VE RAPORLARI">
                <LIcon name="List" size={12} color={C.textSec}/>
                LİSTELER
              </button>
            </div>
          </div>
          {/* OTOMATİK ARAMA MESAJI */}
          {autocallMsg.text && (
            <div style={{padding:'8px 16px', background: autocallMsg.type === 'success' ? `${C.success}12` : `${C.danger}12`, fontSize:11, fontWeight:600, color: autocallMsg.type === 'success' ? C.success : C.danger, display:'flex', alignItems:'center', gap:6}}>
              <LIcon name={autocallMsg.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={14} color={autocallMsg.type === 'success' ? C.success : C.danger}/> {autocallMsg.text}
            </div>
          )}
          <div style={{padding:16}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              {[
                {label:'BUGÜN ARANAN', value: data.filter(d => d.gorusme_tarihi && new Date(d.gorusme_tarihi).toDateString() === new Date().toDateString()).length, c:C.accent},
                {label:'OLUMLU SONUÇ', value: data.filter(d => d.durum === 'Alindi' && d.gorusme_tarihi && new Date(d.gorusme_tarihi).toDateString() === new Date().toDateString()).length, c:C.success},
                {label:'TAKİP GEREKLİ', value: data.filter(d => d.durum === 'Belirsiz').length, c:C.warning},
                {label:'ULAŞILAMADI', value: data.filter(d => d.alinmama_nedeni && d.alinmama_nedeni.includes('ULAŞILAMADI')).length, c:C.danger}
              ].map((item,i) => (
                <div key={i} style={{
                  background:`${item.c}0a`, border:`1px solid ${item.c}25`,
                  borderRadius:10, padding:14, textAlign:'center'
                }}>
                  <div style={{fontSize:24, fontWeight:800, color:item.c}}>{item.value}</div>
                  <div style={{fontSize:10, color:C.textMuted, marginTop:4}}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ANA LİSTE KARTI ═══ */}
      <div style={S.card}>
        {/* BAŞLIK */}
        <div style={{...S.cardHead, justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <LIcon name="PhoneCall" size={14} color={C.accent}/>
            <span style={{fontSize:13, fontWeight:700}}>YÖNLENDİRME / ARAMA LİSTESİ</span>
            <Badge text={toplamKayit + ' KAYIT'} color={C.accent}/>
          </div>
          <div style={{display:'flex', gap:6, alignItems:'center'}}>
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
          <div style={{overflowX:'auto', maxHeight:'calc(100vh - 520px)'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:10, minWidth:1300}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  <th style={{...thSt, width:30}}><input type="checkbox" checked={secili.length === data.length && data.length > 0} onChange={toggleAll}/></th>
                  <th style={thSt}>NO</th>
                  <th style={thSt}>YÖNLENDİREN</th>
                  <th style={thSt}>YÖN. TARİHİ</th>
                  <th style={thSt}>KAZA TÜRÜ</th>
                  <th style={thSt}>MAĞDUR AD SOYAD</th>
                  <th style={thSt}>MAĞDUR TELEFON</th>
                  <th style={thSt}>İL</th>
                  <th style={thSt}>İLÇE</th>
                  <th style={thSt}>GÖRÜŞME TARİHİ</th>
                  <th style={thSt}>DURUM</th>
                  <th style={thSt}>ALINMAMA NEDENİ</th>
                  <th style={thSt}>SON DURUM</th>
                  <th style={thSt}>TC</th>
                  <th style={{...thSt, textAlign:'center'}}>İŞLEMLER</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={item.id} style={{
                    background: secili.includes(item.id) ? `${C.accent}0a` : i % 2 === 1 ? `${C.bgHover}66` : 'transparent',
                    transition:'background .15s'
                  }}
                    onMouseEnter={e => {if(!secili.includes(item.id)) e.currentTarget.style.background=`${C.accent}08`;}}
                    onMouseLeave={e => {if(!secili.includes(item.id)) e.currentTarget.style.background = i%2===1?`${C.bgHover}66`:'transparent';}}
                  >
                    <td style={tdSt}><input type="checkbox" checked={secili.includes(item.id)} onChange={() => toggleSecili(item.id)}/></td>
                    <td style={{...tdSt, fontWeight:700, color:C.accent}}>{item.sira_no || item.id}</td>
                    <td style={tdSt}>{item.yonlendiren || '-'}</td>
                    <td style={{...tdSt, color:C.textMuted}}>{item.yonlendirme_tarihi || '-'}</td>
                    <td style={tdSt}>
                      {item.kaza_turu ? (
                        <Badge text={item.kaza_turu} color={item.kaza_turu?.includes('ÇİFT') ? C.accent : C.purple}/>
                      ) : '-'}
                    </td>
                    <td style={{...tdSt, fontWeight:600}}>{item.magdur_ad_soyad || '-'}</td>
                    <td style={tdSt}>{item.magdur_telefon || '-'}</td>
                    <td style={tdSt}>{item.magdur_il || '-'}</td>
                    <td style={tdSt}>{item.magdur_ilce || '-'}</td>
                    <td style={{...tdSt, color:C.textMuted}}>{item.gorusme_tarihi || '-'}</td>
                    <td style={tdSt}>
                      <span style={durumChip(item.durum)}>
                        {item.durum === 'Alindi' ? '\u2714' : item.durum === 'Olumsuz' ? '\u2716' : '\u25CF'}{' '}
                        {durumLabels[item.durum] || 'BELİRSİZ'}
                      </span>
                    </td>
                    <td style={{...tdSt, color:C.danger, fontSize:9, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis'}}>{item.alinmama_nedeni || '-'}</td>
                    <td style={tdSt}>
                      {item.son_durum ? (
                        <span style={{
                          padding:'2px 6px', borderRadius:4, fontSize:8, fontWeight:600,
                          background: item.son_durum?.includes('DOSYA') || item.son_durum?.includes('CRM') ? `${C.accent}18` : item.son_durum?.includes('ALINDI') || item.son_durum?.includes('SÖZLEŞME') ? `${C.success}18` : `${C.warning}18`,
                          color: item.son_durum?.includes('DOSYA') || item.son_durum?.includes('CRM') ? C.accent : item.son_durum?.includes('ALINDI') || item.son_durum?.includes('SÖZLEŞME') ? C.success : C.warning
                        }}>{item.son_durum}</span>
                      ) : '-'}
                    </td>
                    <td style={{...tdSt, color:C.textMuted, fontFamily:'monospace', fontSize:9}}>{item.magdur_tc || '-'}</td>
                    <td style={{...tdSt, textAlign:'center'}}>
                      <div style={{display:'flex', gap:3, justifyContent:'center'}}>
                        <button style={iconBtn(C.cyan)} title="NOT EKLE / GÖRÜNTÜLE" onClick={() => openNot(item)}>
                          <LIcon name="MessageSquare" size={12} color={C.cyan}/>
                        </button>
                        <button style={{
                          ...iconBtn(aramaAktif === item.id ? C.accent : C.success),
                          background: aramaAktif === item.id ? `${C.accent}33` : `${C.success}18`,
                          minWidth: aramaAktif === item.id ? 60 : 26
                        }} title="GİDEN ARAMA YAP" onClick={() => aramaYap(item)}
                          disabled={aramaAktif === item.id}>
                          <LIcon name={aramaAktif === item.id ? 'PhoneCall' : 'Phone'} size={12}
                            color={aramaAktif === item.id ? C.accent : C.success}/>
                          {aramaAktif === item.id && <span style={{fontSize:8, color:C.accent, fontWeight:700}}>ARANIYOR</span>}
                        </button>
                        <button style={{...iconBtn(item.donusen_crm_id ? C.success : C.warning), opacity: aktarimLoading === item.id ? 0.5 : 1}} title={item.donusen_crm_id ? 'CRM\'E AKTARILDI' : 'CRM\'E AKTAR'} onClick={() => crmAktar(item)} disabled={!!item.donusen_crm_id || aktarimLoading === item.id}>
                          <LIcon name={item.donusen_crm_id ? 'CheckCircle' : 'UserPlus'} size={12} color={item.donusen_crm_id ? C.success : C.warning}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

              <span style={{fontSize:9, color:C.textMuted, marginLeft:6}}>SAYFA {sayfa} / {toplamSayfa} ({toplamKayit} KAYIT)</span>
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
                        <span>{n.created_at || '-'}</span>
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
              <div style={{fontSize:10, fontWeight:600, color:C.textSec, marginBottom:6}}>GÖRÜŞME DURUMU</div>
              <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                {[
                  {val:'OLUMLU', icon:'Check', c:C.success},
                  {val:'TAKİPTE', icon:'Clock', c:C.warning},
                  {val:'OLUMSUZ', icon:'X', c:C.danger},
                  {val:'ULAŞILAMADI', icon:'PhoneOff', c:C.textSec}
                ].map(d => (
                  <button key={d.val} onClick={() => setNotDurum(notDurum === d.val ? '' : d.val)}
                    style={{
                      ...S.btn, fontSize:10, padding:'7px 12px', borderRadius:8,
                      background: notDurum === d.val ? d.c : `${d.c}12`,
                      border:`1px solid ${d.c}${notDurum === d.val ? '' : '33'}`,
                      color: notDurum === d.val ? '#fff' : d.c
                    }}>
                    <LIcon name={d.icon} size={12} color={notDurum === d.val ? '#fff' : d.c}/> {d.val}
                  </button>
                ))}
              </div>
            </div>

            {(notDurum === 'OLUMSUZ' || notDurum === 'ULAŞILAMADI') && (
              <div style={{marginBottom:12}}>
                <FormGroup label="ALINMAMA NEDENİ">
                  <select style={{...S.select, fontSize:11}} value={notNeden} onChange={e => setNotNeden(e.target.value)}>
                    <option value="">SEÇİNİZ (İSTEĞE BAĞLI)</option>
                    {nedenler.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </FormGroup>
              </div>
            )}

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

      {/* SİL ONAY */}
      <Confirm open={silConfirm} message={`${secili.length} KAYDI SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ.`}
        onConfirm={topluSil} onCancel={() => setSilConfirm(false)}/>
    </div>
  );
};
