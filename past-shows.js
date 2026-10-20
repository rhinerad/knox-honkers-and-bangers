/* Knoxville Honkers and Bangers: Past Shows page.
 * Renders every show from past-shows-archive.js, plus any newer past gigs that calendar.js
 * finds on the band calendar after the archive's "curatedThrough" date.
 * All text is inserted as text, never as HTML.
 */
(function () {
  'use strict';

  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var WK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var archive = window.KHB_ARCHIVE || { curatedThrough: '', shows: [] };
  var fromCalendar = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function parts(s) { var a = s.split('-'); return { y: +a[0], m: +a[1], d: +a[2] }; }
  function weekday(p) { return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); }
  function key(s) { return s.date + '|' + s.title.toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function allShows() {
    var seen = {}, out = [];
    archive.shows.concat(fromCalendar.filter(function (s) { return s.date > archive.curatedThrough; }))
      .forEach(function (s) { var k = key(s); if (!seen[k]) { seen[k] = 1; out.push(s); } });
    return out.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }

  function row(s) {
    var li = el('li', 'gig past'), p = parts(s.date);
    var date = el('div', 'gig-date');
    var dayText = String(p.d);
    if (s.end) { var e = parts(s.end); dayText = p.d + '–' + (e.m !== p.m ? MON[e.m - 1] + ' ' : '') + e.d; }
    date.append(el('span', 'gig-mon', MON[p.m - 1].toUpperCase()), el('b', s.end ? 'range' : null, dayText),
      el('span', null, WK[weekday(p)]));
    var main = el('div', 'gig-main');
    main.append(el('h4', 'gig-title', s.title));
    if (s.place && s.place !== 'See it on the map') main.append(el('p', 'gig-where', s.place));
    if (s.note) main.append(el('p', 'gig-note', s.note));
    li.append(date, main, photoSlot(s));
    return li;
  }

  // Group photo for the gig: a local file named in the archive (photo: 'images/...'), or a photo in the
  // band's Drive folder whose name starts with the gig's date (see photos.js). Otherwise an empty slot.
  function photoSlot(s) {
    var P = window.KHB_PHOTOS;
    var photo = s.photo ? { src: s.photo, big: s.photo, alt: s.title } : (P ? P.forGig(s.date, s.end) : null);
    if (!photo) {
      var empty = el('div', 'gig-photo empty');
      empty.setAttribute('aria-hidden', 'true');
      return empty;
    }
    var a = el('a', 'gig-photo');
    a.href = photo.big || photo.src; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', 'Group photo: ' + s.title);
    var img = el('img');
    img.loading = 'lazy'; img.alt = 'The band at ' + s.title; img.width = 480; img.height = 320;
    if (P && P.setSrc && !s.photo) P.setSrc(img, photo); else img.src = photo.src;
    a.append(img);
    return a;
  }

  function render() {
    var shows = allShows();
    var byYear = {}, years = [];
    shows.forEach(function (s) {
      var y = s.date.slice(0, 4);
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(s);
    });
    var thisYear = String(new Date().getFullYear());
    var first = shows.length ? shows[shows.length - 1] : null;

    // Headline numbers
    var total = document.getElementById('ps-total');
    if (total) total.textContent = String(shows.length);
    var since = document.getElementById('ps-since');
    if (since && first) { var fp = parts(first.date); since.textContent = MON[fp.m - 1] + ' ' + fp.y; }
    var yrs = document.getElementById('ps-years');
    if (yrs) yrs.textContent = String(years.length);

    // Shows-per-year chart (oldest at top)
    var chart = document.getElementById('ps-chart');
    if (chart) {
      var max = Math.max.apply(null, years.map(function (y) { return byYear[y].length; }).concat([1]));
      chart.replaceChildren.apply(chart, years.slice().reverse().map(function (y) {
        var n = byYear[y].length;
        var a = el('a', 'yr-row');
        a.href = '#y' + y;
        a.setAttribute('aria-label', y + ': ' + n + ' shows' + (y === thisYear ? ' so far' : ''));
        var bar = el('span', 'yr-bar');
        var fill = el('span', 'yr-fill');
        fill.style.width = Math.max(4, Math.round(n / max * 100)) + '%';
        bar.append(fill);
        a.append(el('span', 'yr-label', y), bar, el('span', 'yr-count', n + (y === thisYear ? ' so far' : '')));
        return a;
      }));
    }

    // Year sections, newest first
    var list = document.getElementById('ps-list');
    if (list) {
      list.replaceChildren.apply(list, years.map(function (y) {
        var sec = el('section', 'ps-year');
        sec.id = 'y' + y;
        var head = el('div', 'ps-year-head');
        head.append(el('h2', 'ps-year-num', y), el('p', 'ps-year-count', byYear[y].length + (byYear[y].length === 1 ? ' show' : ' shows') + (y === thisYear ? ' so far' : '')));
        var ol = el('ol', 'gigs');
        byYear[y].forEach(function (s) { ol.append(row(s)); });
        sec.append(head, ol);
        return sec;
      }));
    }
  }

  document.addEventListener('khb:photos', function () { render(); });
  document.addEventListener('khb:shows', function (e) {
    fromCalendar = (e.detail && e.detail.past) || [];
    render();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
