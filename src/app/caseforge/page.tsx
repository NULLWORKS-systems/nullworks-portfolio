"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileSearch,
  Gauge,
  Network,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import styles from "./caseforge.module.css";

type SourceDoc = { id: string; name: string; kind: string; text: string; createdAt: string };
type EvidenceItem = { id: string; sourceId: string; sourceName: string; page: string; label: string; excerpt: string; weight: number; note: string };
type WorkItem = { id: string; title: string; owner: string; status: "open" | "review" | "done"; notes: string };
type MatterState = {
  client: string;
  opposing: string;
  child: string;
  county: string;
  matterType: string;
  tasking: string;
  facts: string;
  risks: string;
  operator: string;
  reviewer: string;
  approved: boolean;
  lastReceipt: string;
};
type SearchHit = { sourceId: string; sourceName: string; page: string; excerpt: string; score: number };
type GateState = { authorized: boolean; noSecrets: boolean; localOnlyAcknowledged: boolean };
type WorkspaceFile = { matter?: MatterState; docs?: SourceDoc[]; evidence?: EvidenceItem[]; workItems?: WorkItem[]; gates?: GateState };
type OfficialLink = { label: string; url: string; use: string };
type PdfJsTextItem = { str?: string };
type PdfJsPage = { getTextContent: () => Promise<{ items: PdfJsTextItem[] }> };
type PdfJsDocument = { numPages: number; getPage: (pageNumber: number) => Promise<PdfJsPage> };
type PdfJsLib = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<PdfJsDocument> } };
type PdfWindow = Window & typeof globalThis & { pdfjsLib?: PdfJsLib };

const storageKey = "nullworks-caseforge-local-beta-v3";

const initialMatter: MatterState = {
  client: "Jones",
  opposing: "Jones",
  child: "Minor Child",
  county: "Maricopa County",
  matterType: "Time-sensitive family case support packet",
  tasking: "Prepare a working memo, source index, issue map, discovery checklist, and review packet for professional review.",
  facts: "School stability, exchange logistics, communication pattern, and current order language appear central. Use prior matter structure only as a framework, not as authority.",
  risks: "Verify all sources, forms, dates, exhibits, and professional-scope boundaries before external use.",
  operator: "Senior family-law operations lead",
  reviewer: "Attorney / authorized professional",
  approved: false,
  lastReceipt: "No review receipt yet.",
};

const initialGates: GateState = { authorized: false, noSecrets: false, localOnlyAcknowledged: false };

const seedDocs: SourceDoc[] = [
  { id: "sample-messages", name: "Sample message notes", kind: "seed text", createdAt: "beta seed", text: "Page 4: Holiday exchange dispute. One parent asks to change the exchange time. The other references school schedule.\n\nPage 118: Repeated schedule-change requests. Several messages show conflict about pickup timing and communication.\n\nPage 322: Escalating language. Full context must be reviewed before using any sensitive characterization." },
  { id: "sample-order", name: "Sample prior order notes", kind: "seed text", createdAt: "beta seed", text: "Page 1: Existing order controls decision-making and parenting-time language. Quote exactly from the signed order. Do not reconstruct order terms from memory.\n\nPage 2: Current plan requires exchange logistics and school-day stability to be evaluated against actual signed language." },
];

const seedWorkItems: WorkItem[] = [
  { id: "wi-order", title: "Verify current signed order language", owner: "Reviewer", status: "open", notes: "Confirm exact order terms before external use." },
  { id: "wi-sources", title: "Load source records", owner: "Operator", status: "open", notes: "Paste/export OCR text or upload PDF/text." },
  { id: "wi-evidence", title: "Capture supporting source blocks", owner: "Operator", status: "open", notes: "Search sources and capture relevant blocks with page references." },
  { id: "wi-review", title: "Professional review gate", owner: "Reviewer", status: "review", notes: "No external use until reviewed." },
];

