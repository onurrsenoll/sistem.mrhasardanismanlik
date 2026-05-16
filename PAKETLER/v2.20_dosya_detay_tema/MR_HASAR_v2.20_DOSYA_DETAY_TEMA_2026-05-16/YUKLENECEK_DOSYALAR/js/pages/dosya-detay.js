/**
 * MR HASAR DANIŞMANLIK — DOSYA DETAY (v2.20)
 * v2.20 değişiklikleri (sadece TEMA — alan listesi/sekme yapısı korundu):
 *   - DOSYA HEADER kartı zenginleştirildi:
 *     • Büyük dosya no + AÇIK badge + müşteri/sigorta/hasar alt satır
 *     • 4 bilgi kutusu: HASAR TARİHİ, OLUŞTURMA TARİHİ, DOSYA TÜRÜ, DOSYA SORUMLUSU
 *     • Butonlar grup (DÜZENLE/PORTAL/SİL) + aşama dropdown sağ kolon
 *   - BİLGİ sekmesi 2 sütundan 3 sütuna çıkarıldı:
 *     • SOL: DOSYA BİLGİLERİ (mevcut alanlar)
 *     • ORTA: MAĞDUR ARAÇ kart (plaka rozeti + marka logosu + araç bilgileri + araç sahibi) + KAZA BİLGİSİ vurgu kart
 *     • SAĞ: KARŞI TARAF ARAÇ (aynı yapı, BH'da gizli)
 *   - Yeni marka logo entegrasyonu: logo.clearbit.com üzerinden marka logoları
 *     otomatik çekilir (Lucide ikon fallback'i ile)
 *   - PlakaRozeti component'i (TR mavi/sarı stil)
 *   - AracGorsel component'i (marka logosu + marka/model/yıl banner)
 *
 * v2.19:
 * v2.19 değişiklikleri:
 *   - BİLGİ sekmesinden AVUKAT ÖDEME ORANI satırı kaldırıldı
 *   - BİLGİ sekmesinden FİNANSAL ÖZET bölümü kaldırıldı → DOSYA HESABI sekmesine taşındı
 *   - DOSYA HESABI sekmesi başına zenginleştirilmiş finansal özet (kart bazlı 4 metrik
 *     + %50-%50 paylaşım bloğu) eklendi
 *   - BİLGİ sekmesinin DOSYA BİLGİLERİ kart başlığı tema iyileştirildi
 *     (ikon arka planı, gradient çubuk, daha vurgulu tipografi)
 *
 * v2.18:
 * v2.18 değişiklikleri:
 *   - Mağdur'dan TAMAMEN kaldırıldı (3 ekrandan): E-Posta, Adres, İl, İlçe,
 *     Cinsiyet, Meslek, Telefon 2
 *   - DOSYA KAYNAĞI 5 sabit değer: SERVİS, KAPORTACI, ACENTE, PASİF TEMSİLCİ,
 *     DİĞER (OFİS CRM ve PAYDAŞ/YÖNLENDİREN KESINLIKLE kaldırıldı)
 *   - KARŞI ARAÇ POLİÇE NO kaldırıldı (görüntülemede)
 *   - BİLGİ sekmesi ZENGİNLEŞTİRİLDİ — tüm alanlar görüntülenir artık:
 *     PAYDAŞ, KAZA İLÇE, NOTER VEKALET, SORUMLU SİGORTA, EKSPER FİRMA,
 *     ONARIM SERVİSİ, BH SÜRÜCÜ + EHLİYET + KUSUR + SAKATLIK, IBAN,
 *     GELİR DURUMU, GELİR TUTARI, MAĞDUR ARAÇ PLAKA + KASKO,
 *     KARŞI ARAÇ PLAKA, NOTLAR
 *   - Mağdur Araç bölümü BH için de BİLGİ'de görüntülenir (önceden sadece düzenle)
 *
 * Önceki v2.17 değişiklikleri:
 * v2.17 değişiklikleri:
 *   - DOSYA KAYNAĞI dropdown'u 7 seçenek (OFİS CRM, SERVİS, KAPORTACI, ACENTE,
 *     PASİF TEMSİLCİ, DİĞER, PAYDAŞ/YÖNLENDİREN) — DOSYA YENİ ile uyumlu
 *   - NOTER VEKALET (TL) düzenlenebilir alan eklendi
 *   - BH dosyalarında MAĞDUR ARAÇ bölümü artık gözüküyor ve düzenlenebiliyor
 *     (önceden sadece ADK/MDK görünüyordu)
 *   - Karşı araç bölümü hala sadece ADK/MDK için (BH'da karşı araç kavramı yok)
 *
 * v2.14 değişiklikleri (v2.13 üzerine):
 *   - SİGORTA & EKSPER bölümünden POLİÇE NO, SİGORTA BRANŞI, SİGORTA TÜRÜ,
 *     DOSYA TALEP TÜRÜ kaldırıldı
 *   - KARŞI ARAÇ POLİÇE NO kaldırıldı
 *   - MAĞDUR bölümünden TELEFON 2, İL, İLÇE, CİNSİYET, MESLEK, E-POSTA kaldırıldı
 *   - VAR/YOK butonları kompakt (padding küçültüldü, gereksiz dikey alan kaldırıldı)
 *
 * v2.13: DOSYA BİLGİLERİ Düzenle modal'ı tüm alanları kapsayacak şekilde genişletildi:
 *   - Sigorta & Eksper bölümü (police_no, sigorta_brans, sigorta_turu, talep_turu,
 *     sorumlu_sigorta, eksper_firma — paydaş listesinden, onarim_servisi)
 *   - Mağdur ek alanlar (email, adres, cinsiyet, gelir_durumu, gelir_tutari)
 *   - BH özel: sakatlik_aciklama, surucu_ad, surucu_ehliyet, surucu_kusur
 *   - Mağdur araç ek (plaka, marka, model, yıl, kasko)
 *   - Karşı araç PLAKA
 *   - KAZA İLÇE cascade dropdown
 *   - DOSYA SORUMLUSU değişince personelin ADK/BH prim kartı anında gösterilir
 *     (dosya türüne göre aktif prim vurgulanır — hakediş hesaplaması zaten
 *     ay sonu rapor üzerinden sorumlu_id'ye otomatik bağlı, yeni bir entegrasyon
 *     gerekmez; bu kart sadece görsel feedback'tir)
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

/* MODUL-LEVEL INFO ROW - input focus-loss bug fix */
MR._DosyaDetayInfoRow = ({label, value, mono, bold, color}) => {
  const C = MR.C;
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid ' + C.border}}>
      <span style={{fontSize:10,color:C.textMuted,fontWeight:500,minWidth:90}}>{label}</span>
      <span style={{fontSize:11,fontWeight: bold ? 700 : 500, color: color || C.text, fontFamily: mono ? 'monospace' : 'inherit',textAlign:'right',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value || '-'}</span>
    </div>
  );
};

const ASAMALAR = MR.ASAMALAR || [];
/* v2.18: DOSYA KAYNAĞI tek standart — 5 değer (OFİS CRM ve PAYDAŞ/YÖNLENDİREN kaldırıldı) */
const KAYNAKLAR = ['SERVİS','KAPORTACI','ACENTE','PASİF TEMSİLCİ','DİĞER'];

/* v2.20: Marka adına göre Clearbit Logo API'den marka logosu URL'i üretir.
 * CORS uyumlu, anlık görüntülenir, ücretsiz tier. Yüklenemezse onError ile
 * fallback Lucide Car ikonu kullanılır.
 * Türkçe marka adlarını yaygın bilinen alan adlarına eşler. */
const MARKA_DOMAIN = {
  'VOLKSWAGEN':'volkswagen.com', 'VW':'volkswagen.com',
  'HYUNDAI':'hyundai.com',
  'TOYOTA':'toyota.com',
  'HONDA':'honda.com',
  'FORD':'ford.com',
  'MERCEDES':'mercedes-benz.com', 'MERCEDES-BENZ':'mercedes-benz.com',
  'BMW':'bmw.com',
  'AUDI':'audi.com',
  'OPEL':'opel.com',
  'PEUGEOT':'peugeot.com',
  'CITROEN':'citroen.com','CİTROEN':'citroen.com',
  'RENAULT':'renault.com',
  'FIAT':'fiat.com',
  'KIA':'kia.com',
  'NISSAN':'nissan.com',
  'MAZDA':'mazda.com',
  'MITSUBISHI':'mitsubishi-motors.com',
  'SKODA':'skoda-auto.com','ŠKODA':'skoda-auto.com',
  'SEAT':'seat.com','CUPRA':'cupra.com',
  'DACIA':'dacia.com',
  'VOLVO':'volvocars.com',
  'CHEVROLET':'chevrolet.com',
  'SUZUKI':'suzuki.com','SUBARU':'subaru.com',
  'LEXUS':'lexus.com',
  'MINI':'mini.com',
  'PORSCHE':'porsche.com',
  'JEEP':'jeep.com',
  'LAND ROVER':'landrover.com','RANGE ROVER':'landrover.com',
  'JAGUAR':'jaguar.com',
  'TESLA':'tesla.com',
  'TOFAS':'tofas.com.tr','TOFAŞ':'tofas.com.tr',
  'BMC':'bmc.com.tr','TEMSA':'temsa.com','OTOKAR':'otokar.com.tr','KARSAN':'karsan.com.tr',
  'IVECO':'iveco.com','MAN':'man.eu','SCANIA':'scania.com','DAF':'daf.com',
  'CHRYSLER':'chrysler.com','DODGE':'dodge.com','SSANGYONG':'ssangyong.com',
  'ISUZU':'isuzu.com','TATA':'tatamotors.com'
};
const aracLogoUrl = (marka) => {
  if (!marka) return null;
  const m = String(marka).toUpperCase().trim();
  const domain = MARKA_DOMAIN[m] || (m.toLowerCase().replace(/[^a-z0-9]/g,'') + '.com');
  return 'https://logo.clearbit.com/' + domain + '?size=128';
};

