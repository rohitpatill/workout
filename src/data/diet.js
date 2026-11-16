export const TARGETS = { kcal: 2500, protein: 190, waterGlasses: 14, glassMl: 250, weightFrom: 100, weightGoal: [85, 90] };

export const MEALS = [
  {
    id: 'breakfast',
    name: 'Breakfast',
    kcal: 610,
    p: 34,
    items: ['4 whole eggs (boiled, or cooked in 1 tsp oil)', '60 g oats cooked in water, or 2 slices whole-wheat toast', '1 fruit (banana, apple or orange)'],
    swap: 'Swap: 150 g paneer bhurji with 2 slices of toast.',
  },
  {
    id: 'lunch',
    name: 'Lunch',
    kcal: 760,
    p: 72,
    items: ['200 g chicken breast, cooked weight (grilled or lightly sautéed)', '1.5 cups cooked rice, or 3 rotis', 'Small bowl of dal', 'Large salad'],
    swap: 'Swap: 250 g fish or 200 g lean mutton instead of chicken.',
  },
  {
    id: 'gym',
    name: 'Before or after the gym',
    kcal: 220,
    p: 25,
    items: ['1 scoop whey protein in water', '1 banana'],
    swap: 'Swap: 250 ml milk with 2 boiled eggs if you have no whey.',
  },
  {
    id: 'snack',
    name: 'Snack',
    kcal: 310,
    p: 18,
    items: ['200 g Greek yogurt or curd', 'A handful (30 g) of almonds or peanuts'],
    swap: 'Swap: 100 g roasted chana, or a chicken sandwich on whole-wheat bread.',
  },
  {
    id: 'dinner',
    name: 'Dinner',
    kcal: 620,
    p: 62,
    items: ['200 g chicken or fish, cooked weight', '2 rotis', 'Cooked vegetables (1 tsp oil)'],
    swap: 'Swap: 6 egg whites with 2 whole eggs instead of the chicken.',
  },
];

export const SUPPLEMENTS = [{ id: 'creatine', name: 'Creatine 3–5 g' }];

export const DIET_RULES = [
  'Cook grilled, baked or lightly sautéed, with about 1 tsp oil per meal.',
  'No sugary drinks, juice or alcohol.',
  'Sweets and fried food: one meal a week at most.',
  'Walk 8,000–10,000 steps a day.',
  'Sleep 7 hours or more. Short sleep slows fat loss and recovery.',
  'If the weekly average drops less than 0.3 kg for two weeks, remove half a cup of rice or one roti from lunch and dinner.',
];
