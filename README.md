# Gym Plan

A phone-first workout and diet tracker with animated 3D exercise demos.

- **Today**: the day's workout, meals, water and morning weight at a glance
- **Workout**: a 6-day split (Sunday off) with a warm-up and exercise list for each day
- **Exercise screen**: a 3D mannequin performing the movement with the working muscles highlighted, step-by-step instructions, mistakes to avoid, a set logger and a rest timer
- **Diet**: five meals with amounts, calories and protein, and a daily checklist
- **Progress**: weight and waist log, trend chart, weekly workout count, backup export and import

The plan is built around a lower-back (L4-L5) history, so the exercise choices favour supported and machine variations. It is a personal plan, not medical advice.

## Run it

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

Open http://localhost:5180. To use it on a phone, connect the phone to the same Wi-Fi and open the "Network" address printed in the terminal.

```bash
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## Data

All tracking data is stored in the browser's `localStorage` on the device (key `gym.v1`). Nothing is sent anywhere. Use Export on the Progress tab to keep a backup.

## Project structure

```
src/
  main.js            routes and app shell
  store.js           localStorage data layer
  timer.js           rest timer
  ui.js              small shared helpers and icons
  styles.css
  data/
    plan.js          weekly split: exercises, sets, reps, rest
    exercises.js     exercise instructions and notes
    diet.js          meals and targets
  views/             one file per screen
  three/
    rig.js           procedural mannequin (two-bone IK) and equipment pool
    props.js         equipment helpers: benches, dumbbells, bars, cables
    poses.js         one animation per movement
    viewer.js        scene, camera and playback
```

To add a screen, write a view in `src/views` and register it in `src/main.js`. To change the plan, edit the files in `src/data`. Open `#/debug` to see a contact sheet of every animation's start and end pose.

## Tech

Vite, vanilla JavaScript and three.js. No framework and no backend.
