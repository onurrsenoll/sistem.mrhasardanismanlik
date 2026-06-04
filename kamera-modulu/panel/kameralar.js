/**
 * MR HASAR DANIŞMANLIK — KAMERA İZLEME MODÜLÜ (PANEL)
 * ============================================================================
 * BAĞIMSIZ MODÜL. Mevcut hiçbir dosyaya / yapıya dokunmaz.
 * - Kendi kendine yüklenir: ekranın sağ-altına yüzen bir "KAMERALAR" butonu ekler.
 * - Tıklayınca tam ekran izleyici açılır (seçmeli tek kamera veya 2x2 hepsi).
 * - Görüntü, ofis bilgisayarındaki "köprü" (go2rtc) üzerinden GERÇEK ZAMANLI gelir.
 * - Ayarlar yalnızca bu tarayıcıda saklanır (localStorage: mr_kamera_config).
 *
 * KURULUM: index.html içine SADECE şu satır eklenir (app.js'ten ÖNCE):
 *   <script type="text/babel" data-type="module" src="js/pages/kameralar.js"></script>
 *
 * NOT: Sistem HTTPS olduğundan köprü adresi de https:// olmalıdır
 *      (Cloudflare Tunnel bunu otomatik sağlar).
 * ============================================================================
 */
(function () {
  'use strict';

  if (window.__MR_KAMERA_YUKLENDI__) return;
  window.__MR_KAMERA_YUKLENDI__ = true;

  var LS_KEY = 'mr_kamera_config';

  /* ─── VARSAYILAN AYARLAR ─── */
  function varsayilanConfig() {
    return {
      kopru: '',                                  // örn: https://kamera.mrhasardanismanlik.com
      sablon: '{KOPRU}/stream.html?src={KAMERA}', // go2rtc evrensel oynatıcı
      dolgu: 1.4,                                 // 1.0=sığdır, >1=doldur (Hikvision gibi tam alan)
      kameralar: [
        { id: 'kamera01', ad: 'KAMERA 1', aktif: true },
        { id: 'kamera02', ad: 'KAMERA 2', aktif: true },
        { id: 'kamera03', ad: 'KAMERA 3', aktif: true },
        { id: 'kamera04', ad: 'KAMERA 4', aktif: true }
      ]
    };
  }

  function configOku() {
    try {
      var ham = localStorage.getItem(LS_KEY);
      if (!ham) return varsayilanConfig();
      var c = JSON.parse(ham);
      var d = varsayilanConfig();
      if (!c || typeof c !== 'object') return d;
      c.kopru = (c.kopru || '').trim();
      c.sablon = (c.sablon || d.sablon).trim();
      if (!Array.isArray(c.kameralar) || !c.kameralar.length) c.kameralar = d.kameralar;
      c.dolgu = parseFloat(c.dolgu); if (!(c.dolgu >= 1)) c.dolgu = 1.4; if (c.dolgu > 3) c.dolgu = 3;
      return c;
    } catch (e) { return varsayilanConfig(); }
  }

  function configYaz(c) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch (e) {}
  }

  /* ─── RENKLER (sistem temasıyla uyum; MR yoksa varsayılan) ─── */
  function renk() {
    var C = (window.MR && window.MR.C) ? window.MR.C : null;
    return {
      bg: (C && C.bg) || '#0f172a',
      kart: (C && C.bgCard) || '#1e293b',
      hover: (C && C.bgHover) || '#334155',
      kenar: (C && C.border) || '#334155',
      accent: (C && C.accent) || '#1a56db',
      accent2: (C && C.accentLight) || '#3b82f6',
      grad: (C && C.accentGradient) || 'linear-gradient(135deg,#3b82f6 0%,#1a56db 50%,#1e3a8a 100%)',
      yazi: (C && C.text) || '#f1f5f9',
      yaziSec: (C && C.textSec) || '#cbd5e1',
      yaziSilik: (C && C.textMuted) || '#64748b',
      basari: (C && C.success) || '#10b981',
      tehlike: (C && C.danger) || '#ef4444'
    };
  }

  function girisYapildiMi() {
    try { return !!localStorage.getItem('mr_token'); } catch (e) { return false; }
  }

  function el(tag, stil, ic) {
    var d = document.createElement(tag);
    if (stil) for (var k in stil) { d.style[k] = stil[k]; }
    if (ic != null) d.innerHTML = ic;
    return d;
  }

  function kameraUrl(c, kam) {
    var kopru = (c.kopru || '').replace(/\/+$/, '');
    return (c.sablon || '{KOPRU}/stream.html?src={KAMERA}')
      .replace('{KOPRU}', kopru)
      .replace('{KAMERA}', encodeURIComponent(kam.id));
  }

  /* ════════════════════ STİL ════════════════════ */
  function stilEkle() {
    if (document.getElementById('mr-kamera-stil')) return;
    var s = document.createElement('style');
    s.id = 'mr-kamera-stil';
    s.textContent = [
      '#mr-kamera-btn{position:fixed;right:24px;bottom:24px;z-index:99990;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px -5px rgba(0,0,0,.5);transition:transform .2s,filter .2s}',
      '#mr-kamera-btn:hover{transform:scale(1.07);filter:brightness(1.1)}',
      '#mr-kamera-btn:active{transform:scale(.95)}',
      '#mr-kamera-overlay{position:fixed;inset:0;z-index:99991;display:none;flex-direction:column;background:rgba(2,6,23,.96);backdrop-filter:blur(4px)}',
      '#mr-kamera-overlay.acik{display:flex;animation:mrkfade .25s ease}',
      '@keyframes mrkfade{from{opacity:0}to{opacity:1}}',
      '.mr-kamera-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08)}',
      '.mr-kamera-cip{padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#cbd5e1;font:800 12px Manrope,sans-serif;letter-spacing:.4px;cursor:pointer;text-transform:uppercase;transition:all .15s}',
      '.mr-kamera-cip:hover{background:rgba(255,255,255,.08)}',
      '.mr-kamera-cip.aktif{color:#fff;border-color:transparent}',
      '.mr-kamera-ikonbtn{width:38px;height:38px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e2e8f0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}',
      '.mr-kamera-ikonbtn:hover{background:rgba(255,255,255,.10)}',
      '.mr-kamera-govde{flex:1;min-height:0;padding:14px;overflow:auto}',
      '.mr-kamera-grid{display:grid;gap:12px;width:100%;height:100%}',
      '.mr-kamera-grid.tek{grid-template-columns:1fr}',
      '.mr-kamera-grid.dort{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}',
      '.mr-kamera-hucre{position:relative;background:#000;border:1px solid rgba(255,255,255,.10);border-radius:12px;overflow:hidden;min-height:200px}',
      '.mr-kamera-hucre iframe{width:100%;height:100%;border:0;display:block;background:#000;transform-origin:center center;transition:transform .15s}',
      '.mr-kamera-etiket{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.55);color:#fff;font:800 11px Manrope,sans-serif;letter-spacing:.5px;padding:4px 10px;border-radius:7px;text-transform:uppercase;pointer-events:none}',
      '.mr-kamera-foto{position:absolute;right:10px;top:10px;z-index:3;width:36px;height:36px;border-radius:9px;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}',
      '.mr-kamera-foto:hover{background:rgba(0,0,0,.85)}',
      '.mr-kamera-bos{display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font:700 14px Manrope,sans-serif;text-align:center;padding:30px}',
      '.mr-kamera-ayar{position:absolute;inset:0;z-index:5;display:none;align-items:flex-start;justify-content:center;padding:24px;overflow:auto}',
      '.mr-kamera-ayar.acik{display:flex}',
      '.mr-kamera-ayar-kart{width:100%;max-width:560px;background:#1e293b;border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:22px}',
      '.mr-kamera-lbl{display:block;font:800 11px Manrope,sans-serif;letter-spacing:.5px;color:#94a3b8;text-transform:uppercase;margin:14px 0 6px}',
      '.mr-kamera-inp{width:100%;padding:11px 13px;border-radius:9px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font:600 13px Manrope,sans-serif;outline:none;box-sizing:border-box;text-transform:none}',
      '.mr-kamera-satir{display:flex;gap:8px;align-items:center;margin-top:8px}',
      '.mr-kamera-btn2{padding:11px 18px;border-radius:10px;border:none;cursor:pointer;font:800 12px Manrope,sans-serif;letter-spacing:.4px;text-transform:uppercase;color:#fff}',
      '@media(max-width:760px){.mr-kamera-grid.dort{grid-template-columns:1fr;grid-template-rows:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ════════════════════ DURUM ════════════════════ */
  var durum = { secim: 'hepsi', overlay: null }; // 'hepsi' | kamera id

  /* ════════════════════ İZLEYİCİYİ ÇİZ ════════════════════ */
  function govdeCiz() {
    var c = configOku();
    var govde = document.getElementById('mr-kamera-govde');
    if (!govde) return;
    govde.innerHTML = '';

    if (!c.kopru) {
      var bos = el('div', null,
        '<div class="mr-kamera-bos">KAMERA KÖPRÜ ADRESİ GİRİLMEMİŞ.<br><br>' +
        'Sağ üstteki ⚙ AYARLAR butonundan, ofis bilgisayarındaki köprünün<br>' +
        'HTTPS adresini girin (örn: https://kamera.firmaniz.com).</div>');
      govde.appendChild(bos);
      return;
    }

    var aktifler = c.kameralar.filter(function (k) { return k.aktif; });
    var kopru = (c.kopru || '').replace(/\/+$/, '');
    var grid = el('div');
    grid.className = 'mr-kamera-grid ' + (durum.secim === 'hepsi' ? 'dort' : 'tek');

    var gosterilecek = durum.secim === 'hepsi'
      ? aktifler
      : aktifler.filter(function (k) { return k.id === durum.secim; });

    if (!gosterilecek.length) {
      govde.appendChild(el('div', null, '<div class="mr-kamera-bos">GÖSTERİLECEK AKTİF KAMERA YOK.</div>'));
      return;
    }

    gosterilecek.forEach(function (k) {
      var hucre = el('div'); hucre.className = 'mr-kamera-hucre';
      var ifr = document.createElement('iframe');
      ifr.src = kameraUrl(c, k);
      ifr.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      ifr.setAttribute('allowfullscreen', 'true');
      ifr.loading = 'eager';
      ifr.style.transform = 'scale(' + (c.dolgu || 1.4) + ')';
      hucre.appendChild(ifr);
      hucre.appendChild(el('div', null, k.ad));
      hucre.lastChild.className = 'mr-kamera-etiket';
      // FOTO ÇEK (anlık görüntü) — go2rtc frame.jpeg
      var foto = el('button', null, '📷');
      foto.className = 'mr-kamera-foto'; foto.title = 'FOTO ÇEK';
      foto.onclick = (function (kid) {
        return function (e) {
          e.stopPropagation();
          if (!kopru) { if (window.MR && MR.toast) MR.toast('ÖNCE KÖPRÜ ADRESİNİ GİRİN', 'warning'); return; }
          window.open(kopru + '/api/frame.jpeg?src=' + encodeURIComponent(kid), '_blank');
        };
      })(k.id);
      hucre.appendChild(foto);
      grid.appendChild(hucre);
    });
    govde.appendChild(grid);
  }

  function cipleriCiz() {
    var c = configOku();
    var bar = document.getElementById('mr-kamera-cipler');
    if (!bar) return;
    bar.innerHTML = '';
    var R = renk();

    var tumu = el('button', null, 'TÜMÜ (2x2)');
    tumu.className = 'mr-kamera-cip' + (durum.secim === 'hepsi' ? ' aktif' : '');
    if (durum.secim === 'hepsi') tumu.style.background = R.grad;
    tumu.onclick = function () { durum.secim = 'hepsi'; cipleriCiz(); govdeCiz(); };
    bar.appendChild(tumu);

    c.kameralar.filter(function (k) { return k.aktif; }).forEach(function (k) {
      var b = el('button', null, k.ad);
      b.className = 'mr-kamera-cip' + (durum.secim === k.id ? ' aktif' : '');
      if (durum.secim === k.id) b.style.background = R.grad;
      b.onclick = function () { durum.secim = k.id; cipleriCiz(); govdeCiz(); };
      bar.appendChild(b);
    });
  }

  /* ════════════════════ AYARLAR PANELİ ════════════════════ */
  function ayarlariCiz() {
    var c = configOku();
    var kutu = document.getElementById('mr-kamera-ayar-icerik');
    if (!kutu) return;
    kutu.innerHTML = '';

    var baslik = el('div', { font: '800 16px Manrope,sans-serif', letterSpacing: '.3px', color: '#f1f5f9', textTransform: 'uppercase', marginBottom: '4px' }, 'KAMERA AYARLARI');
    kutu.appendChild(baslik);

    var lbl1 = el('label', null, 'KÖPRÜ ADRESİ (HTTPS)'); lbl1.className = 'mr-kamera-lbl';
    var inp1 = el('input'); inp1.className = 'mr-kamera-inp'; inp1.id = 'mrk-kopru';
    inp1.placeholder = 'https://kamera.firmaniz.com'; inp1.value = c.kopru || '';
    kutu.appendChild(lbl1); kutu.appendChild(inp1);

    var lbl2 = el('label', null, 'OYNATICI ŞABLONU (gerekirse)'); lbl2.className = 'mr-kamera-lbl';
    var inp2 = el('input'); inp2.className = 'mr-kamera-inp'; inp2.id = 'mrk-sablon';
    inp2.value = c.sablon || '{KOPRU}/stream.html?src={KAMERA}';
    kutu.appendChild(lbl2); kutu.appendChild(inp2);

    var lbl3 = el('label', null, 'KAMERALAR (ID · GÖRÜNEN AD · AKTİF)'); lbl3.className = 'mr-kamera-lbl';
    kutu.appendChild(lbl3);

    c.kameralar.forEach(function (k, i) {
      var satir = el('div'); satir.className = 'mr-kamera-satir';
      var idIn = el('input'); idIn.className = 'mr-kamera-inp'; idIn.style.flex = '0 0 120px';
      idIn.value = k.id; idIn.setAttribute('data-mrk-id', i);
      var adIn = el('input'); adIn.className = 'mr-kamera-inp';
      adIn.value = k.ad; adIn.setAttribute('data-mrk-ad', i);
      var chkWrap = el('label', { display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', font: '700 11px Manrope,sans-serif', whiteSpace: 'nowrap' });
      var chk = el('input'); chk.type = 'checkbox'; chk.checked = !!k.aktif; chk.setAttribute('data-mrk-aktif', i);
      chk.style.width = '18px'; chk.style.height = '18px';
      chkWrap.appendChild(chk); chkWrap.appendChild(document.createTextNode('AKTİF'));
      satir.appendChild(idIn); satir.appendChild(adIn); satir.appendChild(chkWrap);
      kutu.appendChild(satir);
    });

    var R = renk();
    var btnSatir = el('div', { display: 'flex', gap: '8px', marginTop: '18px' });
    var kaydet = el('button', null, 'KAYDET'); kaydet.className = 'mr-kamera-btn2'; kaydet.style.background = R.grad;
    kaydet.onclick = function () {
      var yeni = configOku();
      yeni.kopru = (document.getElementById('mrk-kopru').value || '').trim();
      yeni.sablon = (document.getElementById('mrk-sablon').value || '{KOPRU}/stream.html?src={KAMERA}').trim();
      var idler = kutu.querySelectorAll('[data-mrk-id]');
      var arr = [];
      for (var i = 0; i < idler.length; i++) {
        var idx = idler[i].getAttribute('data-mrk-id');
        var ad = kutu.querySelector('[data-mrk-ad="' + idx + '"]');
        var ak = kutu.querySelector('[data-mrk-aktif="' + idx + '"]');
        var idv = (idler[i].value || '').trim();
        if (!idv) continue;
        arr.push({ id: idv, ad: (ad.value || idv).trim(), aktif: !!ak.checked });
      }
      if (arr.length) yeni.kameralar = arr;
      configYaz(yeni);
      if (window.MR && typeof window.MR.toast === 'function') window.MR.toast('KAMERA AYARLARI KAYDEDİLDİ', 'success');
      ayarKapat();
      durum.secim = 'hepsi';
      cipleriCiz(); govdeCiz();
    };
    var kapat = el('button', null, 'KAPAT'); kapat.className = 'mr-kamera-btn2';
    kapat.style.background = 'transparent'; kapat.style.border = '1px solid rgba(255,255,255,.18)'; kapat.style.color = '#cbd5e1';
    kapat.onclick = ayarKapat;
    btnSatir.appendChild(kaydet); btnSatir.appendChild(kapat);
    kutu.appendChild(btnSatir);

    var ipucu = el('div', { marginTop: '14px', color: '#64748b', font: '600 11px Manrope,sans-serif', lineHeight: '1.6', textTransform: 'none' },
      'İpucu: Köprü adresi, ofis bilgisayarındaki go2rtc’nin Cloudflare Tunnel HTTPS adresidir. ' +
      'Kamera ID’leri go2rtc.yaml içindeki isimlerle (kamera01…04) aynı olmalıdır.');
    kutu.appendChild(ipucu);
  }

  function ayarAc() { var a = document.getElementById('mr-kamera-ayar'); if (a) { ayarlariCiz(); a.classList.add('acik'); } }
  function ayarKapat() { var a = document.getElementById('mr-kamera-ayar'); if (a) a.classList.remove('acik'); }

  /* ════════════════════ DOLGU (ZOOM — Hikvision gibi tam doldur) ════════════════════ */
  function dolguDegistir(delta) {
    var c = configOku();
    var v = Math.round(((c.dolgu || 1.4) + delta) * 100) / 100;
    if (v < 1) v = 1; if (v > 3) v = 3;
    c.dolgu = v; configYaz(c);
    var lbl = document.getElementById('mr-kamera-dolgu-val'); if (lbl) lbl.textContent = Math.round(v * 100) + '%';
    govdeCiz();
  }

  /* ════════════════════ OVERLAY KUR ════════════════════ */
  function overlayKur() {
    if (document.getElementById('mr-kamera-overlay')) return;
    var R = renk();
    var ov = el('div'); ov.id = 'mr-kamera-overlay'; ov.setAttribute('data-widget', '1'); ov.setAttribute('data-no-print', '1');

    /* ÜST BAR */
    var bar = el('div'); bar.className = 'mr-kamera-bar';
    var baslik = el('div', { display: 'flex', alignItems: 'center', gap: '8px', font: '800 14px Manrope,sans-serif', letterSpacing: '.4px', color: '#fff', textTransform: 'uppercase', marginRight: '6px' });
    baslik.innerHTML = kameraSvg('#fff', 20) + '<span>KAMERA İZLEME</span>';
    bar.appendChild(baslik);

    var cipler = el('div', { display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1' });
    cipler.id = 'mr-kamera-cipler';
    bar.appendChild(cipler);

    /* DOLGU (Hikvision gibi tam doldur) — canlı ayar */
    var dolguGrup = el('div', { display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' });
    dolguGrup.appendChild(el('span', { font: '800 10px Manrope,sans-serif', color: '#64748b', letterSpacing: '.5px' }, 'DOLGU'));
    var dEksi = el('button', null, '−'); dEksi.className = 'mr-kamera-ikonbtn'; dEksi.style.width = '30px'; dEksi.style.height = '30px'; dEksi.title = 'KÜÇÜLT (SIĞDIR)'; dEksi.onclick = function () { dolguDegistir(-0.1); };
    var dVal = el('div', { font: '800 11px Manrope,sans-serif', color: '#cbd5e1', minWidth: '40px', textAlign: 'center' }, Math.round((configOku().dolgu || 1.4) * 100) + '%'); dVal.id = 'mr-kamera-dolgu-val';
    var dArti = el('button', null, '+'); dArti.className = 'mr-kamera-ikonbtn'; dArti.style.width = '30px'; dArti.style.height = '30px'; dArti.title = 'BÜYÜT (TAM DOLDUR)'; dArti.onclick = function () { dolguDegistir(0.1); };
    dolguGrup.appendChild(dEksi); dolguGrup.appendChild(dVal); dolguGrup.appendChild(dArti);
    bar.appendChild(dolguGrup);

    var tamekran = el('button', { title: 'TAM EKRAN' }, kameraSvg.gen('M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3'));
    tamekran.className = 'mr-kamera-ikonbtn'; tamekran.title = 'TAM EKRAN';
    tamekran.onclick = function () {
      var g = document.getElementById('mr-kamera-govde');
      if (!document.fullscreenElement) { (g.requestFullscreen ? g.requestFullscreen() : (g.webkitRequestFullscreen && g.webkitRequestFullscreen())); }
      else { document.exitFullscreen && document.exitFullscreen(); }
    };
    var ayarBtn = el('button'); ayarBtn.className = 'mr-kamera-ikonbtn'; ayarBtn.title = 'AYARLAR';
    ayarBtn.innerHTML = kameraSvg.gen('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z');
    ayarBtn.onclick = ayarAc;
    var kapatBtn = el('button'); kapatBtn.className = 'mr-kamera-ikonbtn'; kapatBtn.title = 'KAPAT';
    kapatBtn.style.borderColor = 'rgba(239,68,68,.4)';
    kapatBtn.innerHTML = kameraSvg.gen('M18 6 6 18 M6 6l12 12');
    kapatBtn.onclick = overlayKapat;
    bar.appendChild(tamekran); bar.appendChild(ayarBtn); bar.appendChild(kapatBtn);
    ov.appendChild(bar);

    /* GÖVDE */
    var govde = el('div'); govde.id = 'mr-kamera-govde'; govde.className = 'mr-kamera-govde';
    ov.appendChild(govde);

    /* AYARLAR KATMANI */
    var ayar = el('div'); ayar.id = 'mr-kamera-ayar'; ayar.className = 'mr-kamera-ayar';
    var ayarKart = el('div'); ayarKart.className = 'mr-kamera-ayar-kart'; ayarKart.id = 'mr-kamera-ayar-icerik';
    ayar.appendChild(ayarKart);
    ov.appendChild(ayar);

    document.body.appendChild(ov);
    durum.overlay = ov;
  }

  function overlayAc() { overlayKur(); var ov = document.getElementById('mr-kamera-overlay'); ov.classList.add('acik'); cipleriCiz(); govdeCiz(); }
  function overlayKapat() {
    var ov = document.getElementById('mr-kamera-overlay');
    if (ov) ov.classList.remove('acik');
    ayarKapat();
    var govde = document.getElementById('mr-kamera-govde');
    if (govde) govde.innerHTML = ''; // yayını durdur (iframe'leri kaldır)
  }

  /* ════════════════════ YÜZEN BUTON ════════════════════ */
  function kameraSvg(rd, boy) {
    var b = boy || 22;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + b + '" height="' + b + '" viewBox="0 0 24 24" fill="none" stroke="' + (rd || '#fff') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
  }
  kameraSvg.gen = function (d) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  };

  function butonKur() {
    if (document.getElementById('mr-kamera-btn')) return;
    var R = renk();
    var b = document.createElement('button');
    b.id = 'mr-kamera-btn';
    b.title = 'KAMERALAR';
    b.setAttribute('data-widget', '1');
    b.setAttribute('data-no-print', '1');
    b.style.background = R.grad;
    b.innerHTML = kameraSvg('#fff', 24);
    b.onclick = overlayAc;
    document.body.appendChild(b);
  }

  function gorunurlukAyarla() {
    var btn = document.getElementById('mr-kamera-btn');
    var goster = girisYapildiMi();
    if (goster && !btn) { stilEkle(); butonKur(); }
    else if (btn) { btn.style.display = goster ? 'flex' : 'none'; }
  }

  /* ════════════════════ BAŞLAT ════════════════════ */
  function baslat() {
    stilEkle();
    gorunurlukAyarla();
    // Giriş/çıkış durumunu izle (token gelince buton görünür, çıkışta gizlenir)
    setInterval(gorunurlukAyarla, 1500);
    window.addEventListener('storage', gorunurlukAyarla);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var a = document.getElementById('mr-kamera-ayar');
        if (a && a.classList.contains('acik')) { ayarKapat(); return; }
        var ov = document.getElementById('mr-kamera-overlay');
        if (ov && ov.classList.contains('acik')) overlayKapat();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }
})();