const authoritySlots = [
  ["Official statute slot", "Arizona statutes", "Use official pages or pasted official text; verify before citing."],
  ["Official court slot", "Arizona court rules", "Use official pages or pasted official text; verify procedure before use."],
  ["Local court slot", "Maricopa County forms", "Use official forms/pages; verify packet and filing posture."],
  ["Licensed research slot", "Licensed legal research connector", "Not connected. Case-law validation requires licensed access."],
  ["Matter memory slot", "Prior work product", "Pattern memory only. Never controlling authority by itself."],
];

const officialLinks: OfficialLink[] = [
  { label: "Arizona Revised Statutes", url: "https://www.azleg.gov/arstitle/", use: "Official Arizona statute starting point." },
  { label: "Arizona Judicial Branch rules", url: "https://www.azcourts.gov/rules", use: "Official court rule starting point." },
  { label: "Maricopa family forms", url: "https://superiorcourt.maricopa.gov/llrc/family-court-forms/", use: "Local family court forms and packets." },
  { label: "Arizona Legal Document Preparer", url: "https://www.azcourts.gov/cld/Legal-Document-Preparer-Program", use: "Scope boundary for document-prep lane." },
  { label: "Arizona Legal Paraprofessional", url: "https://www.azcourts.gov/cld/Legal-Paraprofessional", use: "Scope boundary for LP lane." },
];

const pdfScriptUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const pdfWorkerUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function nowReceipt() { return new Date().toLocaleString(); }
function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; }
function pdfWindow() { return window as PdfWindow; }

function chunkText(source: SourceDoc): SearchHit[] {
  return source.text.split(/\n\s*\n|(?=Page\s+\d+)/i).map((block) => block.trim()).filter(Boolean).map((block, index) => ({ sourceId: source.id, sourceName: source.name, page: block.match(/page\s+(\d+)/i)?.[1] ?? `${index + 1}`, excerpt: block.length > 850 ? `${block.slice(0, 850)}…` : block, score: 0 }));
}

function scoreHit(text: string, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  const haystack = text.toLowerCase();
  return terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
}

async function loadPdfJs(): Promise<PdfJsLib> {
  const win = pdfWindow();
  if (win.pdfjsLib) { win.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl; return win.pdfjsLib; }
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("caseforge-pdfjs-loader") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("PDF.js failed to load.")), { once: true }); return; }
    const script = document.createElement("script");
    script.id = "caseforge-pdfjs-loader";
    script.src = pdfScriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PDF.js failed to load."));
    document.head.appendChild(script);
  });
  const loaded = pdfWindow().pdfjsLib;
  if (!loaded) throw new Error("PDF.js unavailable after load.");
  loaded.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  return loaded;
}

async function extractPdfText(file: File) {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str ?? "").join(" ").replace(/\s+/g, " ").trim();
    pages.push(`Page ${pageNumber}: ${text}`);
  }
  return pages.join("\n\n");
}

