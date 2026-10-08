#!/usr/bin/env python3
"""Generates the four Pilot Path map sheets (03..06), one tier per sheet.

    python3 gen_map.py          # writes 03-map-tier0.html .. 06-map-tier3.html
    python3 build.py 03-map-tier0 04-map-tier1 05-map-tier2 06-map-tier3

Every word on a badge card comes from ../../flightschool/badges.js (read with
node), so the posters can never drift from the website again. Change a badge
there, rerun this, rebuild.

Layout (2026-10-07): an organic winding trail. Sheets alternate direction so
they join when hung side by side: Tier 0 and Tier 2 run DOWN from the top-left
to a gate at the bottom-right; Tier 1 and the Event Pilot sheet climb UP from
the bottom-left (Tier 1 to a gate at the top-right, Tier 3 to the summit).
Cards hang off the trail on alternating sides, staggered, varied in width,
drifted outward and slightly tilted (fixed pseudo-random per sheet, so every
rebuild looks the same). The trail S-curves through a clear centre channel
and makes one loop in the biggest gap.

The sheet's own script does the layout with real card heights: it keeps
cards clear of every label, spreads spare height between cards, scales the
card text down a step if a sheet is crowded, draws the trail through the
pins, and sets <body data-trail> to "ok k=..." or "overflow Npx". Headless
Chrome runs it before printing (build.py's virtual time budget).
"""
import html, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BADGES_JS = os.path.normpath(os.path.join(HERE, '..', '..', 'flightschool', 'badges.js'))

# ----------------------------------------------------------------- the data
def load_fs():
    node = os.path.expanduser('~/.local/node-v24.19.0-darwin-arm64/bin/node')
    if not os.path.exists(node):
        node = shutil.which('node') or sys.exit('node is needed to read badges.js')
    js = ("global.window={};eval(require('fs').readFileSync(%s,'utf8'));"
          "var F=window.FS;process.stdout.write(JSON.stringify({TIERS:F.TIERS,TRACK:F.TRACK,"
          "BADGES:F.BADGES,LESSON_TITLES:F.LESSON_TITLES,PASS:F.PASS,SIM_HOURS:F.SIM_HOURS}))") % json.dumps(BADGES_JS)
    return json.loads(subprocess.run([node, '-e', js], capture_output=True, text=True, check=True).stdout)

TRACK_COLOR = {'flight': 'var(--sky)', 'build': 'var(--amber)', 'know': 'var(--green)', 'crew': 'var(--violet)'}
TYPE_NAME = {'knowledge': 'Quiz', 'bench': 'Bench', 'witnessed': 'Witnessed', 'auto': 'Automatic'}
TAGS = {'cinematography': 'Filming', 'indoor-proximity': 'Racing', 'racing': 'Racing'}
WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

# Poster-only text (the website has its own shorter versions).
SHEETS = [
  dict(file='03-map-tier0', sheet=1, tier='t0', name='SIMULATOR', color='var(--sky)', dir='down',
       gear='FPV sim rigs in the IC · Liftoff · Micro Drones · SkyDive · FPV Labs · PicaSim',
       start=('START', 'Add your name at the kiosk'),
       gate=('GATE 1', 'Meteor 75 Pro unlocked', 'Tier 1 · Tiny Whoop')),
  dict(file='04-map-tier1', sheet=2, tier='t1', name='TINY WHOOP', color='var(--violet)', dir='up',
       gear='Meteor 75 Pro · sub-250 g · safe indoors',
       entry='From Tier 0', first_flight=True,
       gate=('GATE 2', 'Full-size unlocked', 'Tier 2 · Pavo 20 Pro · Cinebot 35 · 5-inch')),
  dict(file='05-map-tier2', sheet=3, tier='t2', name='FULL-SIZE', color='var(--rust)', dir='down',
       gear='Pavo 20 Pro · Cinebot 35 · 5-inch',
       entry='From Tier 1',
       gate=('GATE 3', 'Event Pilot', 'Tier 3 · the top')),
  dict(file='06-map-tier3', sheet=4, tier='el', name='EVENT PILOT', color='var(--green)', dir='up',
       gear='Any Tier 2 airframe at a school event · always with a spotter',
       entry='From Tier 2',
       summit=('EVENT PILOT', 'Cleared to fly in front of a crowd, with a spotter. Every Tier 2 badge earned, including Spotter, Cinematography and FAA TRUST.')),
]

