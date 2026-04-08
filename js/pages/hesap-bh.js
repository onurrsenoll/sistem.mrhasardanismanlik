// BH (Bedeni Hasar) Hesaplama Sayfası - Profesyonel Tazminat Robotu
(() => {
  'use strict';

  const { useState, useEffect, useMemo, useCallback } = React;

  window.MR = window.MR || {};

  MR.HesapBHPage = ({setPage, user}) => {
    const hy = (k) => MR.hasYetki(user, 'hesaplamalar', k);
    // MOD SEÇİMİ
    const [mod, setMod] = useState('hizli');

    // FORM STATE
    const [form, setForm] = useState({
      dosyaNo: '',
      dosyaAdi: '',
      davaTuru: 'TRAFIK_KAZASI',
      magdurAdi: '',
      dogumTarihi: '',
      cinsiyet: 'ERKEK',
      kazaTarihi: '',
      hesapTarihi: new Date().toISOString().split('T')[0],
      yasalFaizTarihi: '',
      maluliyetOrani: '',
      meslek: '',
      aylikGelir: '',
      asgariUcretKullan: false,
      asgariUcretTuru: 'BEKAR',
      maasNet: true,
      maasGuncel: true,
      pmfTablosu: 'TRH2010',
      teknikFaiz: '1.8',
      kusurOrani: '100',
      // GEÇİCİ İŞ GÖREMEZLİK
      gigsAktif: false,
      gigsGun: '0',
      // BAKICI
      bakiciAktif: false,
      bakiciGun: '0',
      // PSD
      psdAktif: false,
      psdTutari: '0',
      // SEÇENEKLER
      tamHayat: false,
      yasYuvarla: false,
      yilSonunaKaydir: false,
      bakiyeKazadan: false,
      emeklilikYasi: '65'
    });

    // OCR & DOSYALAR
    const [dosyalar, setDosyalar] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [ocrYukleniyor, setOcrYukleniyor] = useState(false);
    const [ocrSonuc, setOcrSonuc] = useState(null);

    // HESAPLAMA
    const [sonuc, setSonuc] = useState(null);
    const [hesaplaniyor, setHesaplaniyor] = useState(false);

    // AI ANALİZ
    const [aiAnaliz, setAiAnaliz] = useState(null);
    const [aiYukleniyor, setAiYukleniyor] = useState(false);

    // PDF
    const [pdfYukleniyor, setPdfYukleniyor] = useState(false);

    // EMSAL
    const [emsalArama, setEmsalArama] = useState('');

    const C = MR.C, S = MR.S;

    const DAVA_TURLERI = [
      { value: 'TRAFIK_KAZASI', label: 'TRAFİK KAZASI' },
      { value: 'IS_KAZASI', label: 'İŞ KAZASI' },
      { value: 'MALPRAKTIS', label: 'MALPRAKTİS' },
      { value: 'DIGER', label: 'DİĞER' }
    ];

    // FORM DEĞİŞİKLİĞİ
    const handleChange = (key, value) => {
      setForm(prev => ({ ...prev, [key]: value }));
    };

    // DOSYA YÜKLEME
    const handleDosyaEkle = (files) => {
      const yeniDosyalar = Array.from(files).filter(f => {
        const uzanti = f.name.split('.').pop().toLowerCase();
        return ['pdf', 'jpg', 'jpeg', 'png'].includes(uzanti);
      });
      setDosyalar(prev => [...prev, ...yeniDosyalar]);
    };

    const dosyaCikar = (index) => {
      setDosyalar(prev => prev.filter((_, i) => i !== index));
    };

    // OCR ANALİZ
    const ocrAnaliz = async () => {
      if (dosyalar.length === 0) { alert('LÜTFEN EN AZ BİR DOSYA YÜKLEYİNİZ'); return; }
      setOcrYukleniyor(true);
      try {
        const fd = new FormData();
        dosyalar.forEach((f, i) => fd.append('dosya_' + i, f));
        fd.append('dosya_sayisi', dosyalar.length);
        fd.append('tip', 'bh');
        const headers = {};
        if (MR.api.token) headers['Authorization'] = 'Bearer ' + MR.api.token;
        const resp = await fetch('/api/v1/hesap/ocr-analiz.php', { method: 'POST', headers: headers, body: fd });
        const data = await resp.json();
        if (data.success && data.data) {
          setOcrSonuc(data.data);
          if (data.data.magdurAdi) handleChange('magdurAdi', data.data.magdurAdi);
          if (data.data.dogumTarihi) handleChange('dogumTarihi', data.data.dogumTarihi);
          if (data.data.cinsiyet) handleChange('cinsiyet', data.data.cinsiyet.toUpperCase());
          if (data.data.kazaTarihi) handleChange('kazaTarihi', data.data.kazaTarihi);
          if (data.data.maluliyetOrani) handleChange('maluliyetOrani', data.data.maluliyetOrani.toString());
          if (data.data.meslek) handleChange('meslek', data.data.meslek);
          if (data.data.aylikGelir) handleChange('aylikGelir', data.data.aylikGelir.toString());
          alert('OCR ANALİZİ TAMAMLANDI!\nBİLGİLER FORMA AKTARILDI.');
        } else {
          alert(data.error || data.message || 'OCR ANALİZİ BAŞARISIZ');
        }
      } catch (err) {
        console.error('OCR hatası:', err);
        alert('OCR HATASI: ' + err.message);
      } finally {
        setOcrYukleniyor(false);
      }
    };

    // ─── HESAPLAMA MOTORU ───
    const hesaplaTemel = (teknikFaiz, pmfTablosu) => {
      const dogumTarihi = new Date(form.dogumTarihi);
      const kazaTarihi = new Date(form.kazaTarihi);
      let hesapTarihi = new Date(form.hesapTarihi || new Date());

      if (form.yilSonunaKaydir) {
        hesapTarihi = new Date(hesapTarihi.getFullYear(), 11, 31);
      }

      const cinsiyet = form.cinsiyet;
      const maluliyet = MR.parseNum(form.maluliyetOrani);
      const faiz = teknikFaiz;
      const kusur = MR.parseNum(form.kusurOrani) || 100;

      // YAŞ
      let yas = MR.yasHesapla(dogumTarihi, kazaTarihi);
      if (form.yasYuvarla) yas = Math.round(yas);

      // GELİR
      let aylikGelir = 0;
      let asgariUcretYil = null;
      if (form.asgariUcretKullan) {
        const asgariData = MR.asgariUcretBul(kazaTarihi);
        if (asgariData) {
          aylikGelir = asgariData.ucret;
          asgariUcretYil = asgariData.yil;
        }
      } else {
        aylikGelir = MR.parseNum(form.aylikGelir);
      }

      // BRÜT/NET DÖNÜŞÜM (2024-2026 güncel vergi dilimleri)
      if (!form.maasNet && aylikGelir > 0) {
        // Vergi+SGK kesinti oranı gelir düzeyine göre dinamik
        const brutYillik = aylikGelir * 12;
        const kesintiOrani = brutYillik <= 200000 ? 0.15 : brutYillik <= 400000 ? 0.17 : brutYillik <= 700000 ? 0.19 : 0.21;
        aylikGelir = aylikGelir * (1 - kesintiOrani);
      }

      // PMF VE KALAN ÖMÜR
      const cinsiyetKod = cinsiyet === 'ERKEK' ? 'E' : 'K';
      const hesapYasi = form.bakiyeKazadan ? yas : MR.yasHesapla(dogumTarihi, hesapTarihi);
      const kalanOmur = MR.pmfDeger(pmfTablosu, cinsiyetKod, hesapYasi);

      // AKTİF/PASİF DÖNEM (emeklilik yaşı parametrik)
      const emeklilikYasi = parseInt(form.emeklilikYasi) || 65;
      let aktifKalanYil, pasifKalanYil;
      if (form.tamHayat) {
        aktifKalanYil = kalanOmur;
        pasifKalanYil = 0;
      } else {
        aktifKalanYil = Math.max(0, emeklilikYasi - hesapYasi);
        pasifKalanYil = Math.max(0, kalanOmur - aktifKalanYil);
      }

      // RANT KATSAYILARI (Progresif 1/Ln)
      const aktifRant = MR.progresifRant(aktifKalanYil, faiz / 100);
      const pasifRant = MR.progresifRant(pasifKalanYil, faiz / 100);
      const pasifIskonto = aktifKalanYil > 0 ? 1 / Math.pow(1 + faiz / 100, aktifKalanYil) : 1;

      // GELİR KAYBI
      const aktifGelirKaybi = aylikGelir * 12 * (maluliyet / 100) * aktifRant;
      const pasifAylikGelir = form.asgariUcretKullan ? aylikGelir : (MR.asgariUcretBul(kazaTarihi)?.ucret || aylikGelir);
      const pasifGelirKaybi = pasifAylikGelir * 12 * (maluliyet / 100) * pasifRant * pasifIskonto;

      // GEÇİCİ İŞ GÖREMEZLİK
      let gigsTopla = 0;
      if (form.gigsAktif && parseInt(form.gigsGun) > 0) {
        const gunlukGelir = aylikGelir / 30;
        gigsTopla = gunlukGelir * parseInt(form.gigsGun);
      }

      // BAKICI ÜCRETİ
      let bakiciToplam = 0;
      if (form.bakiciAktif && parseInt(form.bakiciGun) > 0) {
        const asgari = MR.asgariUcretBul(kazaTarihi);
        const bakiciGunluk = asgari ? asgari.ucret / 30 : 0;
        bakiciToplam = bakiciGunluk * parseInt(form.bakiciGun);
      }

      // KUSUR UYGULAMASI
      const aktifKusurlu = aktifGelirKaybi * (kusur / 100);
      const pasifKusurlu = pasifGelirKaybi * (kusur / 100);
      const gigsKusurlu = gigsTopla * (kusur / 100);
      const bakiciKusurlu = bakiciToplam * (kusur / 100);

      // PSD DÜŞÜMÜ
      let psdDeger = 0;
      if (form.psdAktif) {
        psdDeger = MR.parseNum(form.psdTutari);
      }

      const toplamBrut = aktifGelirKaybi + pasifGelirKaybi + gigsTopla + bakiciToplam;
      const toplamKusurlu = aktifKusurlu + pasifKusurlu + gigsKusurlu + bakiciKusurlu;
      const toplamNet = Math.max(0, toplamKusurlu - psdDeger);

      return {
        yas, hesapYasi, aylikGelir, asgariUcretYil, kalanOmur, pmfTablosu, teknikFaiz: faiz,
        kusur, maluliyet,
        aktifKalanYil, pasifKalanYil,
        aktifRant, pasifRant, pasifIskonto,
        aktifGelirKaybi, pasifGelirKaybi, aktifKusurlu, pasifKusurlu,
        gigsTopla, gigsKusurlu, gigsGun: parseInt(form.gigsGun) || 0,
        bakiciToplam, bakiciKusurlu, bakiciGun: parseInt(form.bakiciGun) || 0,
        psdDeger,
        toplamBrut: Math.round(toplamBrut),
        toplamKusurlu: Math.round(toplamKusurlu),
        toplamNet: Math.round(toplamNet)
      };
    };

    const hesapla = async () => {
      // VALIDATION
      if (!form.dogumTarihi) { alert('DOĞUM TARİHİ GİRİNİZ'); return; }
      if (!form.kazaTarihi) { alert('KAZA TARİHİ GİRİNİZ'); return; }
      if (!form.maluliyetOrani || MR.parseNum(form.maluliyetOrani) <= 0) { alert('GEÇERLİ MALULİYET ORANI GİRİNİZ (1-100)'); return; }
      if (!form.asgariUcretKullan && (!form.aylikGelir || MR.parseNum(form.aylikGelir) <= 0)) { alert('AYLIK GELİR GİRİNİZ VEYA ASGARİ ÜCRET SEÇİN'); return; }

      setHesaplaniyor(true);
      try {
        const faiz = MR.parseNum(form.teknikFaiz) || 1.8;
        const ana = hesaplaTemel(faiz, form.pmfTablosu);

        const hesapSonuc = {
          ...ana,
          magdurAdi: form.magdurAdi,
          dosyaNo: form.dosyaNo,
          dosyaAdi: form.dosyaAdi,
          davaTuru: DAVA_TURLERI.find(d => d.value === form.davaTuru)?.label || form.davaTuru,
          dogumTarihi: form.dogumTarihi,
          kazaTarihi: form.kazaTarihi,
          hesapTarihi: form.hesapTarihi,
          yasalFaizTarihi: form.yasalFaizTarihi,
          cinsiyet: form.cinsiyet,
          meslek: form.meslek || '-',
          asgariUcretKullan: form.asgariUcretKullan,
          tamHayat: form.tamHayat,
          tarih: new Date().toISOString()
        };

        setSonuc(hesapSonuc);
        aiAnalizBaslat(hesapSonuc);
      } catch (err) {
        console.error('Hesaplama hatası:', err);
        alert('HESAPLAMA HATASI: ' + err.message);
      } finally {
        setHesaplaniyor(false);
      }
    };

    // AI ANALİZ
    const aiAnalizBaslat = async (hesapSonuc) => {
      setAiYukleniyor(true);
      try {
        const resp = await MR.api.bhAiAnaliz({
          magdur: hesapSonuc.magdurAdi, dogumTarihi: hesapSonuc.dogumTarihi,
          kazaTarihi: hesapSonuc.kazaTarihi, cinsiyet: hesapSonuc.cinsiyet,
          yas: hesapSonuc.yas, maluliyet: hesapSonuc.maluliyet,
          meslek: hesapSonuc.meslek, aylikGelir: hesapSonuc.aylikGelir,
          pmfTablosu: hesapSonuc.pmfTablosu, kalanOmur: hesapSonuc.kalanOmur,
          aktifYil: hesapSonuc.aktifKalanYil, pasifYil: hesapSonuc.pasifKalanYil,
          aktifTazminat: hesapSonuc.aktifKusurlu, pasifTazminat: hesapSonuc.pasifKusurlu,
          toplamTazminat: hesapSonuc.toplamNet, teknikFaiz: hesapSonuc.teknikFaiz,
          kusur: hesapSonuc.kusur, davaTuru: hesapSonuc.davaTuru,
          gigs: hesapSonuc.gigsKusurlu, bakici: hesapSonuc.bakiciKusurlu
        });
        if (resp.success && resp.data) setAiAnaliz(resp.data);
      } catch (err) { console.error('AI analiz hatası:', err); }
      finally { setAiYukleniyor(false); }
    };

    // ÇOKLU TRH KARŞILAŞTIRMA
    const trhKarsilastirma = useMemo(() => {
      if (!sonuc) return [];
      const faizler = [
        { label: 'TRH 1.8', faiz: 1.8 },
        { label: 'TRH 0', faiz: 0 },
        { label: 'TRH 1.65', faiz: 1.65 }
      ];
      return faizler.map(f => {
        try {
          const r = hesaplaTemel(f.faiz, 'TRH2010');
          return { ...f, ...r };
        } catch (e) { return { ...f, toplamNet: 0 }; }
      });
    }, [sonuc]);

    // PMF KARŞILAŞTIRMA
    const pmfKarsilastirma = useMemo(() => {
      if (!sonuc) return [];
      const tablolar = ['TRH2010', 'CSO1980', 'PMF1931'];
      const faiz = sonuc.teknikFaiz;
      return tablolar.map(tablo => {
        try {
          const r = hesaplaTemel(faiz, tablo);
          return { tablo, ...r };
        } catch (e) { return { tablo, toplamNet: 0, kalanOmur: 0, aktifKalanYil: 0, pasifKalanYil: 0 }; }
      });
    }, [sonuc]);

    // EMSAL FİLTRELEME
    const emsalFiltrelenmis = useMemo(() => {
      if (!sonuc || !MR.BH_EMSAL) return [];
      const hedefMaluliyet = sonuc.maluliyet;
      let emsaller = MR.BH_EMSAL.map(e => ({
        ...e, benzerlik: 100 - Math.abs(e.maluliyet - hedefMaluliyet)
      })).filter(e => e.benzerlik >= 50);
      if (emsalArama.trim()) {
        const ara = emsalArama.toLowerCase();
        emsaller = emsaller.filter(e => (e.aciklama || e.detay || '').toLowerCase().includes(ara) || (e.kaynak || '').toLowerCase().includes(ara));
      }
      return emsaller.sort((a, b) => b.benzerlik - a.benzerlik).slice(0, 10);
    }, [sonuc, emsalArama]);

    // PDF BİLİRKİŞİ RAPORU
    const pdfIndir = (tip) => {
      if (!sonuc) return;
      setPdfYukleniyor(true);
      const isKoyu = MR.tema === 'koyu';
      const raporNo = 'BH-' + Date.now().toString().slice(-8);
      const tarih = new Date().toLocaleDateString('tr-TR');
      const fmtTarih = (t) => t ? new Date(t).toLocaleDateString('tr-TR') : '-';
      const fmtPara = (n) => MR.fmtK(n);

      const bilirkisiHtml = tip === 'bilirkisi' ? `
        <div style="margin-bottom:20px;padding:15px;background:#f8f8f8;border:1px solid #ccc;">
          <h3 style="margin:0 0 10px;font-size:14px;color:#333;">BİLİRKİŞİ NOTU</h3>
          <p style="margin:5px 0;font-size:11px;line-height:1.6;">Mahkemenizin ${sonuc.dosyaNo || '...'} Esas sayılı dosyası kapsamında, davacı ${sonuc.magdurAdi || '...'} adına düzenlenen ${sonuc.davaTuru || 'trafik kazası'} nedeniyle oluşan bedeni hasar tazminatı hesaplama raporudur.</p>
          <p style="margin:5px 0;font-size:11px;line-height:1.6;">Hesaplama ${sonuc.pmfTablosu} yaşam tablosu, %${sonuc.teknikFaiz} teknik faiz oranı ve 1/Ln progresif rant yöntemi kullanılarak yapılmıştır.</p>
        </div>` : '';

      const html = `<div style="font-family:Arial,sans-serif;padding:30px;max-width:800px;margin:0 auto;color:#333;font-size:12px;">
        <div style="text-align:center;border-bottom:3px solid #9333ea;padding-bottom:15px;margin-bottom:20px;">
          <h1 style="color:#9333ea;margin:0;font-size:20px;">MR HASAR DANIŞMANLIK</h1>
          <h2 style="color:#555;margin:8px 0 0;font-size:15px;">${tip === 'bilirkisi' ? 'BİLİRKİŞİ TAZMİNAT HESAP RAPORU' : 'BEDENİ HASAR TAZMİNAT HESAP SONUCU'}</h2>
          <p style="margin:8px 0 0;font-size:10px;color:#888;">Rapor No: ${raporNo} | Tarih: ${tarih}</p>
        </div>

        ${bilirkisiHtml}

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:${isKoyu?'#0f2342':'#1e40af'};color:#FFFFFF;"><td colspan="4" style="padding:8px;font-weight:800;font-size:12px;">MAĞDUR BİLGİLERİ</td></tr>
          <tr style="background:${isKoyu?'#111827':'#ffffff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;width:25%;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">AD SOYAD</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.magdurAdi || '-'}</td><td style="border:1px solid #ddd;padding:6px;width:25%;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">CİNSİYET</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.cinsiyet}</td></tr>
          <tr style="background:${isKoyu?'#0d1321':'#f0f4ff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">DOĞUM TARİHİ</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${fmtTarih(sonuc.dogumTarihi)}</td><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">KAZA TARİHİ</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${fmtTarih(sonuc.kazaTarihi)}</td></tr>
          <tr style="background:${isKoyu?'#111827':'#ffffff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">KAZA ANINDA YAŞ</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.yas}</td><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">MESLEK</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.meslek}</td></tr>
          <tr style="background:${isKoyu?'#0d1321':'#f0f4ff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">MALULİYET ORANI</td><td style="border:1px solid #ddd;padding:6px;font-weight:700;color:#9333ea;font-size:12px;">%${sonuc.maluliyet}</td><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">DAVA TÜRÜ</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.davaTuru}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:${isKoyu?'#0f2342':'#1e40af'};color:#FFFFFF;"><td colspan="4" style="padding:8px;font-weight:800;font-size:12px;">HESAPLAMA PARAMETRELERİ</td></tr>
          <tr style="background:${isKoyu?'#111827':'#ffffff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;width:25%;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">AYLIK GELİR</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${fmtPara(sonuc.aylikGelir)} TL ${sonuc.asgariUcretKullan ? '(ASGARİ ÜCRET)' : ''}</td><td style="border:1px solid #ddd;padding:6px;width:25%;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">PMF TABLOSU</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.pmfTablosu}</td></tr>
          <tr style="background:${isKoyu?'#0d1321':'#f0f4ff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">KALAN ÖMÜR</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.kalanOmur} YIL</td><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">TEKNİK FAİZ</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">%${sonuc.teknikFaiz}</td></tr>
          <tr style="background:${isKoyu?'#111827':'#ffffff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">KUSUR ORANI</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">%${sonuc.kusur}</td><td style="border:1px solid #ddd;padding:6px;background:${isKoyu?'#0d1321':'#f0f4ff'};font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">HESAP TARİHİ</td><td style="border:1px solid #ddd;padding:6px;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${fmtTarih(sonuc.hesapTarihi)}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:${isKoyu?'#0f2342':'#1e40af'};"><th style="padding:8px;text-align:left;color:#FFFFFF;font-weight:800;font-size:12px;">DÖNEM</th><th style="padding:8px;text-align:right;color:#FFFFFF;font-weight:800;font-size:12px;">YIL</th><th style="padding:8px;text-align:right;color:#FFFFFF;font-weight:800;font-size:12px;">RANT</th><th style="padding:8px;text-align:right;color:#FFFFFF;font-weight:800;font-size:12px;">BRÜT</th><th style="padding:8px;text-align:right;color:#FFFFFF;font-weight:800;font-size:12px;">KUSURLU</th></tr>
          <tr style="background:${isKoyu?'#111827':'#ffffff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">AKTİF DÖNEM</td><td style="border:1px solid #ddd;padding:6px;text-align:right;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.aktifKalanYil}</td><td style="border:1px solid #ddd;padding:6px;text-align:right;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.aktifRant.toFixed(4)}</td><td style="border:1px solid #ddd;padding:6px;text-align:right;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${fmtPara(sonuc.aktifGelirKaybi)} TL</td><td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">${fmtPara(sonuc.aktifKusurlu)} TL</td></tr>
          <tr style="background:${isKoyu?'#0d1321':'#f0f4ff'};border-left:${isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)'};border-bottom:${isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)'};box-shadow:${isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)'};border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">PASİF DÖNEM</td><td style="border:1px solid #ddd;padding:6px;text-align:right;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.pasifKalanYil}</td><td style="border:1px solid #ddd;padding:6px;text-align:right;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${sonuc.pasifRant.toFixed(4)}</td><td style="border:1px solid #ddd;padding:6px;text-align:right;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;font-weight:600;">${fmtPara(sonuc.pasifGelirKaybi)} TL</td><td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:600;color:${isKoyu?'#e2e8f0':'#1e293b'};font-size:12px;">${fmtPara(sonuc.pasifKusurlu)} TL</td></tr>
          ${sonuc.gigsGun > 0 ? '<tr style="background:' + (isKoyu?'#111827':'#ffffff') + ';border-left:' + (isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)') + ';border-bottom:' + (isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)') + ';box-shadow:' + (isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)') + ';border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;font-weight:600;color:' + (isKoyu?'#e2e8f0':'#1e293b') + ';font-size:12px;">GEÇİCİ İŞ GÖREMEZLİK (' + sonuc.gigsGun + ' GÜN)</td><td colspan="2"></td><td style="border:1px solid #ddd;padding:6px;text-align:right;color:' + (isKoyu?'#e2e8f0':'#1e293b') + ';font-size:12px;font-weight:600;">' + fmtPara(sonuc.gigsTopla) + ' TL</td><td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:600;color:' + (isKoyu?'#e2e8f0':'#1e293b') + ';font-size:12px;">' + fmtPara(sonuc.gigsKusurlu) + ' TL</td></tr>' : ''}
          ${sonuc.bakiciGun > 0 ? '<tr style="background:' + (isKoyu?'#0d1321':'#f0f4ff') + ';border-left:' + (isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)') + ';border-bottom:' + (isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)') + ';box-shadow:' + (isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)') + ';border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;font-weight:600;color:' + (isKoyu?'#e2e8f0':'#1e293b') + ';font-size:12px;">BAKICI ÜCRETİ (' + sonuc.bakiciGun + ' GÜN)</td><td colspan="2"></td><td style="border:1px solid #ddd;padding:6px;text-align:right;color:' + (isKoyu?'#e2e8f0':'#1e293b') + ';font-size:12px;font-weight:600;">' + fmtPara(sonuc.bakiciToplam) + ' TL</td><td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:600;color:' + (isKoyu?'#e2e8f0':'#1e293b') + ';font-size:12px;">' + fmtPara(sonuc.bakiciKusurlu) + ' TL</td></tr>' : ''}
          ${sonuc.psdDeger > 0 ? '<tr style="background:' + (isKoyu?'#111827':'#ffffff') + ';border-left:' + (isKoyu?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)') + ';border-bottom:' + (isKoyu?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)') + ';box-shadow:' + (isKoyu?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)') + ';border-radius:8px;"><td style="border:1px solid #ddd;padding:6px;font-weight:600;color:#d32f2f;font-size:12px;">PSD DÜŞÜMÜ</td><td colspan="3"></td><td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:600;color:#d32f2f;font-size:12px;">-' + fmtPara(sonuc.psdDeger) + ' TL</td></tr>' : ''}
        </table>

        <div style="text-align:center;background:linear-gradient(135deg,#9333ea,#ec4899);color:white;padding:25px;border-radius:8px;margin-bottom:20px;">
          <h2 style="margin:0 0 8px;font-size:16px;">TOPLAM TAZMİNAT MİKTARI</h2>
          <h1 style="margin:0;font-size:32px;">${fmtPara(sonuc.toplamNet)} TL</h1>
        </div>

        ${aiAnaliz ? '<div style="margin-bottom:20px;padding:15px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;"><h3 style="font-size:13px;color:#2563eb;margin:0 0 10px;">YAPAY ZEKA ANALİZİ</h3><div style="font-size:11px;line-height:1.7;white-space:pre-wrap;">' + (aiAnaliz.analiz || aiAnaliz.metin || '') + '</div></div>' : ''}

        <div style="margin-top:40px;padding-top:15px;border-top:2px solid #ddd;text-align:center;font-size:9px;color:#888;">
          <p><b>UYARI:</b> Bu rapor ön çalışma niteliğindedir. Kesin tazminat miktarı mahkeme kararı ile belirlenir.</p>
          <p>MR HASAR DANIŞMANLIK - ${tarih} | © ${new Date().getFullYear()}</p>
        </div>
      </div>`;

      const el = document.createElement('div');
      el.innerHTML = html;
      document.body.appendChild(el);
      html2pdf().set({
        margin: 10, filename: 'MR_BH_' + (tip === 'bilirkisi' ? 'Bilirkisi_' : 'Sonuc_') + raporNo + '.pdf',
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(el).save().then(() => { document.body.removeChild(el); setPdfYukleniyor(false); }).catch(err => {
        console.error('PDF hatası:', err); document.body.removeChild(el); setPdfYukleniyor(false);
      });
    };

    // TEMİZLE
    const temizle = () => {
      setForm({ dosyaNo: '', dosyaAdi: '', davaTuru: 'TRAFIK_KAZASI', magdurAdi: '', dogumTarihi: '', cinsiyet: 'ERKEK', kazaTarihi: '', hesapTarihi: new Date().toISOString().split('T')[0], yasalFaizTarihi: '', maluliyetOrani: '', meslek: '', aylikGelir: '', asgariUcretKullan: false, asgariUcretTuru: 'BEKAR', maasNet: true, maasGuncel: true, pmfTablosu: 'TRH2010', teknikFaiz: '1.8', kusurOrani: '100', gigsAktif: false, gigsGun: '0', bakiciAktif: false, bakiciGun: '0', psdAktif: false, psdTutari: '0', tamHayat: false, yasYuvarla: false, yilSonunaKaydir: false, bakiyeKazadan: false });
      setSonuc(null); setAiAnaliz(null); setDosyalar([]); setOcrSonuc(null); setEmsalArama('');
    };

    // ────────── CHECKBOX HELPER ──────────
    const Chk = ({ checked, onChange, label }) => (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.text, cursor: 'pointer', fontSize: 12 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
    );

    const gridS = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
    const grid3S = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 };
    const cardS = { ...S.card, marginBottom: 20 };

    // ════════════════ RENDER ════════════════
    return (
      <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ background: 'linear-gradient(135deg, ' + C.purple + ' 0%, ' + C.pink + ' 100%)', padding: 16, borderRadius: 12 }}>
              <MR.LIcon name="Stethoscope" size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>BEDENİ HASAR HESAPLAMA ROBOTU</h1>
              <p style={{ margin: '6px 0 0', color: C.textSec, fontSize: 12 }}>PROFESYONEL TAZMİNAT HESAPLAMA - PMF + PROGRESİF RANT + AI ANALİZ</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={S.badge(C.purple)}>AI DESTEKLİ</span>
              <span style={S.badge(C.danger)}>PDF RAPOR</span>
              <span style={S.badge(C.cyan)}>PMF KARŞILAŞTIRMA</span>
              <span style={S.badge(C.gold)}>EMSAL KARARLARI</span>
            </div>
          </div>
          {/* MOD TABS */}
          <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid ' + C.border }}>
            {[{ id: 'hizli', icon: 'Zap', label: 'HIZLI HESAPLAMA' }, { id: 'detayli', icon: 'FileText', label: 'DETAYLI RAPOR + OCR' }].map(t => (
              <button key={t.id} onClick={() => setMod(t.id)} style={{
                ...S.btn, background: mod === t.id ? 'linear-gradient(135deg, ' + C.purple + ', ' + C.pink + ')' : 'transparent',
                color: mod === t.id ? 'white' : C.textSec, border: 'none',
                borderBottom: mod === t.id ? '2px solid ' + C.purple : '2px solid transparent',
                borderRadius: '8px 8px 0 0', padding: '12px 24px'
              }}>
                <MR.LIcon name={t.icon} size={18} /><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24 }}>

          {/* ═══ SOL KOLON ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* EVRAK YÜKLEME */}
            {mod === 'detayli' && (
              <div style={cardS}>
                <div style={S.cardHead}><MR.LIcon name="Upload" size={20} color={C.purple} /><span>TIBBİ EVRAK YÜKLEME & OCR</span></div>
                <div style={S.cardBody}>
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleDosyaEkle(e.dataTransfer.files); }}
                    onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.jpg,.jpeg,.png'; inp.multiple = true; inp.onchange = ev => handleDosyaEkle(ev.target.files); inp.click(); }}
                    style={{ border: '2px dashed ' + (dragOver ? C.purple : C.border), borderRadius: 8, padding: 28, textAlign: 'center', background: dragOver ? C.purple + '10' : C.bgInput, cursor: 'pointer', marginBottom: 12 }}>
                    <MR.LIcon name="Upload" size={40} color={dragOver ? C.purple : C.textMuted} />
                    <p style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 13 }}>DOSYALARI SÜRÜKLE & BIRAK</p>
                    <p style={{ margin: 0, color: C.textSec, fontSize: 11 }}>PDF, JPG, PNG (SAĞLIK RAPORU, MALULİYET BELGESİ)</p>
                  </div>
                  {dosyalar.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: C.bgHover, borderRadius: 6, marginBottom: 6 }}>
                      <MR.LIcon name="FileText" size={16} color={C.purple} />
                      <span style={{ flex: 1, fontSize: 12 }}>{f.name}</span>
                      <span style={{ color: C.textMuted, fontSize: 10 }}>{(f.size / 1024).toFixed(1)} KB</span>
                      <button onClick={() => dosyaCikar(i)} style={{ ...S.btnD, padding: '4px 10px', fontSize: 11 }}><MR.LIcon name="X" size={14} /></button>
                    </div>
                  ))}
                  {dosyalar.length > 0 && (
                    <button onClick={ocrAnaliz} disabled={ocrYukleniyor} style={{ ...S.btnP, width: '100%', marginTop: 10 }}>
                      {ocrYukleniyor ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><MR.Loading size={16} color="white" /><span>OCR ANALİZİ YAPILIYOR...</span></div>
                        : <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><MR.LIcon name="Brain" size={16} /><span>OCR ANALİZİ BAŞLAT</span></div>}
                    </button>
                  )}
                  {ocrSonuc && <div style={{ marginTop: 12, padding: 12, background: C.success + '15', border: '1px solid ' + C.success, borderRadius: 6, fontSize: 12, color: C.success, display: 'flex', alignItems: 'center', gap: 8 }}><MR.LIcon name="CheckCircle" size={16} color={C.success} /><span>OCR ANALİZİ TAMAMLANDI - BİLGİLER FORMA AKTARILDI</span></div>}
                </div>
              </div>
            )}

            {/* DOSYA BİLGİLERİ */}
            <div style={cardS}>
              <div style={S.cardHead}><MR.LIcon name="Folder" size={20} color={C.purple} /><span>DOSYA BİLGİLERİ</span></div>
              <div style={S.cardBody}>
                <div style={gridS}>
                  <MR.FormGroup label="DOSYA NO"><input type="text" value={form.dosyaNo} onChange={e => handleChange('dosyaNo', e.target.value.toUpperCase())} placeholder="2026-0001" style={S.input} /></MR.FormGroup>
                  <MR.FormGroup label="DAVA TÜRÜ"><select value={form.davaTuru} onChange={e => handleChange('davaTuru', e.target.value)} style={S.select}>
                    {DAVA_TURLERI.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select></MR.FormGroup>
                </div>
              </div>
            </div>

            {/* MAĞDUR BİLGİLERİ */}
            <div style={cardS}>
              <div style={S.cardHead}><MR.LIcon name="User" size={20} color={C.purple} /><span>MAĞDUR BİLGİLERİ</span></div>
              <div style={S.cardBody}>
                <MR.FormGroup label="MAĞDUR ADI SOYADI"><input type="text" value={form.magdurAdi} onChange={e => handleChange('magdurAdi', e.target.value.toUpperCase())} placeholder="AD SOYAD" style={S.input} /></MR.FormGroup>
                <div style={gridS}>
                  <MR.FormGroup label="DOĞUM TARİHİ *"><MR.DateInput value={form.dogumTarihi} onChange={v => handleChange('dogumTarihi', v)}/></MR.FormGroup>
                  <MR.FormGroup label="CİNSİYET"><select value={form.cinsiyet} onChange={e => handleChange('cinsiyet', e.target.value)} style={S.select}><option value="ERKEK">ERKEK</option><option value="KADIN">KADIN</option></select></MR.FormGroup>
                </div>
                <div style={gridS}>
                  <MR.FormGroup label="KAZA TARİHİ *"><MR.DateInput value={form.kazaTarihi} onChange={v => handleChange('kazaTarihi', v)}/></MR.FormGroup>
                  <MR.FormGroup label="MALULİYET (SAKATLIK) ORANI % *"><input type="text" value={form.maluliyetOrani} onChange={e => handleChange('maluliyetOrani', MR.fmtInput(e.target.value))} placeholder="3" style={S.input} /></MR.FormGroup>
                </div>
                <MR.FormGroup label="MESLEK"><input type="text" value={form.meslek} onChange={e => handleChange('meslek', e.target.value.toUpperCase())} placeholder="MESLEK" style={S.input} /></MR.FormGroup>
              </div>
            </div>

            {/* GELİR BİLGİLERİ */}
            <div style={cardS}>
              <div style={S.cardHead}><MR.LIcon name="DollarSign" size={20} color={C.success} /><span>GELİR BİLGİLERİ</span></div>
              <div style={S.cardBody}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  <Chk checked={form.asgariUcretKullan} onChange={v => handleChange('asgariUcretKullan', v)} label="MAAŞI ASGARİ ÜCRET ÜZERİNDE" />
                </div>
                {form.asgariUcretKullan ? (
                  <MR.FormGroup label="ASGARİ ÜCRET TÜRÜ"><select value={form.asgariUcretTuru} onChange={e => handleChange('asgariUcretTuru', e.target.value)} style={S.select}>
                    <option value="BEKAR">BEKAR</option><option value="EVLI">EVLİ</option>
                  </select></MR.FormGroup>
                ) : (
                  <MR.FormGroup label="AYLIK GELİR (TL) *"><input type="text" value={form.aylikGelir} onChange={e => handleChange('aylikGelir', MR.fmtInput(e.target.value))} placeholder="0" style={S.input} /></MR.FormGroup>
                )}
                <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                    <input type="radio" checked={form.maasNet} onChange={() => handleChange('maasNet', true)} /><span>NET MAAŞ</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                    <input type="radio" checked={!form.maasNet} onChange={() => handleChange('maasNet', false)} /><span>BRÜT MAAŞ</span>
                  </label>
                  <span style={{ color: C.border }}>|</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                    <input type="radio" checked={form.maasGuncel} onChange={() => handleChange('maasGuncel', true)} /><span>GÜNCEL MAAŞ</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                    <input type="radio" checked={!form.maasGuncel} onChange={() => handleChange('maasGuncel', false)} /><span>KAZA TARİHİNDEKİ MAAŞ</span>
                  </label>
                </div>
              </div>
            </div>

            {/* HESAPLAMA PARAMETRELERİ */}
            <div style={cardS}>
              <div style={S.cardHead}><MR.LIcon name="Calculator" size={20} color={C.cyan} /><span>HESAPLAMA PARAMETRELERİ</span></div>
              <div style={S.cardBody}>
                <div style={gridS}>
                  <MR.FormGroup label="HESAP TARİHİ"><MR.DateInput value={form.hesapTarihi} onChange={v => handleChange('hesapTarihi', v)}/></MR.FormGroup>
                  <MR.FormGroup label="HAKLILIK (KUSUR) ORANI %"><input type="text" value={form.kusurOrani} onChange={e => handleChange('kusurOrani', MR.fmtInput(e.target.value))} placeholder="100" style={S.input} /></MR.FormGroup>
                </div>
                <div style={gridS}>
                  <MR.FormGroup label="PMF TABLOSU"><select value={form.pmfTablosu} onChange={e => handleChange('pmfTablosu', e.target.value)} style={S.select}>
                    <option value="TRH2010">TRH 2010</option><option value="CSO1980">CSO 1980</option><option value="PMF1931">PMF 1931</option>
                  </select></MR.FormGroup>
                  <MR.FormGroup label="TEKNİK FAİZ %"><select value={form.teknikFaiz} onChange={e => handleChange('teknikFaiz', e.target.value)} style={S.select}>
                    <option value="1.8">%1.8 (STANDART)</option><option value="0">%0 (FAİZSİZ)</option><option value="1.65">%1.65</option><option value="10">%10 (ESKİ)</option>
                  </select></MR.FormGroup>
                </div>
                <MR.FormGroup label="YASAL FAİZ TARİHİ"><MR.DateInput value={form.yasalFaizTarihi} onChange={v => handleChange('yasalFaizTarihi', v)}/></MR.FormGroup>
              </div>
            </div>

            {/* EK KALEMLER */}
            <div style={cardS}>
              <div style={S.cardHead}><MR.LIcon name="List" size={20} color={C.warning} /><span>EK KALEMLER & SEÇENEKLER</span></div>
              <div style={S.cardBody}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Chk checked={form.gigsAktif} onChange={v => handleChange('gigsAktif', v)} label="GEÇİCİ İŞ GÖREMEZLİK SÜRESİ" />
                    {form.gigsAktif && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: C.textMuted }}>GÜN:</span>
                      <input type="text" value={form.gigsGun} onChange={e => handleChange('gigsGun', e.target.value.replace(/\D/g, ''))} style={{ ...S.input, width: 70, padding: '6px 10px' }} />
                    </div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Chk checked={form.bakiciAktif} onChange={v => handleChange('bakiciAktif', v)} label="BAKICI SÜRESİ" />
                    {form.bakiciAktif && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: C.textMuted }}>GÜN:</span>
                      <input type="text" value={form.bakiciGun} onChange={e => handleChange('bakiciGun', e.target.value.replace(/\D/g, ''))} style={{ ...S.input, width: 70, padding: '6px 10px' }} />
                    </div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Chk checked={form.psdAktif} onChange={v => handleChange('psdAktif', v)} label="PSD TUTARI (PEŞİN SERMAYE DEĞERİ)" />
                    {form.psdAktif && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="text" value={form.psdTutari} onChange={e => handleChange('psdTutari', MR.fmtInput(e.target.value))} placeholder="0" style={{ ...S.input, width: 120, padding: '6px 10px' }} /><span style={{ fontSize: 11, color: C.textMuted }}>TL</span>
                    </div>}
                  </div>
                  <div style={{ borderTop: '1px solid ' + C.border, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <Chk checked={form.tamHayat} onChange={v => handleChange('tamHayat', v)} label="TAM HAYAT HESABI" />
                      {!form.tamHayat && <div style={{display:'flex', alignItems:'center', gap:4}}>
                        <span style={{fontSize:10, color:C.textMuted}}>EMEKLİLİK YAŞI:</span>
                        <input type="number" min="55" max="75" value={form.emeklilikYasi} onChange={e => handleChange('emeklilikYasi', e.target.value)} style={{...S.input, width:50, padding:'4px 6px', fontSize:11, textAlign:'center'}}/>
                      </div>}
                    </div>
                    <Chk checked={form.yasYuvarla} onChange={v => handleChange('yasYuvarla', v)} label="YAŞLARI YUVARLA" />
                    <Chk checked={form.yilSonunaKaydir} onChange={v => handleChange('yilSonunaKaydir', v)} label="HESAP TARİHİNİ YIL SONUNA KAYDIR" />
                    <Chk checked={form.bakiyeKazadan} onChange={v => handleChange('bakiyeKazadan', v)} label="BAKİYE ÖMRÜ KAZA TARİHİNDEN HESAPLA" />
                  </div>
                </div>
              </div>
            </div>

            {/* BUTONLAR */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={temizle} style={{ ...S.btnS, flex: 1 }}><MR.LIcon name="RotateCcw" size={16} /><span>TEMİZLE</span></button>
              <button onClick={hesapla} disabled={hesaplaniyor} style={{ ...S.btnP, flex: 2 }}>
                {hesaplaniyor ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><MR.Loading size={16} color="white" /><span>HESAPLANIYOR...</span></div>
                  : <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><MR.LIcon name="Calculator" size={16} /><span>HESAPLA + AI ANALİZ</span></div>}
              </button>
            </div>
          </div>

          {/* ═══ SAĞ KOLON ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sonuc ? (
              <div>
                {/* TOPLAM */}
                <div style={{ ...S.card, background: 'linear-gradient(135deg, ' + C.purple + ', ' + C.pink + ')', border: 'none', marginBottom: 20 }}>
                  <div style={{ ...S.cardBody, textAlign: 'center', padding: 28 }}>
                    <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>TOPLAM TAZMİNAT MİKTARI</p>
                    <h1 style={{ margin: 0, color: 'white', fontSize: 40, fontWeight: 700 }}>{MR.fmtK(sonuc.toplamNet)} TL</h1>
                    <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {[
                        { label: 'AKTİF', value: sonuc.aktifKusurlu },
                        { label: 'PASİF', value: sonuc.pasifKusurlu },
                        ...(sonuc.gigsGun > 0 ? [{ label: 'GİGS', value: sonuc.gigsKusurlu }] : []),
                        ...(sonuc.bakiciGun > 0 ? [{ label: 'BAKICI', value: sonuc.bakiciKusurlu }] : []),
                        ...(sonuc.psdDeger > 0 ? [{ label: 'PSD', value: -sonuc.psdDeger }] : [])
                      ].map((d, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '10px 16px', borderRadius: 8, minWidth: 100 }}>
                          <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{d.label}</p>
                          <p style={{ margin: 0, color: d.value < 0 ? '#fca5a5' : 'white', fontSize: 16, fontWeight: 600 }}>{MR.fmtK(d.value)} TL</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* TRH KARŞILAŞTIRMA */}
                <div style={{ ...S.card, marginBottom: 20 }}>
                  <div style={S.cardHead}><MR.LIcon name="BarChart3" size={20} color={C.cyan} /><span>TEKNİK FAİZ KARŞILAŞTIRMASI</span></div>
                  <div style={S.cardBody}>
                    <div style={grid3S}>
                      {trhKarsilastirma.map((t, i) => (
                        <div key={i} style={{
                          padding: 14, border: '2px solid ' + (t.faiz === sonuc.teknikFaiz ? C.cyan : C.border),
                          background: t.faiz === sonuc.teknikFaiz ? C.cyan + '15' : C.bgHover, borderRadius: 10
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: C.text }}>{t.label}</div>
                          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>FAİZ: %{t.faiz}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: C.cyan, marginTop: 8 }}>{MR.fmtK(t.toplamNet)} TL</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PMF KARŞILAŞTIRMA */}
                <div style={{ ...S.card, marginBottom: 20 }}>
                  <div style={S.cardHead}><MR.LIcon name="Database" size={20} color={C.purple} /><span>PMF TABLOSU KARŞILAŞTIRMASI</span></div>
                  <div style={S.cardBody}>
                    <div style={grid3S}>
                      {pmfKarsilastirma.map((p, i) => (
                        <div key={i} style={{
                          padding: 14, border: '2px solid ' + (p.tablo === sonuc.pmfTablosu ? C.purple : C.border),
                          background: p.tablo === sonuc.pmfTablosu ? C.purple + '15' : C.bgHover, borderRadius: 10
                        }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{p.tablo}</div>
                          <div style={{ fontSize: 10, color: C.textMuted }}>KALAN ÖMÜR: {p.kalanOmur} YIL</div>
                          <div style={{ fontSize: 10, color: C.textMuted }}>AKTİF: {p.aktifKalanYil} | PASİF: {p.pasifKalanYil}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: C.purple, marginTop: 8 }}>{MR.fmtK(p.toplamNet)} TL</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI ANALİZ */}
                {aiYukleniyor ? (
                  <div style={{ ...S.card, marginBottom: 20 }}>
                    <div style={S.cardBody}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: 28 }}>
                        <MR.Loading size={24} color={C.purple} /><span style={{ fontSize: 14 }}>AI ANALİZ YAPILIYOR...</span>
                      </div>
                    </div>
                  </div>
                ) : aiAnaliz ? (
                  <div style={{ ...S.card, background: C.purple + '08', border: '2px solid ' + C.purple, marginBottom: 20 }}>
                    <div style={S.cardHead}><MR.LIcon name="Sparkles" size={20} color={C.purple} /><span>AI ANALİZ RAPORU</span><div style={{ marginLeft: 'auto' }}><span style={S.badge(C.purple)}>AI</span></div></div>
                    <div style={S.cardBody}>
                      <div style={{ padding: 16, background: C.bgCard, borderRadius: 8, fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {aiAnaliz.analiz || aiAnaliz.metin || 'AI analiz sonucu bulunamadı'}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* EMSAL */}
                {emsalFiltrelenmis.length > 0 && (
                  <div style={{ ...S.card, marginBottom: 20 }}>
                    <div style={S.cardHead}><MR.LIcon name="Scale" size={20} color={C.gold} /><span>EMSAL KARARLARI ({emsalFiltrelenmis.length})</span></div>
                    <div style={S.cardBody}>
                      <input type="text" value={emsalArama} onChange={e => setEmsalArama(e.target.value)} placeholder="EMSAL ARA..." style={{ ...S.input, marginBottom: 12 }} />
                      <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {emsalFiltrelenmis.map((e, i) => (
                          <div key={i} style={{ padding: 12, background: C.gold + '10', border: '1px solid ' + C.gold + '44', borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{e.aciklama || e.detay}</span>
                              <span style={{ ...S.badge(C.cyan), fontSize: 10 }}>%{e.benzerlik.toFixed(0)} BENZER</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                              <span style={S.badge(C.purple)}>%{e.maluliyet} MALULİYET</span>
                              <span style={{ color: C.gold, fontWeight: 700 }}>{MR.fmtK(e.tutar)} TL</span>
                              <span style={{ color: C.textMuted }}>{e.kaynak}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF BUTONLARI */}
                {MR.hasYetki(user,'hesaplamalar','hesap-bh-rapor') && <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => pdfIndir('bilirkisi')} disabled={pdfYukleniyor} style={{ ...S.btnP, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <MR.LIcon name="FileText" size={16} /><span>BİLİRKİŞİ RAPORU</span>
                    </div>
                  </button>
                  <button onClick={() => pdfIndir('sonuc')} disabled={pdfYukleniyor} style={{ ...S.btnD, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <MR.LIcon name="Download" size={16} /><span>HESAP SONUCU</span>
                    </div>
                  </button>
                </div>}
              </div>
            ) : (
              <MR.EmptyState icon="Calculator" title="HESAPLAMA YAPILMADI" desc="MAĞDUR BİLGİLERİNİ GİRİP HESAPLA BUTONUNA BASIN" />
            )}
          </div>
        </div>
      </div>
    );
  };
})();
