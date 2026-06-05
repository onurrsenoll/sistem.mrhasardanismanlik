/**
 * MR HASAR DANIŞMANLIK — KAMERA İZLEME MODÜLÜ (PANEL)
 * ============================================================================
 * BAĞIMSIZ. app.js'e dokunmaz; sağ-altta yüzen "KAMERALAR" butonu ekler.
 * Görüntü, ofis bilgisayarındaki go2rtc köprüsü + Cloudflare Tunnel üzerinden gelir.
 *
 * GÖRÜNÜM: Hücreler kameranın EN-BOY oranına (16:9 / 4:3 …) oturtulur; görüntü
 *          hücreyi TAM doldurur — ZOOM/kırpma YOK, çözünürlük/kalite bozulmaz.
 *
 * KURULUM: index.html'e (app.js'ten önce) tek satır:
 *   <script type="text/babel" data-type="module" src="js/pages/kameralar.js"></script>
 * Ayarlar bu tarayıcıda saklanır (localStorage: mr_kamera_config).
 * ============================================================================
 */
(function () {
  'use strict';
  if (window.__MR_KAMERA_YUKLENDI__) return;
  window.__MR_KAMERA_YUKLENDI__ = true;

  var LS_KEY = 'mr_kamera_config';
  var ORANLAR = ['16:9', '4:3', '16:10', '1:1', '21:9'];

  function varsayilanConfig() {
    return {
      kopru: '',
      sablon: '{KOPRU}/stream.html?src={KAMERA}',
      oran: '16:9',
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
      if (ORANLAR.indexOf(c.oran) === -1) c.oran = '16:9';
      if (!Array.isArray(c.kameralar) || !c.kameralar.length) c.kameralar = d.kameralar;
      return c;
    } catch (e) { return varsayilanConfig(); }
  }
  function configYaz(c) { try { localStorage.setItem(LS_KEY, JSON.stringify(c)); } catch (e) {} }

  function renk() {
    var C = (window.MR && window.MR.C) ? window.MR.C : null;
    return {
      accent: (C && C.accent) || '#1a56db',
      grad: (C && C.accentGradient) || 'linear-gradient(135deg,#3b82f6 0%,#1a56db 50%,#1e3a8a 100%)'
    };
  }
  function girisVar() { try { return !!localStorage.getItem('mr_token'); } catch (e) { return false; } }
  function el(tag, stil, ic) { var d = document.createElement(tag); if (stil) for (var k in stil) d.style[k] = stil[k]; if (ic != null) d.innerHTML = ic; return d; }
  function kameraUrl(c, kam) {
    var kopru = (c.kopru || '').replace(/\/+$/, '');
    return (c.sablon || '{KOPRU}/stream.html?src={KAMERA}').replace('{KOPRU}', kopru).replace('{KAMERA}', encodeURIComponent(kam.id));
  }
  function oranDeger(o) { var p = (o || '16:9').split(':'); var w = parseFloat(p[0]) || 16, h = parseFloat(p[1]) || 9; return w / h; }

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
      '.mr-kamera-cip{padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#cbd5e1;font:800 12px Manrope,sans-serif;letter-spacing:.4px;cursor:pointer;text-transform:uppercase;transition:all .15s}',
      '.mr-kamera-cip:hover{background:rgba(255,255,255,.08)}',
      '.mr-kamera-cip.aktif{color:#fff;border-color:transparent}',
      '.mr-kamera-ikonbtn{height:38px;min-width:38px;padding:0 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#e2e8f0;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font:800 11px Manrope,sans-serif;letter-spacing:.4px}',
      '.mr-kamera-ikonbtn:hover{background:rgba(255,255,255,.10)}',
      '.mr-kamera-govde{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:10px;overflow:hidden}',
      '.mr-kamera-grid{display:grid;gap:8px}',
      '.mr-kamera-grid.dort{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}',
      '.mr-kamera-grid.tek{grid-template-columns:1fr;grid-template-rows:1fr}',
      '.mr-kamera-hucre{position:relative;background:#000;border:1px solid rgba(255,255,255,.10);border-radius:10px;overflow:hidden}',
      '.mr-kamera-hucre iframe{width:100%;height:100%;border:0;display:block;background:#000}',
      '.mr-kamera-etiket{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.55);color:#fff;font:800 11px Manrope,sans-serif;letter-spacing:.5px;padding:4px 10px;border-radius:7px;text-transform:uppercase;pointer-events:none;z-index:2}',
      '.mr-kamera-foto{position:absolute;right:10px;top:10px;z-index:3;width:36px;height:36px;border-radius:9px;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}',
      '.mr-kamera-foto:hover{background:rgba(0,0,0,.85)}',
      '.mr-kamera-bos{display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font:700 14px Manrope,sans-serif;text-align:center;padding:30px}',
      '.mr-kamera-ayar{position:absolute;inset:0;z-index:5;display:none;align-items:flex-start;justify-content:center;padding:24px;overflow:auto;background:rgba(2,6,23,.6)}',
      '.mr-kamera-ayar.acik{display:flex}',
      '.mr-kamera-ayar-kart{width:100%;max-width:560px;background:#1e293b;border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:22px}',
      '.mr-kamera-lbl{display:block;font:800 11px Manrope,sans-serif;letter-spacing:.5px;color:#94a3b8;text-transform:uppercase;margin:14px 0 6px}',
      '.mr-kamera-inp{width:100%;padding:11px 13px;border-radius:9px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font:600 13px Manrope,sans-serif;outline:none;box-sizing:border-box;text-transform:none}',
      '.mr-kamera-satir{display:flex;gap:8px;align-items:center;margin-top:8px}',
      '.mr-kamera-btn2{padding:11px 18px;border-radius:10px;border:none;cursor:pointer;font:800 12px Manrope,sans-serif;letter-spacing:.4px;text-transform:uppercase;color:#fff}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var durum = { secim: 'hepsi' };

  /* ════ GRID BOYUTLANDIR (hücreleri kamera oranına oturt) ════ */
  function boyutlandir() {
    var grid = document.getElementById('mr-kamera-grid');
    var govde = document.getElementById('mr-kamera-govde');
    if (!grid || !govde) return;
    var c = configOku();
    var oran = oranDeger(c.oran);            // tek hücre oranı = grid oranı (2x2 veya 1x1)
    var W = govde.clientWidth, H = govde.clientHeight;
    if (W <= 0 || H <= 0) return;
    var w, h;
    if (W / H > oran) { h = H; w = H * oran; } else { w = W; h = W / oran; }
    grid.style.width = Math.floor(w) + 'px';
    grid.style.height = Math.floor(h) + 'px';
  }

  /* ════ İZLEYİCİ ════ */
  function govdeCiz() {
    var c = configOku();
    var govde = document.getElementById('mr-kamera-govde');
    if (!govde) return;
    govde.innerHTML = '';

    if (!c.kopru) {
      govde.appendChild(el('div', null, '<div class="mr-kamera-bos">KAMERA KÖPRÜ ADRESİ GİRİLMEMİŞ.<br><br>Sağ üstteki ⚙ AYARLAR butonundan,<br>ofis bilgisayarındaki köprünün HTTPS adresini girin.</div>'));
      return;
    }
    var aktifler = c.kameralar.filter(function (k) { return k.aktif; });
    var kopru = (c.kopru || '').replace(/\/+$/, '');
    var grid = el('div'); grid.id = 'mr-kamera-grid';
    grid.className = 'mr-kamera-grid ' + (durum.secim === 'hepsi' ? 'dort' : 'tek');

    var gosterilecek = durum.secim === 'hepsi' ? aktifler : aktifler.filter(function (k) { return k.id === durum.secim; });
    if (!gosterilecek.length) { govde.appendChild(el('div', null, '<div class="mr-kamera-bos">GÖSTERİLECEK AKTİF KAMERA YOK.</div>')); return; }

    gosterilecek.forEach(function (k) {
      var hucre = el('div'); hucre.className = 'mr-kamera-hucre';
      var ifr = document.createElement('iframe');
      ifr.src = kameraUrl(c, k);
      ifr.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      ifr.setAttribute('allowfullscreen', 'true');
      ifr.loading = 'eager';
      hucre.appendChild(ifr);
      var et = el('div', null, k.ad); et.className = 'mr-kamera-etiket'; hucre.appendChild(et);
      var foto = el('button', null, '📷'); foto.className = 'mr-kamera-foto'; foto.title = 'FOTO ÇEK';
      foto.onclick = (function (kid) { return function (e) { e.stopPropagation(); window.open(kopru + '/api/frame.jpeg?src=' + encodeURIComponent(kid), '_blank'); }; })(k.id);
      hucre.appendChild(foto);
      grid.appendChild(hucre);
    });
    govde.appendChild(grid);
    boyutlandir();
  }

  function cipleriCiz() {
    var c = configOku();
    var bar = document.getElementById('mr-kamera-cipler');
    if (!bar) return;
    bar.innerHTML = '';
    var R = renk();
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

  /* ════ EN-BOY ORANI (kamerana göre tam doldurmak için) ════ */
  function oranDegistir() {
    var c = configOku();
    var i = ORANLAR.indexOf(c.oran); c.oran = ORANLAR[(i + 1) % ORANLAR.length];
    configYaz(c);
    var lbl = document.getElementById('mr-kamera-oran-val'); if (lbl) lbl.textContent = c.oran;
    boyutlandir();
  }

  /* ════ AYARLAR ════ */
  function ayarlariCiz() {
    var c = configOku();
    var kutu = document.getElementById('mr-kamera-ayar-icerik'); if (!kutu) return;
    kutu.innerHTML = '';
    kutu.appendChild(el('div', { font: '800 16px Manrope,sans-serif', color: '#f1f5f9', textTransform: 'uppercase', marginBottom: '4px' }, 'KAMERA AYARLARI'));
    function alan(lbl, key, ph) {
      var l = el('label', null, lbl); l.className = 'mr-kamera-lbl';
      var i = el('input'); i.className = 'mr-kamera-inp'; i.id = 'mrk_' + key; i.value = c[key] || ''; if (ph) i.placeholder = ph;
      kutu.appendChild(l); kutu.appendChild(i);
    }
    alan('KÖPRÜ ADRESİ (HTTPS)', 'kopru', 'https://....trycloudflare.com');
    alan('OYNATICI ŞABLONU', 'sablon', '{KOPRU}/stream.html?src={KAMERA}');

    var lo = el('label', null, 'GÖRÜNTÜ EN-BOY ORANI (kamerana göre tam doldurur)'); lo.className = 'mr-kamera-lbl'; kutu.appendChild(lo);
    var sel = el('select'); sel.className = 'mr-kamera-inp'; sel.id = 'mrk_oran';
    ORANLAR.forEach(function (o) { var op = el('option', null, o); op.value = o; if (o === c.oran) op.selected = true; sel.appendChild(op); });
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

    var R = renk();
    var bs = el('div', { display: 'flex', gap: '8px', marginTop: '18px' });
    var kaydet = el('button', null, 'KAYDET'); kaydet.className = 'mr-kamera-btn2'; kaydet.style.background = R.grad;
    kaydet.onclick = function () {
      var y = configOku();
      y.kopru = (document.getElementById('mrk_kopru').value || '').trim();
      y.sablon = (document.getElementById('mrk_sablon').value || '{KOPRU}/stream.html?src={KAMERA}').trim();
      y.oran = document.getElementById('mrk_oran').value || '16:9';
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
      var ol = document.getElementById('mr-kamera-oran-val'); if (ol) ol.textContent = y.oran;
    };
    var kapat = el('button', null, 'KAPAT'); kapat.className = 'mr-kamera-btn2'; kapat.style.background = 'transparent'; kapat.style.border = '1px solid rgba(255,255,255,.18)'; kapat.style.color = '#cbd5e1'; kapat.onclick = ayarKapat;
    bs.appendChild(kaydet); bs.appendChild(kapat); kutu.appendChild(bs);
    kutu.appendChild(el('div', { marginTop: '14px', color: '#64748b', font: '600 11px Manrope,sans-serif', lineHeight: '1.6', textTransform: 'none' },
      'İpucu: Görüntü kenarlarında siyah bant kalırsa EN-BOY oranını kameranıza göre değiştirin (çoğu kamera 16:9). Kamera ID’leri go2rtc.yaml ile aynı olmalı (kamera01…04).'));
  }
  function ayarAc() { var a = document.getElementById('mr-kamera-ayar'); if (a) { ayarlariCiz(); a.classList.add('acik'); } }
  function ayarKapat() { var a = document.getElementById('mr-kamera-ayar'); if (a) a.classList.remove('acik'); }

  function svgIkon(d) { return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; }
  function kameraSvg(rd, boy) { var b = boy || 22; return '<svg xmlns="http://www.w3.org/2000/svg" width="' + b + '" height="' + b + '" viewBox="0 0 24 24" fill="none" stroke="' + (rd || '#fff') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>'; }

  /* ════ OVERLAY ════ */
  function overlayKur() {
    if (document.getElementById('mr-kamera-overlay')) return;
    var ov = el('div'); ov.id = 'mr-kamera-overlay'; ov.setAttribute('data-widget', '1'); ov.setAttribute('data-no-print', '1');
    var bar = el('div'); bar.className = 'mr-kamera-bar';
    var baslik = el('div', { display: 'flex', alignItems: 'center', gap: '8px', font: '800 14px Manrope,sans-serif', color: '#fff', textTransform: 'uppercase', marginRight: '6px' }); baslik.innerHTML = kameraSvg('#fff', 20) + '<span>KAMERA İZLEME</span>'; bar.appendChild(baslik);
    var cipler = el('div', { display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1' }); cipler.id = 'mr-kamera-cipler'; bar.appendChild(cipler);

    var c0 = configOku();
    var oranBtn = el('button'); oranBtn.className = 'mr-kamera-ikonbtn'; oranBtn.title = 'EN-BOY ORANI (kameraya göre tam doldur)';
    oranBtn.innerHTML = svgIkon('M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2') + '<span id="mr-kamera-oran-val">' + c0.oran + '</span>';
    oranBtn.onclick = oranDegistir; bar.appendChild(oranBtn);

    var tam = el('button'); tam.className = 'mr-kamera-ikonbtn'; tam.title = 'TAM EKRAN'; tam.innerHTML = svgIkon('M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3');
    tam.onclick = function () { var g = document.getElementById('mr-kamera-govde'); if (!document.fullscreenElement) { (g.requestFullscreen ? g.requestFullscreen() : (g.webkitRequestFullscreen && g.webkitRequestFullscreen())); } else { document.exitFullscreen && document.exitFullscreen(); } setTimeout(boyutlandir, 200); };
    bar.appendChild(tam);
    var ayarBtn = el('button'); ayarBtn.className = 'mr-kamera-ikonbtn'; ayarBtn.title = 'AYARLAR'; ayarBtn.innerHTML = svgIkon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'); ayarBtn.onclick = ayarAc; bar.appendChild(ayarBtn);
    var kapatBtn = el('button'); kapatBtn.className = 'mr-kamera-ikonbtn'; kapatBtn.title = 'KAPAT'; kapatBtn.style.borderColor = 'rgba(239,68,68,.4)'; kapatBtn.innerHTML = svgIkon('M18 6 6 18 M6 6l12 12'); kapatBtn.onclick = overlayKapat; bar.appendChild(kapatBtn);
    ov.appendChild(bar);

    var govde = el('div'); govde.id = 'mr-kamera-govde'; govde.className = 'mr-kamera-govde'; ov.appendChild(govde);
    var ayar = el('div'); ayar.id = 'mr-kamera-ayar'; ayar.className = 'mr-kamera-ayar';
    var ak = el('div'); ak.className = 'mr-kamera-ayar-kart'; ak.id = 'mr-kamera-ayar-icerik'; ayar.appendChild(ak); ov.appendChild(ayar);
    document.body.appendChild(ov);
  }
  function overlayAc() { overlayKur(); document.getElementById('mr-kamera-overlay').classList.add('acik'); cipleriCiz(); govdeCiz(); setTimeout(boyutlandir, 60); }
  function overlayKapat() { var ov = document.getElementById('mr-kamera-overlay'); if (ov) ov.classList.remove('acik'); ayarKapat(); var g = document.getElementById('mr-kamera-govde'); if (g) g.innerHTML = ''; }

  function butonKur() {
    if (document.getElementById('mr-kamera-btn')) return;
    var b = document.createElement('button'); b.id = 'mr-kamera-btn'; b.title = 'KAMERALAR'; b.setAttribute('data-widget', '1'); b.setAttribute('data-no-print', '1');
    b.style.background = renk().grad; b.innerHTML = kameraSvg('#fff', 24); b.onclick = overlayAc; document.body.appendChild(b);
  }
  function gorunur() { var b = document.getElementById('mr-kamera-btn'); var g = girisVar(); if (g && !b) { stilEkle(); butonKur(); } else if (b) b.style.display = g ? 'flex' : 'none'; }

  function baslat() {
    stilEkle(); gorunur();
    setInterval(gorunur, 1500);
    window.addEventListener('storage', gorunur);
    window.addEventListener('resize', function () { var ov = document.getElementById('mr-kamera-overlay'); if (ov && ov.classList.contains('acik')) boyutlandir(); });
    document.addEventListener('fullscreenchange', function () { setTimeout(boyutlandir, 150); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { var a = document.getElementById('mr-kamera-ayar'); if (a && a.classList.contains('acik')) { ayarKapat(); return; } var ov = document.getElementById('mr-kamera-overlay'); if (ov && ov.classList.contains('acik')) overlayKapat(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
