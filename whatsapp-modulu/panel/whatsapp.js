/**
 * MR HASAR DANIŞMANLIK — WHATSAPP MODÜLÜ (PANEL)  — BAĞIMSIZ
 * ============================================================================
 * app.js'e DOKUNMADAN kendi kendine yüklenir: sağ-altta yüzen WhatsApp butonu.
 * Tek ekranda: TOPLU GÖNDERİM · LOGLAR · AYARLAR
 * Backend: /api/v1/whatsapp/* ve /api/v1/sistem/ayarlar-*  (mevcut).
 *
 * KURULUM: index.html içine (app.js'ten ÖNCE) tek satır:
 *   <script type="text/babel" data-type="module" src="js/pages/whatsapp.js"></script>
 * ============================================================================
 */
(function () {
  'use strict';
  if (window.__MR_WA_YUKLENDI__) return;
  window.__MR_WA_YUKLENDI__ = true;

  var WA_YESIL = '#25D366', WA_KOYU = '#075E54';

  function api() { return (window.MR && MR.api) ? MR.api : null; }
  function toast(m, t) { if (window.MR && MR.toast) MR.toast(m, t); }
  function girisVar() { try { return !!localStorage.getItem('mr_token'); } catch (e) { return false; } }
  function el(tag, stil, ic) { var d = document.createElement(tag); if (stil) for (var k in stil) d.style[k] = stil[k]; if (ic != null) d.innerHTML = ic; return d; }

  /* ════ STİL ════ */
  function stil() {
    if (document.getElementById('mr-wa-stil')) return;
    var s = document.createElement('style'); s.id = 'mr-wa-stil';
    s.textContent = [
      '#mr-wa-btn{position:fixed;right:24px;bottom:92px;z-index:99980;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:' + WA_YESIL + ';box-shadow:0 10px 25px -5px rgba(0,0,0,.5);transition:transform .2s}',
      '#mr-wa-btn:hover{transform:scale(1.07)}',
      '#mr-wa-ov{position:fixed;inset:0;z-index:99981;display:none;flex-direction:column;background:rgba(2,6,23,.96);backdrop-filter:blur(4px);font-family:Manrope,sans-serif}',
      '#mr-wa-ov.acik{display:flex;animation:mrwafade .25s ease}',
      '@keyframes mrwafade{from{opacity:0}to{opacity:1}}',
      '.mr-wa-bar{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08)}',
      '.mr-wa-tab{padding:9px 16px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#cbd5e1;font:800 12px Manrope;letter-spacing:.4px;cursor:pointer;text-transform:uppercase}',
      '.mr-wa-tab.aktif{background:' + WA_YESIL + ';color:#04231a;border-color:transparent}',
      '.mr-wa-x{margin-left:auto;width:38px;height:38px;border-radius:9px;border:1px solid rgba(239,68,68,.4);background:transparent;color:#fca5a5;cursor:pointer;font-size:18px}',
      '.mr-wa-govde{flex:1;min-height:0;overflow:auto;padding:18px;max-width:920px;width:100%;margin:0 auto}',
      '.mr-wa-lbl{display:block;font:800 11px Manrope;letter-spacing:.5px;color:#94a3b8;text-transform:uppercase;margin:14px 0 6px}',
      '.mr-wa-inp{width:100%;padding:11px 13px;border-radius:9px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font:600 13px Manrope;outline:none;box-sizing:border-box;text-transform:none}',
      '.mr-wa-inp:focus{border-color:' + WA_YESIL + '}',
      'textarea.mr-wa-inp{min-height:90px;resize:vertical}',
      '.mr-wa-btn2{padding:12px 20px;border-radius:10px;border:none;cursor:pointer;font:800 12px Manrope;letter-spacing:.4px;text-transform:uppercase;color:#04231a;background:' + WA_YESIL + '}',
      '.mr-wa-btn2.gri{background:transparent;border:1px solid rgba(255,255,255,.18);color:#cbd5e1}',
      '.mr-wa-uyari{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#fcd34d;border-radius:10px;padding:12px 14px;font:600 12px Manrope;line-height:1.6;margin-bottom:8px;text-transform:none}',
      '.mr-wa-row{display:flex;gap:10px;flex-wrap:wrap}',
      '.mr-wa-row>div{flex:1;min-width:160px}',
      '.mr-wa-tbl{width:100%;border-collapse:collapse;font:600 12px Manrope;color:#e2e8f0}',
      '.mr-wa-tbl th,.mr-wa-tbl td{text-align:left;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08);text-transform:none}',
      '.mr-wa-sw{width:46px;height:26px;border-radius:14px;cursor:pointer;position:relative;flex:0 0 auto}',
      '.mr-wa-sw i{position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var aktifTab = 'toplu';

  /* ════ AYARLAR ════ */
  function ayarYukle(cb) {
    var a = api(); if (!a) return cb({});
    a.req('/sistem/ayarlar-list.php').then(function (r) { cb((r && r.data) ? r.data : {}); }).catch(function () { cb({}); });
  }
  function ayarlarTab(govde) {
    govde.innerHTML = '<div style="color:#94a3b8;font:700 13px Manrope">YÜKLENİYOR…</div>';
    ayarYukle(function (ay) {
      govde.innerHTML = '';
      var bilgi = el('div', null, 'WhatsApp İşletme (Meta Cloud API) bağlantı bilgilerini gir. Bu bilgiler sunucuda saklanır, koda yazılmaz.');
      bilgi.className = 'mr-wa-uyari'; bilgi.style.background = 'rgba(37,211,102,.10)'; bilgi.style.borderColor = 'rgba(37,211,102,.3)'; bilgi.style.color = '#86efac';
      govde.appendChild(bilgi);

      var aktif = (ay.wa_aktif === '1');
      var swWrap = el('div', { display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0 4px' });
      var sw = el('div'); sw.className = 'mr-wa-sw'; sw.style.background = aktif ? WA_YESIL : '#334155';
      var knob = el('i'); knob.style.left = aktif ? '23px' : '3px'; sw.appendChild(knob);
      var swTxt = el('span', { font: '800 12px Manrope', color: '#e2e8f0', textTransform: 'uppercase' }, aktif ? 'MODÜL AKTİF' : 'MODÜL KAPALI');
      sw.onclick = function () { aktif = !aktif; sw.style.background = aktif ? WA_YESIL : '#334155'; knob.style.left = aktif ? '23px' : '3px'; swTxt.textContent = aktif ? 'MODÜL AKTİF' : 'MODÜL KAPALI'; };
      swWrap.appendChild(sw); swWrap.appendChild(swTxt); govde.appendChild(swWrap);

      function alan(lbl, key, ph, pw) {
        var l = el('label', null, lbl); l.className = 'mr-wa-lbl';
        var i = el('input'); i.className = 'mr-wa-inp'; i.id = 'mrwa_' + key; i.value = ay[key] || ''; if (ph) i.placeholder = ph; if (pw) i.type = 'password';
        govde.appendChild(l); govde.appendChild(i);
      }
      alan('ACCESS TOKEN', 'wa_access_token', 'EAAE...', true);
      var row = el('div'); row.className = 'mr-wa-row';
      govde.appendChild(row);
      function alanRow(lbl, key, ph) { var c = el('div'); var l = el('label', null, lbl); l.className = 'mr-wa-lbl'; var i = el('input'); i.className = 'mr-wa-inp'; i.id = 'mrwa_' + key; i.value = ay[key] || ph || ''; c.appendChild(l); c.appendChild(i); row.appendChild(c); }
      alanRow('PHONE NUMBER ID', 'wa_phone_number_id', '');
      alanRow('WABA ID', 'wa_waba_id', '');
      alanRow('API SÜRÜMÜ', 'wa_api_version', 'v21.0');

      // Dosya açılış otomatik
      var h2 = el('div', { font: '800 13px Manrope', color: '#fff', textTransform: 'uppercase', margin: '20px 0 4px' }, 'OTOMATİK — DOSYA AÇILIŞI'); govde.appendChild(h2);
      var dAktif = (ay.wa_dosya_acilis_aktif === '1');
      var dsw = el('div', { display: 'flex', alignItems: 'center', gap: '10px' });
      var dswB = el('div'); dswB.className = 'mr-wa-sw'; dswB.style.background = dAktif ? WA_YESIL : '#334155'; var dk = el('i'); dk.style.left = dAktif ? '23px' : '3px'; dswB.appendChild(dk);
      var dtx = el('span', { font: '700 12px Manrope', color: '#cbd5e1', textTransform: 'uppercase' }, dAktif ? 'AÇIK — dosya kaydolunca mesaj gider' : 'KAPALI');
      dswB.onclick = function () { dAktif = !dAktif; dswB.style.background = dAktif ? WA_YESIL : '#334155'; dk.style.left = dAktif ? '23px' : '3px'; dtx.textContent = dAktif ? 'AÇIK — dosya kaydolunca mesaj gider' : 'KAPALI'; };
      dsw.appendChild(dswB); dsw.appendChild(dtx); govde.appendChild(dsw);
      alan('ONAYLI ŞABLON ADI (dosya açılış)', 'wa_sablon_dosya_acilis', 'orn: dosya_acilis');
      alan('ŞABLON DİL KODU', 'wa_sablon_dil', 'tr');

      var kaydet = el('button', null, 'AYARLARI KAYDET'); kaydet.className = 'mr-wa-btn2'; kaydet.style.marginTop = '20px';
      kaydet.onclick = function () {
        var veri = {
          wa_aktif: aktif ? '1' : '0',
          wa_dosya_acilis_aktif: dAktif ? '1' : '0',
          wa_access_token: val('wa_access_token'),
          wa_phone_number_id: val('wa_phone_number_id'),
          wa_waba_id: val('wa_waba_id'),
          wa_api_version: val('wa_api_version') || 'v21.0',
          wa_sablon_dosya_acilis: val('wa_sablon_dosya_acilis'),
          wa_sablon_dil: val('wa_sablon_dil') || 'tr'
        };
        var a = api(); if (!a) return;
        kaydet.textContent = 'KAYDEDİLİYOR…'; kaydet.disabled = true;
        a.req('/sistem/ayarlar-guncelle.php', { method: 'POST', body: JSON.stringify(veri) })
          .then(function (r) { toast(r && r.success ? 'WHATSAPP AYARLARI KAYDEDİLDİ' : 'KAYDEDİLEMEDİ', r && r.success ? 'success' : 'error'); })
          .catch(function () { toast('BAĞLANTI HATASI', 'error'); })
          .then(function () { kaydet.textContent = 'AYARLARI KAYDET'; kaydet.disabled = false; });
      };
      govde.appendChild(kaydet);
      function val(k) { var e = document.getElementById('mrwa_' + k); return e ? e.value.trim() : ''; }
    });
  }

  /* ════ TOPLU GÖNDERİM ════ */
  function topluTab(govde) {
    govde.innerHTML = '';
    var uyari = el('div', null, '⚠️ WhatsApp kuralı: Size son 24 saatte yazmamış kişilere <b>yalnız onaylı ŞABLON</b> ile gönderebilirsiniz. Çok sayıda izinsiz numaraya gönderim, numaranızın engellenmesine yol açabilir. Kendi izinli müşterilerinize gönderin.');
    uyari.className = 'mr-wa-uyari'; govde.appendChild(uyari);

    var l1 = el('label', null, 'NUMARALAR (alt alta veya virgülle — kopyala-yapıştır)'); l1.className = 'mr-wa-lbl';
    var ta = el('textarea'); ta.className = 'mr-wa-inp'; ta.id = 'mrwa_nolar'; ta.placeholder = '5321112233\n5324445566, 5327778899';
    govde.appendChild(l1); govde.appendChild(ta);

    var lt = el('label', null, 'GÖNDERİM TİPİ'); lt.className = 'mr-wa-lbl';
    var sel = el('select'); sel.className = 'mr-wa-inp'; sel.id = 'mrwa_tip';
    sel.innerHTML = '<option value="sablon">ŞABLON (önerilen — herkese)</option><option value="metin">SERBEST METİN (yalnız 24s oturum)</option>';
    govde.appendChild(lt); govde.appendChild(sel);

    var sablonAlan = el('div');
    var lr = el('div'); lr.className = 'mr-wa-row';
    lr.innerHTML = '<div><label class="mr-wa-lbl">ŞABLON ADI</label><input class="mr-wa-inp" id="mrwa_sablon" placeholder="orn: duyuru"></div>' +
                   '<div><label class="mr-wa-lbl">DİL</label><input class="mr-wa-inp" id="mrwa_dil" value="tr"></div>';
    sablonAlan.appendChild(lr);
    var lp = el('label', null, 'ŞABLON PARAMETRELERİ (virgülle — {{1}},{{2}}…)'); lp.className = 'mr-wa-lbl';
    var pi = el('input'); pi.className = 'mr-wa-inp'; pi.id = 'mrwa_param'; pi.placeholder = 'Örn: Kampanya, %20';
    sablonAlan.appendChild(lp); sablonAlan.appendChild(pi);
    var lm = el('label', null, 'MEDYA BAĞLANTISI (opsiyonel — şablon başlığı için, https://…)'); lm.className = 'mr-wa-lbl';
    var mi = el('input'); mi.className = 'mr-wa-inp'; mi.id = 'mrwa_medya'; mi.placeholder = 'https://...';
    sablonAlan.appendChild(lm); sablonAlan.appendChild(mi);
    govde.appendChild(sablonAlan);

    var metinAlan = el('div'); metinAlan.style.display = 'none';
    var lme = el('label', null, 'MESAJ METNİ'); lme.className = 'mr-wa-lbl';
    var me = el('textarea'); me.className = 'mr-wa-inp'; me.id = 'mrwa_mesaj';
    metinAlan.appendChild(lme); metinAlan.appendChild(me);
    govde.appendChild(metinAlan);

    sel.onchange = function () { var s = sel.value === 'sablon'; sablonAlan.style.display = s ? '' : 'none'; metinAlan.style.display = s ? 'none' : ''; };

    var durum = el('div', { margin: '14px 0', font: '700 12px Manrope', color: '#cbd5e1' }); govde.appendChild(durum);
    var gonder = el('button', null, 'GÖNDER'); gonder.className = 'mr-wa-btn2'; govde.appendChild(gonder);

    gonder.onclick = function () {
      var a = api(); if (!a) return;
      var nolar = (document.getElementById('mrwa_nolar').value || '').split(/[\s,;]+/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (!nolar.length) { toast('NUMARA LİSTESİ BOŞ', 'warning'); return; }
      var tip = sel.value;
      var taban = { tip: tip };
      if (tip === 'sablon') {
        taban.sablon = (document.getElementById('mrwa_sablon').value || '').trim();
        taban.dil = (document.getElementById('mrwa_dil').value || 'tr').trim();
        var pr = (document.getElementById('mrwa_param').value || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        if (pr.length) taban.parametreler = pr;
        var md = (document.getElementById('mrwa_medya').value || '').trim();
        if (md) taban.medya_header = { tip: 'image', link: md };
        if (!taban.sablon) { toast('ŞABLON ADI GEREKLİ', 'warning'); return; }
      } else {
        taban.mesaj = (document.getElementById('mrwa_mesaj').value || '').trim();
        if (!taban.mesaj) { toast('MESAJ METNİ GEREKLİ', 'warning'); return; }
      }
      // 25'erli parça parça (zaman aşımı için)
      var parcalar = []; for (var i = 0; i < nolar.length; i += 25) parcalar.push(nolar.slice(i, i + 25));
      var tOk = 0, tHata = 0, idx = 0;
      gonder.disabled = true;
      function sonraki() {
        if (idx >= parcalar.length) {
          gonder.disabled = false;
          durum.innerHTML = '✅ TAMAMLANDI — ' + tOk + ' BAŞARILI / ' + tHata + ' HATA (toplam ' + nolar.length + ')';
          toast('GÖNDERİM TAMAMLANDI: ' + tOk + '/' + nolar.length, tHata ? 'warning' : 'success');
          return;
        }
        var p = Object.assign({}, taban, { numaralar: parcalar[idx] });
        durum.textContent = 'GÖNDERİLİYOR… ' + (idx * 25 + parcalar[idx].length) + ' / ' + nolar.length;
        a.req('/whatsapp/toplu-gonder.php', { method: 'POST', body: JSON.stringify(p) }, 120000)
          .then(function (r) { if (r && r.data) { tOk += r.data.basarili || 0; tHata += r.data.hata || 0; } else { tHata += parcalar[idx].length; } })
          .catch(function () { tHata += parcalar[idx].length; })
          .then(function () { idx++; sonraki(); });
      }
      sonraki();
    };
  }

  /* ════ LOGLAR ════ */
  function loglarTab(govde) {
    govde.innerHTML = '<div style="color:#94a3b8;font:700 13px Manrope">YÜKLENİYOR…</div>';
    var a = api(); if (!a) return;
    a.req('/whatsapp/log-list.php?limit=50').then(function (r) {
      var items = (r && r.data && r.data.items) ? r.data.items : [];
      if (!items.length) { govde.innerHTML = '<div style="color:#94a3b8;font:700 13px Manrope">KAYIT YOK.</div>'; return; }
      var html = '<table class="mr-wa-tbl"><thead><tr><th>TARİH</th><th>NUMARA</th><th>TİP</th><th>DURUM</th><th>SONUÇ</th></tr></thead><tbody>';
      items.forEach(function (it) {
        var renk = it.durum === 'gonderildi' ? '#86efac' : (it.durum === 'hata' ? '#fca5a5' : '#cbd5e1');
        html += '<tr><td>' + (it.created_at || '') + '</td><td>' + (it.telefon || '') + '</td><td>' + (it.tip || '') + '</td><td style="color:' + renk + ';font-weight:800">' + (it.durum || '') + '</td><td>' + (it.sonuc_mesaj || '') + '</td></tr>';
      });
      html += '</tbody></table>';
      govde.innerHTML = html;
    }).catch(function () { govde.innerHTML = '<div style="color:#fca5a5">YÜKLENEMEDİ</div>'; });
  }

  function tabAc(t) {
    aktifTab = t;
    var govde = document.getElementById('mr-wa-govde');
    ['toplu', 'loglar', 'ayarlar'].forEach(function (x) { var b = document.getElementById('mr-wa-tab-' + x); if (b) b.className = 'mr-wa-tab' + (x === t ? ' aktif' : ''); });
    if (t === 'toplu') topluTab(govde); else if (t === 'loglar') loglarTab(govde); else ayarlarTab(govde);
  }

  function overlayKur() {
    if (document.getElementById('mr-wa-ov')) return;
    var ov = el('div'); ov.id = 'mr-wa-ov'; ov.setAttribute('data-widget', '1'); ov.setAttribute('data-no-print', '1');
    var bar = el('div'); bar.className = 'mr-wa-bar';
    var baslik = el('div', { font: '800 14px Manrope', color: WA_YESIL, textTransform: 'uppercase', marginRight: '6px' }, 'WHATSAPP');
    bar.appendChild(baslik);
    var sekmeler = [];
    if (izinli('whatsapp_gonder')) sekmeler.push(['toplu', 'TOPLU GÖNDERİM']);
    sekmeler.push(['loglar', 'LOGLAR']);
    if (izinli('whatsapp_ayarlar')) sekmeler.push(['ayarlar', 'AYARLAR']);
    _waSekmeler = sekmeler;
    sekmeler.forEach(function (t) {
      var b = el('button', null, t[1]); b.className = 'mr-wa-tab'; b.id = 'mr-wa-tab-' + t[0]; b.onclick = function () { tabAc(t[0]); }; bar.appendChild(b);
    });
    var x = el('button', null, '✕'); x.className = 'mr-wa-x'; x.onclick = function () { ov.classList.remove('acik'); }; bar.appendChild(x);
    ov.appendChild(bar);
    var govde = el('div'); govde.id = 'mr-wa-govde'; govde.className = 'mr-wa-govde'; ov.appendChild(govde);
    document.body.appendChild(ov);
  }
  function ac() { stil(); overlayKur(); document.getElementById('mr-wa-ov').classList.add('acik'); tabAc((_waSekmeler[0] || ['loglar'])[0]); }

  function butonKur() {
    if (document.getElementById('mr-wa-btn')) return;
    var b = document.createElement('button'); b.id = 'mr-wa-btn'; b.title = 'WHATSAPP'; b.setAttribute('data-widget', '1'); b.setAttribute('data-no-print', '1');
    b.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 0 0 1.523 5.26l-.999 3.648 3.965-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
    b.onclick = ac;
    document.body.appendChild(b);
  }
  /* ════ YETKİ: sadece izinli kullanıcılar görür (admin her zaman) ════ */
  var _user = null, _userTok = null, _waSekmeler = [];
  function userTazele() {
    var tok = null; try { tok = localStorage.getItem('mr_token'); } catch (e) {}
    if (tok === _userTok) return;
    _userTok = tok; _user = null;
    if (!tok) { gorunur(); return; }
    fetch('/api/v1/auth/me.php', { headers: { 'Authorization': 'Bearer ' + tok } })
      .then(function (r) { return r.json(); })
      .then(function (j) { _user = (j && j.data && j.data.user) ? j.data.user : ((j && j.data) ? j.data : null); gorunur(); })
      .catch(function () {});
  }
  function izinli(key) { if (!_user) return false; if (_user.rol === 'admin') return true; var y = _user.yetkiler || {}; return y[key] === 1 || y[key] === '1'; }

  function gorunur() {
    var goster = girisVar() && izinli('whatsapp_goruntule');
    var b = document.getElementById('mr-wa-btn');
    if (goster && !b) { stil(); butonKur(); } else if (b) b.style.display = goster ? 'flex' : 'none';
  }

  function baslat() {
    stil(); userTazele(); gorunur();
    setInterval(function () { userTazele(); gorunur(); }, 1500);
    window.addEventListener('storage', function () { userTazele(); gorunur(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var ov = document.getElementById('mr-wa-ov'); if (ov) ov.classList.remove('acik'); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', baslat); else baslat();
})();
