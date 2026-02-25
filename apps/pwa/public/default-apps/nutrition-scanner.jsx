const { useState, useEffect, useRef, useCallback } = React;

// ── helpers ──────────────────────────────────────────────────────────────────

function downscaleAndEncode(videoEl, maxDim = 1024, quality = 0.72) {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.min(1, maxDim / Math.max(vw, vh));
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(videoEl, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

const FUNNY_STEPS = [
  "Consulting Bryan Johnson's 200-page morning protocol…",
  "Scanning for suspicious additives lurking in the shadows…",
  "Running ingredient list through anti-aging database…",
  "Cross-referencing with longevity manifesto…",
  "Calculating probability of immortality…",
  "Checking if any ingredient was touched by a mortal…",
  "Translating label to English (and then to Biohacker)…",
  "Almost done — brewing some methylated B-vitamins…",
];

const SCORE_COLOR = (s) => {
  if (s >= 8) return "text-emerald-400";
  if (s >= 5) return "text-yellow-400";
  if (s >= 3) return "text-orange-400";
  return "text-red-500";
};

const SCORE_BG = (s) => {
  if (s >= 8) return "bg-emerald-500";
  if (s >= 5) return "bg-yellow-500";
  if (s >= 3) return "bg-orange-500";
  return "bg-red-500";
};

const MACRO_ICONS = {
  calories: "🔥",
  protein: "💪",
  fat: "🧈",
  carbs: "🍞",
};

// ── ProgressBar ───────────────────────────────────────────────────────────────

function FunnyProgressBar({ progress, step }) {
  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="mb-3 text-center text-sm text-purple-300 font-medium min-h-[2.5rem] flex items-center justify-center">
        <span className="animate-pulse">{step}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden border border-purple-700">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #7c3aed, #db2777, #f59e0b)",
          }}
        />
      </div>
      <div className="mt-2 text-center text-xs text-gray-500">
        {Math.round(progress)}% — Bryan is judging…
      </div>
    </div>
  );
}

// ── HealthScore badge ────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  const size = 96;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const dash = pct * circ;

  const color =
    score >= 8
      ? "#10b981"
      : score >= 5
        ? "#f59e0b"
        : score >= 3
          ? "#f97316"
          : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#374151"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <span className="absolute text-2xl font-black" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ── Ingredient card ───────────────────────────────────────────────────────────

