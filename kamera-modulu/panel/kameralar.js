/**
 * MR HASAR DANIŞMANLIK — KAMERA İZLEME MODÜLÜ (PANEL)
 * ============================================================================
 * BAĞIMSIZ. app.js'e dokunmaz; sağ-altta yüzen "KAMERALAR" butonu ekler.
 *
 * GÖRÜNTÜ: go2rtc'nin GERÇEK video öğesi (video-stream web bileşeni) kullanılır.
 *          object-fit ile her kamera hücresini TAM doldurur (Hikvision gibi):
 *            DOLDUR (fill) · SIĞDIR (contain) · KIRP (cover)  — canlı seçilir.
 *          Bileşen yüklenemezse otomatik olarak iframe oynatıcıya düşer.
 *
 * KURULUM: index.html'e (app.js'ten önce) tek satır:
 *   <script type="text/babel" data-type="module" src="js/pages/kameralar.js"></script>
 * ============================================================================
 */
(function () {
  'use strict';
  if (window.__MR_KAMERA_YUKLENDI__) return;
  window.__MR_KAMERA_YUKLENDI__ = true;

  var LS_KEY = 'mr_kamera_config';
  var GORUNUMLER = { fill: 'DOLDUR', contain: 'SIĞDIR', cover: 'KIRP' };
  var GORUNUM_SIRA = ['fill', 'contain', 'cover'];

  function varsayilanConfig() {
    return {
      kopru: '',
      sablon: '{KOPRU}/stream.html?src={KAMERA}', // iframe yedeği için
      gorunum: 'fill',
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
      var c = JSON.parse(ham); var d = varsayilanConfig();
      if (!c || typeof c !== 'object') return d;
      c.kopru = (c.kopru || '').trim();
      c.sablon = (c.sablon || d.sablon).trim();
      if (GORUNUM_SIRA.indexOf(c.gorunum) === -1) c.gorunum = 'fill';
      if (!Array.isArray(c.kameralar) || !c.kameralar.length) c.kameralar = d.kameralar;
      return c;
    } catch (e) { return varsayilanConfig(); }
  }
  function configYaz(c) { try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch (e) {} }

  function renk() { var C = (window.MR && window.MR.C) ? window.MR.C : null; return { grad: (C && C.accentGradient) || 'linear-gradient(135deg,#3b82f6 0%,#1a56db 50%,#1e3a8a 100%)' }; }
  function girisVar() { try { return !!localStorage.getItem('mr_token'); } catch (e) { return false; } }
  function el(tag, stil, ic) { var d = document.createElement(tag); if (stil) for (var k in stil) d.style[k] = stil[k]; if (ic != null) d.innerHTML = ic; return d; }
  function kopruTemiz(c) { return (c.kopru || '').replace(/\/+$/, ''); }
  function iframeUrl(c, kam) { return (c.sablon || '{KOPRU}/stream.html?src={KAMERA}').replace('{KOPRU}', kopruTemiz(c)).replace('{KAMERA}', encodeURIComponent(kam.id)); }

  /* ════ go2rtc web bileşeni (gerçek <video>) ════ */
  var komponentDurum = 'yok'; // yok | yukleniyor | hazir | hata
  function komponentHazir() { return !!(window.customElements && window.customElements.get('video-stream')); }
  function komponentYukle(c, cb) {
    if (komponentHazir()) { komponentDurum = 'hazir'; return cb(true); }
    if (komponentDurum === 'hata') return cb(false);
    var s = document.getElementById('mr-go2rtc-js');
    if (s) { // zaten yükleniyor
      var t = setInterval(function () { if (komponentHazir()) { clearInterval(t); cb(true); } }, 200);
      setTimeout(function () { clearInterval(t); cb(komponentHazir()); }, 6000);
      return;
    }
    komponentDurum = 'yukleniyor';
    s = document.createElement('script'); s.id = 'mr-go2rtc-js';
    s.src = kopruTemiz(c) + '/video-stream.js';
    s.onload = function () { setTimeout(function () { var ok = komponentHazir(); komponentDurum = ok ? 'hazir' : 'hata'; cb(ok); }, 60); };
    s.onerror = function () { komponentDurum = 'hata'; cb(false); };
    document.head.appendChild(s);
  }

  /* ════ STİL ════ */
  function stilEkle() {
    if (document.getElementById('mr-kamera-stil')) return;
    var s = document.createElement('style'); s.id = 'mr-kamera-stil';
    s.textContent = [
      '#mr-kamera-btn{position:fixed;right:24px;bottom:24px;z-index:99990;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px -5px rgba(0,0,0,.5);transition:transform .2s,filter .2s}',
      '#mr-kamera-btn:hover{transform:scale(1.07);filter:brightness(1.1)}',
      '#mr-kamera-overlay{position:fixed;inset:0;z-index:99991;display:none;flex-direction:column;background:#000}',
      '#mr-kamera-overlay.acik{display:flex;animation:mrkfade .25s ease}',
      '@keyframes mrkfade{from{opacity:0}to{opacity:1}}',
      '.mr-kamera-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.08);background:#0b1220}',
      '.mr-kamera-cip{padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#cbd5e1;font:800 12px Manrope,sans-serif;letter-spacing:.4px;cursor:pointer;text-transform:uppercase}',
      '.mr-kamera-cip:hover{background:rgba(255,255,255,.08)}',
      '.mr-kamera-cip.aktif{color:#fff;border-color:transparent}',
      '.mr-kamera-ikonbtn{height:38px;min-width:38px;padding:0 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e2e8f0;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font:800 11px Manrope,sans-serif;letter-spacing:.4px}',
      '.mr-kamera-ikonbtn:hover{background:rgba(255,255,255,.10)}',
      '.mr-kamera-govde{flex:1;min-height:0;display:grid;gap:6px;padding:6px}',
      '.mr-kamera-govde.dort{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}',
      '.mr-kamera-govde.tek{grid-template-columns:1fr;grid-template-rows:1fr}',
      '.mr-kamera-hucre{position:relative;background:#000;border:1px solid rgba(255,255,255,.10);border-radius:10px;overflow:hidden;min-height:0;min-width:0}',
      '.mr-kamera-hucre iframe{width:100%;height:100%;border:0;display:block;background:#000}',
      '.mr-kamera-hucre video-stream{display:block;width:100%;height:100%;background:#000}',
      '.mr-kamera-etiket{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.55);color:#fff;font:800 11px Manrope,sans-serif;letter-spacing:.5px;padding:4px 10px;border-radius:7px;text-transform:uppercase;pointer-events:none;z-index:4}',
      '.mr-kamera-foto{position:absolute;right:10px;top:10px;z-index:5;width:36px;height:36px;border-radius:9px;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.mr-kamera-foto:hover{background:rgba(0,0,0,.85)}',
      '.mr-kamera-bos{grid-column:1/-1;display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font:700 14px Manrope,sans-serif;text-align:center;padding:30px}',
      '.mr-kamera-ayar{position:absolute;inset:0;z-index:9;display:none;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;background:rgba(2,6,23,.65)}',
      '.mr-kamera-ayar.acik{display:flex}',
      '.mr-kamera-ayar-kart{width:100%;max-width:560px;background:#1e293b;border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:22px}',
      '.mr-kamera-lbl{display:block;font:800 11px Manrope,sans-serif;letter-spacing:.5px;color:#94a3b8;text-transform:uppercase;margin:14px 0 6px}',
      '.mr-kamera-inp{width:100%;padding:11px 13px;border-radius:9px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font:600 13px Manrope,sans-serif;outline:none;box-sizing:border-box;text-transform:none}',
      '.mr-kamera-satir{display:flex;gap:8px;align-items:center;margin-top:8px}',
      '.mr-kamera-btn2{padding:11px 18px;border-radius:10px;border:none;cursor:pointer;font:800 12px Manrope,sans-serif;letter-spacing:.4px;text-transform:uppercase;color:#fff}'
    ].join('\n');
    document.head.appendChild(s);
    fitUygula(configOku().gorunum);
  }

  /* object-fit'i CANLI uygular (hem light hem shadow DOM video'larına) */
  function fitUygula(fit) {
    fit = (GORUNUM_SIRA.indexOf(fit) === -1) ? 'fill' : fit;
    var st = document.getElementById('mr-kamera-fit-stil');
    if (!st) { st = document.createElement('style'); st.id = 'mr-kamera-fit-stil'; document.head.appendChild(st); }
    st.textContent = '.mr-kamera-hucre video-stream video,.mr-kamera-hucre video{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:' + fit + '!important}';
    // shadow DOM ihtimaline karşı JS ile de uygula
    try {
      document.querySelectorAll('.mr-kamera-hucre video-stream').forEach(function (vs) {
        var v = vs.querySelector('video') || (vs.shadowRoot && vs.shadowRoot.querySelector('video'));
        if (v) v.style.objectFit = fit;
      });
    } catch (e) {}
  }

  var durum = { secim: 'hepsi' };

  /* ════ İZLEYİCİ ════ */
  function govdeCiz() {
    var c = configOku();
    var govde = document.getElementById('mr-kamera-govde');
    if (!govde) return;
    govde.className = 'mr-kamera-govde ' + (durum.secim === 'hepsi' ? 'dort' : 'tek');
    govde.innerHTML = '';

    if (!c.kopru) {
      govde.appendChild(el('div', null, '<div class="mr-kamera-bos">KAMERA KÖPRÜ ADRESİ GİRİLMEMİŞ.<br><br>Sağ üstteki ⚙ AYARLAR butonundan köprünün HTTPS adresini girin.</div>'));
      return;
    }
    var aktifler = c.kameralar.filter(function (k) { return k.aktif; });
    var gosterilecek = durum.secim === 'hepsi' ? aktifler : aktifler.filter(function (k) { return k.id === durum.secim; });
    if (!gosterilecek.length) { govde.appendChild(el('div', null, '<div class="mr-kamera-bos">GÖSTERİLECEK AKTİF KAMERA YOK.</div>')); return; }

    komponentYukle(c, function (komponentVar) {
      // overlay kapanmış olabilir
      var g = document.getElementById('mr-kamera-govde'); if (!g) return;
      var kopru = kopruTemiz(c);
      var wsBase = kopru.replace(/^http/, 'ws');
      var setSrc = [];
      gosterilecek.forEach(function (k) {
        var hucre = el('div'); hucre.className = 'mr-kamera-hucre';
        if (komponentVar) {
          var vs = document.createElement('video-stream');
          try { vs.mode = 'webrtc,mse'; vs.background = true; } catch (e) {}
          vs.setAttribute('data-ws', wsBase + '/api/ws?src=' + encodeURIComponent(k.id));
          hucre.appendChild(vs);
          setSrc.push(vs);
        } else {
          var ifr = document.createElement('iframe');
          ifr.src = iframeUrl(c, k);
          ifr.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
          ifr.setAttribute('allowfullscreen', 'true');
          hucre.appendChild(ifr);
        }
        var et = el('div', null, k.ad); et.className = 'mr-kamera-etiket'; hucre.appendChild(et);
        var foto = el('button', null, '📷'); foto.className = 'mr-kamera-foto'; foto.title = 'FOTO ÇEK';
        foto.onclick = (function (kid) { return function (e) { e.stopPropagation(); window.open(kopru + '/api/frame.jpeg?src=' + encodeURIComponent(kid), '_blank'); }; })(k.id);
        hucre.appendChild(foto);
        g.appendChild(hucre);
      });
      // elemanlar DOM'a girdikten sonra src ver (bağlantı başlasın)
      setSrc.forEach(function (vs) { try { vs.src = vs.getAttribute('data-ws'); } catch (e) {} });
      // object-fit uygula (birkaç kez — video sonradan eklenebilir)
      var fit = c.gorunum || 'fill';
      fitUygula(fit);
      var n = 0; var tt = setInterval(function () { fitUygula(fit); if (++n > 8) clearInterval(tt); }, 400);
    });
  }

  function cipleriCiz() {
    var c = configOku();
    var bar = document.getElementById('mr-kamera-cipler'); if (!bar) return;
    bar.innerHTML = ''; var R = renk();
    var tumu = el('button', null, 'TÜMÜ (2x2)'); tumu.className = 'mr-kamera-cip' + (durum.secim === 'hepsi' ? ' aktif' : '');
    if (durum.secim === 'hepsi') tumu.style.background = R.grad;
    tumu.onclick = function () { durum.secim = 'hepsi'; cipleriCiz(); govdeCiz(); };
    bar.appendChild(tumu);
    c.kameralar.filter(function (k) { return k.aktif; }).forEach(function (k) {
      var b = el('button', null, k.ad); b.className = 'mr-kamera-cip' + (durum.secim === k.id ? ' aktif' : '');
      if (durum.secim === k.id) b.style.background = R.grad;
      b.onclick = function () { durum.secim = k.id; cipleriCiz(); govdeCiz(); };
      bar.appendChild(b);
    });
  }

  /* GÖRÜNÜM: DOLDUR / SIĞDIR / KIRP — canlı (yeniden bağlanmadan) */
  function gorunumDegistir() {
    var c = configOku();
    var i = GORUNUM_SIRA.indexOf(c.gorunum); c.gorunum = GORUNUM_SIRA[(i + 1) % GORUNUM_SIRA.length];
    configYaz(c);
    var lbl = document.getElementById('mr-kamera-gorunum-val'); if (lbl) lbl.textContent = GORUNUMLER[c.gorunum];
    fitUygula(c.gorunum);
  }

  /* ════ AYARLAR ════ */
  function ayarlariCiz() {
    var c = configOku();
    var kutu = document.getElementById('mr-kamera-ayar-icerik'); if (!kutu) return;
    kutu.innerHTML = '';
    kutu.appendChild(el('div', { font: '800 16px Manrope,sans-serif', color: '#f1f5f9', textTransform: 'uppercase', marginBottom: '4px' }, 'KAMERA AYARLARI'));
    function alan(lbl, key, ph) { var l = el('label', null, lbl); l.className = 'mr-kamera-lbl'; var i = el('input'); i.className = 'mr-kamera-inp'; i.id = 'mrk_' + key; i.value = c[key] || ''; if (ph) i.placeholder = ph; kutu.appendChild(l); kutu.appendChild(i); }
    alan('KÖPRÜ ADRESİ (HTTPS)', 'kopru', 'https://....trycloudflare.com');

    var lg = el('label', null, 'GÖRÜNÜM (kamerayı alana nasıl yerleştirsin)'); lg.className = 'mr-kamera-lbl'; kutu.appendChild(lg);
    var sel = el('select'); sel.className = 'mr-kamera-inp'; sel.id = 'mrk_gorunum';
    GORUNUM_SIRA.forEach(function (g) { var o = el('option', null, GORUNUMLER[g] + (g === 'fill' ? ' (tam doldur — önerilen)' : g === 'contain' ? ' (sığdır — kenarlar boş olabilir)' : ' (kırparak doldur)')); o.value = g; if (g === c.gorunum) o.selected = true; sel.appendChild(o); });
    kutu.appendChild(sel);

    kutu.appendChild(el('label', null, 'KAMERALAR (ID · GÖRÜNEN AD · AKTİF)')).className = 'mr-kamera-lbl';
    c.kameralar.forEach(function (k, i) {
      var satir = el('div'); satir.className = 'mr-kamera-satir';
      var idIn = el('input'); idIn.className = 'mr-kamera-inp'; idIn.style.flex = '0 0 120px'; idIn.value = k.id; idIn.setAttribute('data-mrk-id', i);
      var adIn = el('input'); adIn.className = 'mr-kamera-inp'; adIn.value = k.ad; adIn.setAttribute('data-mrk-ad', i);
      var chkW = el('label', { display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', font: '700 11px Manrope,sans-serif', whiteSpace: 'nowrap' });
      var chk = el('input'); chk.type = 'checkbox'; chk.checked = !!k.aktif; chk.setAttribute('data-mrk-aktif', i); chk.style.width = '18px'; chk.style.height = '18px';
      chkW.appendChild(chk); chkW.appendChild(document.createTextNode('AKTİF'));
      satir.appendChild(idIn); satir.appendChild(adIn); satir.appendChild(chkW); kutu.appendChild(satir);
    });

    var R = renk(); var bs = el('div', { display: 'flex', gap: '8px', marginTop: '18px' });
    var kaydet = el('button', null, 'KAYDET'); kaydet.className = 'mr-kamera-btn2'; kaydet.style.background = R.grad;
    kaydet.onclick = function () {
      var y = configOku();
      y.kopru = (document.getElementById('mrk_kopru').value || '').trim();
      y.gorunum = document.getElementById('mrk_gorunum').value || 'fill';
      var idler = kutu.querySelectorAll('[data-mrk-id]'); var arr = [];
      for (var i = 0; i < idler.length; i++) {
        var idx = idler[i].getAttribute('data-mrk-id');
        var ad = kutu.querySelector('[data-mrk-ad="' + idx + '"]'); var ak = kutu.querySelector('[data-mrk-aktif="' + idx + '"]');
        var idv = (idler[i].value || '').trim(); if (!idv) continue;
        arr.push({ id: idv, ad: (ad.value || idv).trim(), aktif: !!ak.checked });
      }
      if (arr.length) y.kameralar = arr;
      configYaz(y);
      if (window.MR && MR.toast) MR.toast('KAMERA AYARLARI KAYDEDİLDİ', 'success');
      ayarKapat(); durum.secim = 'hepsi'; cipleriCiz(); govdeCiz();
      var gl = document.getElementById('mr-kamera-gorunum-val'); if (gl) gl.textContent = GORUNUMLER[y.gorunum];
    };
    var kapat = el('button', null, 'KAPAT'); kapat.className = 'mr-kamera-btn2'; kapat.style.background = 'transparent'; kapat.style.border = '1px solid rgba(255,255,255,.18)'; kapat.style.color = '#cbd5e1'; kapat.onclick = ayarKapat;
    bs.appendChild(kaydet); bs.appendChild(kapat); kutu.appendChild(bs);
    kutu.appendChild(el('div', { marginTop: '14px', color: '#64748b', font: '600 11px Manrope,sans-serif', lineHeight: '1.6', textTransform: 'none' }, 'DOLDUR: görüntü alanı tamamen kaplar (Hikvision gibi). Kamera ID’leri go2rtc.yaml ile aynı olmalı.'));
  }
  function ayarAc() { var a = document.getElementById('mr-kamera-ayar'); if (a) { ayarlariCiz(); a.classList.add('acik'); } }
  function ayarKapat() { var a = document.getElementById('mr-kamera-ayar'); if (a) a.classList.remove('acik'); }

  function svgIkon(d) { return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; }
  function kameraSvg(rd, boy) { var b = boy || 22; return '<svg xmlns="http://www.w3.org/2000/svg" width="' + b + '" height="' + b + '" viewBox="0 0 24 24" fill="none" stroke="' + (rd || '#fff') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>'; }

  function overlayKur() {
    if (document.getElementById('mr-kamera-overlay')) return;
    var ov = el('div'); ov.id = 'mr-kamera-overlay'; ov.setAttribute('data-widget', '1'); ov.setAttribute('data-no-print', '1');
    var bar = el('div'); bar.className = 'mr-kamera-bar';
    var baslik = el('div', { display: 'flex', alignItems: 'center', gap: '8px', font: '800 14px Manrope,sans-serif', color: '#fff', textTransform: 'uppercase', marginRight: '6px' }); baslik.innerHTML = kameraSvg('#fff', 20) + '<span>KAMERA İZLEME</span>'; bar.appendChild(baslik);
    var cipler = el('div', { display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1' }); cipler.id = 'mr-kamera-cipler'; bar.appendChild(cipler);

    var c0 = configOku();
    var gorBtn = el('button'); gorBtn.className = 'mr-kamera-ikonbtn'; gorBtn.title = 'GÖRÜNÜM: DOLDUR / SIĞDIR / KIRP';
    gorBtn.innerHTML = svgIkon('M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2') + '<span id="mr-kamera-gorunum-val">' + GORUNUMLER[c0.gorunum] + '</span>';
    gorBtn.onclick = gorunumDegistir; bar.appendChild(gorBtn);

    var tam = el('button'); tam.className = 'mr-kamera-ikonbtn'; tam.title = 'TAM EKRAN'; tam.innerHTML = svgIkon('M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3');
    tam.onclick = function () { var g = document.getElementById('mr-kamera-overlay'); if (!document.fullscreenElement) { (g.requestFullscreen ? g.requestFullscreen() : (g.webkitRequestFullscreen && g.webkitRequestFullscreen())); } else { document.exitFullscreen && document.exitFullscreen(); } }; bar.appendChild(tam);
    var ayarBtn = el('button'); ayarBtn.className = 'mr-kamera-ikonbtn'; ayarBtn.title = 'AYARLAR'; ayarBtn.innerHTML = svgIkon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'); ayarBtn.onclick = ayarAc; bar.appendChild(ayarBtn);
    var kapatBtn = el('button'); kapatBtn.className = 'mr-kamera-ikonbtn'; kapatBtn.title = 'KAPAT'; kapatBtn.style.borderColor = 'rgba(239,68,68,.4)'; kapatBtn.innerHTML = svgIkon('M18 6 6 18 M6 6l12 12'); kapatBtn.onclick = overlayKapat; bar.appendChild(kapatBtn);
    ov.appendChild(bar);
    var govde = el('div'); govde.id = 'mr-kamera-govde'; govde.className = 'mr-kamera-govde dort'; ov.appendChild(govde);
    var ayar = el('div'); ayar.id = 'mr-kamera-ayar'; ayar.className = 'mr-kamera-ayar'; var ak = el('div'); ak.className = 'mr-kamera-ayar-kart'; ak.id = 'mr-kamera-ayar-icerik'; ayar.appendChild(ak); ov.appendChild(ayar);
    document.body.appendChild(ov);
  }
  function overlayAc() { overlayKur(); document.getElementById('mr-kamera-overlay').classList.add('acik'); cipleriCiz(); govdeCiz(); }
  function overlayKapat() { var ov = document.getElementById('mr-kamera-overlay'); if (ov) ov.classList.remove('acik'); ayarKapat(); var g = document.getElementById('mr-kamera-govde'); if (g) g.innerHTML = ''; }

  function butonKur() { if (document.getElementById('mr-kamera-btn')) return; var b = document.createElement('button'); b.id = 'mr-kamera-btn'; b.title = 'KAMERALAR'; b.setAttribute('data-widget', '1'); b.setAttribute('data-no-print', '1'); b.style.background = renk().grad; b.innerHTML = kameraSvg('#fff', 24); b.onclick = overlayAc; document.body.appendChild(b); }
  function gorunur() { var b = document.getElementById('mr-kamera-btn'); var g = girisVar(); if (g && !b) { stilEkle(); butonKur(); } else if (b) b.style.display = g ? 'flex' : 'none'; }

  function baslat() {
    stilEkle(); gorunur();
    setInterval(gorunur, 1500);
    window.addEventListener('storage', gorunur);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var a = document.getElementById('mr-kamera-ayar'); if (a && a.classList.contains('acik')) { ayarKapat(); return; } var ov = document.getElementById('mr-kamera-overlay'); if (ov && ov.classList.contains('acik')) overlayKapat(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
