// Weekly split. dow follows Date.getDay(): 1 = Monday ... 6 = Saturday, 0 = Sunday (rest).
const x = (ex, sets, reps, rest = 75) => ({ ex, sets, reps, rest });

export const WARMUP = [x('cat-cow', 1, '10', 0), x('bird-dog', 1, '10 each side', 0), x('dead-bug', 1, '10 each side', 0), x('glute-bridge', 1, '10', 0)];

export const DAYS = [
  {
    id: 'push',
    dow: 1,
    short: 'Mon',
    name: 'Push',
    focus: 'Chest, shoulders, triceps',
    items: [
      x('incline-db-press', 4, '8–10', 90),
      x('machine-chest-press', 3, '10–12', 90),
      x('seated-db-shoulder-press', 3, '8–10', 90),
      x('cable-fly', 3, '12–15', 60),
      x('lateral-raise', 4, '12–15', 60),
      x('rope-pushdown', 3, '12–15', 60),
      x('push-up', 2, 'near failure', 60),
    ],
  },
  {
    id: 'pull',
    dow: 2,
    short: 'Tue',
    name: 'Pull',
    focus: 'Back, biceps',
    items: [
      x('lat-pulldown', 4, '8–10', 90),
      x('chest-supported-row', 4, '10', 90),
      x('seated-cable-row', 3, '10–12', 75),
      x('face-pull', 3, '15', 60),
      x('db-curl', 3, '10–12', 60),
      x('hammer-curl', 3, '12', 60),
      x('plank', 3, '45 sec', 45),
    ],
  },
  {
    id: 'legs',
    dow: 3,
    short: 'Wed',
    name: 'Legs and core',
    focus: 'Back-safe leg work, core stability',
    items: [
      x('leg-press', 4, '10–12', 90),
      x('goblet-squat', 3, '10', 90),
      x('lying-leg-curl', 3, '12', 75),
      x('leg-extension', 3, '12–15', 60),
      x('calf-raise', 4, '15', 45),
      x('side-plank', 3, '30 sec each side', 45),
      x('pallof-press', 3, '10 each side', 45),
    ],
  },
  {
    id: 'upper',
    dow: 4,
    short: 'Thu',
    name: 'Upper',
    focus: 'Chest and back',
    items: [
      x('flat-db-press', 4, '8–10', 90),
      x('one-arm-db-row', 4, '10 each side', 75),
      x('incline-machine-press', 3, '10–12', 90),
      x('wide-pulldown', 3, '10–12', 75),
      x('dips', 3, '8–12', 90),
      x('rear-delt-fly', 3, '15', 60),
    ],
  },
  {
    id: 'arms',
    dow: 5,
    short: 'Fri',
    name: 'Shoulders and arms',
    focus: 'Shoulders, biceps, triceps, abs',
    items: [
      x('machine-shoulder-press', 4, '10', 90),
      x('lateral-raise', 4, '12–15', 60),
      x('face-pull', 3, '15', 60),
      x('ez-curl', 3, '10', 60),
      x('overhead-triceps-ext', 3, '12', 60),
      x('incline-db-curl', 3, '12', 60),
      x('rope-pushdown', 3, '12–15', 60),
      x('hanging-knee-raise', 3, '12', 45),
    ],
  },
  {
    id: 'test',
    dow: 6,
    short: 'Sat',
    name: 'Light legs and lift test',
    focus: 'Deadlift test, glutes, conditioning',
    items: [
      x('rdl', 3, '8', 120),
      x('bulgarian-split-squat', 3, '10 each leg', 90),
      x('hip-thrust', 3, '12', 90),
      x('back-extension', 2, '12', 60),
      x('incline-walk', 1, '15–20 min', 0),
    ],
  },
];

export const dayByDow = (dow) => DAYS.find((d) => d.dow === dow);
export const dayById = (id) => DAYS.find((d) => d.id === id);

export const BACK_RULES = [
  'Weeks 1–2: finish every set with about 3 reps still in you.',
  'From week 3: when you hit the top of the rep range on all sets, add the smallest weight jump next time.',
  'Stop a lift for sharp pain, or pain, tingling or numbness going into the leg, and tell your physiotherapist.',
  'At work, stand up and walk for 2 minutes every 30–40 minutes.',
];
