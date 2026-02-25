const { useState, useEffect, useRef } = React;

const STORAGE_KEY = "habit_tracker_habits_v1";

const defaultHabits = [
  {
    id: "default_1",
    name: "Morning Meditation",
    emoji: "🧘",
    streak: 0,
    lastChecked: null,
    color: "from-violet-500 to-purple-600",
    totalDays: 0,
  },
  {
    id: "default_2",
    name: "Daily Exercise",
    emoji: "🏃",
    streak: 0,
    lastChecked: null,
    color: "from-emerald-500 to-teal-600",
    totalDays: 0,
  },
];

const COLORS = [
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-green-600",
  "from-cyan-500 to-teal-500",
];

const EMOJIS = [
  "🧘",
  "🏃",
  "📚",
  "💧",
  "🥗",
  "😴",
  "✍️",
  "🎯",
  "🏋️",
  "🎨",
  "🧹",
  "🎵",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isCheckedToday(habit) {
  return habit.lastChecked === todayStr();
}

function StreakFlame({ streak }) {
  const size =
    streak === 0
      ? "text-2xl"
      : streak < 5
        ? "text-3xl"
        : streak < 15
          ? "text-4xl"
          : "text-5xl";
  return (
    <span
      className={`${size} leading-none select-none`}
      title={`${streak} day streak`}
    >
      {streak === 0 ? "💤" : "🔥"}
    </span>
  );
}

function ConfettiPop({ active }) {
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * 360,
      color: ["#f59e0b", "#10b981", "#6366f1", "#f43f5e", "#06b6d4"][i % 5],
    })),
  );
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-10">
      {particles.current.map((p, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: p.color,
            top: "50%",
            left: "50%",
            transform: `translate(-50%,-50%)`,
            animation: `pop-${i % 3} 0.6s ease-out forwards`,
            animationDelay: `${i * 20}ms`,
          }}
        />
      ))}
    </div>
  );
}

function AddHabitModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState(COLORS[4]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({ name: trimmed, emoji, color });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/10">
        <h2 className="text-xl font-bold text-white mb-5">New Habit</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">
              Name
            </label>
            <input
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-base"
              placeholder="e.g. Read 20 pages"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${
                    emoji === em
                      ? "bg-violet-600 ring-2 ring-violet-400 scale-110"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${c} transition-all ${
                    color === c
                      ? "ring-2 ring-white scale-110"
                      : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold hover:bg-white/10 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold shadow-lg hover:brightness-110 transition active:scale-95"
            >
              Add Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HabitCard({ habit, onCheck, onDelete }) {
  const checked = isCheckedToday(habit);
  const [popping, setPopping] = useState(false);

  function handleCheck() {
    if (checked) return;
    setPopping(true);
    setTimeout(() => setPopping(false), 700);
    onCheck(habit.id);
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-lg transition-all duration-200 ${checked ? "opacity-90" : "opacity-100"}`}
    >
      {/* Background gradient strip */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${habit.color}`}
      />

      <div className="bg-gray-800/80 backdrop-blur-sm pl-5 pr-4 py-4 flex items-center gap-4">
        {/* Emoji badge */}
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${habit.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-md`}
        >
          {habit.emoji}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-tight truncate">
            {habit.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-gray-400 text-sm">
              {habit.totalDays} day{habit.totalDays !== 1 ? "s" : ""} total
            </span>
            {checked && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                ✓ Done today
              </span>
            )}
          </div>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mr-2">
          <StreakFlame streak={habit.streak} />
          <span className="text-white font-bold text-sm leading-none">
            {habit.streak}
          </span>
        </div>

        {/* Check button */}
        <button
          onClick={handleCheck}
          disabled={checked}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
            checked
              ? "bg-emerald-500/20 text-emerald-400 cursor-default"
              : `bg-gradient-to-br ${habit.color} text-white shadow-md hover:brightness-110 active:brightness-90`
          }`}
          title={checked ? "Already done today!" : "Mark as done"}
        >
          {checked ? (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          )}
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(habit.id)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-rose-400 hover:bg-rose-400/10 transition flex-shrink-0"
          title="Delete habit"
        >
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      <ConfettiPop active={popping} />
    </div>
  );
}

function SummaryBar({ habits }) {
  const totalStreakPoints = habits.reduce((sum, h) => sum + h.streak, 0);
  const doneToday = habits.filter(isCheckedToday).length;
  const longestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
  const completionPct =
    habits.length > 0 ? Math.round((doneToday / habits.length) * 100) : 0;

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-3xl p-5 border border-white/5 shadow-xl">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-black text-white tabular-nums">
            {totalStreakPoints}
          </span>
          <span className="text-xs text-gray-400 font-medium text-center leading-tight">
            Total Streak Points
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 border-x border-white/10">
          <span className="text-3xl font-black text-white tabular-nums">
            {doneToday}
            <span className="text-gray-500 text-xl font-bold">
              /{habits.length}
            </span>
          </span>
          <span className="text-xs text-gray-400 font-medium text-center leading-tight">
            Done Today
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl font-black text-white tabular-nums">
            {longestStreak}
          </span>
          <span className="text-xs text-gray-400 font-medium text-center leading-tight">
            Longest Streak
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Today&apos;s progress</span>
            <span className="font-semibold text-white">{completionPct}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [habits, setHabits] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return defaultHabits;
  });
  const [showAdd, setShowAdd] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch {}
  }, [habits]);

  function addHabit({ name, emoji, color }) {
    const newHabit = {
      id: `habit_${Date.now()}`,
      name,
      emoji,
      color,
      streak: 0,
      lastChecked: null,
      totalDays: 0,
    };
    setHabits((prev) => [...prev, newHabit]);
  }

  function deleteHabit(id) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }

  function checkHabit(id) {
    const today = todayStr();
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        if (h.lastChecked === today) return h; // already done

        // Check if last check was yesterday for streak continuity
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);
        const newStreak = h.lastChecked === yStr ? h.streak + 1 : 1;

        return {
          ...h,
          streak: newStreak,
          lastChecked: today,
          totalDays: h.totalDays + 1,
        };
      }),
    );
  }

  const allDoneToday = habits.length > 0 && habits.every(isCheckedToday);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full px-4 pt-14 pb-8 gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Streak
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">
                Track
              </span>
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg hover:brightness-110 active:scale-90 transition"
            title="Add habit"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {/* Summary */}
        <SummaryBar habits={habits} />

        {/* All-done banner */}
        {allDoneToday && (
          <div className="bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/30 rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-emerald-300 font-bold text-sm">
                All habits done!
              </p>
              <p className="text-emerald-400/70 text-xs">
                Amazing consistency. See you tomorrow!
              </p>
            </div>
          </div>
        )}

        {/* Habits list */}
        <div className="flex flex-col gap-3">
          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span className="text-5xl">🌱</span>
              <p className="text-gray-400 font-medium">No habits yet</p>
              <p className="text-gray-600 text-sm">
                Tap + to add your first habit
              </p>
            </div>
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onCheck={checkHabit}
                onDelete={deleteHabit}
              />
            ))
          )}
        </div>

        {/* Footer hint */}
        {habits.length > 0 && (
          <p className="text-center text-gray-600 text-xs">
            Tap <span className="text-violet-400">+</span> to complete · Streaks
            reset if you miss a day
          </p>
        )}
      </div>

      {showAdd && (
        <AddHabitModal onAdd={addHabit} onClose={() => setShowAdd(false)} />
      )}

      <style>{`
        @keyframes pop-0 {
          0% { transform: translate(-50%,-50%) scale(0); opacity:1; }
          100% { transform: translate(calc(-50% + ${Math.cos(0) * 60}px), calc(-50% + ${Math.sin(0) * 60}px)) scale(1); opacity:0; }
        }
        @keyframes pop-1 {
          0% { transform: translate(-50%,-50%) scale(0); opacity:1; }
          100% { transform: translate(calc(-50% + ${Math.cos(2.09) * 60}px), calc(-50% + ${Math.sin(2.09) * 60}px)) scale(1); opacity:0; }
        }
        @keyframes pop-2 {
          0% { transform: translate(-50%,-50%) scale(0); opacity:1; }
          100% { transform: translate(calc(-50% + ${Math.cos(4.19) * 60}px), calc(-50% + ${Math.sin(4.19) * 60}px)) scale(1); opacity:0; }
        }
      `}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("preview-root")).render(<App />);
