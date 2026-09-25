"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowRight, CheckCircle2, FileSearch, Gauge, Network, ScanLine, ShieldCheck, Sparkles, TriangleAlert, Workflow } from "lucide-react";
import styles from "../caseforge.module.css";

type SourceDoc = { id: string; name: string; kind: string; text: string; createdAt: string };
type PageBlock = { id: string; sourceId: string; sourceName: string; page: string; text: string; chars: number; quality: number; warning: string; evidenceCount: number };
type EvidenceItem = { id: string; sourceId: string; sourceName: string; page: string; excerpt: string; label: string; note: string; weight: number; createdAt: string };
type SearchHit = PageBlock & { score: number };
type PdfJsTextItem = { str?: string };
type PdfJsPage = { getTextContent: () => Promise<{ items: PdfJsTextItem[] }> };
type PdfJsDocument = { numPages: number; getPage: (pageNumber: number) => Promise<PdfJsPage> };
type PdfJsLib = { GlobalWorkerOptions: { workerSrc: string }; getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<PdfJsDocument> } };
type PdfWindow = Window & typeof globalThis & { pdfjsLib?: PdfJsLib };

const storageKey = "nullworks-konran-lite-v1";
const pdfScriptUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const pdfWorkerUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const seedDocs: SourceDoc[] = [
  { id: "seed-tp", name: "Sample TalkingParents transcript", kind: "seed text", createdAt: "beta seed", text: "Page 1: Parent A asks to move the exchange time because of school pickup. Parent B objects and says the current order should be followed.\n\nPage 2: Parent A repeats the request and adds that the child has homework and school routine concerns.\n\nPage 3: Escalating language appears. Full context must be checked before using any sensitive characterization." },
  { id: "seed-order", name: "Sample order excerpt", kind: "seed text", createdAt: "beta seed", text: "Page 1: Current order language controls decision-making and parenting-time terms. Quote exact language from the signed order.\n\nPage 2: Exchange logistics and school-day routines should be compared against the current signed order." },
];

function nowReceipt() { return new Date().toLocaleString(); }
function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; }
function pdfWindow() { return window as PdfWindow; }
function qualityFor(text: string) {
  if (text.trim().length < 20) return { quality: 10, warning: "Very low text extraction. Possible scanned/image-only page or empty block." };
  if (text.trim().length < 120) return { quality: 45, warning: "Low text volume. Verify page manually." };
  return { quality: 90, warning: "Text extracted. Still verify against original source." };
}

async function loadPdfJs(): Promise<PdfJsLib> {
  const win = pdfWindow();
  if (win.pdfjsLib) { win.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl; return win.pdfjsLib; }
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("konran-pdfjs-loader") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("PDF.js failed to load.")), { once: true }); return; }
    const script = document.createElement("script");
    script.id = "konran-pdfjs-loader";
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

function buildBlocks(docs: SourceDoc[], evidence: EvidenceItem[]): PageBlock[] {
  return docs.flatMap((doc) => doc.text.split(/\n\s*\n|(?=Page\s+\d+)/i).map((raw, index) => {
    const text = raw.trim();
    if (!text) return null;
    const page = text.match(/page\s+(\d+)/i)?.[1] ?? `${index + 1}`;
    const q = qualityFor(text);
    const id = `${doc.id}::${page}::${index}`;
    return { id, sourceId: doc.id, sourceName: doc.name, page, text, chars: text.length, quality: q.quality, warning: q.warning, evidenceCount: evidence.filter((item) => item.sourceId === doc.id && item.page === page).length };
  }).filter((block): block is PageBlock => Boolean(block)));
}

