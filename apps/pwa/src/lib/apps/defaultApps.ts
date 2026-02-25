import type { SuApp } from "@/types";

export const DEFAULT_APPS_SEED_FLAG = "default-apps-seeded-v1";

export interface DefaultAppSeed {
  app: Omit<SuApp, "createdAt" | "updatedAt">;
  sourcePath: string;
  userMessage: string;
  assistantMessage: string;
}

export const DEFAULT_APP_SEEDS: DefaultAppSeed[] = [
  {
    app: {
      id: "trip-planner",
      name: "AI Trip Planner",
      description: "Generate a compact day-by-day itinerary with AI.",
      icon: "map",
      theme: "clean travel planner with clear cards and compact typography",
      isDefault: true,
      currentVersion: 1,
    },
    sourcePath: "/default-apps/trip-planner.jsx",
    userMessage:
      "Build a AI trip planner where users enter a destination and trip length in days, then generate a compact day-by-day itinerary with morning, afternoon, and evening activities for each day. Keep the plan practical and walkable, include variety across food/sightseeing/relaxing activities, and show clear loading and error states while generating. The UI should feel clean and modern, with readable cards per day.",
    assistantMessage: `Here's what was built in \`app.jsx\`:

---

### ✈️ AI Trip Planner

**Features:**

- **Input form** — Clean destination text field + dropdown for 1–7 day trips, both with icon prefixes and disabled states during generation
- **AI streaming** — Uses \`window.__CLAW2GO_AI__.streamText\` with structured object output, streaming day cards as they arrive in real-time
- **Schema** — Returns an array of days, each with a \`theme\`, and \`morning\`/\`afternoon\`/\`evening\` slots containing an \`activity\` and a concise \`tip\`
- **Loading states** — Skeleton pulse cards shown immediately (correct count), last streaming card also pulses while it's being filled in, and a spinner replaces the button text
- **Error handling** — Surfaces the actual \`err.message\` in a red alert card
- **Empty state** — Globe icon with friendly prompt before any generation
- **Day cards** — Each has a gradient header with the day number + theme, and three color-coded slots:
  - 🌤 **Morning** — amber tones
  - ☁️ **Afternoon** — sky/blue tones
  - 🌙 **Evening** — indigo/purple tones
- **Footer note** — Reminds users to verify hours and book ahead where needed
- Fully responsive, sticky header, and polished typography throughout`,
  },
  {
    app: {
      id: "nutrition-scanner",
      name: "Nutrition Label Scanner",
      description:
        "Scan food labels with the camera and get AI macro + ingredient health analysis.",
      icon: "camera",
      theme:
        "bold scanner UI with purple gradients, progress feedback, and data-rich result cards",
      isDefault: true,
      currentVersion: 1,
    },
    sourcePath: "/default-apps/nutrition-scanner.jsx",
    userMessage:
      "Make an app to scan the nutrition label (macros and ingredients list) of any food packaging using the camera. The label could be in any language. Use AI to extract calories, protein, fat, carbs and each ingredient and translate them to English. While doing so show a funny progress bar. Then display to the user an aggregated health score together with a funny witty verdict of the health value of the food from the point of view of Bryan Johnson. Below that show calories, protein, fat, carbs, and below that the ingredient list. Next to each ingredient show a health score from 0-10, 10 being the best. Below each ingredient explain in one sentence in easy language what it is.",
    assistantMessage:
      "I created `app.jsx` with live camera capture, animated analysis progress, AI extraction for macros and ingredients, ingredient-level health scoring, and a Bryan Johnson verdict with an overall health score.",
  },
  {
    app: {
      id: "habit-streak",
      name: "Habit Streak Tracker",
      description: "Track daily habits with fast local interactions.",
      icon: "checklist",
      theme: "friendly productivity app with energetic green accents",
      isDefault: true,
      currentVersion: 1,
    },
    sourcePath: "/default-apps/habit-tracker.jsx",
    userMessage:
      "Make a mobile habit tracker focused on streaks and speed. Start with a few sensible default habits, allow users to add and delete habits, and let them increment streaks with one tap. Show a clear summary metric (like total streak points) and keep the UI lightweight and touch-friendly. Persist habits in localStorage so data survives page refresh and app reopen.",
    assistantMessage:
      "I created `app.jsx` with starter habits, add-habit input, one-tap streak updates, and a summarized total streak score.",
  },
];

export function shouldSeedDefaultApps(
  hasSeedFlag: boolean,
  existingAppsCount: number,
): boolean {
  return !hasSeedFlag && existingAppsCount === 0;
}