# ----------------------------------------------------------------- helpers
def esc(s): return html.escape(str(s or ''), quote=True)

def short_step(s):
    """'Motors on — right screw length…' -> 'Motors on'. Bench steps are full
    sentences on the website; the poster lists them as a compact sequence."""
    cut = len(s)
    for sep in (' — ', ': ', ', ', ' (', ' - '):
        k = s.find(sep)
        if 0 < k < cut: cut = k
    return s[:cut].strip().rstrip('.')

def card_html(b, label, fs, pin):
    t = b['type']
    head = ('<div class="lab"><span>%s</span><span class="ty ty-%s">%s</span></div>'
            % (esc(label), t, TYPE_NAME[t]))
    body = '<div class="nm">%s</div><div class="ds">%s</div>' % (esc(b['name']), esc(b['do']))
    if t == 'knowledge':
        ls = b.get('lessons') or []
        items = ''.join('<li>%s%s</li>' % (esc(l['t']), ' <em>drill</em>' if l.get('drill') else '') for l in ls)
        how = ('<div class="how"><b>%d lessons, then the quiz</b><ol>%s</ol>'
               '<div class="ft">10 questions · %d %% passes · no sign-off needed · retake any time</div></div>'
               % (len(ls), items, fs['PASS']))
    elif t == 'bench':
        steps = [short_step(s) for s in (b.get('steps') or []) if not s.startswith('DM a photo')]
        seq = ' <i>›</i> '.join(esc(s) for s in steps)
        note = '<div class="nt">%s</div>' % esc(b['note']) if b.get('note') else ''
        how = ('<div class="how"><b>At the bench · %d steps</b><div class="seq">%s</div>%s'
               '<div class="ft">Photo DM’d to mtucker27@ · a mentor signs it off</div></div>'
               % (len(steps), seq, note))
    elif t == 'witnessed':
        prep = b.get('prep') or []
        pp = ('<div class="ft">Practise first in Ground School: %s</div>'
              % esc(' · '.join(fs['LESSON_TITLES'].get(p, p) for p in prep))) if prep else ''
        how = '<div class="how"><b>The standard</b><div class="seq">%s</div>%s</div>' % (esc(b.get('standard')), pp)
    else:
        how = '<div class="how"><b>Automatic</b><div class="seq">%s</div></div>' % esc(b.get('standard'))
    why = '<div class="why"><b>Why</b> %s</div>' % esc(b['why'])
    return ('<div class="card" data-id="%s" style="--t:%s"><span class="pin"><span>%s</span></span>%s%s%s%s</div>'
            % (b['id'], TRACK_COLOR[b['track']], esc(pin), head, body, how, why))  # data-i added in render()