export default function CaseForgePage() {
  const [matter, setMatter] = useState<MatterState>(initialMatter);
  const [docs, setDocs] = useState<SourceDoc[]>(seedDocs);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>(seedWorkItems);
  const [gates, setGates] = useState<GateState>(initialGates);
  const [query, setQuery] = useState("school exchange schedule order");
  const [pasteName, setPasteName] = useState("Pasted source block");
  const [pasteKind, setPasteKind] = useState("pasted text");
  const [pasteText, setPasteText] = useState("");
  const [officialUrl, setOfficialUrl] = useState(officialLinks[0].url);
  const [newTask, setNewTask] = useState("");
  const [status, setStatus] = useState("Local beta ready. Data is stored in this browser until backend persistence is wired.");

  useEffect(() => { try { const raw = localStorage.getItem(storageKey); if (!raw) return; const parsed = JSON.parse(raw) as WorkspaceFile; if (parsed.matter) setMatter(parsed.matter); if (parsed.docs) setDocs(parsed.docs); if (parsed.evidence) setEvidence(parsed.evidence); if (parsed.workItems) setWorkItems(parsed.workItems); if (parsed.gates) setGates(parsed.gates); } catch { setStatus("Could not load prior local workspace. Starting fresh."); } }, []);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify({ matter, docs, evidence, workItems, gates })); } catch { setStatus("Local save failed. Browser storage may be blocked or full."); } }, [matter, docs, evidence, workItems, gates]);

  const searchHits = useMemo(() => docs.flatMap(chunkText).map((hit) => ({ ...hit, score: scoreHit(hit.excerpt, query) })).filter((hit) => query.trim().length === 0 || hit.score > 0).sort((a, b) => b.score - a.score).slice(0, 30), [docs, query]);
  const issueMap = useMemo(() => buildIssueMap(matter, evidence), [matter, evidence]);
  const memo = useMemo(() => buildMemo(matter, evidence, docs, workItems, issueMap, gates), [matter, evidence, docs, workItems, issueMap, gates]);
  const gateReady = gates.authorized && gates.noSecrets && gates.localOnlyAcknowledged;

  function updateMatter(field: keyof MatterState, value: string | boolean) { setMatter((current) => ({ ...current, [field]: value })); }
  function updateGate(field: keyof GateState) { setGates((current) => ({ ...current, [field]: !current[field] })); }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const loaded: SourceDoc[] = [];
    const rejected: string[] = [];
    setStatus(`Reading ${files.length} file(s)...`);
    for (const file of files) {
      const lower = file.name.toLowerCase();
      try {
        if (lower.endsWith(".pdf") || file.type === "application/pdf") { const text = await extractPdfText(file); loaded.push({ id: makeId("pdf"), name: file.name, kind: "browser-extracted PDF text", text, createdAt: nowReceipt() }); }
        else { loaded.push({ id: makeId("doc"), name: file.name, kind: file.type || "text file", text: await file.text(), createdAt: nowReceipt() }); }
      } catch (error) { rejected.push(`${file.name}: ${error instanceof Error ? error.message : "could not be read"}.`); }
    }
    if (loaded.length) setDocs((current) => [...loaded, ...current]);
    setStatus([loaded.length ? `Loaded ${loaded.length} source(s).` : "No sources loaded.", ...rejected].join(" "));
    event.target.value = "";
  }

  async function importWorkspace(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { const parsed = JSON.parse(await file.text()) as WorkspaceFile; if (parsed.matter) setMatter(parsed.matter); if (parsed.docs) setDocs(parsed.docs); if (parsed.evidence) setEvidence(parsed.evidence); if (parsed.workItems) setWorkItems(parsed.workItems); if (parsed.gates) setGates(parsed.gates); setStatus(`Imported workspace from ${file.name}.`); }
    catch { setStatus("Workspace import failed. Use a CaseForge JSON export."); }
    event.target.value = "";
  }

  async function tryImportOfficialUrl() {
    try { setStatus("Attempting browser import from official URL. Some courts block browser fetch; paste text if blocked."); const response = await fetch(officialUrl); if (!response.ok) throw new Error(`HTTP ${response.status}`); const html = await response.text(); const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); setDocs((current) => [{ id: makeId("official"), name: officialUrl, kind: "official-url browser import", text, createdAt: nowReceipt() }, ...current]); setStatus("Official URL text imported. Verify against the original page before external use."); }
    catch (error) { setStatus(`Browser import failed: ${error instanceof Error ? error.message : "unknown error"}. Open the official page and paste the relevant text instead.`); }
  }

  function addPastedSource() { if (pasteText.trim().length < 5) { setStatus("Paste source text before adding a source block."); return; } setDocs((current) => [{ id: makeId("paste"), name: pasteName.trim() || "Pasted source block", kind: pasteKind.trim() || "pasted text", text: pasteText, createdAt: nowReceipt() }, ...current]); setPasteText(""); setStatus("Pasted source block added and indexed locally."); }
  function captureEvidence(hit: SearchHit) { setEvidence((current) => [{ id: makeId("ev"), sourceId: hit.sourceId, sourceName: hit.sourceName, page: hit.page, label: `Page/block ${hit.page} — ${query || "captured source"}`, excerpt: hit.excerpt, weight: Math.min(99, 60 + hit.score * 10), note: "Captured from local source search. Verify context before external use." }, ...current]); setStatus(`Captured evidence from ${hit.sourceName}, page/block ${hit.page}.`); }
  function updateEvidence(id: string, patch: Partial<EvidenceItem>) { setEvidence((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item)); }
  function addWorkItem() { if (!newTask.trim()) { setStatus("Add a task title first."); return; } setWorkItems((current) => [{ id: makeId("task"), title: newTask.trim(), owner: matter.operator, status: "open", notes: "Added from local beta." }, ...current]); setNewTask(""); setStatus("Work item added."); }
  function cycleWorkItem(id: string) { setWorkItems((current) => current.map((item) => { if (item.id !== id) return item; const next = item.status === "open" ? "review" : item.status === "review" ? "done" : "open"; return { ...item, status: next }; })); }
  async function copyMemo() { try { await navigator.clipboard.writeText(memo); setStatus("Working memo copied to clipboard."); } catch { setStatus("Clipboard copy failed. Select and copy the memo manually."); } }
  function downloadText() { downloadBlob(memo, `caseforge-${matter.client || "matter"}-working-memo.txt`, "text/plain"); setStatus("Working memo TXT exported."); }
  function downloadWorkspace() { downloadBlob(JSON.stringify({ matter, docs, evidence, workItems, gates, memo }, null, 2), `caseforge-${matter.client || "matter"}-workspace.json`, "application/json"); setStatus("Workspace JSON exported."); }
  function markReview() { const next = !matter.approved; setMatter((current) => ({ ...current, approved: next, lastReceipt: next ? `Review gate marked complete at ${nowReceipt()}` : `Review gate reopened at ${nowReceipt()}` })); }
  function resetWorkspace() { setMatter(initialMatter); setDocs(seedDocs); setEvidence([]); setWorkItems(seedWorkItems); setGates(initialGates); setStatus("Workspace reset to beta seed data."); }

  return (
    <main className={styles.page}>
      <section className={styles.hero}><div className={styles.heroCopy}><div className={styles.kicker}>NULLWORKS CASEFORGE · FUNCTIONAL LOCAL BETA</div><h1>CaseForge</h1><p>Upload PDFs/text, search the record, capture evidence, build issue modules, manage work items, preserve review receipts, and export the workspace.</p><div className={styles.boundary}><ShieldCheck size={20} /><span>Operations support only. Professional authority remains final.</span></div></div><div className={styles.statusCard}><Gauge size={24} /><strong>{matter.approved ? "Review marked" : gateReady ? "Local gate ready" : "Gate incomplete"}</strong><span>{status}</span></div></section>
      <section className={styles.gridTwo}><article className={styles.card}><div className={styles.cardHead}><ShieldCheck size={20} /><h2>Client-data safety gate</h2></div><div className={styles.auditList}><button className={gates.authorized ? styles.evidenceOn : styles.evidence} onClick={() => updateGate("authorized")}><strong>{gates.authorized ? "DONE" : "OPEN"} · Authorization confirmed</strong><span>I have authorization to process this material in this beta workspace.</span></button><button className={gates.noSecrets ? styles.evidenceOn : styles.evidence} onClick={() => updateGate("noSecrets")}><strong>{gates.noSecrets ? "DONE" : "OPEN"} · No secrets / unnecessary sensitive data</strong><span>I have removed passwords, payment data, unnecessary identifiers, and unrelated private material.</span></button><button className={gates.localOnlyAcknowledged ? styles.evidenceOn : styles.evidence} onClick={() => updateGate("localOnlyAcknowledged")}><strong>{gates.localOnlyAcknowledged ? "DONE" : "OPEN"} · Local-only storage acknowledged</strong><span>This beta stores data in this browser and JSON exports; no secure firm cloud is configured yet.</span></button></div></article><article className={styles.card}><div className={styles.cardHead}><Network size={20} /><h2>Cloud / account status</h2></div><div className={styles.exportLocked}><strong>Not configured yet</strong><p>No Supabase/Auth/firm database credentials are wired in this preview. Use JSON export/import to move work between phone and laptop until secure cloud sync is built.</p></div><input type="file" accept=".json,application/json" onChange={importWorkspace} /><button className={styles.primaryButton} onClick={downloadWorkspace}>Export workspace JSON</button></article></section>
      <section className={styles.gridTwo}><article className={styles.card}><div className={styles.cardHead}><BriefcaseBusiness size={20} /><h2>Matter workspace</h2></div><div className={styles.formGrid}><Field label="Client" value={matter.client} onChange={(value) => updateMatter("client", value)} /><Field label="Opposing party" value={matter.opposing} onChange={(value) => updateMatter("opposing", value)} /><Field label="Child / initials" value={matter.child} onChange={(value) => updateMatter("child", value)} /><Field label="County" value={matter.county} onChange={(value) => updateMatter("county", value)} /><Field label="Matter type" value={matter.matterType} onChange={(value) => updateMatter("matterType", value)} /><Field label="Reviewer" value={matter.reviewer} onChange={(value) => updateMatter("reviewer", value)} /></div><TextField label="Tasking" value={matter.tasking} onChange={(value) => updateMatter("tasking", value)} /><TextField label="Known facts" value={matter.facts} onChange={(value) => updateMatter("facts", value)} /><TextField label="Risks / boundaries" value={matter.risks} onChange={(value) => updateMatter("risks", value)} /></article><article className={styles.card}><div className={styles.cardHead}><ScanLine size={20} /><h2>Source intake</h2></div><p className={styles.microcopy}>PDF extraction now runs in the browser with pdf.js. Scanned image-only PDFs may still need OCR.</p><input type="file" multiple accept=".pdf,.txt,.md,.csv,.json,.html,.xml,application/pdf,text/*" onChange={handleFile} /><Field label="Source name" value={pasteName} onChange={setPasteName} /><Field label="Source type" value={pasteKind} onChange={setPasteKind} /><TextField label="Paste source text / OCR / transcript" value={pasteText} onChange={setPasteText} /><button className={styles.primaryButton} onClick={addPastedSource}>Add source block <ArrowRight size={16} /></button><div className={styles.auditList}>{docs.map((doc) => <span key={doc.id}>{doc.name} · {doc.kind} · {doc.text.length.toLocaleString()} chars · {doc.createdAt}</span>)}</div></article></section>
      <section className={styles.gridTwo}><article className={styles.card}><div className={styles.cardHead}><Network size={20} /><h2>Official source helper</h2></div><p className={styles.microcopy}>Open official sources, then either try browser import or paste verified text. Browser import may fail if the site blocks CORS.</p><Field label="Official URL" value={officialUrl} onChange={setOfficialUrl} /><div className={styles.chips}><button className={styles.primaryButton} onClick={() => window.open(officialUrl, "_blank", "noopener,noreferrer")}>Open official source</button><button className={styles.primaryButton} onClick={tryImportOfficialUrl}>Try browser import</button></div><div className={styles.sourceGrid}>{officialLinks.map((link) => <button key={link.url} className={styles.evidence} onClick={() => setOfficialUrl(link.url)}><strong>{link.label}</strong><span>{link.use}</span></button>)}</div></article><article className={styles.card}><div className={styles.cardHead}><TriangleAlert size={20} /><h2>Licensed research gate</h2></div><div className={styles.exportLocked}><strong>Not connected</strong><p>Westlaw, Practical Law, CoCounsel, or equivalent case-law validation is not available in this preview. Do not treat any case-law slot as verified until a licensed connector or human legal research source is actually attached.</p></div></article></section>
      <section className={styles.gridTwoWide}><article className={styles.card}><div className={styles.cardHead}><FileSearch size={20} /><h2>Search and capture evidence</h2></div><Field label="Search query" value={query} onChange={setQuery} /><div className={styles.evidenceList}>{searchHits.map((hit) => <button key={`${hit.sourceId}-${hit.page}-${hit.excerpt.slice(0, 20)}`} className={styles.evidence} onClick={() => captureEvidence(hit)}><strong>{hit.sourceName} · page/block {hit.page}</strong><span>{hit.excerpt}</span><em>Score {hit.score} · tap to capture</em></button>)}</div></article><article className={styles.card}><div className={styles.cardHead}><Sparkles size={20} /><h2>Captured evidence</h2></div><div className={styles.evidenceList}>{evidence.length === 0 ? <p className={styles.microcopy}>No evidence captured yet.</p> : evidence.map((item) => <div key={item.id} className={styles.evidenceOn}><Field label="Label" value={item.label} onChange={(value) => updateEvidence(item.id, { label: value })} /><TextField label="Excerpt" value={item.excerpt} onChange={(value) => updateEvidence(item.id, { excerpt: value })} /><Field label="Review note" value={item.note} onChange={(value) => updateEvidence(item.id, { note: value })} /><strong>{item.sourceName} · page/block {item.page} · weight {item.weight}</strong><button className={styles.primaryButton} onClick={() => setEvidence((current) => current.filter((ev) => ev.id !== item.id))}>Remove</button></div>)}</div></article></section>
      <section className={styles.gridThree}><article className={styles.card}><div className={styles.cardHead}><Workflow size={20} /><h2>Generated issue modules</h2></div><div className={styles.argumentList}>{issueMap.map((issue) => <div key={issue.title} className={styles.argumentOn}><span className={styles.score}>{issue.strength}</span><span><strong>{issue.title}</strong><small>{issue.summary}</small><em>{issue.receipts}</em></span></div>)}</div></article><article className={styles.card}><div className={styles.cardHead}><CheckCircle2 size={20} /><h2>Work items</h2></div><Field label="New task" value={newTask} onChange={setNewTask} /><button className={styles.primaryButton} onClick={addWorkItem}>Add task</button><div className={styles.auditList}>{workItems.map((item) => <button key={item.id} className={styles.evidence} onClick={() => cycleWorkItem(item.id)}><strong>{item.status.toUpperCase()} · {item.title}</strong><span>{item.owner}: {item.notes}</span></button>)}</div></article><article className={styles.card}><div className={styles.cardHead}><Network size={20} /><h2>Import / export</h2></div><button className={styles.primaryButton} onClick={downloadWorkspace}>Export workspace JSON</button><button className={styles.primaryButton} onClick={downloadText}>Export memo TXT</button><button className={styles.primaryButton} onClick={resetWorkspace}>Reset local data</button></article></section>
      <section className={styles.gridTwoWide}><article className={styles.card}><div className={styles.cardHead}><Workflow size={20} /><h2>Working memo</h2></div><div className={styles.draftPreview}><pre>{memo}</pre></div><div className={styles.chips}><button className={styles.primaryButton} onClick={copyMemo}>Copy memo</button><button className={styles.primaryButton} onClick={downloadText}>Download TXT</button></div></article><article className={styles.card}><div className={styles.cardHead}><ShieldCheck size={20} /><h2>Review gate</h2></div><button className={matter.approved ? styles.approvalOn : styles.approval} onClick={markReview}>{matter.approved ? <CheckCircle2 /> : <TriangleAlert />}<span>{matter.approved ? "Review receipt marked complete" : "External use blocked pending review"}</span></button><div className={matter.approved ? styles.exportReady : styles.exportLocked}><strong>{evidence.length ? "Memo generated" : "Needs captured evidence"}</strong><p>{matter.lastReceipt}</p></div><ul className={styles.cleanList}><li>Verify sources before external use.</li><li>Professional judgment controls final output.</li><li>Do not paste protected client data without authorization.</li></ul></article></section>
      <section className={styles.card}><div className={styles.cardHead}><Network size={20} /><h2>Authority connectors still required</h2></div><div className={styles.sourceGrid}>{authoritySlots.map(([kind, label, use]) => <div key={label}><strong>{kind}</strong><span>{label}</span><p>{use}</p></div>)}</div></section>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function downloadBlob(content: string, filename: string, type: string) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }

