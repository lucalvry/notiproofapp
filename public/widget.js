/* NotiProof widget runtime (spec v2)
 * Loads widget config + approved proofs, renders per widget.type,
 * and posts impression/interaction events to widget-track.
 * build: 2026-04-26-ab-assist-telemetry
 */
(function () {
  "use strict";
  if (window.__notiproof_loaded) return;
  window.__notiproof_loaded = true;

  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();
  var BUSINESS = script.getAttribute("data-business");
  var WIDGET = script.getAttribute("data-widget") || null;
  if (!BUSINESS) return;

  var SUPABASE_URL = "https://ykpvxwwhhdzihjphlohh.supabase.co";
  var FN = SUPABASE_URL + "/functions/v1";

  // ---- Visitor / session / device telemetry ----
  var VISITOR_IS_NEW = false;
  var VISITOR = (function () {
    try {
      var k = "np_vid";
      var v = localStorage.getItem(k);
      if (!v) {
        v = (crypto.randomUUID && crypto.randomUUID()) ||
          (Date.now().toString(36) + Math.random().toString(36).slice(2));
        localStorage.setItem(k, v);
        VISITOR_IS_NEW = true;
      }
      return v;
    } catch (_) { return null; }
  })();
  var VISITOR_TYPE = VISITOR_IS_NEW ? "new" : "returning";

  var SESSION = (function () {
    try {
      var k = "np_sid";
      var v = sessionStorage.getItem(k);
      if (!v) {
        v = (crypto.randomUUID && crypto.randomUUID()) ||
          (Date.now().toString(36) + Math.random().toString(36).slice(2));
        sessionStorage.setItem(k, v);
      }
      return v;
    } catch (_) { return null; }
  })();

  var DEVICE_TYPE = (function () {
    try {
      var ua = (navigator.userAgent || "").toLowerCase();
      var w = (window.innerWidth || document.documentElement.clientWidth || 1024);
      if (/ipad|tablet|playbook|silk/.test(ua) || (w >= 600 && w <= 1024 && /mobi|android/.test(ua))) return "tablet";
      if (/mobi|android|iphone|ipod/.test(ua) || w < 600) return "mobile";
      return "desktop";
    } catch (_) { return "desktop"; }
  })();

  var state = { widget: null, business: null, proofs: [], idx: 0, root: null, impressions: 0, variant: null };

  function baseCfg() { return (state.widget && state.widget.config) || {}; }
  function cfg() {
    var base = baseCfg();
    if (state.variant === "B" && base && base.variant_b && typeof base.variant_b === "object") {
      return Object.assign({}, base, base.variant_b);
    }
    return base;
  }

  // Deterministic 0-99 bucket from visitor id (FNV-1a-ish hash, no deps).
  function hashBucket(s) {
    if (!s) return Math.floor(Math.random() * 100);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h % 100;
  }

  function resolveVariant() {
    var c = baseCfg();
    if (!c || !c.ab_enabled) { state.variant = null; return; }
    var split = Number(c.ab_split);
    if (!isFinite(split) || split <= 0) split = 50;
    if (split > 100) split = 100;
    var widgetId = (state.widget && state.widget.id) || "w";
    var bucket = hashBucket((VISITOR || "anon") + ":" + widgetId);
    state.variant = bucket < split ? "B" : "A";
  }

  function track(evt, proofId) {
    return trackWithMeta(evt, proofId, null);
  }

  function trackWithMeta(evt, proofId, meta) {
    try {
      fetch(FN + "/widget-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: BUSINESS,
          widget_id: state.widget && state.widget.id,
          proof_object_id: proofId || null,
          event_type: evt,
          visitor_id: VISITOR,
          page_url: location.href,
          variant: state.variant,
          meta: meta || {},
          session_id: SESSION,
          device_type: DEVICE_TYPE,
          visitor_type: VISITOR_TYPE,
        }),
        keepalive: true,
      });
    } catch (_) {}
  }

  // Public API for host pages: window.notiproof.track('conversion', { value, currency })
  try {
    window.notiproof = window.notiproof || {};
    window.notiproof.track = function (type, meta) {
      if (type !== "conversion" && type !== "interaction" && type !== "impression") return;
      trackWithMeta(type, null, meta || {});
    };
  } catch (_) {}

  // Auto-bind clicks on [data-notiproof-conversion] elements.
  function bindConversionElements() {
    try {
      document.addEventListener("click", function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var el = t.closest("[data-notiproof-conversion]");
        if (!el) return;
        var meta = {};
        var v = el.getAttribute("data-notiproof-value");
        var cur = el.getAttribute("data-notiproof-currency");
        if (v) meta.value = Number(v) || v;
        if (cur) meta.currency = cur;
        trackWithMeta("conversion", null, meta);
      }, true);
    } catch (_) {}
  }

  function fetchData() {
    var q = "?business=" + encodeURIComponent(BUSINESS) +
      (WIDGET ? "&widget=" + encodeURIComponent(WIDGET) : "") +
      "&domain=" + encodeURIComponent(location.hostname) +
      "&limit=20";
    return fetch(FN + "/widget-render" + q).then(function (r) { return r.json(); });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function isVideoProof(p) {
    if (!p) return false;
    if (p.type && /video/i.test(p.type)) return true;
    var u = (p.media_url || "").toLowerCase().split("?")[0];
    return /\.(webm|mp4|mov|m4v)$/.test(u);
  }

  function positionClass() {
    var pos = (cfg().position || "bottom-left");
    return "np-pos-" + pos;
  }

  function injectStyles() {
    if (document.getElementById("np-style")) return;
    var css = '' +
      '.np-root{position:fixed;z-index:2147483600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-pop{max-width:420px}' +
      '.np-pos-bottom-left{left:20px;bottom:20px}' +
      '.np-pos-bottom-right{right:20px;bottom:20px}' +
      '.np-pos-top-left{left:20px;top:20px}' +
      '.np-pos-top-right{right:20px;top:20px}' +
      '.np-banner{left:0;right:0;top:0;max-width:none}' +
      '.np-card{background:#fff;color:#0f172a;border:1px solid rgba(15,23,42,.06);border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18);padding:14px;display:flex;gap:12px;align-items:stretch;cursor:pointer;position:relative;transition:transform .25s ease, opacity .25s ease;opacity:0;transform:translateY(8px);width:420px;max-width:calc(100vw - 24px);box-sizing:border-box}' +
      '.np-card.np-in{opacity:1;transform:translateY(0)}' +
      '.np-media{align-self:stretch;aspect-ratio:1/1;min-height:96px;max-height:140px;border-radius:10px;flex-shrink:0;background:#eef2f7;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center}' +
      '.np-media img,.np-media video{width:100%;height:100%;object-fit:cover;display:block}' +
      '.np-initial{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:28px}' +
      '.np-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.28);pointer-events:none}' +
      '.np-play-btn{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}' +
      '.np-body{flex:1;min-width:0;line-height:1.4;display:flex;flex-direction:column}' +
      '.np-stars{display:inline-flex;gap:1px;flex-shrink:0;margin-bottom:4px}' +
      '.np-text{font-size:13.5px;color:#334155;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +
      '.np-mark{background:transparent;font-weight:600;color:#0f172a}' +
      '.np-attribution{font-size:11px;color:#64748b;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.np-footer{margin-top:auto;padding-top:4px;text-align:right}' +
      '.np-footer a{font-size:9px;color:#cbd5e1;text-decoration:none;font-weight:400}' +
      '.np-footer a:hover{color:#94a3b8}' +
      '.np-close{position:absolute;top:4px;right:4px;width:24px;height:24px;background:none;border:0;font-size:18px;color:#94a3b8;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;border-radius:6px}' +
      '.np-close:hover{background:rgba(15,23,42,.06);color:#475569}' +
      '.np-banner .np-card{border-radius:0;justify-content:center;text-align:center;max-width:none;width:auto}' +
      '.np-inline-host{display:block;margin:8px 0}' +
      '.np-badge{position:fixed;left:16px;bottom:16px;background:#0f172a;color:#fff;font-size:12px;padding:6px 10px;border-radius:999px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:2147483600}' +
      // Mobile (≤480px): edge-to-edge popup with 8px gutters. !important defeats host-page CSS resets.
      '@media (max-width:480px){' +
        '.np-card{width:auto !important;max-width:calc(100vw - 16px) !important;padding:10px !important;gap:10px !important;border-radius:12px !important;box-sizing:border-box !important}' +
        '.np-pop.np-pos-bottom-left,.np-pop.np-pos-bottom-right{left:8px !important;right:8px !important;bottom:8px !important;top:auto !important;max-width:none !important}' +
        '.np-pop.np-pos-top-left,.np-pop.np-pos-top-right{left:8px !important;right:8px !important;top:8px !important;bottom:auto !important;max-width:none !important}' +
        '.np-media{min-height:72px !important;max-height:96px !important}' +
        '.np-text{font-size:12.5px !important;-webkit-line-clamp:3}' +
        '.np-attribution{font-size:10.5px !important}' +
        '.np-footer a{font-size:8px !important}' +
      '}' +
      // Lightbox
      '.np-lightbox{position:fixed;inset:0;background:rgba(8,11,20,.88);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity .18s ease-out;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-lightbox.np-lb-in{opacity:1}' +
      '.np-lb-frame{position:relative;width:min(880px,94vw);max-height:90vh;background:#fff;color:#0f172a;border-radius:18px;overflow:hidden;display:grid;grid-template-columns:1.1fr 1fr;transform:scale(.96);transition:transform .18s ease-out;box-shadow:0 30px 80px rgba(0,0,0,.5)}' +
      '.np-lightbox.np-lb-in .np-lb-frame{transform:scale(1)}' +
      '@media (max-width:720px){.np-lb-frame{grid-template-columns:1fr;max-height:92vh;overflow-y:auto}}' +
      '.np-lb-media{background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:280px;position:relative}' +
      '.np-lb-media video{width:100%;height:100%;max-height:90vh;object-fit:cover;display:block}' +
      '.np-lb-media img.np-lb-photo{width:100%;height:100%;max-height:90vh;object-fit:cover}' +
      '.np-lb-info{padding:28px 28px 24px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;max-height:90vh}' +
      '.np-lb-quote{font-size:18px;line-height:1.55;color:#0f172a;font-weight:500}' +
      '.np-lb-quote::before{content:"\\201C";font-size:48px;color:#cbd5e1;line-height:0;vertical-align:-12px;margin-right:4px;font-family:Georgia,serif}' +
      '.np-lb-attribution{display:flex;align-items:center;gap:12px;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:auto}' +
      '.np-lb-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#e2e8f0}' +
      '.np-lb-avatar-fallback{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px;flex-shrink:0}' +
      '.np-lb-who{min-width:0;flex:1}' +
      '.np-lb-name{font-weight:700;color:#0f172a;font-size:15px}' +
      '.np-lb-role{font-size:13px;color:#475569;margin-top:1px}' +
      '.np-lb-role a{color:#475569;text-decoration:none}.np-lb-role a:hover{text-decoration:underline}' +
      '.np-lb-company-logo{height:28px;max-width:90px;object-fit:contain;flex-shrink:0;margin-left:auto;opacity:.85}' +
      '.np-lb-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
      '.np-lb-verified{font-size:11px;color:#16a34a;background:#dcfce7;padding:3px 9px;border-radius:999px;font-weight:600;display:inline-flex;align-items:center;gap:4px}' +
      '.np-lb-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;transition:transform .12s ease, box-shadow .12s ease;margin-top:4px}' +
      '.np-lb-cta:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(15,23,42,.25)}' +
      '.np-lightbox-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.92);color:#0f172a;border:0;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.4);transition:transform .15s ease;z-index:2}' +
      '.np-lightbox-close:hover{transform:scale(1.06)}' +
      '.np-lightbox-close:focus-visible{outline:3px solid #6366f1;outline-offset:2px}' +
      // ----- Embedded variants (carousel / marquee / masonry / avatar row) -----
      '.np-mini{background:#fff;color:#0f172a;border:1px solid rgba(15,23,42,.06);border-radius:14px;box-shadow:0 8px 24px rgba(15,23,42,.10);padding:14px;display:flex;flex-direction:column;gap:8px;cursor:pointer;break-inside:avoid;box-sizing:border-box}' +
      '.np-mini .np-text{font-size:13px;color:#334155;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}' +
      '.np-mini-foot{display:flex;align-items:center;gap:8px;margin-top:4px}' +
      '.np-mini-avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#e2e8f0}' +
      '.np-mini-initial{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;flex-shrink:0}' +
      '.np-mini-attr{font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}' +
      // Carousel
      '.np-carousel{width:100%;display:flex;flex-direction:column;gap:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-car-track{display:flex;gap:12px;align-items:stretch}' +
      '.np-car-track > .np-mini{flex:1;min-width:0}' +
      '.np-car-nav{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
      '.np-car-btn{width:32px;height:32px;border-radius:50%;background:#fff;border:1px solid #e2e8f0;color:#475569;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;padding:0}' +
      '.np-car-btn:hover{background:#f8fafc}' +
      '.np-car-dots{display:flex;gap:6px}' +
      '.np-car-dot{width:6px;height:6px;border-radius:50%;background:#cbd5e1;transition:background .2s}' +
      '.np-car-dot.np-active{background:#6366f1}' +
      // Marquee
      '.np-marquee{width:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 40px,#000 calc(100% - 40px),transparent 100%);mask-image:linear-gradient(to right,transparent 0,#000 40px,#000 calc(100% - 40px),transparent 100%)}' +
      '.np-marquee-track{display:flex;gap:12px;width:max-content;animation:np-marq linear infinite}' +
      '.np-marquee:hover .np-marquee-track{animation-play-state:paused}' +
      '.np-marquee .np-mini{width:280px;flex-shrink:0}' +
      '@keyframes np-marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
      '@keyframes np-marq-r{from{transform:translateX(-50%)}to{transform:translateX(0)}}' +
      // Masonry
      '.np-masonry{width:100%;column-gap:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-masonry .np-mini{display:inline-flex;width:100%;margin:0 0 12px}' +
      '@media (max-width:480px){.np-masonry{column-count:1 !important}}' +
      // Avatar row
      '.np-avrow{display:inline-flex;align-items:center;gap:12px;background:#fff;border:1px solid #e2e8f0;border-radius:999px;padding:8px 16px;box-shadow:0 1px 3px rgba(0,0,0,.04);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-avrow-stack{display:flex}' +
      '.np-avrow-stack > *{width:28px;height:28px;border-radius:50%;border:2px solid #fff;object-fit:cover;margin-left:-8px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px;box-sizing:border-box}' +
      '.np-avrow-stack > *:first-child{margin-left:0}' +
      '.np-avrow-info{display:flex;flex-direction:column;line-height:1.2}' +
      '.np-avrow-rating{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#0f172a}' +
      '.np-avrow-count{font-size:11px;color:#475569}' +
      // Video hero
      '.np-vhero{width:100%;max-width:640px;display:flex;flex-direction:column;gap:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-vhero-frame{position:relative;width:100%;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#0f172a;box-shadow:0 12px 32px rgba(15,23,42,.18);cursor:pointer}' +
      '.np-vhero-frame img,.np-vhero-frame video{width:100%;height:100%;object-fit:cover;display:block}' +
      '.np-vhero-body{display:flex;flex-direction:column;gap:6px}' +
      '.np-vhero-quote{font-size:15px;line-height:1.45;color:#1e293b}' +
      '.np-vhero-attr{font-size:12px;color:#64748b}' +
      // Logo strip
      '.np-logos{width:100%;max-width:720px;display:flex;flex-direction:column;gap:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-logos-eyebrow{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;text-align:center}' +
      '.np-logos-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:16px 32px;padding:8px 0}' +
      '.np-logos-row img{height:32px;width:auto;object-fit:contain}' +
      '.np-logos-row .np-logo-name{font-size:15px;font-weight:600;color:#475569;letter-spacing:-.01em}' +
      '.np-logos.np-gray .np-logos-row img{filter:grayscale(100%);opacity:.7;transition:filter .2s,opacity .2s}' +
      '.np-logos.np-gray .np-logos-row img:hover{filter:grayscale(0);opacity:1}';
    var el = document.createElement("style");
    el.id = "np-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function starSvg(filled) {
    var color = filled ? "#F5B400" : "#E5E7EB";
    return '<svg width="12" height="12" viewBox="0 0 20 20" fill="' + color + '" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.5l2.7 5.47 6.04.88-4.37 4.26 1.03 6.01L10 15.27l-5.4 2.85 1.03-6.01L1.26 7.85l6.04-.88L10 1.5z"/></svg>';
  }

  function renderStars(rating, size) {
    var sz = size || 14;
    var r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    var html = '';
    for (var i = 1; i <= 5; i++) {
      var color = i <= r ? "#F5B400" : "#E5E7EB";
      html += '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 20 20" fill="' + color + '" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.5l2.7 5.47 6.04.88-4.37 4.26 1.03 6.01L10 15.27l-5.4 2.85 1.03-6.01L1.26 7.85l6.04-.88L10 1.5z"/></svg>';
    }
    return '<div class="np-stars" aria-label="' + r + ' out of 5 stars">' + html + '</div>';
  }

  function buildAttribution(p) {
    var name = (p.author_name || '').trim();
    var role = (p.author_role || '').trim();
    var company = (p.author_company || '').trim();
    if (!name) return '';
    if (role && company) return name + ' \u00b7 ' + role + ', ' + company;
    if (role) return name + ' \u00b7 ' + role;
    if (company) return name + ' \u00b7 ' + company;
    return name;
  }

  function renderQuote(text, highlight) {
    var trimmed = text.length > 140 ? text.slice(0, 140) + '\u2026' : text;
    if (!highlight || !String(highlight).trim()) return escapeHtml(trimmed);
    var h = String(highlight);
    var idx = trimmed.toLowerCase().indexOf(h.toLowerCase());
    if (idx < 0) return escapeHtml(trimmed);
    return escapeHtml(trimmed.slice(0, idx)) +
      '<mark class="np-mark">' + escapeHtml(trimmed.slice(idx, idx + h.length)) + '</mark>' +
      escapeHtml(trimmed.slice(idx + h.length));
  }

  function renderMedia(proof) {
    var c = cfg();
    if (c.show_avatar === false) return '';
    var brand = c.brand_color || "#6366f1";
    var playOverlay = '<div class="np-play"><div class="np-play-btn" style="box-shadow:0 0 0 2px ' + escapeHtml(brand) + '55, 0 2px 8px rgba(0,0,0,.3)">' +
      '<svg width="14" height="14" viewBox="0 0 10 10" fill="#0f172a"><path d="M2 1l7 4-7 4z"/></svg>' +
      '</div></div>';
    if (isVideoProof(proof) && proof.media_url) {
      // Prefer pre-generated poster (no runtime decoding required).
      if (proof.poster_url) {
        return '<div class="np-media"><img src="' + escapeHtml(proof.poster_url) + '" alt="">' + playOverlay + '</div>';
      }
      return '<div class="np-media" data-np-video="' + escapeHtml(proof.media_url) + '">' +
        '<video preload="metadata" muted playsinline crossorigin="anonymous" src="' + escapeHtml(proof.media_url) + '#t=0.1"></video>' +
        playOverlay +
        '</div>';
    }
    if (proof.author_avatar_url) {
      return '<div class="np-media"><img src="' + escapeHtml(proof.author_avatar_url) + '" alt=""></div>';
    }
    var initial = (proof.author_name || "?").trim().charAt(0).toUpperCase();
    return '<div class="np-media"><div class="np-initial" style="background:' + escapeHtml(brand) + '">' + escapeHtml(initial) + '</div></div>';
  }

  function enhanceVideoThumb(scope) {
    var media = scope && scope.querySelector ? scope.querySelector('.np-media[data-np-video]') : null;
    if (!media) return;
    var video = media.querySelector('video');
    if (!video) return;
    var captured = false;
    var seekTimes = [1.5, 3, 5];
    var attempt = 0;

    function isMostlyDark(ctx, w, h) {
      try {
        var dark = 0;
        var samples = 100;
        for (var i = 0; i < samples; i++) {
          var x = Math.floor(Math.random() * w);
          var y = Math.floor(Math.random() * h);
          var px = ctx.getImageData(x, y, 1, 1).data;
          var lum = 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2];
          if (lum < 30) dark++;
        }
        return dark / samples > 0.95;
      } catch (_) { return false; }
    }

    function capture() {
      if (captured) return;
      try {
        var w = video.videoWidth, h = video.videoHeight;
        if (!w || !h) return;
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        if (isMostlyDark(ctx, w, h) && attempt < seekTimes.length - 1) {
          attempt++;
          try { video.currentTime = seekTimes[attempt]; } catch (_) {}
          return;
        }
        var url = canvas.toDataURL('image/jpeg', 0.82);
        var img = document.createElement('img');
        img.alt = '';
        img.src = url;
        video.replaceWith(img);
        captured = true;
      } catch (_) { /* tainted canvas — keep video frame as-is */ }
    }
    video.addEventListener('loadeddata', function () {
      try { video.currentTime = seekTimes[0]; } catch (_) {}
      setTimeout(capture, 60);
    });
    video.addEventListener('seeked', capture);
  }

  function renderCard(proof) {
    var c = cfg();
    var media = renderMedia(proof);
    var stars = (c.show_rating !== false && proof.rating) ? renderStars(proof.rating, 14) : '';
    var rawText = proof.content ? String(proof.content) : '';
    var text = rawText
      ? '<div class="np-text">' + renderQuote(rawText, proof.highlight_phrase) + '</div>'
      : '';
    var attrText = buildAttribution(proof);
    var attribution = attrText ? '<div class="np-attribution">' + escapeHtml(attrText) + '</div>' : '';
    var footer = (c.powered_by !== false && state.impressions >= 1)
      ? '<div class="np-footer"><a href="https://notiproof.com" target="_blank" rel="noopener">powered by NotiProof</a></div>'
      : '';
    return '<div class="np-card" data-proof="' + escapeHtml(proof.id) + '">' +
      '<button class="np-close" aria-label="Close">×</button>' +
      media +
      '<div class="np-body">' + stars + text + attribution + footer + '</div>' +
      '</div>';
  }

  function safeUrl(u) {
    if (!u || typeof u !== 'string') return null;
    if (!/^https?:\/\//i.test(u)) return null;
    return u;
  }

  function openLightbox(proof) {
    var c = cfg();
    var brand = c.brand_color || '#6366f1';
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var lb = document.createElement('div');
    lb.className = 'np-lightbox';

    var stars = (c.show_rating !== false && proof.rating) ? renderStars(proof.rating) : '';
    var verified = proof.source === 'testimonial_request'
      ? '<span class="np-lb-verified">✓ Verified</span>' : '';

    var mediaHtml = '';
    if (isVideoProof(proof) && proof.media_url) {
      mediaHtml = '<video controls autoplay playsinline src="' + escapeHtml(proof.media_url) + '"></video>';
    } else if (proof.author_photo_url) {
      mediaHtml = '<img class="np-lb-photo" src="' + escapeHtml(proof.author_photo_url) + '" alt="">';
    } else if (proof.author_avatar_url) {
      mediaHtml = '<img class="np-lb-photo" src="' + escapeHtml(proof.author_avatar_url) + '" alt="">';
    } else {
      var initial = (proof.author_name || '?').trim().charAt(0).toUpperCase();
      mediaHtml = '<div style="width:100%;height:100%;min-height:280px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:96px;font-weight:700;background:' + escapeHtml(brand) + '">' + escapeHtml(initial) + '</div>';
    }

    var avatarSrc = proof.author_photo_url || proof.author_avatar_url;
    var avatarHtml = avatarSrc
      ? '<img class="np-lb-avatar" src="' + escapeHtml(avatarSrc) + '" alt="">'
      : '<div class="np-lb-avatar-fallback" style="background:' + escapeHtml(brand) + '">' +
          escapeHtml((proof.author_name || '?').trim().charAt(0).toUpperCase()) + '</div>';

    var roleParts = [];
    if (proof.author_role) roleParts.push(escapeHtml(proof.author_role));
    if (proof.author_company) {
      var siteUrl = safeUrl(proof.author_website_url);
      roleParts.push(siteUrl
        ? '<a href="' + escapeHtml(siteUrl) + '" target="_blank" rel="noopener">' + escapeHtml(proof.author_company) + '</a>'
        : escapeHtml(proof.author_company));
    }
    var roleHtml = roleParts.length ? '<div class="np-lb-role">' + roleParts.join(' · ') + '</div>' : '';

    var companyLogo = proof.author_company_logo_url
      ? '<img class="np-lb-company-logo" src="' + escapeHtml(proof.author_company_logo_url) + '" alt="">'
      : '';

    var ctaUrl = safeUrl(proof.cta_url) || safeUrl(c.default_cta_url) || safeUrl(state.business && state.business.website_url);
    var ctaLabel = (proof.cta_label && proof.cta_label.trim())
      || (c.default_cta_label && String(c.default_cta_label).trim())
      || 'Visit website';
    var ctaHtml = ctaUrl
      ? '<a class="np-lb-cta" href="' + escapeHtml(ctaUrl) + '" target="_blank" rel="noopener" data-np-cta="1" style="background:' + escapeHtml(brand) + '">' +
          escapeHtml(ctaLabel) +
          ' <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 10h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</a>'
      : '';

    var quoteText = proof.content ? escapeHtml(String(proof.content)) : '';
    var quote = quoteText ? '<div class="np-lb-quote">' + quoteText + '</div>' : '';

    lb.innerHTML =
      '<div class="np-lb-frame" role="dialog" aria-modal="true">' +
        '<button class="np-lightbox-close" aria-label="Close">×</button>' +
        '<div class="np-lb-media">' + mediaHtml + '</div>' +
        '<div class="np-lb-info">' +
          (stars || verified ? '<div class="np-lb-meta">' + stars + verified + '</div>' : '') +
          quote +
          ctaHtml +
          '<div class="np-lb-attribution">' +
            avatarHtml +
            '<div class="np-lb-who">' +
              (proof.author_name ? '<div class="np-lb-name">' + escapeHtml(proof.author_name) + '</div>' : '') +
              roleHtml +
            '</div>' +
            companyLogo +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(lb);
    requestAnimationFrame(function () { lb.classList.add('np-lb-in'); });
    var btn = lb.querySelector('.np-lightbox-close');
    if (btn) try { btn.focus(); } catch (_) {}
    track('interaction', proof.id);

    function close() {
      lb.classList.remove('np-lb-in');
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { if (lb.parentNode) lb.parentNode.removeChild(lb); }, 180);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    lb.addEventListener('click', function (e) {
      var t = e.target;
      if (t === lb || (t.classList && t.classList.contains('np-lightbox-close'))) close();
      if (t && t.closest && t.closest('[data-np-cta]')) {
        track('conversion', proof.id);
      }
    });
  }

  function bindCard(card, proof, host) {
    requestAnimationFrame(function () { card.classList.add("np-in"); });
    state.impressions++;
    track("impression", proof.id);
    enhanceVideoThumb(card);
    card.addEventListener("click", function (e) {
      if (e.target && e.target.classList && e.target.classList.contains("np-close")) {
        card.classList.remove("np-in");
        if (host) host.innerHTML = "";
        return;
      }
      // Open the rich lightbox for every proof (video, photo, or text).
      openLightbox(proof);
    });
  }

  // --- Pacing helpers (cooldown + frequency cap) ---
  function dayKey() {
    var d = new Date();
    return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

  function canShow() {
    var c = cfg();
    var wid = (state.widget && state.widget.id) || 'w';
    // Visitor-type targeting (spec WID-02 Display Rules: all / new / returning).
    var vt = c.visitor_type;
    if (vt === 'new' && VISITOR_TYPE !== 'new') return false;
    if (vt === 'returning' && VISITOR_TYPE !== 'returning') return false;
    // Cooldown between consecutive shows for this visitor.
    var cooldownSec = Number(c.cooldown_seconds);
    if (cooldownSec > 0) {
      var last = Number(lsGet('np_last_' + wid)) || 0;
      if (Date.now() - last < cooldownSec * 1000) return false;
    }
    // Daily frequency cap per visitor.
    var cap = Number(c.frequency_cap);
    if (cap > 0) {
      var k = 'np_count_' + wid + '_' + dayKey();
      var n = Number(lsGet(k)) || 0;
      if (n >= cap) return false;
    }
    return true;
  }

  function recordShow() {
    var wid = (state.widget && state.widget.id) || 'w';
    lsSet('np_last_' + wid, String(Date.now()));
    var c = cfg();
    if (Number(c.frequency_cap) > 0) {
      var k = 'np_count_' + wid + '_' + dayKey();
      var n = Number(lsGet(k)) || 0;
      lsSet(k, String(n + 1));
    }
  }

  function mountRotating(className, defaultIntervalMs) {
    var host = document.createElement("div");
    var posCls = className === 'np-pop' ? positionClass() : '';
    host.className = "np-root " + className + (posCls ? ' ' + posCls : '');
    document.body.appendChild(host);
    state.root = host;
    var interval = (cfg().interval_seconds && Number(cfg().interval_seconds) > 0)
      ? Number(cfg().interval_seconds) * 1000
      : defaultIntervalMs;
    function tick() {
      if (!state.proofs.length) return;
      if (!canShow()) { host.innerHTML = ''; return; }
      var p = state.proofs[state.idx % state.proofs.length];
      state.idx++;
      host.innerHTML = renderCard(p);
      bindCard(host.querySelector(".np-card"), p, host);
      recordShow();
    }
    tick();
    setInterval(tick, interval);
  }

  function mountBadge() {
    var b = document.createElement("div");
    b.className = "np-badge";
    b.textContent = state.proofs.length + " recent " + (state.proofs.length === 1 ? "review" : "reviews");
    document.body.appendChild(b);
    state.root = b;
    state.impressions++;
    track("impression", null);
    b.addEventListener("click", function () {
      track("interaction", null);
      mountRotating("np-pop", 8000);
    });
  }

  function mountInline() {
    var hosts = document.querySelectorAll("[data-notiproof-inline]");
    if (!hosts.length) return;
    hosts.forEach(function (h) {
      h.classList.add("np-inline-host");
      var p = state.proofs[0];
      if (!p) return;
      h.innerHTML = renderCard(p);
      bindCard(h.querySelector(".np-card"), p, h);
    });
  }

  /* ---------------- Embedded variants ---------------- */

  function inlineHosts() {
    // Match either by widget id, or fall back to any inline host if the script was loaded for one widget.
    var byWidget = document.querySelectorAll('[data-notiproof-inline][data-widget="' + (state.widget && state.widget.id) + '"]');
    if (byWidget.length) return byWidget;
    return document.querySelectorAll('[data-notiproof-inline]:not([data-widget])');
  }

  function renderMini(proof) {
    var c = cfg();
    var brand = c.brand_color || "#6366f1";
    var stars = (c.show_rating !== false && proof.rating) ? renderStars(proof.rating, 13) : '';
    var rawText = proof.content ? String(proof.content) : '';
    var text = rawText
      ? '<div class="np-text">' + renderQuote(rawText, proof.highlight_phrase) + '</div>'
      : '';
    var photo = proof.author_photo_url || proof.author_avatar_url;
    var initial = (proof.author_name || '?').trim().charAt(0).toUpperCase();
    var avatar = photo
      ? '<img class="np-mini-avatar" src="' + escapeHtml(photo) + '" alt="">'
      : (c.show_avatar === false ? '' : '<div class="np-mini-initial" style="background:' + escapeHtml(brand) + '">' + escapeHtml(initial) + '</div>');
    var attrText = buildAttribution(proof);
    var attr = attrText ? '<div class="np-mini-attr">' + escapeHtml(attrText) + '</div>' : '';
    var foot = (avatar || attr) ? '<div class="np-mini-foot">' + avatar + attr + '</div>' : '';
    return '<div class="np-mini" data-proof="' + escapeHtml(proof.id) + '">' + stars + text + foot + '</div>';
  }

  function bindMini(el, proof) {
    if (!el) return;
    state.impressions++;
    track('impression', proof.id);
    el.addEventListener('click', function () { openLightbox(proof); });
  }

  function mountCarousel() {
    var hosts = inlineHosts();
    if (!hosts.length || !state.proofs.length) return;
    var c = cfg();
    var visible = Math.max(1, Math.min(3, Number(c.card_count) || 1));
    var autoplay = c.autoplay !== false;
    var intervalMs = (Number(c.interval_seconds) > 0 ? Number(c.interval_seconds) : 5) * 1000;
    var brand = c.brand_color || "#6366f1";

    hosts.forEach(function (h) {
      h.classList.add('np-inline-host');
      var idx = 0;
      h.innerHTML =
        '<div class="np-carousel">' +
          '<div class="np-car-track"></div>' +
          '<div class="np-car-nav">' +
            '<button type="button" class="np-car-btn" data-np-prev aria-label="Previous">&#8249;</button>' +
            '<div class="np-car-dots"></div>' +
            '<button type="button" class="np-car-btn" data-np-next aria-label="Next">&#8250;</button>' +
          '</div>' +
        '</div>';
      var track = h.querySelector('.np-car-track');
      var dotsEl = h.querySelector('.np-car-dots');

      function render() {
        var slice = [];
        for (var i = 0; i < visible; i++) slice.push(state.proofs[(idx + i) % state.proofs.length]);
        track.innerHTML = slice.map(renderMini).join('');
        slice.forEach(function (p, i) {
          var el = track.children[i];
          bindMini(el, p);
        });
        dotsEl.innerHTML = state.proofs.map(function (_, i) {
          return '<span class="np-car-dot' + (i === idx ? ' np-active' : '') + '" style="' + (i === idx ? 'background:' + brand : '') + '"></span>';
        }).join('');
      }

      h.querySelector('[data-np-prev]').addEventListener('click', function () {
        idx = (idx - 1 + state.proofs.length) % state.proofs.length; render();
      });
      h.querySelector('[data-np-next]').addEventListener('click', function () {
        idx = (idx + 1) % state.proofs.length; render();
      });
      render();

      if (autoplay && state.proofs.length > visible) {
        var timer = setInterval(function () { idx = (idx + 1) % state.proofs.length; render(); }, intervalMs);
        h.addEventListener('mouseenter', function () { clearInterval(timer); });
      }
    });
  }

  function mountMarquee() {
    var hosts = inlineHosts();
    if (!hosts.length || !state.proofs.length) return;
    var c = cfg();
    var dir = c.direction === 'right' ? 'np-marq-r' : 'np-marq';
    var speedMap = { slow: 60, normal: 35, fast: 20 };
    var dur = speedMap[c.speed] || speedMap.normal;

    hosts.forEach(function (h) {
      h.classList.add('np-inline-host');
      // Duplicate the list for a seamless loop.
      var rendered = state.proofs.map(renderMini).join('');
      h.innerHTML =
        '<div class="np-marquee">' +
          '<div class="np-marquee-track" style="animation-name:' + dir + ';animation-duration:' + dur + 's">' +
            rendered + rendered +
          '</div>' +
        '</div>';
      var els = h.querySelectorAll('.np-mini');
      // Bind only the first half (originals) to avoid double impressions.
      for (var i = 0; i < state.proofs.length && i < els.length; i++) {
        bindMini(els[i], state.proofs[i]);
      }
    });
  }

  function mountMasonry() {
    var hosts = inlineHosts();
    if (!hosts.length || !state.proofs.length) return;
    var c = cfg();
    var cols = Math.max(2, Math.min(4, Number(c.columns) || 3));

    hosts.forEach(function (h) {
      h.classList.add('np-inline-host');
      h.innerHTML = '<div class="np-masonry" style="column-count:' + cols + '">' +
        state.proofs.map(renderMini).join('') +
      '</div>';
      var els = h.querySelectorAll('.np-mini');
      state.proofs.forEach(function (p, i) { if (els[i]) bindMini(els[i], p); });
    });
  }

  function mountAvatarRow() {
    var hosts = inlineHosts();
    if (!hosts.length || !state.proofs.length) return;
    var c = cfg();
    var brand = c.brand_color || "#6366f1";
    var avatars = state.proofs.slice(0, 5);
    var ratings = state.proofs.filter(function (p) { return p.rating; }).map(function (p) { return Number(p.rating); });
    var avg = ratings.length ? Math.round((ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length) * 10) / 10 : 0;
    var total = state.proofs.length;

    var stack = avatars.map(function (p) {
      var photo = p.author_photo_url || p.author_avatar_url;
      if (photo) return '<img src="' + escapeHtml(photo) + '" alt="">';
      var initial = (p.author_name || '?').trim().charAt(0).toUpperCase();
      return '<div style="background:' + escapeHtml(brand) + '">' + escapeHtml(initial) + '</div>';
    }).join('');

    var ratingHtml = avg > 0
      ? '<div class="np-avrow-rating">' +
          '<svg width="14" height="14" viewBox="0 0 20 20" fill="#F5B400"><path d="M10 1.5l2.7 5.47 6.04.88-4.37 4.26 1.03 6.01L10 15.27l-5.4 2.85 1.03-6.01L1.26 7.85l6.04-.88L10 1.5z"/></svg>' +
          '<span>' + avg.toFixed(1) + '</span><span style="font-weight:400;color:#64748b">/ 5</span>' +
        '</div>'
      : '';

    hosts.forEach(function (h) {
      h.classList.add('np-inline-host');
      h.innerHTML =
        '<div class="np-avrow">' +
          '<div class="np-avrow-stack">' + stack + '</div>' +
          '<div class="np-avrow-info">' +
            ratingHtml +
            '<div class="np-avrow-count">Loved by <strong style="color:#0f172a">' + total + '</strong> customer' + (total === 1 ? '' : 's') + '</div>' +
          '</div>' +
        '</div>';
      state.impressions++;
      track('impression', null);
      h.querySelector('.np-avrow').addEventListener('click', function () {
        if (state.proofs[0]) openLightbox(state.proofs[0]);
      });
    });
  }

  function mountVideoHero() {
    var hosts = inlineHosts();
    if (!hosts.length || !state.proofs.length) return;
    var c = cfg();
    var brand = c.brand_color || '#6366f1';
    // Pick first video proof; fallback to first proof.
    var featured = null;
    for (var i = 0; i < state.proofs.length; i++) {
      var p = state.proofs[i];
      var u = (p.media_url || '').toLowerCase().split('?')[0];
      var isVid = (p.type && /video/i.test(p.type)) || /\.(webm|mp4|mov|m4v)$/.test(u);
      if (isVid) { featured = p; break; }
    }
    if (!featured) featured = state.proofs[0];

    var text = featured.content || '';
    var trimmed = text.length > 220 ? text.slice(0, 220) + '…' : text;
    var attribution = buildAttribution(featured);
    var showStars = c.show_rating !== false && featured.rating;
    var starsHtml = showStars ? renderStars(featured.rating) : '';

    var mediaHtml;
    var poster = featured.poster_url;
    var url = (featured.media_url || '').toLowerCase().split('?')[0];
    var isVid = (featured.type && /video/i.test(featured.type)) || /\.(webm|mp4|mov|m4v)$/.test(url);
    var playBtn = '<div class="np-play"><div class="np-play-btn" style="box-shadow:0 0 0 2px ' + escapeHtml(brand) + '55, 0 2px 8px rgba(0,0,0,.3)"><svg width="14" height="14" viewBox="0 0 10 10" fill="#0f172a"><path d="M2 1l7 4-7 4z"/></svg></div></div>';
    if (isVid && poster) {
      mediaHtml = '<img src="' + escapeHtml(poster) + '" alt="">' + playBtn;
    } else if (isVid && featured.media_url) {
      mediaHtml = '<video preload="metadata" muted playsinline crossorigin="anonymous" src="' + escapeHtml(featured.media_url) + '#t=1.5"></video>' + playBtn;
    } else if (featured.author_photo_url || featured.author_avatar_url) {
      mediaHtml = '<img src="' + escapeHtml(featured.author_photo_url || featured.author_avatar_url) + '" alt="">' + playBtn;
    } else {
      var initial = (featured.author_name || '?').trim().charAt(0).toUpperCase();
      mediaHtml = '<div class="np-initial" style="background:' + escapeHtml(brand) + ';font-size:64px">' + escapeHtml(initial) + '</div>';
    }

    hosts.forEach(function (h) {
      h.classList.add('np-inline-host');
      h.innerHTML =
        '<div class="np-vhero">' +
          '<div class="np-vhero-frame" data-np-play>' + mediaHtml + '</div>' +
          '<div class="np-vhero-body">' +
            (starsHtml ? starsHtml : '') +
            '<div class="np-vhero-quote">' + renderQuote(trimmed, featured.highlight_phrase) + '</div>' +
            (attribution ? '<div class="np-vhero-attr">' + escapeHtml(attribution) + '</div>' : '') +
          '</div>' +
        '</div>';
      state.impressions++;
      track('impression', featured.id);
      h.querySelector('[data-np-play]').addEventListener('click', function () { openLightbox(featured); });
    });
  }

  function mountLogoStrip() {
    var hosts = inlineHosts();
    if (!hosts.length || !state.proofs.length) return;
    var c = cfg();
    var grayscale = c.logo_grayscale !== false;
    // Dedupe by company name; prefer entries with logo url.
    var map = {};
    for (var i = 0; i < state.proofs.length; i++) {
      var p = state.proofs[i];
      var name = (p.author_company || '').trim();
      if (!name) continue;
      var key = name.toLowerCase();
      var logo = p.author_company_logo_url || null;
      if (!map[key]) map[key] = { name: name, logo: logo };
      else if (!map[key].logo && logo) map[key].logo = logo;
    }
    var entries = [];
    for (var k in map) if (Object.prototype.hasOwnProperty.call(map, k)) entries.push(map[k]);
    entries = entries.slice(0, 8);
    if (!entries.length) return;

    var rowHtml = entries.map(function (e) {
      if (e.logo) return '<img src="' + escapeHtml(e.logo) + '" alt="' + escapeHtml(e.name) + '">';
      return '<span class="np-logo-name">' + escapeHtml(e.name) + '</span>';
    }).join('');

    hosts.forEach(function (h) {
      h.classList.add('np-inline-host');
      h.innerHTML =
        '<div class="np-logos' + (grayscale ? ' np-gray' : '') + '">' +
          '<div class="np-logos-eyebrow">Trusted by teams at</div>' +
          '<div class="np-logos-row">' + rowHtml + '</div>' +
        '</div>';
      state.impressions++;
      track('impression', null);
    });
  }

  function start(data) {
    state.widget = data && data.widget;
    state.business = (data && data.business) || null;
    state.proofs = (data && data.proofs) || [];
    if (!state.widget || !state.proofs.length) return;
    resolveVariant();
    bindConversionElements();
    injectStyles();
    var t = state.widget.type;
    // If variant B overrides type, honor it (only for embedded/variant types).
    var c = cfg();
    if (c && c.type) t = c.type;
    if (t === "popup") mountRotating("np-pop", 8000);
    else if (t === "banner") mountRotating("np-banner", 10000);
    else if (t === "wall") mountBadge();
    else if (t === "inline") mountInline();
    else if (t === "carousel") mountCarousel();
    else if (t === "marquee") mountMarquee();
    else if (t === "masonry") mountMasonry();
    else if (t === "avatar_row") mountAvatarRow();
    else if (t === "video_hero") mountVideoHero();
    else if (t === "logo_strip") mountLogoStrip();
    else mountRotating("np-pop", 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { fetchData().then(start).catch(function () {}); });
  } else {
    fetchData().then(start).catch(function () {});
  }
})();
