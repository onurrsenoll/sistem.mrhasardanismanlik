// BH (Bedeni Hasar) Hesaplama Sayfası - Enhanced with AI & OCR
(() => {
  'use strict';

  const { useState, useEffect, useMemo, useCallback } = React;

  window.MR = window.MR || {};

  MR.HesapBHPage = () => {
    // MOD SEÇİMİ
    const [mod, setMod] = useState('hizli'); // 'hizli' | 'detayli'

    // FORM STATE
    const [form, setForm] = useState({
      magdurAdi: '',
      dogumTarihi: '',
      cinsiyet: 'ERKEK',
      kazaTarihi: '',
      maluliyetOrani: '',
      meslek: '',
      aylikGelir: '',
      asgariUcretKullan: false,
      pmfTablosu: 'TRH2010',
      teknikFaiz: '10',
      kusurOrani: '100'
    });

    // OCR & DOSYALAR (DETAYLI MOD)
    const [dosyalar, setDosyalar] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const [ocrYukleniyor, setOcrYukleniyor] = useState(false);
    const [ocrSonuc, setOcrSonuc] = useState(null);

    // HESAPLAMA SONUÇ
    const [sonuc, setSonuc] = useState(null);
    const [hesaplaniyor, setHesaplaniyor] = useState(false);

    // AI ANALİZ
    const [aiAnaliz, setAiAnaliz] = useState(null);
    const [aiYukleniyor, setAiYukleniyor] = useState(false);

    // PDF
    const [pdfYukleniyor, setPdfYukleniyor] = useState(false);

    // EMSAL FİLTRE
    const [emsalArama, setEmsalArama] = useState('');

    // FORM DEĞİŞİKLİĞİ
    const handleChange = (key, value) => {
      setForm(prev => ({ ...prev, [key]: value }));
    };

    // DOSYA YÜKLEME (OCR)
    const handleDosyaEkle = (files) => {
      const yeniDosyalar = Array.from(files).filter(f => {
        const uzanti = f.name.split('.').pop().toLowerCase();
        return ['pdf', 'jpg', 'jpeg', 'png'].includes(uzanti);
      });
      setDosyalar(prev => [...prev, ...yeniDosyalar]);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      setDragOver(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      setDragOver(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      handleDosyaEkle(e.dataTransfer.files);
    };

    const dosyaCikar = (index) => {
      setDosyalar(prev => prev.filter((_, i) => i !== index));
    };

    // OCR ANALİZ
    const ocrAnaliz = async () => {
      if (dosyalar.length === 0) {
        alert('LÜTFEN EN AZ BİR DOSYA YÜKLEYİNİZ');
        return;
      }

      setOcrYukleniyor(true);
      try {
        const fd = new FormData();
        dosyalar.forEach((f, i) => fd.append('dosya_' + i, f));
        fd.append('dosya_sayisi', dosyalar.length);
        fd.append('tip', 'bh');

        const headers = {};
        if (MR.api.token) headers['Authorization'] = 'Bearer ' + MR.api.token;

        const resp = await fetch('/api/v1/hesap/ocr-analiz.php', {
          method: 'POST',
          headers: headers,
          body: fd
        });

        const data = await resp.json();

        if (data.success && data.data) {
          setOcrSonuc(data.data);

          // AUTO-FILL FORM
          if (data.data.magdurAdi) handleChange('magdurAdi', data.data.magdurAdi);
          if (data.data.dogumTarihi) handleChange('dogumTarihi', data.data.dogumTarihi);
          if (data.data.cinsiyet) handleChange('cinsiyet', data.data.cinsiyet.toUpperCase());
          if (data.data.kazaTarihi) handleChange('kazaTarihi', data.data.kazaTarihi);
          if (data.data.maluliyetOrani) handleChange('maluliyetOrani', data.data.maluliyetOrani.toString());
          if (data.data.meslek) handleChange('meslek', data.data.meslek);
          if (data.data.aylikGelir) handleChange('aylikGelir', data.data.aylikGelir.toString());

          alert('OCR ANALİZİ TAMAMLANDI!\nTESPİT EDİLEN BİLGİLER FORMA AKTARILMIŞTıR.');
        } else {
          alert(data.message || 'OCR ANALİZİ BAŞARISIZ');
        }
      } catch (err) {
        console.error('OCR hatası:', err);
        alert('OCR ANALİZİ SIRASINDA HATA OLUŞTU');
      } finally {
        setOcrYukleniyor(false);
      }
    };

    // HESAPLAMA
    const hesapla = async () => {
      // VALIDATION
      if (!form.magdurAdi.trim()) {
        alert('LÜTFEN MAĞDUR ADI SOYADINI GİRİNİZ');
        return;
      }
      if (!form.dogumTarihi) {
        alert('LÜTFEN DOĞUM TARİHİNİ GİRİNİZ');
        return;
      }
      if (!form.kazaTarihi) {
        alert('LÜTFEN KAZA TARİHİNİ GİRİNİZ');
        return;
      }
      if (!form.maluliyetOrani || MR.parseNum(form.maluliyetOrani) <= 0 || MR.parseNum(form.maluliyetOrani) > 100) {
        alert('LÜTFEN GEÇERLİ BİR MALULİYET ORANI GİRİNİZ (1-100)');
        return;
      }
      if (!form.asgariUcretKullan && (!form.aylikGelir || MR.parseNum(form.aylikGelir) <= 0)) {
        alert('LÜTFEN AYLIK GELİR GİRİNİZ VEYA ASGARİ ÜCRET SEÇENEĞİNİ İŞARETLEYİNİZ');
        return;
      }

      setHesaplaniyor(true);

      try {
        // PARSE VALUES
        const dogumTarihi = new Date(form.dogumTarihi);
        const kazaTarihi = new Date(form.kazaTarihi);
        const cinsiyet = form.cinsiyet;
        const maluliyet = MR.parseNum(form.maluliyetOrani);
        const pmfTablosu = form.pmfTablosu;
        const teknikFaiz = MR.parseNum(form.teknikFaiz) || 10;
        const kusur = MR.parseNum(form.kusurOrani) || 100;

        // YAŞ HESAPLAMA
        const yas = MR.yasHesapla(dogumTarihi, kazaTarihi);
        if (yas < 0) {
          alert('KAZA TARİHİ DOĞUM TARİHİNDEN ÖNCEDİR!');
          setHesaplaniyor(false);
          return;
        }

        // GELİR BELİRLEME
        let aylikGelir = 0;
        let asgariUcretYil = null;
        if (form.asgariUcretKullan) {
          const asgariData = MR.asgariUcretBul(kazaTarihi);
          if (asgariData) {
            aylikGelir = asgariData.ucret;
            asgariUcretYil = asgariData.yil;
          } else {
            alert('KAZA TARİHİ İÇİN ASGARİ ÜCRET BULUNAMADI');
            setHesaplaniyor(false);
            return;
          }
        } else {
          aylikGelir = MR.parseNum(form.aylikGelir);
        }

        // PMF VE KALAN ÖMÜR
        const cinsiyetKod = cinsiyet === 'ERKEK' ? 'E' : 'K';
        const kalanOmur = MR.pmfDeger(pmfTablosu, cinsiyetKod, yas);
        if (!kalanOmur || kalanOmur <= 0) {
          alert('PMF TABLOSUNDA YAŞA UYGUN DEĞER BULUNAMADI');
          setHesaplaniyor(false);
          return;
        }

        // AKTİF DÖNEM (kaza yaşından 65'e kadar)
        const aktifKalanYil = Math.max(0, 65 - yas);
        // PASİF DÖNEM (65'ten PMF sonuna kadar)
        const pasifKalanYil = Math.max(0, kalanOmur - aktifKalanYil);

        // RANT KATSAYILARI (Progresif 1/Ln)
        const aktifRant = MR.progresifRant(aktifKalanYil, teknikFaiz / 100);
        const pasifRant = MR.progresifRant(pasifKalanYil, teknikFaiz / 100);
        const pasifIskonto = aktifKalanYil > 0 ? 1 / Math.pow(1 + teknikFaiz / 100, aktifKalanYil) : 1;

        // GELİR KAYBI
        const aktifGelirKaybi = aylikGelir * 12 * (maluliyet / 100) * aktifRant;
        const pasifAylikGelir = form.asgariUcretKullan ? aylikGelir : (MR.asgariUcretBul(kazaTarihi)?.ucret || aylikGelir);
        const pasifGelirKaybi = pasifAylikGelir * 12 * (maluliyet / 100) * pasifRant * pasifIskonto;

        // KUSUR UYGULAMASI
        const aktifKusurlu = aktifGelirKaybi * (kusur / 100);
        const pasifKusurlu = pasifGelirKaybi * (kusur / 100);
        const toplamKusurlu = Math.round(aktifKusurlu + pasifKusurlu);

        // SONUÇ
        const hesapSonuc = {
          magdurAdi: form.magdurAdi,
          dogumTarihi: form.dogumTarihi,
          kazaTarihi: form.kazaTarihi,
          cinsiyet: cinsiyet,
          yas: yas,
          maluliyet: maluliyet,
          meslek: form.meslek || '-',
          aylikGelir: aylikGelir,
          asgariUcretKullan: form.asgariUcretKullan,
          asgariUcretYil: asgariUcretYil,
          pmfTablosu: pmfTablosu,
          kalanOmur: kalanOmur,
          teknikFaiz: teknikFaiz,
          kusur: kusur,
          aktifKalanYil: aktifKalanYil,
          pasifKalanYil: pasifKalanYil,
          aktifRant: aktifRant,
          pasifRant: pasifRant,
          pasifIskonto: pasifIskonto,
          aktifGelirKaybi: aktifGelirKaybi,
          pasifGelirKaybi: pasifGelirKaybi,
          aktifKusurlu: aktifKusurlu,
          pasifKusurlu: pasifKusurlu,
          toplamKusurlu: toplamKusurlu,
          tarih: new Date().toISOString()
        };

        setSonuc(hesapSonuc);

        // AI ANALİZ OTOMATİK BAŞLAT
        aiAnalizBaslat(hesapSonuc);

      } catch (err) {
        console.error('Hesaplama hatası:', err);
        alert('HESAPLAMA SIRASINDA HATA OLUŞTU: ' + err.message);
      } finally {
        setHesaplaniyor(false);
      }
    };

    // AI ANALİZ
    const aiAnalizBaslat = async (hesapSonuc) => {
      setAiYukleniyor(true);
      try {
        const resp = await MR.api.bhAiAnaliz({
          magdur: hesapSonuc.magdurAdi,
          dogumTarihi: hesapSonuc.dogumTarihi,
          kazaTarihi: hesapSonuc.kazaTarihi,
          cinsiyet: hesapSonuc.cinsiyet,
          yas: hesapSonuc.yas,
          maluliyet: hesapSonuc.maluliyet,
          meslek: hesapSonuc.meslek,
          aylikGelir: hesapSonuc.aylikGelir,
          pmfTablosu: hesapSonuc.pmfTablosu,
          kalanOmur: hesapSonuc.kalanOmur,
          aktifYil: hesapSonuc.aktifKalanYil,
          pasifYil: hesapSonuc.pasifKalanYil,
          aktifTazminat: hesapSonuc.aktifKusurlu,
          pasifTazminat: hesapSonuc.pasifKusurlu,
          toplamTazminat: hesapSonuc.toplamKusurlu,
          teknikFaiz: hesapSonuc.teknikFaiz,
          kusur: hesapSonuc.kusur
        });

        if (resp.success && resp.data) {
          setAiAnaliz(resp.data);
        }
      } catch (err) {
        console.error('AI analiz hatası:', err);
      } finally {
        setAiYukleniyor(false);
      }
    };

    // PMF KARŞILAŞTIRMA
    const pmfKarsilastirma = useMemo(() => {
      if (!sonuc) return [];

      const tablolar = ['TRH2010', 'CSO1980', 'PMF1931'];
      const cinsiyetKod = sonuc.cinsiyet === 'ERKEK' ? 'E' : 'K';
      const yas = sonuc.yas;
      const aylikGelir = sonuc.aylikGelir;
      const maluliyet = sonuc.maluliyet;
      const teknikFaiz = sonuc.teknikFaiz;
      const kusur = sonuc.kusur;

      return tablolar.map(tablo => {
        const ko = MR.pmfDeger(tablo, cinsiyetKod, yas);
        if (!ko || ko <= 0) {
          return {
            tablo,
            kalanOmur: 0,
            aktifYil: 0,
            pasifYil: 0,
            aktifTazminat: 0,
            pasifTazminat: 0,
            toplam: 0
          };
        }

        const aktifYil = Math.max(0, 65 - yas);
        const pasifYil = Math.max(0, ko - aktifYil);
        const aktifRant = MR.progresifRant(aktifYil, teknikFaiz / 100);
        const pasifRant = MR.progresifRant(pasifYil, teknikFaiz / 100);
        const pasifIskonto = aktifYil > 0 ? 1 / Math.pow(1 + teknikFaiz / 100, aktifYil) : 1;

        const aktifGelirKaybi = aylikGelir * 12 * (maluliyet / 100) * aktifRant;
        const pasifAylikGelir = sonuc.asgariUcretKullan ? aylikGelir : (MR.asgariUcretBul(new Date(sonuc.kazaTarihi))?.ucret || aylikGelir);
        const pasifGelirKaybi = pasifAylikGelir * 12 * (maluliyet / 100) * pasifRant * pasifIskonto;

        const aktifKusurlu = aktifGelirKaybi * (kusur / 100);
        const pasifKusurlu = pasifGelirKaybi * (kusur / 100);
        const toplam = Math.round(aktifKusurlu + pasifKusurlu);

        return {
          tablo,
          kalanOmur: ko,
          aktifYil,
          pasifYil,
          aktifTazminat: aktifKusurlu,
          pasifTazminat: pasifKusurlu,
          toplam
        };
      });
    }, [sonuc]);

    // EMSAL FİLTRELEME
    const emsalFiltrelenmis = useMemo(() => {
      if (!sonuc || !MR.BH_EMSAL) return [];

      const hedefMaluliyet = sonuc.maluliyet;

      let emsaller = MR.BH_EMSAL
        .map(e => ({
          ...e,
          benzerlik: 100 - Math.abs(e.maluliyet - hedefMaluliyet)
        }))
        .filter(e => e.benzerlik >= 50); // %50+ benzer olanlar

      // ARAMA FİLTRESİ
      if (emsalArama.trim()) {
        const ara = emsalArama.toLowerCase();
        emsaller = emsaller.filter(e =>
          e.aciklama.toLowerCase().includes(ara) ||
          e.kaynak.toLowerCase().includes(ara) ||
          e.maluliyet.toString().includes(ara)
        );
      }

      return emsaller.sort((a, b) => b.benzerlik - a.benzerlik).slice(0, 10);
    }, [sonuc, emsalArama]);

    // PDF İNDİR
    const pdfIndir = () => {
      if (!sonuc) return;

      setPdfYukleniyor(true);

      const raporNo = 'BH' + Date.now();
      const tarih = new Date().toLocaleDateString('tr-TR');

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <!-- HEADER -->
          <div style="text-align: center; border-bottom: 3px solid #9333ea; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #9333ea; margin: 0; font-size: 24px;">MR HASAR DANIŞMANLIK</h1>
            <h2 style="color: #555; margin: 10px 0 0 0; font-size: 18px;">BEDENİ HASAR TAZMİNAT HESAP RAPORU</h2>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #777;">Rapor No: ${raporNo} | Tarih: ${tarih}</p>
          </div>

          <!-- MAĞDUR BİLGİLERİ -->
          <div style="margin-bottom: 30px;">
            <h3 style="background: #9333ea; color: white; padding: 10px; margin: 0 0 10px 0;">MAĞDUR BİLGİLERİ</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; width: 30%; background: #f9f9f9;"><strong>AD SOYAD</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${sonuc.magdurAdi}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>DOĞUM TARİHİ</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${new Date(sonuc.dogumTarihi).toLocaleDateString('tr-TR')}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>CİNSİYET</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${sonuc.cinsiyet}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>KAZA TARİHİ</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${new Date(sonuc.kazaTarihi).toLocaleDateString('tr-TR')}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>KAZA ANINDA YAŞ</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${sonuc.yas}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>MESLEK</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${sonuc.meslek}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>MALULİYET ORANI</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>%${sonuc.maluliyet}</strong></td>
              </tr>
            </table>
          </div>

          <!-- HESAPLAMA PARAMETRELERİ -->
          <div style="margin-bottom: 30px;">
            <h3 style="background: #9333ea; color: white; padding: 10px; margin: 0 0 10px 0;">HESAPLAMA PARAMETRELERİ</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; width: 30%; background: #f9f9f9;"><strong>AYLIK GELİR</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${MR.fmtK(sonuc.aylikGelir)} TL ${sonuc.asgariUcretKullan ? '(ASGARİ ÜCRET - ' + sonuc.asgariUcretYil + ')' : ''}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>PMF TABLOSU</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${sonuc.pmfTablosu}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>KALAN ÖMÜR</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${sonuc.kalanOmur} YIL</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>TEKNİK FAİZ</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">%${sonuc.teknikFaiz}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px; background: #f9f9f9;"><strong>KUSUR ORANI</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px;">%${sonuc.kusur}</td>
              </tr>
            </table>
          </div>

          <!-- DÖNEM DETAYLARI -->
          <div style="margin-bottom: 30px;">
            <h3 style="background: #9333ea; color: white; padding: 10px; margin: 0 0 10px 0;">AKTİF & PASİF DÖNEM HESAPLAMA</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <tr style="background: #f0f0f0;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">DÖNEM</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">YIL</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">RANT</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">TAZMİNAT (BRÜT)</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">TAZMİNAT (KUSURLU)</th>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>AKTİF DÖNEM</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${sonuc.aktifKalanYil}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${sonuc.aktifRant.toFixed(4)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${MR.fmtK(sonuc.aktifGelirKaybi)} TL</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${MR.fmtK(sonuc.aktifKusurlu)} TL</strong></td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>PASİF DÖNEM</strong></td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${sonuc.pasifKalanYil}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${sonuc.pasifRant.toFixed(4)} (x${sonuc.pasifIskonto.toFixed(4)})</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${MR.fmtK(sonuc.pasifGelirKaybi)} TL</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${MR.fmtK(sonuc.pasifKusurlu)} TL</strong></td>
              </tr>
            </table>
          </div>

          <!-- TOPLAM TAZMİNAT -->
          <div style="text-align: center; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; padding: 30px; margin-bottom: 30px; border-radius: 8px;">
            <h2 style="margin: 0 0 10px 0; font-size: 20px;">TOPLAM TAZMİNAT MİKTARI</h2>
            <h1 style="margin: 0; font-size: 36px;">${MR.fmtK(sonuc.toplamKusurlu)} TL</h1>
          </div>

          ${aiAnaliz ? `
          <!-- AI ANALİZ -->
          <div style="margin-bottom: 30px;">
            <h3 style="background: #9333ea; color: white; padding: 10px; margin: 0 0 10px 0;">YAPAY ZEKA ANALİZİ</h3>
            <div style="border: 1px solid #ddd; padding: 15px; background: #f9f9f9;">
              <p style="margin: 0; white-space: pre-wrap;">${aiAnaliz.analiz || aiAnaliz.metin || 'AI analiz sonucu bulunamadı'}</p>
            </div>
          </div>
          ` : ''}

          ${emsalFiltrelenmis.length > 0 ? `
          <!-- EMSAL KARARLARI -->
          <div style="margin-bottom: 30px;">
            <h3 style="background: #f59e0b; color: white; padding: 10px; margin: 0 0 10px 0;">EMSAL KARARLARI</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #f0f0f0;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">AÇIKLAMA</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">MALULİYET</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">TAZMİNAT</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">KAYNAK</th>
              </tr>
              ${emsalFiltrelenmis.slice(0, 5).map(e => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${e.aciklama}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">%${e.maluliyet}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${MR.fmtK(e.tutar)} TL</td>
                  <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${e.kaynak}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          ` : ''}

          <!-- FOOTER -->
          <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; font-size: 11px; color: #777;">
            <p><strong>UYARI:</strong> Bu rapor, bedeni hasar tazminat hesaplaması için hazırlanmış bir ön çalışmadır. Kesin tazminat miktarı mahkeme kararı ile belirlenir. PMF tabloları istatistiksel verilerdir ve gerçek yaşam süreleri farklılık gösterebilir.</p>
            <p style="margin-top: 10px;">Bu rapor MR HASAR DANIŞMANLIK tarafından ${tarih} tarihinde hazırlanmıştır.</p>
            <p style="margin-top: 5px; font-size: 10px;">© ${new Date().getFullYear()} MR Hasar Danışmanlık - Tüm Hakları Saklıdır</p>
          </div>
        </div>
      `;

      const el = document.createElement('div');
      el.innerHTML = html;
      document.body.appendChild(el);

      html2pdf().set({
        margin: 10,
        filename: 'MR_BH_Rapor_' + raporNo + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(el).save().then(() => {
        document.body.removeChild(el);
        setPdfYukleniyor(false);
      }).catch(err => {
        console.error('PDF hatası:', err);
        document.body.removeChild(el);
        setPdfYukleniyor(false);
        alert('PDF OLUŞTURULURKEN HATA OLUŞTU');
      });
    };

    // TEMİZLE
    const temizle = () => {
      setForm({
        magdurAdi: '',
        dogumTarihi: '',
        cinsiyet: 'ERKEK',
        kazaTarihi: '',
        maluliyetOrani: '',
        meslek: '',
        aylikGelir: '',
        asgariUcretKullan: false,
        pmfTablosu: 'TRH2010',
        teknikFaiz: '10',
        kusurOrani: '100'
      });
      setSonuc(null);
      setAiAnaliz(null);
      setDosyalar([]);
      setOcrSonuc(null);
      setEmsalArama('');
    };

    return (
      <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'linear-gradient(135deg, ' + MR.C.purple + ' 0%, ' + MR.C.pink + ' 100%)', padding: '16px', borderRadius: '12px' }}>
              <MR.LIcon name="Stethoscope" size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: '28px', color: MR.C.text, fontWeight: 700 }}>
                BEDENİ HASAR HESAPLAMA ROBOTU
              </h1>
              <p style={{ margin: '8px 0 0 0', color: MR.C.textSec }}>
                PROFESYONEL TAZMİNAT HESAPLAMA VE YAPAY ZEKA DESTEKLİ ANALİZ
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <MR.Badge color={MR.C.purple} icon="Sparkles" label="AI ANALİZ" />
              <MR.Badge color={MR.C.danger} icon="FileText" label="PDF RAPOR" />
              <MR.Badge color={MR.C.cyan} icon="Database" label="PMF KARŞILAŞTIRMA" />
              <MR.Badge color={MR.C.gold} icon="Scale" label="EMSAL KARARLARI" />
            </div>
          </div>

          {/* MOD SEÇİMİ */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid ' + MR.C.border }}>
            <button
              onClick={() => setMod('hizli')}
              style={{
                ...MR.S.btn,
                background: mod === 'hizli' ? 'linear-gradient(135deg, ' + MR.C.purple + ' 0%, ' + MR.C.pink + ' 100%)' : 'transparent',
                color: mod === 'hizli' ? 'white' : MR.C.textSec,
                border: 'none',
                borderBottom: mod === 'hizli' ? '2px solid ' + MR.C.purple : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                padding: '12px 24px'
              }}
            >
              <MR.LIcon name="Zap" size={18} />
              <span>HIZLI HESAPLAMA</span>
            </button>
            <button
              onClick={() => setMod('detayli')}
              style={{
                ...MR.S.btn,
                background: mod === 'detayli' ? 'linear-gradient(135deg, ' + MR.C.purple + ' 0%, ' + MR.C.pink + ' 100%)' : 'transparent',
                color: mod === 'detayli' ? 'white' : MR.C.textSec,
                border: 'none',
                borderBottom: mod === 'detayli' ? '2px solid ' + MR.C.purple : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                padding: '12px 24px'
              }}
            >
              <MR.LIcon name="FileText" size={18} />
              <span>DETAYLI RAPOR + OCR</span>
            </button>
          </div>
        </div>

        {/* GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
          {/* SOL KOLON - FORM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* EVRAK YÜKLEME (DETAYLI MOD) */}
            {mod === 'detayli' && (
              <div style={MR.S.card}>
                <div style={MR.S.cardHead}>
                  <MR.LIcon name="Upload" size={20} color={MR.C.purple} />
                  <span>TIBBİ EVRAK YÜKLEME & OCR</span>
                </div>
                <div style={MR.S.cardBody}>
                  {/* DRAG & DROP */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{
                      border: '2px dashed ' + (dragOver ? MR.C.purple : MR.C.border),
                      borderRadius: '8px',
                      padding: '32px',
                      textAlign: 'center',
                      background: dragOver ? MR.C.purple + '10' : MR.C.bgInput,
                      cursor: 'pointer',
                      marginBottom: '16px'
                    }}
                    onClick={() => document.getElementById('file-input-bh').click()}
                  >
                    <MR.LIcon name="Upload" size={48} color={dragOver ? MR.C.purple : MR.C.textMuted} />
                    <p style={{ margin: '16px 0 8px 0', color: MR.C.text, fontWeight: 600 }}>
                      DOSYALARI SÜRÜKLE & BIRAK
                    </p>
                    <p style={{ margin: 0, color: MR.C.textSec, fontSize: '14px' }}>
                      VEYA TIKLAYARAK SEÇ (PDF, JPG, PNG)
                    </p>
                    <input
                      id="file-input-bh"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDosyaEkle(e.target.files)}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* DOSYA LİSTESİ */}
                  {dosyalar.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      {dosyalar.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: MR.C.bgHover, borderRadius: '8px', marginBottom: '8px' }}>
                          <MR.LIcon name="FileText" size={20} color={MR.C.purple} />
                          <span style={{ flex: 1, color: MR.C.text }}>{f.name}</span>
                          <span style={{ color: MR.C.textMuted, fontSize: '12px' }}>{(f.size / 1024).toFixed(1)} KB</span>
                          <button onClick={() => dosyaCikar(i)} style={{ ...MR.S.btnD, padding: '6px 12px' }}>
                            <MR.LIcon name="X" size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* OCR BUTON */}
                  {dosyalar.length > 0 && (
                    <button onClick={ocrAnaliz} disabled={ocrYukleniyor} style={{ ...MR.S.btnP, width: '100%' }}>
                      {ocrYukleniyor ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <MR.Loading size={18} color="white" />
                          <span>OCR ANALİZİ YAPILIYOR...</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <MR.LIcon name="Brain" size={18} />
                          <span>OCR ANALİZİ BAŞLAT</span>
                        </div>
                      )}
                    </button>
                  )}

                  {/* OCR SONUÇ */}
                  {ocrSonuc && (
                    <div style={{ marginTop: '16px', padding: '16px', background: MR.C.success + '15', border: '1px solid ' + MR.C.success, borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <MR.LIcon name="CheckCircle" size={20} color={MR.C.success} />
                        <span style={{ color: MR.C.success, fontWeight: 600 }}>OCR ANALİZİ TAMAMLANDI</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: MR.C.textSec }}>
                        {ocrSonuc.mesaj || 'Bilgiler forma aktarıldı'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MAĞDUR BİLGİLERİ */}
            <div style={MR.S.card}>
              <div style={MR.S.cardHead}>
                <MR.LIcon name="User" size={20} color={MR.C.purple} />
                <span>MAĞDUR BİLGİLERİ</span>
              </div>
              <div style={MR.S.cardBody}>
                <MR.FormGroup label="MAĞDUR ADI SOYADI" required>
                  <input
                    type="text"
                    value={form.magdurAdi}
                    onChange={e => handleChange('magdurAdi', e.target.value.toUpperCase())}
                    placeholder="AD SOYAD GİRİNİZ"
                    style={MR.S.input}
                  />
                </MR.FormGroup>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <MR.FormGroup label="DOĞUM TARİHİ" required>
                    <input
                      type="date"
                      value={form.dogumTarihi}
                      onChange={e => handleChange('dogumTarihi', e.target.value)}
                      style={MR.S.input}
                    />
                  </MR.FormGroup>

                  <MR.FormGroup label="CİNSİYET" required>
                    <select
                      value={form.cinsiyet}
                      onChange={e => handleChange('cinsiyet', e.target.value)}
                      style={MR.S.select}
                    >
                      <option value="ERKEK">ERKEK</option>
                      <option value="KADIN">KADIN</option>
                    </select>
                  </MR.FormGroup>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <MR.FormGroup label="KAZA TARİHİ" required>
                    <input
                      type="date"
                      value={form.kazaTarihi}
                      onChange={e => handleChange('kazaTarihi', e.target.value)}
                      style={MR.S.input}
                    />
                  </MR.FormGroup>

                  <MR.FormGroup label="MALULİYET ORANI (%)" required>
                    <input
                      type="text"
                      value={form.maluliyetOrani}
                      onChange={e => handleChange('maluliyetOrani', MR.fmtInput(e.target.value))}
                      placeholder="1-100"
                      style={MR.S.input}
                    />
                  </MR.FormGroup>
                </div>

                <MR.FormGroup label="MESLEK">
                  <input
                    type="text"
                    value={form.meslek}
                    onChange={e => handleChange('meslek', e.target.value.toUpperCase())}
                    placeholder="MESLEK GİRİNİZ"
                    style={MR.S.input}
                  />
                </MR.FormGroup>

                <MR.FormGroup label="AYLIK GELİR (TL)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="text"
                      value={form.aylikGelir}
                      onChange={e => handleChange('aylikGelir', MR.fmtInput(e.target.value))}
                      placeholder="0.00"
                      disabled={form.asgariUcretKullan}
                      style={{ ...MR.S.input, flex: 1 }}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: MR.C.text, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={form.asgariUcretKullan}
                        onChange={e => handleChange('asgariUcretKullan', e.target.checked)}
                      />
                      <span>ASGARİ ÜCRET</span>
                    </label>
                  </div>
                </MR.FormGroup>
              </div>
            </div>

            {/* HESAPLAMA PARAMETRELERİ */}
            <div style={MR.S.card}>
              <div style={MR.S.cardHead}>
                <MR.LIcon name="Calculator" size={20} color={MR.C.cyan} />
                <span>HESAPLAMA PARAMETRELERİ</span>
              </div>
              <div style={MR.S.cardBody}>
                <MR.FormGroup label="PMF TABLOSU">
                  <select
                    value={form.pmfTablosu}
                    onChange={e => handleChange('pmfTablosu', e.target.value)}
                    style={MR.S.select}
                  >
                    <option value="TRH2010">TRH 2010 (HAYAT TABLOSU)</option>
                    <option value="CSO1980">CSO 1980 (AMERİKAN)</option>
                    <option value="PMF1931">PMF 1931 (KLASIK)</option>
                  </select>
                </MR.FormGroup>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <MR.FormGroup label="TEKNİK FAİZ (%)">
                    <input
                      type="text"
                      value={form.teknikFaiz}
                      onChange={e => handleChange('teknikFaiz', MR.fmtInput(e.target.value))}
                      placeholder="10"
                      style={MR.S.input}
                    />
                  </MR.FormGroup>

                  <MR.FormGroup label="KUSUR ORANI (%)">
                    <input
                      type="text"
                      value={form.kusurOrani}
                      onChange={e => handleChange('kusurOrani', MR.fmtInput(e.target.value))}
                      placeholder="100"
                      style={MR.S.input}
                    />
                  </MR.FormGroup>
                </div>
              </div>
            </div>

            {/* BUTONLAR */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={temizle} style={{ ...MR.S.btnS, flex: 1 }}>
                <MR.LIcon name="RotateCcw" size={18} />
                <span>TEMİZLE</span>
              </button>
              <button onClick={hesapla} disabled={hesaplaniyor} style={{ ...MR.S.btnP, flex: 2 }}>
                {hesaplaniyor ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <MR.Loading size={18} color="white" />
                    <span>HESAPLANIYOR...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <MR.LIcon name="Calculator" size={18} />
                    <span>HESAPLA + AI ANALİZ</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* SAĞ KOLON - SONUÇLAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* SONUÇ */}
            {sonuc ? (
              <div>
                {/* TOPLAM TAZMİNAT */}
                <div style={{
                  ...MR.S.card,
                  background: 'linear-gradient(135deg, ' + MR.C.purple + ' 0%, ' + MR.C.pink + ' 100%)',
                  border: 'none',
                  marginBottom: '24px'
                }}>
                  <div style={{ ...MR.S.cardBody, textAlign: 'center', padding: '32px' }}>
                    <p style={{ margin: '0 0 8px 0', color: 'rgba(255,255,255,0.9)', fontSize: '16px', fontWeight: 600 }}>
                      TOPLAM TAZMİNAT MİKTARI
                    </p>
                    <h1 style={{ margin: 0, color: 'white', fontSize: '48px', fontWeight: 700 }}>
                      {MR.fmtK(sonuc.toplamKusurlu)} TL
                    </h1>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '24px', justifyContent: 'center' }}>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', padding: '16px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 8px 0', color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>AKTİF DÖNEM</p>
                        <p style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: 600 }}>{MR.fmtK(sonuc.aktifKusurlu)} TL</p>
                      </div>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', padding: '16px', borderRadius: '8px' }}>
                        <p style={{ margin: '0 0 8px 0', color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>PASİF DÖNEM</p>
                        <p style={{ margin: 0, color: 'white', fontSize: '20px', fontWeight: 600 }}>{MR.fmtK(sonuc.pasifKusurlu)} TL</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PMF KARŞILAŞTIRMA */}
                {pmfKarsilastirma.length > 0 && (
                  <div style={{ ...MR.S.card, marginBottom: '24px' }}>
                    <div style={MR.S.cardHead}>
                      <MR.LIcon name="Database" size={20} color={MR.C.cyan} />
                      <span>PMF TABLOSU KARŞILAŞTIRMASI</span>
                    </div>
                    <div style={MR.S.cardBody}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        {pmfKarsilastirma.map((p, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '16px',
                              background: p.tablo === sonuc.pmfTablosu ? MR.C.cyan + '20' : MR.C.bgHover,
                              border: p.tablo === sonuc.pmfTablosu ? '2px solid ' + MR.C.cyan : '1px solid ' + MR.C.border,
                              borderRadius: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              <MR.LIcon name="Database" size={16} color={MR.C.cyan} />
                              <span style={{ color: MR.C.text, fontWeight: 600, fontSize: '14px' }}>{p.tablo}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: MR.C.textSec, marginBottom: '8px' }}>
                              <p style={{ margin: '4px 0' }}>Kalan Ömür: {p.kalanOmur} YIL</p>
                              <p style={{ margin: '4px 0' }}>Aktif: {p.aktifYil} YIL</p>
                              <p style={{ margin: '4px 0' }}>Pasif: {p.pasifYil} YIL</p>
                            </div>
                            <div style={{
                              marginTop: '12px',
                              paddingTop: '12px',
                              borderTop: '1px solid ' + MR.C.border,
                              color: MR.C.cyan,
                              fontWeight: 700,
                              fontSize: '16px'
                            }}>
                              {MR.fmtK(p.toplam)} TL
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI ANALİZ */}
                {aiYukleniyor ? (
                  <div style={{ ...MR.S.card, marginBottom: '24px' }}>
                    <div style={MR.S.cardBody}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', padding: '32px' }}>
                        <MR.Loading size={24} color={MR.C.purple} />
                        <span style={{ color: MR.C.text, fontSize: '16px' }}>YAPAY ZEKA ANALİZİ YAPILIYOR...</span>
                      </div>
                    </div>
                  </div>
                ) : aiAnaliz ? (
                  <div style={{
                    ...MR.S.card,
                    background: 'linear-gradient(135deg, ' + MR.C.purple + '15 0%, ' + MR.C.pink + '15 100%)',
                    border: '2px solid ' + MR.C.purple,
                    marginBottom: '24px'
                  }}>
                    <div style={MR.S.cardHead}>
                      <MR.LIcon name="Sparkles" size={20} color={MR.C.purple} />
                      <span>YAPAY ZEKA ANALİZ RAPORU</span>
                      <div style={{ marginLeft: 'auto' }}>
                        <MR.Badge color={MR.C.purple} label="AI" />
                      </div>
                    </div>
                    <div style={MR.S.cardBody}>
                      <div style={{
                        padding: '20px',
                        background: 'white',
                        borderRadius: '8px',
                        color: MR.C.text,
                        fontSize: '14px',
                        lineHeight: '1.8',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {aiAnaliz.analiz || aiAnaliz.metin || 'AI analiz sonucu bulunamadı'}
                      </div>
                      {aiAnaliz.kaynak && (
                        <div style={{ marginTop: '12px', fontSize: '12px', color: MR.C.textMuted, textAlign: 'right' }}>
                          Kaynak: {aiAnaliz.kaynak}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* EMSAL KARARLARI */}
                {emsalFiltrelenmis.length > 0 && (
                  <div style={{ ...MR.S.card, marginBottom: '24px' }}>
                    <div style={MR.S.cardHead}>
                      <MR.LIcon name="Scale" size={20} color={MR.C.gold} />
                      <span>EMSAL KARARLARI ({emsalFiltrelenmis.length})</span>
                    </div>
                    <div style={MR.S.cardBody}>
                      <div style={{ marginBottom: '16px' }}>
                        <input
                          type="text"
                          value={emsalArama}
                          onChange={e => setEmsalArama(e.target.value)}
                          placeholder="EMSAL ARA..."
                          style={MR.S.input}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                        {emsalFiltrelenmis.map((e, i) => (
                          <div key={i} style={{
                            padding: '16px',
                            background: MR.C.gold + '10',
                            border: '1px solid ' + MR.C.gold,
                            borderRadius: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: '0 0 8px 0', color: MR.C.text, fontWeight: 600 }}>{e.aciklama}</p>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                  <MR.Badge color={MR.C.purple} label={'%' + e.maluliyet + ' MALULİYET'} />
                                  <span style={{ color: MR.C.gold, fontWeight: 700, fontSize: '16px' }}>{MR.fmtK(e.tutar)} TL</span>
                                </div>
                              </div>
                              <div style={{
                                padding: '4px 12px',
                                background: MR.C.cyan + '20',
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: MR.C.cyan,
                                fontWeight: 600
                              }}>
                                %{e.benzerlik.toFixed(0)} BENZER
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: MR.C.textMuted }}>{e.kaynak}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF İNDİR */}
                <button onClick={pdfIndir} disabled={pdfYukleniyor} style={{ ...MR.S.btnD, width: '100%' }}>
                  {pdfYukleniyor ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <MR.Loading size={18} color="white" />
                      <span>PDF OLUŞTURULUYOR...</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <MR.LIcon name="Download" size={18} />
                      <span>PDF RAPOR İNDİR</span>
                    </div>
                  )}
                </button>
              </div>
            ) : (
              <MR.EmptyState
                icon="Calculator"
                title="HESAPLAMA YAPILMADI"
                message="MAĞDUR BİLGİLERİNİ GİRİP HESAPLA BUTONUNA BASIN"
              />
            )}
          </div>
        </div>
      </div>
    );
  };
})();
