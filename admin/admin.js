/* Brophy UAV instructor console - see C:\BrophyUAV\remote\REMOTE.md.

   Talks ONLY to api.github.com, to the private repo below. It holds no secret
   of its own: the admin brings a GitHub token (kept in sessionStorage, this tab
   only) and the instructor password (hashed on the spot, kept in memory only,
   never sent anywhere). Every command is signed with
     HMAC-SHA256(key = hex SHA-256(password), "v1\n"+machine+"\n"+id+"\n"+action+"\n"+args+"\n"+issuedAt)
   and the kiosk agent refuses anything that does not verify. Results and
   status come back signed the same way, so a forged reply shows as unverified. */
(function () {
  'use strict';
  if (window.top !== window.self) { document.body.textContent = ''; return; }   // no framing / clickjacking

  // The club API (brophy-uav-api, Netlify Functions) holds the GitHub token for
  // the private control repo. This page only ever sends signed commands to it
  // and reads signed answers back; the instructor password never leaves here.
  var API = 'https://brophy-uav-api.netlify.app';
  var MACHINES = ['KIOSK-A', 'KIOSK-B'];

  var ACTIONS = [
    { a: 'status',            t: 'Status' },
    { a: 'pilots',            t: 'Pilots & hours' },
    { a: 'kiosk.start',       t: 'Start kiosk' },
    { a: 'kiosk.home',        t: 'Send pilot home', confirm: 'Close the running sim and go back to the hangar?' },
    { a: 'kiosk.signout',     t: 'Sign pilot out',  confirm: 'Close any sim and sign the current pilot out?' },
    { a: 'kiosk.restart',     t: 'Restart kiosk',   confirm: 'Restart the kiosk? A running sim is closed (time is banked first).' },
    { a: 'kiosk.stop',        t: 'Stop kiosk',      confirm: 'Stop the kiosk like an instructor exit? Students will see the desktop until it is started again.', danger: true },
    { a: 'lab.open',          t: 'Open lab now',    args: function () { return { minutes: +el('openMins').value || 60 }; } },
    { a: 'lab.close',         t: 'Cancel open-now' },
    { a: 'remoteadmin',       t: 'Remote admin ON', args: function () { return { on: true }; }, danger: true,
      confirm: 'Remote admin mode unlocks the desktop AND lets the Windows key through for students. It expires by itself after 4 h. Turn it on?' },
    { a: 'remoteadmin',       t: 'Remote admin OFF', args: function () { return { on: false }; } },
    { a: 'sync.now',          t: 'Sync now' },
    { a: 'schedule.refresh',  t: 'Refresh schedule' },
    { a: 'dashboard.publish', t: 'Publish website' },
    { a: 'logs',              t: 'Show log', args: function () { return { name: el('logName').value, lines: 80 }; } }
  ];
  // Flight School sign-off (admin/#approvals). The kiosk's remote agent must
  // know these two actions; until it does, the kiosk answers "unknown action".
  var BADGE_ACTIONS = { award: 'badge.award', revoke: 'badge.revoke' };

  var S = { key: null, machine: MACHINES[0], pending: {} };
  function el(id) { return document.getElementById(id); }

  // ---------------------------------------------------------------- crypto
  var enc = new TextEncoder(), dec = new TextDecoder();
  function hex(buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i++) s += ('0' + b[i].toString(16)).slice(-2); return s; }
  function sha256Hex(text) { return crypto.subtle.digest('SHA-256', enc.encode(text)).then(hex); }
  function importKey(keyHex) { return crypto.subtle.importKey('raw', enc.encode(keyHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); }
  function hmac(text) { return crypto.subtle.sign('HMAC', S.key, enc.encode(text)).then(hex); }
  function randId() { var b = new Uint8Array(8); crypto.getRandomValues(b); return hex(b.buffer); }
  function b64utf8(s) { var bytes = enc.encode(s), bin = ''; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin); }
  function unb64utf8(b) { var bin = atob(b.replace(/\n/g, '')), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return dec.decode(u); }

  // ---------------------------------------------------------------- GitHub
  function api(method, path, body) {
    var opt = { method: method, cache: 'no-store', headers: {} };
    if (body) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    return fetch(API + path, opt).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }).then(function (j) {
        if (!r.ok || j.ok === false) { var e = new Error(j.error || ('API ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function readStatus(m) { return api('GET', '/api/status?machine=' + encodeURIComponent(m)).then(function (j) { return j.status; }); }
  function readResult(m, id) { return api('GET', '/api/result?machine=' + encodeURIComponent(m) + '&id=' + encodeURIComponent(id)).then(function (j) { return j.result; }); }

  // ---------------------------------------------------------------- sign in
  function signIn() {
    var pw = el('pw').value;
    el('signMsg').textContent = '';
    if (pw.length < 4) { el('signMsg').textContent = 'Enter the instructor password.'; return; }
    el('go').disabled = true;
    sha256Hex(pw).then(importKey).then(function (k) {
      S.key = k; el('pw').value = ''; pw = null;
      el('signin').hidden = true; el('console').hidden = false;
      el('who').textContent = 'Signed in · password kept in this tab only';
      drawTabs(); drawActions(); loadStatus(); drawApprovals(); showView();
    }).catch(function (e) { el('signMsg').textContent = e.message; }).then(function () { el('go').disabled = false; });
  }
  function signOut() { S.key = null; location.reload(); }

  // ---------------------------------------------------------------- UI
  function drawTabs() {
    var t = el('tabs'); t.textContent = '';
    MACHINES.forEach(function (m) {
      var b = document.createElement('button'); b.textContent = m; b.className = m === S.machine ? 'on' : '';
      b.onclick = function () { S.machine = m; drawTabs(); loadStatus(); };
      t.appendChild(b);
    });
    el('mName').textContent = S.machine;
  }
  function drawActions() {
    var box = el('actions'); box.textContent = '';
    ACTIONS.forEach(function (x) {
      var b = document.createElement('button'); b.textContent = x.t; if (x.danger) b.className = 'danger';
      b.onclick = function () { if (x.confirm && !window.confirm(S.machine + ': ' + x.confirm)) return; send(x.a, x.args ? x.args() : {}, x.t); };
      box.appendChild(b);
    });
  }
  function kv(label, val) {
    var d = document.createElement('div'), b = document.createElement('b');
    b.textContent = label; d.appendChild(b); d.appendChild(document.createTextNode(val == null ? '-' : String(val))); return d;
  }
  function setBadge(cls, text) { var b = el('verify'); b.className = 'badge ' + cls; b.textContent = text; }

  function loadStatus() {
    var m = S.machine, box = el('status');
    box.textContent = ''; box.appendChild(kv('status', 'loading…')); setBadge('', '');
    readStatus(m).then(function (s) {
      if (m !== S.machine) return;
      box.textContent = '';
      if (!s) { box.appendChild(kv('status', 'This kiosk has never reported. Is the remote agent installed?')); setBadge('warn', 'no status'); return; }
      if (!s.sig) { box.appendChild(kv('status', JSON.stringify(s).slice(0, 200))); setBadge('warn', 'unsigned'); return; }
      return hmac('v1s\n' + m + '\n' + s.data + '\n' + s.updated).then(function (sig) {
        var okSig = sig === s.sig;
        setBadge(okSig ? 'ok' : 'bad', okSig ? 'verified · password OK' : 'NOT verified: wrong password, or forged');
        var d = JSON.parse(s.data);
        box.appendChild(kv('Kiosk', d.kioskUp ? 'running' : 'stopped'));
        box.appendChild(kv('Pilot', d.pilot || (d.kioskUp ? 'nobody signed in' : '-')));
        box.appendChild(kv('Sim', d.activeSim || '-'));
        box.appendChild(kv('Lab', d.labClosed == null ? '-' : (d.labClosed ? 'closed' : 'open')));
        box.appendChild(kv('Today', d.todayLine));
        box.appendChild(kv('Pilots on roster', d.pilots));
        box.appendChild(kv('Remote admin', d.remoteAdmin ? 'ON (Windows key NOT blocked)' : 'off'));
        box.appendChild(kv('Agents', 'sync ' + (d.agents.sync ? '✓' : '✗') + ' · radio ' + (d.agents.vremote ? '✓' : '✗') + ' · light ' + (d.agents.rgb ? '✓' : '✗')));
        box.appendChild(kv('Sleeps after', d.sleepAcSec === 0 ? 'never' : (d.sleepAcSec ? Math.round(d.sleepAcSec / 60) + ' min' : '-')));
        box.appendChild(kv('Timezone', d.timezone));
        box.appendChild(kv('Code version', d.codeVersion));
        box.appendChild(kv('Up for', d.uptimeHours + ' h'));
        var age = Math.round((Date.now() - s.updated) / 60000);
        el('statusAge').textContent = 'Reported ' + (age < 1 ? 'just now' : age + ' min ago') + ' (heartbeat every 30 min; press Status for a fresh one).';
      });
    }).catch(function (e) { box.textContent = ''; box.appendChild(kv('error', e.message)); });
  }

  // ---------------------------------------------------------------- commands
  function send(action, args, label) {
    var m = S.machine, id = randId(), issuedAt = Date.now(), argsJson = JSON.stringify(args || {});
    var row = addResult(id, m, label);
    hmac('v1\n' + m + '\n' + id + '\n' + action + '\n' + argsJson + '\n' + issuedAt).then(function (sig) {
      return api('POST', '/api/command', { id: id, machine: m, action: action, args: argsJson, issuedAt: issuedAt, sig: sig });
    }).then(function () {
      setRow(row, 'st-wait', 'sent - waiting for the kiosk (≈15 s)…');
      poll(row, m, id, Date.now());
    }).catch(function (e) { setRow(row, 'st-bad', 'could not send: ' + e.message); });
  }
  function poll(row, m, id, since) {
    if (Date.now() - since > 180000) { setRow(row, 'st-bad', 'no answer after 3 min - is that kiosk on and online?'); return; }
    setTimeout(function () {
      readResult(m, id).then(function (r) {
        if (!r) { poll(row, m, id, since); return; }
        return hmac('v1r\n' + m + '\n' + id + '\n' + (r.ok ? '1' : '0') + '\n' + r.output + '\n' + r.finishedAt).then(function (sig) {
          var v = r.sig && sig === r.sig;
          setRow(row, r.ok ? 'st-ok' : 'st-bad', (r.ok ? 'done' : 'failed') + (v ? ' · verified' : ' · NOT verified'), r.output);
          if (m === S.machine) loadStatus();
        });
      }).catch(function () { poll(row, m, id, since); });
    }, 4000);
  }
  function addResult(id, m, label) {
    var list = el('results'); if (list.firstChild && list.firstChild.className === 'muted') list.textContent = '';
    var d = document.createElement('div'); d.className = 'res';
    var h = document.createElement('div'); h.className = 'h';
    var l = document.createElement('span'); l.textContent = m + ' · ' + label + ' · ' + new Date().toLocaleTimeString();
    var st = document.createElement('span'); st.className = 'st-wait'; st.textContent = 'signing…';
    h.appendChild(l); h.appendChild(st); d.appendChild(h);
    list.insertBefore(d, list.firstChild);
    return d;
  }
  function setRow(row, cls, text, output) {
    var st = row.querySelector('.h span:last-child'); st.className = cls; st.textContent = text;
    if (output != null) { var p = document.createElement('pre'); p.textContent = output; row.appendChild(p); }   // textContent: never HTML
  }

  // ---------------------------------------------------------------- approvals
  var ROSTER = null;
  function showView() {
    var ap = location.hash === '#approvals';
    el('approvals').hidden = !ap; el('kiosks').hidden = ap;
    el('vKiosks').className = ap ? '' : 'on'; el('vApprovals').className = ap ? 'on' : '';
    if (ap && !ROSTER) loadRoster();
  }
  window.addEventListener('hashchange', showView);
  function drawApprovals() {
    if (!window.FS) return;
    var ms = el('apMachine'); ms.textContent = '';
    MACHINES.forEach(function (m) { var o = document.createElement('option'); o.value = o.textContent = m; if (m === S.machine) o.selected = true; ms.appendChild(o); });
    var bs = el('apBadge'); bs.textContent = '';
    FS.TIERS.forEach(function (t) {
      var g = document.createElement('optgroup'); g.label = (t.n >= 0 ? 'Tier ' + t.n + ' · ' : '') + t.name;
      FS.BADGES.filter(function (b) { return b.tier === t.id && b.type !== 'auto'; }).forEach(function (b) {
        var o = document.createElement('option'); o.value = b.id;
        o.textContent = b.name + '  (' + { knowledge: 'quiz', bench: 'bench', witnessed: 'witnessed' }[b.type] + ')';
        g.appendChild(o);
      });
      bs.appendChild(g);
    });
    bs.onchange = badgeInfo; badgeInfo();
    el('apAward').onclick = function () { approve(BADGE_ACTIONS.award, 'Approve'); };
    el('apRevoke').onclick = function () { if (window.confirm('Revoke this badge from the pilot? Only do this for a mistake.')) approve(BADGE_ACTIONS.revoke, 'Revoke'); };
  }
  function badgeInfo() {
    var b = FS.BADGES.filter(function (x) { return x.id === el('apBadge').value; })[0];
    el('apBadgeInfo').textContent = b ? (b.do + (b.standard ? ' — Standard: ' + b.standard : '')) : '';
  }
  function approve(action, label) {
    var pilot = el('apPilot').value.trim(), badge = el('apBadge').value, note = el('apNote').value.trim();
    if (pilot.length < 2) { el('apPilot').focus(); return; }
    S.machine = el('apMachine').value; drawTabs();
    send(action, { pilot: pilot, badge: badge, note: note, evidence: ['dm'] }, label + ' · ' + badge + ' · ' + pilot);
    location.hash = '#kiosks';          // results list lives on the Kiosks view
  }
  function loadRoster() {
    fetch('../data.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      ROSTER = d;
      var dl = el('apPilots'); dl.textContent = '';
      (d.pilots || []).forEach(function (p) { var o = document.createElement('option'); o.value = p.name; dl.appendChild(o); });
      var box = el('apRoster'); box.textContent = '';
      var any = false;
      (d.pilots || []).forEach(function (p) {
        var div = document.createElement('div'), b = document.createElement('b'), s = document.createElement('span');
        b.textContent = p.name;
        if (p.tier != null) { var t = document.createElement('i'); t.className = 'tier'; t.textContent = 'T' + p.tier; b.appendChild(t); }
        var badges = p.badges || [];
        if (badges.length) any = true;
        s.textContent = badges.length ? badges.map(function (id) { var bb = FS.BADGES.filter(function (x) { return x.id === id; })[0]; return bb ? bb.name : id; }).join(' · ')
                                      : (Math.round((p.totalMs || 0) / 360000) / 10) + ' h in the sim · no badges published';
        div.appendChild(b); div.appendChild(s); box.appendChild(div);
      });
      el('apRosterNote').textContent = any ? 'From the kiosk\'s last published snapshot (' + (d.generatedIso || '').slice(0, 16).replace('T', ' ') + ').'
        : 'The kiosk is not publishing badges yet (Flight School v2, Phase 3). Hours shown instead.';
    }).catch(function (e) { el('apRosterNote').textContent = 'Could not load data.json: ' + e.message; });
  }

  // ---------------------------------------------------------------- boot
  el('app').hidden = false;
  el('go').onclick = signIn;
  el('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') signIn(); });
  el('refresh').onclick = loadStatus;
  el('signout').onclick = signOut;
})();
