/* Knoxville Honkers and Bangers: show calendar
 *
 * Reads gigs from a public Google Calendar and shows them on the site in our own style.
 * Until CONFIG below is filled in, the site uses the saved list in shows-snapshot.js.
 * Setup steps are in README.txt.
 */
(function () {
  'use strict';

  var CONFIG = {
    // Public Google Calendar to read shows from, e.g. "abc123@group.calendar.google.com"
    calendarId: '',
    // Google API key with the Google Calendar API turned on (restrict it to your site's address)
    apiKey: '',
    timeZone: 'America/New_York',
    // Events with any of these words in the title never appear on the site
    hideIfTitleHas: ['practice', 'rehearsal', 'sectional', 'meeting', 'band camp',
                     'cancelled', 'canceled', 'wedding', 'private'],
    // Put this tag anywhere in an event's description to keep that event off the site
    hideTag: '#private',
    // How far back the "Past shows" list goes
    pastDays: 365
  };

  var DAY = 864e5;
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var WEEKDAY = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  /* ---------- dates in Knoxville time ---------- */
  var partsFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function etParts(ms) {
    var o = {};
    partsFmt.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, min: +o.minute };
  }
  function ymd(s) { var a = s.split('-'); return { y: +a[0], m: +a[1], d: +a[2] }; }
  function dayIndex(p) { return Math.round(Date.UTC(p.y, p.m - 1, p.d) / DAY); }
  function weekday(p) { return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); }
  function etMidnight(s) { var p = ymd(s); return Date.UTC(p.y, p.m - 1, p.d, 5); }
  function startMs(sh) { return sh.allDay ? etMidnight(sh.start) : Date.parse(sh.start); }
  function endMs(sh) { return sh.allDay ? etMidnight(sh.end) : Date.parse(sh.end); }
  function firstDay(sh) { return sh.allDay ? ymd(sh.start) : etParts(Date.parse(sh.start)); }
  function lastDay(sh) {
    if (sh.allDay) {
      var p = ymd(sh.end), t = new Date(Date.UTC(p.y, p.m - 1, p.d - 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
    }
    return etParts(Date.parse(sh.end) - 1);
  }
  function multiDay(sh) { return dayIndex(lastDay(sh)) > dayIndex(firstDay(sh)); }
  function hm(h, min, withMer) {
    var s = ((h % 12) || 12) + ':' + (min < 10 ? '0' : '') + min;
    return withMer === false ? s : s + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  /* ---------- turning a calendar event into a show ---------- */
  function stripHtml(s) {
    return String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
  }

  // "Showtime 1:00-1:30pm", "show time 4pm", "Performance 4:00-4:30pm", "Play time: 3-3:30pm", "Showtime 3pm?"
  var SHOW_RE = /(?:show\s*-?\s*time|performance|play\s*time|start(?:s|ing)?\s+playing)\s*(?:will be|is|at)?\s*:?\s*(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?(?:\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?)?\s*(\?)?/i;
  // "... Kickoff Party 8pm showtime"
  var TITLE_RE = /\s*(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)\s*show\s*-?\s*time\s*/i;

  function resolveHour(h, mer, callHour) {
    if (mer) return (h % 12) + (/^p/i.test(mer) ? 12 : 0);
    var a = h % 12;
    if (callHour == null) return a < 9 ? a + 12 : a;
    return a >= callHour ? a : a + 12;
  }
  function showtimeFrom(m, callHour, merIdx) {
    var mer = m[merIdx] || m[merIdx + 3];
    var h = resolveHour(+m[1], mer, callHour);
    if (h > 23) return null;
    return { label: hm(h, +(m[2] || 0)), approx: !!m[7] };
  }

  function cleanLocation(loc) {
    return String(loc || '').replace(/\s+/g, ' ')
      .replace(/,?\s*(United States|USA)\w?\s*$/i, '').trim();
  }

  function toShow(ev) {
    if (!ev || ev.status === 'cancelled') return null;
    var title = String(ev.summary || '').trim();
    if (!title) return null;
    var lower = title.toLowerCase();
    for (var i = 0; i < CONFIG.hideIfTitleHas.length; i++) {
      if (lower.indexOf(CONFIG.hideIfTitleHas[i]) !== -1) return null;
    }
    var desc = stripHtml(ev.description);
    if (CONFIG.hideTag && desc.toLowerCase().indexOf(CONFIG.hideTag.toLowerCase()) !== -1) return null;

    var s = ev.start || {}, e = ev.end || {};
    var allDay = !!s.date && !s.dateTime;
    var show = {
      id: ev.id || title + (s.dateTime || s.date),
      title: title,
      allDay: allDay,
      start: allDay ? String(s.date).slice(0, 10) : s.dateTime,
      end: allDay ? String(e.date || s.date).slice(0, 10) : (e.dateTime || s.dateTime),
      location: cleanLocation(ev.location),
      showtime: null
    };
    if (!show.start) return null;
    if (allDay && show.end <= show.start) {
      var p = ymd(show.start), n = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
      show.end = n.toISOString().slice(0, 10);
    }
    var callHour = allDay ? null : etParts(Date.parse(show.start)).h;

    var tm = title.match(TITLE_RE);
    if (tm) {
      var h = resolveHour(+tm[1], tm[3], callHour);
      show.showtime = { label: hm(h, +(tm[2] || 0)), approx: false };
      show.title = title.replace(TITLE_RE, ' ').trim();
    } else {
      var m = desc.match(SHOW_RE);
      if (m) show.showtime = showtimeFrom(m, callHour, 3);
    }
    return show;
  }

  /* ---------- labels and links ---------- */
  function timeLabel(sh) {
    if (sh.showtime) return 'Show ' + sh.showtime.label + (sh.showtime.approx ? ' (TBC)' : '');
    if (sh.allDay) return multiDay(sh) ? 'Multi-day' : 'All day';
    var a = etParts(startMs(sh)), b = etParts(endMs(sh));
    var same = (a.h < 12) === (b.h < 12);
    return hm(a.h, a.min, !same) + '–' + hm(b.h, b.min);
  }
  function countdown(sh, now) {
    if (startMs(sh) <= now) return { text: 'Happening now', now: true };
    var diff = dayIndex(firstDay(sh)) - dayIndex(etParts(now));
    if (diff <= 0) return { text: !sh.allDay && etParts(startMs(sh)).h >= 17 ? 'Tonight' : 'Today', now: false };
    if (diff === 1) return { text: 'Tomorrow', now: false };
    return { text: 'In ' + diff + ' days', now: false };
  }
  function mapUrl(sh) {
    if (!sh.location) return null;
    if (/^https?:\/\//i.test(sh.location)) return sh.location;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(sh.location);
  }
  function placeText(sh) {
    return /^https?:\/\//i.test(sh.location) ? 'See it on the map' : sh.location;
  }
  function gstamp(iso) { return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function addToCalendarUrl(sh) {
    var dates = sh.allDay ? sh.start.replace(/-/g, '') + '/' + sh.end.replace(/-/g, '')
                          : gstamp(sh.start) + '/' + gstamp(sh.end);
    var q = 'action=TEMPLATE&text=' + encodeURIComponent(sh.title + ' · Knoxville Honkers and Bangers') +
            '&dates=' + dates;
    if (sh.location && !/^https?:/i.test(sh.location)) q += '&location=' + encodeURIComponent(sh.location);
    if (sh.showtime) q += '&details=' + encodeURIComponent('Show starts ' + sh.showtime.label);
    return 'https://calendar.google.com/calendar/render?' + q;
  }

  /* ---------- DOM building (text only, never raw HTML from the calendar) ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function a(href, cls, text) {
    var n = el('a', cls, text);
    n.href = href; n.target = '_blank'; n.rel = 'noopener';
    return n;
  }
  function dayText(sh) {
    var f = firstDay(sh), l = lastDay(sh);
    if (!multiDay(sh)) return { day: String(f.d), range: false };
    return { day: f.d + '–' + (l.m !== f.m ? MON[l.m - 1] + ' ' : '') + l.d, range: true };
  }

  function featureCard(sh, now) {
    var f = firstDay(sh), l = lastDay(sh), multi = multiDay(sh), dt = dayText(sh);
    var card = el('article', 'feature');
    var date = el('div', 'feature-date');
    date.append(
      el('span', 'fd-month', MON[f.m - 1].toUpperCase() + (multi && l.m !== f.m ? '–' + MON[l.m - 1].toUpperCase() : '')),
      el('span', 'fd-day' + (dt.range ? ' range' : ''), dt.day),
      el('span', 'fd-wk', multi ? WK[weekday(f)] + '–' + WK[weekday(l)] : WEEKDAY[weekday(f)])
    );
    var body = el('div', 'feature-body');
    var cd = countdown(sh, now);
    body.append(el('p', 'countdown' + (cd.now ? ' now' : ''), cd.text));
    body.append(el('h3', 'feature-title', sh.title));
    if (sh.location) body.append(el('p', 'feature-where', placeText(sh)));
    body.append(el('p', 'feature-time', timeLabel(sh)));
    var actions = el('div', 'feature-actions');
    var map = mapUrl(sh);
    if (map) actions.append(a(map, 'btn primary', 'Directions'));
    actions.append(a(addToCalendarUrl(sh), 'btn', 'Add to my calendar'));
    body.append(actions);
    card.append(date, body);
    return card;
  }

  function gigRow(sh, past) {
    var li = el('li', 'gig' + (past ? ' past' : ''));
    var f = firstDay(sh), dt = dayText(sh);
    var date = el('div', 'gig-date');
    date.append(el('b', dt.range ? 'range' : null, dt.day), el('span', null, WK[weekday(f)]));
    var main = el('div', 'gig-main');
    main.append(el('h4', 'gig-title', sh.title));
    if (sh.location) {
      var where = el('p', 'gig-where');
      where.append(a(mapUrl(sh), null, placeText(sh)));
      main.append(where);
    }
    li.append(date, main, el('div', 'gig-time', timeLabel(sh)));
    return li;
  }

  function monthGroups(list, past) {
    var out = [], cur = null, key;
    list.forEach(function (sh) {
      var f = firstDay(sh);
      key = f.y + '-' + f.m;
      if (!cur || cur.key !== key) {
        var sec = el('section', 'month');
        var h = el('h3', 'month-name', MONTH[f.m - 1] + ' ');
        h.append(el('span', null, String(f.y)));
        var ol = el('ol', 'gigs');
        sec.append(h, ol);
        cur = { key: key, ol: ol };
        out.push(sec);
      }
      cur.ol.append(gigRow(sh, past));
    });
    return out;
  }

  function fill(id, nodes) {
    var box = document.getElementById(id);
    if (!box) return;
    box.replaceChildren.apply(box, nodes);
  }
  function emptyNote(text, withBooking) {
    var p = el('p', 'empty', text + (withBooking ? ' ' : ''));
    if (withBooking) {
      var link = el('a', null, 'Book the band');
      link.href = 'index.html#book';
      p.append(link);
    }
    return p;
  }
  function savedDate(s) {
    if (!s) return '';
    var p = ymd(s);
    return MON[p.m - 1] + ' ' + p.d + ', ' + p.y;
  }

  function render(shows, mode, savedAt) {
    var now = Date.now();
    shows = shows.slice().sort(function (x, y) { return startMs(x) - startMs(y); });
    var upcoming = shows.filter(function (s) { return endMs(s) > now; });
    var past = shows.filter(function (s) {
      return endMs(s) <= now && endMs(s) > now - CONFIG.pastDays * DAY;
    }).reverse();

    var next = upcoming[0] ? [featureCard(upcoming[0], now)]
      : [emptyNote('No shows on the books right now. New dates show up here as soon as they hit the band calendar.', true)];

    // Links page (Instagram bio): compact next-show card
    var ln = el('a', 'lt-next');
    ln.href = 'shows.html';
    if (upcoming[0]) {
      var nx = upcoming[0], nf = firstDay(nx);
      var ld = el('span', 'lt-next-date');
      ld.append(el('span', 'lt-next-mon', MON[nf.m - 1].toUpperCase()), el('span', 'lt-next-day', dayText(nx).day));
      var lb = el('span', 'lt-next-body');
      lb.append(el('span', 'lt-next-kicker', 'Next show'), el('span', 'lt-next-title', nx.title),
        el('span', 'lt-next-where', [placeText(nx), timeLabel(nx)].filter(Boolean).join(' · ')));
      ln.append(ld, lb);
    } else {
      var lb2 = el('span', 'lt-next-body');
      lb2.append(el('span', 'lt-next-kicker', 'Shows'), el('span', 'lt-next-title', 'New dates coming soon'));
      ln.append(lb2);
    }
    fill('links-next', [ln]);

    // Home page
    fill('home-next', next.map(function (n) { return n.cloneNode(true); }));
    fill('home-recent', past.slice(0, 3).map(function (s) { return gigRow(s, true); }));

    // Shows page
    fill('next-show', next);
    fill('more-shows', upcoming.length > 1
      ? [(function () { var ol = el('ol', 'gigs'); upcoming.slice(1).forEach(function (s) { ol.append(gigRow(s, false)); }); return ol; })()]
      : [emptyNote(upcoming.length ? "That's the only date booked so far. Want us at your event?" : 'Nothing else booked yet. Want us at your event?', true)]);
    fill('past-shows', past.length ? monthGroups(past, true) : [emptyNote('Past shows will be listed here.', false)]);
    var count = document.getElementById('past-count');
    if (count) {
      count.replaceChildren(el('b', null, String(past.length)),
        document.createTextNode(past.length === 1 ? ' show in the last year' : ' shows in the last year'));
    }

    var status = document.getElementById('cal-status');
    if (status) {
      status.className = 'cal-status' + (mode === 'live' ? ' live' : '');
      status.textContent = mode === 'live' ? 'Live from the band calendar'
        : mode === 'fallback' ? "Couldn't reach the band calendar just now. Showing the list saved " + savedDate(savedAt) + '.'
        : 'From the band calendar · updated ' + savedDate(savedAt);
    }
    var sub = document.getElementById('subscribe');
    if (sub) {
      sub.hidden = !CONFIG.calendarId;
      if (CONFIG.calendarId) sub.href = 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(CONFIG.calendarId);
    }
  }

  function load() {
    var snap = window.KHB_SNAPSHOT || { savedAt: null, shows: [] };
    render(snap.shows, 'snapshot', snap.savedAt);
    if (!CONFIG.calendarId || !CONFIG.apiKey || !window.fetch) return;
    var now = Date.now();
    var url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(CONFIG.calendarId) +
      '/events?' + new URLSearchParams({
        key: CONFIG.apiKey, singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
        timeMin: new Date(now - CONFIG.pastDays * DAY).toISOString(),
        timeMax: new Date(now + 540 * DAY).toISOString(),
        fields: 'items(id,status,summary,description,location,start,end)'
      });
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) { render((data.items || []).map(toShow).filter(Boolean), 'live'); })
      .catch(function () { render(snap.shows, 'fallback', snap.savedAt); });
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { toShow: toShow, timeLabel: timeLabel, CONFIG: CONFIG };
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
