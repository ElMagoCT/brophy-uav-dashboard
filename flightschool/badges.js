/* Flight School badge catalogue — the ONE list the website uses.
   Loaded by flightschool/ (the curriculum), admin/ (approvals) and the course
   shim. Mirrors the `badges` catalogue the kiosk will carry in config.json
   (GROUNDSCHOOL-V2-SCOPE.md §3); ids are permanent, kebab-case.

   Tier numbering is the club's: simulator = Tier 0, Meteor = Tier 1.
   2026-10-06: 28 -> 23 badges. Examiner folded into Mentor, Shot Planning into
   Cinematography, Video Systems into Radio Protocol (lesson gs-rad-06),
   Airspace into Safe Flight (basics only), Emergency Procedures into Event
   Ops; Field Repair renamed Field Diagnostics (id unchanged).

   type: 'knowledge'  lessons + quiz at 80 %, earned by the kiosk itself
         'bench'      built-in instructions, step checkboxes, photo DM, instructor approval
         'witnessed'  someone watches you do it, instructor approval
         'auto'       derived by the kiosk from hours
   lessons: the badge's lessons, v2 ids ({id, t, drill}) - the kiosk's
            gs-content.js uses these ids; quiz: the quiz lesson id (gs-<code>-quiz)
   prep:    old drill ids a witnessed badge reuses as practice
   steps:   the checklist a bench badge walks through
   standard: what the examiner is watching for (witnessed) */
