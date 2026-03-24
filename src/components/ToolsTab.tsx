import { ModelCategory } from '@runanywhere/web';
import {
  ToolCalling,
  ToolCallFormat,
  toToolValue,
  getStringArg,
  getNumberArg,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
  type ToolCallingResult,
  type ToolValue,
} from '@runanywhere/web-llamacpp';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useModelLoader } from '../hooks/useModelLoader';
import { ModelBanner } from './ModelBanner';

/* ─── Demo Tools ─── */
const DEMO_TOOLS: { def: ToolDefinition; executor: Parameters<typeof ToolCalling.registerTool>[1] }[] = [
  {
    def: {
      name: 'get_weather',
      description: 'Gets the current weather for a city. Returns temperature in Fahrenheit and a short condition.',
      parameters: [{ name: 'location', type: 'string', description: 'City name (e.g. "San Francisco")', required: true }],
      category: 'Utility',
    },
    executor: async (args) => {
      const city = getStringArg(args, 'location') ?? 'Unknown';
      const conditions = ['Sunny', 'Partly Cloudy', 'Overcast', 'Rainy', 'Windy', 'Foggy'];
      return {
        location: toToolValue(city),
        temperature_f: toToolValue(Math.round(45 + Math.random() * 50)),
        condition: toToolValue(conditions[Math.floor(Math.random() * conditions.length)]),
        humidity_pct: toToolValue(Math.round(30 + Math.random() * 60)),
      };
    },
  },
  {
    def: {
      name: 'calculate',
      description: 'Evaluates a mathematical expression and returns the numeric result.',
      parameters: [{ name: 'expression', type: 'string', description: 'Math expression (e.g. "2 + 3 * 4")', required: true }],
      category: 'Math',
    },
    executor: async (args): Promise<Record<string, ToolValue>> => {
      const expr = getStringArg(args, 'expression') ?? '0';
      try {
        const sanitized = expr.replace(/[^0-9+\-*/().%\s^]/g, '');
        const val = Function(`"use strict"; return (${sanitized})`)();
        return { result: toToolValue(Number(val)), expression: toToolValue(expr) };
      } catch {
        return { error: toToolValue(`Invalid expression: ${expr}`) };
      }
    },
  },
  {
    def: {
      name: 'get_time',
      description: 'Returns the current date and time, optionally for a specific timezone.',
      parameters: [{ name: 'timezone', type: 'string', description: 'IANA timezone (e.g. "America/New_York"). Defaults to UTC.', required: false }],
      category: 'Utility',
    },
    executor: async (args): Promise<Record<string, ToolValue>> => {
      const tz = getStringArg(args, 'timezone') ?? 'UTC';
      try {
        return { datetime: toToolValue(new Date().toLocaleString('en-US', { timeZone: tz, dateStyle: 'full', timeStyle: 'long' })), timezone: toToolValue(tz) };
      } catch {
        return { datetime: toToolValue(new Date().toISOString()), timezone: toToolValue('UTC'), note: toToolValue('Fell back to UTC') };
      }
    },
  },
  {
    def: {
      name: 'random_number',
      description: 'Generates a random integer between min and max (inclusive).',
      parameters: [
        { name: 'min', type: 'number', description: 'Minimum value', required: true },
        { name: 'max', type: 'number', description: 'Maximum value', required: true },
      ],
      category: 'Math',
    },
    executor: async (args) => {
      const min = getNumberArg(args, 'min') ?? 1;
      const max = getNumberArg(args, 'max') ?? 100;
      return { value: toToolValue(Math.floor(Math.random() * (max - min + 1)) + min), min: toToolValue(min), max: toToolValue(max) };
    },
  },
];

/* ─── Types ─── */
interface TraceStep {
  type: 'user' | 'tool_call' | 'tool_result' | 'response';
  content: string;
  detail?: ToolCall | ToolResult;
}

interface ParamDraft {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
}

const EMPTY_PARAM: ParamDraft = { name: '', type: 'string', description: '', required: true };

