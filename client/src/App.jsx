import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, BarChart3, Bot, CheckCircle2, ChevronDown,
  CircleHelp, Clapperboard, FileText, Image, LayoutDashboard, Lightbulb,
  Menu, Plus, Search, Send, Settings, Sparkles, Target, Video, WandSparkles,
  X
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "/api";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Campaigns", icon: Target },
  { label: "Idea Generator", icon: Lightbulb },
  { label: "AI Copywriter", icon: FileText },
  { label: "Static Creative", icon: Image },
  { label: "Script Writer", icon: Clapperboard },
  { label: "UGC Video", icon: Video },
  { label: "Video Editor", icon: WandSparkles },
  { label: "Ads Agent", icon: Bot },
  { label: "Toast Analytics", icon: BarChart3 }
];

function App() {
  const [active, setActive] = useState("Overview");
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [search, setSearch] = useState("");
  const [ideaForm, setIdeaForm] = useState({
    campaignName: "", audience: "", offer: "", objective: "Donations", tone: "Hopeful"
  });
  const [ideas, setIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [copyForm, setCopyForm] = useState({
    campaignName: "", audience: "", offer: "", platform: "Meta Ads", tone: "Persuasive", selectedIdea: ""
  });
  const [copy, setCopy] = useState(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [aiMode, setAiMode] = useState("checking");
  const [lastFailed, setLastFailed] = useState(null);
  const [ideasSource, setIdeasSource] = useState("");
  const [copySource, setCopySource] = useState("");
  const [creativeForm, setCreativeForm] = useState({ campaignName: "", audience: "", offer: "", selectedIdea: "", headline: "", style: "Editorial photography", aspectRatio: "1:1" });
  const [creative, setCreative] = useState(null);
  const [creativeLoading, setCreativeLoading] = useState(false);

  async function loadCampaigns() {
    try {
      const response = await fetch(`${API}/campaigns`);
      if (!response.ok) throw new Error("Could not load campaigns");
      const data = await response.json();
      setCampaigns(data);
    } catch {
      setNotice("Cannot reach the backend. Make sure both development servers are running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
    fetch(`${API}/health`).then(r => r.json()).then(data => setAiMode(data.aiMode || "unknown")).catch(() => setAiMode("offline"));
  }, []);

  async function requestAI(endpoint, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${API}/ai/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
      if (data.mode !== "gemini") throw new Error("The server did not return a real Gemini response.");
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("Gemini took too long to respond. Please retry.");
      throw error;
    } finally { clearTimeout(timer); }
  }

  const filteredCampaigns = useMemo(() => {
    const term = search.toLowerCase();
    return campaigns.filter((campaign) =>
      campaign.name.toLowerCase().includes(term) ||
      campaign.client.toLowerCase().includes(term)
    );
  }, [campaigns, search]);

  async function createCampaign(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      name: form.get("name").trim(),
      client: form.get("client").trim(),
      objective: form.get("objective"),
      audience: form.get("audience").trim(),
      offer: form.get("offer").trim()
    };
    try {
      const response = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create campaign");
      setCampaigns((current) => [data, ...current]);
      setShowCampaignForm(false);
      setNotice("Campaign created successfully.");
      formElement.reset();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function generateIdeas(event) {
    event?.preventDefault();
    setIdeasLoading(true); setIdeas([]); setIdeasSource(""); setNotice(""); setLastFailed(null);
    try {
      const data = await requestAI("ideas", ideaForm);
      setIdeas(data.ideas); setIdeasSource(data.model); setAiMode("gemini");
    } catch (error) { setNotice(error.message); setLastFailed("ideas"); }
    finally { setIdeasLoading(false); }
  }

  function useIdeaForCopy(idea) {
    const selectedIdea = `Title: ${idea.title}\nAngle: ${idea.angle}\nDescription: ${idea.description}\nHook: ${idea.hook}\nSuggested format: ${idea.format}`;
    setCopyForm(current => ({ ...current,
      campaignName: ideaForm.campaignName,
      audience: ideaForm.audience,
      offer: ideaForm.offer,
      tone: ["Emotional", "Professional", "Urgent"].includes(ideaForm.tone) ? ideaForm.tone : current.tone,
      selectedIdea
    }));
    setCopy(null);
    setCopySource("");
    setNotice("");
    setLastFailed(null);
    setActive("AI Copywriter");
  }

  async function generateCopy(event) {
    event?.preventDefault();
    setCopyLoading(true); setCopy(null); setCopySource(""); setNotice(""); setLastFailed(null);
    try {
      const data = await requestAI("copy", copyForm);
      setCopy(data); setCopySource(data.model); setAiMode("gemini");
    } catch (error) { setNotice(error.message); setLastFailed("copy"); }
    finally { setCopyLoading(false); }
  }

  function useCopyForCreative() {
    setCreativeForm(current => ({...current, campaignName: copyForm.campaignName, audience: copyForm.audience,
      offer: copyForm.offer, selectedIdea: copyForm.selectedIdea,
      headline: copy?.headline || "" }));
    setCreative(null); setNotice(""); setLastFailed(null); setActive("Static Creative");
  }

  async function generateCreative(event) {
    event?.preventDefault();
    setCreativeLoading(true); setCreative(null); setNotice(""); setLastFailed(null);
    try {
      // Image requests can take longer than text requests.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 150000);
      try {
        const response = await fetch(`${API}/ai/creative`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(creativeForm), signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `Image generation failed (${response.status})`);
        if (data.mode !== "gemini" || !data.imageBase64 || !data.mimeType?.startsWith("image/")) throw new Error("No valid Gemini image was returned.");
        setCreative(data); setAiMode("gemini");
      } finally { clearTimeout(timer); }
    } catch (error) { setNotice(error.name === "AbortError" ? "Image generation timed out. Please retry." : error.message); setLastFailed("creative"); }
    finally { setCreativeLoading(false); }
  }

  const stats = [
    { label: "Total campaigns", value: campaigns.length.toString(), change: "Created in this demo", icon: Target, color: "purple" },
    { label: "AI ideas generated", value: ideas.length.toString(), change: "Latest generation", icon: Lightbulb, color: "orange" },
    { label: "Copy variations", value: copy ? "3" : "0", change: "Latest generation", icon: FileText, color: "blue" },
    { label: "Workflow status", value: "Ready", change: aiMode === "gemini" ? "Gemini AI connected" : "Gemini setup required", icon: Activity, color: "green" }
  ];

  function renderContent() {
    if (active === "Campaigns") {
      return <CampaignsPage campaigns={filteredCampaigns} loading={loading} search={search}
        setSearch={setSearch} onCreate={() => setShowCampaignForm(true)} />;
    }
    if (active === "Idea Generator") {
      return <IdeaPage form={ideaForm} setForm={setIdeaForm} onSubmit={generateIdeas}
        ideas={ideas} loading={ideasLoading} source={ideasSource} onUseIdea={useIdeaForCopy} />;
    }
    if (active === "AI Copywriter") {
      return <CopyPage form={copyForm} setForm={setCopyForm} onSubmit={generateCopy}
        result={copy} loading={copyLoading} source={copySource} onUseForCreative={useCopyForCreative} />;
    }
    if (active === "Static Creative") {
      return <CreativePage form={creativeForm} setForm={setCreativeForm} onSubmit={generateCreative} result={creative} loading={creativeLoading} />;
    }
    if (active !== "Overview") {
      return <ComingSoon name={active} />;
    }
    return <Overview campaigns={campaigns} stats={stats} onCreate={() => setShowCampaignForm(true)}
      setActive={setActive} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">cb</div>
          <div><strong>cerealbox</strong><span>AI STUDIO</span></div>
        </div>
        <div className="workspace-switch">
          <div className="workspace-avatar">CB</div>
          <div><strong>Agency workspace</strong><small>Demo environment</small></div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-heading">WORKSPACE</p>
        <nav>
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-link ${active === label ? "active" : ""}`}
              onClick={() => setActive(label)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
              {label === "Idea Generator" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-link"><Settings size={17} />Settings</button>
          <button className="nav-link"><CircleHelp size={17} />Help & support</button>
          <div className="profile">
            <div className="profile-avatar">U</div>
            <div><strong>Demo User</strong><small>Administrator</small></div>
            <MoreDots />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{active}</strong></div>
          <div className="top-actions">
            <span className="environment"><span /> {aiMode === "gemini" ? "GEMINI AI MODE" : aiMode === "not_configured" ? "GEMINI NOT CONFIGURED" : "CHECKING AI"}</span>
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <div className="top-avatar">U</div>
          </div>
        </header>
        <div className="page-wrap">
          {notice && <div className="notice"><span>{notice}</span>{lastFailed && <button className="text-button" disabled={ideasLoading || copyLoading || creativeLoading} onClick={() => lastFailed === "ideas" ? generateIdeas() : lastFailed === "creative" ? generateCreative() : generateCopy()}>Retry</button>}<button onClick={() => {setNotice("");setLastFailed(null);}}><X size={15}/></button></div>}
          {renderContent()}
        </div>
      </main>

      {showCampaignForm && <Modal title="Create a campaign" onClose={() => setShowCampaignForm(false)}>
        <form className="form-stack" onSubmit={createCampaign}>
          <Field label="Campaign name"><input name="name" placeholder="e.g. Education for Every Child" required /></Field>
          <Field label="Client name"><input name="client" placeholder="e.g. Bright Future Foundation" required /></Field>
          <Field label="Campaign objective"><select name="objective"><option>Donations</option><option>Lead generation</option><option>Sales</option><option>Awareness</option><option>Traffic</option></select></Field>
          <Field label="Target audience"><input name="audience" placeholder="e.g. Parents and education supporters" required /></Field>
          <Field label="Offer / key message"><textarea name="offer" placeholder="What are you asking people to do?" rows="3" required /></Field>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setShowCampaignForm(false)}>Cancel</button><button className="button primary" type="submit"><Plus size={16}/>Create campaign</button></div>
        </form>
      </Modal>}
    </div>
  );
}

function Overview({ campaigns, stats, onCreate, setActive }) {
  return <>
    <div className="welcome-row">
      <div><div className="eyebrow">TUESDAY, NOVEMBER 10, 2026</div><h1>Good afternoon <span>👋</span></h1><p>Here's what's happening across your creative workspace.</p></div>
      <button className="button primary" onClick={onCreate}><Plus size={17}/>New campaign</button>
    </div>
    <div className="hero-panel">
      <div className="hero-copy"><div className="hero-tag"><Sparkles size={14}/> YOUR AI CREATIVE WORKSPACE</div>
        <h2>Turn campaign ideas<br/>into <em>creative that works.</em></h2>
        <p>Generate campaign concepts, write compelling copy and build creative workflows — all in one place.</p>
        <button className="button hero-button" onClick={() => setActive("Idea Generator")}>Explore idea generator <ArrowUpRight size={16}/></button>
      </div>
      <div className="hero-art"><div className="orb orb-one"/><div className="orb orb-two"/><div className="floating-card card-a"><Lightbulb size={18}/><span>Fresh ideas</span><strong>10 concepts</strong></div><div className="floating-card card-b"><FileText size={18}/><span>Copy variations</span><strong>Ready to review</strong></div><div className="hero-spark">✳</div></div>
    </div>
    <div className="section-heading"><div><h2>Workspace overview</h2><p>Your creative activity at a glance.</p></div><span className="period-label">All time <ChevronDown size={14}/></span></div>
    <div className="stats-grid">{stats.map(({label,value,change,icon:Icon,color}) => <div className="stat-card" key={label}><div className={`stat-icon ${color}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-change">{change}</div></div>)}</div>
    <div className="content-grid">
      <section className="panel campaign-panel"><div className="panel-heading"><div><h3>Recent campaigns</h3><p>Your latest campaign projects.</p></div><button className="text-button" onClick={() => setActive("Campaigns")}>View all <ArrowUpRight size={14}/></button></div>
        {campaigns.length ? <div className="recent-list">{campaigns.slice(0,4).map(c => <div className="recent-item" key={c.id}><div className="campaign-symbol">{c.name.slice(0,1).toUpperCase()}</div><div className="recent-info"><strong>{c.name}</strong><small>{c.client} · {c.objective}</small></div><span className="status-pill">Draft</span></div>)}</div> : <EmptyState title="No campaigns yet" text="Create your first campaign to start building creative workflows." action="Create campaign" onClick={onCreate}/>}
      </section>
      <section className="panel quick-panel"><div className="panel-heading"><div><h3>Quick actions</h3><p>Start creating with AI.</p></div><Sparkles size={19} className="muted-icon"/></div>
        <QuickAction icon={Lightbulb} title="Generate campaign ideas" text="Explore new creative directions" onClick={() => setActive("Idea Generator")}/>
        <QuickAction icon={FileText} title="Write ad copy" text="Create headlines and variations" onClick={() => setActive("AI Copywriter")}/>
        <QuickAction icon={Target} title="Create a campaign" text="Set up a new campaign brief" onClick={onCreate}/>
      </section>
    </div>
    <div className="footnote"><CheckCircle2 size={15}/> Prototype environment · No live client accounts connected</div>
  </>;
}

function CampaignsPage({ campaigns, loading, search, setSearch, onCreate }) {
  return <><div className="page-title-row"><div><div className="eyebrow">WORKSPACE</div><h1>Campaigns</h1><p>Manage your client campaigns and creative briefs.</p></div><button className="button primary" onClick={onCreate}><Plus size={17}/>New campaign</button></div>
    <div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search campaigns or clients..." /></div><span className="result-count">{campaigns.length} campaigns</span></div>
    {loading ? <p className="muted">Loading campaigns...</p> : campaigns.length ? <div className="campaign-grid">{campaigns.map(c=><div className="campaign-card" key={c.id}><div className="campaign-card-top"><div className="campaign-symbol large">{c.name.slice(0,1).toUpperCase()}</div><span className="status-pill">Draft</span></div><h3>{c.name}</h3><p>{c.client}</p><div className="campaign-meta"><span>{c.objective}</span><span>{new Date(c.createdAt).toLocaleDateString()}</span></div><div className="campaign-audience"><small>TARGET AUDIENCE</small><p>{c.audience}</p></div></div>)}</div> : <EmptyState title="No matching campaigns" text="Create a campaign or change your search." action="New campaign" onClick={onCreate}/>}
  </>;
}

function IdeaPage({ form, setForm, onSubmit, ideas, loading, source, onUseIdea }) {
  const update = (key, value) => setForm(current => ({...current,[key]:value}));
  return <><div className="page-title-row"><div><div className="eyebrow">AI CREATIVE TOOLS</div><h1>Idea Generator <span className="new-pill">BETA</span></h1><p>Find fresh campaign angles and creative directions.</p></div></div>
    <div className="generator-layout"><section className="panel generator-form"><div className="panel-heading"><div><h3>Campaign brief</h3><p>Give the generator some context.</p></div><Lightbulb className="muted-icon"/></div>
      <form className="form-stack" onSubmit={onSubmit}>
        <Field label="Campaign / product name"><input value={form.campaignName} onChange={e=>update("campaignName",e.target.value)} placeholder="e.g. Education for Every Child" required /></Field>
        <Field label="Target audience"><input value={form.audience} onChange={e=>update("audience",e.target.value)} placeholder="Who do you want to reach?" required /></Field>
        <Field label="Offer / key message"><textarea value={form.offer} onChange={e=>update("offer",e.target.value)} placeholder="What is the campaign asking people to do?" rows="3" required /></Field>
        <div className="two-fields"><Field label="Objective"><select value={form.objective} onChange={e=>update("objective",e.target.value)}><option>Donations</option><option>Sales</option><option>Leads</option><option>Awareness</option><option>Traffic</option></select></Field><Field label="Tone"><select value={form.tone} onChange={e=>update("tone",e.target.value)}><option>Hopeful</option><option>Urgent</option><option>Emotional</option><option>Playful</option><option>Professional</option></select></Field></div>
        <button className="button primary full" disabled={loading}>{loading ? <span className="spinner"/> : <Sparkles size={16}/>} {loading ? "Generating ideas..." : "Generate campaign ideas"}</button>
        <p className="helper-text">Live Gemini API · Results require a configured API key</p>
      </form>
    </section><section className="results-area"><div className="results-heading"><div><h3>Generated concepts</h3><p>{ideas.length ? `${ideas.length} concepts generated by ${source || "Gemini"}` : "Your campaign ideas will appear here."}</p></div><span className="ai-chip"><Sparkles size={13}/> AI OUTPUT</span></div>
      {ideas.length ? <div className="idea-list">{ideas.map((idea,i)=><article className="idea-card" key={idea.title}><div className="idea-card-top"><span className="idea-number">CONCEPT 0{i+1}</span><span className="idea-angle">{idea.angle}</span></div><h3>{idea.title}</h3><p>{idea.description}</p><div className="idea-hook"><small>HOOK</small><strong>“{idea.hook}”</strong></div><div className="idea-footer"><span><Target size={14}/> {idea.format}</span><div className="idea-actions"><button className="text-button" onClick={()=>navigator.clipboard?.writeText(`${idea.title}\n${idea.description}\nHook: ${idea.hook}`)}>Copy concept</button><button className="button primary use-idea-button" type="button" onClick={() => onUseIdea(idea)}>Use This Idea <ArrowUpRight size={14}/></button></div></div></article>)}</div> : <div className="empty-results"><div className="empty-illustration"><Lightbulb size={29}/></div><h3>Ideas start here</h3><p>Complete the campaign brief and generate concepts tailored to your audience and objective.</p></div>}
    </section></div>
  </>;
}

function CopyPage({ form, setForm, onSubmit, result, loading, source, onUseForCreative }) {
  const update=(key,value)=>setForm(current=>({...current,[key]:value}));
  return <><div className="page-title-row"><div><div className="eyebrow">AI CREATIVE TOOLS</div><h1>AI Copywriter</h1><p>Generate campaign-ready messaging and copy variations.</p></div></div>
    <div className="generator-layout"><section className="panel generator-form"><div className="panel-heading"><div><h3>Copy brief</h3><p>Describe what you're advertising.</p></div><FileText className="muted-icon"/></div>
      <form className="form-stack" onSubmit={onSubmit}>
        <Field label="Campaign / product name"><input value={form.campaignName} onChange={e=>update("campaignName",e.target.value)} placeholder="Campaign name" required /></Field>
        <Field label="Target audience"><input value={form.audience} onChange={e=>update("audience",e.target.value)} placeholder="Target audience" required /></Field>
        <Field label="Offer / key message"><textarea value={form.offer} onChange={e=>update("offer",e.target.value)} placeholder="Main benefit or message" rows="3" required /></Field>
        {form.selectedIdea && <div className="selected-idea-brief"><div className="selected-idea-header"><strong>Selected campaign idea</strong><button type="button" className="text-button" onClick={() => update("selectedIdea", "")}>Clear idea</button></div><p className="helper-text">Transferred from Idea Generator. Edit this brief before generating, or clear it to write without a selected idea.</p><Field label="Creative direction"><textarea rows="6" value={form.selectedIdea} onChange={e => update("selectedIdea", e.target.value)} /></Field></div>}
        <div className="two-fields"><Field label="Platform"><select value={form.platform} onChange={e=>update("platform",e.target.value)}><option>Meta Ads</option><option>Instagram</option><option>Facebook</option><option>TikTok</option></select></Field><Field label="Tone"><select value={form.tone} onChange={e=>update("tone",e.target.value)}><option>Persuasive</option><option>Emotional</option><option>Friendly</option><option>Urgent</option><option>Professional</option></select></Field></div>
        <button className="button primary full" disabled={loading}>{loading ? <span className="spinner"/> : <Sparkles size={16}/>} {loading ? "Writing copy..." : "Generate ad copy"}</button>
      </form>
    </section><section className="results-area"><div className="results-heading"><div><h3>Copy variations</h3><p>{result ? `Generated by ${source || "Gemini"} · Review before publishing.` : "Your generated ad copy will appear here."}</p></div><span className="ai-chip"><Sparkles size={13}/> AI OUTPUT</span></div>
      {result ? <div className="copy-results"><button className="button primary full" type="button" onClick={onUseForCreative}><Image size={16}/> Create static creative from this copy <ArrowUpRight size={15}/></button><div className="copy-primary"><small>PRIMARY TEXT</small><p>{result.primaryText}</p><button className="text-button" onClick={()=>navigator.clipboard?.writeText(result.primaryText)}>Copy text</button></div><div className="copy-two"><div className="copy-box"><small>HEADLINE</small><strong>{result.headline}</strong></div><div className="copy-box"><small>CALL TO ACTION</small><strong>{result.cta}</strong></div></div>{result.variations.map((v,i)=><div className="variation-card" key={i}><small>VARIATION {i+1}</small><p>{v}</p><button className="text-button" onClick={()=>navigator.clipboard?.writeText(v)}>Copy variation</button></div>)}</div> : <div className="empty-results"><div className="empty-illustration"><FileText size={29}/></div><h3>Words that move people</h3><p>Enter your brief to generate primary text, headlines, calls to action and alternative messaging.</p></div>}
    </section></div>
  </>;
}


function CreativePage({ form, setForm, onSubmit, result, loading }) {
  const update = (key, value) => setForm(current => ({...current, [key]: value}));
  const src = result ? `data:${result.mimeType};base64,${result.imageBase64}` : "";
  function download() {
    const a = document.createElement("a"); a.href = src;
    a.download = `cerealbox-creative-${Date.now()}.${result.mimeType === "image/jpeg" ? "jpg" : "png"}`;
    a.click();
  }
  return <><div className="page-title-row"><div><div className="eyebrow">AI CREATIVE TOOLS</div><h1>Static Creative</h1><p>Generate an original ad image using Gemini. Review before publishing.</p></div></div>
    <div className="generator-layout"><section className="panel generator-form"><div className="panel-heading"><div><h3>Creative brief</h3><p>Use your copywriter brief or enter a new one.</p></div><Image className="muted-icon"/></div>
      <form className="form-stack" onSubmit={onSubmit}>
        <Field label="Campaign / product name"><input required maxLength="200" value={form.campaignName} onChange={e=>update("campaignName",e.target.value)} placeholder="Campaign name"/></Field>
        <Field label="Target audience"><input required maxLength="300" value={form.audience} onChange={e=>update("audience",e.target.value)} placeholder="Who is the ad for?"/></Field>
        <Field label="Offer / key message"><textarea required maxLength="1500" rows="3" value={form.offer} onChange={e=>update("offer",e.target.value)}/></Field>
        <Field label="Selected concept / visual direction"><textarea rows="4" maxLength="1500" value={form.selectedIdea} onChange={e=>update("selectedIdea",e.target.value)} placeholder="Optional creative concept"/></Field>
        <Field label="Headline context"><input maxLength="300" value={form.headline} onChange={e=>update("headline",e.target.value)} placeholder="Optional headline"/></Field>
        <div className="two-fields"><Field label="Visual style"><select value={form.style} onChange={e=>update("style",e.target.value)}><option>Editorial photography</option><option>Minimalist illustration</option><option>Bold graphic design</option><option>Warm lifestyle photography</option></select></Field><Field label="Image orientation"><select value={form.aspectRatio} onChange={e=>update("aspectRatio",e.target.value)}><option value="1:1">Square (1:1)</option><option value="9:16">Portrait (9:16)</option><option value="16:9">Landscape (16:9)</option></select></Field></div>
        <button className="button primary full" disabled={loading}>{loading ? <span className="spinner"/> : <Sparkles size={16}/>} {loading ? "Generating image (may take a minute)..." : "Generate static creative"}</button>
      </form>
    </section><section className="results-area"><div className="results-heading"><div><h3>Generated image</h3><p>{result ? `Generated by ${result.model} · Human review required.` : "Your AI-generated image will appear here."}</p></div><span className="ai-chip"><Sparkles size={13}/> AI OUTPUT</span></div>
      {result ? <div className="copy-results"><img className="creative-preview" src={src} alt={`AI-generated advertising creative for ${form.campaignName}`}/><p className="helper-text">Review factual accuracy, brand suitability, consent and platform policies. Image orientation is a prompt preference, not a guaranteed pixel dimension.</p><button className="button primary" type="button" onClick={download}>Download image</button><button className="button secondary" type="button" disabled={loading} onClick={() => onSubmit()}>Regenerate image</button></div> : <div className="empty-results"><div className="empty-illustration"><Image size={29}/></div><h3>Turn your copy into visuals</h3><p>Enter a brief or generate copy first, then use it here to create a campaign image.</p></div>}
    </section></div></>;
}

function ComingSoon({ name }) {
  return <div className="coming-soon"><div className="empty-illustration"><WandSparkles size={30}/></div><div className="eyebrow">PHASE 2 / 3</div><h1>{name}</h1><p>This module is included in the complete CerealBox workflow plan. We'll implement it in a later milestone.</p><span className="status-pill">Planned module</span></div>;
}
function Field({label,children}) { return <label className="field"><span>{label}</span>{children}</label>; }
function QuickAction({icon:Icon,title,text,onClick}) { return <button className="quick-action" onClick={onClick}><span className="quick-icon"><Icon size={18}/></span><span><strong>{title}</strong><small>{text}</small></span><ArrowUpRight size={16}/></button>; }
function EmptyState({title,text,action,onClick}) { return <div className="empty-state"><div className="empty-illustration"><Target size={26}/></div><h3>{title}</h3><p>{text}</p><button className="button secondary" onClick={onClick}>{action}</button></div>; }
function Modal({title,onClose,children}) { return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</div></div>; }
function MoreDots() { return <span className="more-dots">···</span>; }

export default App;
