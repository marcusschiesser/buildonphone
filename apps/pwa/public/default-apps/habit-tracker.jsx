const { useMemo, useState } = React;

function App() {
  const [items, setItems] = useState([
    { id: 'walk', name: '10 min walk', streak: 2 },
    { id: 'water', name: 'Drink water', streak: 4 },
    { id: 'sleep', name: 'Sleep before 11pm', streak: 1 }
  ]);
  const [newHabit, setNewHabit] = useState('');

  const totalStreak = useMemo(() => items.reduce((sum, item) => sum + item.streak, 0), [items]);

  const addHabit = () => {
    const name = newHabit.trim();
    if (!name) return;
    setItems((prev) => [...prev, { id: Date.now().toString(), name, streak: 0 }]);
    setNewHabit('');
  };

  const markDone = (id) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, streak: item.streak + 1 } : item)));
  };

  const deleteHabit = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 to-slate-950 text-white p-4">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Habit Streak Tracker</h1>
        <p className="text-sm text-emerald-200">Starter app (default): offline utility with local state.</p>

        <div className="rounded-xl border border-emerald-400/30 bg-black/20 p-3">
          <div className="text-sm text-emerald-200">Total streak points</div>
          <div className="text-3xl font-black">{totalStreak}</div>
        </div>

        <div className="flex gap-2">
          <input
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Add a new habit"
            className="flex-1 rounded-lg bg-black/30 border border-emerald-300/30 px-3 py-2"
          />
          <button onClick={addHabit} className="rounded-lg bg-emerald-400 text-black px-4 font-semibold">Add</button>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-emerald-300/30 bg-black/20 p-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-emerald-200">Streak: {item.streak}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => markDone(item.id)} className="rounded-lg border border-emerald-300/60 px-3 py-1 text-sm">
                  Mark done
                </button>
                <button
                  onClick={() => deleteHabit(item.id)}
                  className="rounded-lg border border-red-400/60 px-3 py-1 text-sm text-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('preview-root')).render(<App />);
