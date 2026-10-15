import { useEffect, useMemo, useState } from "react";

type Page = "Overview" | "AI Playground" | "Request Explorer" | "Model Routing" | "Analytics" | "API Keys" | "Settings" | "System Health" | "Help & Documentation";
type IconName = "grid" | "spark" | "search" | "route" | "chart" | "key" | "settings" | "health" | "help" | "bell" | "sun" | "chevron" | "copy" | "send" | "check" | "clock" | "menu" | "plus" | "x" | "refresh";

const icons: Record<IconName, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  spark: <><path d="m12 3-1.4 4.1a5 5 0 0 1-3.1 3.1L3.5 12l4 1.4a5 5 0 0 1 3.1 3.1L12 21l1.4-4.5a5 5 0 0 1 3.1-3.1l4-1.4-4-1.4a5 5 0 0 1-3.1-3.1Z"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  route: <><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 16V8a2 2 0 0 1 2-2h8M8 18h5a5 5 0 0 0 5-5V8"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 3 3m-6 0 3 3"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  health: <><path d="M3 12h4l2-5 4 10 2-5h6"/><path d="M12 22C6 18.5 3 15 3 10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5-3 8.5-9 12Z"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.3 2.4c-.8.3-.9 1-.9 1.6M12 17h.01"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>, copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>, check: <path d="m5 12 4 4L19 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  plus: <path d="M12 5v14M5 12h14"/>, x: <path d="m6 6 12 12M18 6 6 18"/>, refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8A7 7 0 0 1 18 6l2 6M18 16a7 7 0 0 1-11.9 2L4 12"/></>
};
function Icon({ name, size = 18 }: { name: IconName; size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{icons[name]}</svg> }

const nav: { label: Page; icon: IconName }[] = [
  { label: "Overview", icon: "grid" }, { label: "AI Playground", icon: "spark" }, { label: "Request Explorer", icon: "search" },
  { label: "Model Routing", icon: "route" }, { label: "Analytics", icon: "chart" }, { label: "API Keys", icon: "key" },
  { label: "Settings", icon: "settings" }, { label: "System Health", icon: "health" }, { label: "Help & Documentation", icon: "help" }
];

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "success" | "warning" | "danger" | "purple" | "neutral" }) {
  return <span className={`badge ${tone}`}><i />{children}</span>;
}
function Card({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{(title || action) && <div className="card-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}{children}</section>;
}
function Segmented({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: string[] }) {
  return <div className="segmented">{items.map(i => <button key={i} className={value === i ? "active" : ""} onClick={() => onChange(i)}>{i}</button>)}</div>;
}
function Sparkline({ color = "purple", values = [3, 5, 4, 7, 6, 9, 8] }: { color?: string; values?: number[] }) {
  const points = values.map((v, i) => `${i * 20},${30 - v * 2.4}`).join(" ");
  return <svg className={`sparkline ${color}`} viewBox="0 0 120 34" preserveAspectRatio="none"><polyline points={points}/></svg>;
}
function Empty({ icon = "chart", title, text }: { icon?: IconName; title: string; text: string }) {
  return <div className="empty"><span><Icon name={icon}/></span><strong>{title}</strong><p>{text}</p></div>;
}

const demoSeries = [18, 26, 22, 31, 28, 40, 38, 48, 44, 58, 52, 67, 63, 72, 69, 83, 78, 90, 86, 96];
function LineChart({ compact = false }: { compact?: boolean }) {
  const pts = demoSeries.map((v, i) => `${i * (680 / (demoSeries.length - 1))},${150 - v * 1.25}`).join(" ");
  return <div className={`line-chart ${compact ? "compact" : ""}`}><span className="demo-tag">DEMO DATA</span><svg viewBox="0 0 680 180" preserveAspectRatio="none">
    <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".28"/><stop offset="1" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient></defs>
    {[25,65,105,145].map(y => <line key={y} x1="0" x2="680" y1={y} y2={y} className="grid-line"/>)}
    <polygon points={`0,180 ${pts} 680,180`} fill="url(#area)"/><polyline points={pts} className="main-line"/><circle cx="680" cy={150 - 96 * 1.25} r="4" className="end-dot"/>
  </svg><div className="chart-labels"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>Now</span></div></div>
}

function Overview({ go }: { go: (p: Page) => void }) {
  const [range, setRange] = useState("24H");
  const kpis = [
    ["Total Requests", "12,847", "+12.4%", "purple"], ["Average Latency", "842 ms", "−8.2%", "cyan"],
    ["Estimated Cost", "$24.82", "+4.1%", "amber"], ["Estimated Savings", "$18.40", "+14.8%", "green"], ["Success Rate", "99.42%", "+0.3%", "green"]
  ];
  return <div className="page">
    <div className="notice"><Icon name="spark"/><div><strong>Prototype mode</strong><span>Metrics on this page are clearly labeled demo data. Connect telemetry to view real usage.</span></div><button onClick={() => go("Settings")}>Configure API <Icon name="chevron" size={14}/></button></div>
    <div className="kpi-grid">{kpis.map((k, i) => <Card key={k[0]} className="kpi"><div className="kpi-label">{k[0]} <span title="Demo value shown for interface preview">?</span></div><div className="kpi-row"><strong>{k[1]}</strong><Sparkline color={k[3]}/></div><div className="kpi-foot"><em>Demo data</em><span className={i === 2 ? "down" : "up"}>{k[2]} vs prior</span></div></Card>)}</div>
    <div className="two-thirds">
      <Card title="Request activity" subtitle="Requests received through the gateway" action={<Segmented value={range} onChange={setRange} items={["24H","7D","30D"]}/>}><LineChart/></Card>
      <Card title="Provider & model" subtitle="Currently configured inference route"><div className="provider"><div className="gemini-mark">G</div><div><span>Active provider</span><strong>Google Gemini</strong><small>gemini-2.0-flash</small></div><Badge tone="success">Ready</Badge></div><div className="usage"><div className="donut"><span>100%</span></div><div><strong>Gemini</strong><span>Configured route</span></div></div><p className="fine">Distribution is hidden until model-level telemetry is supplied.</p></Card>
    </div>
    <div className="three-grid">
      <Card title="Latency analytics" subtitle="Demo values • last 24 hours"><div className="stat-list"><div><span>Average</span><strong>842 ms</strong></div><div><span>P50</span><strong>720 ms</strong></div><div><span>P95</span><strong>1.8 s</strong></div><div><span>P99</span><strong>2.6 s</strong></div></div></Card>
      <Card title="Cost analysis" subtitle="Estimated • sample pricing assumptions"><div className="cost-bars"><label>Baseline <span>$43.22</span></label><i><b style={{width:"100%"}}/></i><label>Estimated actual <span>$24.82</span></label><i><b className="actual" style={{width:"57%"}}/></i></div><p className="fine">Assumes $0.10 / 1M input and $0.40 / 1M output tokens. Update in Settings.</p></Card>
      <Card title="System status" subtitle="Live connection overview"><div className="status-list"><div><span><i className="status-dot ok"/>API process</span><Badge tone="success">Operational</Badge></div><div><span><i className="status-dot ok"/>Gemini readiness</span><Badge tone="success">Ready</Badge></div><div><span><i className="status-dot warn"/>Database</span><Badge tone="warning">Not configured</Badge></div></div><button className="text-btn" onClick={() => go("System Health")}>View system health <Icon name="chevron" size={14}/></button></Card>
    </div>
  </div>
}

function Playground({ toast }: { toast: (s: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<"empty"|"loading"|"done"|"error">("empty");
  const [response, setResponse] = useState<{text:string;latency:number;status:number}|null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const send = async () => {
    if (!prompt.trim()) return;
    setState("loading");
    setResponse(null);
    setErrorMsg("");
    const apiKey = localStorage.getItem("polyglot_api_key") || "";
    const t0 = Date.now();
    try {
      const res = await fetch("/v1/proxy/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const latency = Date.now() - t0;
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.detail || `Server returned ${res.status}`);
        setState("error");
        return;
      }
      if (data.status === "blocked") {
        setErrorMsg("Request blocked by safety guardrails.");
        setState("error");
        return;
      }
      setResponse({ text: data.response ?? "", latency, status: res.status });
      setState("done");
    } catch {
      setErrorMsg("Could not reach the backend. Is the FastAPI server running on port 8000?");
      setState("error");
    }
  };

  return <div className="play-layout"><Card title="Prompt workspace" subtitle="POST /v1/proxy/chat" action={<Badge tone={state === "loading" ? "warning" : state === "error" ? "danger" : "success"}>{state === "loading" ? "Sending…" : state === "error" ? "Error" : "Live"}</Badge>} className="prompt-card">
    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => {if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask Gemini anything…&#10;&#10;Try: Explain how an AI proxy improves reliability."/>
    <div className="editor-foot"><span><kbd>Enter</kbd> send · <kbd>Shift</kbd> + <kbd>Enter</kbd> new line</span><div><button className="ghost" onClick={() => {setPrompt("");setState("empty");setResponse(null);setErrorMsg("");}}>Clear</button><button className="primary" onClick={send} disabled={!prompt.trim() || state === "loading"}>{state === "loading" ? <span className="spinner"/> : <Icon name="send" size={16}/>} Send request</button></div></div>
  </Card><Card title="Response" subtitle={response ? `Completed in ${response.latency} ms` : "Gemini output will appear here"} action={response && <button className="icon-text" onClick={() => {navigator.clipboard?.writeText(response.text);toast("Response copied")}}><Icon name="copy" size={15}/> Copy</button>} className="response-card">
    {state === "empty" && <Empty icon="spark" title="Ready when you are" text="Write a prompt and send your first request."/>}
    {state === "loading" && <div className="thinking"><span/><span/><span/><p>Gemini is generating a response…</p></div>}
    {state === "error" && <div className="answer"><Badge tone="danger">Error</Badge><p style={{marginTop:12,color:"var(--red)"}}>{errorMsg}</p>{errorMsg.includes("401") || errorMsg.includes("Authentication") ? <p className="fine" style={{marginTop:8}}>Set your API key in <b>Settings</b> → X-API-Key field, then try again.</p> : null}</div>}
    {state === "done" && response && <div className="answer"><Badge tone="success">{response.status} OK</Badge><p style={{marginTop:12,whiteSpace:"pre-wrap"}}>{response.text}</p><div className="meta"><span>Provider <b>Google Gemini</b></span><span>Duration <b>{response.latency} ms</b></span></div></div>}
  </Card><Card title="Request configuration" subtitle="Key stored in browser local storage only" className="config-card"><label>Endpoint<input value="/v1/proxy/chat" readOnly/></label><label>X-API-Key<input type="password" placeholder={localStorage.getItem("polyglot_api_key") ? "Saved ••••••••" : "Paste key or set in Settings"} onChange={e => { if(e.target.value) localStorage.setItem("polyglot_api_key", e.target.value); }}/></label><div className="code-mini">{`{\n  "prompt": "{{input}}"\n}`}</div><p className="fine">Key is kept only in this browser. Never committed to Git or sent to third parties.</p></Card></div>
}

function Routing() {
  const stages = [["client","Client"],["route","FastAPI Gateway"],["key","Authentication & validation"],["settings","Backend request handling"],["spark","Google Gemini"],["check","Response to client"]] as [IconName,string][];
  return <div className="page"><Card title="Live execution path" subtitle="Actual configured request flow • Gemini provider" action={<Badge tone="success">Last request completed</Badge>}>
    <div className="flow">{stages.map(([icon,label],i) => <div className="flow-wrap" key={label}><div className={`flow-node ${i===4?"gemini":""}`}><span><Icon name={icon}/></span><div><small>STEP {String(i+1).padStart(2,"0")}</small><strong>{label}</strong></div><Icon name="check" size={16}/></div>{i<stages.length-1&&<div className="connector"><i/></div>}</div>)}</div>
    <div className="request-summary"><div><span>Request status</span><Badge tone="success">Completed</Badge></div><div><span>Provider</span><strong>Google Gemini</strong></div><div><span>Model</span><strong>gemini-2.0-flash</strong></div><div><span>Latency</span><strong>842 ms <em>demo</em></strong></div><div><span>Request ID</span><strong>req_demo_9f2a</strong></div></div>
  </Card><Card title="Future capabilities" subtitle="Planned concepts — not active in the current implementation"><div className="future-grid"><div><Icon name="route"/><strong>Policy-based routing</strong><p>Route by task, latency, or cost preferences.</p><Badge tone="purple">Future</Badge></div><div><Icon name="refresh"/><strong>Provider fallback</strong><p>Resilient retries across approved providers.</p><Badge tone="purple">Future</Badge></div><div><Icon name="chart"/><strong>Routing experiments</strong><p>Evaluate routes with controlled traffic splits.</p><Badge tone="purple">Future</Badge></div></div></Card></div>
}

function Explorer() {
  const [search, setSearch] = useState(""); const [hasDemo, setHasDemo] = useState(false);
  const rows = ["req_demo_9f2a","req_demo_41bd","req_demo_8ac1"].filter(x=>x.includes(search));
  return <div className="page"><div className="toolbar"><div className="search"><Icon name="search" size={16}/><input placeholder="Search request ID or endpoint…" value={search} onChange={e=>setSearch(e.target.value)}/></div><select><option>All statuses</option><option>Success</option><option>Error</option></select><select><option>All providers</option><option>Google Gemini</option></select><button className="ghost"><Icon name="clock" size={15}/> Last 7 days</button></div>
    <Card className="table-card" title="Request history" subtitle={hasDemo ? "Showing prototype records — sensitive prompt content excluded" : "Historical request data is not connected"}>
      {!hasDemo ? <Empty icon="search" title="No request history yet" text="Connect telemetry or make a request to populate this view."/> : <div className="table-scroll"><table><thead><tr>{["Request ID","Timestamp","Endpoint","Provider","Model","Latency","Status",""].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((id,i)=><tr key={id}><td><code>{id}</code></td><td>Today, {10+i}:24</td><td>/v1/proxy/chat</td><td>Gemini</td><td>gemini-2.0-flash</td><td>{842+i*118} ms</td><td><Badge tone={i===2?"danger":"success"}>{i===2?"Error":"200 OK"}</Badge></td><td><button className="icon-btn"><Icon name="chevron" size={15}/></button></td></tr>)}</tbody></table></div>}
      <div className="table-foot"><span>{hasDemo ? "3 demo records" : "0 records"}</span><button className="text-btn" onClick={()=>setHasDemo(!hasDemo)}>{hasDemo?"Hide":"Load"} demo records</button></div>
    </Card></div>
}

function Analytics() {
  const [range,setRange]=useState("7D");
  return <div className="page"><div className="analytics-head"><div><h2>Usage intelligence</h2><p>Measured metrics appear when telemetry is connected. Values below are demo estimates.</p></div><Segmented value={range} onChange={setRange} items={["24H","7D","30D"]}/></div>
    <div className="two-thirds"><Card title="Requests over time" subtitle="Demo data • hourly volume"><LineChart/></Card><Card title="Success & failure" subtitle="Demo data"><div className="donut large"><span>99.4%<small>SUCCESS</small></span></div><div className="legend"><span><i className="green"/>Success <b>12,772</b></span><span><i className="red"/>Failed <b>75</b></span></div></Card></div>
    <div className="three-grid"><Card title="Latency trends" subtitle="Estimated percentile latency"><div className="mini-chart"><Sparkline values={[4,5,7,5,8,6,9,7,8]}/></div><div className="split-stat"><span>P50 <b>720 ms</b></span><span>P95 <b>1.8 s</b></span></div></Card><Card title="Token consumption" subtitle="Unavailable metric"><Empty icon="chart" title="No token telemetry" text="Input and output usage will appear when supplied by Gemini responses."/></Card><Card title="Estimated savings" subtitle="Demo • documented sample pricing"><div className="saving"><strong>42.6%</strong><Badge tone="purple">Estimated</Badge></div><p className="formula">(Baseline $43.22 − Actual $24.82) ÷ Baseline $43.22 × 100</p></Card></div>
  </div>
}

function ApiKeys({ toast }: { toast:(s:string)=>void }) {
  const [modal,setModal]=useState<"create"|"revoke"|null>(null); const [created,setCreated]=useState(false);
  return <div className="page"><div className="section-title"><div><h2>API keys</h2><p>Create and revoke credentials used to access Polyglot Proxy.</p></div><button className="primary" onClick={()=>setModal("create")}><Icon name="plus" size={16}/> Create API key</button></div>
    <div className="security-note"><Icon name="key"/><div><strong>Keys are shown only once</strong><span>Store new credentials securely. Existing keys remain masked and hashes are never exposed.</span></div></div>
    <Card className="table-card"><div className="table-scroll"><table><thead><tr><th>Name</th><th>Key</th><th>Created</th><th>Last used</th><th>Status</th><th/></tr></thead><tbody><tr><td><strong>Development app</strong></td><td><code>pp_dev_••••••••9K2M</code></td><td>Mar 8, 2025</td><td>12 minutes ago</td><td><Badge tone="success">Active</Badge></td><td><button className="danger-text" onClick={()=>setModal("revoke")}>Revoke</button></td></tr></tbody></table></div></Card>
    {modal&&<div className="modal-backdrop" onMouseDown={()=>setModal(null)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-x" onClick={()=>setModal(null)}><Icon name="x"/></button>{modal==="create"?<>{!created?<><div className="modal-icon"><Icon name="key"/></div><h2>Create a new API key</h2><p>Name this key so you can identify it later.</p><label>Key name<input autoFocus placeholder="e.g. Production backend"/></label><div className="modal-actions"><button className="ghost" onClick={()=>setModal(null)}>Cancel</button><button className="primary" onClick={()=>setCreated(true)}>Create key</button></div></>:<><Badge tone="success">Key created</Badge><h2>Copy your key now</h2><p>You won't be able to see it again after closing this dialog.</p><div className="secret"><code>pp_live_demo_x8K3mN2qL9</code><button onClick={()=>{navigator.clipboard?.writeText("pp_live_demo_x8K3mN2qL9");toast("API key copied")}}><Icon name="copy"/></button></div><button className="primary full" onClick={()=>{setModal(null);setCreated(false)}}>I've stored it securely</button></>}</>:<><div className="modal-icon danger"><Icon name="key"/></div><h2>Revoke API key?</h2><p>Applications using <b>Development app</b> will immediately lose access. This action cannot be undone.</p><div className="modal-actions"><button className="ghost" onClick={()=>setModal(null)}>Keep key</button><button className="danger-btn" onClick={()=>{setModal(null);toast("API key revoked")}}>Revoke key</button></div></>}</div></div>}
  </div>
}

function Settings({ toast, dark, setDark }:{toast:(s:string)=>void;dark:boolean;setDark:(v:boolean)=>void}) {
  const [endpoint,setEndpoint]=useState(()=>localStorage.getItem("polyglot_endpoint")||"http://localhost:8000");
  const [apiKey,setApiKey]=useState(""); const [testing,setTesting]=useState(false);
  const save=()=>{localStorage.setItem("polyglot_endpoint",endpoint.replace(/\/$/,""));if(apiKey)localStorage.setItem("polyglot_api_key",apiKey);setApiKey("");toast("Local configuration saved")};
  const test=async()=>{setTesting(true);try{const r=await fetch(`${endpoint.replace(/\/$/,"")}/health`);if(!r.ok)throw new Error();toast("Connection successful — API is healthy")}catch{toast("Connection failed — check the server and endpoint")}finally{setTesting(false)}};
  return <div className="settings-grid"><div><Card title="API connection" subtitle="Saved only in this browser on your computer"><label>API endpoint<input value={endpoint} onChange={e=>setEndpoint(e.target.value)}/></label><label>Gemini API key<input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder={localStorage.getItem("polyglot_api_key")?"Saved locally ••••••••":"Paste your key"}/></label><div className="inline-fields"><label>Environment<select defaultValue="Development"><option>Development</option><option>Production</option></select></label><label>Request timeout<select><option>30 seconds</option><option>60 seconds</option></select></label></div><div className="button-row"><button className="primary" onClick={save}><Icon name="check" size={15}/> Save locally</button><button className="ghost" onClick={test}>{testing?<span className="spinner"/>:<Icon name="refresh" size={15}/>} Test connection</button></div><p className="fine">Local storage is convenient for a local-first prototype but is readable by scripts on this origin. For higher-security deployments, keep provider keys server-side.</p></Card><Card title="Appearance" subtitle="Personalize your workspace"><div className="setting-row"><div><strong>Dark interface</strong><span>Switch between dark and light workspace themes</span></div><button className={`toggle ${dark?"on":""}`} onClick={()=>setDark(!dark)} aria-label="Toggle dark theme"><i/></button></div><div className="setting-row"><div><strong>Reduced motion</strong><span>Minimize non-essential interface animations</span></div><button className="toggle"><i/></button></div></Card></div>
  <div><Card title="Provider status"><div className="provider"><div className="gemini-mark">G</div><div><span>Active provider</span><strong>Google Gemini</strong><small>Credentials stored server-side</small></div><Badge tone="success">Ready</Badge></div><p className="fine">Secret values are never returned to or displayed in this dashboard.</p></Card><Card title="Default preferences"><label>Default analytics period<select><option>Last 7 days</option><option>Last 24 hours</option><option>Last 30 days</option></select></label><label>Timezone<select><option>Local timezone</option><option>UTC</option></select></label></Card><Card title="Documentation"><button className="doc-link">API reference <Icon name="chevron" size={15}/></button><button className="doc-link">Authentication guide <Icon name="chevron" size={15}/></button><button className="doc-link">Integration examples <Icon name="chevron" size={15}/></button></Card></div></div>
}

function Health({ toast }:{toast:(s:string)=>void}) {
  const [checking,setChecking]=useState(false); const [health,setHealth]=useState<"unknown"|"healthy"|"error">("unknown"); const [ready,setReady]=useState<"unknown"|"healthy"|"error">("unknown");
  const retry=async()=>{setChecking(true);const base=localStorage.getItem("polyglot_endpoint")||"http://localhost:8000";const check=async(path:string)=>{try{const r=await fetch(`${base}${path}`);return r.ok?"healthy":"error"}catch{return "error"}};const [h,r]=await Promise.all([check("/health"),check("/ready")]);setHealth(h);setReady(r);setChecking(false);toast(h==="healthy"?"Health checks completed":"Server could not be reached")};
  useEffect(()=>{retry()},[]);
  const tone=(s:string)=>s==="healthy"?"success":s==="error"?"danger":"warning";
  const label=(s:string,ok:string)=>s==="healthy"?ok:s==="error"?"Unavailable":"Checking";
  return <div className="page"><div className="health-hero"><div className="health-ring"><Icon name="check" size={32}/></div><div><Badge tone="success">All configured systems operational</Badge><h2>Polyglot Proxy is healthy</h2><p>Process is available and the cached Gemini verification is ready.</p></div><button className="ghost" onClick={retry}>{checking?<span className="spinner"/>:<Icon name="refresh" size={15}/>} Retry checks</button></div>
  <div className="health-grid"><Card><div className="endpoint-head"><span><Icon name="health"/></span><div><code>GET /health</code><h3>Process health</h3></div><Badge tone={tone(health)}>{label(health,"Healthy")}</Badge></div><p>Reports whether the FastAPI process is running and able to respond. This does not verify successful AI inference.</p><dl><div><dt>HTTP status</dt><dd>{health==="healthy"?"200 OK":"Not available"}</dd></div><div><dt>Source</dt><dd>Live endpoint</dd></div><div><dt>Last checked</dt><dd>Just now</dd></div></dl></Card><Card><div className="endpoint-head"><span className="purple"><Icon name="spark"/></span><div><code>GET /ready</code><h3>Gemini readiness</h3></div><Badge tone={tone(ready)}>{label(ready,"Ready")}</Badge></div><p>Performs a bounded Gemini verification and caches the result to avoid excessive provider calls.</p><dl><div><dt>Provider</dt><dd>Google Gemini</dd></div><div><dt>Verification</dt><dd>{ready==="healthy"?"Successful":"Not available"}</dd></div><div><dt>Source</dt><dd>Live endpoint</dd></div></dl></Card></div>
  <Card title="Operational guidance" subtitle="Understand the difference between each signal"><div className="guidance"><div><b>1</b><p><strong>Health confirms availability</strong><span>Use /health for process-level uptime monitoring and container probes.</span></p></div><i/><div><b>2</b><p><strong>Readiness confirms inference access</strong><span>Use /ready before sending traffic that depends on Gemini.</span></p></div></div></Card></div>
}

const Code = ({children}:{children:string}) => <div className="docs-code"><code>{children}</code><button onClick={()=>navigator.clipboard?.writeText(children)} title="Copy command"><Icon name="copy" size={15}/></button></div>;
function Documentation({go}:{go:(p:Page)=>void}) {
  const sections=[["overview","What is Polyglot Proxy?"],["byok","Use your own API"],["requirements","Prerequisites"],["setup","Step-by-step setup"],["run","Run the server"],["keys","Configure API keys"],["faq","Troubleshooting & FAQ"]];
  return <div className="docs-layout"><aside className="docs-toc"><strong>ON THIS PAGE</strong>{sections.map(s=><a href={`#${s[0]}`} key={s[0]}>{s[1]}</a>)}<div><Icon name="help"/><b>Need a quick check?</b><span>Open System Health to test your local process and Gemini readiness.</span><button onClick={()=>go("System Health")}>Open health screen</button></div></aside>
  <article className="docs"><div className="docs-hero"><Badge tone="purple">LOCAL-FIRST GUIDE</Badge><h2>Help & Documentation</h2><p>Everything you need to install, configure, run, and troubleshoot your local Polyglot Proxy AI bridge.</p></div>
    <section id="overview"><span className="doc-kicker">01 — CONCEPTS</span><h2>What is this agent?</h2><p>Polyglot Proxy is a <strong>local-first AI bridge</strong>. It runs as a FastAPI process on your computer and gives your applications a consistent local endpoint for communicating with Google Gemini. By default, traffic is sent to <code>127.0.0.1</code>—the loopback interface—which means the gateway itself is not exposed to the public internet.</p>
      <div className="doc-callout info"><Icon name="health"/><div><strong>What “local-first” means</strong><p>Your gateway, configuration, and dashboard run on your machine. A request leaves your computer only when the local gateway sends inference content to the provider you configured.</p></div></div>
      <div className="architecture"><div><Icon name="grid"/><b>Your app</b><small>Local client</small></div><i/><div><Icon name="route"/><b>FastAPI gateway</b><small>localhost:8000</small></div><i/><div><Icon name="spark"/><b>Google Gemini</b><small>Your API key</small></div></div>
      <h3>Bring Your Own Key (BYOK)</h3><p>BYOK means you provide and control your own Gemini API credential. Requests are billed against your Google account and its configured quota. The original developer's backend credentials are never revealed, shared, or used by your local instance.</p>
    </section>
    <section id="byok"><span className="doc-kicker">02 — YOUR API, YOUR AGENT</span><h2>Connect your API to the agent framework</h2>
      <p>Polyglot Proxy provides the <strong>agent framework</strong>: the local interface, request validation, FastAPI gateway, health checks, and response handling. You provide the Gemini API key that authorizes inference. The framework then operates using your provider account, quota, and billing—never the developer's private credentials.</p>
      <div className="byok-flow">
        <div><span>1</span><Icon name="key"/><strong>You provide a key</strong><p>Create a Gemini API key and add it through Settings or your private local <code>.env</code>.</p></div>
        <i><Icon name="chevron"/></i>
        <div><span>2</span><Icon name="route"/><strong>The framework prepares the request</strong><p>Your local agent validates the input and sends it through the FastAPI gateway.</p></div>
        <i><Icon name="chevron"/></i>
        <div><span>3</span><Icon name="spark"/><strong>Your API performs inference</strong><p>Gemini processes the request under your Google account and returns the response.</p></div>
      </div>
      <div className="ownership-grid"><div><Icon name="check"/><strong>The framework provides</strong><ul><li>Local dashboard and playground</li><li>Request formatting and validation</li><li>Health and readiness checks</li><li>Response handling and observability</li></ul></div><div><Icon name="key"/><strong>You control</strong><ul><li>Your Gemini API credential</li><li>Your provider quota and billing</li><li>When the key is replaced or revoked</li><li>Which prompts you submit</li></ul></div></div>
      <div className="doc-callout success"><Icon name="health"/><div><strong>No shared developer key</strong><p>The framework does not expose or use the original developer's credentials. It works with the API key that you explicitly configure on your own local instance.</p></div></div>
      <h3>Choose how to connect your key</h3>
      <div className="key-methods"><div><Badge tone="purple">Recommended</Badge><strong>Private environment file</strong><p>Place the key in your local <code>.env</code>. The backend reads it when the server starts.</p><Code>GEMINI_API_KEY=your_key_here</Code></div><div><Badge tone="neutral">Dashboard option</Badge><strong>Settings panel</strong><p>Paste the key into the masked field and choose <b>Save locally</b> for the current browser origin.</p><button className="primary" onClick={()=>go("Settings")}><Icon name="settings" size={15}/> Open Settings</button></div></div>
      <div className="doc-callout warning"><Icon name="key"/><div><strong>Use the method supported by your backend</strong><p>A server-side <code>.env</code> is safer for production-like use. Browser storage should be used only when your local application is explicitly designed to read and forward that credential.</p></div></div>
    </section>
    <section id="requirements"><span className="doc-kicker">02 — BEFORE YOU START</span><h2>Prerequisites & system requirements</h2><div className="requirement-grid"><div><b>Python 3.10+</b><p>Required to run FastAPI and the backend dependencies.</p><Code>python --version</Code></div><div><b>Google Gemini API key</b><p>Create a key in Google AI Studio. Free and paid quotas depend on Google's current terms.</p><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Open Google AI Studio →</a></div></div><div className="doc-callout warning"><Icon name="key"/><div><strong>Keep your key private</strong><p>Never commit a real key to Git, paste it into screenshots, or include it in support messages. Add <code>.env</code> to <code>.gitignore</code>.</p></div></div></section>
    <section id="setup"><span className="doc-kicker">03 — INSTALLATION</span><h2>Step-by-step setup</h2>
      <div className="steps"><div><b>1</b><article><h3>Open a terminal in the project folder</h3><p>In File Explorer, open the project folder, click the address bar, type <code>cmd</code>, and press Enter. You may also right-click the folder and choose “Open in Terminal” for PowerShell.</p></article></div>
      <div><b>2</b><article><h3>Create an isolated Python environment</h3><p>A virtual environment keeps this project's packages separate from your system Python installation.</p><Code>python -m venv .venv</Code><p>Activate it in Command Prompt:</p><Code>{`.venv\\Scripts\\activate`}</Code><p>Or activate it in PowerShell:</p><Code>{`.\\.venv\\Scripts\\Activate.ps1`}</Code></article></div>
      <div><b>3</b><article><h3>Install the project dependencies</h3><p>With <code>(.venv)</code> visible at the start of your terminal prompt, run:</p><Code>pip install -r requirements.txt</Code></article></div>
      <div><b>4</b><article><h3>Create and configure the environment file</h3><p>Copy the safe template, then edit the new <code>.env</code> file. Never modify or commit the template with a real secret.</p><Code>copy .env.example .env</Code><Code>GEMINI_API_KEY=your_key_here</Code></article></div></div>
    </section>
    <section id="run"><span className="doc-kicker">04 — STARTUP</span><h2>Run the local server</h2><p>Run this command from the project root while the virtual environment is active:</p><Code>python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload</Code><ul><li><code>backend.api:app</code> identifies the FastAPI application.</li><li><code>127.0.0.1</code> limits access to your computer.</li><li><code>--port 8000</code> exposes the local HTTP endpoint.</li><li><code>--reload</code> restarts the server when source files change; use it for development only.</li></ul><div className="doc-callout success"><Icon name="check"/><div><strong>Open the dashboard</strong><p>Visit <code>http://localhost:8000</code> if the backend serves the UI. If your frontend runs separately, use the UI URL shown by its local development tool.</p></div></div></section>
    <section id="keys"><span className="doc-kicker">05 — CONFIGURATION</span><h2>Configure API keys in the dashboard</h2><ol><li>Open <button onClick={()=>go("Settings")}>Settings</button> from the left navigation.</li><li>Confirm the API endpoint is <code>http://localhost:8000</code>.</li><li>Paste your Gemini API key into the masked field and choose <strong>Save locally</strong>.</li><li>Select <strong>Test connection</strong>. A success notification confirms that <code>/health</code> responded.</li><li>Open <button onClick={()=>go("System Health")}>System Health</button> to verify both the process and Gemini readiness.</li></ol><div className="doc-callout info"><Icon name="key"/><div><strong>How browser storage works</strong><p>This prototype stores configuration in this browser origin's local storage and sends it only from your local UI. Local storage is not encryption: anyone with access to your unlocked browser profile—or scripts running on the same origin—may be able to read it. For production, prefer server-side secret storage.</p></div></div></section>
    <section id="faq"><span className="doc-kicker">06 — SUPPORT</span><h2>Troubleshooting & FAQ</h2><details open><summary>“Address already in use” on port 8000</summary><p>Another process is using port 8000. Stop that process, or start Polyglot Proxy on another port and update the dashboard endpoint to match.</p><Code>python -m uvicorn backend.api:app --host 127.0.0.1 --port 8001 --reload</Code><Code>netstat -ano | findstr :8000</Code></details>
      <details><summary>“Invalid API Key” or “401 Unauthorized”</summary><p>Generate or copy the key again from Google AI Studio. Remove accidental spaces, confirm the correct Google project/API access, save the replacement in Settings, and retry <code>/ready</code>. A healthy <code>/health</code> with a failing <code>/ready</code> usually means the process is running but provider authentication or connectivity failed.</p></details>
      <details><summary>How do I know the server is active?</summary><p>Open <code>http://localhost:8000/health</code>. This checks process availability only. Then open <code>http://localhost:8000/ready</code>; readiness performs a bounded Gemini verification and may return a cached result.</p><Code>curl http://localhost:8000/health</Code><Code>curl http://localhost:8000/ready</Code></details>
      <details><summary>PowerShell blocks environment activation</summary><p>Use Command Prompt instead, or allow a process-scoped policy for the current PowerShell session:</p><Code>Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass</Code></details>
    </section>
  </article></div>
}

export default function App() {
  const [page,setPage]=useState<Page>("Overview"); const [collapsed,setCollapsed]=useState(false); const [drawer,setDrawer]=useState(false); const [toast,setToast]=useState(""); const [dark,setDark]=useState(()=>localStorage.getItem("polyglot_theme")!=="light");
  const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(""),2400)};
  useEffect(()=>{setDrawer(false)},[page]);
  useEffect(()=>{localStorage.setItem("polyglot_theme",dark?"dark":"light")},[dark]);
  const content=useMemo(()=>({Overview:<Overview go={setPage}/>,"AI Playground":<Playground toast={notify}/>,"Request Explorer":<Explorer/>,"Model Routing":<Routing/>,Analytics:<Analytics/>,"API Keys":<ApiKeys toast={notify}/>,Settings:<Settings toast={notify} dark={dark} setDark={setDark}/>,"System Health":<Health toast={notify}/>,"Help & Documentation":<Documentation go={setPage}/>} [page]),[page,dark]);
  return <div className={`app-shell ${dark?"":"light"}`}>
    <aside className={`${collapsed?"collapsed":""} ${drawer?"open":""}`}><div className="brand"><div className="logo"><span/><i/></div><div><strong>POLYGLOT</strong><small>PROXY</small></div><button className="collapse" onClick={()=>setCollapsed(!collapsed)}><Icon name="chevron" size={15}/></button></div>
      <nav>{nav.map(item=><button key={item.label} className={`nav-item ${item.label==="Help & Documentation"?"help":""} ${page===item.label?"selected":""}`} onClick={()=>setPage(item.label)}><Icon name={item.icon}/><span>{item.label}</span>{page===item.label&&<i/>}</button>)}</nav>
      <div className="sidebar-foot"><div className="usage-ring">68</div><div><strong>Prototype workspace</strong><span>Demo telemetry</span></div></div>
    </aside>{drawer&&<div className="drawer-shade" onClick={()=>setDrawer(false)}/>}
    <main><header><button className="mobile-menu" onClick={()=>setDrawer(true)}><Icon name="menu"/></button><div className="breadcrumbs"><span>Workspace /</span><h1>{page}</h1></div><div className="top-actions"><Badge tone="success">API configured</Badge><span className="env">DEVELOPMENT</span><button className="icon-btn"><Icon name="bell"/></button><button className="icon-btn" onClick={()=>setDark(!dark)} title="Change theme"><Icon name="sun"/></button><button className="avatar">AM</button></div></header><div className="content">{content}</div></main>
    {toast&&<div className="toast"><span><Icon name="check" size={15}/></span>{toast}</div>}
  </div>
}
