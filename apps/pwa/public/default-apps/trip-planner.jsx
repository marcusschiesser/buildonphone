const { useState } = React;

function App() {
  const [destination, setDestination] = useState('Tokyo');
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  const generatePlan = async () => {
    setLoading(true);
    setError('');
    setPlan(null);

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        days: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              day: { type: 'number' },
              morning: { type: 'string' },
              afternoon: { type: 'string' },
              evening: { type: 'string' }
            },
            required: ['day', 'morning', 'afternoon', 'evening']
          }
        }
      },
      required: ['title', 'days']
    };

    try {
      const { partialOutputStream } = await window.__CLAW2GO_AI__.streamText({
        prompt: 'Create a compact ' + days + '-day travel plan for ' + destination + '. Keep each activity practical and walkable.',
        output: { type: 'object', schema }
      });

      let finalResult = null;
      for await (const partial of partialOutputStream) {
        finalResult = partial;
      }

      if (!finalResult || !Array.isArray(finalResult.days)) {
        throw new Error('No itinerary returned.');
      }
      setPlan(finalResult);
    } catch (err) {
      setError(err && err.message ? err.message : 'Failed to generate trip plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">AI Trip Planner</h1>
        <p className="text-sm text-slate-400">Starter app (default): text + structured AI output.</p>

        <div className="grid grid-cols-3 gap-2">
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="col-span-2 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
            placeholder="Destination"
          />
          <input
            type="number"
            min={1}
            max={10}
            value={days}
            onChange={(e) => setDays(Number(e.target.value || 1))}
            className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
          />
        </div>

        <button
          onClick={generatePlan}
          disabled={loading}
          className="w-full rounded-lg bg-cyan-400 text-black font-semibold py-2 disabled:opacity-60"
        >
          {loading ? 'Generating...' : 'Generate Plan'}
        </button>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        {plan ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{plan.title}</h2>
            {plan.days.map((d) => (
              <div key={d.day} className="rounded-xl border border-slate-700 bg-slate-900 p-3 space-y-1">
                <div className="text-cyan-300 font-semibold">Day {d.day}</div>
                <p className="text-sm"><span className="text-slate-400">Morning:</span> {d.morning}</p>
                <p className="text-sm"><span className="text-slate-400">Afternoon:</span> {d.afternoon}</p>
                <p className="text-sm"><span className="text-slate-400">Evening:</span> {d.evening}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('preview-root')).render(<App />);