function IngredientCard({ ingredient, index }) {
  return (
    <div className="flex gap-3 bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-gray-500 transition-colors">
      <div className="flex-shrink-0 flex flex-col items-center justify-center w-10">
        <span className={`text-lg font-black ${SCORE_COLOR(ingredient.score)}`}>
          {ingredient.score}
        </span>
        <div className="w-7 h-1 rounded-full mt-1 overflow-hidden bg-gray-700">
          <div
            className={`h-full rounded-full ${SCORE_BG(ingredient.score)}`}
            style={{ width: `${(ingredient.score / 10) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm leading-tight">
          {ingredient.name}
        </p>
        <p className="text-gray-400 text-xs mt-0.5 leading-snug">
          {ingredient.description}
        </p>
      </div>
    </div>
  );
}

// ── MacroCard ─────────────────────────────────────────────────────────────────

function MacroCard({ label, value, unit, icon }) {
  return (
    <div className="flex flex-col items-center bg-gray-800 rounded-xl p-3 border border-gray-700 flex-1">
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-white font-black text-xl leading-none">
        {value ?? "—"}
        <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
      </span>
      <span className="text-gray-400 text-xs mt-1 capitalize">{label}</span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [capturedImg, setCapturedImg] = useState(null);

  // ── camera lifecycle ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!cameraActive) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        // attach to video element once it exists
        attachStream();
      } catch (e) {
        setError("Camera access denied: " + e.message);
        setCameraActive(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cameraActive]);

  function attachStream() {
    // retry until videoRef is mounted
    const vid = videoRef.current;
    if (!vid) {
      setTimeout(attachStream, 80);
      return;
    }
    vid.srcObject = streamRef.current;
    vid.onloadedmetadata = () => {
      vid
        .play()
        .then(() => setVideoReady(true))
        .catch(() => {});
    };
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setVideoReady(false);
  }

  // ── progress animation ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!analyzing) return;
    setProgress(0);
    setStepIdx(0);
    let p = 0;
    let si = 0;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 3.5 + 0.5, 92);
      si = Math.min(
        Math.floor((p / 92) * FUNNY_STEPS.length),
        FUNNY_STEPS.length - 1,
      );
      setProgress(p);
      setStepIdx(si);
    }, 300);
    return () => clearInterval(interval);
  }, [analyzing]);

  // ── capture + analyse ──────────────────────────────────────────────────────

  const handleCapture = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || !videoReady) {
      setError("Camera not ready yet. Please wait a moment and retry.");
      return;
    }
    const dataUrl = downscaleAndEncode(vid, 1024, 0.75);
    if (!dataUrl) {
      setError("Could not capture image — video dimensions are zero.");
      return;
    }
    setCapturedImg(dataUrl);
    stopCamera();
    setAnalyzing(true);
    setError(null);
    setResult(null);

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        overall_score: { type: "number" },
        bryan_verdict: { type: "string" },
        macros: {
          type: "object",
          additionalProperties: false,
          properties: {
            calories: { type: ["number", "null"] },
            protein_g: { type: ["number", "null"] },
            fat_g: { type: ["number", "null"] },
            carbs_g: { type: ["number", "null"] },
          },
        },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              score: { type: "number" },
              description: { type: "string" },
            },
          },
        },
      },
    };

    const prompt = `You are a nutrition analysis AI. The user has photographed a food packaging label (nutrition facts + ingredients list).

Your tasks:
1. Extract all visible nutrition data (calories, protein, fat, carbohydrates). The label may be in any language — translate everything to English.
2. Extract every ingredient from the ingredients list and translate to English.
3. For each ingredient assign a health score from 0 to 10 (10 = extremely healthy, 0 = highly harmful). Give a single plain-English sentence explaining what the ingredient is.
4. Compute an overall health score (0–10) for the entire product.
5. Write a short (2–4 sentence) witty, somewhat brutally honest verdict from the perspective of Bryan Johnson (the biohacker entrepreneur trying to live forever). Bryan is dramatic, self-righteous, mildly condescending about bad food choices, but also funny.

Return strictly valid JSON matching the schema. If a macro cannot be found, use null.`;

    try {
      const { partialOutputStream } = await window.__CLAW2GO_AI__.streamText({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: dataUrl },
            ],
          },
        ],
        output: { type: "object", schema },
      });

      let latest = null;
      for await (const partial of partialOutputStream) {
        latest = partial;
      }
      setProgress(100);
      await new Promise((r) => setTimeout(r, 400));
      setResult(latest);
    } catch (e) {
      setError("AI analysis failed: " + e.message);
    } finally {
      setAnalyzing(false);
    }
  }, [videoReady]);

  // ── reset ──────────────────────────────────────────────────────────────────

  function handleReset() {
    setResult(null);
    setCapturedImg(null);
    setError(null);
    setProgress(0);
    setCameraActive(true);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🔬</span>
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            NutriScan AI
          </h1>
        </div>
        <p className="text-gray-500 text-xs text-center">
          Point camera at any nutrition label · Bryan Johnson approved™
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-8 gap-5">
        {/* Error */}
        {error && (
          <div className="w-full max-w-md bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm text-center">
            ⚠️ {error}
            <button
              className="block mx-auto mt-2 text-xs underline text-red-400"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── IDLE / START ─────────────────────────────────────────────────── */}
        {!cameraActive && !analyzing && !result && (
          <div className="flex flex-col items-center gap-6 mt-10">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-900/50">
              <span className="text-5xl">📷</span>
            </div>
            <div className="text-center max-w-xs">
              <h2 className="font-bold text-lg text-white mb-1">
                Scan Your Food
              </h2>
              <p className="text-gray-400 text-sm">
                Bryan Johnson wants to know if what you&apos;re eating will kill you
                sooner than expected.
              </p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setCameraActive(true);
              }}
              className="px-8 py-3 rounded-2xl font-bold text-white text-base shadow-lg"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
              }}
            >
              Start Scanning
            </button>
          </div>
        )}

        {/* ── CAMERA VIEW ──────────────────────────────────────────────────── */}
        {cameraActive && (
          <div className="w-full max-w-md flex flex-col items-center gap-4">
            <div className="relative w-full aspect-[3/4] bg-gray-900 rounded-2xl overflow-hidden border-2 border-purple-700 shadow-lg shadow-purple-900/40">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              {/* viewfinder corners */}
              {[
                "top-2 left-2",
                "top-2 right-2",
                "bottom-2 left-2",
                "bottom-2 right-2",
              ].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-6 h-6`}>
                  <div
                    className={`absolute inset-0 border-purple-400 ${
                      i === 0
                        ? "border-t-2 border-l-2 rounded-tl"
                        : i === 1
                          ? "border-t-2 border-r-2 rounded-tr"
                          : i === 2
                            ? "border-b-2 border-l-2 rounded-bl"
                            : "border-b-2 border-r-2 rounded-br"
                    }`}
                  />
                </div>
              ))}
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70">
                  <span className="text-gray-400 text-sm animate-pulse">
                    Warming up camera…
                  </span>
                </div>
              )}
            </div>
            <p className="text-gray-400 text-xs text-center">
              Position the nutrition label clearly within the frame
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                onClick={stopCamera}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-semibold text-sm border border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
                disabled={!videoReady}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                }}
              >
                {capturing ? "Capturing…" : "📸 Capture"}
              </button>
            </div>
          </div>
        )}

        {/* ── ANALYSING ────────────────────────────────────────────────────── */}
        {analyzing && (
          <div className="w-full max-w-md flex flex-col items-center gap-6 mt-6">
            {capturedImg && (
              <img
                src={capturedImg}
                alt="captured"
                className="w-32 h-40 object-cover rounded-xl border border-purple-700 opacity-60"
              />
            )}
            <FunnyProgressBar progress={progress} step={FUNNY_STEPS[stepIdx]} />
            <p className="text-gray-500 text-xs text-center max-w-xs">
              Our AI sommelier is tasting your ingredients one by one…
            </p>
          </div>
        )}

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        {result && !analyzing && (
          <div className="w-full max-w-md flex flex-col gap-5">
            {/* Overall health score + verdict */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 border border-purple-800 shadow-lg">
              <div className="flex items-center gap-4">
                <ScoreBadge score={Math.round(result.overall_score ?? 0)} />
                <div className="flex-1">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-black text-white">
                      {result.overall_score?.toFixed(1) ?? "—"}
                    </span>
                    <span className="text-gray-500 text-sm">/ 10</span>
                    <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-900 text-purple-300">
                      Health Score
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs leading-snug">
                    Bryan Johnson&apos;s verdict 👇
                  </p>
                </div>
              </div>
              <div className="mt-3 bg-gray-950/60 rounded-xl p-3 border border-gray-700">
                <p className="text-sm text-gray-200 leading-relaxed italic">
                  &quot;{result.bryan_verdict}&quot;
                </p>
                <p className="text-right text-xs text-purple-400 mt-1">
                  — Bryan Johnson, age reversalist
                </p>
              </div>
            </div>

            {/* Macros */}
            {result.macros && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Nutrition Facts
                </h3>
                <div className="flex gap-2">
                  <MacroCard
                    label="Calories"
                    value={result.macros.calories}
                    unit="kcal"
                    icon={MACRO_ICONS.calories}
                  />
                  <MacroCard
                    label="Protein"
                    value={result.macros.protein_g}
                    unit="g"
                    icon={MACRO_ICONS.protein}
                  />
                  <MacroCard
                    label="Fat"
                    value={result.macros.fat_g}
                    unit="g"
                    icon={MACRO_ICONS.fat}
                  />
                  <MacroCard
                    label="Carbs"
                    value={result.macros.carbs_g}
                    unit="g"
                    icon={MACRO_ICONS.carbs}
                  />
                </div>
              </div>
            )}

            {/* Ingredients */}
            {result.ingredients && result.ingredients.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Ingredients ({result.ingredients.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {result.ingredients.map((ing, i) => (
                    <IngredientCard key={i} ingredient={ing} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Captured image toggle */}
            {capturedImg && (
              <details className="bg-gray-900 rounded-xl border border-gray-800">
                <summary className="px-3 py-2 text-xs text-gray-500 cursor-pointer select-none">
                  View captured image
                </summary>
                <img
                  src={capturedImg}
                  alt="captured label"
                  className="w-full rounded-b-xl object-contain max-h-64"
                />
              </details>
            )}

            {/* Scan again */}
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-2xl font-bold text-white text-sm shadow-lg mt-1"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
              }}
            >
              🔁 Scan Another Label
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("preview-root")).render(<App />);
