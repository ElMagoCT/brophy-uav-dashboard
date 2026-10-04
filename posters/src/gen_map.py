#!/usr/bin/env python3
"""Generates the four Pilot Path map sheets (03..06). One tier per sheet; the
trail enters every sheet at the left edge and leaves at the right edge at the
same height (Y_EDGE), so the four sheets hang side by side as one map.

    python3 gen_map.py            # writes 03-map-tier0.html .. 06-map-tier3.html
    python3 gen_map.py --check    # also report trail/card collisions

Edit the SHEETS data below, not the HTML. Map coordinates run 0..1056 across
and 0..MAP_H down, inside the sheet's map area (which starts MAP_TOP px down).
"""
import html, sys

W, H = 1056, 1632
MAP_TOP, MAP_H = 290, 1190
Y_EDGE = 120                       # where the trail crosses the sheet edges
CARD_W, CARD_H = 236, 118
SAFE_X = (56, 1000)                # cards stay inside the sheet margins
SAFE_Y = (0, 1125)

TRACK = {
    'flight':  ('Flight',             'var(--sky)'),
    'build':   ('Build & tech',       'var(--amber)'),
    'know':    ('Knowledge & safety', 'var(--green)'),
    'crew':    ('Crew & leadership',  'var(--violet)'),
}

# node: ((x, y), name, what you do, track, card placement)
# placement: 'n' 's' 'e' 'w' (relative to the node) or an explicit (dx, dy)
SHEETS = [
  dict(
    file='03-map-tier0', sheet=1, tier=0, name='SIMULATOR', color='var(--sky)',
    gear='FPV sim rigs in the IC · Liftoff · Micro Drones · SkyDive · FPV Labs · PicaSim',
    prereq='Have a name', onsheet='7 badges · all of them to pass Gate 1',
    gate=('GATE 1', 'Meteor 75 Pro unlocked', 'Tier 1 · Tiny Whoop'),
    start=(80, 1070, 'START', 'Add your name at the kiosk'),
    nodes=[
      ((320, 920),  'Simulator Flight',  '7.5 hours logged on the sim', 'flight', None),
      ((540, 1000), 'Proficient Flight', 'Orbit · Split-S · gaps · finish a race — in the sim', 'flight', None),
      ((850, 1030), '_via', '', 'know', None),
      ((870, 860),  'Safe Flight',       'Know and follow the Brophy FPV safe-flight rules', 'know', 'w'),
      ((860, 560),  'Battery Care',      'Balance-charge · storage voltage · spot a puffed pack · disposal', 'build', None),
      ((540, 560),  'Building',          'Build a basic drone from parts', 'build', None),
      ((220, 560),  'Betaflight',        'Flash firmware · motor order & direction · bind a radio', 'build', None),
      ((380, 210),  'Line of Sight',     'No goggles: take off, hover, land a whoop in angle mode — supervised', 'flight', None),
    ],
    minis=[(0.05, '1 h', 'The Hour Club'), (0.09, '5 h', 'Five Hours'), (0.70, 'GS', 'Ground School done')],
    exit_via=[(700, 120)],
  ),
  dict(
    file='04-map-tier1', sheet=2, tier=1, name='TINY WHOOP', color='var(--violet)',
    gear='Meteor 75 Pro · sub-250 g · safe indoors',
    prereq='Gate 1 — all seven Tier 0 badges', onsheet='6 badges · all of them to pass Gate 2',
    gate=('GATE 2', 'Full-size unlocked', 'Tier 2 · Pavo 20 Pro · Cinebot 35 · 5-inch'),
    entry='From Tier 0',
    nodes=[
      ((230, 210),  'Tiny Whoop',            'Take off, fly a set pattern, land — real life', 'flight', None),
      ((200, 560),  'Soldering',             'Solder a 5-in ESC and motors · heat-shrink 22 AWG wire', 'build', None),
      ((500, 950),  'Electrical Components', 'Test: pick motors, ESCs, batteries and props for a given drone', 'know', None),
      ((850, 920),  'Radio Protocol',        'Test: ELRS · analog vs digital video · control links', 'know', None),
      ((850, 560),  'Field Repair',          'Swap a motor or prop in the field · diagnose a drone that won’t arm', 'build', None),
      ((520, 310),  'Freestyle Flight',      'Powerloop · trippy spin · tiny gaps', 'flight', None),
    ],
    minis=[(0.09, '1st', 'First real flight')],
    exit_via=[(800, 120)],
  ),
  dict(
    file='05-map-tier2', sheet=3, tier=2, name='FULL-SIZE', color='var(--rust)',
    gear='Pavo 20 Pro · Cinebot 35 · 5-inch',
    prereq='Gate 2 — all six Tier 1 badges', onsheet='8 badges · 5 core · 1 filming · 2 racing',
    gate=('GATE 3', 'Event Pilot', 'Tier 3 · the top'),
    entry='From Tier 1',
    nodes=[
      ((200, 210),  'FAA TRUST',            'Free online certificate · ~20 min · official and required', 'know', None),
      ((190, 500),  'Airspace',             'Check a site in B4UFLY · know when LAANC is needed', 'know', None),
      ((250, 830),  'Emergency Procedures', 'Failsafe setup · flyaway response · LiPo fire · incident report', 'know', None),
      ((570, 990),  'Spotter',              'Run the pre-flight checklist · keep line of sight · call hazards', 'crew', None),
      ((880, 880),  'Event Ops',            'Set up a flight zone · brief bystanders · keep away from crowds', 'know', None),
      ((870, 560),  'Cinematography',       'Follow shot · orbit · reveal · deliver one usable clip', 'crew', None, 'FILMING'),
      ((640, 450),  'Indoor Proximity',     'Whoop through a hallway or doorway course, no wall touches', 'flight', None, 'RACING'),
      ((620, 190),  'Racing',               '3 clean laps of the club course under the target time · qualifies you for the rally race', 'flight', None, 'RACING'),
    ],
    minis=[],
    exit_via=[(800, 120)],
  ),
  dict(
    file='06-map-tier3', sheet=4, tier=3, name='EVENT PILOT', color='var(--green)',
    gear='Any Tier 2 airframe at a school event · with a spotter',
    prereq='Gate 3 — all eight Tier 2 badges', onsheet='The top · plus 7 electives, any order',
    gate=None, entry='From Tier 2',
    summit=((380, 170), 'EVENT PILOT', 'Cleared to fly in front of a crowd, with a spotter', ['Tier 2', 'Spotter', 'Cinematography', 'FAA TRUST']),
    electives=True,
    nodes=[
      ((660, 430),  'Tuning',        'Fix an oscillation with PID or filter changes · before/after footage', 'build', None),
      ((910, 590),  'Fleet Steward', 'Run check-in/out and a maintenance log for one semester', 'crew', None),
      ((880, 965),  'Examiner',      'Hold Mentor + the badge being tested + officer approval · you sign badges off', 'crew', None),
      ((600, 1030), 'Mentor',        'Coach a new member through their first two badges', 'crew', None),
      ((235, 940),  'Shot Planning', 'Write a shot list for a real event · coordinate with a coach or moderator', 'crew', None),
      ((170, 700),  'Editing',       'Cut and colour-grade a 30–60 s clip from D-log footage', 'crew', None),
      ((380, 440),  'Video Systems', 'Bind O4 to goggles · recording resolution · D-log vs normal · ND filters', 'build', None),
    ],
    minis=[],
    exit_via=None,
  ),
]

