/* Advantek AI² Security & Compliance — static preview scheduler and confirmation UI.
   IMPORTANT: no live availability, booking API, submission, or confirmation exists here. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const page = document.body.dataset.bookingPage;
  const leadStorageKey = 'advantek.previewLead.v4';
  const slotStorageKey = 'advantek.previewSlot.v4';
  const EASTERN = 'America/New_York';
  const audiences = new Map([
    ['finance', {
      label: 'Finance leadership',
      agenda: 'We can compare outside consulting spend, staff time, and the cost of an annual subscription.'
    }],
    ['it-security', {
      label: 'IT/security leadership',
      agenda: 'Bring a policy gap or threat advisory. We can walk through the cited findings your team would validate.'
    }]
  ]);

  function readSession(key) {
    try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch (_) { return null; }
  }
  function writeSession(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }
  function safeTimeZone(tz) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; }
    catch (_) { return 'UTC'; }
  }
  function formatDate(instant, tz, options) {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...options }).format(instant);
  }
  function zoneParts(instant, tz) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(instant);
    return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
  }
  function offsetMs(instant, tz) {
    const p = zoneParts(new Date(instant), tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - instant;
  }
  function easternLocalToUTC(dayISO, hour, minute) {
    const [y,m,d] = dayISO.split('-').map(Number);
    const naiveUTC = Date.UTC(y, m - 1, d, hour, minute);
    let guessed = naiveUTC - offsetMs(naiveUTC, EASTERN);
    guessed = naiveUTC - offsetMs(guessed, EASTERN);
    return new Date(guessed);
  }
  function todayEastern() {
    const p = zoneParts(new Date(), EASTERN);
    return { year:p.year, month:p.month, day:p.day };
  }
  function isoDay(year, month, day) {
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function dayString(instant, tz) { return formatDate(instant, tz, { weekday:'short', month:'short', day:'numeric' }); }
  const timezoneOptions = [
    ['America/New_York', 'Eastern Time (New York)'],
    ['America/Chicago', 'Central Time (Chicago)'],
    ['America/Denver', 'Mountain Time (Denver)'],
    ['America/Los_Angeles', 'Pacific Time (Los Angeles)'],
    ['Europe/London', 'United Kingdom (London)'],
    ['Asia/Kolkata', 'India Standard Time'],
    ['UTC', 'Coordinated Universal Time']
  ];

  // Match the main funnel's scroll-aware header, without importing its landing-page JS.
  const header = $('#page-top');
  if (header) {
    let oldY = window.scrollY, tally = 0, direction = 0, scheduled = false;
    const update = () => {
      scheduled = false;
      const y = Math.max(0, window.scrollY), delta = y - oldY;
      const nextDirection = Math.sign(delta);
      if (y < 14 || header.contains(document.activeElement)) {
        header.classList.remove('is-scrolled-away'); tally = 0; direction = 0;
      } else if (nextDirection) {
        if (nextDirection !== direction) { tally = 0; direction = nextDirection; }
        tally += Math.abs(delta);
        if (direction > 0 && y > header.offsetHeight + 40 && tally >= 22) { header.classList.add('is-scrolled-away'); tally = 0; }
        if (direction < 0 && tally >= 11) { header.classList.remove('is-scrolled-away'); tally = 0; }
      }
      oldY = y;
    };
    window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(update); } }, { passive:true });
  }

  if (page === 'schedule') {
    const today = todayEastern();
    const baselineMonth = new Date(Date.UTC(today.year, today.month - 1, 1));
    const earliest = Date.now() + 24*60*60*1000;
    const latest = Date.now() + 90*24*60*60*1000;
    const timePairs = [[10,0],[11,30],[14,0],[15,30]];
    const timezoneSelect = $('#booking-timezone');
    const grid = $('#calendar-days');
    const monthLabel = $('#calendar-month');
    const prev = $('#calendar-prev');
    const next = $('#calendar-next');
    const times = $('#calendar-times');
    const selectedTitle = $('#selected-day-label');
    const helper = $('#selected-day-helper');
    const selection = $('#booking-selection');
    const continueButton = $('#booking-continue');
    const status = $('#booking-status');
    let offset = 0;
    let selectedDay = null;
    let selectedSlot = null;

    const detectedZone = safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || EASTERN);
    const tzList = timezoneOptions.some(([tz]) => tz === detectedZone) ? timezoneOptions : [[detectedZone, `Your local timezone (${detectedZone})`], ...timezoneOptions];
    for (const [zone, label] of tzList) {
      const option = document.createElement('option'); option.value = zone; option.textContent = label;
      timezoneSelect.append(option);
    }
    const oldPreview = readSession(slotStorageKey);
    timezoneSelect.value = safeTimeZone(oldPreview?.timeZone || detectedZone);
    const lead = readSession(leadStorageKey);
    const audience = audiences.get(lead?.audience);
    if (lead?.priority && typeof lead.priority === 'string') {
      const agenda = audience?.agenda || 'We can discuss what your team would want to validate in a demo.';
      $('#booking-context-copy').textContent = `Your selected focus: ${lead.priority}. ${agenda}`;
    }

    function validSlots(dayISO) {
      const [y,m,d] = dayISO.split('-').map(Number);
      const dayOfWeek = new Date(Date.UTC(y,m-1,d)).getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return [];
      return timePairs.map(([h,min]) => easternLocalToUTC(dayISO,h,min)).filter(v => v.getTime() > earliest && v.getTime() < latest);
    }
    function resetSelectedSlot() {
      selectedSlot = null;
      continueButton.disabled = true;
      selection.textContent = 'Select a date and time';
    }
    function selectionText() {
      if (!selectedSlot) return;
      const tz = timezoneSelect.value;
      selection.textContent = formatDate(selectedSlot, tz, { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short' });
    }
    function showTimes() {
      times.replaceChildren();
      const tz = timezoneSelect.value;
      if (!selectedDay) {
        selectedTitle.textContent = 'Select a date';
        helper.textContent = 'Sample time options will appear here.';
        const empty = document.createElement('div'); empty.className = 'calendar-empty';
        const icon = document.createElement('span'); icon.setAttribute('aria-hidden','true'); icon.textContent = '▦';
        const paragraph = document.createElement('p'); paragraph.textContent = 'Choose a date on the calendar to explore sample time slots.';
        empty.append(icon,paragraph); times.append(empty); return;
      }
      const date = new Date(selectedDay + 'T12:00:00Z');
      selectedTitle.textContent = formatDate(date, 'UTC', { weekday:'long', month:'long', day:'numeric' });
      helper.textContent = 'Illustrative times · converted to your timezone';
      for (const dateTime of validSlots(selectedDay)) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'calendar-time-button';
        button.setAttribute('aria-pressed', String(Boolean(selectedSlot && +selectedSlot === +dateTime)));
        const timeText = document.createElement('span');
        timeText.textContent = formatDate(dateTime, tz, { hour:'numeric', minute:'2-digit' });
        const dayText = document.createElement('small');
        dayText.textContent = dayString(dateTime, tz);
        button.append(timeText,dayText);
        button.setAttribute('aria-label', `${timeText.textContent}, ${dayText.textContent}, ${tz}`);
        button.addEventListener('click', () => {
          selectedSlot = dateTime;
          continueButton.disabled = false;
          for (const other of times.querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === button));
          selectionText();
          status.textContent = 'Sample time selected. Continue to preview the next step. No booking will be created.';
        });
        times.append(button);
      }
      if (!times.children.length) {
        const note = document.createElement('p'); note.className = 'calendar-empty'; note.textContent = 'No sample slots shown for this date. Choose another weekday.';
        times.append(note);
      }
    }
    function renderCalendar() {
      const display = new Date(Date.UTC(baselineMonth.getUTCFullYear(), baselineMonth.getUTCMonth() + offset, 1));
      const year = display.getUTCFullYear(), month = display.getUTCMonth() + 1;
      const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
      monthLabel.textContent = formatDate(display, 'UTC', { month:'long', year:'numeric' });
      prev.disabled = offset === 0;
      next.disabled = offset >= 2;
      grid.replaceChildren();
      const leading = (display.getUTCDay() + 6) % 7;
      for (let i=0; i<leading; i++) {
        const blank = document.createElement('span'); blank.className = 'calendar-blank'; blank.setAttribute('aria-hidden','true'); grid.append(blank);
      }
      for (let d=1;d<=dayCount;d++) {
        const iso = isoDay(year,month,d);
        const date = new Date(Date.UTC(year,month-1,d));
        const button = document.createElement('button'); button.type='button';
        button.textContent = String(d);
        button.disabled = validSlots(iso).length === 0;
        button.setAttribute('aria-pressed', String(selectedDay === iso));
        button.setAttribute('aria-label', formatDate(date, 'UTC', {weekday:'long',month:'long',day:'numeric',year:'numeric'}) + ' Eastern Time');
        if (iso === isoDay(today.year,today.month,today.day)) button.classList.add('is-today');
        button.addEventListener('click', () => {
          selectedDay = iso;
          resetSelectedSlot();
          renderCalendar(); showTimes();
          status.textContent = 'Choose a sample time from the list. These times are illustrative only.';
        });
        grid.append(button);
      }
    }
    prev.addEventListener('click', () => { if (offset > 0) { offset--; selectedDay=null; resetSelectedSlot(); renderCalendar(); showTimes(); } });
    next.addEventListener('click', () => { if (offset < 2) { offset++; selectedDay=null; resetSelectedSlot(); renderCalendar(); showTimes(); } });
    timezoneSelect.addEventListener('change', () => { selectionText(); showTimes(); });
    continueButton.addEventListener('click', () => {
      if (!selectedSlot || !selectedDay) return;
      writeSession(slotStorageKey, {
        iso: selectedSlot.toISOString(), dateEastern: selectedDay,
        timeZone: timezoneSelect.value,
        priority: typeof lead?.priority === 'string' ? lead.priority : '',
        audience: audience ? lead.audience : ''
      });
      // Preview-only step, not a booking-confirmation callback.
      window.location.assign('../thank-you/?preview=1');
    });
    if (oldPreview?.dateEastern && oldPreview?.iso && typeof oldPreview.dateEastern === 'string') {
      const [y,m] = oldPreview.dateEastern.split('-').map(Number);
      const proposedOffset = (y - baselineMonth.getUTCFullYear())*12 + (m - (baselineMonth.getUTCMonth()+1));
      if (proposedOffset>=0 && proposedOffset<=2 && validSlots(oldPreview.dateEastern).length) {
        offset = proposedOffset; selectedDay = oldPreview.dateEastern;
        const oldDate = new Date(oldPreview.iso);
        if (Number.isFinite(oldDate.getTime()) && validSlots(selectedDay).some(v => +v === +oldDate)) {
          selectedSlot = oldDate; continueButton.disabled = false; selectionText();
        }
      }
    }
    renderCalendar(); showTimes();
  }

  if (page === 'thank-you') {
    const data = readSession(slotStorageKey);
    if (data?.iso && data?.timeZone) {
      const date = new Date(data.iso);
      const tz = safeTimeZone(data.timeZone);
      if (Number.isFinite(date.getTime())) {
        $('#receipt-time').textContent = formatDate(date, tz, { weekday:'long', month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short' });
        $('#receipt-timezone').textContent = tz.replaceAll('_', ' ');
        if (data.priority) $('#receipt-priority').textContent = String(data.priority).slice(0,100);
        const audience = audiences.get(data.audience);
        if (audience) {
          $('#receipt-audience').textContent = audience.label;
          $('#receipt-audience-row').hidden = false;
          $('#next-demo-agenda').textContent = audience.agenda;
        }
      }
    } else {
      $('#confirmation-lede').textContent = 'This is the scheduling preview page. No sample time has been selected and no appointment has been booked. Return to the calendar to explore the complete experience.';
    }
  }
})();
