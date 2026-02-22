'use client';

const CI_MARKER = 'CI_FAKE_APP_READY';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isFakeGenerationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FAKE_GENERATION === '1';
}

export async function runFakeGeneration(input: {
  prompt: string;
  onStatus?: (status: string) => void;
  onToolCall?: (target: string) => void;
  onText?: (delta: string) => void;
}): Promise<{ text: string; artifacts: Record<string, string> }> {
  input.onStatus?.('Preparing generation');
  await sleep(60);

  input.onToolCall?.('write_app_jsx');
  input.onStatus?.('Running tool #1');
  input.onText?.('Generating a deterministic CI app artifact...');
  await sleep(80);

  input.onStatus?.('Syncing artifacts');
  await sleep(60);

  const appJsx = `function App() {
  const [items, setItems] = React.useState(['Sample note']);
  const [value, setValue] = React.useState('');

  function addItem() {
    const next = value.trim();
    if (!next) return;
    setItems((prev) => [next, ...prev]);
    setValue('');
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 420, margin: '2rem auto', padding: '1rem' }}>
      <h1>${CI_MARKER}</h1>
      <p>${input.prompt.replace(/`/g, "'")}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Write a note"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={addItem} disabled={!value.trim()}>Add</button>
      </div>
      <ul style={{ paddingLeft: 20 }}>
        {items.map((item, index) => (
          <li key={\`\${item}-\${index}\`} style={{ marginBottom: 8 }}>
            <span>{item}</span>
            <button onClick={() => removeItem(index)} style={{ marginLeft: 8 }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('preview-root')).render(<App />);`;

  return {
    text: 'Generated deterministic CI fake app.',
    artifacts: { 'app.jsx': appJsx },
  };
}
