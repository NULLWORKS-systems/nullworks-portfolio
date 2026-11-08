"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import OscilloscopeBackdrop from "./OscilloscopeBackdrop";
import styles from "./stewart-room.module.css";

type Phase = "gate" | "joining" | "live" | "ended" | "error";
type AiState = "offline" | "connecting" | "live" | "error";
type RoomRole = "coordinator" | "participant" | null;

type TranscriptEntry = {
  id: string;
  speaker: string;
  text: string;
  at: string;
};

type RosterEntry = {
  id: string;
  name: string;
  coordinator?: boolean;
  listenOnly?: boolean;
};

const ROOM_SLUG = "stewart-field-scope-20260802";
const COORDINATOR_PEER_ID = `nw-stewart-${ROOM_SLUG}`.slice(0, 60);
const MAX_HUMANS = 5;

let peerScriptPromise: Promise<any> | null = null;

function peerConstructor(): any {
  return (window as unknown as { Peer?: any }).Peer;
}

function loadPeerJs(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser unavailable."));
  const existingConstructor = peerConstructor();
  if (existingConstructor) return Promise.resolve(existingConstructor);
  if (peerScriptPromise) return peerScriptPromise;

  peerScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-nullworks-peerjs]");
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.nullworksPeerjs = "1";
      document.head.appendChild(script);
    }

    const finish = () => {
      const constructor = peerConstructor();
      if (constructor) resolve(constructor);
      else reject(new Error("Room signaling loaded without a browser client."));
    };

    if (peerConstructor()) finish();
    else {
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", () => reject(new Error("Could not load room signaling.")), { once: true });
    }
  });

  return peerScriptPromise;
}

function randomHex(bytes = 12): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

function cleanName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9 .'-]/g, "").trim();
  return cleaned.slice(0, 32) || "Guest";
}

function timeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "Microphone permission was denied.";
  if (error instanceof Error) return error.message;
  return "An unknown room error occurred.";
}

function waitForPeerOpen(peer: any, timeoutMs = 12000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Room signaling timed out.")), timeoutMs);
    peer.on("open", () => {
      window.clearTimeout(timer);
      resolve();
    });
    peer.on("error", (error: unknown) => {
      window.clearTimeout(timer);
      reject(error instanceof Error ? error : new Error("Room signaling failed."));
    });
  });
}

function waitForDataOpen(connection: any, timeoutMs = 12000): Promise<void> {
  if (connection.open) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("The active room did not answer in time.")), timeoutMs);
    connection.on("open", () => {
      window.clearTimeout(timer);
      resolve();
    });
    connection.on("error", () => {
      window.clearTimeout(timer);
      reject(new Error("The room data channel failed."));
    });
  });
}

function waitForIce(pc: RTCPeerConnection, timeoutMs = 3500): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, timeoutMs);
    const listener = () => {
      if (pc.iceGatheringState === "complete") {
        window.clearTimeout(timer);
        pc.removeEventListener("icegatheringstatechange", listener);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", listener);
  });
}

async function claimRoom(PeerClass: any): Promise<{ peer: any; role: Exclude<RoomRole, null> }> {
  return new Promise((resolve, reject) => {
    const candidate = new PeerClass(COORDINATOR_PEER_ID);
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      try { candidate.destroy(); } catch { /* no-op */ }
      reject(new Error("Could not determine whether the room is open."));
    }, 12000);

    candidate.on("open", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({ peer: candidate, role: "coordinator" });
    });

    candidate.on("error", (error: any) => {
      if (settled) return;
      const type = String(error?.type || "");
      const message = String(error?.message || "").toLowerCase();
      if (type === "unavailable-id" || message.includes("taken") || message.includes("unavailable")) {
        settled = true;
        window.clearTimeout(timer);
        try { candidate.destroy(); } catch { /* no-op */ }
        const participant = new PeerClass(`nw-stewart-p-${randomHex(10)}`.slice(0, 60));
        waitForPeerOpen(participant)
          .then(() => resolve({ peer: participant, role: "participant" }))
          .catch(reject);
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      reject(error instanceof Error ? error : new Error("Room signaling failed."));
    });
  });
}