# ---------------------------------------------------------------------------

def catmull_rom(points, tension=0.5):
    """Smooth path through every point: list of cubic segments (p1,c1,c2,p2)."""
    if len(points) < 2:
        return []
    p = [points[0]] + list(points) + [points[-1]]
    segs = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
        segs.append((p1, c1, c2, p2))
    return segs

def to_d(segs):
    if not segs: return ''
    d = 'M %.1f %.1f' % segs[0][0]
    for _, c1, c2, p2 in segs:
        d += ' C %.1f %.1f, %.1f %.1f, %.1f %.1f' % (c1 + c2 + p2)
    return d

def bez(seg, t):
    p1, c1, c2, p2 = seg
    mt = 1 - t
    return (mt**3*p1[0] + 3*mt*mt*t*c1[0] + 3*mt*t*t*c2[0] + t**3*p2[0],
            mt**3*p1[1] + 3*mt*mt*t*c1[1] + 3*mt*t*t*c2[1] + t**3*p2[1])

def sample(segs, n=40):
    pts = []
    for s in segs:
        pts += [bez(s, i / n) for i in range(n)]
    if segs: pts.append(segs[-1][3])
    return pts

def point_at(segs, frac):
    pts = sample(segs, 60)
    # by arc length
    L = [0.0]
    for a, b in zip(pts, pts[1:]):
        L.append(L[-1] + ((a[0]-b[0])**2 + (a[1]-b[1])**2) ** .5)
    target = frac * L[-1]
    for i, l in enumerate(L):
        if l >= target: return pts[i]
    return pts[-1]

