/* gs-web.js - lets the kiosk's Ground School run on the public website.

   The course app (gs-app.js) talks to the kiosk bridge over three endpoints.
   There is no bridge on the web, so this file answers those three calls from
   localStorage instead. It is loaded BEFORE gs-app.js and changes nothing in
   it: gs-app.js is copied verbatim from C:\BrophyUAV by Publish-GroundSchool.ps1
   and must stay identical to the kiosk's copy.

   Progress made here lives in THIS browser only. It never reaches the kiosks
   or the leaderboard - the site is one-directional by design (the kiosk
   publishes; nothing flows back). */
(function(){
  var KEY = 'gsWebProfile.v1';
  var realFetch = window.fetch.bind(window);

  function load(){
    try{ var p = JSON.parse(localStorage.getItem(KEY)); if(p && p.id) return p; }catch(e){}
    var p2 = { id:'web_' + Math.random().toString(36).slice(2,12), name: 'You (saved on this device)',
               groundSchool:{ lessons:{}, progressPct:0, updated:0 }, created:Date.now(), lastSeen:Date.now() };
    save(p2);
    return p2;
  }
  function save(p){ try{ localStorage.setItem(KEY, JSON.stringify(p)); }catch(e){} }
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
    var u = String(url);
    if(u.indexOf('/api/') !== 0) return realFetch(url, opts);
    if(u === '/api/active') return reply({ profile: load() });
    if(u === '/api/groundschool/catalog') return reply(catalog());
    if(u === '/api/groundschool/lesson'){
      var b = {}; try{ b = JSON.parse(opts && opts.body || '{}'); }catch(e){}
      return reply(lesson(b));
    }
    return reply({ ok:false });
  };
})();
