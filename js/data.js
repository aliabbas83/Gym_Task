// Public data for the home page only: muscle names and colours, the headline numbers and the
// hero animation. The full program (schedule, exercises, equipment, sets, reps and kg) is only
// in Supabase, where row level security shows it to subscribers and staff.

window.GYM = {
  name: "IronHouse",

  muscles: {
    chest:      { name: "Chest",                    color: "#ff5a36", region: "Upper body" },
    back:       { name: "Back",                     color: "#3fa7ff", region: "Upper body" },
    shoulders:  { name: "Shoulders",                color: "#ffb020", region: "Upper body" },
    triceps:    { name: "Triceps",                  color: "#b679ff", region: "Upper body" },
    arms:       { name: "Arms (Biceps & Forearms)", color: "#2ed3a0", region: "Upper body" },
    quads:      { name: "Quadriceps (front legs)",  color: "#ff4d8d", region: "Lower body" },
    hamstrings: { name: "Hamstrings (back legs)",   color: "#9ad94a", region: "Lower body" }
  },

  // Headline numbers on the first screen.
  counts: { muscles: 7, exercises: 38, equipment: 20, days: 5 },

  // Exercises shown in the hero animation.
  hero: [
    { id: "bench-press",  name: "Barbell Bench Press",             muscle: "chest",     anim: { p: "benchPress", h: "bar" } },
    { id: "deadlift",     name: "Conventional Deadlift",           muscle: "back",      anim: { p: "deadlift",   h: "bar" } },
    { id: "back-squat",   name: "Barbell Back Squat",              muscle: "quads",     anim: { p: "squat",      h: "barBack" } },
    { id: "ohp",          name: "Standing Barbell Overhead Press", muscle: "shoulders", anim: { p: "ohp",        h: "bar" } },
    { id: "barbell-curl", name: "Barbell Curl",                    muscle: "arms",      anim: { p: "curl",       h: "bar" } },
    { id: "pull-up",      name: "Pull-Up",                         muscle: "back",      anim: { p: "pullUp",     h: "" } }
  ],

  // Filled from Supabase once a subscriber or staff member logs in.
  week: [], equipment: [], exercises: []
};