# ----------------------------------------------------------------- render
def render(s, fs, prev_count):
    badges = [b for b in fs['BADGES'] if b['tier'] == s['tier']]
    tier_n = {'t0': 0, 't1': 1, 't2': 2, 'el': 3}[s['tier']]
    electives = s['tier'] == 'el'
    n = len(badges)
    n_left = (n + 1) // 2
    cards = []
    for i, b in enumerate(badges, 1):
        label = 'Bonus' if electives else 'Tier %d · pt. %d' % (tier_n, i)
        if b['id'] in TAGS: label += ' · ' + TAGS[b['id']]
        if b.get('minTier'): label += ' · Tier %d pilots' % b['minTier']
        if b.get('minHours'): label += ' · after %g sim h' % b['minHours']
        cards.append(card_html(b, label, fs, '★' if electives else str(i)).replace('<div class="card" ', '<div class="card" data-i="%d" ' % i, 1))
    d = s['dir']
    gate = ''
    if s.get('gate'):
        g, big, sub = s['gate']
        gate = ('<div class="gate gate-%s"><div class="txt"><div class="g">%s</div><div class="b">%s</div>'
                '<div class="s">%s &rarr;</div></div><div class="arch"></div></div>' % (d, g, big, sub))
    lead = ''
    if s.get('start'):
        lead = '<div class="start"><span class="go">GO</span><div><b>%s</b>%s</div></div>' % s['start']
    elif s.get('entry'):
        lead = '<div class="entry entry-%s">&larr; %s</div>' % ('top' if d == 'down' else 'bottom', esc(s['entry']))
    summit = ''
    if s.get('summit'):
        t, sub = s['summit']
        summit = ('<div class="summit"><div class="sc"><div class="lab">Tier 3 · the top</div>'
                  '<div class="nm">%s</div><div class="ds">%s</div></div><span class="peak"></span></div>'
                  '<div class="sidequest">Bonus badges &middot; any order, any time &middot; not counted</div>' % (esc(t), esc(sub)))
    extra = ''
    if electives:
        extra = ('<div class="p107"><b>PART 107</b>Want the real commercial licence? The club runs a study group. '
                 'You pay the exam; we supply the prep.</div>')
    if s['tier'] == 't0':
        prereq = 'Have a name'
    elif electives:
        prereq = 'Gate 3 — all %s Tier 2 badges' % WORDS[prev_count]
    else:
        prereq = 'Gate %d — all %s Tier %d badges' % (tier_n, WORDS[prev_count], tier_n - 1)
    onsheet = ('The top · plus %d bonus badges, any order' % n) if electives else \
              '%d badges · all of them to pass Gate %d' % (n, tier_n + 1)
    kinds = {}
    for b in badges: kinds[b['type']] = kinds.get(b['type'], 0) + 1
    mix = ' · '.join('%d %s' % (kinds[k], TYPE_NAME[k].lower()) for k in ('knowledge', 'bench', 'witnessed', 'auto') if kinds.get(k))

    legend = ''.join('<span><i style="background:%s"></i>%s</span>' % (TRACK_COLOR[k], esc(v)) for k, v in fs['TRACK'].items())
    title_tier = 'Tier %d' % tier_n
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Pilot Path — sheet {s['sheet']} of 4 — {title_tier} {s['name'].title()}</title>
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="map.css">
</head>
<body>
<div class="bg"><div class="grid"></div><div class="fine"></div><div class="vig"></div></div>
<div class="sheet{' electives' if electives else ''}" style="--tier:{s['color']}" data-dir="{s['dir']}" data-sheet="{s['sheet']}">
  <div class="stamp"><b>BROPHY</b>UAV PROGRAM<br>FPV CLUB</div>
  <div class="eyebrow"><h2>The pilot path &middot; sheet {s['sheet']} of 4 &middot; badges unlock the gear</h2><span class="rule"></span></div>
  <div class="tierhead"><div class="tn">TIER {tier_n}</div><div class="tname">{s['name']}</div></div>
  <div class="facts">
    <div class="f"><div class="k">You fly</div><div class="v">{esc(s['gear'])}</div></div>
    <div class="f"><div class="k">To get here</div><div class="v">{esc(prereq)}</div></div>
    <div class="f"><div class="k">On this sheet</div><div class="v">{esc(onsheet)}<small>{esc(mix)}</small></div></div>
  </div>

  <div class="map" id="map">
    <svg class="trail" id="trail"></svg>
    {lead}{gate}{summit}
    <div class="cards" id="cards">{''.join(cards)}{extra}</div>
  </div>

  <div class="legend">{legend}<span class="how"><b>Quiz</b> badges: pass at {fs['PASS']} %, no sign-off &middot; <b>Bench</b> and <b>witnessed</b> badges: a mentor who holds the badge signs it off &middot; demonstration, not attendance</span></div>
  <div class="qrmini qr"><svg viewBox="0 0 370 370"><use href="qr-path.svg#q"/></svg><div class="say"><b>Full badge list</b>scan</div></div>
  <div class="foot"><span><b>Brophy UAV Program</b> &middot; FPV Club pilot path &middot; Tier {tier_n} of 3</span><span>mtucker27@ for questions</span></div>
</div>
<script>
/* Organic layout, done in the page so it uses real card heights.
   - Cards hang off a winding trail on alternating sides (masonry: each card
     goes to the side that is shorter so far), staggered, a little narrower or
     wider and tilted by a fixed pseudo-random amount.
   - 'down' sheets start at the top-left and leave through a gate at the
     bottom-right; 'up' sheets come in at the bottom-left and climb to the
     top-right. Exits and entries share heights, so the four sheets join.
   - If the cards do not fit, the text is scaled down a step and laid out
     again. <body data-trail> says "ok", or "overflow Npx" if even the
     smallest step did not fit. */
