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

  var OWNER = 'ElMagoCT', REPO = 'brophy-uav-control', BRANCH = 'main';
  var MACHINES = ['KIOSK-A', 'KIOSK-B'];
  var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/';

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

  var S = { token: null, key: null, machine: MACHINES[0], pending: {} };
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
  function gh(method, path, body) {
    var opt = { method: method, cache: 'no-store', headers: {
      'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + S.token, 'X-GitHub-Api-Version': '2022-11-28' } };
    if (body) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    var url = path.indexOf('https://') === 0 ? path : API + path + (method === 'GET' ? ('?ref=' + BRANCH + '&t=' + Date.now()) : '');
    return fetch(url, opt).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) return r.text().then(function (t) { var e = new Error('GitHub ' + r.status + ': ' + t.slice(0, 160)); e.status = r.status; throw e; });
      return r.json();
    });
  }
  function readJson(path) { return gh('GET', path).then(function (j) { return j && j.content ? JSON.parse(unb64utf8(j.content)) : null; }); }

  // ---------------------------------------------------------------- sign in
  function signIn() {
    var tok = el('tok').value.trim(), pw = el('pw').value;
    el('signMsg').textContent = '';
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(tok)) { el('signMsg').textContent = 'That does not look like a GitHub token.'; return; }
    if (pw.length < 4) { el('signMsg').textContent = 'Enter the instructor password.'; return; }
    el('go').disabled = true;
    S.token = tok;
    gh('GET', 'https://api.github.com/repos/' + OWNER + '/' + REPO).then(function (repo) {
      if (!repo) throw new Error('This token cannot see ' + OWNER + '/' + REPO + '.');
      if (!repo.private) throw new Error('Refusing: ' + REPO + ' is PUBLIC. It must be private.');
      if (repo.permissions && !repo.permissions.push) throw new Error('This token can read but not write the control repo.');
      return sha256Hex(pw).then(importKey);
    }).then(function (k) {
      S.key = k; el('pw').value = ''; pw = null;
      try { sessionStorage.setItem('bu.tok', tok); } catch (e) {}
      el('tok').value = '';
      el('signin').hidden = true; el('console').hidden = false;
      el('who').textContent = 'Signed in · token kept in this tab only';
      drawTabs(); drawActions(); loadStatus();
    }).catch(function (e) {
      S.token = null;
      el('signMsg').textContent = e.status === 401 ? 'GitHub rejected the token (expired or wrong).' : e.message;
    }).then(function () { el('go').disabled = false; });
  }
  function signOut() {
    try { sessionStorage.removeItem('bu.tok'); } catch (e) {}
    S.token = null; S.key = null; location.reload();
  }

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
    readJson('status/' + m + '.json').then(function (s) {
      if (m !== S.machine) return;
      box.textContent = '';
      if (!s) { box.appendChild(kv('status', 'This kiosk has never reported. Is the remote agent installed?')); setBadge('warn', 'no status'); return; }
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
      var body = JSON.stringify({ v: 1, id: id, machine: m, action: action, args: argsJson, issuedAt: issuedAt, sig: sig }, null, 2);
      return gh('PUT', 'commands/' + m + '/' + id + '.json', { message: 'console: ' + m + ' ' + action, content: b64utf8(body), branch: BRANCH });
    }).then(function () {
      setRow(row, 'st-wait', 'sent - waiting for the kiosk (≈15 s)…');
      poll(row, m, id, Date.now());
    }).catch(function (e) { setRow(row, 'st-bad', 'could not send: ' + e.message); });
  }
  function poll(row, m, id, since) {
    if (Date.now() - since > 180000) { setRow(row, 'st-bad', 'no answer after 3 min - is that kiosk on and online?'); return; }
    setTimeout(function () {
      readJson('results/' + m + '/' + id + '.json').then(function (r) {
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

  // ---------------------------------------------------------------- boot
  el('app').hidden = false;
  el('go').onclick = signIn;
  el('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') signIn(); });
  el('refresh').onclick = loadStatus;
  el('signout').onclick = signOut;
  try { var t = sessionStorage.getItem('bu.tok'); if (t) el('tok').value = t; } catch (e) {}
})();
