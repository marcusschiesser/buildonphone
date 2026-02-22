import type { SuApp } from "@/types";

export const DEFAULT_APPS_SEED_FLAG = "default-apps-seeded-v1";
export const HABIT_TRACKER_LOCALSTORAGE_MIGRATION_FLAG = "habit-tracker-localstorage-v1";

export interface DefaultAppSeed {
  app: Omit<SuApp, "createdAt" | "updatedAt">;
  sourcePath: string;
  userMessage: string;
  assistantMessage: string;
}

export const DEFAULT_APP_SEEDS: DefaultAppSeed[] = [
  {
    app: {
      id: "default-trip-planner",
      name: "AI Trip Planner",
      description: "Generate a compact day-by-day itinerary with AI.",
      icon: "map",
      theme: "clean travel planner with clear cards and compact typography",
      isDefault: true,
      currentVersion: 1,
    },
    sourcePath: "/default-apps/trip-planner.jsx",
    userMessage:
      "Build a mobile trip planner that creates a compact day-by-day itinerary.",
    assistantMessage:
      "I created `app.jsx` with destination + day inputs, structured itinerary generation, loading/error states, and clean travel cards for each day.",
  },
  {
    app: {
      id: "default-snap-caption",
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
      "Make an app to scan the nutrition label (macros and ingredients list) of any food packaging using the camera. The label could be in any language. Use AI to extract calories, protein, fat, carbs and each ingredient and translate them to English. While doing so show a funny progress bar. Then display to the user an aggregated health score together with a funny witty verdict of the health value of the food from the point of view of Bryan Johnson. Below that show calories, protein, fat, carbs, and below that the ingredient list. Next to each ingredient show a health score from 0-10, 10 being the best. Below each ingredient explain in one sentence in easy language what it is..",
    assistantMessage:
      "I created `app.jsx` with live camera capture, animated analysis progress, AI extraction for macros and ingredients, ingredient-level health scoring, and a Bryan Johnson verdict with an overall health score.",
  },
  {
    app: {
      id: "default-habit-streak",
      name: "Habit Streak Tracker",
      description: "Track daily habits with fast local interactions.",
      icon: "checklist",
      theme: "friendly productivity app with energetic green accents",
      isDefault: true,
      currentVersion: 1,
    },
    sourcePath: "/default-apps/habit-tracker.jsx",
    userMessage:
      "Make a habit tracker with streaks and fast interactions for mobile.",
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
