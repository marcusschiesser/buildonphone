const { useState, useEffect, useRef } = React;

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.22" y1="4.22" x2="7.05" y2="7.05" />
    <line x1="16.95" y1="16.95" x2="19.78" y2="19.78" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.22" y1="19.78" x2="7.05" y2="16.95" />
    <line x1="16.95" y1="7.05" x2="19.78" y2="4.22" />
  </svg>
);

const CloudIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MapPinIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z"
    />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SparkleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z"
    />
  </svg>
);

const SLOT_STYLES = {
  morning: {
    label: "Morning",
    Icon: SunIcon,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "text-amber-500",
    badge: "bg-amber-100 text-amber-700",
  },
  afternoon: {
    label: "Afternoon",
    Icon: CloudIcon,
    bg: "bg-sky-50",
    border: "border-sky-200",
    iconColor: "text-sky-500",
    badge: "bg-sky-100 text-sky-700",
  },
  evening: {
    label: "Evening",
    Icon: MoonIcon,
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    iconColor: "text-indigo-500",
    badge: "bg-indigo-100 text-indigo-700",
  },
};

function ActivitySlot({ slotKey, activity, tip, loading }) {
  const s = SLOT_STYLES[slotKey];
  return (
    <div
      className={`rounded-xl border ${s.border} ${s.bg} p-3 flex gap-3 items-start`}
    >
      <span className={`mt-0.5 shrink-0 ${s.iconColor}`}>
        <s.Icon />
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${s.badge}`}
        >
          {s.label}
        </span>
        {loading && !activity ? (
          <div className="space-y-1.5 mt-1">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-800 leading-snug">
              {activity || "—"}
            </p>
            {tip && (
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {tip}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DayCard({ day, data, loading }) {
  const slots = ["morning", "afternoon", "evening"];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-500 flex items-center gap-2">
        <span className="text-white font-bold text-sm tracking-wide">
          DAY {day}
        </span>
        {data?.theme && (
          <span className="ml-auto text-xs text-violet-100 font-medium italic truncate">
            {data.theme}
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {slots.map((slot) => (
          <ActivitySlot
            key={slot}
            slotKey={slot}
            activity={data?.[slot]?.activity}
            tip={data?.[slot]?.tip}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}

function LoadingPulse({ days }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: days }).map((_, i) => (
        <DayCard key={i} day={i + 1} data={null} loading={true} />
      ))}
    </div>
  );
}

function App() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamDays, setStreamDays] = useState([]);
  const abortRef = useRef(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!destination.trim() || days < 1) return;

    setLoading(true);
    setError(null);
    setItinerary(null);
    setStreamDays([]);

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        itinerary: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              day: { type: "number" },
              theme: { type: "string" },
              morning: {
                type: "object",
                additionalProperties: false,
                properties: {
                  activity: { type: "string" },
                  tip: { type: "string" },
                },
                required: ["activity", "tip"],
              },
              afternoon: {
                type: "object",
                additionalProperties: false,
                properties: {
                  activity: { type: "string" },
                  tip: { type: "string" },
                },
                required: ["activity", "tip"],
              },
              evening: {
                type: "object",
                additionalProperties: false,
                properties: {
                  activity: { type: "string" },
                  tip: { type: "string" },
                },
                required: ["activity", "tip"],
              },
            },
            required: ["day", "theme", "morning", "afternoon", "evening"],
          },
        },
      },
      required: ["itinerary"],
    };

    const prompt = `You are an expert travel planner. Create a detailed, practical, and walkable ${days}-day trip itinerary for ${destination}.

For each day provide:
- A short theme (3-5 words describing the day's vibe)
- Morning activity: a specific place or experience with a practical tip
- Afternoon activity: mix of sightseeing, food, or culture with a practical tip
- Evening activity: dinner spot or relaxing/nightlife option with a practical tip

Rules:
- Keep activities geographically close so they're walkable or a short transit away
- Vary the types: mix iconic landmarks, local food, hidden gems, relaxation
- Tips should be concise and actionable (best time, price note, booking advice, etc.)
- Be specific with real place names where possible
- Return exactly ${days} days`;

    try {
      const { partialOutputStream } = await window.__CLAW2GO_AI__.streamText({
        prompt,
        output: { type: "object", schema },
      });

      for await (const partial of partialOutputStream) {
        if (partial?.itinerary && Array.isArray(partial.itinerary)) {
          setStreamDays([...partial.itinerary]);
        }
      }

      setItinerary(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasResults = streamDays.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
            <span className="text-white">
              <SparkleIcon />
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">
              AI Trip Planner
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Smart itineraries in seconds
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-6">
        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Destination
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <MapPinIcon />
                </span>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Tokyo, Lisbon, New York..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Trip Length
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <CalendarIcon />
                </span>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition appearance-none"
                  disabled={loading}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      {d} {d === 1 ? "day" : "days"}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !destination.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Crafting your itinerary…
                </>
              ) : (
                <>
                  <SparkleIcon />
                  Generate Itinerary
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
            <svg
              className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-700">
                Generation failed
              </p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton when no stream data yet */}
        {loading && !hasResults && <LoadingPulse days={days} />}

        {/* Stream Results */}
        {hasResults && (
          <div className="space-y-4">
            {/* Destination header */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-violet-500">
                <MapPinIcon />
              </span>
              <h2 className="text-base font-bold text-gray-800">
                {destination}
                <span className="font-normal text-gray-400 ml-1">
                  · {days} {days === 1 ? "day" : "days"}
                </span>
              </h2>
              {loading && (
                <span className="ml-auto text-xs text-violet-500 font-medium animate-pulse">
                  Generating…
                </span>
              )}
            </div>

            {streamDays.map((dayData, i) => (
              <DayCard
                key={i}
                day={dayData.day || i + 1}
                data={dayData}
                loading={loading && i === streamDays.length - 1}
              />
            ))}

            {/* Placeholder cards for remaining days */}
            {loading &&
              streamDays.length < days &&
              Array.from({ length: days - streamDays.length }).map((_, i) => (
                <DayCard
                  key={`ph-${i}`}
                  day={streamDays.length + i + 1}
                  data={null}
                  loading={true}
                />
              ))}

            {!loading && (
              <div className="text-center pt-2">
                <p className="text-xs text-gray-400">
                  ✨ AI-generated suggestions — verify hours and book in advance
                  where needed.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !hasResults && !error && (
          <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold">Where to next?</p>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              Enter a destination and trip length above to generate your
              personalized day-by-day itinerary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("preview-root"));
root.render(<App />);