def spot(node, where, gap=34):
    x, y = node
    if isinstance(where, tuple):
        return x + where[0], y + where[1]
    g = gap; d = gap * 0.75
    table = {
        'n': (-CARD_W / 2, -g - CARD_H), 's': (-CARD_W / 2, g),
        'e': (g, -CARD_H / 2),           'w': (-g - CARD_W, -CARD_H / 2),
        'ne': (d, -d - CARD_H),          'nw': (-d - CARD_W, -d - CARD_H),
        'se': (d, d),                    'sw': (-d - CARD_W, d),
    }
    dx, dy = table[where]
    return x + dx, y + dy

def overlap(a, b, pad=0):
    ax, ay, aw, ah = a; bx, by, bw, bh = b
    return ax - pad < bx + bw and bx - pad < ax + aw and ay - pad < by + bh and by - pad < ay + ah

def candidates(p, hint):
    """Every spot a card may take around node p: compass points at three
    distances, plus north/south shifted sideways."""
    out = []
    if isinstance(hint, tuple): out.append(spot(p, hint))
    for gap in (34, 56, 84, 110):
        for w in ('n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'):
            out.append(spot(p, w, gap))
        for shift in (-130, 130):
            x, y = spot(p, 'n', gap); out.append((x + shift, y))
            x, y = spot(p, 's', gap); out.append((x + shift, y))
    return out

def penalty(r, p, trail_pts, others, reserved, node_pts):
    cx, cy, cw, ch = r
    pen = 0
    if cx < SAFE_X[0] or cx + cw > SAFE_X[1] or cy < SAFE_Y[0] or cy + ch > SAFE_Y[1]: pen += 1000
    pen += 100 * sum(1 for q in trail_pts if cx - 8 <= q[0] <= cx + cw + 8 and cy - 8 <= q[1] <= cy + ch + 8)
    pen += 500 * sum(1 for rr in others if overlap(r, rr, 10))
    pen += 500 * sum(1 for rr in reserved if overlap(r, rr, 6))
    pen += 300 * sum(1 for q in node_pts if q is not p and cx - 28 <= q[0] <= cx + cw + 28 and cy - 28 <= q[1] <= cy + ch + 28)
    # prefer close to the node
    pen += (((cx + cw / 2 - p[0]) ** 2 + (cy + ch / 2 - p[1]) ** 2) ** .5) * 0.08
    return pen

def place_cards(nodes, trail_pts, reserved):
    """Greedy first pass, then a few rounds of re-placing each card with the
    others fixed. Returns [(name, rect)], and a report of anything unclean."""
    node_pts = [n[0] for n in nodes]
    rects = {}
    def best_for(i):
        p, nm, _d, _t, hint = nodes[i][:5]
        others = [r for j, r in rects.items() if j != i]
        best = None
        for (cx, cy) in candidates(p, hint):
            r = (cx, cy, CARD_W, CARD_H)
            pen = penalty(r, p, trail_pts, others, reserved, node_pts)
            if best is None or pen < best[0]: best = (pen, r)
        return best
    for i in range(len(nodes)):
        rects[i] = best_for(i)[1]
    for _round in range(6):
        changed = False
        for i in range(len(nodes)):
            pen, r = best_for(i)
            if r != rects[i]:
                rects[i] = r; changed = True
        if not changed: break
    report = []
    out = []
    for i, n in enumerate(nodes):
        pen = penalty(rects[i], n[0], trail_pts, [r for j, r in rects.items() if j != i], reserved, node_pts)
        if pen >= 100: report.append('%-22s unclean (penalty %d)' % (n[1], pen))
        out.append((n[1], rects[i]))
    return out, report

def real_nodes(s):
    return [n for n in s['nodes'] if not n[1].startswith('_')]

def trails(s):
    """Returns a list of point lists: the main trail plus any branch loops."""
    nodes = [n[0] for n in s['nodes']]
    head = []
    if s.get('entry'):  head.append((-20, Y_EDGE))
    if s.get('start'):  head.append((s['start'][0], s['start'][1]))
    if s.get('summit'): head.append(s['summit'][0])
    tail = []
    if s.get('exit_via') is not None:
        tail = list(s['exit_via']) + [(W + 20, Y_EDGE)]
    if s.get('main_until'):
        k = s['main_until']
        main = head + nodes[:k] + [nodes[i - 1] for i in s['filming']] + tail
        loop = [nodes[k - 1]] + [nodes[i - 1] for i in s['racing']] + tail
        return [main, loop]
    return [head + nodes + tail]

