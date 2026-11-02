// All gym content lives here: muscles, the weekly split, equipment and exercises.
// Edit this file to change the program — the website is generated from it.

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

  // dow: 0 = Sunday ... 6 = Saturday. Each training day targets one or two muscles.
  week: [
    { dow: 0, day: "Sunday",    title: "Chest Day",            muscles: ["chest"] },
    { dow: 1, day: "Monday",    title: "Back Day",             muscles: ["back"] },
    { dow: 2, day: "Tuesday",   title: "Shoulder Day",         muscles: ["shoulders"] },
    { dow: 3, day: "Wednesday", title: "Leg Day (Lower Body)", muscles: ["quads", "hamstrings"] },
    { dow: 4, day: "Thursday",  title: "Arms Day",             muscles: ["triceps", "arms"] },
    { dow: 5, day: "Friday",    title: "Rest & Recovery",      muscles: [] },
    { dow: 6, day: "Saturday",  title: "Rest & Recovery",      muscles: [] }
  ],

  equipment: [
    { id: "barbell",      cat: "Free weights",   name: "Olympic Barbell & Plates",      desc: "20 kg Olympic bars with iron and bumper plates from 1.25 kg to 25 kg. The base of every heavy compound lift." },
    { id: "ezbar",        cat: "Free weights",   name: "EZ Curl Bar",                   desc: "Cambered bar that puts the wrists in a semi-supinated angle — easier on the elbows for curls and skull crushers." },
    { id: "dumbbells",    cat: "Free weights",   name: "Dumbbell Rack (2.5 – 50 kg)",   desc: "Full pairs in 2.5 kg steps. Lets each side work independently and fixes left/right imbalances." },
    { id: "benchstation", cat: "Benches & racks", name: "Olympic Bench Press Station",  desc: "Flat bench with built-in bar uprights and spotter platform for barbell pressing." },
    { id: "flatbench",    cat: "Benches & racks", name: "Flat Utility Bench",           desc: "Stable padded bench used for dumbbell work, rows, dips and skull crushers." },
    { id: "adjbench",     cat: "Benches & racks", name: "Adjustable Incline Bench",     desc: "Back pad adjusts from flat to 90°. Used for incline presses, seated presses and incline curls." },
    { id: "declinebench", cat: "Benches & racks", name: "Decline Bench",                desc: "Head-down bench with leg hooks, angles pressing toward the lower chest." },
    { id: "powerrack",    cat: "Benches & racks", name: "Power / Squat Rack",           desc: "Cage with J-hooks and safety arms — squat, press and good-morning safely without a spotter." },
    { id: "pullup",       cat: "Benches & racks", name: "Pull-Up & Dip Station",        desc: "Tower with a pull-up bar and parallel dip handles for bodyweight back, chest and triceps work." },
    { id: "cable",        cat: "Cable machines",  name: "Cable Crossover Station",      desc: "Two adjustable pulleys (high to low) with rope, D-handle and straight-bar attachments. Constant tension through the whole range." },
    { id: "latpulldown",  cat: "Cable machines",  name: "Lat Pulldown Machine",         desc: "Seated high-pulley station with knee pads. Builds back width and is the step before full pull-ups." },
    { id: "seatedrow",    cat: "Cable machines",  name: "Seated Cable Row",             desc: "Low-pulley row with foot plate and V-handle for mid-back thickness." },
    { id: "pecdeck",      cat: "Machines",        name: "Pec Deck / Rear Delt Machine", desc: "Dual-function fly machine: face the pad for rear delts, sit back for chest flys." },
    { id: "preacher",     cat: "Machines",        name: "Preacher Curl Bench",          desc: "Angled arm pad that locks the upper arm in place so the biceps can't cheat." },
    { id: "legpress",     cat: "Machines",        name: "45° Leg Press",                desc: "Plate-loaded sled for heavy quad and glute work with full back support." },
    { id: "hacksquat",    cat: "Machines",        name: "Hack Squat Machine",           desc: "Angled sled squat that keeps the torso upright and puts the load on the quadriceps." },
    { id: "legext",       cat: "Machines",        name: "Leg Extension Machine",        desc: "Seated machine that isolates the quadriceps through knee extension." },
    { id: "lyingcurl",    cat: "Machines",        name: "Lying Leg Curl Machine",       desc: "Face-down machine that isolates the hamstrings through knee flexion." },
    { id: "seatedcurl",   cat: "Machines",        name: "Seated Leg Curl Machine",      desc: "Seated curl that trains the hamstrings in a lengthened (hip-flexed) position." },
    { id: "hyper",        cat: "Benches & racks", name: "45° Hyperextension Bench",     desc: "Angled bench with ankle hooks for lower-back, glute and hamstring extensions." }
  ],

  // type: Compound (several joints) or Isolation (one joint).
  // form: the training tool family. anim: stick-figure demo pattern (p) and what's in the hands (h).
  // Exercises are listed compound-first; the schedule takes the first N for each level.
  exercises: [
    // ---------------- CHEST ----------------
    {
      id: "bench-press", muscle: "chest", name: "Barbell Bench Press",
      type: "Compound", form: "Free weight · Barbell", level: "All levels",
      equipment: ["benchstation", "barbell"], secondary: "Front shoulders, triceps",
      anim: { p: "benchPress", h: "bar" },
      steps: [
        "Lie on the bench with your eyes under the bar, feet flat on the floor and shoulder blades squeezed together.",
        "Grip the bar slightly wider than shoulder width and lift it out of the rack so it sits over your shoulders.",
        "Breathe in and lower the bar under control to your mid / lower chest, elbows about 45–70° from your body.",
        "Press the bar up and slightly back until your arms are straight over your shoulders, then breathe out."
      ],
      tips: ["Keep a slight natural arch and your glutes on the bench.", "Always use a spotter or the safety arms for heavy sets."],
      mistakes: ["Bouncing the bar off the chest.", "Flaring the elbows out to 90°, which stresses the shoulders."]
    },
    {
      id: "incline-db-press", muscle: "chest", name: "Incline Dumbbell Press",
      type: "Compound", form: "Free weight · Dumbbells", level: "All levels",
      equipment: ["adjbench", "dumbbells"], secondary: "Front shoulders, triceps",
      anim: { p: "inclinePress", h: "db" },
      steps: [
        "Set the bench to 30–45° and sit back with a dumbbell resting on each thigh.",
        "Kick the dumbbells up one at a time and hold them beside your upper chest, palms facing forward.",
        "Press both dumbbells up and slightly together until your arms are straight above your upper chest.",
        "Lower slowly until you feel a stretch across the upper chest."
      ],
      tips: ["30° hits the upper chest best; higher angles shift work to the shoulders.", "Keep the shoulder blades pinned back to the bench."],
      mistakes: ["Setting the bench too steep.", "Clanking the dumbbells together and losing tension at the top."]
    },
    {
      id: "decline-press", muscle: "chest", name: "Decline Bench Press",
      type: "Compound", form: "Free weight · Barbell", level: "Intermediate",
      equipment: ["declinebench", "barbell"], secondary: "Triceps, front shoulders",
      anim: { p: "declinePress", h: "bar" },
      steps: [
        "Hook your legs under the pads and lie back on the decline bench.",
        "Unrack the bar with a grip slightly wider than your shoulders.",
        "Lower the bar to your lower chest, keeping your elbows tucked at about 45°.",
        "Press the bar back up in a straight line until your arms are locked out."
      ],
      tips: ["Use a moderate decline (15–30°).", "Have a spotter hand you the bar — unracking head-down is awkward."],
      mistakes: ["Touching the bar to the neck or upper chest.", "Using a decline so steep that blood rushes to the head."]
    },
    {
      id: "chest-dips", muscle: "chest", name: "Chest Dips",
      type: "Compound", form: "Bodyweight", level: "Intermediate",
      equipment: ["pullup"], secondary: "Triceps, front shoulders",
      anim: { p: "dip", h: "" },
      steps: [
        "Grip the parallel bars and press yourself up until your arms are straight.",
        "Lean your torso forward about 30° and bend your knees slightly.",
        "Lower yourself until your upper arms are about parallel to the floor and you feel a stretch in the chest.",
        "Push back up to the start, keeping the forward lean."
      ],
      tips: ["The forward lean makes it a chest exercise; staying upright makes it a triceps exercise.", "Add a dip belt once you can do 12+ clean reps."],
      mistakes: ["Dropping too deep and straining the front of the shoulder.", "Swinging the legs to get up."]
    },
    {
      id: "cable-crossover", muscle: "chest", name: "Cable Crossover",
      type: "Isolation", form: "Cable", level: "All levels",
      equipment: ["cable"], secondary: "Front shoulders",
      anim: { p: "fly", h: "" },
      steps: [
        "Set both pulleys high, grab a D-handle in each hand and take one step forward into a staggered stance.",
        "With a slight bend in the elbows, open your arms wide until you feel a stretch in the chest.",
        "Bring the handles down and together in a hugging arc in front of your lower chest.",
        "Squeeze for one second, then return slowly along the same arc."
      ],
      tips: ["Think about bringing your biceps together, not your hands.", "Low pulleys target the upper chest; high pulleys target the lower chest."],
      mistakes: ["Bending the elbows and turning it into a press.", "Using too much weight and rocking the body."]
    },
    {
      id: "pec-deck", muscle: "chest", name: "Pec Deck Fly",
      type: "Isolation", form: "Machine", level: "Beginner friendly",
      equipment: ["pecdeck"], secondary: "Front shoulders",
      anim: { p: "pecDeck", h: "" },
      steps: [
        "Adjust the seat so the handles are at chest height and sit with your back flat on the pad.",
        "Grab the handles with a slight bend in the elbows.",
        "Bring the handles together in front of your chest in a wide arc.",
        "Hold the squeeze for a second and return slowly until you feel a stretch."
      ],
      tips: ["Great finisher — use slow reps and a strong squeeze.", "Keep your chest up and shoulders down."],
      mistakes: ["Letting the weight stack slam between reps.", "Rolling the shoulders forward at the end."]
    },

    // ---------------- BACK ----------------
    {
      id: "deadlift", muscle: "back", name: "Conventional Deadlift",
      type: "Compound", form: "Free weight · Barbell", level: "Intermediate",
      equipment: ["barbell"], secondary: "Hamstrings, glutes, traps, forearms",
      anim: { p: "deadlift", h: "bar" },
      steps: [
        "Stand with feet hip-width apart and the bar over the middle of your feet.",
        "Hinge down and grip the bar just outside your legs; bend the knees until your shins touch the bar.",
        "Brace your core, flatten your back and pull the slack out of the bar.",
        "Drive through the floor and stand up tall, keeping the bar close to your legs; lower it the same way."
      ],
      tips: ["Take a big breath and brace before every rep.", "Use chalk or straps when grip becomes the limit."],
      mistakes: ["Rounding the lower back.", "Letting the bar drift away from the body."]
    },
    {
      id: "pull-up", muscle: "back", name: "Pull-Up",
      type: "Compound", form: "Bodyweight", level: "Intermediate",
      equipment: ["pullup"], secondary: "Biceps, rear shoulders",
      anim: { p: "pullUp", h: "" },
      steps: [
        "Hang from the bar with an overhand grip slightly wider than your shoulders.",
        "Pull your shoulder blades down and back to start the movement.",
        "Pull yourself up by driving your elbows down until your chin passes the bar.",
        "Lower yourself under control to a full hang."
      ],
      tips: ["Can't do one yet? Use the lat pulldown or a resistance band.", "Cross your ankles to stop swinging."],
      mistakes: ["Kicking or swinging (kipping).", "Doing half reps without a full hang."]
    },
    {
      id: "lat-pulldown", muscle: "back", name: "Lat Pulldown",
      type: "Compound", form: "Cable machine", level: "Beginner friendly",
      equipment: ["latpulldown"], secondary: "Biceps, rear shoulders",
      anim: { p: "latPulldown", h: "" },
      steps: [
        "Sit with your thighs locked under the pads and grab the bar wider than shoulder width.",
        "Lean back slightly and lift your chest.",
        "Pull the bar down to your upper chest, driving your elbows toward your hips.",
        "Let the bar rise slowly until your arms are straight and your lats are stretched."
      ],
      tips: ["Imagine putting your elbows into your back pockets.", "Keep the torso still — the arms do the moving."],
      mistakes: ["Pulling the bar behind the neck.", "Leaning far back and turning it into a row."]
    },
    {
      id: "barbell-row", muscle: "back", name: "Barbell Bent-Over Row",
      type: "Compound", form: "Free weight · Barbell", level: "Intermediate",
      equipment: ["barbell"], secondary: "Biceps, rear shoulders, lower back",
      anim: { p: "barbellRow", h: "bar" },
      steps: [
        "Hold the bar with an overhand grip, knees soft, and hinge forward until your torso is about 45° or lower.",
        "Let the bar hang at arm's length below your shoulders.",
        "Row the bar to your lower stomach by pulling your elbows back past your body.",
        "Squeeze your shoulder blades together, then lower the bar slowly."
      ],
      tips: ["Keep your back flat and neck neutral the whole set.", "An underhand grip brings in more biceps and lower lats."],
      mistakes: ["Standing up more with every rep.", "Jerking the weight with the hips."]
    },
    {
      id: "seated-row", muscle: "back", name: "Seated Cable Row",
      type: "Compound", form: "Cable machine", level: "Beginner friendly",
      equipment: ["seatedrow"], secondary: "Biceps, rear shoulders",
      anim: { p: "seatedRow", h: "" },
      steps: [
        "Sit with your feet on the plate, knees slightly bent, and hold the V-handle with straight arms.",
        "Sit tall with your chest up.",
        "Pull the handle to your stomach, keeping your elbows close to your sides.",
        "Squeeze your shoulder blades, then extend your arms slowly and let the shoulders stretch forward."
      ],
      tips: ["Lead the pull with your elbows, not your hands.", "Pause one second at the stomach."],
      mistakes: ["Rocking the torso back and forth.", "Shrugging the shoulders up to the ears."]
    },
    {
      id: "db-row", muscle: "back", name: "One-Arm Dumbbell Row",
      type: "Compound", form: "Free weight · Dumbbell", level: "All levels",
      equipment: ["dumbbells", "flatbench"], secondary: "Biceps, rear shoulders",
      anim: { p: "dbRow", h: "db" },
      steps: [
        "Place one knee and the same-side hand on a flat bench, back flat and parallel to the floor.",
        "Hold a dumbbell in the other hand with the arm hanging straight down.",
        "Row the dumbbell toward your hip, keeping the elbow close to your body.",
        "Lower until the arm is straight and the lat is stretched, then switch sides."
      ],
      tips: ["Pull toward the hip, not the chest, for more lat.", "Keep your hips square to the floor."],
      mistakes: ["Twisting the torso to lift the weight.", "Cutting the stretch short at the bottom."]
    },

    // ---------------- SHOULDERS ----------------
    {
      id: "ohp", muscle: "shoulders", name: "Standing Barbell Overhead Press",
      type: "Compound", form: "Free weight · Barbell", level: "Intermediate",
      equipment: ["barbell", "powerrack"], secondary: "Triceps, upper chest, core",
      anim: { p: "ohp", h: "bar" },
      steps: [
        "Take the bar from the rack at collarbone height, hands just outside your shoulders.",
        "Squeeze your glutes and brace your core.",
        "Press the bar straight up, moving your head back slightly so the bar passes your face.",
        "Lock out with the bar over the middle of your head, then lower it to the collarbones."
      ],
      tips: ["Push your head \"through the window\" once the bar passes your forehead.", "Keep your ribs down — don't lean back."],
      mistakes: ["Over-arching the lower back.", "Pressing the bar forward instead of straight up."]
    },
    {
      id: "seated-db-press", muscle: "shoulders", name: "Seated Dumbbell Shoulder Press",
      type: "Compound", form: "Free weight · Dumbbells", level: "All levels",
      equipment: ["adjbench", "dumbbells"], secondary: "Triceps",
      anim: { p: "seatedPress", h: "db" },
      steps: [
        "Set the bench upright (80–90°) and sit with your back against the pad.",
        "Hold the dumbbells at shoulder height, palms facing forward, elbows slightly in front of the body.",
        "Press the dumbbells up until your arms are almost straight.",
        "Lower slowly back to shoulder height."
      ],
      tips: ["Keep your back on the pad.", "Stop just short of locking out to keep tension on the shoulders."],
      mistakes: ["Lowering only halfway.", "Arching off the bench to lift heavier."]
    },
    {
      id: "lateral-raise", muscle: "shoulders", name: "Dumbbell Lateral Raise",
      type: "Isolation", form: "Free weight · Dumbbells", level: "All levels",
      equipment: ["dumbbells"], secondary: "Upper traps",
      anim: { p: "lateralRaise", h: "db" },
      steps: [
        "Stand tall with a light dumbbell in each hand at your sides.",
        "With a slight bend in the elbows, raise your arms out to the sides.",
        "Stop when your arms are parallel to the floor, leading with the elbows.",
        "Lower slowly over 2–3 seconds."
      ],
      tips: ["Builds the side delts — the key to wider-looking shoulders.", "Light weight and strict form beat heavy swinging."],
      mistakes: ["Shrugging the weight up with the traps.", "Swinging the body for momentum."]
    },
    {
      id: "front-raise", muscle: "shoulders", name: "Dumbbell Front Raise",
      type: "Isolation", form: "Free weight · Dumbbells", level: "Beginner friendly",
      equipment: ["dumbbells"], secondary: "Upper chest",
      anim: { p: "frontRaise", h: "db" },
      steps: [
        "Stand with dumbbells in front of your thighs, palms facing your body.",
        "Keeping your arms almost straight, raise the dumbbells in front of you.",
        "Stop at shoulder height.",
        "Lower slowly to the start."
      ],
      tips: ["Alternate arms if you feel your lower back working.", "Brace your core to stop leaning back."],
      mistakes: ["Lifting above head height.", "Using momentum from the hips."]
    },
    {
      id: "reverse-pec-deck", muscle: "shoulders", name: "Reverse Pec Deck",
      type: "Isolation", form: "Machine", level: "Beginner friendly",
      equipment: ["pecdeck"], secondary: "Upper back, rhomboids",
      anim: { p: "reversePecDeck", h: "" },
      steps: [
        "Sit facing the machine with your chest against the pad.",
        "Grab the handles at shoulder height with straight arms.",
        "Sweep your arms out and back until they are in line with your body.",
        "Pause, then return slowly."
      ],
      tips: ["Targets the rear delts, which balance out all the pressing work.", "Think \"push the handles away\" rather than squeezing the shoulder blades."],
      mistakes: ["Bending the elbows and pulling.", "Using too much weight and jerking."]
    },
    {
      id: "face-pull", muscle: "shoulders", name: "Cable Face Pull",
      type: "Isolation", form: "Cable", level: "All levels",
      equipment: ["cable"], secondary: "Rotator cuff, upper back",
      anim: { p: "facePull", h: "" },
      steps: [
        "Set a rope on the pulley at face height and hold the ends with thumbs pointing back.",
        "Step back until the arms are straight and the weight is lifted.",
        "Pull the rope toward your face, splitting the ends beside your ears with elbows high.",
        "Hold for a second, then return slowly."
      ],
      tips: ["One of the best exercises for shoulder health and posture.", "Finish with your hands beside your ears like a double-biceps pose."],
      mistakes: ["Letting the elbows drop below the hands.", "Leaning back to move more weight."]
    },

    // ---------------- TRICEPS ----------------
    {
      id: "close-grip-bench", muscle: "triceps", name: "Close-Grip Bench Press",
      type: "Compound", form: "Free weight · Barbell", level: "Intermediate",
      equipment: ["benchstation", "barbell"], secondary: "Chest, front shoulders",
      anim: { p: "benchPress", h: "bar" },
      steps: [
        "Lie on the bench and grip the bar with hands shoulder-width apart.",
        "Unrack the bar and hold it over your shoulders.",
        "Lower the bar to your lower chest, keeping your elbows tucked close to your sides.",
        "Press back up, focusing on straightening the elbows."
      ],
      tips: ["Shoulder width is close enough — narrower hurts the wrists.", "The heaviest triceps exercise; great for strength."],
      mistakes: ["Hands touching in the middle of the bar.", "Elbows flaring out."]
    },
    {
      id: "rope-pushdown", muscle: "triceps", name: "Rope Triceps Pushdown",
      type: "Isolation", form: "Cable", level: "Beginner friendly",
      equipment: ["cable"], secondary: "—",
      anim: { p: "pushdown", h: "" },
      steps: [
        "Attach a rope to the high pulley and hold the ends with palms facing each other.",
        "Pin your elbows to your sides and lean forward slightly.",
        "Push the rope down until your arms are straight, spreading the ends apart at the bottom.",
        "Let the rope rise slowly until your forearms pass parallel."
      ],
      tips: ["Only the forearms move — the elbows stay glued to your sides.", "Squeeze the triceps hard at the bottom."],
      mistakes: ["Elbows drifting forward.", "Using the body weight to push the stack down."]
    },
    {
      id: "skull-crusher", muscle: "triceps", name: "EZ-Bar Skull Crusher",
      type: "Isolation", form: "Free weight · EZ bar", level: "Intermediate",
      equipment: ["ezbar", "flatbench"], secondary: "—",
      anim: { p: "skullCrusher", h: "ez" },
      steps: [
        "Lie on a flat bench and hold the EZ bar over your chest with arms straight.",
        "Tilt your arms slightly back toward your head.",
        "Bend only at the elbows and lower the bar to just behind your forehead.",
        "Extend the elbows to bring the bar back up."
      ],
      tips: ["The slight backward tilt keeps tension on the long head of the triceps.", "Use a spotter or start light."],
      mistakes: ["Elbows flaring wide.", "Turning it into a press by moving the upper arms."]
    },
    {
      id: "overhead-extension", muscle: "triceps", name: "Overhead Dumbbell Extension",
      type: "Isolation", form: "Free weight · Dumbbell", level: "All levels",
      equipment: ["dumbbells", "adjbench"], secondary: "—",
      anim: { p: "overheadExt", h: "db" },
      steps: [
        "Sit on an upright bench and hold one dumbbell with both hands above your head.",
        "Keep your upper arms close to your ears.",
        "Lower the dumbbell behind your head until you feel a deep stretch.",
        "Extend your elbows to press it back up."
      ],
      tips: ["The overhead position stretches the long head — great for arm size.", "Keep your core tight to protect the lower back."],
      mistakes: ["Elbows pointing out to the sides.", "Arching the lower back."]
    },
    {
      id: "bench-dips", muscle: "triceps", name: "Bench Dips",
      type: "Compound", form: "Bodyweight", level: "Beginner friendly",
      equipment: ["flatbench"], secondary: "Chest, front shoulders",
      anim: { p: "benchDip", h: "" },
      steps: [
        "Sit on the edge of a bench, hands beside your hips, and slide your hips off the bench.",
        "Straighten your legs out in front (bend them to make it easier).",
        "Bend your elbows to lower your body until your upper arms are parallel to the floor.",
        "Press back up until your arms are straight."
      ],
      tips: ["Keep your back close to the bench.", "Put a plate on your lap to make it harder."],
      mistakes: ["Dropping too low and straining the shoulders.", "Pushing with the legs."]
    },

    // ---------------- ARMS (BICEPS & FOREARMS) ----------------
    {
      id: "barbell-curl", muscle: "arms", name: "Barbell Curl",
      type: "Isolation", form: "Free weight · Barbell", level: "All levels",
      equipment: ["barbell"], secondary: "Forearms",
      anim: { p: "curl", h: "bar" },
      steps: [
        "Stand tall and hold the bar with an underhand grip at shoulder width.",
        "Keep your elbows at your sides.",
        "Curl the bar up toward your shoulders, squeezing the biceps.",
        "Lower slowly until your arms are fully straight."
      ],
      tips: ["The main mass builder for the biceps.", "Use a slow 3-second lowering phase."],
      mistakes: ["Swinging the hips to start the rep.", "Elbows moving forward at the top."]
    },
    {
      id: "hammer-curl", muscle: "arms", name: "Hammer Curl",
      type: "Isolation", form: "Free weight · Dumbbells", level: "All levels",
      equipment: ["dumbbells"], secondary: "Brachialis, forearms",
      anim: { p: "curl", h: "db" },
      steps: [
        "Stand with a dumbbell in each hand, palms facing your body (neutral grip).",
        "Keep the elbows at your sides.",
        "Curl the dumbbells up without rotating your wrists.",
        "Lower under control."
      ],
      tips: ["Builds the brachialis and forearms — makes the arm look thicker.", "Alternate arms or curl both together."],
      mistakes: ["Swinging the weights.", "Twisting the wrists into a normal curl."]
    },
    {
      id: "preacher-curl", muscle: "arms", name: "Preacher Curl",
      type: "Isolation", form: "Machine bench · EZ bar", level: "All levels",
      equipment: ["preacher", "ezbar"], secondary: "Forearms",
      anim: { p: "preacherCurl", h: "ez" },
      steps: [
        "Sit at the preacher bench with your armpits on top of the pad.",
        "Hold the EZ bar with an underhand grip, arms resting on the pad.",
        "Curl the bar up until your forearms are almost vertical.",
        "Lower slowly until your arms are nearly straight."
      ],
      tips: ["The pad stops you from cheating — every rep is pure biceps.", "Don't fully lock out at the bottom under heavy load."],
      mistakes: ["Lifting the elbows off the pad.", "Dropping the weight quickly at the bottom."]
    },
    {
      id: "incline-curl", muscle: "arms", name: "Incline Dumbbell Curl",
      type: "Isolation", form: "Free weight · Dumbbells", level: "Intermediate",
      equipment: ["adjbench", "dumbbells"], secondary: "Forearms",
      anim: { p: "inclineCurl", h: "db" },
      steps: [
        "Set the bench to 45–60° and lie back with dumbbells hanging straight down.",
        "Let the arms hang behind your torso to stretch the biceps.",
        "Curl the dumbbells up, keeping your upper arms still.",
        "Lower slowly back to the full stretch."
      ],
      tips: ["The stretched start position targets the long head of the biceps.", "Use lighter weights than standing curls."],
      mistakes: ["Bringing the elbows forward.", "Lifting the head and shoulders off the bench."]
    },
    {
      id: "reverse-curl", muscle: "arms", name: "Reverse-Grip EZ-Bar Curl",
      type: "Isolation", form: "Free weight · EZ bar", level: "All levels",
      equipment: ["ezbar"], secondary: "Forearms, brachialis",
      anim: { p: "curl", h: "ez" },
      steps: [
        "Hold the EZ bar with an overhand (palms down) grip at shoulder width.",
        "Keep the elbows at your sides and the wrists straight.",
        "Curl the bar up toward your shoulders.",
        "Lower slowly to full extension."
      ],
      tips: ["One of the best forearm builders.", "Keep the weight lighter than a normal curl."],
      mistakes: ["Letting the wrists bend back.", "Using the hips to swing."]
    },

    // ---------------- QUADRICEPS ----------------
    {
      id: "back-squat", muscle: "quads", name: "Barbell Back Squat",
      type: "Compound", form: "Free weight · Barbell", level: "Intermediate",
      equipment: ["barbell", "powerrack"], secondary: "Glutes, hamstrings, core",
      anim: { p: "squat", h: "barBack" },
      steps: [
        "Set the bar on your upper back (traps), feet shoulder-width apart, toes turned out slightly.",
        "Brace your core with a deep breath.",
        "Sit down and back, pushing your knees out over your toes, until your thighs are at least parallel.",
        "Drive up through the whole foot to standing."
      ],
      tips: ["Set the safety arms just below your bottom position.", "Keep your chest up and knees tracking over the toes."],
      mistakes: ["Knees collapsing inward.", "Heels lifting off the floor."]
    },
    {
      id: "leg-press", muscle: "quads", name: "45° Leg Press",
      type: "Compound", form: "Machine", level: "Beginner friendly",
      equipment: ["legpress"], secondary: "Glutes, hamstrings",
      anim: { p: "legPress", h: "" },
      steps: [
        "Sit with your back flat against the pad and feet shoulder-width on the platform.",
        "Push the platform up and release the safety handles.",
        "Lower the platform until your knees reach about 90°.",
        "Press back up without locking your knees."
      ],
      tips: ["Feet lower on the platform = more quads; higher = more glutes and hamstrings.", "Always re-engage the safeties at the end."],
      mistakes: ["Lowering so deep the hips lift off the seat.", "Snapping the knees straight at the top."]
    },
    {
      id: "hack-squat", muscle: "quads", name: "Hack Squat",
      type: "Compound", form: "Machine", level: "All levels",
      equipment: ["hacksquat"], secondary: "Glutes",
      anim: { p: "hackSquat", h: "" },
      steps: [
        "Stand on the platform with your back and shoulders against the pads.",
        "Place feet shoulder-width, slightly forward, and release the safety handles.",
        "Squat down until your thighs are parallel to the platform or lower.",
        "Push through your feet to return to the top."
      ],
      tips: ["Keeps the torso upright for maximum quad focus.", "Control the descent — 2 to 3 seconds down."],
      mistakes: ["Heels lifting from the platform.", "Doing quarter reps with too much weight."]
    },
    {
      id: "bulgarian-split-squat", muscle: "quads", name: "Bulgarian Split Squat",
      type: "Compound", form: "Free weight · Dumbbells", level: "Intermediate",
      equipment: ["dumbbells", "flatbench"], secondary: "Glutes, adductors",
      anim: { p: "splitSquat", h: "db" },
      steps: [
        "Stand about two steps in front of a bench and rest the top of your back foot on it.",
        "Hold a dumbbell in each hand at your sides.",
        "Lower your hips straight down until your front thigh is parallel to the floor.",
        "Drive through the front heel to stand back up, then switch legs."
      ],
      tips: ["Fixes strength differences between the legs.", "A more upright torso hits the quads more."],
      mistakes: ["Front knee collapsing inward.", "Standing too close to the bench."]
    },
    {
      id: "leg-extension", muscle: "quads", name: "Leg Extension",
      type: "Isolation", form: "Machine", level: "Beginner friendly",
      equipment: ["legext"], secondary: "—",
      anim: { p: "legExtension", h: "" },
      steps: [
        "Sit with your knees lined up with the machine's pivot and the pad just above your ankles.",
        "Hold the side handles and keep your back against the pad.",
        "Extend your legs until they are straight and squeeze your quads.",
        "Lower slowly to about 90°."
      ],
      tips: ["Perfect warm-up or finisher for the quads.", "Pause one second at the top of each rep."],
      mistakes: ["Kicking the weight up fast.", "Lifting the hips off the seat."]
    },

    // ---------------- HAMSTRINGS ----------------
    {
      id: "rdl", muscle: "hamstrings", name: "Romanian Deadlift",
      type: "Compound", form: "Free weight · Barbell", level: "All levels",
      equipment: ["barbell"], secondary: "Glutes, lower back",
      anim: { p: "rdl", h: "bar" },
      steps: [
        "Stand holding the bar at your thighs, feet hip-width, knees slightly bent.",
        "Push your hips back and let the bar slide down your thighs, keeping your back flat.",
        "Stop when you feel a strong stretch in your hamstrings (usually just below the knees).",
        "Drive your hips forward to stand back up."
      ],
      tips: ["It's a hip movement — the knees stay at the same slight bend.", "Keep the bar touching your legs the whole time."],
      mistakes: ["Rounding the back to reach lower.", "Bending the knees and turning it into a squat."]
    },
    {
      id: "lying-leg-curl", muscle: "hamstrings", name: "Lying Leg Curl",
      type: "Isolation", form: "Machine", level: "Beginner friendly",
      equipment: ["lyingcurl"], secondary: "Calves",
      anim: { p: "lyingCurl", h: "" },
      steps: [
        "Lie face down with your knees just off the edge of the bench and the pad above your heels.",
        "Hold the handles and press your hips into the bench.",
        "Curl your heels toward your glutes as far as you can.",
        "Lower slowly to almost straight legs."
      ],
      tips: ["Point your toes up toward your shins for a stronger contraction.", "Slow lowering = more hamstring growth."],
      mistakes: ["Lifting the hips off the bench.", "Letting the weight drop."]
    },
    {
      id: "seated-leg-curl", muscle: "hamstrings", name: "Seated Leg Curl",
      type: "Isolation", form: "Machine", level: "Beginner friendly",
      equipment: ["seatedcurl"], secondary: "Calves",
      anim: { p: "seatedCurl", h: "" },
      steps: [
        "Sit with the back of your lower legs on the pad and lock the thigh pad down.",
        "Lean slightly forward and hold the handles.",
        "Pull your heels down and back under the seat.",
        "Return slowly until your legs are almost straight."
      ],
      tips: ["The seated position stretches the hamstrings more than the lying version.", "Leaning forward increases the stretch."],
      mistakes: ["Using a short range of motion.", "Letting the hips slide forward."]
    },
    {
      id: "good-morning", muscle: "hamstrings", name: "Barbell Good Morning",
      type: "Compound", form: "Free weight · Barbell", level: "Advanced",
      equipment: ["barbell", "powerrack"], secondary: "Lower back, glutes",
      anim: { p: "goodMorning", h: "barBack" },
      steps: [
        "Place a light bar on your upper back as for a squat, feet hip-width.",
        "Soften your knees and brace your core.",
        "Hinge forward from the hips with a flat back until your torso is almost parallel to the floor.",
        "Squeeze your glutes and hamstrings to return upright."
      ],
      tips: ["Start very light — this is a stretch and control exercise.", "Look at the floor a few feet ahead to keep the neck neutral."],
      mistakes: ["Rounding the back.", "Going too heavy too soon."]
    },
    {
      id: "hyperextension", muscle: "hamstrings", name: "45° Hyperextension (Hamstring Focus)",
      type: "Isolation", form: "Bodyweight", level: "Beginner friendly",
      equipment: ["hyper"], secondary: "Glutes, lower back",
      anim: { p: "hyper", h: "" },
      steps: [
        "Set the pad just below your hip bones and hook your heels under the ankle pads.",
        "Cross your arms over your chest (or hold a plate).",
        "Lower your torso by hinging at the hips with a flat back.",
        "Raise yourself until your body forms a straight line — don't over-arch."
      ],
      tips: ["Turn your feet slightly out and push the heels into the pad to load the hamstrings.", "Pause one second at the top."],
      mistakes: ["Swinging up fast.", "Hyper-arching the lower back at the top."]
    }
  ]
};

