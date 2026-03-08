/**
 * NetGSM Softphone - Arama Paneli UI (CRM entegre)
 */
(function (global) {
  'use strict';
  var CONNECTION_STATUS = global.NetGSMSoftphoneConfig ? global.NetGSMSoftphoneConfig.CONNECTION_STATUS : { DISCONNECTED: 0, CONNECTING: 1, CONNECTED: 2, ERROR: 3, REGISTERED: 4 };

  function createSVGPhone() {
    return '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
  }
  function createSVGClose() {
    return '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  }
  function statusClass(s) {
    if (s === CONNECTION_STATUS.REGISTERED || s === CONNECTION_STATUS.CONNECTED) return 'registered';
    if (s === CONNECTION_STATUS.CONNECTING) return 'connecting';
    if (s === CONNECTION_STATUS.ERROR) return 'error';
    return 'disconnected';
  }

  function initSoftphoneUI(options) {
    options = options || {};
    var sipDomain = options.sipDomain || 'sip.netsantral.com';
    var config = {
      wssUrl: options.wssUrl || 'wss://sip.netsantral.com:8089/ws',
      sipUri: options.sipUri || '',
      sipDomain: sipDomain,
      password: options.password || '',
      displayName: options.displayName || 'CRM Softphone'
    };

    var softphone = new global.NetGSMSoftphone(config);
    var panelOpen = false;

    var wrap = document.createElement('div');
    wrap.className = 'netgsm-sp-wrap';

    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'netgsm-sp-toggle status-disconnected';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Arama paneli');
    toggleBtn.innerHTML = '<span class="netgsm-sp-dot"></span>' + createSVGPhone();

    var panel = document.createElement('div');
    panel.className = 'netgsm-sp-panel';
    panel.innerHTML =
      '<div class="netgsm-sp-header">' +
        '<h3>Arama Paneli</h3>' +
        '<button type="button" class="netgsm-sp-close" aria-label="Kapat">' + createSVGClose() + '</button>' +
      '</div>' +
      '<div class="netgsm-sp-body">' +
        '<div class="netgsm-sp-status">' +
          '<span class="netgsm-sp-status-dot disconnected"></span>' +
          '<span class="netgsm-sp-status-text">Bağlı Değil</span>' +
        '</div>' +
        '<div class="netgsm-sp-input-wrap">' +
          '<input type="tel" class="netgsm-sp-input" placeholder="Numara girin (örn: 532...)">' +
        '</div>' +
        '<div class="netgsm-sp-actions">' +
          '<button type="button" class="netgsm-sp-btn netgsm-sp-btn-primary netgsm-sp-btn-call">Ara</button>' +
          '<button type="button" class="netgsm-sp-btn netgsm-sp-btn-danger netgsm-sp-btn-hangup" style="display:none">Kapat</button>' +
          '<button type="button" class="netgsm-sp-btn netgsm-sp-btn-default netgsm-sp-btn-connect">Bağlan</button>' +
        '</div>' +
      '</div>';

    var incomingWrap = document.createElement('div');
    incomingWrap.className = 'netgsm-sp-incoming';
    incomingWrap.innerHTML =
      '<div class="netgsm-sp-incoming-title">Gelen arama</div>' +
      '<div class="netgsm-sp-incoming-number"></div>' +
      '<div class="netgsm-sp-incoming-actions">' +
        '<button type="button" class="netgsm-sp-btn netgsm-sp-btn-primary netgsm-sp-btn-answer">Cevapla</button>' +
        '<button type="button" class="netgsm-sp-btn netgsm-sp-btn-danger netgsm-sp-btn-reject">Reddet</button>' +
      '</div>';

    var activeCallBar = document.createElement('div');
    activeCallBar.className = 'netgsm-sp-active-call';
    activeCallBar.innerHTML = '<span class="netgsm-sp-active-number"></span><button type="button" class="netgsm-sp-btn netgsm-sp-btn-danger netgsm-sp-btn-hangup-bar">Kapat</button>';

    document.body.appendChild(incomingWrap);
    document.body.appendChild(activeCallBar);
    wrap.appendChild(panel);
    wrap.appendChild(toggleBtn);
    document.body.appendChild(wrap);

    var statusText = panel.querySelector('.netgsm-sp-status-text');
    var statusDot = panel.querySelector('.netgsm-sp-status-dot');
    var input = panel.querySelector('.netgsm-sp-input');
    var btnCall = panel.querySelector('.netgsm-sp-btn-call');
    var btnHangup = panel.querySelector('.netgsm-sp-btn-hangup');
    var btnConnect = panel.querySelector('.netgsm-sp-btn-connect');
    var btnClose = panel.querySelector('.netgsm-sp-close');
    var incomingNumber = incomingWrap.querySelector('.netgsm-sp-incoming-number');
    var btnAnswer = incomingWrap.querySelector('.netgsm-sp-btn-answer');
    var btnReject = incomingWrap.querySelector('.netgsm-sp-btn-reject');
    var activeNumber = activeCallBar.querySelector('.netgsm-sp-active-number');
    var btnHangupBar = activeCallBar.querySelector('.netgsm-sp-btn-hangup-bar');

    function updateStatusUI(status, label) {
      var c = statusClass(status);
      toggleBtn.className = 'netgsm-sp-toggle status-' + c;
      var dot = toggleBtn.querySelector('.netgsm-sp-dot');
      if (dot) dot.className = 'netgsm-sp-dot ' + c;
      if (statusText) statusText.textContent = label || 'Bağlı Değil';
      if (statusDot) statusDot.className = 'netgsm-sp-status-dot ' + c;
    }

    softphone.onStatusChange = function (status, label) { updateStatusUI(status, label); };

    softphone.onIncomingCall = function (data) {
      var from = data.from || '';
      var match = from.match(/sip:([^@]+)@/);
      var num = match ? match[1] : from;
      incomingNumber.textContent = num;
      incomingWrap.classList.add('show');
    };

    softphone.onCallEnded = function () {
      incomingWrap.classList.remove('show');
      activeCallBar.classList.remove('show');
      if (btnHangup) btnHangup.style.display = 'none';
      if (btnCall) btnCall.style.display = '';
    };

    function startCall() {
      var num = input.value.trim();
      if (!num) return;
      softphone.dial(num).then(function () {
        activeNumber.textContent = num;
        activeCallBar.classList.add('show');
        btnHangup.style.display = '';
        btnCall.style.display = 'none';
      }).catch(function (err) {
        alert('Arama başarısız: ' + (err.message || err));
      });
    }

    function hangup() {
      softphone.hangup();
      activeCallBar.classList.remove('show');
      btnHangup.style.display = 'none';
      btnCall.style.display = '';
    }

    toggleBtn.addEventListener('click', function () {
      panelOpen = !panelOpen;
      panel.classList.toggle('open', panelOpen);
    });
    btnClose.addEventListener('click', function () { panelOpen = false; panel.classList.remove('open'); });
    btnCall.addEventListener('click', startCall);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') startCall(); });
    btnHangup.addEventListener('click', hangup);
    btnHangupBar.addEventListener('click', hangup);

    btnConnect.addEventListener('click', function () {
      if (config.sipUri && config.password) {
        softphone.connect();
      } else {
        config.sipUri = prompt('SIP URI (örn: sip:102@sip.netsantral.com):', config.sipUri);
        config.password = prompt('Dahili şifresi:', '');
        if (config.sipUri && config.password) {
          softphone.sipUri = config.sipUri;
          softphone.password = config.password;
          softphone.connect();
        }
      }
    });

    btnAnswer.addEventListener('click', function () {
      softphone.answer();
      incomingWrap.classList.remove('show');
      activeNumber.textContent = incomingNumber.textContent;
      activeCallBar.classList.add('show');
      btnHangup.style.display = '';
      btnCall.style.display = 'none';
    });
    btnReject.addEventListener('click', function () { softphone.reject(); incomingWrap.classList.remove('show'); });

    if (options.autoConnect && config.sipUri && config.password) {
      softphone.connect();
    }

    document.body.addEventListener('click', function (e) {
      var el = e.target.closest('[data-netgsm-call], .netgsm-click-to-call');
      if (!el) return;
      e.preventDefault();
      var num = el.getAttribute('data-netgsm-call') || el.getAttribute('data-phone') || el.textContent.trim();
      if (!num) return;
      if (!softphone.isReady()) {
        alert('Önce Arama Paneli\'nden Bağlan ile santrale bağlanın.');
        return;
      }
      input.value = num.replace(/\s/g, '');
      startCall();
    });

    return {
      softphone: softphone,
      openPanel: function () { panelOpen = true; panel.classList.add('open'); },
      closePanel: function () { panelOpen = false; panel.classList.remove('open'); },
      dial: function (number) {
        if (!softphone.isReady()) return Promise.reject(new Error('Bağlı değil'));
        input.value = (number || '').toString().replace(/\s/g, '');
        return softphone.dial(input.value).then(function () {
          activeNumber.textContent = input.value;
          activeCallBar.classList.add('show');
          btnHangup.style.display = '';
          btnCall.style.display = 'none';
          return null;
        });
      }
    };
  }

  global.NetGSMSoftphoneUI = { init: initSoftphoneUI };
})(typeof window !== 'undefined' ? window : this);
