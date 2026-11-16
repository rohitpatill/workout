// Starting weights for the first sessions, sized for this plan's user: about 100 kg
// bodyweight, trained before, returning after a three-year break, with a lower-back
// history. They are deliberately conservative: the first two weeks should end every set
// with about 3 reps in reserve.
//
// kg:   [low, high] starting range
// per:  'each' (per dumbbell), 'total' (bar plus plates), 'stack' (machine or cable pin),
//       'side' (per cable), 'plates' (plates loaded on a machine)
// step: the smallest sensible jump, used for "go up" / "drop" suggestions
// hold: true = never change the weight inside a session (back-sensitive lifts)
// bw:   bodyweight movement; note says how to make it easier or harder
export const LOADS = {
  'incline-db-press': { kg: [14, 18], per: 'each', step: 2 },
  'machine-chest-press': { kg: [35, 50], per: 'stack', step: 5 },
  'seated-db-shoulder-press': { kg: [10, 14], per: 'each', step: 2 },
  'cable-fly': { kg: [7, 12], per: 'side', step: 2.5 },
  'lateral-raise': { kg: [5, 7.5], per: 'each', step: 1 },
  'rope-pushdown': { kg: [15, 25], per: 'stack', step: 2.5 },
  'push-up': { bw: true, note: 'Bodyweight. Stop 1–2 reps before your form breaks. Too easy: put your feet on a bench.' },
  'lat-pulldown': { kg: [40, 55], per: 'stack', step: 5 },
  'wide-pulldown': { kg: [35, 50], per: 'stack', step: 5 },
  'chest-supported-row': { kg: [12, 18], per: 'each', step: 2 },
  'seated-cable-row': { kg: [35, 50], per: 'stack', step: 5 },
  'face-pull': { kg: [12, 20], per: 'stack', step: 2.5 },
  'db-curl': { kg: [8, 12], per: 'each', step: 1 },
  'hammer-curl': { kg: [10, 14], per: 'each', step: 1 },
  'ez-curl': { kg: [20, 30], per: 'total', step: 2.5 },
  'incline-db-curl': { kg: [6, 10], per: 'each', step: 1 },
  plank: { bw: true, note: 'Bodyweight. If 45 seconds is easy, squeeze harder rather than holding longer.' },
  'leg-press': { kg: [60, 100], per: 'plates', step: 10 },
  'goblet-squat': { kg: [12, 20], per: 'total', step: 2 },
  'lying-leg-curl': { kg: [20, 35], per: 'stack', step: 5 },
  'leg-extension': { kg: [25, 40], per: 'stack', step: 5 },
  'calf-raise': { kg: [0, 10], per: 'each', step: 2, note: 'Start with bodyweight. Add dumbbells once 15 slow reps are easy.' },
  'side-plank': { bw: true, note: 'Bodyweight. Start from the knees if you cannot hold a straight line for 30 seconds.' },
  'pallof-press': { kg: [7, 12], per: 'stack', step: 2.5 },
  'flat-db-press': { kg: [16, 22], per: 'each', step: 2 },
  'one-arm-db-row': { kg: [14, 20], per: 'each', step: 2 },
  'incline-machine-press': { kg: [30, 45], per: 'stack', step: 5 },
  dips: { bw: true, note: 'Bodyweight. If you cannot do 8 clean reps, use the assisted machine with 20–30 kg of help.' },
  'rear-delt-fly': { kg: [4, 7], per: 'each', step: 1 },
  'machine-shoulder-press': { kg: [20, 35], per: 'stack', step: 5 },
  'overhead-triceps-ext': { kg: [12, 20], per: 'stack', step: 2.5 },
  'hanging-knee-raise': { bw: true, note: 'Bodyweight. Too easy: straighten your legs.' },
  rdl: { kg: [30, 40], per: 'total', step: 5, hold: true, note: 'Add 5–10 kg a week only if there was no pain during the lift and none the next morning.' },
  'bulgarian-split-squat': { kg: [5, 10], per: 'each', step: 2, note: 'Use bodyweight only in week 1 if balance is the hard part.' },
  'hip-thrust': { kg: [40, 60], per: 'total', step: 5 },
  'back-extension': { bw: true, note: 'Bodyweight only for now. Slow reps, no extra load.' },
  'incline-walk': { bw: true, note: 'Incline 8–12%, speed 5–6 km/h. Raise the incline before the speed.' },
  'cat-cow': { bw: true },
  'bird-dog': { bw: true },
  'dead-bug': { bw: true },
  'glute-bridge': { bw: true },
};

export const PER_LABEL = { each: 'kg each hand', total: 'kg total', stack: 'kg', side: 'kg each side', plates: 'kg of plates' };
