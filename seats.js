/* =====================================================================
   ECHO Study Space - Seats page
   1. mobile drawer   2. geofence gate   3. seat data   4. grid + dialog
   Plain JS, no build step (works on GitHub Pages).
   ===================================================================== */
(function () {
  'use strict';
  var CFG = window.ECHO_CONFIG || {};
  var RADIUS_KM = Number(CFG.RADIUS_KM) || 5;

  var STATUS = {
    available:     { label: 'Available' },
    free_today:    { label: 'Member on leave · free today' },
    partial:       { label: 'Some slots free' },
    occupied:      { label: 'Occupied' },
    expiring_soon: { label: 'Expiring soon' },
    expiring_next: { label: 'Expiring · next booked' },
    reserved:      { label: 'Reserved' },
    maintenance:   { label: 'Maintenance' }
  };
  var STATUS_ORDER = ['available', 'free_today', 'partial', 'occupied', 'reserved', 'maintenance'];

  function $(id) { return document.getElementById(id); }

  /* ---------------------------------------------------------------
     1. Mobile drawer (same behaviour as the home page)
     --------------------------------------------------------------- */
  (function drawer() {
    var toggle = document.querySelector('.menu-toggle');
    var drawerEl = document.querySelector('.mobile-drawer');
    var overlay = document.querySelector('.drawer-overlay');
    var closeBtn = document.querySelector('.drawer-close');
    if (!toggle || !drawerEl) return;
    function open() {
      drawerEl.classList.add('open'); overlay.classList.add('open');
      drawerEl.setAttribute('aria-hidden', 'false'); drawerEl.removeAttribute('inert');
      toggle.setAttribute('aria-expanded', 'true'); document.body.classList.add('no-scroll');
    }
    function close() {
      drawerEl.classList.remove('open'); overlay.classList.remove('open');
      drawerEl.setAttribute('aria-hidden', 'true'); drawerEl.setAttribute('inert', '');
      toggle.setAttribute('aria-expanded', 'false'); document.body.classList.remove('no-scroll');
    }
    toggle.addEventListener('click', open);
    closeBtn && closeBtn.addEventListener('click', close);
    overlay && overlay.addEventListener('click', close);
    drawerEl.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    window.matchMedia('(min-width: 981px)').addEventListener('change', function (e) { if (e.matches) close(); });
  })();

  /* ---------------------------------------------------------------
     2. Geofence gate
     --------------------------------------------------------------- */
  var geoPanel = $('geo-panel'), geoTitle = $('geo-title'), geoText = $('geo-text');
  var geoRetry = $('geo-retry'), geoWa = $('geo-wa'), seatApp = $('seat-app');
  document.querySelectorAll('.js-radius').forEach(function (el) { el.textContent = RADIUS_KM; });

  if (!CFG.CENTER_CONFIRMED && window.console) {
    console.warn('[ECHO] CENTER in config.js is still approximate. Set the exact study-centre coordinates and CENTER_CONFIRMED: true.');
  }

  function toRad(d) { return d * Math.PI / 180; }
  function distanceKm(lat1, lng1, lat2, lng2) {          // haversine
    var R = 6371, dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function setGeo(state, title, text, opts) {
    opts = opts || {};
    geoPanel.dataset.state = state;
    geoTitle.textContent = title;
    geoText.textContent = text;
    geoRetry.hidden = !opts.retry;
    geoWa.hidden = !opts.wa;
    geoPanel.hidden = false;
    seatApp.hidden = true;
  }

  function waLink(text) {
    return 'https://wa.me/' + (CFG.WHATSAPP_NUMBER || '919778262436') + '?text=' + encodeURIComponent(text);
  }
  geoWa.href = waLink("Hi ECHO! I'd like to know about seat availability.");

  var CACHE_KEY = 'echo_geo_ok';
  function cacheFresh() {
    try {
      var t = Number(sessionStorage.getItem(CACHE_KEY));
      return t && (Date.now() - t) < (Number(CFG.GEO_CACHE_MINUTES) || 10) * 60000;
    } catch (e) { return false; }
  }
  function cacheSet() { try { sessionStorage.setItem(CACHE_KEY, String(Date.now())); } catch (e) {} }
  function cacheClear() { try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {} }

  function allow() {
    geoPanel.hidden = true;
    seatApp.hidden = false;
    startSeats();
  }

  function runGeoCheck() {
    if (cacheFresh()) { allow(); return; }
    cacheClear();

    if (!('geolocation' in navigator)) {
      setGeo('unsupported', 'Location not supported',
        'This browser cannot share its location, so we cannot show seat availability. Please try another browser or message us on WhatsApp.',
        { wa: true });
      return;
    }
    if (!window.isSecureContext) {
      setGeo('error', 'Secure connection needed',
        'Location only works on a secure (https) page. Please open echostudyspace.in over https.', { retry: false, wa: true });
      return;
    }

    setGeo('checking', 'Checking your location…',
      'Seat availability is shown to visitors within ' + RADIUS_KM + ' km of ECHO. Please allow location access when your browser asks.');

    navigator.geolocation.getCurrentPosition(function (pos) {
      var c = CFG.CENTER || {};
      var d = distanceKm(pos.coords.latitude, pos.coords.longitude, Number(c.lat), Number(c.lng));
      if (isNaN(d)) {
        setGeo('error', 'Setup incomplete', 'The study-centre location has not been configured yet.', { wa: true });
        return;
      }
      if (d <= RADIUS_KM) { cacheSet(); allow(); }
      else {
        setGeo('outside', 'You are outside our seat-viewing area',
          'Live seat availability is shown only within ' + RADIUS_KM + ' km of ECHO. You appear to be about ' +
          d.toFixed(1) + ' km away. Message us on WhatsApp and we will help you with a seat.',
          { retry: true, wa: true });
      }
    }, function (err) {
      if (err && err.code === 1) {
        setGeo('denied', 'Location access is blocked',
          'To see seat availability, allow location for this site in your browser settings (the lock icon next to the address), then tap "Check again".',
          { retry: true, wa: true });
      } else if (err && err.code === 3) {
        setGeo('error', 'Location timed out',
          'We could not get your location in time. Please make sure location is switched on and try again.',
          { retry: true, wa: true });
      } else {
        setGeo('error', 'Could not find your location',
          'Your device could not work out where you are. Please turn on location services and try again.',
          { retry: true, wa: true });
      }
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
  }
  geoRetry.addEventListener('click', runGeoCheck);

  /* ---------------------------------------------------------------
     3. Seat data (Supabase RPC public_seat_map, or demo data)
     --------------------------------------------------------------- */
  var seats = [];
  var activeFilter = null;
  var timer = null;
  var started = false;

  function todayIST() {
    // en-CA gives YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }

  function parseDate(s) {                     // 'YYYY-MM-DD' -> Date at UTC noon
    var p = String(s).split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
  }
  function fmtDate(s) {
    return parseDate(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  function dayBefore(s) {
    var d = parseDate(s); d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  function dayAfter(s) {
    var d = parseDate(s); d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function demoData() {
    var total = Number(CFG.TOTAL_SEATS) || 75, t = todayIST(), out = [];
    function shift(n) { var d = parseDate(t); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
    for (var i = 1; i <= total; i++) {
      var r = (i * 37) % 11, s = 'available', b = [];
      if (r === 1 || r === 2 || r === 3) { s = 'occupied'; b = [{ slot: 'Full day', from: shift(-10), until: shift(12 + i % 9), upcoming: false }]; }
      else if (r === 4) { s = 'expiring_soon'; b = [{ slot: 'Full day', from: shift(-27), until: shift(2), upcoming: false }]; }
      else if (r === 7) { s = 'expiring_next'; b = [{ slot: 'Full day', from: shift(-27), until: shift(2), upcoming: false }, { slot: 'Full day', from: shift(3), until: shift(32), upcoming: true }]; }
      else if (r === 5) { s = 'partial'; b = [{ slot: '3h  06:00-09:00', from: shift(-5), until: shift(25), upcoming: false }, { slot: '7h  14:00-21:00', from: shift(-2), until: shift(28), upcoming: false }]; }
      else if (r === 6 && i % 2 === 0) { s = 'available'; b = [{ slot: 'Full day', from: shift(-12), until: shift(18), upcoming: false, on_leave_today: true }]; }
      else if (i % 23 === 0) { s = 'reserved'; }
      else if (i === 41 || i === 58) { s = 'maintenance'; }
      var nm = demoName(i);
      out.push({ seat_no: i, seat_label: nm.label, section: nm.section, status: s, bookings: b });
    }
    return out;
  }

  // demo layout only (real names come from the database): A12 B12 C12 D12 E13 F8 G6
  var DEMO_LAYOUT = [['A', 12], ['B', 12], ['C', 12], ['D', 12], ['E', 13], ['F', 8], ['G', 6]];
  function demoName(n) {
    var left = n;
    for (var k = 0; k < DEMO_LAYOUT.length; k++) {
      if (left <= DEMO_LAYOUT[k][1]) return { section: DEMO_LAYOUT[k][0], label: DEMO_LAYOUT[k][0] + left };
      left -= DEMO_LAYOUT[k][1];
    }
    return { section: null, label: String(n) };
  }

  function fetchSeats() {
    var url = CFG.SUPABASE_URL, key = CFG.SUPABASE_ANON_KEY;
    if (!url || !key) {
      $('demo-ribbon').hidden = false;
      return Promise.resolve(demoData());
    }
    $('demo-ribbon').hidden = true;
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var to = ctl && setTimeout(function () { ctl.abort(); }, 12000);
    return fetch(url.replace(/\/+$/, '') + '/rest/v1/rpc/public_seat_map', {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_date: todayIST() }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (rows) {
      if (!Array.isArray(rows)) throw new Error('Unexpected response');
      return rows;
    }).finally(function () { if (to) clearTimeout(to); });
  }

  // a seat the database calls 'available' whose booked member is absent today:
  // booked, but free for today -> shown in its own colour
  // the grid and legend show only Available / Occupied / Reserved (+ rarer cases):
  // "expiring soon" and "expiring, next booked" are shown as Occupied. The popup still explains the details.
  function shown(status) { return (status === 'expiring_soon' || status === 'expiring_next') ? 'occupied' : status; }
  function derive(status, bookings) {
    var onLeave = bookings.some(function (b) { return b.on_leave_today; });
    return (status === 'available' && onLeave) ? 'free_today' : status;
  }

  function load(showErrors) {
    var errBox = $('seat-error');
    return fetchSeats().then(function (rows) {
      seats = rows.map(function (r) {
        return {
          seat_no: r.seat_no,
          seat_label: r.seat_label || String(r.seat_no),
          section: r.section || null,
          status: shown(derive(STATUS[r.status] ? r.status : 'available', Array.isArray(r.bookings) ? r.bookings : [])),
          detail: derive(STATUS[r.status] ? r.status : 'available', Array.isArray(r.bookings) ? r.bookings : []),
          bookings: Array.isArray(r.bookings) ? r.bookings : []
        };
      }).sort(function (a, b) { return a.seat_no - b.seat_no; });
      errBox.hidden = true;
      render();
      $('seat-updated').textContent = 'Updated ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    }).catch(function () {
      if (showErrors || !seats.length) {
        errBox.textContent = 'Could not load seat availability right now. Please check your connection and tap Refresh.';
        errBox.hidden = false;
      }
    });
  }

  function startSeats() {
    if (started) { load(false); return; }
    started = true;
    load(true);
    var secs = Number(CFG.REFRESH_SECONDS) || 120;
    timer = setInterval(function () { if (!document.hidden && !seatApp.hidden) load(false); }, secs * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && !seatApp.hidden) load(false); });
    $('seat-refresh').addEventListener('click', function () { load(true); });
  }

  /* ---------------------------------------------------------------
     4. Rendering: legend, grid, dialog
     --------------------------------------------------------------- */
  function render() {
    var counts = {};
    seats.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; });

    var legend = $('seat-legend');
    legend.textContent = '';
    STATUS_ORDER.forEach(function (key) {
      if (!counts[key] && key !== 'available') return;       // hide unused statuses
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'legend-chip';
      b.setAttribute('aria-pressed', activeFilter === key ? 'true' : 'false');
      var sw = document.createElement('span'); sw.className = 'swatch ' + key;
      var lb = document.createElement('span'); lb.textContent = STATUS[key].label;
      var ct = document.createElement('span'); ct.className = 'count'; ct.textContent = counts[key] || 0;
      b.append(sw, lb, ct);
      b.addEventListener('click', function () { activeFilter = (activeFilter === key) ? null : key; render(); });
      legend.appendChild(b);
    });

    // group by section (A, B, C...) keeping database order; seats without a section go last
    var groups = [], byKey = {};
    seats.forEach(function (s) {
      var key = s.section || '';
      if (!byKey[key]) { byKey[key] = { key: key, seats: [] }; groups.push(byKey[key]); }
      byKey[key].seats.push(s);
    });

    var root = $('seat-grid');
    root.textContent = '';
    groups.forEach(function (g) {
      var sec = el('section', 'hall-section');
      var free = g.seats.filter(function (s) { return s.status === 'available' || s.status === 'free_today' || s.status === 'partial'; }).length;
      var head = el('div', 'section-title');
      head.appendChild(el('h3', null, g.key ? 'Section ' + g.key : 'Seats'));
      head.appendChild(el('span', null, free + ' of ' + g.seats.length + ' open'));
      sec.appendChild(head);

      var grid = el('div', 'seat-grid');
      grid.setAttribute('role', 'list');
      g.seats.forEach(function (s) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seat ' + s.status + (activeFilter && activeFilter !== s.status ? ' dim' : '');
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('aria-label', 'Seat ' + s.seat_label + ', ' + STATUS[s.status].label);
        btn.textContent = s.seat_label;
        btn.addEventListener('click', function () { openSeat(s); });
        grid.appendChild(btn);
      });
      sec.appendChild(grid);
      root.appendChild(sec);
    });
  }

  var dlg = $('seat-dialog');
  $('seat-dialog-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function appendBookings(body, bookings) {
    bookings.forEach(function (bk) {
      var card = el('div', 'booking-card');
      card.appendChild(el('h3', null, bk.slot || 'Full day'));
      var dl = el('dl');
      function row(k, v, cls) { dl.appendChild(el('dt', null, k)); dl.appendChild(el('dd', cls, v)); }
      row(bk.upcoming ? 'Starts on' : 'Occupied since', fmtDate(bk.from));
      row('Plan expires', fmtDate(bk.until));
      row('Free from', fmtDate(dayAfter(bk.until)), 'free');
      if (bk.on_leave_today) row('Today', 'Member on leave');
      card.appendChild(dl);
      body.appendChild(card);
    });
  }

  // Full-day bookings as a simple timeline: Now -> Next -> Free. Returns the first day the seat is free for good (or null).
  function appendTimeline(body, bookings, reservedAfter) {
    var full = bookings.filter(function (b) { return (b.slot || 'Full day') === 'Full day'; })
      .sort(function (a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : 0; });
    if (!full.length) return null;
    var ol = el('ol', 'tl'), cursor = null, nextSeen = false;
    function item(kind, tag, text, sub) {
      var li = el('li', 'tl-item ' + kind);
      li.appendChild(el('span', 'tl-tag', tag));
      var box = el('span', 'tl-text'); box.appendChild(el('b', null, text));
      if (sub) box.appendChild(el('small', null, sub));
      li.appendChild(box); ol.appendChild(li);
    }
    full.forEach(function (bk) {
      if (cursor && bk.from > cursor) item('free', 'Free', fmtDate(cursor) + ' \u2192 ' + fmtDate(dayBefore(bk.from)), 'seat is free in between');
      var tag = !bk.upcoming ? 'Now' : (nextSeen ? 'Later' : 'Next');
      if (bk.upcoming) nextSeen = true;
      item(bk.upcoming ? 'next' : 'now', tag, fmtDate(bk.from) + ' \u2192 ' + fmtDate(bk.until), bk.on_leave_today ? 'member on leave today' : (bk.upcoming ? 'already booked' : 'current plan'));
      var after = dayAfter(bk.until);
      if (!cursor || after > cursor) cursor = after;
    });
    if (reservedAfter) item('next', 'Next', 'Reserved', 'held for the next period');
    else item('free', 'Free', 'From ' + fmtDate(cursor), 'seat becomes free');
    body.appendChild(ol);
    return reservedAfter ? null : cursor;
  }

  function openSeat(s) {
    $('seat-dialog-title').textContent = 'Seat ' + s.seat_label;
    var body = $('seat-dialog-body');
    body.textContent = '';
    body.appendChild(el('span', 'status-pill ' + s.status, STATUS[s.status].label));

    var wantsBooking = false;
    var d = s.detail || s.status;

    var onLeave = s.bookings.some(function (b) { return b.on_leave_today; });

    if (d === 'available') {
      body.appendChild(el('p', 'seat-note', 'This seat is free right now.'));
      wantsBooking = true;
    } else if (d === 'free_today') {
      body.appendChild(el('p', 'seat-note', 'This seat is booked, but its member is on leave today, so it is free for today only. Day and hourly plans can use it today.'));
      wantsBooking = true;
      appendBookings(body, s.bookings);
    } else if (d === 'reserved') {
      body.appendChild(el('p', 'seat-note', 'This seat is reserved. Ask us on WhatsApp if you would like to know when it opens up.'));
    } else if (d === 'maintenance') {
      body.appendChild(el('p', 'seat-note', 'This seat is temporarily out of service for maintenance. Please pick another seat.'));
    } else {
      var full = s.bookings.filter(function (b) { return (b.slot || 'Full day') === 'Full day'; });
      var current = full.filter(function (b) { return !b.upcoming; })[0], nextB = full.filter(function (b) { return b.upcoming; })[0];
      if (d === 'partial') {
        body.appendChild(el('p', 'seat-note', 'Shared seat: the time slots below are taken, other hours are free.'));
        wantsBooking = true;
        appendBookings(body, s.bookings);
      } else {
        var note, free;
        if (d === 'expiring_next') {
          note = nextB
            ? 'The current plan ends on ' + fmtDate(current.until) + ', but this seat is already booked from ' + fmtDate(nextB.from) + '. It will not be free for the next period.'
            : 'The current plan ends on ' + fmtDate(current.until) + ', and this seat is already reserved for the next period.';
        } else if (d === 'expiring_soon') {
          note = 'The current plan ends on ' + fmtDate(current.until) + '. Nobody has booked the seat after that, so it becomes free on ' + fmtDate(dayAfter(current.until)) + '.';
          wantsBooking = true;
        } else {
          note = 'This seat is currently taken.';
          wantsBooking = true;
        }
        body.appendChild(el('p', 'seat-note', note));
        free = appendTimeline(body, s.bookings, d === 'expiring_next' && !nextB);
        // any hourly bookings on the same seat are listed as before
        appendBookings(body, s.bookings.filter(function (b) { return (b.slot || 'Full day') !== 'Full day'; }));
      }
    }

    if (wantsBooking) {
      var a = el('a', 'btn btn-gold btn-sm', '💬 Ask about seat ' + s.seat_label);
      a.href = waLink("Hi ECHO! I'd like to book seat " + s.seat_label + '.');
      a.target = '_blank'; a.rel = 'noopener';
      body.appendChild(a);
    }
    dlg.showModal();
  }

  /* go */
  runGeoCheck();
})();
