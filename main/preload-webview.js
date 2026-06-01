(function() {
  'use strict';

  // ══════════════════════════════════════
  // CANVAS FINGERPRINT NOISE
  // ══════════════════════════════════════
  const noise = Math.random() * 0.00001;
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const ctx = this.getContext('2d');
    if (ctx) {
      ctx.fillStyle = `rgba(255,255,255,${noise})`;
      ctx.fillRect(0, 0, 1, 1);
    }
    return origToDataURL.apply(this, args);
  };

  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const data = origGetImageData.apply(this, args);
    if (data && data.data && data.data.length > 4) {
      // Flip a random low bit
      data.data[Math.floor(Math.random() * data.data.length)] ^= 1;
    }
    return data;
  };

  // ══════════════════════════════════════
  // WEBGL FINGERPRINT SPOOFING
  // ══════════════════════════════════════
  const getParamOrig = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 0x9245) return 'Generic GPU Vendor';
    if (param === 0x9246) return 'Generic GPU Renderer';
    return getParamOrig.apply(this, arguments);
  };

  const getExtOrig = WebGLRenderingContext.prototype.getExtension;
  WebGLRenderingContext.prototype.getExtension = function(name) {
    if (name === 'WEBGL_debug_renderer_info') {
      return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
    }
    return getExtOrig.apply(this, arguments);
  };

  // WebGL2
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const getParam2Orig = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(param) {
      if (param === 0x9245) return 'Generic GPU Vendor';
      if (param === 0x9246) return 'Generic GPU Renderer';
      return getParam2Orig.apply(this, arguments);
    };

    const getExt2Orig = WebGL2RenderingContext.prototype.getExtension;
    WebGL2RenderingContext.prototype.getExtension = function(name) {
      if (name === 'WEBGL_debug_renderer_info') {
        return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
      }
      return getExt2Orig.apply(this, arguments);
    };
  }

  // ══════════════════════════════════════
  // AUDIO CONTEXT FINGERPRINT
  // ══════════════════════════════════════
  if (window.AudioContext || window.webkitAudioContext) {
    const OrigAudioCtx = window.AudioContext || window.webkitAudioContext;
    const origCreateOscillator = OrigAudioCtx.prototype.createOscillator;
    OrigAudioCtx.prototype.createOscillator = function() {
      const osc = origCreateOscillator.apply(this, arguments);
      // Add tiny noise to frequency
      const origFreqValue = osc.frequency.value;
      try { osc.frequency.value = origFreqValue + (Math.random() * 0.001 - 0.0005); } catch(e) {}
      return osc;
    };
  }

  // ══════════════════════════════════════
  // NAVIGATOR SPOOFING
  // ══════════════════════════════════════
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
  Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true });

  // Spoof plugins array
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      return { length: 3, item: () => null, namedItem: () => null, refresh: () => {} };
    }
  });

  // ══════════════════════════════════════
  // SCREEN / DISPLAY SPOOFING
  // ══════════════════════════════════════
  Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
  Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });

  // ══════════════════════════════════════
  // BATTERY API BLOCK
  // ══════════════════════════════════════
  if (navigator.getBattery) {
    navigator.getBattery = () => Promise.reject(new Error('Battery API blocked'));
  }

  // ══════════════════════════════════════
  // DISABLE BEACON / SENDBEACON (tracking)
  // ══════════════════════════════════════
  navigator.sendBeacon = () => false;

  // ══════════════════════════════════════
  // BLOCK CLIPBOARD READ
  // ══════════════════════════════════════
  if (navigator.clipboard) {
    navigator.clipboard.readText = () => Promise.reject(new Error('Clipboard read blocked'));
    navigator.clipboard.read = () => Promise.reject(new Error('Clipboard read blocked'));
  }

  // ══════════════════════════════════════
  // WEBRTC LOCAL IP SPOOFER
  // ══════════════════════════════════════
  const OrigPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
  if (OrigPeerConnection) {
    // Generate a random local IP once per session
    const spoofedIp = `10.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
    
    class SpoofedPeerConnection extends OrigPeerConnection {
      createOffer(options) {
        return super.createOffer(options).then(offer => {
          if (offer && offer.sdp) {
            offer.sdp = offer.sdp.replace(/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/g, spoofedIp);
          }
          return offer;
        });
      }
      createAnswer(options) {
        return super.createAnswer(options).then(answer => {
          if (answer && answer.sdp) {
            answer.sdp = answer.sdp.replace(/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)/g, spoofedIp);
          }
          return answer;
        });
      }
    }
    window.RTCPeerConnection = SpoofedPeerConnection;
    window.webkitRTCPeerConnection = SpoofedPeerConnection;
  }

  // ══════════════════════════════════════
  // MOCK MEDIA DEVICES (Hide Device Labels)
  // ══════════════════════════════════════
  if (navigator.mediaDevices) {
    navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
  } else {
    Object.defineProperty(navigator, 'mediaDevices', { value: { enumerateDevices: () => Promise.resolve([]) } });
  }

  // ══════════════════════════════════════
  // TRACK CAMERA/MIC USAGE FOR INDICATORS
  // ══════════════════════════════════════
  try {
    const { ipcRenderer } = require('electron');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      
      let activeStreams = [];
      const updateMediaState = () => {
        let video = false;
        let audio = false;
        activeStreams.forEach(stream => {
          if (stream.getVideoTracks().some(t => t.readyState === 'live')) video = true;
          if (stream.getAudioTracks().some(t => t.readyState === 'live')) audio = true;
        });
        ipcRenderer.sendToHost('media-devices-active', { video, audio });
      };

      navigator.mediaDevices.getUserMedia = function(constraints) {
        return origGetUserMedia(constraints).then(stream => {
          activeStreams.push(stream);
          updateMediaState();
          
          stream.getTracks().forEach(track => {
            track.addEventListener('ended', () => {
              // Remove stream if all tracks ended, or just update state
              updateMediaState();
            });
          });
          
          return stream;
        });
      };
    }
  } catch (e) {
    // electron require might fail if nodeIntegration is off and context isolation is on,
    // but in standard webview preload, require('electron') is available.
  }
})();