(function () {
  var TIERS = [
    { id: 't0', n: 0, name: 'Simulator',   gear: 'The five FPV sims in the IC',                     color: 'var(--sky)',    gate: 'Gate 1 · unlocks the Meteor 75 Pro' },
    { id: 't1', n: 1, name: 'Tiny Whoop',  gear: 'Meteor 75 Pro · sub-250 g',                       color: 'var(--violet)', gate: 'Gate 2 · unlocks full-size' },
    { id: 't2', n: 2, name: 'Full-size',   gear: 'Pavo 20 Pro · Cinebot 35 · 5-inch',               color: 'var(--rust)',   gate: 'Gate 3 · Event Pilot' },
    { id: 't3', n: 3, name: 'Event Pilot', gear: 'Any Tier 2 airframe at a school event, with a spotter', color: 'var(--green)', gate: 'The top' },
    { id: 'el', n: -1, name: 'Electives',  gear: 'Any order, any time',                              color: 'var(--amber)',  gate: '' }
  ];
  var TRACK = { flight: 'Flight', build: 'Build & tech', know: 'Knowledge & safety', crew: 'Crew & leadership' };
  var DM = 'DM a photo of your work to mtucker27@brophybroncos.org, then have an instructor approve it.';

  var B = [
    // ---------------- Tier 0 · Simulator (Gate 1)
    { id: 'simulator-flight', tier: 't0', track: 'flight', type: 'auto', name: 'Simulator Flight',
      do: '7.5 hours logged in the simulator.', why: 'Acro muscle memory where crashes cost nothing.',
      standard: 'Earned automatically by the kiosk at 7.5 h across the five flight sims. Ground School and bench time do not count.' },
    { id: 'proficient-flight', tier: 't0', track: 'flight', type: 'witnessed', name: 'Proficient Flight',
      do: 'In the sim: orbit, Split-S, gaps, and finish a race.', why: 'Real control, not just hovering. Sim-only, so it can gate the first real flight.',
      prep: ['gs-fly-01', 'gs-fly-02', 'gs-fly-03', 'gs-fly-04'],
      standard: 'An examiner watches you in Liftoff: a clean orbit around a gate, a Split-S, three gaps without a crash, and a finished race.' },
    { id: 'safe-flight', quiz: 'gs-saf-quiz', tier: 't0', track: 'know', type: 'knowledge', name: 'Safe Flight',
      do: 'Know and follow the Brophy FPV safe-flight rules, and the basics of the airspace over Brophy.', why: 'The baseline code of conduct for real hardware, and why the campus sits under Sky Harbor’s Class B.',
      lessons: [{ id: 'gs-saf-01', t: "Who's flying, who's watching" }, { id: 'gs-saf-02', t: 'The Brophy FPV rules sheet' }, { id: 'gs-asp-01', t: 'Class B, 400 ft and Sky Harbor' }, { id: 'gs-asp-02', t: 'B4UFLY, LAANC and TRUST' }, { id: 'gs-saf-03', t: 'Go / No-Go', drill: true }] },
    { id: 'battery-care', quiz: 'gs-bat-quiz', tier: 't0', track: 'build', type: 'knowledge', name: 'Battery Care',
      do: 'Balance-charge, store at storage voltage, spot a puffed pack, explain disposal.', why: 'LiPos are the biggest real fire risk in the hobby.',
      lessons: [{ id: 'gs-bat-01', t: 'LiPo basics' }, { id: 'gs-bat-02', t: 'Battery math', drill: true }, { id: 'gs-bat-03', t: 'Charging, storage and disposal' }, { id: 'gs-bat-04', t: 'When a pack goes bad' }] },
    { id: 'building', tier: 't0', track: 'build', type: 'bench', name: 'Building',
      do: 'Fully build a basic drone from parts.', why: 'Members can fix what they break.',
      steps: ['Parts checklist: frame, FC/ESC stack, motors, RX, VTX, camera, antenna, props, strap', 'Frame assembled, standoffs tight', 'Motors on — right screw length, no screw touching a winding', 'Stack mounted, soft-mounted if the kit has grommets', 'Soldered (see Soldering)', 'Smoke-stopper first power-up, no smoke', DM] },
    { id: 'betaflight', tier: 't0', track: 'build', type: 'bench', name: 'Betaflight',
      do: 'Flash firmware, set motor direction and order, bind a remote.', why: 'Most “won’t fly” problems get solved here.',
      steps: ['Props OFF, battery OUT, USB only', 'Connect — the kiosk reads the board and firmware', 'Backup — the kiosk saves a full dump', 'Reset to defaults', 'Flash: DFU, target from the stock file, full chip erase', 'Ports: receiver UART', 'Receiver: protocol and bind', 'Modes: ARM and angle on the switches', 'Motors: order and direction (props off!)', 'OSD: the club’s custom elements only', 'Check my work — the kiosk diffs against the stock config', DM],
      note: 'Practised on the club Meteor 75 Pro at the kiosk, which checks the result against a stock config.' },
    { id: 'line-of-sight', tier: 't0', track: 'flight', type: 'witnessed', name: 'Line of Sight',
      do: 'Without goggles: take off, hover and land a whoop in angle mode. Level flying only, supervised.', why: 'If video cuts out, the pilot can still level out and land.',
      prep: ['gs-los-01', 'gs-los-02', 'gs-los-03'],
      standard: 'Examiner stands beside you: a controlled take-off to head height, a 20-second hover inside a two-metre box, a slow nose-in turn, and a landing on the pad.' },

    // ---------------- Tier 1 · Tiny Whoop (Gate 2)
    { id: 'tiny-whoop', tier: 't1', track: 'flight', type: 'witnessed', name: 'Tiny Whoop',
      do: 'Take off, fly a set pattern, and land a whoop in real life.', why: 'First real flight on a sub-250 g drone that can’t do much damage.',
      standard: 'In goggles on the Meteor: take-off, a figure-eight through two gates, an orbit, and a landing on the pad, no wall contact.' },
    { id: 'soldering', tier: 't1', track: 'build', type: 'bench', name: 'Soldering',
      do: 'Solder a 5-inch ESC and motors; solder and heat-shrink 22 AWG wire.', why: 'Core electronics skill that transfers to robotics.',
      steps: ['Iron at the right temperature, tip tinned', 'Tin the pad, tin the wire, join', 'ESC pads: shiny, no bridges', 'Motor wires: all three, trimmed', '22 AWG splice with heat-shrink', 'Continuity check with a meter', DM] },
    { id: 'electrical-components', quiz: 'gs-elc-quiz', tier: 't1', track: 'know', type: 'knowledge', name: 'Electrical Components',
      do: 'Test on choosing motors, ESCs, batteries and props for a given drone.', why: 'Why a 3-inch and a 5-inch need different parts.',
      lessons: [{ id: 'gs-elc-01', t: 'The six parts' }, { id: 'gs-elc-02', t: 'Motors, props and thrust', drill: true }, { id: 'gs-elc-03', t: 'Matching motor, ESC, prop and battery' }, { id: 'gs-elc-04', t: 'Why a 3-inch and a 5-inch differ' }] },
    { id: 'radio-protocol', quiz: 'gs-rad-quiz', tier: 't1', track: 'know', type: 'knowledge', name: 'Radio Protocol',
      do: 'Test on ELRS, analog and digital video, control links, and setting up a digital video system to record.', why: 'Prevents dropouts and interference at events, and gives the editor footage they can use.',
      lessons: [{ id: 'gs-rad-01', t: 'Analog against digital' }, { id: 'gs-rad-02', t: 'Bands, channels and racing', drill: true }, { id: 'gs-rad-03', t: 'Antennas and diversity' }, { id: 'gs-rad-04', t: 'Control links: ELRS, Crossfire, binding, failsafe' }, { id: 'gs-rad-05', t: 'Interference at an event' }, { id: 'gs-rad-06', t: 'Digital video: goggles, recording and D-log' }] },
    { id: 'field-repair', tier: 't1', track: 'build', type: 'bench', name: 'Field Diagnostics',
      do: 'Diagnose a drone that won’t arm; swap a motor or prop in the field.', why: 'Keeps a shoot going instead of ending it.',
      steps: ['Prop swap, correct rotation, nut tight', 'Motor swap, direction fixed in Betaflight', '“Won’t arm”: read the arming flags, name the cause', DM] },
    { id: 'freestyle-flight', tier: 't1', track: 'flight', type: 'witnessed', name: 'Freestyle Flight',
      do: 'Powerloop, trippy spin, tiny gaps.', why: 'Advanced control before flying expensive airframes.',
      prep: ['gs-trk-01', 'gs-trk-02', 'gs-trk-03', 'gs-trk-04'],
      standard: 'Examiner watches in the sim or on the whoop: a powerloop, a trippy spin, and three tiny gaps in one battery.' },

    // ---------------- Tier 2 · Full-size (Gate 3)
    { id: 'faa-trust', tier: 't2', track: 'know', type: 'witnessed', name: 'FAA TRUST',
      do: 'Complete the free FAA TRUST certificate online (~20 min, cannot be failed).', why: 'Federal requirement for recreational flyers. Official.',
      standard: 'Show your TRUST certificate (PDF or photo) to an instructor. DM it to mtucker27@brophybroncos.org for the records.' },
    { id: 'spotter', tier: 't2', track: 'crew', type: 'witnessed', name: 'Spotter',
      do: 'Run the pre-flight checklist; keep visual line of sight and call hazards.', why: 'FPV pilots can’t see around themselves.',
      standard: 'Spot a real flight for an examiner: run the checklist aloud, keep eyes on the aircraft the whole battery, call every person and obstacle before the pilot needs to know.' },
    { id: 'event-ops', quiz: 'gs-evt-quiz', tier: 't2', track: 'know', type: 'knowledge', name: 'Event Ops',
      do: 'Set up a flight zone, brief bystanders, keep flights away from crowds; demonstrate failsafe setup, flyaway response, LiPo fire procedure and incident reporting.', why: 'Ground work before flying at a game or rally, and a plan for when something goes wrong.',
      lessons: [{ id: 'gs-evt-01', t: 'The flight zone' }, { id: 'gs-evt-02', t: 'Briefing bystanders' }, { id: 'gs-evt-03', t: 'Pilot and spotter call-outs' }, { id: 'gs-emg-01', t: 'Failsafe: set it, test it' }, { id: 'gs-emg-02', t: 'Flyaway and lost video' }, { id: 'gs-emg-03', t: 'LiPo fire and injury' }, { id: 'gs-emg-04', t: 'The incident report' }, { id: 'gs-emg-05', t: 'Scenario drill', drill: true }] },
    { id: 'cinematography', tier: 't2', track: 'crew', type: 'witnessed', name: 'Cinematography',
      do: 'Write a shot list for a real event with a coach or moderator; frame a follow shot, an orbit and a reveal; deliver one usable clip.', why: 'Turns pilots into shooters for Best of Brophy who can work with other organizations professionally. Filming.',
      standard: 'A written shot list agreed with the coach or moderator and used on the day, and one clip with a follow, an orbit and a reveal that the editor accepts without re-shooting.' },
    { id: 'indoor-proximity', tier: 't2', track: 'flight', type: 'witnessed', name: 'Indoor Proximity',
      do: 'Fly a whoop through a hallway or doorway course without touching walls.', why: 'Precision in tight spaces — what an indoor rally race demands. Racing.',
      standard: 'The club hallway course, one battery, zero wall contact, examiner counting.' },
    { id: 'racing', tier: 't2', track: 'flight', type: 'witnessed', name: 'Racing',
      do: '3 clean laps of the club course under a target time.', why: 'Gate discipline under pressure; qualifies a pilot for the rally race. Racing.',
      standard: 'Three consecutive clean laps under the posted target time, timed by an examiner.' },

    // ---------------- Electives
    { id: 'editing', tier: 'el', track: 'crew', type: 'witnessed', name: 'Editing',
      do: 'Cut and colour-grade a 30–60 second clip from D-log footage.', why: 'Best of Brophy doesn’t depend on one editor.',
      standard: 'A finished 30–60 s clip from D-log, graded, delivered to the editor.' },
    { id: 'tuning', tier: 'el', track: 'build', type: 'bench', name: 'Tuning',
      do: 'Fix an oscillation with PID or filter changes, with before/after footage.', why: 'The skill behind smooth cinematic footage.',
      steps: ['Before footage showing the oscillation', 'Blackbox or reasoning: P, D or filters?', 'One change at a time, test flight', 'After footage, clean', DM] },
    { id: 'fleet-steward', tier: 'el', track: 'crew', type: 'witnessed', name: 'Fleet Steward',
      do: 'Run equipment check-in/out and a maintenance log for one semester.', why: 'Accountability for school-funded gear.',
      standard: 'A semester of the check-in/out sheet and maintenance log, reviewed by an instructor.' },
    { id: 'mentor', tier: 'el', track: 'crew', type: 'witnessed', name: 'Mentor',
      do: 'Coach a new member through their first two badges. A mentor who holds a badge may sign it off for others, with officer approval.', why: 'The program trains its own replacements, and defines who may sign badges off.',
      standard: 'Two badges earned by someone you coached, confirmed by them and an instructor. With an officer’s approval, mentors become examiners for the badges they hold and are given the instructor password.' }
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

  window.FS = { TIERS: TIERS, TRACK: TRACK, BADGES: B, LESSON_TITLES: LESSON_TITLES, slug: slug, PASS: 80, SIM_HOURS: 7.5 };
})();