function score(text: string, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
  const haystack = text.toLowerCase();
  return terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function KonranLitePage() {
  const [docs, setDocs] = useState<SourceDoc[]>(seedDocs);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [query, setQuery] = useState("school exchange order");
  const [activeBlockId, setActiveBlockId] = useState("");
  const [pasteName, setPasteName] = useState("Pasted source block");
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState("KONRAN Lite ready. Upload PDF/text or paste source text.");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { docs?: SourceDoc[]; evidence?: EvidenceItem[]; query?: string };
      if (parsed.docs) setDocs(parsed.docs);
      if (parsed.evidence) setEvidence(parsed.evidence);
      if (parsed.query) setQuery(parsed.query);
    } catch { setStatus("Could not load prior KONRAN workspace. Starting fresh."); }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ docs, evidence, query })); }
    catch { setStatus("Local save failed. Browser storage may be blocked or full."); }
  }, [docs, evidence, query]);

  const blocks = useMemo(() => buildBlocks(docs, evidence), [docs, evidence]);
  const hits = useMemo<SearchHit[]>(() => blocks.map((block) => ({ ...block, score: score(block.text, query) })).filter((hit) => query.trim().length === 0 || hit.score > 0).sort((a, b) => b.score - a.score), [blocks, query]);
  const activeBlock = blocks.find((block) => block.id === activeBlockId) ?? hits[0] ?? blocks[0];
  const crosswalk = useMemo(() => evidence.map((item, index) => `${index + 1}. ${item.label}\nSource: ${item.sourceName}\nPage/block: ${item.page}\nWeight: ${item.weight}\nExcerpt: ${item.excerpt}\nNote: ${item.note}\nCreated: ${item.createdAt}`).join("\n\n"), [evidence]);
  const qualityWarningCount = blocks.filter((block) => block.quality < 50).length;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const loaded: SourceDoc[] = [];
    const rejected: string[] = [];
    setStatus(`KONRAN reading ${files.length} file(s)...`);
    for (const file of files) {
      try {
        const lower = file.name.toLowerCase();
        const text = lower.endsWith(".pdf") || file.type === "application/pdf" ? await extractPdfText(file) : await file.text();
        loaded.push({ id: makeId("src"), name: file.name, kind: lower.endsWith(".pdf") ? "PDF extracted text" : file.type || "text file", text, createdAt: nowReceipt() });
      } catch (error) {
        rejected.push(`${file.name}: ${error instanceof Error ? error.message : "could not be read"}`);
      }
    }
    if (loaded.length) setDocs((current) => [...loaded, ...current]);
    setStatus([loaded.length ? `Loaded ${loaded.length} source(s).` : "No sources loaded.", ...rejected].join(" "));
    event.target.value = "";
  }

  function addPaste() {
    if (pasteText.trim().length < 5) { setStatus("Paste source text before adding."); return; }
    setDocs((current) => [{ id: makeId("paste"), name: pasteName.trim() || "Pasted source block", kind: "pasted source text", text: pasteText, createdAt: nowReceipt() }, ...current]);
    setPasteText("");
    setStatus("Pasted source block added to KONRAN index.");
  }

  function capture(block: PageBlock) {
    const duplicate = evidence.some((item) => item.sourceId === block.sourceId && item.page === block.page && item.excerpt.slice(0, 80) === block.text.slice(0, 80));
    setEvidence((current) => [{ id: makeId("ev"), sourceId: block.sourceId, sourceName: block.sourceName, page: block.page, excerpt: block.text, label: `KONRAN ${block.sourceName} p.${block.page}`, note: duplicate ? "Possible duplicate evidence capture. Verify before relying on it." : block.warning, weight: block.quality, createdAt: nowReceipt() }, ...current]);
    setActiveBlockId(block.id);
    setStatus(`Captured evidence anchor: ${block.sourceName} page/block ${block.page}.`);
  }

  function jumpToEvidence(item: EvidenceItem) {
    const block = blocks.find((candidate) => candidate.sourceId === item.sourceId && candidate.page === item.page);
    if (block) { setActiveBlockId(block.id); setStatus(`Jumped to ${item.sourceName} page/block ${item.page}.`); }
  }

  function exportCrosswalk() {
    downloadBlob(crosswalk || "No evidence captured yet.", "konran-evidence-crosswalk.txt", "text/plain");
    setStatus("KONRAN evidence crosswalk exported.");
  }

  function exportWorkspace() {
    downloadBlob(JSON.stringify({ docs, evidence, query }, null, 2), "konran-lite-workspace.json", "application/json");
    setStatus("KONRAN workspace JSON exported.");
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>KONRAN LITE · SOURCE EVIDENCE WORKCELL</div>
          <h1>KONRAN</h1>
          <p>Upload PDF/text, index pages and blocks, search source material, capture evidence anchors, jump back to the source block, and export an evidence crosswalk.</p>
          <div className={styles.boundary}><ShieldCheck size={20} /><span>Evidence organization only. Verify every source against the original record before external use.</span></div>
        </div>
        <div className={styles.statusCard}><Gauge size={24} /><strong>{blocks.length} blocks · {evidence.length} anchors</strong><span>{qualityWarningCount} low-extraction warning(s). {status}</span></div>
      </section>

      <section className={styles.gridTwo}>
        <article className={styles.card}>
          <div className={styles.cardHead}><ScanLine size={20} /><h2>Source intake</h2></div>
          <p className={styles.microcopy}>PDF text extraction runs in the browser. Scanned/image-only PDFs may need OCR first.</p>
          <input type="file" multiple accept=".pdf,.txt,.md,.csv,.json,.html,.xml,application/pdf,text/*" onChange={handleFile} />
          <label><span>Source name</span><input value={pasteName} onChange={(event) => setPasteName(event.target.value)} /></label>
          <label><span>Paste source text / OCR / transcript</span><textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} /></label>
          <button className={styles.primaryButton} onClick={addPaste}>Add source block <ArrowRight size={16} /></button>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}><Network size={20} /><h2>Document ledger</h2></div>
          <div className={styles.auditList}>{docs.map((doc) => <span key={doc.id}>{doc.name} · {doc.kind} · {doc.text.length.toLocaleString()} chars · {doc.createdAt}</span>)}</div>
          <div className={styles.chips}><button className={styles.primaryButton} onClick={exportWorkspace}>Export workspace JSON</button><button className={styles.primaryButton} onClick={() => { setDocs(seedDocs); setEvidence([]); setActiveBlockId(""); setStatus("KONRAN reset to seed data."); }}>Reset</button></div>
        </article>
      </section>

      <section className={styles.gridTwoWide}>
        <article className={styles.card}>
          <div className={styles.cardHead}><FileSearch size={20} /><h2>Search page/block index</h2></div>
          <label><span>Search query</span><input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <div className={styles.evidenceList}>{hits.map((hit) => <button key={hit.id} className={activeBlock?.id === hit.id ? styles.evidenceOn : styles.evidence} onClick={() => setActiveBlockId(hit.id)}><strong>{hit.sourceName} · page/block {hit.page}</strong><span>{hit.text}</span><em>Score {hit.score} · Quality {hit.quality} · {hit.evidenceCount} evidence anchor(s)</em></button>)}</div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}><Workflow size={20} /><h2>Active source viewer</h2></div>
          {activeBlock ? <div className={activeBlock.quality < 50 ? styles.exportLocked : styles.exportReady}><strong>{activeBlock.sourceName} · page/block {activeBlock.page}</strong><p>{activeBlock.warning}</p><p>{activeBlock.text}</p><button className={styles.primaryButton} onClick={() => capture(activeBlock)}>Capture evidence anchor</button></div> : <p className={styles.microcopy}>No source block available.</p>}
        </article>
      </section>

      <section className={styles.gridTwoWide}>
        <article className={styles.card}>
          <div className={styles.cardHead}><Sparkles size={20} /><h2>Evidence crosswalk</h2></div>
          <div className={styles.evidenceList}>{evidence.length === 0 ? <p className={styles.microcopy}>No evidence anchors captured yet.</p> : evidence.map((item) => <button key={item.id} className={styles.evidenceOn} onClick={() => jumpToEvidence(item)}><strong>{item.label}</strong><span>{item.excerpt}</span><em>{item.sourceName} · page/block {item.page} · weight {item.weight} · tap to jump</em></button>)}</div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHead}><CheckCircle2 size={20} /><h2>Export / warnings</h2></div>
          <div className={qualityWarningCount ? styles.exportLocked : styles.exportReady}><strong>{qualityWarningCount ? `${qualityWarningCount} extraction warning(s)` : "Extraction quality acceptable"}</strong><p>Low text volume can mean a scanned/image-only page, bad extraction, or an empty page. Verify before relying on the block.</p></div>
          <button className={styles.primaryButton} onClick={exportCrosswalk}>Export evidence crosswalk TXT</button>
          <button className={styles.primaryButton} onClick={exportWorkspace}>Export KONRAN workspace JSON</button>
          <div className={styles.exportLocked}><strong>Not OCR yet</strong><p>KONRAN Lite extracts embedded PDF text. It does not perform image OCR yet.</p></div>
          <div className={styles.exportLocked}><strong>Not cloud yet</strong><p>This workspace persists in browser storage and JSON export only.</p></div>
        </article>
      </section>
    </main>
  );
}
