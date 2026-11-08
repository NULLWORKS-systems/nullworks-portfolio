"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ViewName = "record" | "library" | "about";

type LocalAccount = {
  id: string;
  name: string;
  salt: string;
  verifier: string;
  createdAt: string;
};

type VaultStory = {
  id: string;
  title: string;
  storyteller: string;
  occasion: string;
  tags: string[];
  transcript: string;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  mimeType: string;
  audio?: Blob;
};

type StoredStory = {
  key: string;
  accountId: string;
  storyId: string;
  payloadIv: string;
  payload: ArrayBuffer;
  audioIv?: string;
  audio?: ArrayBuffer;
  mimeType: string;
  updatedAt: string;
};

type SpeechAlternativeLike = {
  transcript: string;
};

type SpeechResultLike = {
  0: SpeechAlternativeLike;
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
};

const ACCOUNT_KEY = "nullworks-voice-foundry-accounts-v1";
const DB_NAME = "nullworks-voice-foundry-v1";
const DB_STORE = "stories";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const GENERAL_PROMPTS = [
  "What happened next?",
  "Who else was there, and what do you remember about them?",
  "What did the place look, sound, or smell like?",
  "What detail would your family never know unless you told them?",
  "Why does this story still matter to you now?",
  "What did you learn that you would want someone younger to carry forward?",
  "Was there a moment when everything changed?",
  "What part makes you laugh now?",
  "What do people usually get wrong when they tell this story?",
  "How would you finish this chapter in one sentence?",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveVaultKey(pin: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: Uint8Array.from(salt),
      iterations: 160000,
    },
    material,
    256,
  );
  const raw = new Uint8Array(bits);
  const key = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  const verificationInput = new Uint8Array(raw.length + 20);
  verificationInput.set(raw, 0);
  verificationInput.set(encoder.encode("VOICE_FOUNDRY_V1"), raw.length);
  const digest = await crypto.subtle.digest("SHA-256", verificationInput);
  return { key, verifier: bytesToBase64(new Uint8Array(digest)) };
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the story vault."));
  });
}

async function putStoredStory(record: StoredStory) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the story."));
  });
  db.close();
}

async function getStoredStories() {
  const db = await openDb();
  const records = await new Promise<StoredStory[]>((resolve, reject) => {
    const request = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).getAll();
    request.onsuccess = () => resolve(request.result as StoredStory[]);
    request.onerror = () => reject(request.error ?? new Error("Could not read the story vault."));
  });
  db.close();
  return records;
}

async function deleteStoredStory(key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete the story."));
  });
  db.close();
}

async function encryptStory(accountId: string, story: VaultStory, key: CryptoKey): Promise<StoredStory> {
  const payloadIv = crypto.getRandomValues(new Uint8Array(12));
  const payload = {
    ...story,
    audio: undefined,
  };
  const encryptedPayload = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: payloadIv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );

  let audioIv: Uint8Array | undefined;
  let encryptedAudio: ArrayBuffer | undefined;
  if (story.audio) {
    audioIv = crypto.getRandomValues(new Uint8Array(12));
    encryptedAudio = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: audioIv },
      key,
      await story.audio.arrayBuffer(),
    );
  }

  return {
    key: `${accountId}:${story.id}`,
    accountId,
    storyId: story.id,
    payloadIv: bytesToBase64(payloadIv),
    payload: encryptedPayload,
    audioIv: audioIv ? bytesToBase64(audioIv) : undefined,
    audio: encryptedAudio,
    mimeType: story.mimeType,
    updatedAt: story.updatedAt,
  };
}

async function decryptStory(record: StoredStory, key: CryptoKey): Promise<VaultStory> {
  const payload = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(record.payloadIv) },
    key,
    record.payload,
  );
  const story = JSON.parse(decoder.decode(payload)) as VaultStory;
  if (record.audio && record.audioIv) {
    const audio = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(record.audioIv) },
      key,
      record.audio,
    );
    story.audio = new Blob([audio], { type: record.mimeType || "audio/webm" });
  }
  return story;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60).toString().padStart(2, "0");
  const remainder = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function cleanTranscript(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "voice-foundry-story";
}

function buildText(story: VaultStory) {
  return [
    story.title,
    `Storyteller: ${story.storyteller || "Not specified"}`,
    `Recorded: ${formatDate(story.createdAt)}`,
    `Occasion / context: ${story.occasion || "Not specified"}`,
    `Tags: ${story.tags.join(", ") || "None"}`,
    `Duration: ${formatTime(story.durationSeconds)}`,
    "",
    "TRANSCRIPT",
    "",
    story.transcript || "No transcript was captured.",
  ].join("\n");
}