/* v2.20: TR plaka rozeti — sol mavi blok + plaka yazısı (tasarımdaki gibi) */
const PlakaRozeti = ({plaka, color}) => {
  if (!plaka) return null;
  const C = MR.C;
  return (
    <div style={{display:'inline-flex',border:`2px solid ${color || '#1a1a1a'}`,borderRadius:6,overflow:'hidden',height:30,boxShadow:'0 1px 3px rgba(0,0,0,0.15)'}}>
      <div style={{width:22,background:'#003399',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <span style={{fontSize:5,color:'#ffd700',lineHeight:1}}>★★★</span>
        <span style={{fontSize:6,fontWeight:900,color:'#fff',lineHeight:1.1}}>TR</span>
      </div>
      <div style={{padding:'0 10px',display:'flex',alignItems:'center',background:'#fff',color:'#1a1a1a',fontFamily:'Arial Black,Arial',fontSize:13,fontWeight:900,letterSpacing:1.5,textTransform:'uppercase'}}>
        {plaka}
      </div>
    </div>
  );
};

/* v2.20: Araç görsel kartı — marka logosu + marka/model/yıl bilgisi.
 * Logo yüklenemezse fallback olarak büyük araç ikonu + marka harfleri. */
const AracGorsel = ({arac, anaRenk}) => {
  const C = MR.C;
  const LIcon = MR.LIcon;
  const [logoErr, setLogoErr] = React.useState(false);
  const logoUrl = arac.marka ? aracLogoUrl(arac.marka) : null;
  return (
    <div style={{
      height:120,
      background: `linear-gradient(135deg, ${anaRenk}08 0%, ${anaRenk}18 50%, ${anaRenk}10 100%)`,
      borderRadius:10,
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'0 18px',
      position:'relative',overflow:'hidden',
      border:`1px solid ${anaRenk}22`
    }}>
      {/* Sol: marka logosu */}
      <div style={{display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:78,height:78,borderRadius:12,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:8,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',flexShrink:0}}>
          {logoUrl && !logoErr ? (
            <img src={logoUrl} alt={arac.marka} onError={() => setLogoErr(true)}
              style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
          ) : (
            <LIcon name="Car" size={42} color={anaRenk}/>
          )}
        </div>
        <div>
          <div style={{fontSize:17,fontWeight:900,color:anaRenk,letterSpacing:0.3,textTransform:'uppercase'}}>
            {arac.marka || '—'}
          </div>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginTop:2,textTransform:'uppercase'}}>
            {arac.model || '—'}
          </div>
          <div style={{fontSize:11,color:C.textMuted,marginTop:2,fontWeight:600}}>
            {arac.model_yili || '—'}
          </div>
        </div>
      </div>
    </div>
  );
};

const asamaRenk = (a) => {
  if (!a) return '#6b7280';
  const s = a.toUpperCase();
  if (s.includes('KAPANDI') || s.includes('TAHSİL KABİLİYETİ YOK')) return '#6b7280';
  if (s.includes('ÖDEME ALINDI')) return '#22c55e';
  if (s.includes('ÖDEME BEKLEN')) return '#84cc16';
  if (s.includes('AÇIK') || s.includes('EVRAK BEKLEN')) return '#3b82f6';
  if (s.includes('TAHKİM') || s.includes('HAKEM')) return '#6366f1';
  if (s.includes('DAVA') || s.includes('HUKUK')) return '#ef4444';
  if (s.includes('BİLİRKİŞİ') || s.includes('HESAP') || s.includes('AKTÜER')) return '#d97706';
  if (s.includes('KARAR') || s.includes('TEMYİZ') || s.includes('İSTİNAF')) return '#ec4899';
  if (s.includes('ADLİ TIP') || s.includes('MALULİYET') || s.includes('KUSUR') || s.includes('SAKATLIK')) return '#a855f7';
  if (s.includes('ARABULUCULUK')) return '#14b8a6';
  if (s.includes('BAŞVURU') || s.includes('SİGORTA')) return '#06b6d4';
  if (s.includes('İCRA') || s.includes('TAKİP') || s.includes('AZİLNAME')) return '#f97316';
  if (s.includes('İTİRAZ')) return '#e11d48';
  if (s.includes('KEŞİF') || s.includes('SEVK') || s.includes('ÖN İNCELEME')) return '#8b5cf6';
  return '#6b7280';
};

const EvrakPreviewIframe = ({evrakId}) => {
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [mimeType, setMimeType] = React.useState('');
  const [hata, setHata] = React.useState('');
  const [yukleniyor, setYukleniyor] = React.useState(true);
  const urlRef = React.useRef(null);

  React.useEffect(() => {
    let iptal = false;
    setBlobUrl(null);
    setMimeType('');
    setHata('');
    setYukleniyor(true);

    const yukle = async () => {
      try {
        const token = MR.api.token;
        if (!token) { if (!iptal) setHata('OTURUM BULUNAMADI. LÜTFEN YENİDEN GİRİŞ YAPIN.'); return; }

        const apiBase = MR.api.base || '/api/v1';
        const fetchUrl = apiBase + '/evrak/download.php?id=' + evrakId + '&mode=inline';

        const r = await fetch(fetchUrl, {
          headers: { 'Authorization': 'Bearer ' + token },
          credentials: 'include',
          cache: 'no-cache'
        });

        if (iptal) return;

        if (!r.ok) {
          let hataMesaj = 'SUNUCU HATASI: ' + r.status;
          try {
            const txt = await r.text();
            try { const j = JSON.parse(txt); hataMesaj = j.error || hataMesaj; } catch(e) {}
          } catch(e) {}
          setHata(hataMesaj);
          setYukleniyor(false);
          return;
        }

        const ct = (r.headers.get('content-type') || 'application/pdf').split(';')[0].trim();
        const ab = await r.arrayBuffer();
        if (iptal) return;

        if (ab.byteLength === 0) { setHata('EVRAK DOSYASI BOŞ'); setYukleniyor(false); return; }

        // Gelen verinin JSON hata yanıtı olup olmadığını kontrol et
        if (ab.byteLength < 500 && ct.includes('json')) {
          try {
            const txt = new TextDecoder().decode(ab);
            const j = JSON.parse(txt);
            if (j.error) { setHata(j.error); setYukleniyor(false); return; }
          } catch(e) {}
        }

        const blob = new Blob([ab], { type: ct });
        const objectUrl = URL.createObjectURL(blob);

        /* Önceki URL varsa temizle */
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = objectUrl;
        setMimeType(ct.toLowerCase());
        setBlobUrl(objectUrl);
        setYukleniyor(false);
      } catch(e) {
        console.error('EVRAK ÖNIZLEME HATASI:', e);
        if (!iptal) {
          setHata('EVRAK YÜKLENİRKEN HATA: ' + (e.message || 'Bağlantı hatası'));
          setYukleniyor(false);
        }
      }
    };
    yukle();

    return () => {
      iptal = true;
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    };
  }, [evrakId]);

  if (hata) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#ef4444',fontSize:13,flexDirection:'column',gap:8,padding:20,textAlign:'center'}}>
      <MR.LIcon name="AlertTriangle" size={28} color="#ef4444"/>
      <div style={{fontWeight:700}}>EVRAK YÜKLENEMEDİ</div>
      <div style={{fontSize:10,color:'#6b7280',maxWidth:300}}>{hata}</div>
      <button onClick={() => { setHata(''); setYukleniyor(true); setBlobUrl(null); }}
        style={{marginTop:8,padding:'6px 16px',fontSize:10,background:'#2563eb22',color:'#2563eb',border:'1px solid #2563eb33',borderRadius:6,cursor:'pointer',fontWeight:700}}>
        TEKRAR DENE
      </button>
    </div>
  );

  if (yukleniyor || !blobUrl) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#6b7280',fontSize:12,flexDirection:'column',gap:8}}>
      <div style={{width:24,height:24,border:'3px solid transparent',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      EVRAK YÜKLENİYOR...
    </div>
  );

  /* Resim dosyaları için <img> kullan */
  if (mimeType.startsWith('image/')) {
    return <div style={{width:'100%',height:'100%',overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',background:'#f3f4f6',padding:10}}>
      <img src={blobUrl} alt="EVRAK" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',borderRadius:4,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}/>
    </div>;
  }

  /* PDF dosyaları için <iframe> (en güvenilir yöntem, tüm tarayıcılarda çalışır) */
  if (mimeType === 'application/pdf') {
    return <iframe src={blobUrl + '#toolbar=1&navpanes=1&scrollbar=1'} title="PDF Önizleme"
      style={{width:'100%',height:'100%',border:'none',background:'#f3f4f6'}}/>;
  }

  /* Diğer dosyalar için (DOCX vb.) indirme bilgisi */
  return <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#f3f4f6',flexDirection:'column',gap:12,padding:20}}>
    <MR.LIcon name="FileText" size={48} color="#6b7280"/>
    <div style={{fontSize:13,fontWeight:700,color:'#374151'}}>BU DOSYA TÜRÜ TARAYICIDA ÖNİZLENEMİYOR</div>
    <div style={{fontSize:11,color:'#6b7280'}}>DOSYAYI İNDİREREK GÖRÜNTÜLEYEBİLİRSİNİZ</div>
  </div>;
};

MR.DosyaDetayPage = ({dosyaId, setPage, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, Confirm, api, fmt, MASRAF_K, EVRAK_T, ILLER, ILCELER, SIGORTA, today} = MR;
  const [dosya, setDosya] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bilgi');
  const [masrafM, setMasrafM] = useState(false);
  const [evrakM, setEvrakM] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [asamaOnay, setAsamaOnay] = useState(null);
  const [editM, setEditM] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [dosyaSilConfirm, setDosyaSilConfirm] = useState(false);
  const [ortaklar, setOrtaklar] = useState([]);
  const [portalCreating, setPortalCreating] = useState(false);
  const [portalModal, setPortalModal] = useState({open:false, link:'', erisimKodu:'', tc:'', telefon:'', adSoyad:'', mevcut:false});
  const [previewEvrak, setPreviewEvrak] = useState(null);
  const [evrakTurleri, setEvrakTurleri] = useState(MR.EVRAK_T || []);
  const [aramaEvrak, setAramaEvrak] = useState('');

  // MASRAF ÖDEME MODAL STATE
  const [masrafOdeModal, setMasrafOdeModal] = useState(false);
  const [masrafOdeItem, setMasrafOdeItem] = useState(null);
  const [masrafOdeKasa, setMasrafOdeKasa] = useState('');
  const [masrafOdeLoading, setMasrafOdeLoading] = useState(false);

  // DOSYA KAPAT STATE
  const [kapatModal, setKapatModal] = useState(false);
  const [kapatForm, setKapatForm] = useState({
    tazminat: '', vekalet_ucreti: '', faiz: '', stopaj: '', kdv_oran: '20',
    dosya_basi_odenen: '0', kasa_id: 1, pay_orani: '50'
  });
  const [kapatLoading, setKapatLoading] = useState(false);
  const [kasalar, setKasalar] = useState([]);

  const load = async () => {
    setLoading(true);
    const r = await api.dosyaGet(dosyaId);
    if (r?.success) setDosya(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [dosyaId]);

  const [personeller, setPersoneller] = useState([]);
  const [paydaslar, setPaydaslar] = useState([]);

  // İŞ ORTAKLARI (AVUKATLAR) LİSTESİNİ YÜKLE
  useEffect(() => {
    api.ortakList({durum:'aktif', limit:200}).then(r => {
      if (r?.success) setOrtaklar(r.data?.items || r.data || []);
    });
    api.personelList({durum:'aktif'}).then(r => {
      if (r?.success) setPersoneller(r.data?.items || r.data || []);
    });
    api.paydasList({durum:'aktif', limit:200}).then(r => {
      if (r?.success) setPaydaslar(r.data?.items || r.data || []);
    });
    api.kasaList().then(r => {
      if (r?.success) setKasalar((r.data || []).filter(k => k.aktif !== false && k.aktif !== 0));
    });
    api.tanimList({kategori:'evrak_turu', aktif:1}).then(r => {
      if (r?.success && Array.isArray(r.data) && r.data.length > 0) {
        setEvrakTurleri(r.data.map(t => t.deger));
      }
    }).catch(() => {});
  }, []);

  const [smsBildirim, setSmsBildirim] = useState(null);

  const asamaDegistirOnay = (yeniAsama) => {
    if (yeniAsama === dosya.asama) return;
    setAsamaOnay(yeniAsama);
  };

  const asamaDegistirOnayla = async () => {
    if (!asamaOnay) return;
    const yeniAsama = asamaOnay;
    setAsamaOnay(null);
    const r = await api.dosyaUpdate({id: dosya.id, asama: yeniAsama});
    if (r?.success) {
      load();
      if (r.data?.sms_gonderildi) {
        setSmsBildirim({type:'success', text:'DURUM DEĞİŞTİRİLDİ VE MAĞDURA SMS GÖNDERİLDİ'});
      } else if (r.data?.sms_sonuc && !r.data.sms_sonuc.basarili) {
        setSmsBildirim({type:'warning', text:'DURUM DEĞİŞTİRİLDİ - SMS: ' + (r.data.sms_sonuc.mesaj || 'GÖNDERİLEMEDİ')});
      } else {
        setSmsBildirim({type:'info', text:'DURUM DEĞİŞTİRİLDİ'});
      }
      setTimeout(() => setSmsBildirim(null), 5000);
    }
  };

  const masrafSil = async (id) => {
    const r = await api.masrafDelete(id);
    if (r?.success) { load(); setDeleteConfirm(null); }
  };

  const evrakSil = async (id) => {
    const r = await api.evrakDelete(id);
    if (r?.success) { load(); setDeleteConfirm(null); }
  };

  const getPlaka = () => dosya?.plaka || dosya?.araclar?.find(a=>a.taraf==='magdur')?.plaka || '';

  const openEditModal = () => {
    const magdur = dosya.magdur || {};
    const maArac = dosya.araclar?.find(a=>a.taraf==='magdur') || {};
    const kaArac = dosya.araclar?.find(a=>a.taraf==='karsi') || {};
    setEditForm({
      dosya_turu: dosya.dosya_turu || 'ADK',
      sigorta_sirket: dosya.sigorta_sirket || '',
      hasar_no: dosya.hasar_no || '',
      /* v2.14: police_no, sigorta_brans, sigorta_turu, talep_turu kaldırıldı */
      sorumlu_sigorta: dosya.sorumlu_sigorta || '',
      eksper_firma: dosya.eksper_firma || '',
      onarim_servisi: dosya.onarim_servisi || '',
      sakatlik_aciklama: dosya.sakatlik_aciklama || '',
      surucu_ad: dosya.surucu_ad || '',
      surucu_ehliyet: dosya.surucu_ehliyet || '',
      surucu_kusur: dosya.surucu_kusur || '',
      dosya_kaynagi: dosya.dosya_kaynagi || '',
      noter_vekalet: dosya.noter_vekalet || '',
      kaza_tarihi: dosya.kaza_tarihi || '',
      kaza_il: dosya.kaza_il || '',
      kaza_ilce: dosya.kaza_ilce || '',
      haklilik: dosya.haklilik || 100,
      komisyon_orani: dosya.komisyon_orani || 0,
      hak_mahrumiyet: parseInt(dosya.hak_mahrumiyet) === 1 ? 1 : 0,
      plaka: getPlaka(),
      notlar: dosya.notlar || '',
      ortak_id: dosya.ortak_id ? String(dosya.ortak_id) : '',
      magdur_ad_soyad: magdur.ad_soyad || '',
      magdur_tc_kimlik: magdur.tc_kimlik || '',
      magdur_telefon: magdur.telefon || '',
      /* v2.18: KESINLIKLE kaldırıldı — magdur_telefon2, magdur_email, magdur_il, magdur_ilce,
       *        magdur_cinsiyet, magdur_meslek, magdur_adres (hepsi 3 ekrandan tamamen çıkarıldı) */
      magdur_dogum_tarihi: magdur.dogum_tarihi || '',
      magdur_gelir_durumu: magdur.gelir_durumu || '',
      magdur_gelir_tutari: magdur.gelir_tutari || '',
      magdur_iban: magdur.iban || '',
      sorumlu_id: dosya.sorumlu_id ? String(dosya.sorumlu_id) : '',
      paydas_id: dosya.paydas_id ? String(dosya.paydas_id) : '',
      // Mağdur araç alanları (v2.13: ma_plaka/marka/model/yil/kasko eklendi)
      ma_plaka: maArac.plaka || '',
      ma_marka: maArac.marka || '',
      ma_model: maArac.model || '',
      ma_model_yili: maArac.model_yili ? String(maArac.model_yili) : '',
      ma_kasko: maArac.kasko ? 1 : 0,
      ma_ruhsat_sahibi: maArac.ruhsat_sahibi || '',
      ma_tc_kimlik: maArac.tc_kimlik || '',
      ma_belge_tescil_no: maArac.belge_tescil_no || '',
      ma_onarim_gun_suresi: maArac.onarim_gun_suresi || '',
      ma_gecmis_hasar: maArac.gecmis_hasar || '',
      // Karşı araç alanları (v2.13: ka_plaka eklendi, v2.14: ka_trafik_police kaldırıldı)
      ka_plaka: kaArac.plaka || '',
      ka_ruhsat_sahibi: kaArac.ruhsat_sahibi || '',
      ka_tc_kimlik: kaArac.tc_kimlik || '',
      ka_marka: kaArac.marka || '',
      ka_model: kaArac.model || '',
      ka_model_yili: kaArac.model_yili ? String(kaArac.model_yili) : '',
      ka_belge_tescil_no: kaArac.belge_tescil_no || '',
      ka_trafik_sirket: kaArac.trafik_sirket || '',
      ka_kasko: kaArac.kasko ? 1 : 0,
      ka_ruhsat_sahibi_surucu: kaArac.ruhsat_sahibi_surucu || '',
      ka_surucu_ad: kaArac.surucu_ad || '',
      ka_surucu_tc_kimlik: kaArac.surucu_tc_kimlik || ''
    });
    setEditError('');
    setEditM(true);
  };

  const dosyaGuncelle = async () => {
    setEditLoading(true);
    setEditError('');
    /* v2.13: Tüm alanlar artık güncellenir. Backend update.php zaten 30+ dosya
     * alanı + 14 mağdur alanı + 13 araç alanını whitelist'te tutuyor. */
    const updateData = {
      id: dosya.id,
      dosya_turu: editForm.dosya_turu,
      sigorta_sirket: editForm.sigorta_sirket,
      hasar_no: editForm.hasar_no,
      /* v2.14: police_no, sigorta_brans, sigorta_turu, talep_turu kaldırıldı */
      sorumlu_sigorta: editForm.sorumlu_sigorta || '',
      eksper_firma: editForm.eksper_firma || '',
      onarim_servisi: editForm.onarim_servisi || '',
      sakatlik_aciklama: editForm.sakatlik_aciklama || '',
      surucu_ad: editForm.surucu_ad || '',
      surucu_ehliyet: editForm.surucu_ehliyet || '',
      surucu_kusur: editForm.surucu_kusur || '',
      dosya_kaynagi: editForm.dosya_kaynagi,
      noter_vekalet: editForm.noter_vekalet === '' ? null : parseFloat(editForm.noter_vekalet),
      kaza_tarihi: editForm.kaza_tarihi || null,
      kaza_il: editForm.kaza_il,
      kaza_ilce: editForm.kaza_ilce || '',
      haklilik: parseInt(editForm.haklilik) || 100,
      komisyon_orani: parseFloat(editForm.komisyon_orani) || 0,
      hak_mahrumiyet: parseInt(editForm.hak_mahrumiyet) || 0,
      plaka: editForm.plaka,
      notlar: editForm.notlar,
      ortak_id: editForm.ortak_id ? parseInt(editForm.ortak_id) : null,
      magdur_ad_soyad: editForm.magdur_ad_soyad,
      magdur_tc_kimlik: editForm.magdur_tc_kimlik,
      magdur_telefon: editForm.magdur_telefon,
      /* v2.18: 3 ekrandan TAMAMEN kaldırıldı — telefon2/email/il/ilce/cinsiyet/meslek/adres */
      magdur_dogum_tarihi: editForm.magdur_dogum_tarihi || null,
      magdur_gelir_durumu: editForm.magdur_gelir_durumu || '',
      magdur_gelir_tutari: editForm.magdur_gelir_tutari || '',
      magdur_iban: editForm.magdur_iban,
      sorumlu_id: editForm.sorumlu_id ? parseInt(editForm.sorumlu_id) : null,
      paydas_id: editForm.paydas_id ? parseInt(editForm.paydas_id) : null
    };
    // Mağdur ve karşı araç alanları (v2.17: BH için de mağdur araç gönderilir)
    const isAdkMdk = editForm.dosya_turu === 'ADK' || editForm.dosya_turu === 'MDK';
    const isBHedit = editForm.dosya_turu === 'BH';
    if (isAdkMdk || isBHedit) {
      // Mağdur araç (v2.13: ma_plaka/marka/model/yil/kasko eklendi, v2.17: BH için de)
      updateData.ma_plaka = editForm.ma_plaka || '';
      updateData.ma_marka = editForm.ma_marka || '';
      updateData.ma_model = editForm.ma_model || '';
      updateData.ma_model_yili = editForm.ma_model_yili ? parseInt(editForm.ma_model_yili) : null;
      updateData.ma_kasko = editForm.ma_kasko ? 1 : 0;
      updateData.ma_ruhsat_sahibi = editForm.ma_ruhsat_sahibi || '';
      updateData.ma_tc_kimlik = editForm.ma_tc_kimlik || '';
      updateData.ma_belge_tescil_no = editForm.ma_belge_tescil_no || '';
      updateData.ma_onarim_gun_suresi = editForm.ma_onarim_gun_suresi ? parseInt(editForm.ma_onarim_gun_suresi) : null;
      updateData.ma_gecmis_hasar = editForm.ma_gecmis_hasar || '';
      // Karşı araç sadece ADK/MDK (BH'da karşı araç yok)
      if (isAdkMdk) {
        updateData.ka_plaka = editForm.ka_plaka || '';
        updateData.ka_ruhsat_sahibi = editForm.ka_ruhsat_sahibi || '';
        updateData.ka_tc_kimlik = editForm.ka_tc_kimlik || '';
        updateData.ka_marka = editForm.ka_marka || '';
        updateData.ka_model = editForm.ka_model || '';
        updateData.ka_model_yili = editForm.ka_model_yili ? parseInt(editForm.ka_model_yili) : null;
        updateData.ka_belge_tescil_no = editForm.ka_belge_tescil_no || '';
        updateData.ka_trafik_sirket = editForm.ka_trafik_sirket || '';
        /* v2.14: ka_trafik_police (KARŞI ARAÇ POLİÇE NO) kaldırıldı */
        updateData.ka_kasko = editForm.ka_kasko ? 1 : 0;
        updateData.ka_ruhsat_sahibi_surucu = editForm.ka_ruhsat_sahibi_surucu || '';
        updateData.ka_surucu_ad = editForm.ka_surucu_ad || '';
        updateData.ka_surucu_tc_kimlik = editForm.ka_surucu_tc_kimlik || '';
      }
    }
    const r = await api.dosyaUpdate(updateData);
    if (r?.success) { load(); setEditM(false); }
    else setEditError(r?.error || 'GÜNCELLEME HATASI');
    setEditLoading(false);
  };

  const dosyaSil = async () => {
    const r = await api.dosyaDelete(dosya.id);
    if (r?.success) { setDosyaSilConfirm(false); setPage('dosya-liste'); }
  };

  const portalOlustur = async () => {
    setPortalCreating(true);
    const r = await api.portalErisimOlustur({dosya_id: dosya.id, giris_yontemi: 'tc_telefon', sms_gonder: false});
    setPortalCreating(false);
    if (r?.success) {
      const d = r.data || {};
      const m = dosya.magdur || {};
      setPortalModal({
        open: true,
        link: d.portal_link || (window.location.origin + '/portal.html#kod=' + d.erisim_kodu),
        erisimKodu: d.erisim_kodu || '',
        tc: m.tc_kimlik || '',
        telefon: m.telefon || '',
        adSoyad: m.ad_soyad || '',
        mevcut: false
      });
    } else {
      // Eğer mevcut varsa bilgiyi göster
      if (r?.error?.includes('ZATEN AKTİF')) {
        const rList = await api.portalErisimList({dosya_id: dosya.id, aktif: 1});
        if (rList?.success) {
          const items = rList.data?.items || [];
          const e = items[0];
          if (e) {
            setPortalModal({
              open: true,
              link: window.location.origin + '/portal.html#kod=' + e.erisim_kodu,
              erisimKodu: e.erisim_kodu || '',
              tc: e.tc_kimlik || '',
              telefon: e.telefon || '',
              adSoyad: e.ad_soyad || '',
              mevcut: true
            });
            return;
          }
        }
        MR.toast?.(r?.error, 'warning');
      } else {
        MR.toast?.(r?.error || 'PORTAL OLUŞTURMA HATASI', 'error');
      }
    }
  };

  const kopyala = (text) => {
    navigator.clipboard.writeText(text).then(() => MR.toast?.('KOPYALANDI', 'success')).catch(() => {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      MR.toast?.('KOPYALANDI', 'success');
    });
  };

  if (loading) return <Loading/>;
  if (!dosya) return <EmptyState icon="AlertCircle" title="DOSYA BULUNAMADI" desc=""/>;

  const magdur = dosya.magdur || {};
  const arac = dosya.araclar?.find(a=>a.taraf==='magdur') || {};
  const karsiArac = dosya.araclar?.find(a=>a.taraf==='karsi') || {};
  const ac = asamaRenk(dosya.asama);
  const u = (k, v) => setEditForm(p => ({...p, [k]: v}));
  const isAvukat = user?.rol === 'avukat';

  // YETKİ KONTROL FONKSİYONU
  const hasYetki = (modul, islem) => {
    if (user?.rol === 'admin') return true;
    return user?.yetkiler?.[modul + '_' + islem] === 1 || user?.yetkiler?.[modul + '_' + islem] === true;
  };

  // Bilgi satir - modul-level (focus-loss bug fix)
  const InfoRow = MR._DosyaDetayInfoRow;

  const tabs = [
    {id:'bilgi', l:'DOSYA BİLGİLERİ', ic:'FileText'},
    {id:'masraf', l:`MASRAFLAR (${dosya.masraflar?.length || 0})`, ic:'Receipt'},
    {id:'evrak', l:`EVRAKLAR (${dosya.evraklar?.length || 0})`, ic:'Folder'},
    {id:'hesap', l:'DOSYA HESABI', ic:'Calculator'}
  ];

  return (
    <div className="fade-in">
      {/* SMS BİLDİRİM TOAST */}
      {smsBildirim && (
        <div style={{position:'fixed', top:80, right:20, zIndex:9999, padding:'12px 20px', borderRadius:10,
          background: smsBildirim.type==='success' ? C.success : smsBildirim.type==='warning' ? C.warning : C.accent,
          color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:8,
          boxShadow:'0 4px 20px rgba(0,0,0,0.3)', animation:'fadeIn 0.3s ease',maxWidth:420}}>
          <LIcon name={smsBildirim.type==='success' ? 'CheckCircle' : smsBildirim.type==='warning' ? 'AlertTriangle' : 'MessageSquare'} size={16} color="#fff"/>
          {smsBildirim.text}
          <span style={{marginLeft:8, cursor:'pointer', opacity:0.7}} onClick={() => setSmsBildirim(null)}>✕</span>
        </div>
      )}

      {/* ÜST BAR */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <button style={{...S.btn,...S.btnG,fontSize:10,padding:'6px 14px'}} onClick={() => setPage('dosya-liste')}>
          <LIcon name="ArrowLeft" size={13}/> LİSTEYE DÖN
        </button>
      </div>

      {/* v2.20: DOSYA HEADER — tasarımdaki tema (büyük dosya no + 4 bilgi kutusu + butonlar) */}
      <div style={{...S.card, marginBottom:12, border:`2px solid ${ac}33`, boxShadow:`0 4px 12px ${C.accent}10`}}>
        <div style={{padding:'18px 22px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14}}>
          {/* SOL: Büyük dosya no + müşteri/sigorta/hasar bilgisi */}
          <div style={{display:'flex', alignItems:'center', gap:14, flex:'1 1 auto', minWidth:280}}>
            <div style={{width:48, height:48, borderRadius:12, background:`linear-gradient(135deg, ${C.accent}22 0%, ${C.accent}11 100%)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`inset 0 0 0 1px ${C.accent}33`}}>
              <LIcon name="FolderOpen" size={22} color={C.accent}/>
            </div>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
                <span style={{fontSize:22, fontWeight:900, letterSpacing:0.5, color:C.text}}>{dosya.dosya_no}</span>
                <span style={{padding:'3px 10px', borderRadius:6, fontSize:10, fontWeight:800, letterSpacing:0.5,
                  background:`${ac}22`, color:ac, border:`1px solid ${ac}55`,textTransform:'uppercase'}}>
                  {dosya.asama}
                </span>
              </div>
              <div style={{fontSize:13, color:C.textSec, marginTop:4, fontWeight:600}}>
                <b style={{color:C.text}}>{magdur.ad_soyad || '—'}</b>
                {dosya.sigorta_sirket && <span> • {dosya.sigorta_sirket}</span>}
                {dosya.hasar_no && <span style={{fontFamily:'monospace',color:C.textMuted}}> • {dosya.hasar_no}</span>}
              </div>
            </div>
          </div>

          {/* ORTA: 4 BİLGİ KUTUSU (tasarımdaki gibi) */}
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            {[
              {ic:'Calendar', l:'HASAR TARİHİ', v:dosya.kaza_tarihi ? new Date(dosya.kaza_tarihi).toLocaleDateString('tr-TR') : '—', c:C.warning},
              {ic:'Clock', l:'OLUŞTURMA TARİHİ', v:dosya.acilis_tarihi ? new Date(dosya.acilis_tarihi).toLocaleDateString('tr-TR') : (dosya.created_at ? new Date(dosya.created_at).toLocaleDateString('tr-TR') : '—'), c:C.cyan},
              {ic:'FileText', l:'DOSYA TÜRÜ', v:dosya.dosya_turu || '—', c:dosya.dosya_turu==='BH'?C.purple:(dosya.dosya_turu==='MDK'?(C.gold||'#f59e0b'):C.accent)},
              {ic:'UserCheck', l:'DOSYA SORUMLUSU', v:dosya.sorumlu_adi || '—', c:C.success}
            ].map((b,i) => (
              <div key={i} style={{
                padding:'8px 14px', borderRadius:10,
                background:MR.tema==='koyu' ? `${b.c}10` : `${b.c}08`,
                border:`1px solid ${b.c}33`,
                display:'flex', alignItems:'center', gap:9, minWidth:120
              }}>
                <div style={{width:28, height:28, borderRadius:7, background:`${b.c}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <LIcon name={b.ic} size={14} color={b.c}/>
                </div>
                <div>
                  <div style={{fontSize:8, fontWeight:700, color:C.textMuted, letterSpacing:0.5}}>{b.l}</div>
                  <div style={{fontSize:11, fontWeight:800, color:b.c, marginTop:1}}>{b.v}</div>
                </div>
              </div>
            ))}
          </div>

          {/* SAĞ: Butonlar (DÜZENLE / PORTAL / SİL) + aşama dropdown */}
          <div style={{display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end'}}>
            <div style={{display:'flex', gap:6}}>
              {hasYetki('dosya','dosya-duzenle') && <button style={{...S.btn,...S.btnP,fontSize:10,padding:'7px 14px',boxShadow:`0 2px 6px ${C.accent}33`}} onClick={openEditModal}>
                <LIcon name="Edit2" size={12} color="#fff"/> DÜZENLE
              </button>}
              {hasYetki('dosya','dosya-portal') && <button style={{...S.btn,...S.btnS,fontSize:10,padding:'7px 14px',boxShadow:`0 2px 6px ${C.success}33`}} disabled={portalCreating}
                onClick={portalOlustur} title="MÜŞTERİ PORTAL ERİŞİMİ OLUŞTUR">
                <LIcon name="Globe" size={12} color="#fff"/> {portalCreating ? 'OLUŞTURULUYOR...' : 'PORTAL'}
              </button>}
              {hasYetki('dosya','dosya-sil') && <button style={{...S.btn,...S.btnD,fontSize:10,padding:'7px 14px',boxShadow:`0 2px 6px ${C.danger}33`}}
                onClick={() => setDosyaSilConfirm(true)}>
                <LIcon name="Trash2" size={12} color="#fff"/> SİL
              </button>}
            </div>
            <select value={dosya.asama} onChange={e => asamaDegistirOnay(e.target.value)}
              style={{...S.select,minWidth:200,fontSize:10,padding:'6px 10px',background:`${ac}11`,border:`1px solid ${ac}33`,color:ac,fontWeight:600}}>
              {ASAMALAR.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABS — 3D MAVİ */}
      <div style={{display:'flex',gap:6,marginBottom:12,justifyContent:'flex-start'}}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'9px 18px',borderRadius:10,fontSize:11,fontWeight:800,cursor:'pointer',
              transition:'all .15s ease', letterSpacing:0.3,
              ...(tab===t.id ? {
                background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',
                color:'#fff', border:'none', borderBottom:'2px solid #1d4ed8',
                boxShadow:'0 4px 14px -2px rgba(37,99,235,0.5), 0 2px 4px -1px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25)',
                textShadow:'0 1px 2px rgba(0,0,0,0.15)'
              } : {
                background:'linear-gradient(180deg, rgba(100,116,139,0.12) 0%, rgba(100,116,139,0.05) 100%)',
                color:C.textSec, border:`1px solid ${C.border}`,
                boxShadow:'0 2px 6px -1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
                textShadow:'none'
              })}}>
            <LIcon name={t.ic} size={13} color={tab===t.id?'#fff':C.textSec}/>{t.l}
          </div>
        ))}
      </div>

      {/* DOSYA BİLGİLERİ TAB */}
      {tab === 'bilgi' && (() => {
        const adkMdk = dosya.dosya_turu === 'ADK' || dosya.dosya_turu === 'MDK';
        const bhMode = dosya.dosya_turu === 'BH';
        const showMagdurArac = (adkMdk || bhMode) && (arac.plaka || getPlaka());
        const showKarsiArac  = adkMdk && karsiArac.plaka;
        const gridCols = showKarsiArac ? '1fr 1fr 1fr' : (showMagdurArac ? '1fr 1.4fr' : '1fr');
        return (
        <div style={{display:'grid',gridTemplateColumns:gridCols,gap:14}}>

          {/* ╔═════ SOL: DOSYA BİLGİLERİ ═════╗ */}
          <div style={{...S.card, boxShadow:`0 2px 10px ${C.accent}10`}}>
            <div style={{padding:'12px 16px',borderBottom:`2px solid ${C.accent}33`,display:'flex',alignItems:'center',gap:10,background:`linear-gradient(90deg, ${C.accent}15 0%, transparent 100%)`}}>
              <div style={{width:30,height:30,borderRadius:8,background:`${C.accent}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <LIcon name="FileText" size={15} color={C.accent}/>
              </div>
              <span style={{fontSize:12,fontWeight:800,letterSpacing:0.4,color:C.accent}}>DOSYA BİLGİLERİ</span>
            </div>
            <div style={{padding:'10px 14px'}}>
              <InfoRow label="DOSYA NO" value={dosya.dosya_no} bold mono/>
              <InfoRow label="DOSYA TÜRÜ" value={dosya.dosya_turu} bold/>
              <InfoRow label="SİGORTA ŞİRKETİ" value={dosya.sigorta_sirket}/>
              <InfoRow label="HASAR DOSYA NO" value={dosya.hasar_no} mono/>
              <InfoRow label="DOSYA KAYNAĞI" value={dosya.dosya_kaynagi}/>
              {!isAvukat && <InfoRow label="AVUKAT" value={dosya.avukat_adi} bold color={C.purple}/>}
              {/* v2.19: AVUKAT ÖDEME ORANI gizlendi */}
              {!isAvukat && <InfoRow label="SORUMLU" value={dosya.sorumlu_adi}/>}
              {!isAvukat && dosya.paydas_adi && <InfoRow label="PAYDAŞ (YÖNLENDİREN)" value={dosya.paydas_adi}/>}
              <InfoRow label="AÇILIŞ TARİHİ" value={dosya.acilis_tarihi}/>
              <InfoRow label="KAZA TARİHİ" value={dosya.kaza_tarihi}/>
              <InfoRow label="KAZA İLİ" value={dosya.kaza_il}/>
              {dosya.kaza_ilce && <InfoRow label="KAZA İLÇE" value={dosya.kaza_ilce}/>}
              <InfoRow label="HAKLILIK" value={`%${dosya.haklilik || 0}`} bold color={C.success}/>
              <InfoRow label="KOMİSYON" value={`%${dosya.komisyon_orani || 0}`}/>
              {dosya.noter_vekalet && <InfoRow label="NOTER VEKALET" value={fmt(dosya.noter_vekalet)}/>}
              <InfoRow label="HAK MAHRUMİYET TALEP" value={parseInt(dosya.hak_mahrumiyet) === 1 ? 'VAR' : 'YOK'} bold color={parseInt(dosya.hak_mahrumiyet) === 1 ? C.success : C.textMuted}/>
              {(dosya.sorumlu_sigorta || dosya.eksper_firma || dosya.onarim_servisi) && (
                <div style={{marginTop:10,paddingTop:10,borderTop:`1px dashed ${C.border}`}}>
                  {dosya.sorumlu_sigorta && <InfoRow label="SORUMLU SİGORTA" value={dosya.sorumlu_sigorta}/>}
                  {dosya.eksper_firma && <InfoRow label="EKSPER FİRMA" value={dosya.eksper_firma}/>}
                  {dosya.onarim_servisi && <InfoRow label="ONARIM SERVİSİ" value={dosya.onarim_servisi}/>}
                </div>
              )}
              {bhMode && (dosya.surucu_ad || dosya.surucu_ehliyet || dosya.surucu_kusur != null || dosya.sakatlik_aciklama) && (
                <div style={{marginTop:10,paddingTop:10,borderTop:`1px dashed ${C.border}`}}>
                  {dosya.surucu_ad && <InfoRow label="SÜRÜCÜ ADI" value={dosya.surucu_ad}/>}
                  {dosya.surucu_ehliyet && <InfoRow label="EHLİYET NO" value={dosya.surucu_ehliyet} mono/>}
                  {dosya.surucu_kusur != null && <InfoRow label="KUSUR ORANI" value={`%${dosya.surucu_kusur}`}/>}
                  {dosya.sakatlik_aciklama && <div style={{marginTop:6,padding:8,background:`${C.danger}10`,borderRadius:6,fontSize:10,color:C.textSec}}><b>SAKATLIK / YARALANMA:</b> {dosya.sakatlik_aciklama}</div>}
                </div>
              )}
              {dosya.notlar && <div style={{marginTop:8,padding:8,background:C.bgInput,borderRadius:6,fontSize:10,color:C.textSec}}><b>NOTLAR:</b> {dosya.notlar}</div>}
            </div>
          </div>

          {/* ╔═════ ORTA: MAĞDUR ARAÇ + KAZA BİLGİSİ ═════╗ */}
          {showMagdurArac && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {/* MAĞDUR ARAÇ — tasarımdaki gibi: plaka rozeti + araç görseli + ARAÇ BİLGİLERİ + ARAÇ SAHİBİ */}
              <div style={{...S.card, borderTop:`3px solid ${C.success}`, boxShadow:`0 2px 10px ${C.success}10`}}>
                <div style={{padding:'10px 14px', display:'flex', alignItems:'center', gap:10, background:`linear-gradient(90deg, ${C.success}10 0%, transparent 100%)`, borderBottom:`1px solid ${C.border}`}}>
                  <div style={{width:28,height:28,borderRadius:7,background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <LIcon name="Car" size={14} color={C.success}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:800,letterSpacing:0.4,color:C.success,flex:1}}>MAĞDUR ARAÇ</span>
                  <PlakaRozeti plaka={arac.plaka || getPlaka()} color={C.success}/>
                </div>
                {/* Araç görsel (marka logosu + isim) */}
                <div style={{padding:'14px 14px 8px'}}>
                  <AracGorsel arac={arac} anaRenk={C.success}/>
                </div>
                {/* ARAÇ BİLGİLERİ */}
                <div style={{padding:'4px 14px 10px'}}>
                  <div style={{fontSize:10,fontWeight:800,color:C.success,letterSpacing:0.6,marginBottom:6,paddingBottom:5,borderBottom:`1px dashed ${C.success}33`}}>
                    ARAÇ BİLGİLERİ
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                    <InfoRow label="ŞASİ NO" value={arac.sase_no || arac.belge_tescil_no} mono/>
                    <InfoRow label="MARKA" value={arac.marka}/>
                    <InfoRow label="MODEL" value={arac.model}/>
                    <InfoRow label="MODEL YILI" value={arac.model_yili}/>
                    <InfoRow label="BELGE TESCİL NO" value={arac.belge_tescil_no} mono/>
                    <InfoRow label="KASKO" value={arac.kasko ? 'VAR' : 'YOK'} bold color={arac.kasko ? C.success : C.textMuted}/>
                    {arac.onarim_gun_suresi && <InfoRow label="ONARIM GÜN" value={`${arac.onarim_gun_suresi} GÜN`}/>}
                    {arac.gecmis_hasar && <InfoRow label="GEÇMİŞ HASAR" value={arac.gecmis_hasar.toUpperCase()} bold color={arac.gecmis_hasar === 'var' ? C.danger : C.success}/>}
                  </div>
                </div>
                {/* ARAÇ SAHİBİ */}
                {(arac.ruhsat_sahibi || arac.tc_kimlik) && (
                  <div style={{padding:'8px 14px 14px',borderTop:`1px dashed ${C.border}`,background:`${C.success}05`}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                      <LIcon name="User" size={12} color={C.success}/>
                      <span style={{fontSize:10,fontWeight:800,color:C.success,letterSpacing:0.6}}>ARAÇ SAHİBİ / RUHSAT SAHİBİ</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                      <InfoRow label="AD SOYAD" value={arac.ruhsat_sahibi} bold/>
                      <InfoRow label="T.C. KİMLİK" value={arac.tc_kimlik} mono/>
                    </div>
                  </div>
                )}
              </div>

              {/* KAZA BİLGİSİ — orta vurgu kart */}
              <div style={{...S.card, background:`linear-gradient(135deg, ${C.warning}08 0%, ${C.danger}08 100%)`, border:`1px solid ${C.warning}33`}}>
                <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:48,height:48,borderRadius:12,background:`linear-gradient(135deg, ${C.warning}33 0%, ${C.danger}33 100%)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <LIcon name="AlertTriangle" size={24} color={C.warning}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:800,color:C.warning,letterSpacing:0.5,marginBottom:4}}>KAZA BİLGİSİ</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
                      <div>
                        <div style={{fontSize:8,color:C.textMuted,fontWeight:700,letterSpacing:0.4}}>KAZA YERİ</div>
                        <div style={{fontSize:11,fontWeight:700,color:C.text}}>{dosya.kaza_il || '—'}{dosya.kaza_ilce ? ` / ${dosya.kaza_ilce}` : ''}</div>
                      </div>
                      <div>
                        <div style={{fontSize:8,color:C.textMuted,fontWeight:700,letterSpacing:0.4}}>HAKLILIK ORANI</div>
                        <div style={{fontSize:14,fontWeight:900,color:C.success,fontFamily:'monospace'}}>%{dosya.haklilik || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ╔═════ SAĞ: KARŞI TARAF ARAÇ ═════╗ */}
          {showKarsiArac && (
            <div style={{...S.card, borderTop:`3px solid ${C.danger}`, boxShadow:`0 2px 10px ${C.danger}10`}}>
              <div style={{padding:'10px 14px', display:'flex', alignItems:'center', gap:10, background:`linear-gradient(90deg, ${C.danger}10 0%, transparent 100%)`, borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:28,height:28,borderRadius:7,background:`${C.danger}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <LIcon name="Car" size={14} color={C.danger}/>
                </div>
                <span style={{fontSize:11,fontWeight:800,letterSpacing:0.4,color:C.danger,flex:1}}>KARŞI TARAF ARAÇ</span>
                <PlakaRozeti plaka={karsiArac.plaka} color={C.danger}/>
              </div>
              <div style={{padding:'14px 14px 8px'}}>
                <AracGorsel arac={karsiArac} anaRenk={C.danger}/>
              </div>
              <div style={{padding:'4px 14px 10px'}}>
                <div style={{fontSize:10,fontWeight:800,color:C.danger,letterSpacing:0.6,marginBottom:6,paddingBottom:5,borderBottom:`1px dashed ${C.danger}33`}}>
                  ARAÇ BİLGİLERİ
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                  <InfoRow label="MARKA" value={karsiArac.marka}/>
                  <InfoRow label="MODEL" value={karsiArac.model}/>
                  <InfoRow label="MODEL YILI" value={karsiArac.model_yili}/>
                  <InfoRow label="BELGE TESCİL NO" value={karsiArac.belge_tescil_no} mono/>
                  <InfoRow label="TRAFİK SİGORTA" value={karsiArac.trafik_sirket}/>
                  <InfoRow label="KASKO" value={karsiArac.kasko ? 'VAR' : 'YOK'} bold color={karsiArac.kasko ? C.success : C.textMuted}/>
                  <InfoRow label="RUHSAT / SÜRÜCÜ" value={karsiArac.ruhsat_sahibi_surucu ? karsiArac.ruhsat_sahibi_surucu.toUpperCase() : '-'} bold color={karsiArac.ruhsat_sahibi_surucu === 'farkli' ? C.warning : C.success}/>
                </div>
              </div>
              {(karsiArac.ruhsat_sahibi || karsiArac.tc_kimlik) && (
                <div style={{padding:'8px 14px',borderTop:`1px dashed ${C.border}`,background:`${C.danger}05`}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                    <LIcon name="User" size={12} color={C.danger}/>
                    <span style={{fontSize:10,fontWeight:800,color:C.danger,letterSpacing:0.6}}>ARAÇ SAHİBİ / RUHSAT SAHİBİ</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                    <InfoRow label="AD SOYAD" value={karsiArac.ruhsat_sahibi} bold/>
                    <InfoRow label="T.C. KİMLİK" value={karsiArac.tc_kimlik} mono/>
                  </div>
                </div>
              )}
              {karsiArac.ruhsat_sahibi_surucu === 'farkli' && (karsiArac.surucu_ad || karsiArac.surucu_tc_kimlik) && (
                <div style={{padding:'8px 14px 14px',borderTop:`1px dashed ${C.border}`,background:`${C.warning}08`}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                    <LIcon name="UserCog" size={12} color={C.warning}/>
                    <span style={{fontSize:10,fontWeight:800,color:C.warning,letterSpacing:0.6}}>SÜRÜCÜ (FARKLI KİŞİ)</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                    <InfoRow label="AD SOYAD" value={karsiArac.surucu_ad} bold/>
                    <InfoRow label="T.C. KİMLİK" value={karsiArac.surucu_tc_kimlik} mono/>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* v2.19: FİNANSAL ÖZET bölümü BİLGİ'den KALDIRILDI — DOSYA HESABI sekmesinin içinde */}
        </div>
        );
      })()}

      {/* MASRAFLAR TAB */}
      {tab === 'masraf' && (
        <div style={S.card}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}06`}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="Receipt" size={14} color={C.accent}/>
              <span style={{fontSize:12,fontWeight:700}}>MASRAFLAR</span>
              <span style={{fontSize:10,color:C.textMuted}}>TOPLAM: {fmt(dosya.toplam_masraf || 0)}</span>
            </div>
            {hasYetki('dosya','dosya-masraf-ekle') && <button style={{...S.btn,...S.btnP,fontSize:10,padding:'5px 12px'}} onClick={() => setMasrafM(true)}>
              <LIcon name="Plus" size={12} color="#fff"/> YENİ MASRAF
            </button>}
          </div>
          <div>
            {dosya.masraflar?.length > 0 ? (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af'}}>
                    {((!hasYetki('dosya','dosya-masraf-ode') && !hasYetki('dosya','dosya-masraf-sil')) ? ['#','MASRAF KALEMİ','TUTAR','DURUM','TARİH'] : ['#','MASRAF KALEMİ','TUTAR','DURUM','KASA','TARİH','KULLANICI','İŞLEM']).map(h =>
                      <th key={h} style={{padding:'8px 10px',textAlign:'left',color:'#FFFFFF',fontWeight:800,fontSize:'12px',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dosya.masraflar.map((m, i) => {
                    const odenmedi = (m.odeme_durumu || 'odendi') === 'odenmedi';
                    return (
                      <tr key={i} style={{backgroundColor: odenmedi ? `${C.warning}06` : (MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff')), borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)', borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)', boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)', transition:'all .2s', borderRadius:8}}>
                        <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{i+1}</td>
                        <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{m.masraf_kalemi}</td>
                        <td style={{padding:'8px 10px',fontWeight:700,color:C.danger,fontSize:'12px'}}>{fmt(m.tutar)}</td>
                        <td style={{padding:'8px 10px'}}>
                          {odenmedi ? (
                            <span style={{...S.btnMini,...S.btnMiniW, padding:'4px 12px', fontSize:9, cursor:hasYetki('dosya','dosya-masraf-ode')?'pointer':'default'}}
                              onClick={hasYetki('dosya','dosya-masraf-ode') ? () => { setMasrafOdeItem(m); setMasrafOdeKasa(''); setMasrafOdeModal(true); } : undefined}>
                              <LIcon name="Clock" size={10} color="#000"/> ÖDENMEDİ
                            </span>
                          ) : (
                            <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:6,fontSize:9,fontWeight:700,
                              background:`${C.success}22`,color:C.success,border:`1px solid ${C.success}44`}}>
                              <LIcon name="Check" size={10} color={C.success}/> ÖDENDİ
                            </span>
                          )}
                        </td>
                        {(hasYetki('dosya','dosya-masraf-ode') || hasYetki('dosya','dosya-masraf-sil')) && <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}><Badge text={m.kasa_adi || (odenmedi ? 'BEKLİYOR' : '-')} color={odenmedi ? C.warning : C.cyan}/></td>}
                        <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{m.islem_tarihi}</td>
                        {(hasYetki('dosya','dosya-masraf-ode') || hasYetki('dosya','dosya-masraf-sil')) && <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{m.kullanici_adi || '-'}</td>}
                        {(hasYetki('dosya','dosya-masraf-ode') || hasYetki('dosya','dosya-masraf-sil')) && <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>
                          <div style={{display:'flex',gap:4}}>
                            {odenmedi && hasYetki('dosya','dosya-masraf-ode') && (
                              <span style={{cursor:'pointer',display:'flex',padding:'3px 8px',borderRadius:4,background:`${C.success}18`,alignItems:'center',gap:3}}
                                onClick={() => { setMasrafOdeItem(m); setMasrafOdeKasa(''); setMasrafOdeModal(true); }}>
                                <LIcon name="Wallet" size={11} color={C.success}/><span style={{fontSize:9,fontWeight:700,color:C.success}}>ÖDE</span>
                              </span>
                            )}
                            {hasYetki('dosya','dosya-masraf-sil') && <span style={{cursor:'pointer',display:'flex',padding:2,borderRadius:4,background:`${C.danger}11`,width:'fit-content'}}
                              onClick={() => setDeleteConfirm({type:'masraf', id:m.id, text:m.masraf_kalemi})}>
                              <LIcon name="Trash2" size={12} color={C.danger}/>
                            </span>}
                          </div>
                        </td>}
                      </tr>
                    );
                  })}
                  <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af',borderRadius:8}}>
                    <td colSpan={2} style={{padding:'10px 12px',fontWeight:800,textAlign:'right',fontSize:'12px',color:'#FFFFFF'}}>TOPLAM:</td>
                    <td style={{padding:'10px 12px',fontWeight:800,fontSize:13,color:'#FFFFFF'}}>{fmt(dosya.toplam_masraf || 0)}</td>
                    <td colSpan={(!hasYetki('dosya','dosya-masraf-ode') && !hasYetki('dosya','dosya-masraf-sil')) ? 2 : 5}/>
                  </tr>
                </tbody>
              </table>
            ) : <EmptyState icon="Receipt" title="MASRAF YOK" desc="YENİ MASRAF EKLE BUTONUYLA MASRAF GİREBİLİRSİNİZ"/>}
          </div>
        </div>
      )}

      {/* EVRAKLAR TAB */}
      {tab === 'evrak' && (
        <div style={{...S.card, maxWidth:'66.67%', margin:'0 auto'}}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}06`,gap:10,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="Folder" size={14} color={C.accent}/>
              <span style={{fontSize:12,fontWeight:700}}>EVRAKLAR</span>
              <span style={{fontSize:10,color:C.textMuted}}>
                ({dosya.evraklar?.length || 0} / {evrakTurleri.length} YÜKLÜ)
              </span>
            </div>
            <div style={{flex:1, display:'flex', justifyContent:'center', minWidth:200}}>
              <div style={{position:'relative', width:'100%', maxWidth:420}}>
                <LIcon name="Search" size={12} color={C.textMuted} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
                <input type="text" value={aramaEvrak} onChange={e => setAramaEvrak(e.target.value)}
                  placeholder="EVRAK TÜRÜ ARA... (ÖRN: EH, RUH, KAZA)"
                  style={{width:'100%',padding:'6px 10px 6px 28px',fontSize:11,fontWeight:600,
                    border:`1px solid ${C.border}`,borderRadius:8,background:C.bgInput||C.bgCard,
                    color:C.text,outline:'none',letterSpacing:'.3px'}}/>
                {aramaEvrak && (
                  <button onClick={() => setAramaEvrak('')} title="TEMİZLE"
                    style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',
                      background:'none',border:'none',cursor:'pointer',padding:2,color:C.textMuted}}>
                    <LIcon name="X" size={12} color={C.textMuted}/>
                  </button>
                )}
              </div>
            </div>
            {dosya.evraklar?.length > 0 && (
              <button style={{...S.btn,...S.btnP,fontSize:10,padding:'5px 12px'}}
                onClick={async () => {
                  const token = MR.api.token;
                  const apiBase = MR.api.base || '/api/v1';
                  for (let i = 0; i < dosya.evraklar.length; i++) {
                    const e = dosya.evraklar[i];
                    try {
                      const r = await fetch(apiBase + '/evrak/download.php?id=' + e.id, {
                        headers: token ? {'Authorization': 'Bearer ' + token} : {},
                        credentials: 'include',
                        cache: 'no-cache'
                      });
                      if (!r.ok) {
                        let hataMesaj = 'HATA ' + r.status;
                        try { const j = await r.json(); hataMesaj = j.error || hataMesaj; } catch(ex){}
                        console.warn('EVRAK İNDİRİLEMEDİ (' + e.dosya_adi + '):', hataMesaj);
                        continue;
                      }
                      const blob = await r.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = e.dosya_adi || ('evrak_' + e.id + '.pdf');
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                      /* Tarayıcı indirme arasında kısa bekleme */
                      if (i < dosya.evraklar.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 800));
                      }
                    } catch(err) {
                      console.error('EVRAK İNDİRME HATASI:', err);
                    }
                  }
                }}>
                <LIcon name="Download" size={12} color="#fff"/> TOPLU İNDİR ({dosya.evraklar?.length})
              </button>
            )}
          </div>
          <div style={{maxHeight:600,overflowY:'auto'}}>
            {(() => {
              /* ═══ BİRLEŞİM STRATEJİSİ ═══
               * 1) tanımlamalar'dan gelen aktif evrak_turu listesi (kullanıcının ana listesi)
               * 2) dosya.evraklar'daki listede OLMAYAN evrak_turu değerleri (orphan uploads)
               * Hiçbir yüklü evrak kaybolmaz — liste farklı olsa bile görünür.
               */
              const evraklar = dosya.evraklar || [];
              const anaListe = evrakTurleri || [];
              const anaSet = new Set(anaListe);
              const orphanSet = new Set();
              evraklar.forEach(e => {
                const t = (e.evrak_turu || '').trim();
                if (t && !anaSet.has(t)) orphanSet.add(t);
              });
              const tumTurler = [...anaListe, ...Array.from(orphanSet)];

              /* ═══ TR-DUYARSIZ NORMALİZE (arama için) ═══ */
              const norm = (s) => (s || '').toLocaleUpperCase('tr-TR')
                .replace(/İ/g,'I').replace(/Ş/g,'S').replace(/Ç/g,'C')
                .replace(/Ö/g,'O').replace(/Ü/g,'U').replace(/Ğ/g,'G');
              const q = norm(aramaEvrak).trim();

              /* ═══ FİLTRE + SIRALAMA ═══
               * - Arama boş: Yüklü üstte (tarih yeni→eski), Beklenen altta (liste sırası)
               * - Arama varsa: İlk harften BAŞLAYANLAR önce, İçinde geçenler sonra.
               */
              const yukluTurler = [];
              const beklenenTurler = [];
              tumTurler.forEach(tur => {
                const yuklenen = evraklar.filter(e => e.evrak_turu === tur);
                if (yuklenen.length > 0) yukluTurler.push(tur);
                else beklenenTurler.push(tur);
              });
              yukluTurler.sort((a, b) => {
                const aEvrak = evraklar.find(e => e.evrak_turu === a);
                const bEvrak = evraklar.find(e => e.evrak_turu === b);
                const aDate = aEvrak?.created_at || '';
                const bDate = bEvrak?.created_at || '';
                return bDate.localeCompare(aDate);
              });

              let sirali;
              if (q === '') {
                sirali = [...yukluTurler, ...beklenenTurler];
              } else {
                const baslayan = [], iceren = [];
                [...yukluTurler, ...beklenenTurler].forEach(tur => {
                  const n = norm(tur);
                  if (n.startsWith(q)) baslayan.push(tur);
                  else if (n.includes(q)) iceren.push(tur);
                });
                sirali = [...baslayan, ...iceren];
              }

              if (sirali.length === 0) {
                return <div style={{padding:'30px 14px',textAlign:'center',fontSize:11,color:C.textMuted,fontWeight:600}}>
                  ARAMAYLA EŞLEŞEN EVRAK TÜRÜ BULUNAMADI
                </div>;
              }
              return sirali.map((tur, idx) => {
              const yuklenen = (dosya.evraklar||[]).filter(e => e.evrak_turu === tur);
              const yukluMu = yuklenen.length > 0;
              return (
                <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
                  margin:'4px 8px',borderRadius:10,
                  border: yukluMu ? `1px solid ${C.success}33` : `1px solid ${C.border}44`,
                  background: yukluMu ? `linear-gradient(180deg, ${C.success}0A 0%, ${C.success}04 100%)` : `linear-gradient(180deg, ${C.bgCard} 0%, ${C.bgHover}44 100%)`,
                  boxShadow: yukluMu ? `0 2px 8px -2px ${C.success}22, 0 1px 3px -1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)` : '0 2px 6px -2px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition:'all .15s ease'}}>
                  {/* SIRA NO */}
                  <span style={{fontSize:9,color:C.textMuted,minWidth:22,textAlign:'center',fontWeight:600}}>{idx+1}</span>
                  {/* DURUM İKONU */}
                  <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                    background:yukluMu ? `${C.success}22` : `${C.border}44`}}>
                    <LIcon name={yukluMu ? 'Check' : 'Minus'} size={15} color={yukluMu ? C.success : C.textMuted}/>
                  </div>
                  {/* EVRAK TÜRÜ ADI */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:yukluMu?700:500,color:yukluMu?C.text:C.textSec,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tur}</div>
                    {yukluMu && (
                      <div style={{fontSize:8,color:C.textMuted,marginTop:1}}>
                        {yuklenen.map(y => `${y.dosya_adi} (${(y.dosya_boyutu/1024).toFixed(0)}KB)`).join(', ')}
                        {!isAvukat && yuklenen[0]?.kullanici_adi ? ` • ${yuklenen[0].kullanici_adi}` : ''}
                        {yuklenen[0]?.created_at ? ` • ${yuklenen[0].created_at.split(' ')[0]}` : ''}
                      </div>
                    )}
                  </div>
                  {/* DURUM BADGE */}
                  {yukluMu ? (
                    <span style={{fontSize:8,fontWeight:800,color:C.success,background:`${C.success}18`,padding:'3px 8px',borderRadius:4,flexShrink:0}}>
                      YÜKLENDİ
                    </span>
                  ) : (
                    <span style={{fontSize:8,fontWeight:600,color:C.textMuted,padding:'3px 8px',flexShrink:0}}>
                      BEKLİYOR
                    </span>
                  )}
                  {/* BUTONLAR — 3D MİNİ */}
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    {yukluMu && yuklenen.map(y => (
                      <React.Fragment key={y.id}>
                        <button title="ÖN İZLEME" onClick={() => setPreviewEvrak(y)}
                          style={{...S.btnMini,...S.btnMiniP}}>
                          <LIcon name="Eye" size={10} color="#fff"/>
                        </button>
                        <button title="İNDİR" onClick={async () => {
                          try {
                            const token = MR.api.token;
                            const apiBase = MR.api.base || '/api/v1';
                            const r = await fetch(apiBase + '/evrak/download.php?id=' + y.id, {
                              headers: token ? {'Authorization': 'Bearer ' + token} : {},
                              credentials: 'include',
                              cache: 'no-cache'
                            });
                            if (!r.ok) {
                              let msg = 'İNDİRME HATASI: ' + r.status;
                              try { const j = await r.clone().json(); msg = j.error || msg; } catch(ex) {}
                              alert(msg); return;
                            }
                            const blob = await r.blob();
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = y.dosya_adi || 'evrak.pdf';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                          } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
                        }}
                          style={{...S.btnMini,...S.btnMiniS}}>
                          <LIcon name="Download" size={10} color="#fff"/>
                        </button>
                        {hasYetki('dosya','dosya-evrak-sil') && <button title="SİL" onClick={() => setDeleteConfirm({type:'evrak', id:y.id, text:y.dosya_adi})}
                          style={{...S.btnMini,...S.btnMiniD}}>
                          <LIcon name="Trash2" size={10} color="#fff"/>
                        </button>}
                      </React.Fragment>
                    ))}
                    {/* YÜKLE BUTONU */}
                    <label title="DOSYA YÜKLE" style={{...S.btn,...(yukluMu ? S.btnW : S.btnP), fontSize:10, padding:'7px 14px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5}}>
                      <LIcon name="Upload" size={12} color={yukluMu ? '#000' : '#fff'}/> YÜKLE
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.svg,.doc,.docx" style={{display:'none'}} onChange={async (ev) => {
                        const f = ev.target.files[0];
                        if (!f) return;
                        const izinli = ['application/pdf','image/jpeg','image/png','image/svg+xml','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                        if (!izinli.includes(f.type)) { alert('DESTEKLENMEYEN DOSYA TÜRÜ. İZİN VERİLENLER: PDF, JPG, PNG, SVG, DOC, DOCX'); ev.target.value=''; return; }
                        if (f.size > 512 * 1024 * 1024) { alert('DOSYA BOYUTU EN FAZLA 512MB OLABİLİR'); ev.target.value=''; return; }
                        const boyutMB = (f.size/1024/1024).toFixed(2);
                        try {
                          const r = await api.evrakUpload(dosya.id, tur, f);
                          if (r?.success) load();
                          else {
                            const hataMsg = r?.error || 'YÜKLEME HATASI';
                            // Sunucu limit hatası tespiti
                            if (hataMsg.includes('PHP limiti') || hataMsg.includes('post_max') || hataMsg.includes('upload_max')) {
                              alert('SUNUCU PHP LİMİTİ AŞILDI (' + boyutMB + ' MB dosya)\n\n' + hataMsg + '\n\nÇÖZÜM: Admin cPanel → MultiPHP INI Editor\'dan şu değerleri 512M yapmalı:\n- upload_max_filesize\n- post_max_size\n- memory_limit = 1024M');
                            } else {
                              alert(hataMsg);
                            }
                          }
                        } catch (e) {
                          /* HTTP 413 veya network hatası — sunucu ham cevabı */
                          const msg = (e?.message || '').toString();
                          if (msg.includes('413') || msg.includes('Request Entity Too Large')) {
                            alert('SUNUCU DOSYAYI REDDEDİYOR (' + boyutMB + ' MB)\n\nNeden: cPanel PHP INI ayarları düşük kalmış.\nÇözüm: Admin cPanel → MultiPHP INI Editor →\n upload_max_filesize = 512M\n post_max_size = 512M\n memory_limit = 1024M');
                          } else {
                            alert('YÜKLEME HATASI: ' + msg);
                          }
                        }
                        ev.target.value = '';
                      }}/>
                    </label>
                  </div>
                </div>
              );
            });})()}
          </div>
        </div>
      )}

      {/* DOSYA HESABI TAB */}
      {tab === 'hesap' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* v2.19: FİNANSAL ÖZET (BİLGİ sekmesinden buraya taşındı) */}
          <div style={{...S.card, background:`linear-gradient(135deg, ${C.bgCard} 0%, ${C.accent}05 100%)`}}>
            <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.accent}10`}}>
              <LIcon name="DollarSign" size={16} color={C.accent}/>
              <span style={{fontSize:13,fontWeight:800,letterSpacing:0.4}}>FİNANSAL ÖZET</span>
            </div>
            <div style={{padding:'14px 16px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                <div style={{padding:12,background:`${C.success}10`,borderRadius:10,border:`1px solid ${C.success}33`}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:700,letterSpacing:0.5,marginBottom:4}}>TOPLAM TAHSİLAT</div>
                  <div style={{fontSize:18,fontWeight:900,color:C.success,fontFamily:'monospace'}}>{fmt(dosya.tahsil_edilen || 0)}</div>
                </div>
                <div style={{padding:12,background:`${C.danger}10`,borderRadius:10,border:`1px solid ${C.danger}33`}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:700,letterSpacing:0.5,marginBottom:4}}>TOPLAM MASRAF</div>
                  <div style={{fontSize:18,fontWeight:900,color:C.danger,fontFamily:'monospace'}}>{fmt(dosya.toplam_masraf || 0)}</div>
                </div>
                <div style={{padding:12,background:`${C.cyan}10`,borderRadius:10,border:`1px solid ${C.cyan}33`}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:700,letterSpacing:0.5,marginBottom:4}}>TOPLAM GELİR (BEKLENENLERle)</div>
                  <div style={{fontSize:16,fontWeight:800,color:C.cyan,fontFamily:'monospace'}}>{fmt(dosya.toplam_gelir || 0)}</div>
                </div>
                <div style={{padding:12,background: (dosya.net_kar || 0) >= 0 ? `${C.success}15` : `${C.danger}15`, borderRadius:10, border:`2px solid ${(dosya.net_kar || 0) >= 0 ? C.success : C.danger}55`}}>
                  <div style={{fontSize:9,color:C.textMuted,fontWeight:700,letterSpacing:0.5,marginBottom:4}}>NET KAR</div>
                  <div style={{fontSize:18,fontWeight:900,color:(dosya.net_kar || 0) >= 0 ? C.success : C.danger,fontFamily:'monospace'}}>{fmt(dosya.net_kar || 0)}</div>
                </div>
              </div>
              <div style={{padding:12,background:`${C.accent}08`,borderRadius:10,border:`1px solid ${C.accent}22`}}>
                <div style={{fontSize:10,color:C.accent,fontWeight:700,letterSpacing:0.5,marginBottom:8}}>%50 - %50 PAYLAŞIM</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600,marginBottom:2}}>BENİM PAYIM (%50)</div>
                    <div style={{fontSize:16,fontWeight:800,color:C.accent,fontFamily:'monospace'}}>{fmt(dosya.benim_payim || 0)}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:C.textMuted,fontWeight:600,marginBottom:2}}>AVUKAT PAYI (%50)</div>
                    <div style={{fontSize:16,fontWeight:800,color:C.purple || '#8b5cf6',fontFamily:'monospace'}}>{fmt(dosya.avukat_payi || 0)}</div>
                  </div>
                </div>
              </div>
              <div style={{marginTop:10,display:'flex',justifyContent:'space-between',fontSize:10,color:C.textMuted}}>
                <span>MASRAF SAYISI: <b style={{color:C.text}}>{dosya.masraflar?.length || 0}</b></span>
                <span>EVRAK SAYISI: <b style={{color:C.text}}>{dosya.evraklar?.length || 0}</b></span>
              </div>
            </div>
          </div>

          {/* MASRAF ÖZETİ */}
          <div style={S.card}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.danger}06`}}>
              <LIcon name="Receipt" size={14} color={C.danger}/>
              <span style={{fontSize:12,fontWeight:700}}>DOSYA MASRAFLARI</span>
            </div>
            <div style={{padding:'10px 14px'}}>
              {dosya.masraflar?.length > 0 ? dosya.masraflar.map((m,i) => (
                <InfoRow key={i} label={m.masraf_kalemi} value={fmt(m.tutar)} color={C.danger}/>
              )) : <div style={{fontSize:11,color:C.textMuted,padding:10,textAlign:'center'}}>MASRAF KAYDI YOK</div>}
              <div style={{marginTop:8,paddingTop:8,borderTop:`2px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,fontWeight:800}}>TOPLAM MASRAF</span>
                <span style={{fontSize:14,fontWeight:800,color:C.danger}}>{fmt(dosya.toplam_masraf || 0)}</span>
              </div>
            </div>
          </div>

          {/* DOSYA KAPAT */}
          <div style={S.card}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.success}06`}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <LIcon name="CheckCircle" size={14} color={C.success}/>
                <span style={{fontSize:12,fontWeight:700}}>DOSYA KAPAT - HESAP ÖZETİ</span>
              </div>
              {dosya.asama !== 'DOSYA KAPANDI' && hasYetki('dosya','dosya-kapat') && (
                <button style={{...S.btn,...S.btnS,fontSize:10,padding:'5px 12px'}} onClick={() => {
                  api.kasaList().then(r => { if(r?.success) setKasalar(r.data||[]); });
                  // Avukat ödeme oranı: ortak varsa onun odeme_orani, yoksa komisyon_orani veya 50
                  const avukatOran = dosya.avukat_odeme_orani || dosya.komisyon_orani || 50;
                  setKapatForm({
                    tazminat:'', vekalet_ucreti:'', faiz:'', stopaj:'', kdv_oran:'20',
                    dosya_basi_odenen:'0', kasa_id:1, pay_orani: String(dosya.komisyon_orani || 50),
                    avukat_pay_orani: String(avukatOran)
                  });
                  setKapatModal(true);
                }}>
                  <LIcon name="Lock" size={12} color="#fff"/> DOSYAYI KAPAT
                </button>
              )}
            </div>
            <div style={{padding:'14px'}}>
              {dosya.asama === 'DOSYA KAPANDI' ? (
                <div style={{textAlign:'center',padding:20}}>
                  <div style={{width:60,height:60,borderRadius:'50%',background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                    <LIcon name="Check" size={28} color={C.success}/>
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:C.success,marginBottom:4}}>DOSYA KAPANDI</div>
                  <div style={{fontSize:11,color:C.textMuted}}>KAPANMA TARİHİ: {dosya.kapanma_tarihi || '-'}</div>
                </div>
              ) : (
                <div style={{textAlign:'center',padding:30,color:C.textMuted}}>
                  <LIcon name="Calculator" size={36} color={C.textMuted} style={{opacity:0.3,marginBottom:10}}/>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>DOSYA HENÜZ KAPANMADI</div>
                  <div style={{fontSize:11}}>DOSYAYI KAPATMAK İÇİN YUKARIDAKI BUTONA TIKLAYIN</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOSYA KAPAT MODAL */}
      <Modal open={kapatModal} onClose={() => setKapatModal(false)} title="DOSYA KAPAT - HESAP ÖZETİ" width="700px">
        {(() => {
          const t = parseFloat(kapatForm.tazminat) || 0;
          const sozlesmeOran = parseFloat(kapatForm.pay_orani) || 0;
          const sozlesme = t * sozlesmeOran / 100;
          const muvekkileHavale = t - sozlesme;
          const vekalet = parseFloat(kapatForm.vekalet_ucreti) || 0;
          const faiz = parseFloat(kapatForm.faiz) || 0;
          const stopaj = parseFloat(kapatForm.stopaj) || 0;
          const kdvOran = parseFloat(kapatForm.kdv_oran) || 0;
          const kdv = sozlesme * kdvOran / 100;
          const toplamKazanc = sozlesme + vekalet + faiz;
          const dosyaBasi = parseFloat(kapatForm.dosya_basi_odenen) || 0;
          const dosyaMasraflari = dosya.toplam_masraf || 0;
          const netKazanc = toplamKazanc - dosyaMasraflari;

          /* PAY BÖLÜŞÜMÜ: SABİT %50 - %50 */
          const avukatPayYuzde = 50;
          const mrPayYuzde = 50;
          const avukatHakedis = netKazanc * 50 / 100;
          const mrHakedis = netKazanc * 50 / 100;
          const kasayaAktarilacak = netKazanc;
          const kF = (k,v) => setKapatForm(p=>({...p,[k]:v}));

          const hesapRow = (label, val, opts={}) => (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',
              borderBottom:opts.border?`2px solid ${C.border}`:`1px solid ${C.border}`}}>
              <span style={{fontSize:11,fontWeight:opts.bold?800:500,color:opts.color||C.text}}>{label}</span>
              <span style={{fontSize:opts.big?16:12,fontWeight:opts.bold?800:600,color:opts.color||C.text,fontFamily:'monospace'}}>
                {fmt(val)}
              </span>
            </div>
          );

          const dosyaKapat = async () => {
            if (!t || t <= 0) { alert('TAZMİNAT TUTARI GİRMENİZ GEREKLİ'); return; }
            setKapatLoading(true);
            const gelirR = await api.gelirCreate({
              dosya_id: dosya.id, gelir_turu: 'TAZMİNAT ÖDEMESİ',
              tutar: kasayaAktarilacak,
              kasa_id: parseInt(kapatForm.kasa_id),
              aciklama: `${dosya.dosya_no} DOSYA KAPATMA - TAZMİNAT: ${fmt(t)}, NET KAZANÇ: ${fmt(netKazanc)}, AVUKAT HAKEDİŞ (%50): ${fmt(avukatHakedis)}, MR HAKEDİŞ (%50): ${fmt(mrHakedis)}`,
              tahsilat_durumu: 'tahsil_edildi'
            });
            const kapatR = await api.dosyaUpdate({
              id: dosya.id, asama: 'DOSYA KAPANDI',
              kapanma_tarihi: new Date().toISOString().split('T')[0]
            });
            if (kapatR?.success) { load(); setKapatModal(false); }
            else alert(kapatR?.error || 'DOSYA KAPATMA HATASI');
            setKapatLoading(false);
          };

          return (
            <div>
              {/* GİRİŞ ALANLARI */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                <FormGroup label="SİGORTA TAZMİNATI (ÇIKAN ÖDEME) *">
                  <input type="number" value={kapatForm.tazminat} onChange={e=>kF('tazminat',e.target.value)} placeholder="17.635,00" style={{...S.input,padding:'8px 10px',fontSize:12,fontWeight:700}}/>
                </FormGroup>
                <FormGroup label={`SÖZLEŞME ORANI (%${sozlesmeOran})`}>
                  <input type="number" min="0" max="100" value={kapatForm.pay_orani} onChange={e=>kF('pay_orani',e.target.value)} placeholder="20" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="KARŞI VEKALET ÜCRETİ">
                  <input type="number" value={kapatForm.vekalet_ucreti} onChange={e=>kF('vekalet_ucreti',e.target.value)} placeholder="8.817,00" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="FAİZ">
                  <input type="number" value={kapatForm.faiz} onChange={e=>kF('faiz',e.target.value)} placeholder="580,00" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="STOPAJ">
                  <input type="number" value={kapatForm.stopaj} onChange={e=>kF('stopaj',e.target.value)} placeholder="2.939,00" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="KDV ORANI (%)">
                  <input type="number" value={kapatForm.kdv_oran} onChange={e=>kF('kdv_oran',e.target.value)} placeholder="20" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
              </div>

              {/* AVUKAT BİLGİ BANNER */}
              {hasYetki('dosya','dosya-kapat') && dosya.avukat_adi && (
                <div style={{padding:10,background:`${C.purple}11`,borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',gap:12,border:`1px solid ${C.purple}33`}}>
                  <LIcon name="Scale" size={16} color={C.purple}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700}}>{dosya.avukat_adi}</div>
                    <div style={{fontSize:9,color:C.textSec}}>
                      {dosya.avukat_firma ? `${dosya.avukat_firma} • ` : ''}{dosya.avukat_baro || ''}
                    </div>
                  </div>
                  <div style={{textAlign:'center',padding:'6px 10px',background:`${C.purple}22`,borderRadius:6}}>
                    <div style={{fontSize:8,color:C.textMuted,fontWeight:600}}>PAY BÖLÜŞÜMÜ</div>
                    <div style={{fontSize:16,fontWeight:900,color:C.purple}}>%50 - %50</div>
                  </div>
                </div>
              )}

              {/* HESAP ÖZETİ */}
              <div style={{background:C.bgInput,borderRadius:10,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:800,color:C.accent,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                  <LIcon name="Calculator" size={14} color={C.accent}/> HESAP ÖZETİ
                </div>
                {hesapRow('SİGORTA ÖDEMESİ (TAZMİNAT)', t, {bold:true,color:C.accent})}
                {hesapRow(`SÖZLEŞME (%${sozlesmeOran})`, sozlesme)}
                {hesapRow('MÜVEKKİLE HAVALE', muvekkileHavale, {bold:true,border:true})}

                <div style={{marginTop:10}}/>
                {hesapRow('NET VEKALET ÜCRETİ', vekalet)}
                {hesapRow('FAİZ', faiz)}
                {hesapRow('STOPAJ', stopaj, {color:C.danger})}
                <div style={{marginTop:6}}/>
                {hesapRow(`KDV %${kdvOran}`, kdv)}

                <div style={{marginTop:10,paddingTop:10,borderTop:`2px solid ${C.accent}44`}}/>
                {hesapRow('TOPLAM KAZANÇ', toplamKazanc, {bold:true,color:C.success})}
                {hesapRow('DOSYA MASRAFLARI (SİSTEMDEN)', dosyaMasraflari, {bold:true,color:C.danger})}
                <div style={{marginTop:6,paddingTop:6,borderTop:`2px solid ${C.success}66`}}/>
                {hesapRow('NET KAZANÇ', netKazanc, {bold:true,color:C.success,big:true})}

                {hasYetki('dosya','dosya-kapat') && <>
                <div style={{marginTop:10,paddingTop:10,borderTop:`2px solid ${C.purple}44`}}/>
                <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:6,display:'flex',alignItems:'center',gap:4}}>
                  PAY BÖLÜŞÜMÜ (%50 - %50)
                </div>
                {hesapRow('AVUKAT HAKEDİŞİ (%50)', avukatHakedis, {bold:true,color:'#8b5cf6'})}
                {hesapRow('MR HASAR HAKEDİŞİ (%50)', mrHakedis, {bold:true,color:C.success,big:true,border:true})}
                </>}
              </div>

              {/* KASA SEÇİMİ */}
              {hasYetki('dosya','dosya-kapat') && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                <FormGroup label="KAZANÇ AKTARILACAK KASA">
                  <select value={kapatForm.kasa_id} onChange={e=>kF('kasa_id',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:12}}>
                    {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({fmt(k.bakiye)})</option>)}
                  </select>
                </FormGroup>
                <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}>
                  <div style={{padding:'10px 16px',background:`${C.success}11`,borderRadius:8,border:`1px solid ${C.success}33`,width:'100%'}}>
                    <div style={{fontSize:9,color:C.textMuted,marginBottom:2}}>KASAYA AKTARILACAK (NET KAZANÇ)</div>
                    <div style={{fontSize:16,fontWeight:800,color:C.success}}>{fmt(kasayaAktarilacak)}</div>
                  </div>
                </div>
              </div>}

              {/* ONAYLA */}
              <button onClick={dosyaKapat} disabled={kapatLoading || !t}
                style={{...S.btn,...S.btnS,justifyContent:'center',padding:14,width:'100%',fontSize:13,fontWeight:800}}>
                <LIcon name="CheckCircle" size={16} color="#fff"/>
                {kapatLoading ? 'KAPATILIYOR...' : (isAvukat ? 'DOSYAYI KAPAT' : 'DOSYAYI KAPAT VE KAZANCI KASAYA AKTAR')}
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* MODALLER */}
      <MR.MasrafEkle open={masrafM} onClose={() => setMasrafM(false)} dosyaId={dosya.id} onOk={load}/>

      {/* MASRAF ÖDEME MODAL */}
      <Modal open={masrafOdeModal} onClose={() => setMasrafOdeModal(false)} title="MASRAF ÖDEMESİ" width="420px">
        {masrafOdeItem && (
          <div style={{display:'grid',gap:12}}>
            <div style={{padding:12,background:`${C.accent}11`,borderRadius:8,border:`1px solid ${C.accent}33`}}>
              <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>MASRAF KALEMİ</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{masrafOdeItem.masraf_kalemi}</div>
              <div style={{fontSize:10,color:C.textSec,marginTop:4}}>{masrafOdeItem.aciklama || ''}</div>
            </div>
            <div style={{padding:12,background:`${C.danger}11`,borderRadius:8,textAlign:'center'}}>
              <div style={{fontSize:9,color:C.textMuted}}>ÖDENECEK TUTAR</div>
              <div style={{fontSize:24,fontWeight:900,color:C.danger}}>{fmt(masrafOdeItem.tutar)}</div>
            </div>
            <FormGroup label="KASA SEÇİNİZ *">
              <select value={masrafOdeKasa} onChange={e => setMasrafOdeKasa(e.target.value)}
                style={{...S.select,padding:'10px 12px',fontSize:12}}>
                <option value="">KASA SEÇİNİZ</option>
                {kasalar.filter(k => k.aktif !== false && k.aktif !== 0).map(k =>
                  <option key={k.id} value={k.id}>{k.ad} ({fmt(k.bakiye)})</option>
                )}
              </select>
            </FormGroup>
            <div style={{padding:8,background:`${C.warning}11`,borderRadius:6,fontSize:10,color:C.warning}}>
              ÖDEME YAPILDIĞINDA TUTAR SEÇİLEN KASADAN DÜŞÜLECEK.
              {masrafOdeItem.paydas_komisyon_id && ' PAYDAŞ CARİSİNDE DE OTOMATİK ÖDENDİ OLARAK GÜNCELLENECEKTİR.'}
            </div>
            <button onClick={async () => {
              if (!masrafOdeKasa) return;
              setMasrafOdeLoading(true);
              const r = await api.masrafOde({id: masrafOdeItem.id, kasa_id: parseInt(masrafOdeKasa)});
              setMasrafOdeLoading(false);
              if (r?.success) {
                setMasrafOdeModal(false);
                setMasrafOdeItem(null);
                load();
              }
            }} disabled={masrafOdeLoading || !masrafOdeKasa}
              style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,width:'100%',fontSize:12}}>
              <LIcon name="Wallet" size={14} color="#fff"/>
              {masrafOdeLoading ? 'ÖDENİYOR...' : 'ÖDEMEYİ ONAYLA'}
            </button>
          </div>
        )}
      </Modal>

      {/* EVRAK ÖNİZLEME MODAL (3:2 ORAN - ORTALI) */}
      {previewEvrak && (
        <div onClick={() => setPreviewEvrak(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <div onClick={e => e.stopPropagation()} style={{
            width:'min(900px, 85vw)', height:'min(600px, 80vh)',
            background:C.bgCard, borderRadius:14, overflow:'hidden',
            display:'flex', flexDirection:'column', cursor:'default',
            boxShadow:'0 25px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}08`,flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1}}>
                <LIcon name="Eye" size={14} color={C.accent}/>
                <span style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{previewEvrak.evrak_turu || previewEvrak.dosya_adi}</span>
                <span style={{fontSize:9,color:C.textMuted,flexShrink:0}}>({(previewEvrak.dosya_boyutu/1024).toFixed(0)}KB)</span>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={async () => {
                  try {
                    const token = MR.api.token;
                    const apiBase = MR.api.base || '/api/v1';
                    const r = await fetch(apiBase + '/evrak/download.php?id=' + previewEvrak.id, {
                      headers: token ? {'Authorization': 'Bearer ' + token} : {},
                      credentials: 'include',
                      cache: 'no-cache'
                    });
                    if (!r.ok) {
                      let msg = 'İNDİRME HATASI: ' + r.status;
                      try { const j = await r.clone().json(); msg = j.error || msg; } catch(ex) {}
                      alert(msg); return;
                    }
                    const blob = await r.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = previewEvrak.dosya_adi || 'evrak.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                  } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
                }}
                  style={{...S.btn,...S.btnS,padding:'6px 14px',fontSize:10}}>
                  <LIcon name="Download" size={11} color="#fff"/> İNDİR
                </button>
                <button onClick={() => setPreviewEvrak(null)}
                  style={{...S.btn,...S.btnD,padding:'6px 14px',fontSize:10}}>
                  <LIcon name="X" size={11} color="#fff"/> KAPAT
                </button>
              </div>
            </div>
            <div style={{flex:1,overflow:'hidden'}}>
              <EvrakPreviewIframe evrakId={previewEvrak.id}/>
            </div>
          </div>
        </div>
      )}

      {/* MASRAF / EVRAK SİL */}
      <Confirm open={!!deleteConfirm} message={deleteConfirm ? `"${deleteConfirm.text}" SİLİNSİN Mİ?` : ''}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm.type === 'masraf') masrafSil(deleteConfirm.id);
          else if (deleteConfirm.type === 'evrak') evrakSil(deleteConfirm.id);
        }}/>

      {/* PORTAL BİLGİ MODAL */}
      {portalModal.open && <Modal open={true} onClose={() => setPortalModal(p=>({...p,open:false}))} title={portalModal.mevcut ? 'MEVCUT PORTAL ERİŞİM BİLGİLERİ' : 'PORTAL ERİŞİMİ OLUŞTURULDU'} width="520px">
        <div style={{padding:4}}>
          {portalModal.mevcut && <div style={{padding:'8px 12px', background:`${C.warning}15`, border:`1px solid ${C.warning}33`, borderRadius:8, marginBottom:14, fontSize:11, color:C.warning, fontWeight:600}}>BU DOSYA İÇİN ZATEN AKTİF PORTAL ERİŞİMİ MEVCUT</div>}
          {!portalModal.mevcut && <div style={{padding:'8px 12px', background:`${C.success}15`, border:`1px solid ${C.success}33`, borderRadius:8, marginBottom:14, fontSize:11, color:C.success, fontWeight:600}}>PORTAL ERİŞİMİ BAŞARIYLA OLUŞTURULDU</div>}

          <div style={{fontSize:12, fontWeight:700, color:C.accent, marginBottom:10}}>MÜŞTERİ GİRİŞ BİLGİLERİ</div>

          <div style={{background:C.bgHover, borderRadius:8, padding:12, marginBottom:10, border:`1px solid ${C.border}`}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontSize:10, fontWeight:600, color:C.accent}}>MÜŞTERİ GİRİŞ SAYFASI LİNKİ</span>
              <button onClick={() => kopyala(portalModal.link.split('#')[0])} style={{...S.btn, padding:'3px 10px', fontSize:9, ...S.btnP}}>
                <LIcon name="Copy" size={10}/> KOPYALA
              </button>
            </div>
            <div style={{fontSize:9, color:C.textMuted, marginBottom:6}}>MÜŞTERİ BU LİNKTEN TC KİMLİK VE TELEFON İLE GİRİŞ YAPAR</div>
            <a href={portalModal.link.split('#')[0]} target="_blank" rel="noopener noreferrer" style={{display:'block', fontSize:11, color:C.accent, wordBreak:'break-all', fontFamily:'monospace', background:C.bgInput, padding:8, borderRadius:6, border:`1px solid ${C.borderLight}`, textDecoration:'underline', cursor:'pointer'}}>{portalModal.link.split('#')[0]}</a>
          </div>

          <div style={{background:C.bgHover, borderRadius:8, padding:12, marginBottom:10, border:`1px solid ${C.border}`}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontSize:10, fontWeight:600, color:C.warning}}>ADMİN İÇİN GÖRÜNTÜLEME LİNKİ</span>
              <button onClick={() => kopyala(portalModal.link)} style={{...S.btn, padding:'3px 10px', fontSize:9, ...S.btnP}}>
                <LIcon name="Copy" size={10}/> KOPYALA
              </button>
            </div>
            <div style={{fontSize:9, color:C.textMuted, marginBottom:6}}>BU LİNK DİREKT GİRİŞ SAĞLAR - SADECE ADMİN KULLANIMI İÇİN</div>
            <a href={portalModal.link} target="_blank" rel="noopener noreferrer" style={{display:'block', fontSize:11, color:C.warning, wordBreak:'break-all', fontFamily:'monospace', background:C.bgInput, padding:8, borderRadius:6, border:`1px solid ${C.borderLight}`, textDecoration:'underline', cursor:'pointer'}}>{portalModal.link}</a>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10}}>
            <div style={{background:C.bgHover, borderRadius:8, padding:12, border:`1px solid ${C.border}`}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                <span style={{fontSize:10, fontWeight:600, color:C.textMuted}}>TC KİMLİK</span>
                <button onClick={() => kopyala(portalModal.tc)} style={{...S.btn, padding:'2px 8px', fontSize:9, ...S.btnG}}><LIcon name="Copy" size={9}/></button>
              </div>
              <div style={{fontSize:14, fontWeight:700, letterSpacing:1}}>{portalModal.tc || 'TANIMLI DEĞİL'}</div>
            </div>
            <div style={{background:C.bgHover, borderRadius:8, padding:12, border:`1px solid ${C.border}`}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                <span style={{fontSize:10, fontWeight:600, color:C.textMuted}}>TELEFON</span>
                <button onClick={() => kopyala(portalModal.telefon)} style={{...S.btn, padding:'2px 8px', fontSize:9, ...S.btnG}}><LIcon name="Copy" size={9}/></button>
              </div>
              <div style={{fontSize:14, fontWeight:700}}>{portalModal.telefon || 'TANIMLI DEĞİL'}</div>
            </div>
          </div>

          <div style={{background:C.bgHover, borderRadius:8, padding:12, border:`1px solid ${C.border}`, marginBottom:14}}>
            <span style={{fontSize:10, fontWeight:600, color:C.textMuted}}>MÜŞTERİ</span>
            <div style={{fontSize:13, fontWeight:700, marginTop:2}}>{portalModal.adSoyad}</div>
          </div>

          <div style={{background:`${C.accent}08`, borderRadius:8, padding:12, border:`1px solid ${C.accent}22`}}>
            <div style={{fontSize:10, fontWeight:700, color:C.accent, marginBottom:6}}>MÜŞTERİ NASIL GİRİŞ YAPACAK?</div>
            <div style={{fontSize:11, color:C.textSec, lineHeight:1.6}}>
              1. <b>Giriş Sayfası Linkini</b> müşteriye iletin (WhatsApp, e-posta vb.)<br/>
              2. Müşteri TC Kimlik ve Telefon numarası ile giriş yapar<br/>
              3. <b>Admin Görüntüleme Linki</b> direkt giriş sağlar - sadece admin kullanımı içindir
            </div>
          </div>

          <div style={{marginTop:14, display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button onClick={() => kopyala(`Portal Giriş Bilgileri:\nGiriş Sayfası: ${portalModal.link.split('#')[0]}\nDirekt Link (Admin): ${portalModal.link}\nTC Kimlik: ${portalModal.tc}\nTelefon: ${portalModal.telefon}`)} style={{...S.btn, ...S.btnS, fontSize:11}}>
              <LIcon name="Copy" size={12}/> TÜM BİLGİLERİ KOPYALA
            </button>
            <button onClick={() => setPortalModal(p=>({...p,open:false}))} style={{...S.btn, ...S.btnG, fontSize:11}}>KAPAT</button>
          </div>
        </div>
      </Modal>}

      {/* AŞAMA DEĞİŞTİRME ONAY */}
      {asamaOnay && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',animation:'fadeIn .2s ease'}}>
          <div style={{background:C.bgCard,borderRadius:16,padding:0,width:480,maxWidth:'90vw',border:`1px solid ${C.border}`,boxShadow:'0 25px 50px -12px rgba(0,0,0,0.4)',overflow:'hidden'}}>
            <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,background:`${C.warning}08`}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:`${C.warning}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <LIcon name="AlertTriangle" size={20} color={C.warning}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:C.text}}>AŞAMA DEĞİŞİKLİĞİ ONAY</div>
                <div style={{fontSize:11,color:C.textSec,marginTop:2}}>EMİN MİSİNİZ?</div>
              </div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:16,lineHeight:1.6}}>
                <span style={{color:C.accent,fontWeight:800}}>{(magdur.ad_soyad || dosya.dosya_no || '').toUpperCase()}</span>'IN DOSYA AŞAMASI DEĞİŞTİRİLECEK. ONAYLIYOR MUSUNUZ?
              </div>
              <div style={{padding:'12px 16px',borderRadius:10,background:'#16a34a12',border:'1px solid #16a34a33',marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'#16a34a',lineHeight:1.7,opacity:0.85}}>
                  YAPACAĞINIZ DEĞİŞİKLİK SONRASI, SEÇİLEN AŞAMANIN EVRAKI MAĞDURA SMS İLE GÖNDERİLECEKTİR. LÜTFEN EVRAK YÜKLEMEYİ UNUTMAYINIZ.
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:8,background:`${C.accent}08`,border:`1px solid ${C.accent}22`}}>
                <LIcon name="ArrowRight" size={14} color={C.accent}/>
                <div style={{fontSize:12,color:C.textSec}}>
                  <span style={{fontWeight:600}}>YENİ AŞAMA:</span>{' '}
                  <span style={{fontWeight:800,color:C.accent}}>{asamaOnay}</span>
                </div>
              </div>
            </div>
            <div style={{padding:'16px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,justifyContent:'flex-end',background:`${C.bgHover}44`}}>
              <button style={{...S.btn,...S.btnG,fontSize:12}} onClick={() => setAsamaOnay(null)}>
                <LIcon name="X" size={14} color={C.textSec}/> İPTAL
              </button>
              <button style={{...S.btn,...S.btnP,fontSize:12}} onClick={asamaDegistirOnayla}>
                <LIcon name="Check" size={14} color="#fff"/> ONAYLA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOSYA SİL */}
      <Confirm open={dosyaSilConfirm} message={`"${dosya.dosya_no}" DOSYASI TAMAMEN SİLİNSİN Mİ? BU İŞLEM GERİ ALINAMAZ!`}
        onCancel={() => setDosyaSilConfirm(false)}
        onConfirm={dosyaSil}/>

      {/* DÜZENLEME MODAL */}
      <Modal open={editM} onClose={() => setEditM(false)} title="DOSYA BİLGİLERİ DÜZENLE — TÜM ALANLAR" width="780px">
        {editError && <div style={{padding:8,background:`${C.danger}18`,borderRadius:6,marginBottom:10,fontSize:11,color:C.danger,border:`1px solid ${C.danger}33`}}>{editError}</div>}

        {/* DOSYA BİLGİLERİ BÖLÜMÜ */}
        <div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
          <LIcon name="FileText" size={12} color={C.accent}/> DOSYA BİLGİLERİ
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <FormGroup label="DOSYA TÜRÜ">
            <select value={editForm.dosya_turu} onChange={e => u('dosya_turu',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="ADK">ADK</option>
              <option value="BH">BH</option>
              <option value="MDK">MDK</option>
            </select>
          </FormGroup>
          <FormGroup label="SİGORTA ŞİRKETİ">
            <select value={editForm.sigorta_sirket} onChange={e => u('sigorta_sirket',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(SIGORTA || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="HASAR DOSYA NO">
            <input value={editForm.hasar_no||''} onChange={e => u('hasar_no',e.target.value)} placeholder="HASAR DOSYA NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="DOSYA KAYNAĞI">
            <select value={editForm.dosya_kaynagi} onChange={e => u('dosya_kaynagi',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {KAYNAKLAR.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="PLAKA">
            <input value={editForm.plaka||''} onChange={e => u('plaka',e.target.value)} placeholder="34 XX 0000" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KAZA TARİHİ">
            <MR.DateInput value={editForm.kaza_tarihi||''} onChange={v => u('kaza_tarihi',v)} style={{padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KAZA İLİ">
            <select value={editForm.kaza_il} onChange={e => {u('kaza_il',e.target.value);u('kaza_ilce','');}} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="KAZA İLÇE">
            <select value={editForm.kaza_ilce||''} onChange={e => u('kaza_ilce',e.target.value)} disabled={!editForm.kaza_il} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {((ILCELER||{})[editForm.kaza_il]||[]).map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="HAKLILIK (%)">
            <input type="number" min="0" max="100" value={editForm.haklilik} onChange={e => u('haklilik',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KOMİSYON (%)">
            <input type="number" min="0" max="100" step="0.1" value={editForm.komisyon_orani} onChange={e => u('komisyon_orani',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          {/* v2.17: NOTER VEKALET düzenlenebilir hale getirildi */}
          <FormGroup label="NOTER VEKALET (TL)">
            <input type="number" min="0" step="0.01" value={editForm.noter_vekalet||''} onChange={e => u('noter_vekalet',e.target.value)} placeholder="0.00" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="HAK MAHRUMİYET TALEP">
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <div onClick={() => u('hak_mahrumiyet', 1)}
                style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                  background:editForm.hak_mahrumiyet==1?`${C.success}22`:'transparent',
                  color:editForm.hak_mahrumiyet==1?C.success:C.textMuted,
                  border:`1px solid ${editForm.hak_mahrumiyet==1?C.success+'66':C.border}`}}>VAR</div>
              <div onClick={() => u('hak_mahrumiyet', 0)}
                style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                  background:editForm.hak_mahrumiyet==0?`${C.danger}22`:'transparent',
                  color:editForm.hak_mahrumiyet==0?C.danger:C.textMuted,
                  border:`1px solid ${editForm.hak_mahrumiyet==0?C.danger+'66':C.border}`}}>YOK</div>
            </div>
          </FormGroup>
        </div>

        {/* AVUKAT SEÇİMİ BÖLÜMÜ */}
        <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:8,marginTop:4,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="Scale" size={12} color={C.purple}/> AVUKAT ATAMASI
        </div>
        <div style={{marginBottom:14}}>
          <FormGroup label="AVUKAT (İŞ ORTAĞI)">
            <select value={editForm.ortak_id || ''} onChange={e => u('ortak_id', e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11,fontWeight:600}}>
              <option value="">AVUKAT SEÇİNİZ</option>
              {ortaklar.map(o => (
                <option key={o.id} value={o.id}>
                  {o.ad_soyad}{o.firma ? ` - ${o.firma}` : ''}{o.baro ? ` (${o.baro})` : ''} — %{o.odeme_orani || 0}
                </option>
              ))}
            </select>
          </FormGroup>
          {(() => {
            const secili = ortaklar.find(o => String(o.id) === String(editForm.ortak_id));
            return secili ? (
              <div style={{marginTop:8,padding:10,background:`${C.purple}11`,borderRadius:8,border:`1px solid ${C.purple}33`,display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:8,background:`${C.purple}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <LIcon name="Scale" size={16} color={C.purple}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>{secili.ad_soyad}</div>
                  <div style={{fontSize:9,color:C.textSec}}>
                    {secili.firma ? `${secili.firma} • ` : ''}{secili.baro || ''}{secili.sicil_no ? ` • SİCİL: ${secili.sicil_no}` : ''}
                  </div>
                </div>
                <div style={{textAlign:'center',padding:'6px 12px',background:`${C.purple}22`,borderRadius:6}}>
                  <div style={{fontSize:8,color:C.textMuted,fontWeight:600}}>ÖDEME ORANI</div>
                  <div style={{fontSize:18,fontWeight:900,color:C.purple}}>%{secili.odeme_orani || 0}</div>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* DOSYA SORUMLUSU & PAYDAŞ ATAMASI */}
        <div style={{fontSize:10,fontWeight:700,color:C.success,marginBottom:8,marginTop:4,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="UserCheck" size={12} color={C.success}/> DOSYA SORUMLUSU & PAYDAS
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
          <FormGroup label="DOSYA SORUMLUSU (PERSONEL)">
            <select value={editForm.sorumlu_id || ''} onChange={e => u('sorumlu_id', e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SORUMLU SEÇİNİZ</option>
              {personeller.map(p => {
                const hasUser = !!p.user_id;
                return (
                  <option key={p.id} value={hasUser ? p.user_id : ''} disabled={!hasUser}>
                    {p.ad_soyad}{p.departman ? ` (${p.departman})` : ''}{!hasUser ? ' — KULLANICI HESABI YOK' : ''}
                  </option>
                );
              })}
            </select>
          </FormGroup>
          <FormGroup label="PAYDAŞ (YÖNLENDİREN)">
            <select value={editForm.paydas_id || ''} onChange={e => u('paydas_id', e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">PAYDAŞ SEÇİNİZ</option>
              {paydaslar.map(p => (
                <option key={p.id} value={p.id}>
                  {p.ad}{p.yetkili ? ` - ${p.yetkili}` : ''}{p.tur ? ` (${p.tur})` : ''}
                </option>
              ))}
            </select>
          </FormGroup>
        </div>
        {/* v2.13: SEÇİLİ SORUMLU PRİM KARTI — personel kartındaki prim_adk/prim_bh dosya türüne göre */}
        {(() => {
          const seciliSorumlu = personeller.find(p => String(p.user_id) === String(editForm.sorumlu_id));
          if (!seciliSorumlu) return null;
          const isBHd = editForm.dosya_turu === 'BH';
          const primAdk = parseFloat(seciliSorumlu.prim_adk) || 0;
          const primBh = parseFloat(seciliSorumlu.prim_bh) || 0;
          const aktifPrim = isBHd ? primBh : primAdk;
          return (
            <div style={{marginBottom:14,padding:10,background:`${C.success}10`,borderRadius:8,border:`1px solid ${C.success}33`,display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:8,background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <LIcon name="UserCheck" size={16} color={C.success}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700}}>{seciliSorumlu.ad_soyad}</div>
                <div style={{fontSize:9,color:C.textSec}}>
                  {seciliSorumlu.departman || ''}{seciliSorumlu.pozisyon ? ` • ${seciliSorumlu.pozisyon}` : ''}
                </div>
              </div>
              {(primAdk > 0 || primBh > 0) ? (
                <div style={{display:'flex',gap:6}}>
                  <div style={{textAlign:'center',padding:'5px 10px',background:isBHd?C.bgHover:`${C.success}22`,borderRadius:6,opacity:isBHd?0.6:1}}>
                    <div style={{fontSize:8,color:C.textMuted,fontWeight:600}}>ADK PRİM</div>
                    <div style={{fontSize:14,fontWeight:900,color:C.success}}>₺{primAdk}</div>
                  </div>
                  <div style={{textAlign:'center',padding:'5px 10px',background:isBHd?`${C.success}22`:C.bgHover,borderRadius:6,opacity:isBHd?1:0.6}}>
                    <div style={{fontSize:8,color:C.textMuted,fontWeight:600}}>BH PRİM</div>
                    <div style={{fontSize:14,fontWeight:900,color:C.success}}>₺{primBh}</div>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:9,color:C.textMuted,fontStyle:'italic'}}>Prim tanımı yok</div>
              )}
            </div>
          );
        })()}

        {/* v2.13: SİGORTA & EKSPER & SERVİS BÖLÜMÜ — v2.14: POLİÇE NO, SİGORTA BRANŞI, SİGORTA TÜRÜ, DOSYA TALEP TÜRÜ kaldırıldı */}
        <div style={{fontSize:10,fontWeight:700,color:C.warning,marginBottom:8,marginTop:4,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="Shield" size={12} color={C.warning}/> SİGORTA & EKSPER & SERVİS
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <FormGroup label="SORUMLU SİGORTA ŞİRKETİ">
            <select value={editForm.sorumlu_sigorta||''} onChange={e => u('sorumlu_sigorta',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(SIGORTA || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="EKSPER FİRMA">
            <select value={editForm.eksper_firma||''} onChange={e => u('eksper_firma',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {paydaslar.filter(p => (p.tur||'').toLowerCase() === 'eksper').map(p => (
                <option key={p.id} value={p.ad}>{p.ad}{p.yetkili ? ` - ${p.yetkili}` : ''}</option>
              ))}
              <option value="__manuel__" disabled>──── MANUEL GİRİŞ ────</option>
            </select>
            {editForm.eksper_firma && !paydaslar.find(p => p.ad === editForm.eksper_firma && (p.tur||'').toLowerCase() === 'eksper') && (
              <input value={editForm.eksper_firma} onChange={e => u('eksper_firma',e.target.value)} placeholder="EKSPER FİRMA ADI" style={{...S.input,padding:'8px 10px',fontSize:11,marginTop:4}}/>
            )}
          </FormGroup>
          <FormGroup label="ONARIM SERVİSİ">
            <select value={editForm.onarim_servisi||''} onChange={e => u('onarim_servisi',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {paydaslar.filter(p => {
                const t = (p.tur||'').toLowerCase();
                return t === 'servis' || t === 'kaportaci' || t === 'kaportacı';
              }).map(p => (
                <option key={p.id} value={p.ad}>{p.ad}{p.tur ? ` (${p.tur})` : ''}</option>
              ))}
            </select>
            {editForm.onarim_servisi && !paydaslar.find(p => p.ad === editForm.onarim_servisi) && (
              <input value={editForm.onarim_servisi} onChange={e => u('onarim_servisi',e.target.value)} placeholder="SERVİS ADI" style={{...S.input,padding:'8px 10px',fontSize:11,marginTop:4}}/>
            )}
          </FormGroup>
        </div>

        {/* MAĞDUR BİLGİLERİ BÖLÜMÜ — v2.14: TELEFON 2, İL, İLÇE, CİNSİYET, MESLEK, E-POSTA kaldırıldı */}
        <div style={{fontSize:10,fontWeight:700,color:C.cyan,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="User" size={12} color={C.cyan}/> MAĞDUR BİLGİLERİ
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <FormGroup label="AD SOYAD">
            <input value={editForm.magdur_ad_soyad||''} onChange={e => u('magdur_ad_soyad',e.target.value)} placeholder="AD SOYAD" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="T.C. KİMLİK NO">
            <input value={editForm.magdur_tc_kimlik||''} onChange={e => u('magdur_tc_kimlik',e.target.value)} placeholder="T.C. KİMLİK" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input value={editForm.magdur_telefon||''} onChange={e => u('magdur_telefon',e.target.value)} placeholder="05XX XXX XX XX" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="IBAN">
            <MR.IBANInput value={editForm.magdur_iban||''} onChange={v => u('magdur_iban',v)} style={{padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="DOĞUM TARİHİ">
            <MR.DateInput value={editForm.magdur_dogum_tarihi||''} onChange={v => u('magdur_dogum_tarihi',v)} style={{padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
        </div>
        {/* v2.18: ADRES alanı KESINLIKLE kaldırıldı */}
        {/* v2.13: BH için ek mağdur alanları + GELİR DURUMU */}
        {editForm.dosya_turu === 'BH' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14,padding:10,background:`${C.cyan}08`,borderRadius:8,border:`1px solid ${C.cyan}22`}}>
            <FormGroup label="GELİR DURUMU">
              <select value={editForm.magdur_gelir_durumu||''} onChange={e => u('magdur_gelir_durumu',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
                <option value="">SEÇİNİZ</option>
                <option value="ASGARİ ÜCRET">ASGARİ ÜCRET</option>
                <option value="ASGARİ ÜCRET ÜSTÜ">ASGARİ ÜCRET ÜSTÜ</option>
                <option value="SERBEST MESLEK">SERBEST MESLEK</option>
                <option value="EMEKLİ">EMEKLİ</option>
                <option value="ÖĞRENCİ">ÖĞRENCİ</option>
                <option value="ÇALIŞMIYOR">ÇALIŞMIYOR</option>
              </select>
            </FormGroup>
            <FormGroup label="GELİR TUTARI (TL)">
              <input type="number" min="0" step="0.01" value={editForm.magdur_gelir_tutari||''} onChange={e => u('magdur_gelir_tutari',e.target.value)} placeholder="0.00" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
            </FormGroup>
            <FormGroup label="SAKATLIK / YARALANMA AÇIKLAMASI">
              <textarea value={editForm.sakatlik_aciklama||''} onChange={e => u('sakatlik_aciklama',e.target.value)} placeholder="SAKATLIK ORANI, AÇIKLAMA, YARALANMA TÜRÜ..." style={{...S.input,minHeight:50,padding:'8px 10px',fontSize:11,resize:'vertical',gridColumn:'1 / -1'}}/>
            </FormGroup>
          </div>
        )}

        {/* v2.13: BH için SÜRÜCÜ & KUSUR (mağdur sürücüyse) */}
        {editForm.dosya_turu === 'BH' && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:C.danger,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <LIcon name="UserCog" size={12} color={C.danger}/> SÜRÜCÜ & KUSUR (BH)
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <FormGroup label="SÜRÜCÜ ADI SOYADI">
                <input value={editForm.surucu_ad||''} onChange={e => u('surucu_ad',e.target.value)} placeholder="SÜRÜCÜ ADI SOYADI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="EHLİYET NO">
                <input value={editForm.surucu_ehliyet||''} onChange={e => u('surucu_ehliyet',e.target.value)} placeholder="EHLİYET NUMARASI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="KUSUR ORANI (%)">
                <input type="number" min="0" max="100" value={editForm.surucu_kusur||''} onChange={e => u('surucu_kusur',e.target.value)} placeholder="0-100" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
            </div>
          </>
        )}

        {/* MAĞDUR ARAÇ BİLGİLERİ — v2.17: BH için de gösterilir (mağdur aracı düzenlenebilsin) */}
        {(editForm.dosya_turu === 'ADK' || editForm.dosya_turu === 'MDK' || editForm.dosya_turu === 'BH') && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:C.warning,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <LIcon name="Truck" size={12} color={C.warning}/> MAĞDUR ARAÇ BİLGİLERİ
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {/* v2.13: Araç plaka/marka/model/yıl/kasko alanları eklendi */}
              <FormGroup label="PLAKA">
                <input value={editForm.ma_plaka||''} onChange={e => u('ma_plaka',e.target.value.toUpperCase())} placeholder="34 XX 0000" style={{...S.input,padding:'8px 10px',fontSize:11,fontWeight:700,letterSpacing:1}}/>
              </FormGroup>
              <FormGroup label="MARKA">
                {MR.AracMarkaSelect ? <MR.AracMarkaSelect value={editForm.ma_marka||''} onChange={v => {u('ma_marka',v);u('ma_model','');}}/>
                  : <input value={editForm.ma_marka||''} onChange={e => u('ma_marka',e.target.value)} placeholder="MARKA" style={{...S.input,padding:'8px 10px',fontSize:11}}/>}
              </FormGroup>
              <FormGroup label="MODEL / PAKET">
                {MR.AracModelSelect ? <MR.AracModelSelect marka={editForm.ma_marka||''} value={editForm.ma_model||''} onChange={v => u('ma_model',v)}/>
                  : <input value={editForm.ma_model||''} onChange={e => u('ma_model',e.target.value)} placeholder="MODEL" style={{...S.input,padding:'8px 10px',fontSize:11}}/>}
              </FormGroup>
              <FormGroup label="MODEL YILI">
                <select value={editForm.ma_model_yili||''} onChange={e => u('ma_model_yili',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
                  <option value="">SEÇİNİZ</option>
                  {Array.from({length:30},(_,i)=>2026-i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="KASKO">
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <div onClick={() => u('ma_kasko',1)}
                    style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                      background:editForm.ma_kasko==1?`${C.success}22`:'transparent',
                      color:editForm.ma_kasko==1?C.success:C.textMuted,
                      border:`1px solid ${editForm.ma_kasko==1?C.success+'66':C.border}`}}>VAR</div>
                  <div onClick={() => u('ma_kasko',0)}
                    style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                      background:editForm.ma_kasko==0?`${C.danger}22`:'transparent',
                      color:editForm.ma_kasko==0?C.danger:C.textMuted,
                      border:`1px solid ${editForm.ma_kasko==0?C.danger+'66':C.border}`}}>YOK</div>
                </div>
              </FormGroup>
              <FormGroup label="ARAÇ SAHİBİ ADI SOYADI">
                <input value={editForm.ma_ruhsat_sahibi||''} onChange={e => u('ma_ruhsat_sahibi',e.target.value)} placeholder="ARAÇ SAHİBİ" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="ARAÇ SAHİBİ TC KİMLİK NO">
                <input value={editForm.ma_tc_kimlik||''} onChange={e => u('ma_tc_kimlik',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="BELGE TESCİL NO">
                <input value={editForm.ma_belge_tescil_no||''} onChange={e => u('ma_belge_tescil_no',e.target.value)} placeholder="BELGE TESCİL NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="ONARIM GÜN SÜRESİ">
                <input type="number" min="0" value={editForm.ma_onarim_gun_suresi||''} onChange={e => u('ma_onarim_gun_suresi',e.target.value)} placeholder="GÜN" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="GEÇMİŞ HASAR">
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <div onClick={() => u('ma_gecmis_hasar','var')}
                    style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                      background:editForm.ma_gecmis_hasar==='var'?`${C.danger}22`:'transparent',
                      color:editForm.ma_gecmis_hasar==='var'?C.danger:C.textMuted,
                      border:`1px solid ${editForm.ma_gecmis_hasar==='var'?C.danger+'66':C.border}`}}>VAR</div>
                  <div onClick={() => u('ma_gecmis_hasar','yok')}
                    style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                      background:editForm.ma_gecmis_hasar==='yok'?`${C.success}22`:'transparent',
                      color:editForm.ma_gecmis_hasar==='yok'?C.success:C.textMuted,
                      border:`1px solid ${editForm.ma_gecmis_hasar==='yok'?C.success+'66':C.border}`}}>YOK</div>
                </div>
              </FormGroup>
            </div>
          </>
        )}

        {/* KARŞI ARAÇ BİLGİLERİ */}
        {(editForm.dosya_turu === 'ADK' || editForm.dosya_turu === 'MDK') && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:C.danger,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <LIcon name="Truck" size={12} color={C.danger}/> KARŞI ARAÇ BİLGİLERİ
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {/* v2.13: Karşı araç PLAKA alanı eklendi */}
              <FormGroup label="PLAKA">
                <input value={editForm.ka_plaka||''} onChange={e => u('ka_plaka',e.target.value.toUpperCase())} placeholder="34 XX 0000" style={{...S.input,padding:'8px 10px',fontSize:11,fontWeight:700,letterSpacing:1}}/>
              </FormGroup>
              <FormGroup label="ARAÇ SAHİBİ ADI SOYADI">
                <input value={editForm.ka_ruhsat_sahibi||''} onChange={e => u('ka_ruhsat_sahibi',e.target.value)} placeholder="ARAÇ SAHİBİ" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="ARAÇ SAHİBİ TC KİMLİK NO">
                <input value={editForm.ka_tc_kimlik||''} onChange={e => u('ka_tc_kimlik',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="MARKA">
                <MR.AracMarkaSelect value={editForm.ka_marka||''} onChange={v => {u('ka_marka',v);u('ka_model','');}}/>
              </FormGroup>
              <FormGroup label="MODEL / PAKET">
                <MR.AracModelSelect marka={editForm.ka_marka||''} value={editForm.ka_model||''} onChange={v => u('ka_model',v)}/>
              </FormGroup>
              <FormGroup label="MODEL YILI">
                <select value={editForm.ka_model_yili||''} onChange={e => u('ka_model_yili',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
                  <option value="">SEÇİNİZ</option>
                  {Array.from({length:30},(_,i)=>2026-i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="BELGE TESCİL NO">
                <input value={editForm.ka_belge_tescil_no||''} onChange={e => u('ka_belge_tescil_no',e.target.value)} placeholder="BELGE TESCİL NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="TRAFİK SİGORTA ŞİRKETİ">
                <select value={editForm.ka_trafik_sirket||''} onChange={e => u('ka_trafik_sirket',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
                  <option value="">SEÇİNİZ</option>
                  {(SIGORTA || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormGroup>
              {/* v2.14: KARŞI ARAÇ POLİÇE NO kaldırıldı */}
              <FormGroup label="KASKO">
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <div onClick={() => u('ka_kasko',1)}
                    style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                      background:editForm.ka_kasko==1?`${C.success}22`:'transparent',
                      color:editForm.ka_kasko==1?C.success:C.textMuted,
                      border:`1px solid ${editForm.ka_kasko==1?C.success+'66':C.border}`}}>VAR</div>
                  <div onClick={() => u('ka_kasko',0)}
                    style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                      background:editForm.ka_kasko==0?`${C.danger}22`:'transparent',
                      color:editForm.ka_kasko==0?C.danger:C.textMuted,
                      border:`1px solid ${editForm.ka_kasko==0?C.danger+'66':C.border}`}}>YOK</div>
                </div>
              </FormGroup>
              <FormGroup label="RUHSAT SAHİBİ / SÜRÜCÜ">
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <div onClick={() => u('ka_ruhsat_sahibi_surucu','ayni')}
                    style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                      background:editForm.ka_ruhsat_sahibi_surucu==='ayni'?`${C.success}22`:'transparent',
                      color:editForm.ka_ruhsat_sahibi_surucu==='ayni'?C.success:C.textMuted,
                      border:`1px solid ${editForm.ka_ruhsat_sahibi_surucu==='ayni'?C.success+'66':C.border}`}}>AYNI</div>
                  <div onClick={() => u('ka_ruhsat_sahibi_surucu','farkli')}
                    style={{padding:'4px 12px',borderRadius:5,fontSize:10,fontWeight:700,cursor:'pointer',
                      background:editForm.ka_ruhsat_sahibi_surucu==='farkli'?`${C.warning}22`:'transparent',
                      color:editForm.ka_ruhsat_sahibi_surucu==='farkli'?C.warning:C.textMuted,
                      border:`1px solid ${editForm.ka_ruhsat_sahibi_surucu==='farkli'?C.warning+'66':C.border}`}}>FARKLI</div>
                </div>
              </FormGroup>
              {editForm.ka_ruhsat_sahibi_surucu === 'farkli' && (
                <>
                  <FormGroup label="SÜRÜCÜ ADI SOYADI">
                    <input value={editForm.ka_surucu_ad||''} onChange={e => u('ka_surucu_ad',e.target.value)} placeholder="SÜRÜCÜ ADI SOYADI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
                  </FormGroup>
                  <FormGroup label="SÜRÜCÜ TC KİMLİK NO">
                    <input value={editForm.ka_surucu_tc_kimlik||''} onChange={e => u('ka_surucu_tc_kimlik',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
                  </FormGroup>
                </>
              )}
            </div>
          </>
        )}

        {/* NOTLAR */}
        <div style={{fontSize:10,fontWeight:700,color:C.textSec,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="Edit3" size={12} color={C.textSec}/> NOTLAR
        </div>
        <textarea value={editForm.notlar||''} onChange={e => u('notlar',e.target.value)} placeholder="DOSYA İLE İLGİLİ NOTLAR..."
          style={{...S.input,minHeight:60,padding:'8px 10px',fontSize:11,resize:'vertical',marginBottom:14}}/>

        {/* KAYDET */}
        <button onClick={dosyaGuncelle} disabled={editLoading}
          style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,width:'100%',fontSize:12}}>
          {editLoading ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
        </button>
      </Modal>
    </div>
  );
};

// MASRAF EKLEME MODAL
MR.MasrafEkle = ({open, onClose, dosyaId, onOk}) => {
  const {C, S, Modal, FormGroup, api, MASRAF_K, today} = MR;
  const [f, sF] = useState({masraf_kalemi:'',tutar:'',kasa_id:1,aciklama:'',islem_tarihi:today()});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kasalar, setKasalar] = useState([]);

  useEffect(() => {
    if (open) {
      api.kasaList().then(r => { if (r?.success) setKasalar(r.data || []); });
    }
  }, [open]);

  const go = async () => {
    if (!f.masraf_kalemi || !f.tutar) { setError('KALEM VE TUTAR GEREKLİ'); return; }
    setLoading(true); setError('');
    const r = await api.masrafCreate({...f, dosya_id:dosyaId, tutar:parseFloat(f.tutar)});
    if (r?.success) { onOk(); onClose(); sF({masraf_kalemi:'',tutar:'',kasa_id:1,aciklama:'',islem_tarihi:today()}); }
    else setError(r?.error || 'HATA');
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="MASRAF EKLE" width="480px">
      {error && <div style={{padding:8,background:`${C.danger}18`,borderRadius:6,marginBottom:10,fontSize:11,color:C.danger}}>{error}</div>}
      <div style={{display:'grid',gap:10}}>
        <FormGroup label="MASRAF KALEMİ">
          <select value={f.masraf_kalemi} onChange={e => sF({...f,masraf_kalemi:e.target.value})} style={{...S.select,padding:'8px 10px',fontSize:11}}>
            <option value="">SEÇİNİZ</option>
            {MASRAF_K.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="TUTAR (₺)">
          <input type="number" value={f.tutar} onChange={e => sF({...f,tutar:e.target.value})} placeholder="0.00" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <FormGroup label="KASA">
          <select value={f.kasa_id} onChange={e => sF({...f,kasa_id:parseInt(e.target.value)})} style={{...S.select,padding:'8px 10px',fontSize:11}}>
            {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({MR.fmt(k.bakiye)})</option>)}
          </select>
        </FormGroup>
        <FormGroup label="TARİH">
          <MR.DateInput value={f.islem_tarihi} onChange={v => sF({...f,islem_tarihi:v})} style={{padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <FormGroup label="AÇIKLAMA">
          <input value={f.aciklama} onChange={e => sF({...f,aciklama:e.target.value})} placeholder="İSTEĞE BAĞLI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <div style={{padding:8,background:`${C.warning}11`,borderRadius:6,fontSize:10,color:C.warning}}>
          MASRAF TUTARI KASA BAKİYESİNDEN OTOMATİK DÜŞÜLECEK.
        </div>
        <button onClick={go} disabled={loading} style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,fontSize:12}}>
          {loading ? 'KAYDEDİLİYOR...' : 'MASRAFI KAYDET'}
        </button>
      </div>
    </Modal>
  );
};

// EVRAK YÜKLEME - ARTIK İNLİNE (EVRAK TAB İÇİNDE SATIR SATIR YÜKLEME)
