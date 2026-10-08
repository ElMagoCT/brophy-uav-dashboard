/* Flight School badge catalogue — the ONE list the website uses.
   Loaded by flightschool/ (the curriculum), admin/ (approvals and photo
   review) and the course shim. Mirrors the `badges` catalogue in the kiosk's
   config.json (GROUNDSCHOOL-V2-SCOPE.md §3); ids are permanent, kebab-case.

   Tier numbering is the club's: simulator = Tier 0, Meteor = Tier 1.
   2026-10-06: 28 -> 23 badges (Examiner, Shot Planning, Video Systems,
   Airspace, Emergency Procedures folded in; Field Repair = Field Diagnostics).
   2026-10-07: Simulator Flight folded into Proficient Flight (5 sim hours,
   minHours, before a mentor may judge it); Airspace into Event Ops;
   electives became BONUS badges (tier 'el', never counted); est added.
   2026-10-08: 20 counted badges. Each tier's badges END IN A CHECKPOINT
   (checkpoint:true) - the "exam" that moves a pilot up a tier:
     Tiny Whoop (first real Meteor flight)  closes Tier 0 -> Tier 1
     Pavo 20 Pro Flight (new)               closes Tier 1 -> Tier 2
     Event Pilot (new: fly at an event)     closes Tier 2 -> Tier 3
   A checkpoint counts only once every other badge of its tier is earned; it
   shows a check when ready to attempt and turns green when awarded. Spotter
   moved to Tier 0. Proficient Flight is now called "Sim Flight" (id kept).
   Bench steps end in a PHOTO step: the pilot takes a picture on this site and
   a mentor passes or fails it in the console's Review tab.

   type: 'knowledge'  lessons + quiz at 80 %, earned by the kiosk itself
         'bench'      step checklist, a photo submitted here, a mentor reviews it
         'witnessed'  a mentor watches you do it and signs it off
   minTier:  the tier a pilot must be ON to hold the badge (Mentor: 2)
   minHours: sim hours before a mentor may judge it (Sim Flight: 5)
   checkpoint: closes its tier (see above)
   lessons: the badge's lessons ({id, t, drill}); quiz: the quiz lesson id
   prep:    drill ids a witnessed badge reuses as practice
   steps:   the checklist a bench badge walks through
   standard: what the mentor is watching for */