// Sets & reps for each exercise (the database stores the same values per exercise).
// Rule: reps are never below 10 or above 14. Sets are for intermediate members.
(() => {
  const heavy = ["bench-press", "deadlift", "ohp", "back-squat", "rdl"];
  const smallDelts = ["lateral-raise", "face-pull", "reverse-pec-deck"];
  for (const e of window.GYM.exercises) {
    const [sets, repsMin, repsMax] =
      heavy.includes(e.id) ? [4, 10, 10] :
      smallDelts.includes(e.id) ? [4, 12, 14] :
      e.type === "Compound" ? [4, 10, 12] : [3, 12, 14];
    Object.assign(e, { sets, repsMin, repsMax });
  }
})();

// Starting weights in kg for 10–14 reps: [beginner, intermediate, advanced, what the number means].
// Bodyweight moves use 0 for "bodyweight only"; higher numbers are extra weight (belt, plate).
(() => {
  const BAR = "total incl. 20 kg bar", EZ = "total incl. EZ bar", DB = "per dumbbell", ONE = "one dumbbell",
    STACK = "machine stack", HANDLE = "per cable handle", PLATES = "plates loaded", ADD = "added to bodyweight";
  const W = {
    "bench-press": [40, 60, 90, BAR], "incline-db-press": [12, 22, 34, DB], "decline-press": [40, 60, 85, BAR],
    "chest-dips": [0, 0, 15, ADD], "cable-crossover": [7.5, 12.5, 20, HANDLE], "pec-deck": [30, 50, 75, STACK],
    "deadlift": [60, 100, 150, BAR], "pull-up": [0, 0, 10, ADD], "lat-pulldown": [35, 55, 80, STACK],
    "barbell-row": [40, 60, 90, BAR], "seated-row": [35, 55, 80, STACK], "db-row": [16, 26, 40, DB],
    "ohp": [30, 45, 65, BAR], "seated-db-press": [10, 18, 28, DB], "lateral-raise": [5, 8, 12, DB],
    "front-raise": [5, 8, 12, DB], "reverse-pec-deck": [20, 35, 50, STACK], "face-pull": [15, 25, 35, STACK],
    "close-grip-bench": [35, 55, 80, BAR], "rope-pushdown": [15, 25, 40, STACK], "skull-crusher": [15, 25, 40, EZ],
    "overhead-extension": [10, 18, 28, ONE], "bench-dips": [0, 0, 20, ADD],
    "barbell-curl": [20, 30, 45, BAR], "hammer-curl": [8, 14, 20, DB], "preacher-curl": [15, 25, 35, EZ],
    "incline-curl": [6, 10, 16, DB], "reverse-curl": [15, 22, 30, EZ],
    "back-squat": [50, 80, 120, BAR], "leg-press": [80, 140, 220, PLATES], "hack-squat": [40, 80, 130, PLATES],
    "bulgarian-split-squat": [8, 16, 26, DB], "leg-extension": [30, 50, 75, STACK],
    "rdl": [40, 70, 110, BAR], "lying-leg-curl": [20, 35, 55, STACK], "seated-leg-curl": [25, 40, 60, STACK],
    "good-morning": [20, 40, 60, BAR], "hyperextension": [0, 10, 20, ADD]
  };
  for (const e of window.GYM.exercises) {
    const [beginner, intermediate, advanced, basis] = W[e.id];
    e.weights = { beginner, intermediate, advanced, basis };
  }
})();
