/* ===========================================================================
   FPV GROUND SCHOOL - INPUT
   ---------------------------------------------------------------------------
   One job: hand every drill the same four numbers, whatever the student is
   actually holding.

       thr    0 .. 1     throttle. Does not self-centre.
       yaw   -1 .. 1     left negative
       pitch -1 .. 1     forward (nose down / move forward) positive
       roll  -1 .. 1     right positive

   TWO SOURCES

   1. A real transmitter in gamepad mode. This is the one that matters -
      muscle memory built on a keyboard does not transfer to gimbals, and
      muscle memory built on the student's own radio does.

      The problem is that no two radios agree on axis order. A FrSky in
      joystick mode, an ELRS handset over USB and a cheap trainer dongle all
      report a different order, and some invert. So there is no axis table in
      here. gs-fly-01 LEARNS the mapping - the student is asked to move each
      stick in turn, and whichever axis moves furthest is that channel. The
      result is kept in localStorage and reused by every later drill.

   2. The keyboard. W/S throttle, A/D yaw, arrows pitch and roll. Throttle
      RAMPS while held, because throttle is a position and not a button, and
      a keyboard cannot express a position.

   NOTHING in here talks to the bridge. It is all local.
   =========================================================================== */

var GSInput = (function(){

  var MAPKEY = 'brophy.gs.stickmap.v1';

  /* the learned mapping: channel -> {axis, sign, lo, hi} or null */
  var map = null;

  /* keyboard state */
  var keys = {};
  var kbThr = 0;          /* ramped throttle, 0..1 */
  var lastT = 0;

  /* deadzone applied to every self-centring channel. Gimbals rest a little
     off centre and a resting stick must read as zero, or a hover drill drifts
     on its own and the student is fighting a bug. */
  var DEAD = 0.06;

  /* ---------------------------------------------------------------------- */
  function load(){
    try{
      var raw = localStorage.getItem(MAPKEY);
      if(raw){ map = JSON.parse(raw); }
    }catch(e){ map = null; }
    return map;
  }
  function save(m){
    map = m;
    try{ localStorage.setItem(MAPKEY, JSON.stringify(m)); }catch(e){}
  }
  function clear(){
    map = null;
    try{ localStorage.removeItem(MAPKEY); }catch(e){}
  }
  function isMapped(){ return !!(map && map.thr && map.roll); }

  /* ---------------------------------------------------------------------- */
  /* the first gamepad that is actually connected */
  function pad(){
    if(!navigator.getGamepads) return null;
    var list = navigator.getGamepads();
    for(var i=0;i<list.length;i++){
      if(list[i] && list[i].connected && list[i].axes && list[i].axes.length >= 2) return list[i];
    }
    return null;
  }
  function hasPad(){ return !!pad(); }
  function padName(){ var p = pad(); return p ? (p.id || 'gamepad') : ''; }

  /* Raw axes as an array, or null.

     Memoised for one frame's worth of time. navigator.getGamepads() hands back
     a fresh snapshot on every call and this was being called two or three times
     per frame - axes(), source(), and the course's own idle sampler - each one
     re-snapshotting and re-copying the array for the same instant.

     8 ms is under one frame at 120 Hz, so no caller can observe a stale value
     within a frame. The calibrator reads at frame rate and is unaffected, and
     the idle sampler in gs-app.js reads every 500 ms, so its samples are always
     genuinely fresh. Do not raise this without rechecking both. */
  var AXES_TTL_MS = 8;
  var axCache = null, axCacheAt = -1;

  function nowMs(){
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  function rawAxes(){
    var t = nowMs();
    /* null is a legitimate cached value (no pad), so only the age matters */
    if(axCacheAt >= 0 && (t - axCacheAt) < AXES_TTL_MS) return axCache;
    var p = pad();
    if(!p){ axCache = null; axCacheAt = t; return null; }
    var out = [];
    for(var i=0;i<p.axes.length;i++){ out.push(p.axes[i]); }
    axCache = out; axCacheAt = t;
    return out;
  }

  function dz(v){
    if(v > -DEAD && v < DEAD) return 0;
    /* rescale so the usable range still reaches full deflection */
    var s = v > 0 ? (v - DEAD) : (v + DEAD);
    return Math.max(-1, Math.min(1, s / (1 - DEAD)));
  }

  /* read one mapped channel out of the raw axes */
  function chan(ax, m){
    if(!m || m.axis == null || ax == null || ax.length <= m.axis) return 0;
    return ax[m.axis] * (m.sign || 1);
  }

  /* ---------------------------------------------------------------------- */
  /* THE ONE FUNCTION EVERY DRILL CALLS */
  function axes(){
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    var dt  = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
    lastT = now;

    var ax = rawAxes();

    if(ax && isMapped()){
      /* throttle: -1..1 on the gimbal becomes 0..1, no deadzone (it is a
         position, and zero must mean the stick is genuinely at the bottom) */
      var t = chan(ax, map.thr);
      return {
        thr:   Math.max(0, Math.min(1, (t + 1) / 2)),
        yaw:   dz(chan(ax, map.yaw)),
        pitch: dz(chan(ax, map.pitch)),
        roll:  dz(chan(ax, map.roll)),
        source:'stick'
      };
    }

    /* ---- keyboard ---- */
    var up   = keys['w'] || keys['W'];
    var down = keys['s'] || keys['S'];
    var RATE = 0.85;                    /* full travel in ~1.2 s */
    if(up)   kbThr += RATE * dt;
    if(down) kbThr -= RATE * dt;
    if(!up && !down){
      /* no self-centring: a keyboard throttle that sprang back would make the
         hover drill impossible. It stays where it was left. */
    }
    kbThr = Math.max(0, Math.min(1, kbThr));

    var yaw   = (keys['d'] || keys['D'] ? 1 : 0) - (keys['a'] || keys['A'] ? 1 : 0);
    var roll  = (keys['ArrowRight'] ? 1 : 0) - (keys['ArrowLeft'] ? 1 : 0);
    var pitch = (keys['ArrowUp'] ? 1 : 0) - (keys['ArrowDown'] ? 1 : 0);

    return { thr:kbThr, yaw:yaw, pitch:pitch, roll:roll, source:'keys' };
  }

  /* let a drill put the keyboard throttle somewhere before it starts */
  function presetThrottle(v){ kbThr = Math.max(0, Math.min(1, v)); }

  /* which source will be used right now */
  function source(){ return (rawAxes() && isMapped()) ? 'stick' : 'keys'; }

  /* ---------------------------------------------------------------------- */
  /* CALIBRATION - used by gs-fly-01.

     Sample the resting position of every axis, then for each channel in turn
     ask for a full deflection and watch which axis travelled furthest from
     its rest value. That axis is the channel; the direction of travel is the
     sign. Works on any radio without a lookup table.                        */

  function Calibrator(){
    this.rest = null;
    this.result = {};
    this.used = {};
  }
  Calibrator.prototype.takeRest = function(){
    var ax = rawAxes();
    if(!ax) return false;
    this.rest = ax.slice();
    return true;
  };
  /* Called every frame while a channel is being captured. Returns the best
     candidate so far as {axis, sign, travel} or null. */
  Calibrator.prototype.watch = function(){
    var ax = rawAxes();
    if(!ax || !this.rest) return null;
    var best = null;
    for(var i=0;i<ax.length && i<this.rest.length;i++){
      if(this.used[i]) continue;                  /* already claimed */
      var d = ax[i] - this.rest[i];
      if(Math.abs(d) < 0.45) continue;            /* must be a real movement */
      if(!best || Math.abs(d) > Math.abs(best.travel)){
        best = { axis:i, sign: d > 0 ? 1 : -1, travel:d };
      }
    }
    return best;
  };
  /* lock a channel in */
  Calibrator.prototype.commit = function(chName, cand){
    this.result[chName] = { axis:cand.axis, sign:cand.sign };
    this.used[cand.axis] = true;
  };
  Calibrator.prototype.finish = function(){
    /* Only save a mapping that covers all four. A partial map would make
       later drills read zero on a channel and look broken. */
    if(this.result.thr && this.result.yaw && this.result.pitch && this.result.roll){
      save(this.result);
      return true;
    }
    return false;
  };

  /* ---------------------------------------------------------------------- */
  /* keyboard plumbing. Capture arrows and WASD so the page does not scroll
     underneath a drill, but leave everything else alone - Escape and Tab in
     particular still have to work. */
  var HANDLED = { 'ArrowUp':1,'ArrowDown':1,'ArrowLeft':1,'ArrowRight':1,
                  'w':1,'a':1,'s':1,'d':1,'W':1,'A':1,'S':1,'D':1,' ':1 };

  window.addEventListener('keydown', function(e){
    if(e.repeat) return;
    keys[e.key] = true;
    if(HANDLED[e.key] && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName||''))) e.preventDefault();
  });
  window.addEventListener('keyup', function(e){
    keys[e.key] = false;
    if(HANDLED[e.key] && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName||''))) e.preventDefault();
  });
  /* a lost focus must not leave a key stuck down - that is a held throttle */
  window.addEventListener('blur', function(){ keys = {}; });

  /* A connect or disconnect invalidates the axis cache immediately rather than
     waiting out its 8 ms. (These listeners were previously empty stubs.) */
  window.addEventListener('gamepadconnected',    function(){ axCacheAt = -1; });
  window.addEventListener('gamepaddisconnected', function(){ axCacheAt = -1; });

  load();

  return {
    axes:axes, source:source, hasPad:hasPad, padName:padName, rawAxes:rawAxes,
    isMapped:isMapped, clearMap:clear, loadMap:load,
    presetThrottle:presetThrottle,
    Calibrator:Calibrator,
    keyDown:function(k){ return !!keys[k]; }
  };
})();