(function () {
  var TIERS = [
    { id: 't0', n: 0, name: 'Simulator',   gear: 'The five FPV sims in the IC',                     color: 'var(--sky)',    gate: 'Checkpoint: Tiny Whoop · unlocks the Meteor 75 Pro' },
    { id: 't1', n: 1, name: 'Tiny Whoop',  gear: 'Meteor 75 Pro · sub-250 g',                       color: 'var(--violet)', gate: 'Checkpoint: Pavo 20 Pro Flight · unlocks full-size' },
    { id: 't2', n: 2, name: 'Full-size',   gear: 'Pavo 20 Pro · Cinebot 35 · 5-inch',               color: 'var(--rust)',   gate: 'Checkpoint: Event Pilot' },
    { id: 't3', n: 3, name: 'Event Pilot', gear: 'Any Tier 2 airframe at a school event, with a spotter', color: 'var(--green)', gate: 'The top' },
    { id: 'el', n: -1, name: 'Bonus badges', gear: 'Any order, any time · not counted toward your total', color: 'var(--amber)', gate: '' }
  ];
  var TRACK = { flight: 'Flight', build: 'Build & tech', know: 'Knowledge & safety', crew: 'Crew & leadership' };
  var PHOTO = 'Take a photo of your work with "Submit a photo" below - a mentor reviews it and passes or fails it.';

  var B = [
    // ---------------- Tier 0 · Simulator -> checkpoint Tiny Whoop
    { id: 'proficient-flight', tier: 't0', track: 'flight', type: 'witnessed', name: 'Sim Flight', minHours: 5, est: 'about 6 h',
      do: 'Log 5 hours in the simulator, then fly a checkride for a mentor: an orbit, a Split-S, gaps, and a finished race.', why: 'Acro muscle memory where crashes cost nothing, then proof of real control. Sim-only, so it can gate the first real flight.',
      prep: ['gs-fly-01', 'gs-fly-02', 'gs-fly-03', 'gs-fly-04'],
      standard: 'Only once the kiosk shows 5 h across the five flight sims (Ground School time does not count). Then a mentor watches you in Liftoff: a clean orbit around a gate, a Split-S, three gaps without a crash, and a finished race.' },
    { id: 'spotter', tier: 't0', track: 'crew', type: 'witnessed', name: 'Spotter', est: 'about 1 h',
      do: 'Run the pre-flight checklist, airspace check included; keep visual line of sight and call hazards. Do it before anything else - you will spot for others long before you fly.', why: 'FPV pilots can’t see around themselves.',
      standard: 'Spot a real flight for a mentor: run the checklist aloud (including the B4UFLY / LAANC check for where you are standing), keep eyes on the aircraft the whole battery, call every person and obstacle before the pilot needs to know.' },
    { id: 'safe-flight', quiz: 'gs-saf-quiz', tier: 't0', track: 'know', type: 'knowledge', name: 'Safe Flight', est: 'about 20 min',
      do: 'Know and follow the Brophy FPV safe-flight rules.', why: 'The baseline code of conduct for real hardware.',
      lessons: [{ id: 'gs-saf-01', t: "Who's flying, who's watching" }, { id: 'gs-saf-02', t: 'The Brophy FPV rules sheet' }, { id: 'gs-saf-03', t: 'Go / No-Go', drill: true }] },
    { id: 'battery-care', quiz: 'gs-bat-quiz', tier: 't0', track: 'build', type: 'knowledge', name: 'Battery Care', est: 'about 20 min',
      do: 'Balance-charge, store at storage voltage, spot a puffed pack, explain disposal.', why: 'LiPos are the biggest real fire risk in the hobby.',
      lessons: [{ id: 'gs-bat-01', t: 'LiPo basics' }, { id: 'gs-bat-02', t: 'Battery math', drill: true }, { id: 'gs-bat-03', t: 'Charging, storage and disposal' }, { id: 'gs-bat-04', t: 'When a pack goes bad' }] },
    { id: 'building', tier: 't0', track: 'build', type: 'bench', name: 'Building', est: 'about 3 h',
      do: 'Rebuild a disassembled Meteor 75 Pro.', why: 'Members can fix what they break.',
      steps: ['Parts checklist: frame, FC/ESC stack, motors, RX, VTX, camera, antenna, props, strap', 'Motors on — right screw length, no screw touching a winding', 'Plug in the motors', 'Assemble it and put the canopy on', 'Plug in the canopy', 'Test: the motors beep and the camera turns on', PHOTO] },
    { id: 'betaflight', tier: 't0', track: 'build', type: 'bench', name: 'Betaflight', est: 'about 1 h',
      do: 'Set motor direction and order, finish the OSD (battery usage and amp draw, positioned), set rates and the arm switch, and bind.', why: 'Most “won’t fly” problems get solved here.',
      steps: ['Props OFF, battery OUT, USB only', 'Connect — the kiosk reads the board and firmware', 'Flash the practice config: a lightly messed-up drone, missing the things you need to set', 'Receiver: protocol', 'Modes: ARM and angle on the switches; set the rates', 'Motors: order and direction (props off!)', 'OSD: add battery usage and amp draw, and position them', 'Check my work — the kiosk diffs against the stock config', 'Bind last, with the plug/unplug method', PHOTO],
      note: 'Practised on the club Meteor 75 Pro at the kiosk, which checks the result against a stock config.' },
    { id: 'line-of-sight', tier: 't0', track: 'flight', type: 'witnessed', name: 'Line of Sight', est: 'about 30 min',
      do: 'Without goggles: take off, hover and land a whoop in angle mode. Level flying only, supervised.', why: 'If video cuts out, the pilot can still level out and land - and it builds throttle control.',
      prep: ['gs-los-01', 'gs-los-02', 'gs-los-03'],
      standard: 'A mentor stands beside you: a controlled take-off to head height, a 20-second hover without drifting much, a lap around a tree, and a smooth landing.' },
    { id: 'tiny-whoop', tier: 't0', track: 'flight', type: 'witnessed', name: 'Tiny Whoop', checkpoint: true, est: 'about 2 h',
      do: 'Checkpoint into Tier 1: your first real flight. With every other Tier 0 badge done, fly the Meteor 75 Pro in goggles for a mentor.', why: 'First real flight, on a sub-250 g drone that can’t do much damage. Pass it and you are a Tier 1 pilot.',
      standard: 'In goggles on the Meteor: take-off, a figure-eight through two gates, an orbit, and a landing on the pad, no wall contact.' },

    // ---------------- Tier 1 · Tiny Whoop -> checkpoint Pavo 20 Pro Flight
    { id: 'soldering', tier: 't1', track: 'build', type: 'bench', name: 'Soldering', est: 'about 1.5 h',
      do: 'Solder an ESC and motors, then spin the motors in Betaflight.', why: 'Core electronics skill that transfers to robotics.',
      steps: ['Iron at the right temperature, tip tinned', 'Tin the pad, tin the wire, join', 'ESC pads: shiny, no bridges', 'Motor wires: all three, trimmed', 'Spin each motor in Betaflight (props off)', PHOTO] },
    { id: 'electrical-components', quiz: 'gs-elc-quiz', tier: 't1', track: 'know', type: 'knowledge', name: 'Electrical Components', est: 'about 20 min',
      do: 'Test on choosing motors, ESCs, batteries and props for a given drone.', why: 'Why a 3-inch and a 5-inch need different parts.',
      lessons: [{ id: 'gs-elc-01', t: 'The six parts' }, { id: 'gs-elc-02', t: 'Motors, props and thrust', drill: true }, { id: 'gs-elc-03', t: 'Matching motor, ESC, prop and battery' }, { id: 'gs-elc-04', t: 'Why a 3-inch and a 5-inch differ' }] },
    { id: 'radio-protocol', quiz: 'gs-rad-quiz', tier: 't1', track: 'know', type: 'knowledge', name: 'Radio Protocol', est: 'about 35 min',
      do: 'Test on ELRS, analog and digital video, control links, range, antennas and interference, and a little of what light is.', why: 'Prevents dropouts and interference at events, and gives the editor footage they can use.',
      lessons: [{ id: 'gs-rad-01', t: 'Analog against digital' }, { id: 'gs-rad-02', t: 'Bands, channels and racing', drill: true }, { id: 'gs-rad-03', t: 'Antennas and diversity' }, { id: 'gs-rad-04', t: 'Control links: ELRS, Crossfire, binding, failsafe' }, { id: 'gs-rad-05', t: 'Interference at an event' }, { id: 'gs-rad-06', t: 'Digital video: goggles, recording and D-log' }] },
    { id: 'field-repair', tier: 't1', track: 'build', type: 'bench', name: 'Field Diagnostics', est: 'about 45 min',
      do: 'A mentor breaks three things - one on the radio, one in Betaflight, one mechanical or electrical - and you find and fix each one.', why: 'Keeps a shoot going instead of ending it.',
      steps: ['A mentor breaks three things without telling you what', 'Radio: find and fix the fault on the remote', 'Betaflight: find and fix the fault in the configuration', 'Mechanical or electrical: find and fix the fault on the aircraft', 'Explain each cause to the mentor', PHOTO] },
    { id: 'freestyle-flight', tier: 't1', track: 'flight', type: 'witnessed', name: 'Freestyle Flight', est: 'about 5 h',
      do: 'Powerloop, trippy spin, tiny gaps.', why: 'Advanced control before flying expensive airframes.',
      prep: ['gs-trk-01', 'gs-trk-02', 'gs-trk-03', 'gs-trk-04'],
      standard: 'A mentor watches in the sim or on the whoop: a powerloop, a trippy spin, and three tiny gaps in one battery.' },
    { id: 'pavo-flight', tier: 't1', track: 'flight', type: 'witnessed', name: 'Pavo 20 Pro Flight', checkpoint: true, est: 'about 1 h',
      do: 'Checkpoint into Tier 2: with every other Tier 1 badge done, fly the Pavo 20 Pro for a mentor.', why: 'Your first full-size airframe. Pass it and you are a Tier 2 pilot.',
      standard: 'With a spotter and a mentor watching: take-off, a figure-eight, an orbit, a pass through a gate and a clean landing on the pad - no contact.' },

    // ---------------- Tier 2 · Full-size -> checkpoint Event Pilot
    { id: 'faa-trust', tier: 't2', track: 'know', type: 'witnessed', name: 'FAA TRUST', est: 'about 30 min',
      do: 'Complete the free FAA TRUST certificate online (~20 min, cannot be failed).', why: 'Federal requirement for recreational flyers. Official.',
      standard: 'Submit a photo of your TRUST certificate below (or show the PDF to a mentor).' },
    { id: 'event-ops', quiz: 'gs-evt-quiz', tier: 't2', track: 'know', type: 'knowledge', name: 'Event Ops', est: 'about 50 min',
      do: 'Check the airspace and get permission to fly there; set up a flight zone, brief bystanders, keep flights away from crowds; demonstrate failsafe setup, flyaway response, LiPo fire procedure and incident reporting.', why: 'Ground work before flying at a game or rally - starting with whether you may fly there at all, since the campus sits under Sky Harbor’s Class B - and a plan for when something goes wrong.',
      lessons: [{ id: 'gs-asp-01', t: 'Class B, 400 ft and Sky Harbor' }, { id: 'gs-asp-02', t: 'B4UFLY, LAANC and TRUST' }, { id: 'gs-evt-01', t: 'The flight zone' }, { id: 'gs-evt-02', t: 'Briefing bystanders' }, { id: 'gs-evt-03', t: 'Pilot and spotter call-outs' }, { id: 'gs-emg-01', t: 'Failsafe: set it, test it' }, { id: 'gs-emg-02', t: 'Flyaway and lost video' }, { id: 'gs-emg-03', t: 'LiPo fire and injury' }, { id: 'gs-emg-04', t: 'The incident report' }, { id: 'gs-emg-05', t: 'Scenario drill', drill: true }] },
    { id: 'cinematography', tier: 't2', track: 'crew', type: 'witnessed', name: 'Cinematography', est: 'about 3 h',
      do: 'Write a shot list for a real event with a coach or moderator; frame a follow shot, an orbit and a reveal; deliver one usable clip.', why: 'Turns pilots into shooters for Best of Brophy who can work with other organizations professionally. Filming.',
      standard: 'A written shot list agreed with the coach or moderator and used on the day, and one clip with a follow, an orbit and a reveal that the editor accepts without re-shooting.' },
    { id: 'indoor-proximity', tier: 't2', track: 'flight', type: 'witnessed', name: 'Indoor Proximity', est: 'about 2 h',
      do: 'Fly a whoop through a hallway or doorway course without touching walls.', why: 'Precision in tight spaces — what an indoor rally race demands. Racing.',
      standard: 'The club hallway course, one battery, zero wall contact, a mentor counting.' },
    { id: 'racing', tier: 't2', track: 'flight', type: 'witnessed', name: 'Racing', est: 'about 4 h',
      do: '3 clean laps of the club course under a target time.', why: 'Gate discipline under pressure; qualifies a pilot for the rally race. Racing.',
      standard: 'Three consecutive clean laps under the posted target time, timed by a mentor.' },
    { id: 'event-pilot', tier: 't2', track: 'flight', type: 'witnessed', name: 'Event Pilot', checkpoint: true, est: 'one event',
      do: 'Checkpoint into Tier 3: with every other Tier 2 badge done, fly at a real school event or race, with a spotter, under a mentor.', why: 'The top of the path: flying for the school, in front of people.',
      standard: 'At a real school event or race: the airspace checked, the zone set up and briefed, a spotter beside you, a mentor on site. The mentor signs it off afterwards.' },

    // ---------------- Bonus badges (tier 'el') - never counted toward the total or the tier
    { id: 'editing', tier: 'el', track: 'crew', type: 'witnessed', name: 'Editing', est: 'about 3 h',
      do: 'Cut and colour-grade a 30–60 second clip from D-log footage.', why: 'Best of Brophy doesn’t depend on one editor.',
      standard: 'A finished 30–60 s clip from D-log, graded, delivered to the editor.' },
    { id: 'tuning', tier: 'el', track: 'build', type: 'bench', name: 'Tuning', est: 'about 2 h',
      do: 'Fix an oscillation with PID or filter changes, with before/after footage.', why: 'The skill behind smooth cinematic footage.',
      steps: ['Before footage showing the oscillation', 'Blackbox or reasoning: P, D or filters?', 'One change at a time, test flight', 'After footage, clean', PHOTO] },
    { id: 'fleet-steward', tier: 'el', track: 'crew', type: 'witnessed', name: 'Fleet Steward', est: 'one semester',
      do: 'Run equipment check-in/out and a maintenance log for one semester.', why: 'Accountability for school-funded gear.',
      standard: 'A semester of the check-in/out sheet and maintenance log, reviewed by a mentor.' },
    { id: 'mentor', tier: 'el', track: 'crew', type: 'witnessed', name: 'Mentor', est: 'about a month', minTier: 2,
      do: 'Be a Tier 2 pilot, then coach a new member through their first two badges. A mentor who holds a badge may sign it off for others, with officer approval.', why: 'The program trains its own replacements, and defines who may sign badges off.',
      standard: 'Tier 2 pilots only: every Tier 0 and Tier 1 badge earned. Then two badges earned by someone you coached, confirmed by them and an officer. With an officer’s approval, a mentor signs off the badges they hold and is given the instructor password.' }
  ];

  var LESSON_TITLES = {
    'gs-rul-01': "Who's flying, who's watching", 'gs-rul-02': 'Where you may fly', 'gs-rul-03': 'Go / No-Go',
    'gs-ele-01': 'The six parts', 'gs-ele-02': 'Motors, props and thrust', 'gs-ele-03': 'LiPo batteries', 'gs-ele-04': 'Battery math',
    'gs-vid-01': 'Analog against digital', 'gs-vid-02': 'Bands, channels and racing', 'gs-vid-03': 'Antennas and diversity',
    'gs-fly-01': 'Four channels, two sticks', 'gs-fly-02': 'Rate mode against angle mode', 'gs-fly-03': 'Hover Trainer', 'gs-fly-04': 'Throttle discipline',
    'gs-los-01': 'Which way is left?', 'gs-los-02': 'Gate Run', 'gs-los-03': 'Lost orientation recovery',
    'gs-trk-01': 'Your first flip and roll', 'gs-trk-02': 'The Split-S', 'gs-trk-03': 'The Power Loop', 'gs-trk-04': 'The Matty Flip'
  };

  function slug(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  window.FS = { TIERS: TIERS, TRACK: TRACK, BADGES: B, LESSON_TITLES: LESSON_TITLES, slug: slug, PASS: 80, SIM_HOURS: 5,
    API: 'https://brophy-uav-api.netlify.app',
    counted: function (b) { return b.tier !== 'el'; },
    /* the other badges of a checkpoint's tier */
    mates: function (b) { return B.filter(function (x) { return x !== b && x.tier === b.tier && !x.checkpoint; }); },
    /* a photo can be submitted for any badge a mentor signs off */
    photoOk: function (b) { return b.type === 'bench' || b.type === 'witnessed'; } };
})();