function buildIssueMap(matter: MatterState, evidence: EvidenceItem[]) {
  const text = `${matter.tasking} ${matter.facts} ${evidence.map((item) => item.excerpt).join(" ")}`.toLowerCase();
  const modules = [
    { title: "Current order / source-language verification", terms: ["order", "signed", "current"], summary: "Confirm exact controlling source language before any external use." },
    { title: "Child stability / logistics", terms: ["school", "exchange", "schedule", "pickup"], summary: "Organize source-backed facts about schedule, school, exchange, and routine." },
    { title: "Communication pattern", terms: ["message", "communication", "talking", "parent"], summary: "Identify repeated communication patterns while preserving full context." },
    { title: "Discovery / production checklist", terms: ["discovery", "request", "records", "production"], summary: "Track requested materials, missing items, response shells, and review needs." },
  ];
  return modules.map((module) => { const hits = module.terms.filter((term) => text.includes(term)).length; const receipts = evidence.filter((item) => module.terms.some((term) => item.excerpt.toLowerCase().includes(term))).length; return { title: module.title, summary: module.summary, receipts: `${receipts} captured evidence receipt(s)`, strength: Math.min(99, 45 + hits * 12 + receipts * 8) }; }).sort((a, b) => b.strength - a.strength);
}

function buildMemo(matter: MatterState, evidence: EvidenceItem[], docs: SourceDoc[], workItems: WorkItem[], issueMap: ReturnType<typeof buildIssueMap>, gates: GateState) {
  const evidenceLines = evidence.length ? evidence.map((item, index) => `${index + 1}. ${item.label}\n   Source: ${item.sourceName}, page/block ${item.page}\n   Weight: ${item.weight}\n   Excerpt: ${item.excerpt}\n   Note: ${item.note}`).join("\n\n") : "No evidence captured yet.";
  const sourceLines = docs.map((doc, index) => `${index + 1}. ${doc.name} (${doc.kind}) — ${doc.text.length.toLocaleString()} characters — ${doc.createdAt}`).join("\n");
  const taskLines = workItems.map((item, index) => `${index + 1}. [${item.status.toUpperCase()}] ${item.title} — ${item.owner}: ${item.notes}`).join("\n");
  const issueLines = issueMap.map((item, index) => `${index + 1}. ${item.title} — strength ${item.strength}\n   ${item.summary}\n   ${item.receipts}`).join("\n");
  return `CASEFORGE LOCAL BETA WORKING MEMO\n\nBOUNDARY\nOperations support only. Professional authority remains final.\n\nCLIENT-DATA GATES\nAuthorization: ${gates.authorized ? "CONFIRMED" : "OPEN"}\nNo secrets/unnecessary sensitive data: ${gates.noSecrets ? "CONFIRMED" : "OPEN"}\nLocal-only storage acknowledged: ${gates.localOnlyAcknowledged ? "CONFIRMED" : "OPEN"}\n\nMATTER\nClient: ${matter.client}\nOpposing Party: ${matter.opposing}\nChild / Initials: ${matter.child}\nCounty: ${matter.county}\nMatter Type: ${matter.matterType}\nReviewer: ${matter.reviewer}\n\nTASKING\n${matter.tasking}\n\nKNOWN FACTS\n${matter.facts}\n\nRISKS / BOUNDARIES\n${matter.risks}\n\nGENERATED ISSUE MODULES\n${issueLines}\n\nCAPTURED EVIDENCE\n${evidenceLines}\n\nWORK ITEMS\n${taskLines}\n\nSOURCE INVENTORY\n${sourceLines || "No source documents loaded."}\n\nREVIEW CHECKLIST\n[ ] Verify official sources and forms.\n[ ] Verify excerpts against full document context.\n[ ] Confirm requested tasking and authorization.\n[ ] Confirm exhibits and page references.\n[ ] Reviewer approves final use.\n\nREVIEW RECEIPT\n${matter.lastReceipt}\n`;
}