function buildMarkdown(story: VaultStory) {
  return [
    `# ${story.title}`,
    "",
    `- **Storyteller:** ${story.storyteller || "Not specified"}`,
    `- **Recorded:** ${formatDate(story.createdAt)}`,
    `- **Occasion / context:** ${story.occasion || "Not specified"}`,
    `- **Tags:** ${story.tags.join(", ") || "None"}`,
    `- **Duration:** ${formatTime(story.durationSeconds)}`,
    "",
    "## Transcript",
    "",
    story.transcript || "No transcript was captured.",
    "",
    "---",
    "Preserved with NULLWORKS Voice Foundry.",
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pickGuidePrompt(transcript: string, index: number) {
  const normalized = transcript.toLowerCase();
  const words = cleanTranscript(transcript).split(" ").filter(Boolean);
  if (words.length < 12) {
    return "Start wherever it feels natural: what story or idea do you want preserved today?";
  }
  if (!/\b(19|20)\d{2}\b|\b(yesterday|today|years ago|when i was|as a kid|as a child)\b/.test(normalized)) {
    return "About when did this happen? You do not need an exact date.";
  }
  if (!/\b(mom|mother|dad|father|brother|sister|friend|wife|husband|son|daughter|grandma|grandpa|we|they|he|she)\b/.test(normalized)) {
    return "Who was part of this, and how were they connected to you?";
  }
  if (words.length > 260 && words.length % 260 < 70) {
    return "Let us land this chapter: what is the one moment or lesson you most want remembered?";
  }
  return GENERAL_PROMPTS[index % GENERAL_PROMPTS.length];
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (context.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]*$/, "")}…`;
  }
  return lines;
}

export default function VoiceFoundryClient() {
  const [accounts, setAccounts] = useState<LocalAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [activeAccount, setActiveAccount] = useState<LocalAccount | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [pin, setPin] = useState("");
  const [loginMode, setLoginMode] = useState<"unlock" | "create">("create");
  const [loginNotice, setLoginNotice] = useState("Create a private, device-local vault. Your PIN is never stored.");
  const [view, setView] = useState<ViewName>("record");
  const [stories, setStories] = useState<VaultStory[]>([]);
  const [search, setSearch] = useState("");
  const [storyId, setStoryId] = useState(makeId());
  const [title, setTitle] = useState("Untitled story");
  const [storyteller, setStoryteller] = useState("");
  const [occasion, setOccasion] = useState("");
  const [tags, setTags] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>();
  const [audioUrl, setAudioUrl] = useState("");
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [guidePrompt, setGuidePrompt] = useState(GENERAL_PROMPTS[0]);
  const [notice, setNotice] = useState("Ready. Nothing is uploaded by Voice Foundry unless you explicitly share it.");
  const [busy, setBusy] = useState(false);

  const keyRef = useRef<CryptoKey | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingRef = useRef(false);
  const recordingStartedRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ACCOUNT_KEY);
      const parsed = saved ? (JSON.parse(saved) as LocalAccount[]) : [];
      setAccounts(parsed);
      if (parsed.length > 0) {
        setLoginMode("unlock");
        setSelectedAccountId(parsed[0].id);
      }
    } catch {
      window.localStorage.removeItem(ACCOUNT_KEY);
    }

    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    setSpeechSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(audioBlob);
    setAudioUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [audioBlob]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - recordingStartedRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    const wordCount = cleanTranscript(transcript).split(" ").filter(Boolean).length;
    if (wordCount === 0 || wordCount % 90 > 4) return;
    setGuidePrompt(pickGuidePrompt(transcript, guideIndex));
  }, [transcript, guideIndex]);

  const wordCount = useMemo(
    () => cleanTranscript(transcript).split(" ").filter(Boolean).length,
    [transcript],
  );

  const filteredStories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return stories;
    return stories.filter((story) =>
      [story.title, story.storyteller, story.occasion, story.tags.join(" "), story.transcript]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, stories]);

  function persistAccounts(nextAccounts: LocalAccount[]) {
    setAccounts(nextAccounts);
    window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccounts));
  }

  async function loadStories(account: LocalAccount, key: CryptoKey) {
    const records = (await getStoredStories()).filter((record) => record.accountId === account.id);
    const decrypted: VaultStory[] = [];
    for (const record of records) {
      try {
        decrypted.push(await decryptStory(record, key));
      } catch {
        // Keep one damaged record from blocking the rest of the vault.
      }
    }
    decrypted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setStories(decrypted);
  }

  async function createAccount() {
    const accountName = newAccountName.trim();
    if (!accountName) {
      setLoginNotice("Give this vault a name, such as Jeff, Dad, Family Stories, or Work Notes.");
      return;
    }
    if (pin.length < 4) {
      setLoginNotice("Use a PIN or passphrase with at least four characters.");
      return;
    }
    setBusy(true);
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const derived = await deriveVaultKey(pin, salt);
      const account: LocalAccount = {
        id: makeId(),
        name: accountName,
        salt: bytesToBase64(salt),
        verifier: derived.verifier,
        createdAt: new Date().toISOString(),
      };
      const nextAccounts = [...accounts, account];
      persistAccounts(nextAccounts);
      keyRef.current = derived.key;
      setActiveAccount(account);
      setSelectedAccountId(account.id);
      setPin("");
      setStories([]);
      setStoryteller(account.name);
      setNotice("Private vault created on this device. Record the first story when ready.");
    } catch {
      setLoginNotice("This browser could not create the encrypted vault.");
    } finally {
      setBusy(false);
    }
  }

  async function unlockAccount() {
    const account = accounts.find((item) => item.id === selectedAccountId);
    if (!account) {
      setLoginNotice("Choose a vault first.");
      return;
    }
    if (!pin) {
      setLoginNotice("Enter the vault PIN or passphrase.");
      return;
    }
    setBusy(true);
    try {
      const derived = await deriveVaultKey(pin, base64ToBytes(account.salt));
      if (derived.verifier !== account.verifier) {
        setLoginNotice("That PIN did not unlock this vault.");
        return;
      }
      keyRef.current = derived.key;
      setActiveAccount(account);
      setPin("");
      setStoryteller(account.name);
      await loadStories(account, derived.key);
      setNotice("Vault unlocked. Audio and transcripts remain encrypted on this device until opened.");
    } catch {
      setLoginNotice("The vault could not be unlocked in this browser.");
    } finally {
      setBusy(false);
    }
  }

  function resetStory() {
    setStoryId(makeId());
    setTitle("Untitled story");
    setStoryteller(activeAccount?.name ?? "");
    setOccasion("");
    setTags("");
    setTranscript("");
    setInterimTranscript("");
    setAudioBlob(undefined);
    setCreatedAt(new Date().toISOString());
    setDurationSeconds(0);
    setGuideIndex(0);
    setGuidePrompt("Start wherever it feels natural: what story or idea do you want preserved today?");
    setNotice("New blank recording ready.");
    setView("record");
  }

  function storyFromEditor(): VaultStory {
    const existing = stories.find((story) => story.id === storyId);
    return {
      id: storyId,
      title: title.trim() || "Untitled story",
      storyteller: storyteller.trim(),
      occasion: occasion.trim(),
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      transcript: cleanTranscript(transcript),
      createdAt: existing?.createdAt ?? createdAt,
      updatedAt: new Date().toISOString(),
      durationSeconds,
      mimeType: audioBlob?.type || existing?.mimeType || "audio/webm",
      audio: audioBlob,
    };
  }

  async function saveStory() {
    if (!activeAccount || !keyRef.current) return;
    if (!audioBlob && !transcript.trim()) {
      setNotice("Record audio or add a transcript before saving.");
      return;
    }
    setBusy(true);
    try {
      const story = storyFromEditor();
      const record = await encryptStory(activeAccount.id, story, keyRef.current);
      await putStoredStory(record);
      setStories((current) => {
        const withoutCurrent = current.filter((item) => item.id !== story.id);
        return [story, ...withoutCurrent].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setTitle(story.title);
      setNotice("Saved inside the encrypted local vault.");
    } catch {
      setNotice("Save failed. Keep this page open and export a copy before leaving.");
    } finally {
      setBusy(false);
    }
  }

  function startSpeechRecognition() {
    if (!speechSupported) return;
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalized = "";
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalized += ` ${text}`;
        else interim += ` ${text}`;
      }
      if (finalized.trim()) {
        setTranscript((current) => cleanTranscript(`${current} ${finalized}`));
      }
      setInterimTranscript(cleanTranscript(interim));
    };
    recognition.onerror = (event) => {
      if (!["aborted", "no-speech"].includes(event.error)) {
        setNotice(`Live transcription paused (${event.error}). Audio recording is still preserved.`);
      }
    };
    recognition.onend = () => {
      if (!recordingRef.current) return;
      window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          // Mobile browsers can briefly reject a restart while the prior session closes.
        }
      }, 250);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setNotice("Audio recording started, but live transcription could not start. You can type or paste it later.");
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("This browser does not expose microphone recording. Try current Chrome, Edge, or Safari.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const preferred = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "";
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setNotice("Recording stopped. Review the transcript, add a title, then save it to the vault.");
      };
      recordingRef.current = true;
      recordingStartedRef.current = Date.now();
      setDurationSeconds(0);
      setInterimTranscript("");
      recorder.start(1000);
      setRecording(true);
      startSpeechRecognition();
      setNotice(
        speechSupported
          ? "Recording and live transcription are running. Speak naturally."
          : "Recording audio. Live browser transcription is unavailable here, but the transcript remains editable.",
      );
    } catch {
      setNotice("Microphone permission was not granted. Allow microphone access and try again.");
    }
  }

  function stopRecording() {
    recordingRef.current = false;
    setRecording(false);
    setInterimTranscript("");
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
    }
    recognitionRef.current = null;
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    mediaRecorderRef.current = null;
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else void startRecording();
  }

  function refreshGuide() {
    const nextIndex = guideIndex + 1;
    setGuideIndex(nextIndex);
    setGuidePrompt(pickGuidePrompt(transcript, nextIndex));
  }

  function speakGuide() {
    if (!("speechSynthesis" in window)) {
      setNotice("Read-aloud guidance is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(guidePrompt);
    utterance.rate = 0.94;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function openStory(story: VaultStory) {
    setStoryId(story.id);
    setTitle(story.title);
    setStoryteller(story.storyteller);
    setOccasion(story.occasion);
    setTags(story.tags.join(", "));
    setTranscript(story.transcript);
    setInterimTranscript("");
    setAudioBlob(story.audio);
    setCreatedAt(story.createdAt);
    setDurationSeconds(story.durationSeconds);
    setGuidePrompt(pickGuidePrompt(story.transcript, 0));
    setView("record");
    setNotice("Story opened from the private vault.");
  }

  async function removeStory(story: VaultStory) {
    if (!activeAccount) return;
    const approved = window.confirm(`Delete “${story.title}” from this device? This cannot be undone.`);
    if (!approved) return;
    await deleteStoredStory(`${activeAccount.id}:${story.id}`);
    setStories((current) => current.filter((item) => item.id !== story.id));
    if (story.id === storyId) resetStory();
  }

  function exportStory(format: "txt" | "md" | "json") {
    const story = storyFromEditor();
    const filename = safeFilename(story.title);
    if (format === "json") {
      const exportable = { ...story, audio: undefined };
      downloadBlob(new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" }), `${filename}.json`);
      return;
    }
    const body = format === "md" ? buildMarkdown(story) : buildText(story);
    const mime = format === "md" ? "text/markdown" : "text/plain";
    downloadBlob(new Blob([body], { type: `${mime};charset=utf-8` }), `${filename}.${format}`);
  }

  function printStory() {
    const story = storyFromEditor();
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setNotice("The print window was blocked. Allow pop-ups, then try Save PDF again.");
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(story.title)}</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:50px auto;padding:0 24px;line-height:1.65;color:#171717}h1{font-size:38px;line-height:1.05}.meta{color:#666;border-bottom:1px solid #ddd;padding-bottom:22px;margin-bottom:28px}.transcript{white-space:pre-wrap;font-size:17px}</style></head><body><h1>${escapeHtml(story.title)}</h1><div class="meta"><b>Storyteller:</b> ${escapeHtml(story.storyteller || "Not specified")}<br><b>Recorded:</b> ${escapeHtml(formatDate(story.createdAt))}<br><b>Context:</b> ${escapeHtml(story.occasion || "Not specified")}<br><b>Tags:</b> ${escapeHtml(story.tags.join(", ") || "None")}</div><div class="transcript">${escapeHtml(story.transcript || "No transcript was captured.")}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 300);
  }

  async function shareStory() {
    const story = storyFromEditor();
    const filename = safeFilename(story.title);
    const transcriptFile = new File([buildText(story)], `${filename}.txt`, { type: "text/plain" });
    const files = [transcriptFile];
    if (story.audio) {
      const extension = story.audio.type.includes("mp4") ? "m4a" : "webm";
      files.push(new File([story.audio], `${filename}.${extension}`, { type: story.audio.type || "audio/webm" }));
    }
    const nav = navigator as ShareNavigator;
    const shareData: ShareData = {
      title: story.title,
      text: `${story.title} — preserved with Voice Foundry`,
      files,
    };
    try {
      if (navigator.share && (!nav.canShare || nav.canShare(shareData))) {
        await navigator.share(shareData);
        setNotice("Share sheet opened. Choose Messages, Gmail, Drive, Facebook, or another installed app.");
      } else {
        const subject = encodeURIComponent(story.title);
        const body = encodeURIComponent(`${buildText(story).slice(0, 1800)}\n\nAudio can be shared from the Voice Foundry export controls.`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("Sharing was not available. Download the transcript or audio and attach it manually.");
    }
  }

  async function createSocialCard() {
    const story = storyFromEditor();
    const textarea = textareaRef.current;
    const selection = textarea && textarea.selectionEnd > textarea.selectionStart
      ? textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
      : story.transcript.slice(0, 420);
    const quote = cleanTranscript(selection);
    if (!quote) {
      setNotice("Select a favorite line in the transcript, or add transcript text first.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, "#090c10");
    gradient.addColorStop(1, "#1a232d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1080);
    context.strokeStyle = "#e0bd74";
    context.lineWidth = 8;
    context.strokeRect(48, 48, 984, 984);
    context.fillStyle = "#e0bd74";
    context.font = "700 32px system-ui, sans-serif";
    context.fillText("VOICE FOUNDRY / NULLWORKS", 96, 128);
    context.fillStyle = "#f5f2eb";
    context.font = "700 56px system-ui, sans-serif";
    const lines = wrapCanvasText(context, `“${quote}”`, 870, 9);
    const lineHeight = 76;
    const blockHeight = lines.length * lineHeight;
    let y = Math.max(260, 540 - blockHeight / 2);
    for (const line of lines) {
      context.fillText(line, 96, y);
      y += lineHeight;
    }
    context.fillStyle = "#aab3bd";
    context.font = "500 30px system-ui, sans-serif";
    context.fillText(story.storyteller ? `— ${story.storyteller}` : `— ${story.title}`, 96, 928);
    context.font = "500 24px system-ui, sans-serif";
    context.fillText(story.title, 96, 978);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], `${safeFilename(story.title)}-story-card.png`, { type: "image/png" });
    const nav = navigator as ShareNavigator;
    const shareData: ShareData = {
      title: story.title,
      text: `A preserved story from ${story.storyteller || "Voice Foundry"}`,
      files: [file],
    };
    try {
      if (navigator.share && (!nav.canShare || nav.canShare(shareData))) {
        await navigator.share(shareData);
      } else {
        downloadBlob(blob, file.name);
        setNotice("Social story card downloaded. Post it to Instagram, Facebook, or another platform.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      downloadBlob(blob, file.name);
      setNotice("Social card downloaded because direct sharing was unavailable.");
    }
  }

  async function copyTranscript() {
    try {
      await navigator.clipboard.writeText(buildText(storyFromEditor()));
      setNotice("Transcript copied.");
    } catch {
      setNotice("Clipboard access was blocked. Use TXT export instead.");
    }
  }

  function downloadAudio() {
    if (!audioBlob) {
      setNotice("Record or open an audio story first.");
      return;
    }
    const extension = audioBlob.type.includes("mp4") ? "m4a" : "webm";
    downloadBlob(audioBlob, `${safeFilename(title)}.${extension}`);
  }

  function lockVault() {
    if (recording) stopRecording();
    keyRef.current = null;
    setActiveAccount(null);
    setStories([]);
    setAudioBlob(undefined);
    setTranscript("");
    setPin("");
    setLoginMode(accounts.length ? "unlock" : "create");
    setLoginNotice("Vault locked. Enter the PIN to decrypt it again.");
  }

  async function deleteActiveAccount() {
    if (!activeAccount) return;
    const approved = window.confirm(
      `Delete the local vault “${activeAccount.name}” and every story inside it? Export anything important first.`,
    );
    if (!approved) return;
    const records = (await getStoredStories()).filter((record) => record.accountId === activeAccount.id);
    for (const record of records) await deleteStoredStory(record.key);
    const nextAccounts = accounts.filter((account) => account.id !== activeAccount.id);
    persistAccounts(nextAccounts);
    keyRef.current = null;
    setActiveAccount(null);
    setStories([]);
    setSelectedAccountId(nextAccounts[0]?.id ?? "");
    setLoginMode(nextAccounts.length ? "unlock" : "create");
    setLoginNotice("The local vault and its encrypted stories were deleted from this browser.");
  }

  if (!activeAccount) {
    return (
      <main className="vf-shell vf-login">
        <section className="vf-login-card">
          <p className="vf-eyebrow">NULLWORKS OI MEMORY PLATFORM</p>
          <h1>VOICE <span>FOUNDRY</span></h1>
          <p className="vf-lede">
            Record the stories, hard-won knowledge, work context, and ordinary human moments that usually disappear.
            Keep the original voice. Keep the searchable words. Pass both forward.
          </p>

          {accounts.length > 0 && loginMode === "unlock" ? (
            <div className="vf-login-form">
              <div className="vf-field">
                <label htmlFor="vault-select">Private vault</label>
                <select
                  id="vault-select"
                  className="vf-select"
                  value={selectedAccountId}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
              <div className="vf-field">
                <label htmlFor="vault-pin">PIN or passphrase</label>
                <input
                  id="vault-pin"
                  className="vf-input"
                  type="password"
                  autoComplete="current-password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void unlockAccount();
                  }}
                  placeholder="Unlock this device-local vault"
                />
              </div>
              <button className="vf-btn vf-btn-primary" type="button" onClick={() => void unlockAccount()} disabled={busy}>
                {busy ? "Unlocking…" : "Unlock vault"}
              </button>
              <button className="vf-btn vf-btn-quiet" type="button" onClick={() => { setLoginMode("create"); setPin(""); }}>
                Create another vault
              </button>
            </div>
          ) : (
            <div className="vf-login-form">
              <div className="vf-login-row">
                <div className="vf-field">
                  <label htmlFor="new-vault-name">Vault name</label>
                  <input
                    id="new-vault-name"
                    className="vf-input"
                    value={newAccountName}
                    onChange={(event) => setNewAccountName(event.target.value)}
                    placeholder="Jeff, Dad, Family Stories…"
                  />
                </div>
                <div className="vf-field">
                  <label htmlFor="new-vault-pin">PIN or passphrase</label>
                  <input
                    id="new-vault-pin"
                    className="vf-input"
                    type="password"
                    autoComplete="new-password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void createAccount();
                    }}
                    placeholder="At least 4 characters"
                  />
                </div>
              </div>
              <button className="vf-btn vf-btn-primary" type="button" onClick={() => void createAccount()} disabled={busy}>
                {busy ? "Creating…" : "Create private vault"}
              </button>
              {accounts.length > 0 && (
                <button className="vf-btn vf-btn-quiet" type="button" onClick={() => { setLoginMode("unlock"); setPin(""); }}>
                  Back to existing vaults
                </button>
              )}
            </div>
          )}

          <div className="vf-notice" role="status">{loginNotice}</div>
          <p className="vf-footer">
            This test version uses encrypted storage inside this browser. It does not create a cloud account or recover a forgotten PIN.
            Browser speech transcription may use the browser vendor’s speech service; the saved Voice Foundry vault itself remains local until you share or export.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="vf-shell">
      <header className="vf-topbar">
        <div className="vf-wrap vf-topbar-inner">
          <div className="vf-brand">
            <div className="vf-mark">VF</div>
            <div className="vf-brand-copy">
              <strong>VOICE FOUNDRY</strong>
              <span>{activeAccount.name} · encrypted local vault</span>
            </div>
          </div>
          <nav className="vf-nav" aria-label="Voice Foundry views">
            <button className={`vf-tab ${view === "record" ? "vf-tab-active" : ""}`} onClick={() => setView("record")}>Record</button>
            <button className={`vf-tab ${view === "library" ? "vf-tab-active" : ""}`} onClick={() => setView("library")}>Library ({stories.length})</button>
            <button className={`vf-tab ${view === "about" ? "vf-tab-active" : ""}`} onClick={() => setView("about")}>How it works</button>
            <button className="vf-btn vf-btn-quiet" onClick={lockVault}>Lock</button>
          </nav>
        </div>
      </header>

      <div className="vf-wrap vf-main">
        {view === "record" && (
          <>
            <section className="vf-hero">
              <div className="vf-hero-copy">
                <p className="vf-eyebrow">AUDIO MEMORY + WORK CONTEXT BINDER</p>
                <h1>KEEP THE <span>VOICE.</span></h1>
                <p className="vf-lede">
                  Speak like a regular human. Voice Foundry records the original audio, builds an editable live transcript,
                  and packages both into a private story you can replay, search, download, email, or share.
                </p>
              </div>
              <aside className="vf-hero-card">
                <div className="vf-stat-grid">
                  <div className="vf-stat"><strong>{stories.length}</strong><span>saved stories in this vault</span></div>
                  <div className="vf-stat"><strong>{wordCount}</strong><span>words in the open transcript</span></div>
                  <div className="vf-stat"><strong>{formatTime(durationSeconds)}</strong><span>audio duration</span></div>
                  <div className="vf-stat"><strong>{speechSupported ? "LIVE" : "EDIT"}</strong><span>{speechSupported ? "browser transcription available" : "manual transcript mode"}</span></div>
                </div>
                <div className="vf-local-note">
                  Saved content is encrypted inside this browser. Sharing and exporting happen only when you press the corresponding control.
                </div>
              </aside>
            </section>

            <div className="vf-grid">
              <section className="vf-panel">
                <div className="vf-panel-head">
                  <div>
                    <h2>Story workspace</h2>
                    <p>Record first. Clean it up later. The human voice remains the source.</p>
                  </div>
                  <button className="vf-btn vf-btn-quiet" type="button" onClick={resetStory} disabled={recording}>New story</button>
                </div>
                <div className="vf-panel-body">
                  <div className="vf-form-grid">
                    <div className="vf-field">
                      <label htmlFor="story-title">Story title</label>
                      <input id="story-title" className="vf-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Grandpa tells the bulldozer story" />
                    </div>
                    <div className="vf-field">
                      <label htmlFor="storyteller">Storyteller</label>
                      <input id="storyteller" className="vf-input" value={storyteller} onChange={(event) => setStoryteller(event.target.value)} placeholder="Name" />
                    </div>
                    <div className="vf-field vf-field-wide">
                      <label htmlFor="occasion">What is this about?</label>
                      <input id="occasion" className="vf-input" value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="Family memory, work lesson, life story, idea, oral history…" />
                    </div>
                    <div className="vf-field vf-field-wide">
                      <label htmlFor="tags">Tags, separated by commas</label>
                      <input id="tags" className="vf-input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="family, Maine, quarry, 1978" />
                    </div>
                  </div>

                  <div className="vf-recorder">
                    <div className="vf-recorder-top">
                      <button
                        className={`vf-record-button ${recording ? "vf-recording" : ""}`}
                        type="button"
                        onClick={toggleRecording}
                        aria-label={recording ? "Stop recording" : "Start recording"}
                      >
                        {recording ? "STOP" : "RECORD"}
                      </button>
                      <div className="vf-recorder-copy">
                        <div className="vf-timer">{formatTime(durationSeconds)}</div>
                        <p>
                          {recording
                            ? "Microphone is live. Press STOP when this chapter is finished."
                            : audioBlob
                              ? "Audio captured. Replay it below, edit the transcript, then save."
                              : "Tap once and start talking. No special commands required."}
                        </p>
                      </div>
                    </div>
                    <div className="vf-live-text" aria-live="polite">
                      {interimTranscript ? interimTranscript : recording ? <em>Listening for the next words…</em> : <em>Live words will appear here while you speak.</em>}
                    </div>
                    {audioUrl && <audio className="vf-audio" controls preload="metadata" src={audioUrl} />}
                  </div>

                  <div className="vf-field" style={{ marginTop: 20 }}>
                    <label htmlFor="transcript">Editable transcript</label>
                    <textarea
                      id="transcript"
                      ref={textareaRef}
                      className="vf-textarea"
                      value={transcript}
                      onChange={(event) => setTranscript(event.target.value)}
                      placeholder="The transcript appears here. You can also type, paste, correct names, or add missing context."
                    />
                  </div>

                  <div className="vf-actions">
                    <button className="vf-btn vf-btn-primary" type="button" onClick={() => void saveStory()} disabled={busy || recording}>{busy ? "Saving…" : "Save to vault"}</button>
                    <button className="vf-btn" type="button" onClick={() => void shareStory()} disabled={recording}>Share story</button>
                    <button className="vf-btn" type="button" onClick={() => void createSocialCard()} disabled={recording}>Social quote card</button>
                    <button className="vf-btn" type="button" onClick={downloadAudio} disabled={!audioBlob}>Download audio</button>
                    <button className="vf-btn" type="button" onClick={() => exportStory("txt")}>TXT</button>
                    <button className="vf-btn" type="button" onClick={() => exportStory("md")}>Markdown</button>
                    <button className="vf-btn" type="button" onClick={() => exportStory("json")}>JSON</button>
                    <button className="vf-btn" type="button" onClick={printStory}>Save PDF</button>
                    <button className="vf-btn" type="button" onClick={() => void copyTranscript()}>Copy</button>
                  </div>
                  <div className="vf-notice" role="status">{notice}</div>
                </div>
              </section>

              <aside className="vf-guide">
                <section className="vf-panel">
                  <div className="vf-panel-head">
                    <div>
                      <h2>Gentle story guide</h2>
                      <p>Optional prompts, not an interrogation.</p>
                    </div>
                  </div>
                  <div className="vf-panel-body">
                    <div className="vf-prompt-card">
                      <small>Try asking</small>
                      <blockquote>{guidePrompt}</blockquote>
                      <div className="vf-prompt-tools">
                        <button className="vf-btn" type="button" onClick={refreshGuide}>Another question</button>
                        <button className="vf-btn" type="button" onClick={speakGuide}>Ask aloud</button>
                      </div>
                    </div>
                    <div className="vf-checklist">
                      <div className="vf-check"><b>WHO</b><span>Name the people so future listeners know the relationships.</span></div>
                      <div className="vf-check"><b>WHEN</b><span>An approximate year, age, season, or life chapter is enough.</span></div>
                      <div className="vf-check"><b>WHY</b><span>Finish with what changed, what was learned, or why it matters.</span></div>
                      <div className="vf-check"><b>FOCUS</b><span>When a story gets wide, land one chapter before opening the next.</span></div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}

        {view === "library" && (
          <section className="vf-panel">
            <div className="vf-panel-head">
              <div>
                <h2>Private story library</h2>
                <p>Search titles, names, tags, context, and transcript text.</p>
              </div>
              <button className="vf-btn vf-btn-primary" type="button" onClick={resetStory}>Record another</button>
            </div>
            <div className="vf-panel-body">
              <div className="vf-library-tools">
                <input className="vf-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this vault…" />
              </div>
              <div className="vf-story-list">
                {filteredStories.length === 0 ? (
                  <div className="vf-empty">No matching stories yet. Record the first one or try a different search.</div>
                ) : filteredStories.map((story) => (
                  <article className="vf-story-card" key={story.id}>
                    <div className="vf-story-top">
                      <div>
                        <h3>{story.title}</h3>
                        <p>{story.transcript ? `${story.transcript.slice(0, 220)}${story.transcript.length > 220 ? "…" : ""}` : "Audio preserved without a transcript."}</p>
                      </div>
                      <span className="vf-chip">{formatTime(story.durationSeconds)}</span>
                    </div>
                    <div className="vf-meta-row">
                      <span className="vf-chip">{story.storyteller || "Unknown storyteller"}</span>
                      <span className="vf-chip">{formatDate(story.updatedAt)}</span>
                      {story.audio && <span className="vf-chip">Audio saved</span>}
                      {story.tags.slice(0, 4).map((tag) => <span className="vf-chip" key={tag}>{tag}</span>)}
                    </div>
                    <div className="vf-actions">
                      <button className="vf-btn vf-btn-primary" type="button" onClick={() => openStory(story)}>Open</button>
                      <button className="vf-btn" type="button" onClick={() => downloadBlob(new Blob([buildText(story)], { type: "text/plain" }), `${safeFilename(story.title)}.txt`)}>Export TXT</button>
                      {story.audio && <button className="vf-btn" type="button" onClick={() => downloadBlob(story.audio as Blob, `${safeFilename(story.title)}.webm`)}>Audio</button>}
                      <button className="vf-btn vf-btn-danger" type="button" onClick={() => void removeStory(story)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === "about" && (
          <div className="vf-grid">
            <section className="vf-panel">
              <div className="vf-panel-head"><div><h2>What this test drive already does</h2><p>Working browser-native functions, not a static mockup.</p></div></div>
              <div className="vf-panel-body">
                <div className="vf-checklist">
                  <div className="vf-check"><b>RECORD</b><span>Captures microphone audio with the browser MediaRecorder API.</span></div>
                  <div className="vf-check"><b>TRANSCRIBE</b><span>Uses live browser speech recognition when the device supports it, while keeping the transcript editable.</span></div>
                  <div className="vf-check"><b>PRESERVE</b><span>Encrypts story metadata, transcript, and audio with a key derived from the vault PIN, then stores it in IndexedDB.</span></div>
                  <div className="vf-check"><b>REPLAY</b><span>Opens saved stories later on this same browser and restores the original audio and words.</span></div>
                  <div className="vf-check"><b>EXPORT</b><span>Downloads audio, plain text, Markdown, JSON, or a print-ready PDF.</span></div>
                  <div className="vf-check"><b>SHARE</b><span>Uses the phone share sheet for audio plus transcript, and makes square quote cards for social apps.</span></div>
                  <div className="vf-check"><b>GUIDE</b><span>Offers optional spoken follow-up questions and focus cues without taking control of the story.</span></div>
                </div>
              </div>
            </section>
            <aside className="vf-panel">
              <div className="vf-panel-head"><div><h2>Current privacy boundary</h2><p>Important before family use.</p></div></div>
              <div className="vf-panel-body">
                <div className="vf-local-note">
                  This deployed test version is intentionally device-local. It has no NULLWORKS cloud database, no administrator access,
                  no password recovery, and no cross-device synchronization. Clearing browser site data deletes the local vault.
                </div>
                <div className="vf-notice">
                  Live speech recognition is supplied by the browser and may send speech to that browser vendor for transcription.
                  Voice Foundry does not separately upload the saved vault. For sensitive material, users can record audio with transcription off and type notes manually.
                </div>
                <div className="vf-danger-zone">
                  <button className="vf-btn vf-btn-danger" type="button" onClick={() => void deleteActiveAccount()}>Delete this local vault</button>
                </div>
              </div>
            </aside>
          </div>
        )}

        <footer className="vf-footer">
          NULLWORKS Voice Foundry · Human Authority remains final · Preserve the source audio, the editable words, and the context around both.
        </footer>
      </div>
    </main>
  );
}
