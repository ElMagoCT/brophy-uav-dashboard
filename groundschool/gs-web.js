/* gs-web.js - lets the kiosk's Ground School run on the public website.

   The course app (gs-app.js) talks to the kiosk bridge over three endpoints.
   There is no bridge on the web, so this file answers those three calls from
   localStorage instead. It is loaded BEFORE gs-app.js and changes nothing in
   it: gs-app.js is copied verbatim from C:\BrophyUAV by Publish-GroundSchool.ps1
   and must stay identical to the kiosk's copy.

   Since 2026-10-04 progress is kept PER PILOT: the pilot picked on
   ../flightschool/ (localStorage fs.pilot.v1) owns a profile under
   gsWeb.profiles.v2[slug]. Flight School reads the same store to tick off the
   lessons inside each badge. Nobody picked -> a "Guest" profile on this device.
   The old single profile (gsWebProfile.v1) is migrated into the first pilot
   who signs in here, once, so nobody loses lessons they already did.

   Progress made here lives in THIS browser only. It never reaches the kiosks
   or the leaderboard - the site is one-directional by design (the kiosk
   publishes; nothing flows back). Instructors approve badges in ../admin/. */
(function(){
  var KEY_PILOT = 'fs.pilot.v1', KEY_ALL = 'gsWeb.profiles.v2', KEY_OLD = 'gsWebProfile.v1';
  var realFetch = window.fetch.bind(window);

  function slug(n){ return String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function get(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }
  function set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

  function pilot(){ var p = get(KEY_PILOT, null); return (p && p.name) ? { name:p.name, slug:p.slug || slug(p.name) } : { name:'Guest (this device)', slug:'guest' }; }

  function load(){
    var who = pilot(), all = get(KEY_ALL, {});
    var p = all[who.slug];
    if(!p){
      // one-time migration of the pre-2026-10-04 single profile
      var old = get(KEY_OLD, null);
      if(old && old.groundSchool && who.slug !== 'guest' && !all.__migrated){
        p = old; all.__migrated = true;
        try{ localStorage.removeItem(KEY_OLD); }catch(e){}
      } else {
        p = { groundSchool:{ lessons:{}, progressPct:0, updated:0 }, created:Date.now() };
      }
    }
    p.id = 'web_' + who.slug; p.name = who.name; p.lastSeen = Date.now();
    all[who.slug] = p; set(KEY_ALL, all);
    return p;
  }
  function save(p){ var all = get(KEY_ALL, {}); all[pilot().slug] = p; set(KEY_ALL, all); }
  function reply(obj){
    return Promise.resolve(new Response(JSON.stringify(obj), { status:200, headers:{'Content-Type':'application/json'} }));
  }
  function catalog(){
    var ids = (window.GS_COURSE || []).map(function(l, i){ return { id:l.id, module:l.mod, order:i, title:l.title }; });
    return { passScore:80, lessons:ids };
  }

  /* Mirrors the bridge's /api/groundschool/lesson rules (Start-Kiosk.ps1):
     best score kept, attempts counted on entry to in-progress, time clamped. */
  function lesson(body){
    var p = load();
    var L = p.groundSchool.lessons[body.lessonId] ||
            { status:'not-started', score:0, attempts:0, firstStarted:0, completed:0, timeMs:0 };
    var was = L.status, now = Date.now();
    if(body.status === 'in-progress' && (was === 'not-started' || was === 'complete')) L.attempts++;
    if(was === 'not-started' && body.status !== 'not-started' && !L.firstStarted) L.firstStarted = now;
    if(body.score != null && body.score > L.score) L.score = Math.max(0, Math.min(100, body.score));
    if(body.timeMsDelta > 0) L.timeMs += Math.min(3600000, body.timeMsDelta);
    if(body.status === 'complete' && was !== 'complete') L.completed = now;
    if(body.status === 'not-started'){ L.score = 0; L.completed = 0; }
    L.status = body.status;
    p.groundSchool.lessons[body.lessonId] = L;
    var all = window.GS_COURSE || [], done = 0;
    all.forEach(function(l){ var r = p.groundSchool.lessons[l.id]; if(r && r.status === 'complete') done++; });
    p.groundSchool.progressPct = all.length ? Math.round(done * 100 / all.length) : 0;
    p.groundSchool.updated = now; p.lastSeen = now;
    save(p);
    return { ok:true, profile:p };
  }

  window.fetch = function(url, opts){
    /* gs-app.js prefixes its API constant (the bridge's origin on the kiosk,
       the page origin here); strip anything up to "/api/" and match the path. */
    var u = String(url), k = u.indexOf('/api/');
    if(k < 0) return realFetch(url, opts);
    u = u.slice(k);
    if(u === '/api/active') return reply({ profile: load() });
    if(u === '/api/groundschool/catalog') return reply(catalog());
    if(u === '/api/groundschool/lesson'){
      var b = {}; try{ b = JSON.parse(opts && opts.body || '{}'); }catch(e){}
      return reply(lesson(b));
    }
    return reply({ ok:false });
  };

  /* A thin strip so the pilot can see whose progress this is, and get back to
     Flight School to change it. Injected, not in the kiosk's markup. */
  function strip(){
    var who = pilot(), guest = who.slug === 'guest';
    var d = document.createElement('div');
    d.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;justify-content:center;gap:14px;align-items:center;' +
      'padding:7px 14px;background:#1f3350;color:#f2ece0;font:14px/1.3 Barlow,system-ui,sans-serif;letter-spacing:.02em');
    d.innerHTML = '<span>' + (guest ? 'Progress is saved on this device as <b>Guest</b>.' : 'Lessons save on this device for <b></b>.') + '</span>' +
      '<a href="../flightschool/" style="color:#f0a91a;font-family:\'Share Tech Mono\',monospace;font-size:13px;letter-spacing:.12em;text-transform:uppercase">' +
      (guest ? 'Pick your pilot \u2192' : 'Flight School \u2192') + '</a>';
    if(!guest) d.querySelector('b').textContent = who.name;
    document.body.appendChild(d);
    document.body.style.paddingBottom = '44px';
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', strip); else strip();
})();
