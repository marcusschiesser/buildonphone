const { useState, useEffect, useRef } = React;

function App() {
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const funnyProgressMessages = [
    "Squinting at tiny text...",
    "Decoding food industry hieroglyphics...",
    "Consulting Bryan Johnson's biomolecule database...",
    "Calculating how much this will age you...",
    "Reading ingredients smaller than atoms...",
    "Translating corporate food-speak to English...",
    "Measuring deviation from Blueprint protocol...",
    "Scanning for youth-sucking compounds...",
    "Checking if this passes the longevity test...",
    "Computing biological age impact..."
  ];

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Video play error:', err);
        setError('Could not start video playback');
      });
    }
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
      console.error('Camera error:', err);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Video not ready. Please try again.');
      return;
    }

    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera not ready yet. Please wait a moment and try again.');
      return;
    }

    setCapturing(true);
    setError(null);

    const canvas = canvasRef.current;
    const maxDimension = 1024;
    let width = video.videoWidth;
    let height = video.videoHeight;

    if (width > height) {
      if (width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

    setCapturing(false);
    setAnalyzing(true);
    setProgress(0);
    setResult(null);

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
      setProgressMessage(funnyProgressMessages[Math.floor(Math.random() * funnyProgressMessages.length)]);
    }, 800);

    try {
      const schema = {
        type: 'object',
        properties: {
          calories: { type: 'number', nullable: true },
          protein: { type: 'number', nullable: true },
          fat: { type: 'number', nullable: true },
          carbs: { type: 'number', nullable: true },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                healthScore: { type: 'number' },
                explanation: { type: 'string' }
              },
              required: ['name', 'healthScore', 'explanation'],
              additionalProperties: false
            }
          },
          overallHealthScore: { type: 'number' },
          bryanJohnsonVerdict: { type: 'string' }
        },
        required: ['calories', 'protein', 'fat', 'carbs', 'ingredients', 'overallHealthScore', 'bryanJohnsonVerdict'],
        additionalProperties: false
      };

      const { partialOutputStream } = await window.__CLAW2GO_AI__.streamText({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this nutrition label image. The label could be in any language - translate everything to English.

Extract:
1. Macros (per serving or per 100g): calories, protein (g), fat (g), carbs (g)
2. Complete ingredients list
3. For each ingredient:
   - Translate name to English
   - Give health score 0-10 (10=best, superfood; 0=worst, toxic)
   - One sentence explanation in simple language about what it is
4. Calculate overall health score 0-100 based on macros and ingredients
5. Write a funny, witty verdict from Bryan Johnson's perspective about this food's health value. He's obsessed with longevity, biohacking, and reversing aging. Make it entertaining but informative. Reference his extreme protocols if relevant.

If you cannot read the label clearly, make your best effort with visible text.`
              },
              {
                type: 'image',
                image: dataUrl
              }
            ]
          }
        ],
        output: {
          type: 'object',
          schema: schema
        }
      });

      let finalResult = null;

      for await (const partial of partialOutputStream) {
        if (partial) {
          finalResult = partial;
        }
      }

      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage('Analysis complete!');

      setTimeout(() => {
        setAnalyzing(false);
        if (finalResult) {
          setResult(finalResult);
        } else {
          setError('Could not extract nutrition information from the image.');
        }
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      setAnalyzing(false);
      setError(err.message || 'Failed to analyze image. Please try again.');
      console.error('Analysis error:', err);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressMessage('');
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getOverallScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🔬 Nutrition Label Scanner
          </h1>
          <p className="text-gray-300 text-lg">
            Scan any food label • AI-powered analysis • Bryan Johnson approved (or not)
          </p>
        </header>

        {!result && (
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-2xl border border-purple-500/20">
            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}

            <div className="relative rounded-xl overflow-hidden bg-black mb-6" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {capturing && (
                <div className="absolute inset-0 bg-white animate-pulse opacity-50" />
              )}
              <div className="absolute inset-0 border-4 border-dashed border-purple-400/50 m-8 rounded-lg pointer-events-none" />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {analyzing ? (
              <div className="space-y-4">
                <div className="bg-slate-700 rounded-full h-8 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 transition-all duration-300 flex items-center justify-center text-sm font-bold animate-gradient"
                    style={{ width: `${progress}%` }}
                  >
                    {Math.round(progress)}%
                  </div>
                </div>
                <p className="text-center text-purple-300 font-medium animate-pulse">
                  {progressMessage}
                </p>
              </div>
            ) : (
              <button
                onClick={captureAndAnalyze}
                disabled={!stream}
                className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold text-lg shadow-lg hover:shadow-purple-500/50 transition-all transform hover:scale-105 active:scale-95"
              >
                📸 Scan Nutrition Label
              </button>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Overall Health Score & Verdict */}
            <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/40 backdrop-blur rounded-2xl p-8 shadow-2xl border border-purple-500/30">
              <div className="text-center mb-6">
                <div className={`text-8xl font-black mb-2 ${getOverallScoreColor(result.overallHealthScore)}`}>
                  {result.overallHealthScore}
                  <span className="text-4xl">/100</span>
                </div>
                <div className="text-gray-400 uppercase tracking-wider text-sm font-semibold">
                  Health Score
                </div>
              </div>
              
              <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-400/20">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">🧬</div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-purple-300 font-bold mb-2">
                      Bryan Johnson&apos;s Verdict:
                    </div>
                    <p className="text-gray-200 text-lg leading-relaxed">
                      {result.bryanJohnsonVerdict}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Macros */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-xl border border-purple-500/20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span>📊</span> Macronutrients
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/30">
                  <div className="text-orange-400 text-sm font-semibold mb-1">Calories</div>
                  <div className="text-3xl font-bold">{result.calories ?? 'N/A'}</div>
                </div>
                <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl p-4 border border-red-500/30">
                  <div className="text-red-400 text-sm font-semibold mb-1">Protein</div>
                  <div className="text-3xl font-bold">{result.protein ?? 'N/A'}<span className="text-lg">g</span></div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-xl p-4 border border-yellow-500/30">
                  <div className="text-yellow-400 text-sm font-semibold mb-1">Fat</div>
                  <div className="text-3xl font-bold">{result.fat ?? 'N/A'}<span className="text-lg">g</span></div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
                  <div className="text-blue-400 text-sm font-semibold mb-1">Carbs</div>
                  <div className="text-3xl font-bold">{result.carbs ?? 'N/A'}<span className="text-lg">g</span></div>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 shadow-xl border border-purple-500/20">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span>🧪</span> Ingredients Analysis
              </h2>
              <div className="space-y-3">
                {result.ingredients && result.ingredients.length > 0 ? (
                  result.ingredients.map((ingredient, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/50 rounded-xl p-4 border border-slate-700 hover:border-purple-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-lg font-bold text-purple-200">
                          {ingredient.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className={`text-2xl font-black ${getScoreColor(ingredient.healthScore)}`}>
                            {ingredient.healthScore}
                          </div>
                          <div className="text-gray-400 text-sm">/10</div>
                        </div>
                      </div>
                      <div className="mb-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${getScoreBg(ingredient.healthScore)} transition-all`}
                          style={{ width: `${ingredient.healthScore * 10}%` }}
                        />
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {ingredient.explanation}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">No ingredients detected</p>
                )}
              </div>
            </div>

            <button
              onClick={reset}
              className="w-full py-4 px-6 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              🔄 Scan Another Label
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 2s ease infinite;
        }
      `}</style>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('preview-root'));
root.render(<App />);