def render(s, check=False):
    tier, name = s['tier'], s['name']
    nodes = real_nodes(s)
    paths = trails(s)
    segsets = [catmull_rom(p) for p in paths]

    out = ['<svg class="trail" viewBox="0 0 %d %d" width="%d" height="%d">' % (W, MAP_H, W, MAP_H)]
    for segs in segsets:
        out.append('<path class="trail-shadow" d="%s"/>' % to_d(segs))
    for segs in segsets:
        out.append('<path class="trail-line" d="%s"/>' % to_d(segs))
    minis = []
    for (frac, lab, title) in s.get('minis', []):
        x, y = point_at(segsets[0], frac)
        minis.append((x, y, lab, title))
        out.append('<g class="mini"><circle cx="%.0f" cy="%.0f" r="17"/><text x="%.0f" y="%.0f">%s</text></g>' % (x, y, x, y + 5, html.escape(lab)))
    for i, (p, nm, _d, tr, _w, *_tag) in enumerate(nodes, 1):
        col = TRACK[tr][1]
        label = '★' if s.get('electives') else str(i)
        out.append('<g class="node"><circle class="halo" cx="%d" cy="%d" r="30"/>'
                   '<circle class="pin" cx="%d" cy="%d" r="22" style="stroke:%s"/>'
                   '<text x="%d" y="%d">%s</text></g>' % (p[0], p[1], p[0], p[1], col, p[0], p[1] + 8, label))
    if s.get('start'):
        x, y = s['start'][0], s['start'][1]
        out.append('<g class="startpin"><circle cx="%d" cy="%d" r="34"/><text x="%d" y="%d">GO</text></g>' % (x, y, x, y + 8))
    if s.get('summit'):
        x, y = s['summit'][0]
        out.append('<g class="summitpin"><polygon points="%d,%d %d,%d %d,%d"/><circle cx="%d" cy="%d" r="9"/></g>'
                   % (x - 60, y + 36, x, y - 64, x + 60, y + 36, x, y - 64))
    out.append('</svg>')

    reserved = []
    if s.get('gate'):   reserved.append((790, Y_EDGE - 120, 270, 330))
    if s.get('entry'):  reserved.append((0, Y_EDGE - 80, 200, 50))
    if s.get('start'):  reserved.append((s['start'][0] - 70, s['start'][1] - 40, 220, 150))
    if s.get('summit'):
        sx, sy = s['summit'][0]
        reserved.append((sx - 80, sy - 80, 160, 130)); reserved.append((sx + 90, sy - 60, 420, 210))
    reserved.append((730, 1100, 280, 160))   # the QR corner
    if s.get('electives'):
        reserved.append((470, 336, 540, 30)); reserved.append((400, 1050, 310, 120))
    for (p, lab, (dx, dy)) in s.get('branches', []):
        reserved.append((p[0] + dx, p[1] + dy, 230, 50))
    for (x, y, lab, title) in minis:
        reserved.append((x - 226, y - 20, 250, 60))
    trail_pts = [pt for segs in segsets for pt in sample(segs)]
    placed, report = place_cards(nodes, trail_pts, reserved)
    if check:
        for line in report: print('  %-14s %s' % (s['file'], line))
    rects = []
    for i, (p, nm, desc, tr, where, *tag) in enumerate(nodes, 1):
        cx, cy, cw, ch = dict(placed)[nm]
        rects.append((nm, cx, cy, cw, ch))
        tname, tcol = TRACK[tr]
        lab = 'ELECTIVE' if s.get('electives') else 'TIER %d · PT. %d' % (tier, i)
        if tag: lab += ' · ' + tag[0]
        out.append('<div class="card" style="left:%.0fpx;top:%.0fpx;width:%dpx;--t:%s">'
                   '<div class="lab">%s</div><div class="nm">%s</div><div class="ds">%s</div>'
                   '<div class="tr"><i></i>%s</div></div>'
                   % (cx, cy, cw, tcol, lab, html.escape(nm), html.escape(desc), tname))
    for (x, y, lab, title) in minis:
        out.append('<div class="minilab" style="left:%.0fpx;top:%.0fpx">%s</div>' % (x - 226, y + 14, html.escape(title)))
    if s.get('start'):
        x, y, t, sub = s['start']
        out.append('<div class="startlab" style="left:%dpx;top:%dpx"><b>%s</b>%s</div>' % (x - 60, y + 46, t, sub))
    if s.get('entry'):
        out.append('<div class="edge in" style="top:%dpx">&larr; %s</div>' % (Y_EDGE - 70, s['entry']))
    if s.get('gate'):
        g, big, sub = s['gate']
        out.append('<div class="gate" style="top:%dpx"><div class="arch"></div><div class="g">%s</div><div class="b">%s</div><div class="s">%s &rarr;</div></div>' % (Y_EDGE - 112, g, big, sub))
    if s.get('summit'):
        (x, y), t, sub, reqs = s['summit']
        chips = ''.join('<span>%s</span>' % html.escape(r) for r in reqs)
        out.append('<div class="summit" style="left:%dpx;top:%dpx"><div class="lab">TIER 3 · THE TOP</div><div class="nm">%s</div><div class="ds">%s</div><div class="req"><em>Needs</em>%s</div></div>' % (x + 90, y - 60, t, sub, chips))
    for (p, lab, (dx, dy)) in s.get('branches', []):
        out.append('<div class="branch" style="left:%dpx;top:%dpx">%s</div>' % (p[0] + dx, p[1] + dy, lab))
    if s.get('electives'):
        out.append('<div class="sidequest" style="left:470px;top:336px">SIDE QUESTS &middot; electives &middot; any order, any time</div>')
        out.append('<div class="p107" style="left:400px;top:1056px"><b>PART 107</b>Want the real commercial licence? The club runs a study group. You pay the exam; we supply the prep.</div>')

    map_html = '\n'.join(out)

    if check:
        pts = [pt for segs in segsets for pt in sample(segs)]
        for (nm, cx, cy, cw, ch) in rects:
            hit = [pt for pt in pts if cx - 8 <= pt[0] <= cx + cw + 8 and cy - 8 <= pt[1] <= cy + ch + 8]
            if hit: print('  %-14s trail crosses card %-22s at %s' % (s['file'], nm, '(%.0f,%.0f)' % hit[0]))
        for a in range(len(rects)):
            for b in range(a + 1, len(rects)):
                _, ax, ay, aw, ah = rects[a]; _, bx, by, bw, bh = rects[b]
                if ax < bx + bw and bx < ax + aw and ay < by + bh and by < ay + ah:
                    print('  %-14s cards overlap: %s / %s' % (s['file'], rects[a][0], rects[b][0]))
        for (p, nm, *_r) in nodes:
            for (onm, cx, cy, cw, ch) in rects:
                if onm != nm and cx - 26 <= p[0] <= cx + cw + 26 and cy - 26 <= p[1] <= cy + ch + 26:
                    print('  %-14s node %s sits on card %s' % (s['file'], nm, onm))

    legend = ''.join('<span><i style="background:%s"></i>%s</span>' % (c, n) for n, c in TRACK.values())
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Pilot Path — sheet {s['sheet']} of 4 — Tier {tier} {name.title()}</title>
<link rel="stylesheet" href="poster.css">
<link rel="stylesheet" href="map.css">
</head>
<body>
<div class="bg"><div class="grid"></div><div class="fine"></div><div class="vig"></div></div>
<div class="sheet" style="--tier:{s['color']}">
  <div class="stamp"><b>BROPHY</b>UAV PROGRAM<br>FPV CLUB</div>
  <div class="eyebrow"><h2>The pilot path &middot; sheet {s['sheet']} of 4 &middot; badges unlock the gear</h2><span class="rule"></span></div>
  <div class="tierhead">
    <div class="tn">TIER {tier}</div>
    <div class="tname">{name}</div>
  </div>
  <div class="facts">
    <div class="f"><div class="k">You fly</div><div class="v">{html.escape(s['gear'])}</div></div>
    <div class="f"><div class="k">To get here</div><div class="v">{html.escape(s['prereq'])}</div></div>
    <div class="f"><div class="k">On this sheet</div><div class="v">{html.escape(s['onsheet'])}</div></div>
  </div>

  <div class="map">
{map_html}
  </div>

  <div class="legend">{legend}<span class="how"><b>How a badge is earned:</b> do the skill in front of a certified member &middot; they sign it off on the board &middot; demonstration, not attendance</span></div>
  <div class="qrmini qr"><svg viewBox="0 0 370 370"><use href="qr-path.svg#q"/></svg><div class="say"><b>Full badge list</b>scan</div></div>
  <div class="foot"><span><b>Brophy UAV Program</b> &middot; FPV Club pilot path &middot; Tier {tier} of 3</span><span>mtucker27@ for questions</span></div>
</div>
</body></html>
'''

if __name__ == '__main__':
    import os
    check = '--check' in sys.argv
    here = os.path.dirname(os.path.abspath(__file__))
    for s in SHEETS:
        with open(os.path.join(here, s['file'] + '.html'), 'w', encoding='utf-8') as f:
            f.write(render(s, check))
        print('wrote', s['file'] + '.html')
