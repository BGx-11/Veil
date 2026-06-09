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
  // KEYBOARD LAYOUT API FINGERPRINT BLOCK
  // Prevents sites from detecting your keyboard
  // layout to narrow down locale/language
  // ══════════════════════════════════════
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
    navigator.keyboard.getLayoutMap = () => Promise.reject(new Error('Keyboard API blocked for privacy'));
  }

  // ══════════════════════════════════════
  // NETWORK INFORMATION API BLOCK
  // Prevents sites from reading your connection
  // type, downlink speed, and effective type
  // ══════════════════════════════════════
  if (navigator.connection) {
    try {
      Object.defineProperty(navigator, 'connection', {
        get: () => undefined,
        configurable: true
      });
    } catch (e) {}
  }

  // ══════════════════════════════════════
  // GAMEPAD API BLOCK (fingerprint vector)
  // ══════════════════════════════════════
  if (navigator.getGamepads) {
    navigator.getGamepads = () => [];
  }

  // ══════════════════════════════════════
  // SPEECH SYNTHESIS FINGERPRINT BLOCK
  // Voice enumeration reveals OS/language info
  // ══════════════════════════════════════
  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.getVoices = () => [];
    } catch (e) {}
  }

  // ══════════════════════════════════════
  // BLUETOOTH / USB / SERIAL API BLOCK
  // ══════════════════════════════════════
  if (navigator.bluetooth) {
    try {
      Object.defineProperty(navigator, 'bluetooth', { get: () => undefined });
    } catch (e) {}
  }
  if (navigator.usb) {
    try {
      Object.defineProperty(navigator, 'usb', { get: () => undefined });
    } catch (e) {}
  }
  if (navigator.serial) {
    try {
      Object.defineProperty(navigator, 'serial', { get: () => undefined });
    } catch (e) {}
  }
  if (navigator.hid) {
    try {
      Object.defineProperty(navigator, 'hid', { get: () => undefined });
    } catch (e) {}
  }

  // ══════════════════════════════════════
  // FONT ENUMERATION PROTECTION
  // Block attempts to detect installed fonts
  // (a major browser fingerprinting vector)
  // ══════════════════════════════════════
  if (window.queryLocalFonts) {
    window.queryLocalFonts = () => Promise.reject(new Error('Font enumeration blocked'));
  }
  if (document.fonts && document.fonts.check) {
    const origCheck = document.fonts.check.bind(document.fonts);
    document.fonts.check = function(font, text) {
      // Only allow common web-safe fonts
      const safeFonts = ['arial', 'helvetica', 'times', 'times new roman', 'courier', 'courier new', 'georgia', 'verdana', 'trebuchet ms', 'impact', 'comic sans ms', 'serif', 'sans-serif', 'monospace'];
      const fontLower = font.toLowerCase();
      const isSafe = safeFonts.some(sf => fontLower.includes(sf));
      if (isSafe) return origCheck(font, text);
      return true; // Pretend all fonts exist to prevent enumeration
    };
  }

  // ══════════════════════════════════════
  // STORAGE ESTIMATION BLOCK
  // Prevents sites from fingerprinting via
  // available storage capacity
  // ══════════════════════════════════════
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate = () => Promise.resolve({ quota: 1073741824, usage: 0 }); // 1GB fixed response
  }

  // ══════════════════════════════════════
  // PERFORMANCE.MEMORY SPOOFING
  // Prevents memory-based fingerprinting
  // ══════════════════════════════════════
  if (performance.memory) {
    try {
      Object.defineProperty(performance, 'memory', {
        get: () => ({
          jsHeapSizeLimit: 2172649472,
          totalJSHeapSize: 50000000,
          usedJSHeapSize: 40000000,
        }),
      });
    } catch (e) {}
  }

  // ══════════════════════════════════════
  // DATE / TIMEZONE NORMALIZATION
  // Prevent timezone fingerprinting by
  // keeping Intl data consistent
  // ══════════════════════════════════════
  // Note: We do NOT spoof timezone itself as that breaks
  // too many websites, but we normalize the format string
  // to prevent micro-fingerprinting via locale differences
  try {
    const origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      const opts = origResolvedOptions.apply(this, arguments);
      // Normalize calendar to always report 'gregory'
      opts.calendar = 'gregory';
      opts.numberingSystem = 'latn';
      return opts;
    };
  } catch (e) {}

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
  // VISIBILITY STATE SPOOFING
  // Prevent sites from knowing when you
  // switch tabs (used for tracking engagement)
  // ══════════════════════════════════════
  try {
    Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    // Block visibility change events
    const origAddEventListener = document.addEventListener.bind(document);
    document.addEventListener = function(type, listener, options) {
      if (type === 'visibilitychange') return; // Silently block
      return origAddEventListener(type, listener, options);
    };
  } catch (e) {}

  // ══════════════════════════════════════
  // IDLE DETECTION API BLOCK
  // Prevents sites from detecting when
  // the user is idle/away from keyboard
  // ══════════════════════════════════════
  if (window.IdleDetector) {
    try {
      delete window.IdleDetector;
    } catch (e) {
      window.IdleDetector = undefined;
    }
  }

  // ══════════════════════════════════════
  // PICTURE-IN-PICTURE HELPER
  // Inject floating PiP button on video elements
  // ══════════════════════════════════════
  function injectPiPButtons() {
    document.querySelectorAll('video').forEach(video => {
      if (video.dataset.veilPip) return;
      video.dataset.veilPip = 'true';
      
      if (video.offsetWidth < 200 || video.offsetHeight < 150) return; // Skip tiny videos
      
      const btn = document.createElement('button');
      btn.innerHTML = '⧉';
      btn.title = 'Picture-in-Picture';
      btn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:99999;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:6px;padding:6px 10px;font-size:16px;cursor:pointer;opacity:0;transition:opacity 0.2s;backdrop-filter:blur(8px);';
      
      const wrapper = video.parentElement;
      if (wrapper) {
        const origPosition = getComputedStyle(wrapper).position;
        if (origPosition === 'static') wrapper.style.position = 'relative';
        
        wrapper.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
        wrapper.addEventListener('mouseleave', () => { btn.style.opacity = '0'; });
        
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();
          try {
            if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
            } else {
              await video.requestPictureInPicture();
            }
          } catch (err) {
            console.warn('PiP failed:', err);
          }
        });
        
        wrapper.appendChild(btn);
      }
    });
  }
  
  // Run PiP injection after page load and on DOM changes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectPiPButtons, 1500));
  } else {
    setTimeout(injectPiPButtons, 1500);
  }
  
  // Observe for dynamically added videos
  const pipObserver = new MutationObserver(() => setTimeout(injectPiPButtons, 500));
  pipObserver.observe(document.documentElement, { childList: true, subtree: true });

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
