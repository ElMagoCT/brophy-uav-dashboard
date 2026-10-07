#!/usr/bin/env python3
"""Generates the four Pilot Path map sheets (03..06), one tier per sheet.

    python3 gen_map.py          # writes 03-map-tier0.html .. 06-map-tier3.html
    python3 build.py 03-map-tier0 04-map-tier1 05-map-tier2 06-map-tier3

Every word on a badge card comes from ../../flightschool/badges.js (read with
node), so the posters can never drift from the website again. Change a badge
there, rerun this, rebuild.

Layout (2026-10-06): a switchback trail. It enters at the top-left (where the
previous sheet's trail left off), runs DOWN the left edge past the left column
of cards, crosses the bottom, climbs UP the right edge past the right column,
and leaves through the gate at the top-right at the same height it came in,
so the four sheets still join into one trail when hung side by side.

Cards are laid out by the browser (two flex columns), not by guesswork, so a
long badge just makes its card taller. A small script in each sheet then
measures where the checkpoint pins ended up and draws the trail through them;
headless Chrome runs it before printing (build.py's virtual time budget).
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
  dict(file='03-map-tier0', sheet=1, tier='t0', name='SIMULATOR', color='var(--sky)',
       gear='FPV sim rigs in the IC · Liftoff · Micro Drones · SkyDive · FPV Labs · PicaSim',
       start=('START', 'Add your name at the kiosk'),
       gate=('GATE 1', 'Meteor 75 Pro unlocked', 'Tier 1 · Tiny Whoop')),
  dict(file='04-map-tier1', sheet=2, tier='t1', name='TINY WHOOP', color='var(--violet)',
       gear='Meteor 75 Pro · sub-250 g · safe indoors',
       entry='From Tier 0', first_flight=True,
       gate=('GATE 2', 'Full-size unlocked', 'Tier 2 · Pavo 20 Pro · Cinebot 35 · 5-inch')),
  dict(file='05-map-tier2', sheet=3, tier='t2', name='FULL-SIZE', color='var(--rust)',
       gear='Pavo 20 Pro · Cinebot 35 · 5-inch',
       entry='From Tier 1',
       gate=('GATE 3', 'Event Pilot', 'Tier 3 · the top')),
  dict(file='06-map-tier3', sheet=4, tier='el', name='EVENT PILOT', color='var(--green)',
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
        label = 'Elective' if electives else 'Tier %d · pt. %d' % (tier_n, i)
        if b['id'] in TAGS: label += ' · ' + TAGS[b['id']]
        if b.get('minTier'): label += ' · Tier %d pilots' % b['minTier']
        cards.append(card_html(b, label, fs, '★' if electives else str(i)).replace('<div class="card" ', '<div class="card" data-i="%d" ' % i, 1))
    left, right = cards, []          # the sheet's script balances the columns by height

    gate = ''
    if s.get('gate'):
        g, big, sub = s['gate']
        gate = ('<div class="gate"><div class="txt"><div class="g">%s</div><div class="b">%s</div>'
                '<div class="s">%s &rarr;</div></div><div class="arch"></div></div>' % (g, big, sub))
    top_left = ''
    if s.get('start'):
        top_left = '<div class="start"><span class="go">GO</span><div><b>%s</b>%s</div></div>' % s['start']
    elif s.get('entry'):
        top_left = '<div class="entry">&larr; %s</div>' % esc(s['entry'])
    summit = ''
    if s.get('summit'):
        t, sub = s['summit']
        summit = ('<div class="summit"><span class="peak"></span><div class="sc"><div class="lab">Tier 3 · the top</div>'
                  '<div class="nm">%s</div><div class="ds">%s</div></div></div>'
                  '<div class="sidequest">Side quests &middot; electives &middot; any order, any time</div>' % (esc(t), esc(sub)))
    extra_right = ''
    if electives:
        extra_right = ('<div class="p107"><b>PART 107</b>Want the real commercial licence? The club runs a study group. '
                       'You pay the exam; we supply the prep.</div>')
    if s.get('first_flight'):
        top_left += '<div class="note1">your first real flight is checkpoint 1</div>'

    if s['tier'] == 't0':
        prereq = 'Have a name'
    elif electives:
        prereq = 'Gate 3 — all %s Tier 2 badges' % WORDS[prev_count]
    else:
        prereq = 'Gate %d — all %s Tier %d badges' % (tier_n, WORDS[prev_count], tier_n - 1)
    onsheet = ('The top · plus %d electives, any order' % n) if electives else \
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
<div class="sheet{' electives' if electives else ''}" style="--tier:{s['color']}">
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
    <div class="band">{top_left}{gate}</div>
    {summit}
    <div class="cols">
      <div class="col left">{''.join(left)}</div>
      <div class="col right">{''.join(right)}{extra_right}</div>
    </div>
  </div>

  <div class="legend">{legend}<span class="how"><b>Quiz</b> badges: pass at {fs['PASS']} %, no sign-off &middot; <b>Bench</b> and <b>witnessed</b> badges: a mentor who holds the badge signs it off &middot; demonstration, not attendance</span></div>
  <div class="qrmini qr"><svg viewBox="0 0 370 370"><use href="qr-path.svg#q"/></svg><div class="say"><b>Full badge list</b>scan</div></div>
  <div class="foot"><span><b>Brophy UAV Program</b> &middot; FPV Club pilot path &middot; Tier {tier_n} of 3</span><span>mtucker27@ for questions</span></div>
</div>
<script>
/* Draw the trail through the checkpoint pins once fonts and layout are final.
   Entry/exit both sit at Y_EDGE so adjacent sheets join. */
(function () {{
  var Y_EDGE = 44, EXIT = {'true' if s.get('gate') else 'false'}, SUMMIT = {'true' if s.get('summit') else 'false'};
  function cr(p) {{               // Catmull-Rom -> cubic Bezier path
    if (p.length < 2) return '';
    var d = 'M' + p[0][0] + ' ' + p[0][1], q = [p[0]].concat(p, [p[p.length - 1]]);
    for (var i = 1; i < q.length - 2; i++) {{
      var a = q[i - 1], b = q[i], c = q[i + 1], e = q[i + 2], k = 1 / 6;
      d += ' C' + (b[0] + (c[0] - a[0]) * k) + ' ' + (b[1] + (c[1] - a[1]) * k) + ',' +
           (c[0] - (e[0] - b[0]) * k) + ' ' + (c[1] - (e[1] - b[1]) * k) + ',' + c[0] + ' ' + c[1];
    }}
    return d;
  }}
  /* Move the tail of the card list into the right column so both columns
     are as close to the same height as possible. Order is kept: the left
     column runs pt 1.. top to bottom, the right climbs from the bottom. */
  function balance() {{                 // idempotent: safe to run more than once
    var left = document.querySelector('.col.left'), right = document.querySelector('.col.right');
    var cards = Array.prototype.slice.call(document.querySelectorAll('.col .card'))
                  .sort(function (a, b) {{ return a.getAttribute('data-i') - b.getAttribute('data-i'); }});
    cards.forEach(function (c) {{ left.appendChild(c); }});
    var extra = right.querySelector('.p107'), gap = 10;
    var h = cards.map(function (c) {{ return c.getBoundingClientRect().height + gap; }});
    var tot = h.reduce(function (a, b) {{ return a + b; }}, 0), xh = extra ? extra.getBoundingClientRect().height + gap : 0;
    var best = 1, bestv = 1e9, acc = 0;
    for (var k = 1; k < cards.length; k++) {{
      acc += h[k - 1];
      var v = Math.max(acc, tot - acc + xh);
      if (v < bestv) {{ bestv = v; best = k; }}
    }}
    for (var j = best; j < cards.length; j++) right.insertBefore(cards[j], extra);
  }}
  function draw() {{
    balance();
    var map = document.getElementById('map'), m = map.getBoundingClientRect();
    var W = m.width, H = m.height, svg = document.getElementById('trail');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    function c(el) {{ var r = el.getBoundingClientRect(); return [r.left - m.left + r.width / 2, r.top - m.top + r.height / 2]; }}
    var L = document.querySelectorAll('.col.left .pin'), R = document.querySelectorAll('.col.right .pin');
    var xl = L.length ? c(L[0])[0] : 70, xr = R.length ? c(R[0])[0] : W - 70, pts = [];
    var go = document.querySelector('.go'), peak = document.querySelector('.peak');
    if (go) pts.push(c(go)); else pts.push([-30, Y_EDGE], [xl - 10, Y_EDGE + 6]);
    if (peak) {{ pts.push(c(peak)); }}
    var wig = 1;
    function along(list) {{
      for (var i = 0; i < list.length; i++) {{
        var p = c(list[i]);
        if (pts.length) {{ var a = pts[pts.length - 1]; pts.push([(a[0] + p[0]) / 2 + 16 * wig, (a[1] + p[1]) / 2]); wig = -wig; }}
        pts.push(p);
      }}
    }}
    along(L);
    var bottom = 0; document.querySelectorAll('.col .card, .p107').forEach(function (e) {{ var r = e.getBoundingClientRect(); bottom = Math.max(bottom, r.bottom - m.top); }});
    var yb = Math.min(H - 16, bottom + 34);
    pts.push([xl, yb - 20], [(xl + xr) / 2, yb + 8], [xr, yb - 20]);
    along(R);                       // column-reverse: DOM order is already bottom-to-top
    if (EXIT) pts.push([xr + 4, Y_EDGE + 16], [W + 30, Y_EDGE]);
    var d = cr(pts);
    svg.innerHTML = '<path class="trail-shadow" d="' + d + '"/><path class="trail-line" d="' + d + '"/>';
    var colsR = document.querySelector('.cols').getBoundingClientRect(), over = 0;
    document.querySelectorAll('.col .card, .col .p107').forEach(function (c) {{
      var r = c.getBoundingClientRect(); over = Math.max(over, colsR.top - r.top, r.bottom - colsR.bottom); }});
    document.body.setAttribute('data-trail', over > 1 ? 'overflow ' + Math.round(over) + 'px' : 'ok');
  }}
  draw();                                   // now, so a fast print never sees one long column
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);   // and again with final metrics
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