export default function StewartRoomClient() {
  const [phase, setPhase] = useState<Phase>("gate");
  const [accessGranted, setAccessGranted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [name, setName] = useState("Jeff");
  const [pin, setPin] = useState("");
  const [listenOnly, setListenOnly] = useState(false);
  const [role, setRole] = useState<RoomRole>(null);
  const [status, setStatus] = useState("Enter the private field-scope PIN.");
  const [errorText, setErrorText] = useState("");
  const [aiState, setAiState] = useState<AiState>("offline");
  const [muted, setMuted] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const coordinatorDataRef = useRef<any>(null);
  const coordinatorCallRef = useRef<any>(null);
  const dataConnectionsRef = useRef<Map<string, any>>(new Map());
  const mediaCallsRef = useRef<Map<string, any>>(new Map());
  const participantNamesRef = useRef(new Map<string, { name: string; listenOnly: boolean }>());
  const participantSourcesRef = useRef(new Map<string, MediaStreamAudioSourceNode>());
  const participantDestinationsRef = useRef(new Map<string, MediaStreamAudioDestinationNode>());
  const participantAudioRef = useRef(new Map<string, HTMLAudioElement>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const aiMixRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const realtimePcRef = useRef<RTCPeerConnection | null>(null);
  const realtimeDataRef = useRef<RTCDataChannel | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const coordinatorNameRef = useRef("Jeff");
  const coordinatorListenOnlyRef = useRef(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const aiStateRef = useRef<AiState>("offline");

  const broadcast = useCallback((payload: unknown) => {
    for (const connection of dataConnectionsRef.current.values()) {
      if (!connection?.open) continue;
      try { connection.send(payload); } catch (error) { console.error("Stewart room broadcast failed", error); }
    }
  }, []);

  const setAi = useCallback((next: AiState) => {
    aiStateRef.current = next;
    setAiState(next);
  }, []);

  const addTranscript = useCallback((speaker: string, text: string, relay = true) => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    const entry: TranscriptEntry = {
      id: `${Date.now()}-${randomHex(3)}`,
      speaker,
      text: cleaned,
      at: timeLabel(),
    };
    const next = [...transcriptRef.current.slice(-119), entry];
    transcriptRef.current = next;
    setTranscript(next);
    if (relay) broadcast({ type: "transcript", entry });
  }, [broadcast]);

  const publishRoster = useCallback(() => {
    const entries: RosterEntry[] = [{
      id: COORDINATOR_PEER_ID,
      name: coordinatorNameRef.current,
      coordinator: true,
      listenOnly: coordinatorListenOnlyRef.current,
    }];
    for (const [id, participant] of participantNamesRef.current.entries()) {
      entries.push({ id, name: participant.name, listenOnly: participant.listenOnly });
    }
    setRoster(entries);
    broadcast({ type: "roster", entries });
  }, [broadcast]);

  const rebuildMixes = useCallback(() => {
    const aiMix = aiMixRef.current;
    const destinations = participantDestinationsRef.current;

    try { localSourceRef.current?.disconnect(); } catch { /* no-op */ }
    if (localSourceRef.current) {
      if (aiMix) localSourceRef.current.connect(aiMix);
      for (const destination of destinations.values()) localSourceRef.current.connect(destination);
    }

    for (const [sourceId, source] of participantSourcesRef.current.entries()) {
      try { source.disconnect(); } catch { /* no-op */ }
      if (aiMix) source.connect(aiMix);
      for (const [destinationId, destination] of destinations.entries()) {
        if (destinationId !== sourceId) source.connect(destination);
      }
    }

    try { aiSourceRef.current?.disconnect(); } catch { /* no-op */ }
    if (aiSourceRef.current) {
      for (const destination of destinations.values()) aiSourceRef.current.connect(destination);
    }
  }, []);

  const teardown = useCallback((nextPhase: Phase = "ended") => {
    try { realtimeDataRef.current?.close(); } catch { /* no-op */ }
    try { realtimePcRef.current?.close(); } catch { /* no-op */ }
    try { coordinatorCallRef.current?.close(); } catch { /* no-op */ }
    try { coordinatorDataRef.current?.close(); } catch { /* no-op */ }
    for (const call of mediaCallsRef.current.values()) {
      try { call.close(); } catch { /* no-op */ }
    }
    for (const connection of dataConnectionsRef.current.values()) {
      try { connection.close(); } catch { /* no-op */ }
    }
    try { peerRef.current?.destroy(); } catch { /* no-op */ }

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    try { localSourceRef.current?.disconnect(); } catch { /* no-op */ }
    try { aiSourceRef.current?.disconnect(); } catch { /* no-op */ }
    for (const source of participantSourcesRef.current.values()) {
      try { source.disconnect(); } catch { /* no-op */ }
    }
    for (const destination of participantDestinationsRef.current.values()) {
      destination.stream.getTracks().forEach((track) => track.stop());
    }
    for (const audio of audioElementsRef.current) {
      audio.pause();
      audio.srcObject = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }

    peerRef.current = null;
    localStreamRef.current = null;
    coordinatorDataRef.current = null;
    coordinatorCallRef.current = null;
    dataConnectionsRef.current.clear();
    mediaCallsRef.current.clear();
    participantNamesRef.current.clear();
    participantSourcesRef.current.clear();
    participantDestinationsRef.current.clear();
    participantAudioRef.current.clear();
    audioContextRef.current = null;
    aiMixRef.current = null;
    localSourceRef.current = null;
    aiSourceRef.current = null;
    realtimePcRef.current = null;
    realtimeDataRef.current = null;
    audioElementsRef.current = [];
    setRole(null);
    setAi("offline");
    setRoster([]);
    setMuted(false);
    setPhase(nextPhase);
    setStatus(nextPhase === "ended" ? "You left the Stewart field scope." : "Room stopped.");
  }, [setAi]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stewart-room/access", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => {
        if (cancelled) return;
        setAccessGranted(Boolean(data.ok));
        if (data.ok) setStatus("Access remembered. Enter your name and join.");
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setCheckingAccess(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      try { realtimeDataRef.current?.close(); } catch { /* no-op */ }
      try { realtimePcRef.current?.close(); } catch { /* no-op */ }
      try { peerRef.current?.destroy(); } catch { /* no-op */ }
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const unlockAccess = useCallback(async (): Promise<boolean> => {
    if (accessGranted) return true;
    if (Date.now() < lockUntil) {
      setErrorText("PIN entry is temporarily locked. Wait thirty seconds.");
      return false;
    }
    if (!/^\d{4}$/.test(pin)) {
      setErrorText("Enter the four-digit room PIN.");
      return false;
    }

    const response = await fetch("/api/stewart-room/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const data = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      const attempts = pinAttempts + 1;
      setPinAttempts(attempts);
      if (attempts >= 5) {
        setPinAttempts(0);
        setLockUntil(Date.now() + 30000);
        setErrorText("Too many incorrect attempts. PIN entry is locked for thirty seconds.");
      } else setErrorText(data.error || "Incorrect room PIN.");
      return false;
    }

    setAccessGranted(true);
    setPin("");
    setPinAttempts(0);
    return true;
  }, [accessGranted, lockUntil, pin, pinAttempts]);

  const handleRealtimeEvent = useCallback((raw: string) => {
    try {
      const event = JSON.parse(raw) as Record<string, any>;
      const type = String(event.type || "");
      if (type === "session.created" || type === "session.updated") {
        setAi("live");
        setStatus("NULLWORKS is live on the field scope.");
        broadcast({ type: "ai-state", value: "live" });
      } else if (type === "conversation.item.input_audio_transcription.completed") {
        addTranscript("Room", String(event.transcript || ""));
      } else if (type === "response.output_audio_transcript.done") {
        addTranscript("NULLWORKS", String(event.transcript || ""));
      } else if (type === "response.output_text.done") {
        addTranscript("NULLWORKS", String(event.text || ""));
      } else if (type === "error") {
        const message = String(event.error?.message || "Realtime model error.");
        setAi("error");
        setErrorText(message);
        broadcast({ type: "ai-state", value: "error", message });
      }
    } catch (error) {
      console.error("Stewart Realtime event parse failed", error);
    }
  }, [addTranscript, broadcast, setAi]);

  const connectRealtime = useCallback(async (aiInput: MediaStream, coordinatorName: string) => {
    setAi("connecting");
    setStatus("Connecting the NULLWORKS realtime voice agent...");

    const context = audioContextRef.current;
    if (!context) throw new Error("Audio context is unavailable.");

    const pc = new RTCPeerConnection();
    realtimePcRef.current = pc;
    for (const track of aiInput.getTracks()) pc.addTrack(track, aiInput);

    const events = pc.createDataChannel("oai-events");
    realtimeDataRef.current = events;
    events.addEventListener("message", (message) => handleRealtimeEvent(String(message.data || "")));
    events.addEventListener("open", () => setStatus("NULLWORKS connected. The room is ready."));

    pc.addEventListener("track", (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      const audio = new Audio();
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.srcObject = stream;
      audioElementsRef.current.push(audio);
      void audio.play().catch(() => setStatus("Tap Enable audio so the room can speak."));

      try { aiSourceRef.current?.disconnect(); } catch { /* no-op */ }
      aiSourceRef.current = context.createMediaStreamSource(stream);
      rebuildMixes();
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setAi("error");
        setErrorText("The realtime voice connection closed unexpectedly.");
        broadcast({ type: "ai-state", value: "error", message: "Realtime voice connection closed." });
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    const localSdp = pc.localDescription?.sdp;
    if (!localSdp) throw new Error("The browser did not create a WebRTC offer.");

    const endpoint = new URL("/api/stewart-room/session", window.location.origin);
    endpoint.searchParams.set("coordinator", coordinatorName);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: localSdp,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Voice agent connection failed (${response.status}). ${body.slice(0, 180)}`);
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    setAi("live");
    addTranscript("System", "NULLWORKS joined the Stewart field scope.");
    broadcast({ type: "ai-state", value: "live" });
  }, [addTranscript, broadcast, handleRealtimeEvent, rebuildMixes, setAi]);

  const removeParticipant = useCallback((peerId: string) => {
    try { mediaCallsRef.current.get(peerId)?.close(); } catch { /* no-op */ }
    try { dataConnectionsRef.current.get(peerId)?.close(); } catch { /* no-op */ }
    try { participantSourcesRef.current.get(peerId)?.disconnect(); } catch { /* no-op */ }
    participantDestinationsRef.current.get(peerId)?.stream.getTracks().forEach((track) => track.stop());
    const audio = participantAudioRef.current.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
    }
    mediaCallsRef.current.delete(peerId);
    dataConnectionsRef.current.delete(peerId);
    participantNamesRef.current.delete(peerId);
    participantSourcesRef.current.delete(peerId);
    participantDestinationsRef.current.delete(peerId);
    participantAudioRef.current.delete(peerId);
    rebuildMixes();
    publishRoster();
  }, [publishRoster, rebuildMixes]);

  const startCoordinator = useCallback(async (
    peer: any,
    localStream: MediaStream,
    coordinatorName: string,
    coordinatorListenOnly: boolean,
  ) => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) throw new Error("This browser does not support live audio mixing.");
    const context = new AudioContextClass();
    audioContextRef.current = context;
    await context.resume();

    const aiMix = context.createMediaStreamDestination();
    aiMixRef.current = aiMix;
    localSourceRef.current = context.createMediaStreamSource(localStream);
    coordinatorNameRef.current = coordinatorName;
    coordinatorListenOnlyRef.current = coordinatorListenOnly;
    rebuildMixes();

    peer.on("connection", (connection: any) => {
      const peerId = String(connection.peer || randomHex(4));
      if (!participantNamesRef.current.has(peerId) && participantNamesRef.current.size >= MAX_HUMANS - 1) {
        connection.on("open", () => {
          connection.send({ type: "room-full", message: "This beta room is full." });
          connection.close();
        });
        return;
      }

      dataConnectionsRef.current.set(peerId, connection);
      connection.on("open", () => {
        connection.send({ type: "transcript-snapshot", entries: transcriptRef.current });
        connection.send({ type: "roster", entries: [{ id: COORDINATOR_PEER_ID, name: coordinatorName, coordinator: true, listenOnly: coordinatorListenOnly }] });
        connection.send({ type: "ai-state", value: aiStateRef.current });
      });
      connection.on("data", (data: Record<string, any>) => {
        if (data?.type !== "hello") return;
        const participantName = cleanName(String(data.name || "Guest"));
        const participantListenOnly = Boolean(data.listenOnly);
        participantNamesRef.current.set(peerId, { name: participantName, listenOnly: participantListenOnly });
        addTranscript("System", `${participantName} entered the Stewart field scope.`);
        publishRoster();
      });
      connection.on("close", () => removeParticipant(peerId));
      connection.on("error", () => removeParticipant(peerId));
    });

    peer.on("call", (call: any) => {
      const peerId = String(call.peer || randomHex(4));
      if (!participantNamesRef.current.has(peerId) && participantNamesRef.current.size >= MAX_HUMANS - 1) {
        call.close();
        return;
      }

      mediaCallsRef.current.set(peerId, call);
      const metadataName = cleanName(String(call.metadata?.name || "Guest"));
      const metadataListenOnly = Boolean(call.metadata?.listenOnly);
      if (!participantNamesRef.current.has(peerId)) {
        participantNamesRef.current.set(peerId, { name: metadataName, listenOnly: metadataListenOnly });
      }

      const destination = context.createMediaStreamDestination();
      participantDestinationsRef.current.set(peerId, destination);
      rebuildMixes();
      call.answer(destination.stream);

      call.on("stream", (participantStream: MediaStream) => {
        try { participantSourcesRef.current.get(peerId)?.disconnect(); } catch { /* no-op */ }
        participantSourcesRef.current.set(peerId, context.createMediaStreamSource(participantStream));

        participantAudioRef.current.get(peerId)?.pause();
        const audio = new Audio();
        audio.autoplay = true;
        audio.setAttribute("playsinline", "");
        audio.srcObject = participantStream;
        participantAudioRef.current.set(peerId, audio);
        audioElementsRef.current.push(audio);
        void audio.play().catch(() => setStatus("Tap Enable audio to hear every participant."));

        rebuildMixes();
        publishRoster();
        setStatus(`${participantNamesRef.current.size + 1} humans and NULLWORKS are connected.`);
      });
      call.on("close", () => removeParticipant(peerId));
      call.on("error", () => removeParticipant(peerId));
    });

    peer.on("error", (error: unknown) => setErrorText(errorMessage(error)));

    setRole("coordinator");
    setPhase("live");
    publishRoster();
    setStatus("You opened the field scope. NULLWORKS is connecting.");
    addTranscript("System", `${coordinatorName} opened the Stewart field scope.`);

    try {
      await connectRealtime(aiMix.stream, coordinatorName);
    } catch (error) {
      setAi("error");
      setErrorText(errorMessage(error));
      setStatus("Human audio is live, but NULLWORKS did not connect.");
    }
  }, [addTranscript, connectRealtime, publishRoster, rebuildMixes, removeParticipant, setAi]);

  const handleParticipantData = useCallback((data: Record<string, any>) => {
    if (!data || typeof data !== "object") return;
    if (data.type === "room-full") {
      setErrorText(String(data.message || "The field scope is full."));
      teardown("error");
    } else if (data.type === "transcript" && data.entry) {
      const next = [...transcriptRef.current.slice(-119), data.entry as TranscriptEntry];
      transcriptRef.current = next;
      setTranscript(next);
    } else if (data.type === "transcript-snapshot" && Array.isArray(data.entries)) {
      const next = data.entries.slice(-120) as TranscriptEntry[];
      transcriptRef.current = next;
      setTranscript(next);
    } else if (data.type === "roster" && Array.isArray(data.entries)) {
      setRoster(data.entries as RosterEntry[]);
    } else if (data.type === "ai-state") {
      const next: AiState = data.value === "live" ? "live" : data.value === "error" ? "error" : "connecting";
      setAi(next);
      if (data.message) setErrorText(String(data.message));
    }
  }, [setAi, teardown]);

  const startParticipant = useCallback(async (
    peer: any,
    localStream: MediaStream,
    participantName: string,
    participantListenOnly: boolean,
  ) => {
    const metadata = { name: participantName, listenOnly: participantListenOnly };
    const connection = peer.connect(COORDINATOR_PEER_ID, { metadata });
    coordinatorDataRef.current = connection;
    connection.on("data", (data: Record<string, any>) => handleParticipantData(data));
    connection.on("close", () => {
      setErrorText("The browser coordinator left. Leave and rejoin to reopen the permanent room.");
      setPhase("error");
    });
    await waitForDataOpen(connection);
    connection.send({ type: "hello", ...metadata });

    const call = peer.call(COORDINATOR_PEER_ID, localStream, { metadata });
    coordinatorCallRef.current = call;
    setRole("participant");
    setStatus("Field scope found. Connecting room audio...");

    const connectionTimer = window.setTimeout(() => {
      if (!call.open) setErrorText("Audio is taking too long. Leave and rejoin the room.");
    }, 15000);

    call.on("stream", (remoteStream: MediaStream) => {
      window.clearTimeout(connectionTimer);
      const audio = new Audio();
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.srcObject = remoteStream;
      audioElementsRef.current.push(audio);
      void audio.play().catch(() => setStatus("Tap Enable audio to hear the field scope."));
      setPhase("live");
      setStatus(`${participantName} joined the Stewart field scope.`);
    });
    call.on("close", () => {
      window.clearTimeout(connectionTimer);
      setErrorText("The room audio bridge closed. Leave and rejoin to reopen it.");
      setPhase("error");
    });
    call.on("error", () => {
      window.clearTimeout(connectionTimer);
      setErrorText("The private audio connection failed.");
      setPhase("error");
    });
  }, [handleParticipantData]);

  const joinRoom = useCallback(async () => {
    if (phase === "joining" || phase === "live") return;
    setErrorText("");
    setPhase("joining");
    setStatus("Opening the private field scope...");

    try {
      const unlocked = await unlockAccess();
      if (!unlocked) {
        setPhase("gate");
        return;
      }

      const participantName = cleanName(name);
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
      if (listenOnly) localStream.getAudioTracks().forEach((track) => { track.enabled = false; });
      localStreamRef.current = localStream;

      const PeerClass = await loadPeerJs();
      const claimed = await claimRoom(PeerClass);
      peerRef.current = claimed.peer;
      if (claimed.role === "coordinator") {
        await startCoordinator(claimed.peer, localStream, participantName, listenOnly);
      } else {
        await startParticipant(claimed.peer, localStream, participantName, listenOnly);
      }
    } catch (error) {
      teardown("error");
      setErrorText(errorMessage(error));
      setStatus("The Stewart field scope could not start.");
    }
  }, [listenOnly, name, phase, startCoordinator, startParticipant, teardown, unlockAccess]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !muted;
    stream.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setMuted(nextMuted);
    setStatus(nextMuted ? "Your microphone is muted." : "Your microphone is live.");
  }, [muted]);

  const enableAudio = useCallback(async () => {
    if (audioContextRef.current?.state === "suspended") await audioContextRef.current.resume();
    await Promise.allSettled(audioElementsRef.current.map((audio) => audio.play()));
    setStatus("Room audio enabled.");
  }, []);

  const resetGate = useCallback(() => {
    teardown("ended");
    setPhase("gate");
    setStatus("Access remembered. Enter your name and join.");
    setErrorText("");
  }, [teardown]);

  const roomActive = phase === "joining" || phase === "live";

  return (
    <main className={styles.shell}>
      <OscilloscopeBackdrop />
      <div className={styles.scanlines} />

      <div className={styles.wrap}>
        <header className={styles.header}>
          <div>
            <div className={styles.kicker}>NULLWORKS PRIVATE FIELD SCOPE</div>
            <h1>STEWART<br /><span>HUDDLE</span></h1>
            <p>Jeff, Nathan, Mason, and NULLWORKS in one permanent low-latency room.</p>
          </div>
          <div className={styles.statusRack}>
            <span className={roomActive ? styles.livePill : styles.darkPill}>ROOM {phase.toUpperCase()}</span>
            <span className={aiState === "live" ? styles.livePill : aiState === "error" ? styles.errorPill : styles.darkPill}>AI {aiState.toUpperCase()}</span>
          </div>
        </header>

        {phase === "gate" && (
          <section className={styles.panel}>
            <div className={styles.panelLabel}>PERMANENT PRIVATE ENTRYPOINT</div>
            <h2>Enter the field scope.</h2>
            <p className={styles.lead}>The first person in becomes the temporary browser coordinator. Jeff, Nathan, or Mason can open the room alone; later entrants automatically join the same active session.</p>

            <label className={styles.field}>
              Your name
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={32} autoComplete="name" />
            </label>

            {!accessGranted && (
              <label className={styles.field}>
                Four-digit PIN
                <input
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="••••"
                  maxLength={4}
                  disabled={checkingAccess}
                />
              </label>
            )}

            <label className={styles.checkRow}>
              <input type="checkbox" checked={listenOnly} onChange={(event) => setListenOnly(event.target.checked)} />
              Join with my microphone initially muted
            </label>

            {errorText && <div className={styles.errorBox}>{errorText}</div>}
            <button className={styles.primaryButton} onClick={() => void joinRoom()} disabled={checkingAccess}>
              {checkingAccess ? "CHECKING ACCESS" : "OPEN FIELD SCOPE"}
            </button>
            <p className={styles.finePrint}>Use earbuds when several phones are in the same room. The browser coordinator must stay connected; if that browser leaves, everyone exits and rejoins through this permanent page.</p>
          </section>
        )}

        {phase === "joining" && (
          <section className={styles.panel}>
            <div className={styles.scopeLoader}><span /><span /><span /></div>
            <h2>Acquiring signal...</h2>
            <p className={styles.lead}>{status}</p>
            {errorText && <div className={styles.errorBox}>{errorText}</div>}
          </section>
        )}

        {(phase === "live" || phase === "error") && (
          <>
            <section className={styles.livePanel}>
              <div className={styles.roleLine}>
                <span>{role === "coordinator" ? "BROWSER COORDINATOR" : "ROOM PARTICIPANT"}</span>
                <b>{status}</b>
              </div>

              <div className={styles.roster}>
                {roster.length === 0 ? (
                  <article><i className={styles.waitDot} /><strong>Acquiring roster</strong><small>Stand by</small></article>
                ) : roster.map((entry) => (
                  <article key={entry.id}>
                    <i className={styles.signalDot} />
                    <strong>{entry.name}</strong>
                    <small>{entry.coordinator ? "Coordinator" : entry.listenOnly ? "Muted entry" : "Connected"}</small>
                  </article>
                ))}
                <article>
                  <i className={aiState === "live" ? styles.signalDot : styles.waitDot} />
                  <strong>NULLWORKS</strong>
                  <small>{aiState}</small>
                </article>
              </div>

              {errorText && <div className={styles.errorBox}>{errorText}</div>}

              <div className={styles.controls}>
                <button className={muted ? styles.mutedButton : styles.scopeButton} onClick={toggleMic}>{muted ? "UNMUTE MIC" : "MUTE MIC"}</button>
                <button className={styles.scopeButton} onClick={() => void enableAudio()}>ENABLE AUDIO</button>
                <button className={styles.exitButton} onClick={() => teardown("ended")}>LEAVE ROOM</button>
              </div>
            </section>

            <section className={styles.transcriptPanel}>
              <div className={styles.transcriptHeader}>
                <div><span>CHANNEL B</span><h2>Live transcript</h2></div>
                <small>AUTOMATED // MAY CONTAIN ERRORS</small>
              </div>
              <div className={styles.transcriptBody}>
                {transcript.length === 0 ? (
                  <p className={styles.empty}>Speech and NULLWORKS responses will appear here after the signal stabilizes.</p>
                ) : transcript.map((entry) => (
                  <article className={styles.transcriptEntry} key={entry.id}>
                    <div><strong>{entry.speaker}</strong><time>{entry.at}</time></div>
                    <p>{entry.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {phase === "ended" && (
          <section className={styles.panel}>
            <div className={styles.panelLabel}>SIGNAL CLOSED</div>
            <h2>You left the room.</h2>
            <p className={styles.lead}>The permanent entrypoint is still available. Reopen it whenever Jeff, Nathan, or Mason wants another session.</p>
            <button className={styles.primaryButton} onClick={resetGate}>REOPEN FIELD SCOPE</button>
          </section>
        )}

        <footer>
          <span>STEWART FIELD SCOPE // MUTED PHOSPHOR UI</span>
          <span>MAX {MAX_HUMANS} HUMANS // EPHEMERAL AUDIO // PIN-GATED</span>
        </footer>
      </div>
    </main>
  );
}