(function () {{
  var sheet = document.querySelector('.sheet'), DIR = sheet.getAttribute('data-dir'), SEED = +sheet.getAttribute('data-sheet');
  var map = document.getElementById('map'), W = map.clientWidth, H = map.clientHeight;
  var MID = W / 2, CH = 184, MARGIN = 30, GAP = 20, YT = 50, YB = H - 46;
  function rnd(i, k) {{ var x = Math.sin((i + 1) * 12.9898 + SEED * 78.233 + k * 37.719) * 43758.5453; return x - Math.floor(x); }}
  function box(el) {{ var r = el.getBoundingClientRect(), m = map.getBoundingClientRect(); return {{x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height}}; }}

  // vertical room per side: start at the whole map, then step clear of every
  // label (start, entry, gate, summit, side-quest heading) on that side
  var lim = {{ L: [24, H - 24], R: [24, H - 24] }};
  ['.start', '.entry', '.gate .txt', '.gate .arch', '.summit', '.peak', '.sidequest'].forEach(function (sel) {{
    document.querySelectorAll(sel).forEach(function (el) {{
      var b = box(el), top = b.y + b.h / 2 < H / 2;
      ['L', 'R'].forEach(function (sd) {{
        var x0 = sd === 'L' ? 0 : MID - CH / 2, x1 = sd === 'L' ? MID + CH / 2 : W;
        if (b.x > x1 || b.x + b.w < x0) return;
        if (top) lim[sd][0] = Math.max(lim[sd][0], b.y + b.h + 18);
        else lim[sd][1] = Math.min(lim[sd][1], b.y - 18);
      }});
    }});
  }});
  // the trail needs a lane at the entry / exit edges too
  if (DIR === 'down') {{ lim.R[1] = Math.min(lim.R[1], YB - 40); lim.L[0] = Math.max(lim.L[0], YT + 44); }}
  else {{ lim.L[1] = Math.min(lim.L[1], YB - 40); lim.R[0] = Math.max(lim.R[0], YT + 44); }}

  function layout(k, gap0) {{
    sheet.style.setProperty('--k', k);
    var cards = Array.prototype.slice.call(document.querySelectorAll('#cards .card, #cards .p107'));
    var base = (W - 2 * MARGIN - CH) / 2, y = {{ L: 0, R: 0 }}, over = 0, used = {{ L: 0, R: 0 }}, cnt = {{ L: 0, R: 0 }};
    y.L = DIR === 'down' ? lim.L[0] : lim.L[1];
    y.R = DIR === 'down' ? lim.R[0] + 80 : lim.R[1] - 80;       // stagger the two sides
    cards.forEach(function (c, i) {{
      var w = Math.round(base - 58 * rnd(i, 1));
      c.style.width = w + 'px'; c.style.transform = 'none';
      var h = c.offsetHeight;
      var room = function (sd) {{ return DIR === 'down' ? lim[sd][1] - y[sd] : y[sd] - lim[sd][0]; }};
      var sd = DIR === 'down' ? (y.L <= y.R ? 'L' : 'R') : (y.L >= y.R ? 'L' : 'R');
      if (room(sd) < h && room(sd === 'L' ? 'R' : 'L') >= h) sd = sd === 'L' ? 'R' : 'L';
      var top = DIR === 'down' ? y[sd] : y[sd] - h;
      var drift = Math.round((base - w) * rnd(i, 2));               // outward only: the channel stays clear
      var x = sd === 'L' ? MID - CH / 2 - w - drift : MID + CH / 2 + drift;
      c.style.left = x + 'px'; c.style.top = top + 'px';
      c.classList.remove('side-L', 'side-R'); c.classList.add('side-' + sd);
      c.style.transform = 'rotate(' + ((rnd(i, 3) - .5) * 1.8).toFixed(2) + 'deg)';
      var gap = gap0 + Math.round(16 * rnd(i, 4));
      y[sd] = DIR === 'down' ? top + h + gap : top - gap;
      used[sd] += h + gap; cnt[sd]++;
      over = Math.max(over, DIR === 'down' ? (top + h) - lim[sd][1] : lim[sd][0] - top);
    }});
    var spare = Math.min((lim.L[1] - lim.L[0]) - used.L - (DIR === 'down' ? 0 : 0), (lim.R[1] - lim.R[0] - 80) - used.R);
    return {{ over: over, spare: spare, per: Math.max(cnt.L, cnt.R) }};
  }}

  function catmull(p) {{
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1), q = [p[0]].concat(p, [p[p.length - 1]]);
    for (var i = 1; i < q.length - 2; i++) {{
      var a = q[i - 1], b = q[i], c = q[i + 1], e = q[i + 2], t = 1 / 6;
      d += ' C' + (b[0] + (c[0] - a[0]) * t).toFixed(1) + ' ' + (b[1] + (c[1] - a[1]) * t).toFixed(1) + ',' +
           (c[0] - (e[0] - b[0]) * t).toFixed(1) + ' ' + (c[1] - (e[1] - b[1]) * t).toFixed(1) + ',' + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
    }}
    return d;
  }}

  function trail() {{
    var m = map.getBoundingClientRect();
    function ctr(el) {{ var r = el.getBoundingClientRect(); return [r.left - m.left + r.width / 2, r.top - m.top + r.height / 2]; }}
    var pins = Array.prototype.slice.call(document.querySelectorAll('#cards .card .pin')).map(ctr);
    var pts = [], go = document.querySelector('.go'), peak = document.querySelector('.peak');
    if (go) pts.push(ctr(go), [ctr(go)[0] + 70, ctr(go)[1] + 50]);
    else if (DIR === 'down') pts.push([-30, YT], [70, YT + 6], [MID - 120, YT + 40]);
    else pts.push([-30, YB], [80, YB - 4], [MID - 90, YB - 40]);
    // the biggest vertical gap between consecutive pins gets a proper loop
    var gi = -1, gbest = 0;
    for (var j = 1; j < pins.length; j++) {{ var g = Math.abs(pins[j][1] - pins[j - 1][1]); if (g > gbest) {{ gbest = g; gi = j; }} }}
    var swing = 1;
    pins.forEach(function (p, i) {{
      if (pts.length) {{
        var a = pts[pts.length - 1], my = (a[1] + p[1]) / 2;
        var cx = MID + swing * (30 + 26 * rnd(i, 5));
        if (i === gi && gbest > 170) {{
          var r = 40, s = DIR === 'down' ? 1 : -1, cy = my;
          pts.push([MID + swing * 46, cy - s * 70]);
          for (var t = 0; t <= 8; t++) {{                         // once around, entering and leaving on the same side
            var ang = (-Math.PI / 2) * s + swing * s * t * (2 * Math.PI / 8);
            pts.push([MID + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
          }}
          pts.push([MID - swing * 40, cy + s * 70]);
        }} else pts.push([cx, my]);
        swing = -swing;
      }}
      pts.push(p);
    }});
    if (peak) pts.push([MID + 40, ctr(peak)[1] + 70], ctr(peak));
    else if (DIR === 'down') pts.push([MID + 60, YB - 30], [W - 150, YB + 2], [W + 30, YB]);
    else pts.push([MID + 70, YT + 60], [W - 150, YT - 2], [W + 30, YT]);
    var svg = document.getElementById('trail'), d = catmull(pts);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = '<path class="trail-shadow" d="' + d + '"/><path class="trail-line" d="' + d + '"/>';
  }}

  function run() {{
    var ks = [1, .96, .92, .88, .84], r = null;
    for (var i = 0; i < ks.length; i++) {{ r = layout(ks[i], GAP); if (r.over <= 0) break; }}
    if (r.over <= 0 && r.spare > 40) {{                    // spread the spare height between the cards
      var g2 = GAP + Math.min(130, Math.floor(r.spare / Math.max(1, r.per)));
      var r2 = layout(+sheet.style.getPropertyValue('--k'), g2);
      if (r2.over > 0) layout(+sheet.style.getPropertyValue('--k'), GAP); else r = r2;
    }}
    var over = r.over;
    trail();
    document.body.setAttribute('data-trail', over > 0 ? 'overflow ' + Math.round(over) + 'px' : 'ok k=' + sheet.style.getPropertyValue('--k'));
  }}
  run();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
}})();
</script>
</body></html>
'''

if __name__ == '__main__':
    fs = load_fs()
    counts = {t['id']: sum(1 for b in fs['BADGES'] if b['tier'] == t['id']) for t in fs['TIERS']}
    prev = {'t0': 0, 't1': counts['t0'], 't2': counts['t1'], 'el': counts['t2']}
    print('badges.js: %d badges (%s)' % (len(fs['BADGES']), ', '.join('%s %d' % (k, v) for k, v in counts.items())))
    for s in SHEETS:
        with open(os.path.join(HERE, s['file'] + '.html'), 'w', encoding='utf-8') as f:
            f.write(render(s, fs, prev[s['tier']]))
        print('wrote', s['file'] + '.html')
