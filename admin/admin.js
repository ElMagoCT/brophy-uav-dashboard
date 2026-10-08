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
  function api(method, path, body, headers) {
    var opt = { method: method, cache: 'no-store', headers: headers || {} };
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
    sha256Hex(pw).then(function (h) { S.keyHex = h; return importKey(h); }).then(function (k) {
      S.key = k; el('pw').value = ''; pw = null;
      el('signin').hidden = true; el('console').hidden = false;
      el('who').textContent = 'Signed in · password kept in this tab only';
      drawTabs(); drawActions(); loadStatus(); drawApprovals(); showView(); loadReview(true);
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
    var ap = location.hash === '#approvals', rv = location.hash === '#review';
    el('approvals').hidden = !ap; el('review').hidden = !rv; el('kiosks').hidden = ap || rv;
    el('vKiosks').className = (ap || rv) ? '' : 'on'; el('vApprovals').className = ap ? 'on' : ''; el('vReview').className = rv ? 'on' : '';
    if ((ap || rv) && !ROSTER) loadRoster();
    if (rv && S.key) loadReview();
  }
  window.addEventListener('hashchange', showView);
  function drawApprovals() {
    if (!window.FS) return;
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
    el('apPilot').addEventListener('change', showHas);
    el('apAward').onclick = function () { award('earned'); };
    el('apRevoke').onclick = function () { if (window.confirm('Revoke this badge from the pilot? Only do this for a mistake.')) award('revoked'); };
  }
  // What is already on file for the typed pilot.
  function showHas() {
    var pilot = el('apPilot').value.trim(); el('apHas').textContent = '';
    if (pilot.length < 2) return;
    api('GET', '/api/award?pilot=' + encodeURIComponent(pilot)).then(function (j) {
      var aw = j.awards && j.awards.badges ? j.awards.badges : {};
      var earned = Object.keys(aw).filter(function (k) { return aw[k].status === 'earned'; });
      el('apHas').textContent = earned.length ? 'On file: ' + earned.map(badgeName).join(', ') : 'No sign-offs on file yet.';
    }).catch(function (e) { el('apHas').textContent = e.message; });
  }
  function badgeName(id) { var b = FS.BADGES.filter(function (x) { return x.id === id; })[0]; return b ? b.name : id; }
  // The badge rules a sign-off must respect, from the kiosk snapshot
  // (data.json: tier, badges, totalMs). Returns null (fine), {stop: msg}
  // (refuse) or {ask: msg} (the snapshot cannot tell - ask the instructor).
  //   minTier  (2026-10-06): Mentor is for Tier 2 pilots
  //   minHours (2026-10-07): Sim Flight is judged only after 5 sim hours
  //   checkpoint (2026-10-08): a tier's checkpoint needs the rest of the tier;
  //            asked rather than refused, because an approval filed a minute
  //            ago may not be in the snapshot yet - and the kiosks will not
  //            count it until the tier is done anyway
  function rosterPilot(s) { return (ROSTER && ROSTER.pilots || []).filter(function (p) { return FS.slug(p.name) === s; })[0]; }
  function checkRules(pilot, bd) {
    if (!bd) return null;
    var rp = rosterPilot(FS.slug(pilot));
    if (bd.minTier != null) {
      if (rp && rp.tier != null && rp.tier < bd.minTier) return { stop: bd.name + ' is for Tier ' + bd.minTier + ' pilots - ' + pilot + ' is on Tier ' + rp.tier + '. Not filed.' };
      if (!rp || rp.tier == null) return { ask: 'The kiosk has not published ' + pilot + '’s tier. ' + bd.name + ' is for Tier ' + bd.minTier + ' pilots, and it will not count until they are one. File it anyway?' };
    }
    if (bd.minHours) {
      var hrs = rp ? (rp.totalMs || 0) / 3600000 : 0;
      if (hrs < bd.minHours) return { stop: bd.name + ' needs ' + bd.minHours + ' h in the sim before it can be judged - ' + pilot + ' has ' + hrs.toFixed(1) + ' h at the kiosk. Not filed.' };
    }
    if (bd.checkpoint) {
      var held = (rp && rp.badges) || [];
      var missing = FS.mates(bd).filter(function (m) { return held.indexOf(m.id) < 0; });
      if (missing.length) return { ask: bd.name + ' is the checkpoint for its tier. The kiosk snapshot shows ' + pilot + ' still needs: ' +
        missing.map(function (m) { return m.name; }).join(', ') + '. It will not count until those are done. File it anyway?' };
    }
    return null;
  }
  // Sign the decision with the instructor password (same key as commands) and
  // file it. Signature: HMAC over "v1a\n<slug>\n<badge>\n<status>\n<at>".
  function fileAward(pilot, badge, status, note, evidence) {
    var at = Date.now(), s = FS.slug(pilot);
    return hmac('v1a\n' + s + '\n' + badge + '\n' + status + '\n' + at).then(function (sig) {
      return api('POST', '/api/award', { pilot: pilot, badge: badge, status: status, at: at, note: note, evidence: evidence, sig: sig });
    });
  }
  function award(status) {
    var pilot = el('apPilot').value.trim(), badge = el('apBadge').value, note = el('apNote').value.trim();
    if (pilot.length < 2) { el('apPilot').focus(); return; }
    var msg = el('apMsg');
    var bd = FS.BADGES.filter(function (x) { return x.id === badge; })[0];
    if (status === 'earned') {
      var rule = checkRules(pilot, bd);
      if (rule && rule.stop) { msg.textContent = rule.stop; return; }
      if (rule && rule.ask && !window.confirm(rule.ask)) { msg.textContent = 'Not filed.'; return; }
    }
    msg.textContent = 'signing…';
    fileAward(pilot, badge, status, note, ['dm']).then(function () {
      msg.textContent = (status === 'earned' ? 'Approved: ' : 'Revoked: ') + badgeName(badge) + ' for ' + pilot + ' · on file; the kiosks pick it up on their next sync.';
      showHas(); ROSTER = null; loadRoster();
    }).catch(function (e) { msg.textContent = 'Could not file it: ' + e.message; });
  }

  // ---------------------------------------------------------------- photo review (2026-10-08)
  // Pilots submit photos from flightschool/; the club API keeps them in the
  // private control repo. Reading the queue and deciding needs the review key
  // = hex SHA-256 of the instructor password (S.keyHex), sent as a header and
  // checked by the API against REVIEW_KEY_HASH (its SHA-256). Pass = the signed
  // award above plus the review record; Fail = the review record only.
  function reviewHeaders() { return { 'X-Review-Key': S.keyHex || '' }; }
  function loadReview(countOnly) {
    if (!S.keyHex) return;
    if (!countOnly) el('rvMsg').textContent = 'Loading…';
    api('GET', '/api/submission?review=1', null, reviewHeaders()).then(function (j) {
      var items = j.items || [];
      el('rvCount').textContent = items.length ? String(items.length) : '';
      el('rvSetup').hidden = true;
      if (countOnly) return;
      el('rvMsg').textContent = items.length ? items.length + ' photo' + (items.length === 1 ? '' : 's') + ' waiting, oldest first.' : 'Nothing waiting for review.';
      drawReview(items);
    }).catch(function (e) {
      if (e.status === 503) {
        sha256Hex(S.keyHex).then(function (h) {
          var box = el('rvSetup'); box.hidden = false; box.textContent = '';
          var p1 = document.createElement('div');
          p1.textContent = 'Photo review is not set up yet. On the brophy-uav-api Netlify site, add the environment variable REVIEW_KEY_HASH with this value, then redeploy (it is a hash of a hash of the instructor password - safe to paste):';
          var c = document.createElement('code'); c.textContent = h;
          box.appendChild(p1); box.appendChild(c);
        });
        if (!countOnly) el('rvMsg').textContent = '';
        return;
      }
      if (!countOnly) el('rvMsg').textContent = 'Could not load the queue: ' + e.message;
    });
  }
  function drawReview(items) {
    var list = el('rvList'); list.textContent = '';
    items.forEach(function (it) {
      var bd = FS.BADGES.filter(function (x) { return x.id === it.badge; })[0];
      var card = document.createElement('div'); card.className = 'rv';
      var ph = document.createElement('div'); ph.className = 'ph'; ph.textContent = 'Loading photo…';
      var who = document.createElement('div'); who.innerHTML = '<b></b> · <span></span>';
      who.querySelector('b').textContent = it.pilot; who.querySelector('span').textContent = bd ? bd.name : it.badge;
      var meta = document.createElement('div'); meta.className = 'meta';
      meta.textContent = new Date(it.at).toLocaleString() + (it.note ? ' · “' + it.note + '”' : '');
      var rule = checkRules(it.pilot, bd), warn = null;
      if (rule) { warn = document.createElement('div'); warn.className = 'warn'; warn.textContent = rule.stop || rule.ask.replace(/ File it anyway\?$/, ''); }
      var note = document.createElement('input'); note.placeholder = 'Note to the pilot (say why, if it fails)'; note.maxLength = 300;
      var row = document.createElement('div'); row.className = 'row';
      var pass = document.createElement('button'); pass.className = 'primary'; pass.textContent = 'Pass';
      var fail = document.createElement('button'); fail.className = 'danger'; fail.textContent = 'Fail';
      row.appendChild(pass); row.appendChild(fail);
      [ph, who, meta].concat(warn ? [warn] : []).concat([note, row]).forEach(function (n) { card.appendChild(n); });
      list.appendChild(card);
      api('GET', '/api/submission?photo=' + encodeURIComponent(it.photo), null, reviewHeaders()).then(function (j) {
        var img = document.createElement('img'); img.alt = 'photo from ' + it.pilot; img.src = 'data:' + (j.type || 'image/jpeg') + ';base64,' + j.base64;
        img.onclick = function () { ph.classList.toggle('big'); };
        ph.textContent = ''; ph.appendChild(img);
      }).catch(function (e) { ph.textContent = 'Could not load the photo: ' + e.message; });
      function decide(result) {
        pass.disabled = fail.disabled = true;
        var first = Promise.resolve();
        if (result === 'pass') {
          var r = checkRules(it.pilot, bd);
          if (r && r.stop) { window.alert(r.stop.replace(/ Not filed\.$/, ' Fail it with a note, or wait.')); pass.disabled = fail.disabled = false; return; }
          if (r && r.ask && !window.confirm(r.ask)) { pass.disabled = fail.disabled = false; return; }
          first = fileAward(it.pilot, it.badge, 'earned', 'photo review' + (note.value.trim() ? ': ' + note.value.trim() : ''), ['photo:' + it.id]);
        }
        first.then(function () {
          return api('POST', '/api/submission', { action: 'review', pilot: it.pilot, id: it.id, result: result, note: note.value.trim() }, reviewHeaders());
        }).then(function () {
          var d = document.createElement('div'); d.className = 'done ' + result;
          d.textContent = result === 'pass' ? 'Passed - the badge is on file; the kiosks pick it up on their next sync.' : 'Failed - the pilot sees your note and can send a new photo.';
          row.replaceWith(d); note.disabled = true;
          var n = +(el('rvCount').textContent || 0) - 1; el('rvCount').textContent = n > 0 ? String(n) : '';
          if (result === 'pass') { ROSTER = null; loadRoster(); }
        }).catch(function (e) {
          pass.disabled = fail.disabled = false;
          window.alert('Could not record it: ' + e.message);
        });
      }
      pass.onclick = function () { decide('pass'); };
      fail.onclick = function () { decide('fail'); };
    });
  }
  function badgeInfo() {
    var b = FS.BADGES.filter(function (x) { return x.id === el('apBadge').value; })[0];
    el('apBadgeInfo').textContent = b ? ((b.minTier != null ? 'Tier ' + b.minTier + ' pilots only. ' : '') + (b.minHours ? 'Only after ' + b.minHours + ' h in the sim. ' : '') + (b.tier === 'el' ? 'Bonus badge. ' : '') + b.do + (b.standard ? ' — Standard: ' + b.standard : '')) : '';
  }
  function loadRoster() {
    fetch('../data.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
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
        s.textContent = badges.length ? badges.map(badgeName).join(' · ')
                                      : (Math.round((p.totalMs || 0) / 360000) / 10) + ' h in the sim · no badges published by the kiosk';
        div.appendChild(b); div.appendChild(s); box.appendChild(div);
      });
      el('apRosterNote').textContent = (any ? 'From the kiosk\'s last published snapshot (' + (d.generatedIso || '').slice(0, 16).replace('T', ' ') + ').'
        : 'The kiosk is not publishing badges yet (Flight School v2, Phase 3). Hours shown instead.') + ' Type a name above to see the instructor decisions on file for them.';
    }).catch(function (e) { el('apRosterNote').textContent = 'Could not load data.json: ' + e.message; });
  }

  // ---------------------------------------------------------------- boot
  el('app').hidden = false;
  el('go').onclick = signIn;
  el('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') signIn(); });
  el('refresh').onclick = loadStatus;
  el('rvRefresh').onclick = function () { loadReview(); };
  el('signout').onclick = signOut;
})();
