/**
 * NetGSM WebRTC Softphone - JsSIP WSS (CRM entegre)
 */
(function (global) {
  'use strict';
  var CONNECTION_STATUS = { DISCONNECTED: 0, CONNECTING: 1, CONNECTED: 2, ERROR: 3, REGISTERED: 4 };
  var STATUS_LABELS = { 0: 'Bağlı Değil', 1: 'Bağlanıyor...', 2: 'Bağlı', 3: 'Hata', 4: 'Hazır' };

  function normalizeNumber(num) {
    if (!num) return '';
    var s = String(num).replace(/\s/g, '');
    return s.replace(/^0/, '90').replace(/\D/g, '');
  }

  function NetGSMSoftphone(options) {
    options = options || {};
    this.wssUrl = options.wssUrl || 'wss://sip.netsantral.com:8089/ws';
    this.sipUri = options.sipUri || '';
    this.sipDomain = options.sipDomain || 'sip.netsantral.com';
    this.password = options.password || '';
    this.displayName = options.displayName || 'CRM';
    this.ringSoundUrl = options.ringSoundUrl || '';
    this.status = CONNECTION_STATUS.DISCONNECTED;
    this.ua = null;
    this.currentSession = null;
    this.incomingSession = null;
    this.ringAudio = null;
    this.onStatusChange = options.onStatusChange || function () {};
    this.onIncomingCall = options.onIncomingCall || function () {};
    this.onCallEnded = options.onCallEnded || function () {};
    this.initRingSound();
  }

  NetGSMSoftphone.prototype.initRingSound = function () {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.value = 0.15;
      this.ringOscillator = osc;
      this.ringGain = gain;
      this.ringCtx = ctx;
    } catch (e) { this.ringOscillator = null; }
  };

  NetGSMSoftphone.prototype.playRing = function (on) {
    if (this.ringSoundUrl) {
      if (!this.ringAudio) this.ringAudio = new Audio(this.ringSoundUrl);
      if (on) this.ringAudio.play().catch(function () {});
      else try { this.ringAudio.pause(); this.ringAudio.currentTime = 0; } catch (e) {}
      return;
    }
    if (!this.ringOscillator || !this.ringCtx) return;
    try {
      if (on) {
        this.ringOscillator.start(0);
        this.ringInterval = setInterval(function (self) {
          if (self.ringOscillator) self.ringOscillator.frequency.value = self.ringOscillator.frequency.value === 800 ? 1000 : 800;
        }, 300, this);
      } else {
        clearInterval(this.ringInterval);
        try { this.ringOscillator.stop(0); } catch (e) {}
        this.initRingSound();
      }
    } catch (e) {}
  };

  NetGSMSoftphone.prototype.setStatus = function (s) {
    if (this.status === s) return;
    this.status = s;
    this.onStatusChange(s, STATUS_LABELS[s]);
  };

  NetGSMSoftphone.prototype.connect = function () {
    var self = this;
    if (!this.sipUri || !this.password) {
      this.setStatus(CONNECTION_STATUS.ERROR);
      return Promise.reject(new Error('SIP URI ve şifre gerekli'));
    }
    if (this.ua && (this.ua.isConnected() || this.ua.isRegistered())) return Promise.resolve();
    this.setStatus(CONNECTION_STATUS.CONNECTING);
    try {
      var socket = new JsSIP.WebSocketInterface(this.wssUrl);
      var config = {
        sockets: [socket],
        uri: this.sipUri,
        password: this.password,
        display_name: this.displayName,
        register: true,
        register_expires: 300
      };
      if (this.ua) try { this.ua.stop(); } catch (e) {}
      this.ua = new JsSIP.UA(config);
      this.ua.on('connecting', function () { self.setStatus(CONNECTION_STATUS.CONNECTING); });
      this.ua.on('connected', function () { self.setStatus(CONNECTION_STATUS.CONNECTED); });
      this.ua.on('disconnected', function (data) {
        if (data.error) self.setStatus(CONNECTION_STATUS.ERROR);
        else self.setStatus(CONNECTION_STATUS.DISCONNECTED);
      });
      this.ua.on('registered', function () { self.setStatus(CONNECTION_STATUS.REGISTERED); });
      this.ua.on('registrationFailed', function () { self.setStatus(CONNECTION_STATUS.ERROR); });
      this.ua.on('unregistered', function () {
        if (!self.ua.isConnected()) self.setStatus(CONNECTION_STATUS.DISCONNECTED);
      });
      this.ua.on('newRTCSession', function (data) {
        var session = data.session;
        if (data.originator === 'remote') {
          self.incomingSession = session;
          self.playRing(true);
          session.on('ended', function () {
            self.playRing(false);
            self.incomingSession = null;
            self.currentSession = null;
            self.onCallEnded();
          });
          session.on('failed', function () {
            self.playRing(false);
            self.incomingSession = null;
            self.onCallEnded();
          });
          self.onIncomingCall({ session: session, from: session.remote_identity ? session.remote_identity.toString() : 'Bilinmeyen' });
        } else {
          self.currentSession = session;
          session.on('ended', function () { self.currentSession = null; self.onCallEnded(); });
          session.on('failed', function () { self.currentSession = null; self.onCallEnded(); });
        }
      });
      this.ua.start();
      return Promise.resolve();
    } catch (err) {
      this.setStatus(CONNECTION_STATUS.ERROR);
      return Promise.reject(err);
    }
  };

  NetGSMSoftphone.prototype.disconnect = function () {
    this.playRing(false);
    if (this.ua) { try { this.ua.stop(); } catch (e) {} this.ua = null; }
    this.currentSession = null;
    this.incomingSession = null;
    this.setStatus(CONNECTION_STATUS.DISCONNECTED);
  };

  NetGSMSoftphone.prototype.dial = function (number) {
    var n = normalizeNumber(number);
    if (!n) return Promise.reject(new Error('Geçersiz numara'));
    var target = 'sip:' + n + '@' + (this.sipDomain || 'sip.netsantral.com');
    if (!this.ua || !this.ua.isConnected()) return Promise.reject(new Error('Önce bağlanın'));
    var self = this;
    return new Promise(function (resolve, reject) {
      var session = self.ua.call(target, {
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] }
      });
      if (!session) return reject(new Error('Arama başlatılamadı'));
      self.currentSession = session;
      session.on('accepted', function () { resolve(session); });
      session.on('confirmed', function () { resolve(session); });
      session.on('ended', function () { self.currentSession = null; self.onCallEnded(); });
      session.on('failed', function (data) {
        self.currentSession = null;
        reject(data.cause || new Error('Arama başarısız'));
      });
    });
  };

  NetGSMSoftphone.prototype.answer = function () {
    if (!this.incomingSession) return;
    this.playRing(false);
    this.incomingSession.answer({ mediaConstraints: { audio: true, video: false } });
    this.currentSession = this.incomingSession;
    this.incomingSession = null;
  };

  NetGSMSoftphone.prototype.reject = function () {
    if (!this.incomingSession) return;
    this.playRing(false);
    this.incomingSession.terminate();
    this.incomingSession = null;
  };

  NetGSMSoftphone.prototype.hangup = function () {
    if (this.currentSession && !this.currentSession.isEnded()) this.currentSession.terminate();
    this.currentSession = null;
  };

  NetGSMSoftphone.prototype.isReady = function () {
    return this.ua && (this.ua.isConnected() || this.ua.isRegistered());
  };

  global.NetGSMSoftphone = NetGSMSoftphone;
  global.NetGSMSoftphoneConfig = { CONNECTION_STATUS: CONNECTION_STATUS, STATUS_LABELS: STATUS_LABELS, normalizeNumber: normalizeNumber };
})(typeof window !== 'undefined' ? window : this);