const EXAMPLES = [
  { icon: '🌤️', label: 'Weather', q: "What's the weather in San Francisco?" },
  { icon: '🧮', label: 'Calculate', q: 'What is 123 * 456 + 789?' },
  { icon: '🕐', label: 'Time', q: 'What time is it in Tokyo?' },
  { icon: '🎲', label: 'Random', q: 'Give me a random number between 1 and 1000' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Utility: '#5B7FFF',
  Math: '#22D3A8',
  Custom: '#FF6B35',
};

/* ─── Component ─── */
export function ToolsTab() {
  const loader = useModelLoader(ModelCategory.Language);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [autoExecute, setAutoExecute] = useState(true);
  const [trace, setTrace] = useState<TraceStep[]>([]);
  const [registeredTools, setRegisteredTools] = useState<ToolDefinition[]>([]);
  const [showToolForm, setShowToolForm] = useState(false);
  const [showRegistry, setShowRegistry] = useState(false);
  const traceRef = useRef<HTMLDivElement>(null);

  const [toolName, setToolName] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolParams, setToolParams] = useState<ParamDraft[]>([{ ...EMPTY_PARAM }]);

  useEffect(() => {
    ToolCalling.clearTools();
    for (const { def, executor } of DEMO_TOOLS) ToolCalling.registerTool(def, executor);
    setRegisteredTools(ToolCalling.getRegisteredTools());
    return () => { ToolCalling.clearTools(); };
  }, []);

  useEffect(() => {
    traceRef.current?.scrollTo({ top: traceRef.current.scrollHeight, behavior: 'smooth' });
  }, [trace]);

  const refreshRegistry = useCallback(() => setRegisteredTools(ToolCalling.getRegisteredTools()), []);

  const send = useCallback(async (q?: string) => {
    const text = (q ?? input).trim();
    if (!text || generating) return;

    if (loader.state !== 'ready') {
      const ok = await loader.ensure();
      if (!ok) return;
    }

    setInput('');
    setGenerating(true);
    setTrace([{ type: 'user', content: text }]);

    try {
      const result: ToolCallingResult = await ToolCalling.generateWithTools(text, {
        autoExecute, maxToolCalls: 5, temperature: 0.3, maxTokens: 512, format: ToolCallFormat.Default,
      });

      const steps: TraceStep[] = [{ type: 'user', content: text }];

      for (let i = 0; i < result.toolCalls.length; i++) {
        const call = result.toolCalls[i];
        const argSummary = Object.entries(call.arguments).map(([k, v]) => `${k}=${JSON.stringify('value' in v ? v.value : v)}`).join(', ');
        steps.push({ type: 'tool_call', content: `${call.toolName}(${argSummary})`, detail: call });

        if (result.toolResults[i]) {
          const res = result.toolResults[i];
          const resultStr = res.success && res.result
            ? JSON.stringify(Object.fromEntries(Object.entries(res.result).map(([k, v]) => [k, 'value' in v ? v.value : v])), null, 2)
            : res.error ?? 'Unknown error';
          steps.push({ type: 'tool_result', content: res.success ? resultStr : `Error: ${resultStr}`, detail: res });
        }
      }

      if (result.text) steps.push({ type: 'response', content: result.text });
      setTrace(steps);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTrace((prev) => [...prev, { type: 'response', content: `Error: ${msg}` }]);
    } finally {
      setGenerating(false);
    }
  }, [input, generating, autoExecute, loader]);

  const addParam = () => setToolParams((p) => [...p, { ...EMPTY_PARAM }]);
  const updateParam = (idx: number, field: keyof ParamDraft, value: string | boolean) =>
    setToolParams((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  const removeParam = (idx: number) => setToolParams((prev) => prev.filter((_, i) => i !== idx));

  const registerCustomTool = () => {
    const name = toolName.trim().replace(/\s+/g, '_').toLowerCase();
    const desc = toolDesc.trim();
    if (!name || !desc) return;

    const params = toolParams.filter((p) => p.name.trim()).map((p) => ({
      name: p.name.trim(), type: p.type as 'string' | 'number' | 'boolean',
      description: p.description.trim() || p.name.trim(), required: p.required,
    }));

    const def: ToolDefinition = { name, description: desc, parameters: params, category: 'Custom' };
    const executor = async (args: Record<string, ToolValue>): Promise<Record<string, ToolValue>> => {
      const result: Record<string, ToolValue> = { status: toToolValue('executed'), tool: toToolValue(name) };
      for (const [k, v] of Object.entries(args)) result[`input_${k}`] = v;
      return result;
    };

    ToolCalling.registerTool(def, executor);
    refreshRegistry();
    setToolName(''); setToolDesc(''); setToolParams([{ ...EMPTY_PARAM }]); setShowToolForm(false);
  };

  const unregisterTool = (name: string) => { ToolCalling.unregisterTool(name); refreshRegistry(); };

  const traceConfig = {
    user: { bg: 'linear-gradient(135deg, #FF6B35, #FF9060)', labelBg: 'rgba(0,0,0,0.18)', label: '👤 You', color: 'white' },
    tool_call: { bg: 'rgba(91,127,255,0.08)', labelBg: '#5B7FFF', label: '🔧 Tool Call', color: '#B4C6FF', border: '1px solid rgba(91,127,255,0.25)' },
    tool_result: { bg: 'rgba(34,211,168,0.07)', labelBg: '#22D3A8', label: '📦 Result', color: '#A7F3E0', border: '1px solid rgba(34,211,168,0.22)' },
    response: { bg: 'rgba(255,255,255,0.03)', labelBg: 'rgba(255,255,255,0.08)', label: '🤖 Response', color: '#F2F2FF', border: '1px solid rgba(255,255,255,0.08)' },
  };

  return (
    <div className="tab-panel tools-panel">
      <style>{`
        .tools-panel { font-family: 'Outfit', sans-serif; }
        .tools-toolbar-inner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,15,0.9);
          backdrop-filter: blur(12px);
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .tool-btn {
          padding: 7px 14px;
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .tool-btn-active {
          background: linear-gradient(135deg, #FF6B35, #FF9060);
          border: none;
          color: white;
          box-shadow: 0 4px 14px rgba(255,107,53,0.35);
        }
        .tool-btn-ghost {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #9898BE;
        }
        .tool-btn-ghost:hover { background: rgba(255,255,255,0.08); color: #F2F2FF; }
        .tool-btn-sm {
          padding: 5px 12px;
          font-size: 12px;
          border-radius: 8px;
        }
        .auto-toggle {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 600;
          color: #9898BE;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .auto-toggle:hover { border-color: #FF6B35; color: #F2F2FF; }
        .auto-toggle input { accent-color: #FF6B35; }

        .registry-panel {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(15,15,28,0.95);
          max-height: 260px;
          overflow-y: auto;
          flex-shrink: 0;
        }
        .registry-title {
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #5C5C8A;
          margin-bottom: 12px;
        }
        .tool-card-new {
          padding: 12px 14px;
          margin-bottom: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          transition: border-color 0.2s ease;
        }
        .tool-card-new:hover { border-color: rgba(255,255,255,0.14); }
        .tool-card-new:last-child { margin-bottom: 0; }
        .tool-card-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
        }
        .tool-name-badge {
          font-size: 13px;
          font-weight: 700;
          color: #F2F2FF;
          font-family: 'SF Mono', monospace;
        }
        .cat-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .tool-remove-btn {
          margin-left: auto;
          width: 24px;
          height: 24px;
          border-radius: 8px;
          border: none;
          background: none;
          color: #5C5C8A;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.15s;
        }
        .tool-remove-btn:hover { background: rgba(255,79,109,0.12); color: #FF4F6D; }
        .tool-desc-new {
          font-size: 12px;
          color: #5C5C8A;
          line-height: 1.5;
          margin-bottom: 7px;
        }
        .tool-params-new { display: flex; flex-wrap: wrap; gap: 5px; }
        .tool-param-new {
          font-size: 11px;
          padding: 2px 9px;
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #7878A0;
          font-family: monospace;
        }

        .form-panel {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          background: rgba(15,15,28,0.95);
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex-shrink: 0;
        }
        .form-title {
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #5C5C8A;
        }
        .form-input {
          padding: 9px 13px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          color: #F2F2FF;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          outline: none;
          width: 100%;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .form-input:focus { border-color: #FF6B35; box-shadow: 0 0 0 3px rgba(255,107,53,0.1); }
        .form-input::placeholder { color: #5C5C8A; }
        .param-row { display: flex; gap: 7px; align-items: center; }
        .param-row .form-input { padding: 7px 10px; font-size: 12px; }
        .param-select { flex: 0 0 90px; padding: 7px 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; background: rgba(255,255,255,0.04); color: #F2F2FF; font-family: 'Outfit', sans-serif; font-size: 12px; outline: none; cursor: pointer; }
        .param-check { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #7878A0; white-space: nowrap; cursor: pointer; }
        .param-check input { accent-color: #FF6B35; }
        .form-actions { display: flex; gap: 8px; }
        .form-hint { font-size: 11px; color: #5C5C8A; font-style: italic; line-height: 1.5; }

        .trace-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .trace-card {
          border-radius: 12px;
          overflow: hidden;
          animation: fadeUp 0.3s ease both;
        }
        .trace-lbl {
          font-size: 10px;
          font-weight: 800;
          padding: 6px 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: white;
        }
        .trace-body {
          padding: 10px 13px;
        }
        .trace-body pre {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 12px;
          line-height: 1.65;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .example-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
        .example-chip {
          padding: 8px 15px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #9898BE;
          font-family: 'Outfit', sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .example-chip:hover {
          border-color: rgba(255,107,53,0.4);
          background: rgba(255,107,53,0.08);
          color: #FF9060;
          transform: translateY(-1px);
        }
        .tools-send-row {
          display: flex;
          gap: 8px;
          padding: 12px 16px 14px;
          border-top: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,15,0.96);
          backdrop-filter: blur(20px);
          flex-shrink: 0;
        }
        .tools-text-input {
          flex: 1;
          padding: 11px 16px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          color: #F2F2FF;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .tools-text-input:focus { border-color: #FF6B35; box-shadow: 0 0 0 3px rgba(255,107,53,0.1); }
        .tools-text-input::placeholder { color: #5C5C8A; }
        .tools-text-input:disabled { opacity: 0.5; }
        .send-tool-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .send-tool-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .send-tool-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <ModelBanner
        state={loader.state}
        progress={loader.progress}
        error={loader.error}
        onLoad={loader.ensure}
        label="LLM"
      />

      {/* Toolbar */}
      <div className="tools-toolbar-inner">
        <button
          className={`tool-btn ${showRegistry ? 'tool-btn-active' : 'tool-btn-ghost'}`}
          onClick={() => { setShowRegistry(!showRegistry); setShowToolForm(false); }}
        >
          🔧 Tools ({registeredTools.length})
        </button>
        <button
          className={`tool-btn ${showToolForm ? 'tool-btn-active' : 'tool-btn-ghost'}`}
          onClick={() => { setShowToolForm(!showToolForm); setShowRegistry(false); }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add Tool
        </button>
        <label className="auto-toggle">
          <input type="checkbox" checked={autoExecute} onChange={(e) => setAutoExecute(e.target.checked)} />
          Auto-execute
        </label>
      </div>

      {/* Registry panel */}
      {showRegistry && (
        <div className="registry-panel">
          <div className="registry-title">Registered Tools ({registeredTools.length})</div>
          {registeredTools.length === 0 && (
            <p style={{ color: '#5C5C8A', fontSize: 13, padding: '8px 0' }}>No tools registered</p>
          )}
          {registeredTools.map((t) => {
            const catColor = CATEGORY_COLORS[t.category ?? ''] ?? '#FF6B35';
            return (
              <div key={t.name} className="tool-card-new">
                <div className="tool-card-top">
                  <span className="tool-name-badge">{t.name}</span>
                  {t.category && (
                    <span className="cat-badge" style={{ background: catColor }}>{t.category}</span>
                  )}
                  <button className="tool-remove-btn" onClick={() => unregisterTool(t.name)}>×</button>
                </div>
                <p className="tool-desc-new">{t.description}</p>
                {t.parameters.length > 0 && (
                  <div className="tool-params-new">
                    {t.parameters.map((p) => (
                      <span key={p.name} className="tool-param-new">
                        {p.name}: {p.type}{p.required ? ' *' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom tool form */}
      {showToolForm && (
        <div className="form-panel">
          <div className="form-title">Register Custom Tool</div>
          <input
            className="form-input"
            placeholder="Tool name (e.g. search_web)"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
          />
          <input
            className="form-input"
            placeholder="Description (e.g. Searches the web for a query)"
            value={toolDesc}
            onChange={(e) => setToolDesc(e.target.value)}
          />
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#7878A0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Parameters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {toolParams.map((p, i) => (
                <div key={i} className="param-row">
                  <input className="form-input" placeholder="name" value={p.name} onChange={(e) => updateParam(i, 'name', e.target.value)} style={{ flex: 1 }} />
                  <select className="param-select" value={p.type} onChange={(e) => updateParam(i, 'type', e.target.value)}>
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                  </select>
                  <input className="form-input" placeholder="description" value={p.description} onChange={(e) => updateParam(i, 'description', e.target.value)} style={{ flex: 1.5 }} />
                  <label className="param-check">
                    <input type="checkbox" checked={p.required} onChange={(e) => updateParam(i, 'required', e.target.checked)} />req
                  </label>
                  {toolParams.length > 1 && (
                    <button className="tool-remove-btn" onClick={() => removeParam(i)}>×</button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="tool-btn tool-btn-ghost tool-btn-sm"
              onClick={addParam}
              style={{ marginTop: 8 }}
            >
              + Param
            </button>
          </div>
          <div className="form-actions">
            <button
              className="tool-btn tool-btn-active tool-btn-sm"
              onClick={registerCustomTool}
              disabled={!toolName.trim() || !toolDesc.trim()}
              style={{ opacity: !toolName.trim() || !toolDesc.trim() ? 0.5 : 1 }}
            >
              Register Tool
            </button>
            <button className="tool-btn tool-btn-ghost tool-btn-sm" onClick={() => setShowToolForm(false)}>Cancel</button>
          </div>
          <p className="form-hint">Custom tools use a mock executor that echoes back the arguments. Replace with real logic in code.</p>
        </div>
      )}

      {/* Execution trace */}
      <div className="trace-area" ref={traceRef}>
        {trace.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 10, padding: '32px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 4, filter: 'drop-shadow(0 8px 24px rgba(91,127,255,0.3))' }}>🔧</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#F2F2FF', margin: 0, letterSpacing: '-0.02em' }}>Tool Calling</h3>
            <p style={{ fontSize: 14, color: '#7878A0', maxWidth: 320, lineHeight: 1.65, margin: 0 }}>
              Ask a question that needs tools — weather, math, time, or random numbers.
            </p>
            <div className="example-chips">
              {EXAMPLES.map((ex) => (
                <button key={ex.label} className="example-chip" onClick={() => send(ex.q)}>
                  {ex.icon} {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {trace.map((step, i) => {
          const cfg = traceConfig[step.type];
          const isUser = step.type === 'user';
          return (
            <div key={i} className="trace-card" style={{ background: isUser ? cfg.bg : (cfg as any).bg, border: isUser ? 'none' : (cfg as any).border }}>
              <div className="trace-lbl" style={{ background: (cfg as any).labelBg }}>
                {cfg.label}
              </div>
              <div className="trace-body">
                <pre style={{ color: isUser ? 'white' : (cfg as any).color }}>{step.content}</pre>
              </div>
            </div>
          );
        })}

        {generating && (
          <div className="trace-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="trace-lbl" style={{ background: 'rgba(255,255,255,0.08)', color: '#7878A0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 14, border: '2px solid rgba(255,107,53,0.3)', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Processing…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="tools-send-row">
        <input
          className="tools-text-input"
          type="text"
          placeholder='Ask something that needs tools… e.g. "What is 42 * 17?"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          disabled={generating}
        />
        <button
          className="send-tool-btn"
          onClick={() => send()}
          disabled={!input.trim() || generating}
          style={{
            background: input.trim() && !generating ? 'linear-gradient(135deg, #FF6B35, #FF9060)' : 'rgba(255,255,255,0.05)',
            boxShadow: input.trim() && !generating ? '0 4px 16px rgba(255,107,53,0.4)' : 'none',
            color: input.trim() && !generating ? 'white' : '#5C5C8A',
          }}
          title="Run"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
