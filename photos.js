/* Knoxville Honkers and Bangers: photos.
 *
 * - Reads the band's photo folder on Google Drive (site-config.js) and uses those photos in the
 *   rotating photo spots (<figure class="rotator">), the Gallery's "From the photo folder" section,
 *   and next to each gig on Past Shows.
 * - Name a photo with the gig's date first, e.g. "2026-07-04 Freedom Thighs.jpg", and it is matched
 *   to that gig. Any other photo just joins the rotation.
 * - Until the folder is connected (or if Google can't be reached), the site rotates through the
 *   photos in the images/ folder listed in LOCAL below.
 * All names from Drive are inserted as text, never as HTML.
 */
(function () {
  'use strict';

  var CFG = window.KHB_CONFIG || {};
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Photos that live in this repository (used until the Drive folder is connected)
  var LOCAL = [
    { src: 'images/freedom-thighs-2026.jpg', name: '2026-07-04 Freedom Thighs' },
    { src: 'images/band-crew-2026.jpg', name: 'The crew, summer 2026' },
    { src: 'images/trombone-sousaphone.jpg', name: 'Trombone and sousaphone up front' },
    { src: 'images/camp-drumline.jpg', name: 'Drumline in the trees, Band Camp 2024' },
    { src: 'images/camp-trombones.jpg', name: 'Trombone section, Band Camp 2024' },
    { src: 'images/camp-sousaphone-woods.jpg', name: 'Sousaphone in the woods, Band Camp 2024' },
    { src: 'images/camp-accordion.jpg', name: 'Accordion jam, Band Camp 2024' },
    { src: 'images/camp-warming-up.jpg', name: 'Warming up, Band Camp 2024' },
    { src: 'images/camp-sax-trumpet.jpg', name: 'Sax and trumpet, Band Camp 2024' },
    { src: 'images/camp-on-the-hill.jpg', name: 'Playing on the hill, Band Camp 2024' }
  ];

  /* ---------- turning file names into captions ---------- */
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})[\s_\-]*(.*)$/;
  var CAMERA_RE = /^(img|dsc|dscn|pxl|image|photo|screenshot|mvimg|gopr)[\W_]*\d/i;

  function describe(name) {
    var base = String(name || '').replace(/\.[a-z0-9]{2,5}$/i, '');
    var m = base.match(DATE_RE), date = '', title = base;
    if (m) {
      date = m[1] + '-' + m[2] + '-' + m[3];
      title = m[4];
    }
    title = title.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (CAMERA_RE.test(title)) title = '';
    var caption = title;
    if (date) {
      var d = MON[+date.slice(5, 7) - 1] + ' ' + (+date.slice(8, 10)) + ', ' + date.slice(0, 4);
      caption = title ? title + ' · ' + d : d;
    }
    return { date: date, title: title, caption: caption };
  }

  function driveUrl(id, w) { return 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w' + w; }
  function driveFallback(id, w) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + w; }

  function fromLocal(p) { var d = describe(p.name); return { src: p.src, big: p.src, alt: d.title || 'The band', caption: d.caption, date: d.date }; }
  function fromDrive(f) {
    var d = describe(f.name);
    return { id: f.id, src: driveUrl(f.id, 1600), big: driveUrl(f.id, 2400), fallback: driveFallback(f.id, 1600),
             alt: d.title || 'The band', caption: d.caption, date: d.date };
  }

  // Swap to Drive's other image address if the first one fails
  function setSrc(img, photo) {
    img.onerror = photo.fallback ? function () { img.onerror = null; img.src = photo.fallback; } : null;
    img.src = photo.src;
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* ---------- rotating photo spots ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var timers = [];

  function startRotators(pool, swapNow) {
    timers.forEach(clearInterval); timers = [];
    var spots = Array.prototype.slice.call(document.querySelectorAll('figure.rotator'));
    if (!spots.length || pool.length < 2) return;
    var order = shuffle(pool);
    spots.forEach(function (fig, n) {
      var img = fig.querySelector('img'), cap = fig.querySelector('figcaption');
      if (!img) return;
      // Each spot starts at a different photo so two spots rarely show the same one
      var i = Math.floor(n * order.length / spots.length);
      var show = function (photo, fade) {
        var pre = new Image();
        pre.onload = function () {
          if (fade) img.classList.add('fading');
          setTimeout(function () {
            setSrc(img, photo);
            img.alt = photo.alt;
            if (cap) cap.textContent = photo.caption || '';
            if (cap) cap.hidden = !photo.caption;
            img.classList.remove('fading');
          }, fade ? 450 : 0);
        };
        pre.onerror = function () { /* skip a photo that won't load */ };
        pre.src = photo.src;
      };
      // With the folder connected, swap in a folder photo right away; otherwise keep the page's own photo first
      if (swapNow) show(order[i % order.length], false);
      if (reduceMotion) return;
      var every = (+fig.dataset.interval || 8000) + n * 900;
      timers.push(setInterval(function () {
        if (document.hidden) return;
        i = (i + 1) % order.length;
        show(order[i], true);
      }, every));
    });
  }

  /* ---------- Gallery: "From the photo folder" ---------- */
  function fillGallery(drivePhotos) {
    var box = document.getElementById('drive-gallery');
    var sec = document.getElementById('drive-gallery-section');
    if (!box || !sec) return;
    if (!drivePhotos.length) { sec.hidden = true; return; }
    sec.hidden = false;
    box.replaceChildren.apply(box, drivePhotos.map(function (p) {
      var fig = document.createElement('figure'); fig.className = 'tile';
      var a = document.createElement('a'); a.href = p.big; a.target = '_blank'; a.rel = 'noopener';
      var img = document.createElement('img'); img.loading = 'lazy'; img.alt = p.alt; img.width = 1600; img.height = 1067;
      setSrc(img, p);
      a.append(img); fig.append(a);
      if (p.caption) {
        var cap = document.createElement('figcaption'), b = document.createElement('b');
        b.textContent = p.caption; cap.append(b); fig.append(cap);
      }
      return fig;
    }));
  }

  /* ---------- public helpers (Past Shows uses these) ---------- */
  var state = { pool: LOCAL.map(fromLocal), drive: [], byDate: {} };
  function index(list) {
    state.byDate = {};
    list.forEach(function (p) { if (p.date && !state.byDate[p.date]) state.byDate[p.date] = p; });
  }
  window.KHB_PHOTOS = {
    // Photo for a gig: exact start date, or any day of a multi-day gig
    forGig: function (start, end) {
      if (state.byDate[start]) return state.byDate[start];
      if (end) for (var k in state.byDate) if (k >= start && k <= end) return state.byDate[k];
      return null;
    },
    setSrc: setSrc
  };

  function ready(mode) {
    index(state.pool);
    startRotators(state.pool, mode === 'drive');
    fillGallery(state.drive);
    try { document.dispatchEvent(new CustomEvent('khb:photos', { detail: { mode: mode } })); } catch (e) {}
  }

  function load() {
    ready('local');
    if (!CFG.apiKey || !CFG.photoFolderId || !window.fetch) return;
    var q = "'" + CFG.photoFolderId.replace(/'/g, '') + "' in parents and trashed = false and mimeType contains 'image/'";
    var url = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      q: q, key: CFG.apiKey, pageSize: '1000', orderBy: 'name desc',
      fields: 'files(id,name)'
    });
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var files = (data.files || []).map(fromDrive);
        if (!files.length) return;
        state.drive = files;
        state.pool = files;
        ready('drive');
      })
      .catch(function () { /* keep the local photos */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
