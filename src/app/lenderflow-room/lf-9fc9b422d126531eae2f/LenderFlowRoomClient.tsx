"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./room.module.css";

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

type DataConnectionLike = {
  peer: string;
  open?: boolean;
  metadata?: Record<string, unknown>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  send: (data: unknown) => void;
  close: () => void;
};

type MediaConnectionLike = {
  peer: string;
  open?: boolean;
  metadata?: Record<string, unknown>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  answer: (stream?: MediaStream) => void;
  close: () => void;
};

type PeerLike = {
  id?: string;
  on: (event: string, callback: (...args: any[]) => void) => void;
  connect: (peerId: string, options?: Record<string, unknown>) => DataConnectionLike;
  call: (peerId: string, stream: MediaStream, options?: Record<string, unknown>) => MediaConnectionLike;
  destroy: () => void;
};

type PeerConstructor = new (id?: string, options?: Record<string, unknown>) => PeerLike;

declare global {
  interface Window {
    Peer?: PeerConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}

const ROOM_SLUG = "lf-9fc9b422d126531eae2f";
const COORDINATOR_PEER_ID = `nw-lf-${ROOM_SLUG}`;
const MAX_HUMANS = 5;

let peerScriptPromise: Promise<PeerConstructor> | null = null;

function loadPeerJs(): Promise<PeerConstructor> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser unavailable."));
  if (window.Peer) return Promise.resolve(window.Peer);
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
      if (window.Peer) resolve(window.Peer);
      else reject(new Error("Room signaling loaded without a browser client."));
    };
    if (window.Peer) finish();
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

function audioConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "Microphone permission was denied.";
  if (error instanceof Error) return error.message;
  return "An unknown room error occurred.";
}

function waitForPeerOpen(peer: PeerLike, timeoutMs = 12000): Promise<void> {
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

function waitForDataOpen(connection: DataConnectionLike, timeoutMs = 12000): Promise<void> {
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

async function claimRoom(PeerClass: PeerConstructor): Promise<{ peer: PeerLike; role: Exclude<RoomRole, null> }> {
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
        const participant = new PeerClass(`nw-lf-p-${randomHex(10)}`.slice(0, 60));
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

export default function LenderFlowRoomClient() {
  const [phase, setPhase] = useState<Phase>("gate");
  const [accessGranted, setAccessGranted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [name, setName] = useState("Derek");
  const [pin, setPin] = useState("");
  const [listenOnly, setListenOnly] = useState(false);
  const [role, setRole] = useState<RoomRole>(null);
  const [status, setStatus] = useState("Enter the room PIN to continue.");
  const [errorText, setErrorText] = useState("");
  const [aiState, setAiState] = useState<AiState>("offline");
  const [muted, setMuted] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  const peerRef = useRef<PeerLike | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const coordinatorDataRef = useRef<DataConnectionLike | null>(null);
  const coordinatorCallRef = useRef<MediaConnectionLike | null>(null);
  const dataConnectionsRef = useRef(new Map<string, DataConnectionLike>());
  const mediaCallsRef = useRef(new Map<string, MediaConnectionLike>());
  const participantNamesRef = useRef(new Map<string, { name: string; listenOnly: boolean }>());
  const participantSourcesRef = useRef(new Map<string, MediaStreamAudioSourceNode>());
  const participantDestinationsRef = useRef(new Map<string, MediaStreamAudioDestinationNode>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const aiMixRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const realtimePcRef = useRef<RTCPeerConnection | null>(null);
  const realtimeDataRef = useRef<RTCDataChannel | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const coordinatorNameRef = useRef("Derek");
  const coordinatorListenOnlyRef = useRef(false);

  const broadcast = useCallback((payload: unknown) => {
    for (const connection of dataConnectionsRef.current.values()) {
      if (!connection.open) continue;
      try { connection.send(payload); } catch (error) { console.error("LenderFlow room broadcast failed", error); }
    }
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
    setTranscript((current) => [...current.slice(-99), entry]);
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
    for (const source of participantSourcesRef.current.values()) {
      try { source.disconnect(); } catch { /* no-op */ }
    }
    try { localSourceRef.current?.disconnect(); } catch { /* no-op */ }
    try { aiSourceRef.current?.disconnect(); } catch { /* no-op */ }
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
    audioContextRef.current = null;
    aiMixRef.current = null;
    localSourceRef.current = null;
    aiSourceRef.current = null;
    realtimePcRef.current = null;
    realtimeDataRef.current = null;
    audioElementsRef.current = [];
    setRole(null);
    setAiState("offline");
    setRoster([]);
    setPhase(nextPhase);
    setStatus(nextPhase === "ended" ? "You left the LenderFlow room." : "Room stopped.");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/lenderflow-room/access", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => {
        if (cancelled) return;
        const granted = Boolean(data.ok);
        setAccessGranted(granted);
        if (granted) setStatus("Access remembered. Join the LenderFlow room when ready.");
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setCheckingAccess(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => teardown("ended"), [teardown]);

  const unlockRoom = async () => {
    if (Date.now() < lockUntil) {
      setErrorText("PIN entry is temporarily locked. Wait thirty seconds.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setErrorText("Enter the four-digit room PIN.");
      return;
    }
    setErrorText("");
    const response = await fetch("/api/lenderflow-room/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const body = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !body.ok) {
      const attempts = pinAttempts + 1;
      setPinAttempts(attempts);
      if (attempts >= 5) {
        setPinAttempts(0);
        setLockUntil(Date.now() + 30000);
        setErrorText("Too many incorrect attempts. PIN entry is locked for thirty seconds.");
      } else {
        setErrorText(body.error || `Incorrect PIN. ${5 - attempts} attempts remain.`);
      }
      return;
    }
    setAccessGranted(true);
    setPin("");
    setStatus("Access granted. Tap Join room.");
  };

  const playStream = (stream: MediaStream): HTMLAudioElement => {
    const audio = new Audio();
    audio.autoplay = true;
    audio.setAttribute("playsinline", "");
    audio.srcObject = stream;
    audioElementsRef.current.push(audio);
    void audio.play().catch(() => setStatus("Tap Enable audio so the room can speak."));
    return audio;
  };

  const handleRealtimeEvent = useCallback((raw: string) => {
    try {
      const event = JSON.parse(raw) as Record<string, any>;
      const type = String(event.type || "");
      if (type === "session.created" || type === "session.updated") {
        setAiState("live");
        setStatus("LENA is live. The room is ready.");
        broadcast({ type: "ai-state", value: "live" });
      } else if (type === "conversation.item.input_audio_transcription.completed") {
        addTranscript("Room", String(event.transcript || ""));
      } else if (type === "response.output_audio_transcript.done") {
        addTranscript("LENA", String(event.transcript || ""));
      } else if (type === "response.output_text.done") {
        addTranscript("LENA", String(event.text || ""));
      } else if (type === "error") {
        const message = String(event.error?.message || "Realtime model error.");
        setAiState("error");
        setErrorText(message);
        broadcast({ type: "ai-state", value: "error", message });
      }
    } catch (error) {
      console.error("LenderFlow Realtime event parse failed", error);
    }
  }, [addTranscript, broadcast]);

  const connectRealtime = useCallback(async (
    aiInput: MediaStream,
    context: AudioContext,
    coordinatorName: string,
  ) => {
    setAiState("connecting");
    setStatus("Connecting LENA...");
    const pc = new RTCPeerConnection();
    realtimePcRef.current = pc;
    for (const track of aiInput.getTracks()) pc.addTrack(track, aiInput);

    const events = pc.createDataChannel("oai-events");
    realtimeDataRef.current = events;
    events.addEventListener("message", (message) => handleRealtimeEvent(String(message.data || "")));
    events.addEventListener("open", () => setStatus("LENA connected. The room is ready."));

    pc.addEventListener("track", (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      playStream(stream);
      const source = context.createMediaStreamSource(stream);
      aiSourceRef.current = source;
      for (const destination of participantDestinationsRef.current.values()) {
        source.connect(destination);
      }
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setAiState("error");
        setErrorText("The LENA realtime connection closed unexpectedly.");
        broadcast({ type: "ai-state", value: "error", message: "LENA connection closed." });
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    const localSdp = pc.localDescription?.sdp;
    if (!localSdp) throw new Error("The browser did not create a WebRTC offer.");

    const endpoint = new URL("/api/lenderflow-room/session", window.location.origin);
    endpoint.searchParams.set("coordinator", coordinatorName);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: localSdp,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LENA connection failed (${response.status}). ${body.slice(0, 220)}`);
    }
    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    setAiState("live");
    addTranscript("System", "LENA joined the permanent LenderFlow room.");
    broadcast({ type: "ai-state", value: "live" });
  }, [addTranscript, broadcast, handleRealtimeEvent]);

  const removeParticipant = useCallback((peerId: string) => {
    try { participantSourcesRef.current.get(peerId)?.disconnect(); } catch { /* no-op */ }
    participantSourcesRef.current.delete(peerId);
    const destination = participantDestinationsRef.current.get(peerId);
    destination?.stream.getTracks().forEach((track) => track.stop());
    participantDestinationsRef.current.delete(peerId);
    participantNamesRef.current.delete(peerId);
    mediaCallsRef.current.delete(peerId);
    dataConnectionsRef.current.delete(peerId);
    publishRoster();
  }, [publishRoster]);

  const startCoordinator = useCallback(async (
    peer: PeerLike,
    stream: MediaStream,
    coordinatorName: string,
    coordinatorListenOnly: boolean,
  ) => {
    setRole("coordinator");
    coordinatorNameRef.current = coordinatorName;
    coordinatorListenOnlyRef.current = coordinatorListenOnly;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("This browser does not support live audio mixing.");
    const context = new AudioContextClass();
    audioContextRef.current = context;
    await context.resume();
    const aiMix = context.createMediaStreamDestination();
    aiMixRef.current = aiMix;
    const localSource = context.createMediaStreamSource(stream);
    localSourceRef.current = localSource;
    localSource.connect(aiMix);

    peer.on("connection", (connection: DataConnectionLike) => {
      if (participantNamesRef.current.size >= MAX_HUMANS - 1 && !participantNamesRef.current.has(connection.peer)) {
        connection.on("open", () => {
          connection.send({ type: "room-full", message: `This beta room supports ${MAX_HUMANS} people at once.` });
          connection.close();
        });
        return;
      }
      dataConnectionsRef.current.set(connection.peer, connection);
      connection.on("open", () => {
        connection.send({ type: "ai-state", value: aiState });
        connection.send({ type: "transcript-snapshot", entries: transcript });
        publishRoster();
      });
      connection.on("data", (data: Record<string, any>) => {
        if (data?.type === "hello") {
          const participantName = cleanName(String(data.name || "Guest"));
          const participantListenOnly = Boolean(data.listenOnly);
          participantNamesRef.current.set(connection.peer, {
            name: participantName,
            listenOnly: participantListenOnly,
          });
          addTranscript("System", `${participantName} entered the LenderFlow room.`);
          publishRoster();
        }
      });
      connection.on("close", () => removeParticipant(connection.peer));
      connection.on("error", () => removeParticipant(connection.peer));
    });

    peer.on("call", (call: MediaConnectionLike) => {
      if (mediaCallsRef.current.size >= MAX_HUMANS - 1 && !mediaCallsRef.current.has(call.peer)) {
        call.close();
        return;
      }
      mediaCallsRef.current.set(call.peer, call);
      const participantName = cleanName(String(call.metadata?.name || "Guest"));
      const participantListenOnly = Boolean(call.metadata?.listenOnly);
      participantNamesRef.current.set(call.peer, { name: participantName, listenOnly: participantListenOnly });

      const destination = context.createMediaStreamDestination();
      participantDestinationsRef.current.set(call.peer, destination);
      localSource.connect(destination);
      for (const [otherPeer, otherSource] of participantSourcesRef.current.entries()) {
        if (otherPeer !== call.peer) otherSource.connect(destination);
      }
      if (aiSourceRef.current) aiSourceRef.current.connect(destination);
      call.answer(destination.stream);

      call.on("stream", (participantStream: MediaStream) => {
        const source = context.createMediaStreamSource(participantStream);
        participantSourcesRef.current.set(call.peer, source);
        source.connect(aiMix);
        for (const [otherPeer, otherDestination] of participantDestinationsRef.current.entries()) {
          if (otherPeer !== call.peer) source.connect(otherDestination);
        }
        playStream(participantStream);
        publishRoster();
        setStatus(`${participantName} joined. LENA and the room are live.`);
      });
      call.on("close", () => removeParticipant(call.peer));
      call.on("error", () => removeParticipant(call.peer));
    });

    peer.on("error", (error: unknown) => setErrorText(errorMessage(error)));
    publishRoster();
    setPhase("live");
    setStatus("Room opened automatically. Connecting LENA...");
    addTranscript("System", `${coordinatorName} opened the permanent LenderFlow room.`);
    try {
      await connectRealtime(aiMix.stream, context, coordinatorName);
    } catch (error) {
      setAiState("error");
      setErrorText(errorMessage(error));
      setStatus("The human room is live, but LENA did not connect.");
    }
  }, [addTranscript, aiState, connectRealtime, publishRoster, removeParticipant, transcript]);

  const handleCoordinatorData = useCallback((data: Record<string, any>) => {
    if (!data || typeof data !== "object") return;
    if (data.type === "room-full") {
      setErrorText(String(data.message || "The room is full."));
      teardown("error");
    } else if (data.type === "roster" && Array.isArray(data.entries)) {
      setRoster(data.entries.slice(0, MAX_HUMANS));
    } else if (data.type === "transcript" && data.entry) {
      setTranscript((current) => [...current.slice(-99), data.entry as TranscriptEntry]);
    } else if (data.type === "transcript-snapshot" && Array.isArray(data.entries)) {
      setTranscript(data.entries.slice(-100));
    } else if (data.type === "ai-state") {
      setAiState(data.value === "live" ? "live" : data.value === "error" ? "error" : "connecting");
      if (data.message) setErrorText(String(data.message));
    }
  }, [teardown]);

  const startParticipant = useCallback(async (
    peer: PeerLike,
    stream: MediaStream,
    participantName: string,
    participantListenOnly: boolean,
  ) => {
    setRole("participant");
    const connection = peer.connect(COORDINATOR_PEER_ID, {
      serialization: "json",
      metadata: { name: participantName, listenOnly: participantListenOnly },
    });
    coordinatorDataRef.current = connection;
    connection.on("data", (data: Record<string, any>) => handleCoordinatorData(data));
    connection.on("close", () => {
      setPhase("error");
      setErrorText("The automatic room coordinator left. Tap Leave, then rejoin to reopen the room.");
    });
    await waitForDataOpen(connection);
    connection.send({ type: "hello", name: participantName, listenOnly: participantListenOnly });

    const call = peer.call(COORDINATOR_PEER_ID, stream, {
      metadata: { name: participantName, listenOnly: participantListenOnly },
    });
    coordinatorCallRef.current = call;
    const timer = window.setTimeout(() => {
      if (!call.open) setErrorText("Room audio is taking too long. Leave and rejoin.");
    }, 15000);
    call.on("stream", (roomStream: MediaStream) => {
      window.clearTimeout(timer);
      playStream(roomStream);
      setPhase("live");
      setStatus("Connected to the permanent LenderFlow room.");
    });
    call.on("close", () => {
      window.clearTimeout(timer);
      setPhase("error");
      setErrorText("The room audio bridge closed. Leave and rejoin to reopen it.");
    });
    call.on("error", () => {
      window.clearTimeout(timer);
      setPhase("error");
      setErrorText("The room audio connection failed.");
    });
  }, [handleCoordinatorData]);

  const joinRoom = async () => {
    if (!accessGranted || phase === "joining" || phase === "live") return;
    const participantName = cleanName(name);
    setName(participantName);
    setPhase("joining");
    setErrorText("");
    setStatus("Requesting microphone access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(), video: false });
      localStreamRef.current = stream;
      if (listenOnly) stream.getAudioTracks().forEach((track) => { track.enabled = false; });
      setMuted(listenOnly);

      const PeerClass = await loadPeerJs();
      setStatus("Opening or joining the permanent room...");
      const claimed = await claimRoom(PeerClass);
      peerRef.current = claimed.peer;
      if (claimed.role === "coordinator") {
        await startCoordinator(claimed.peer, stream, participantName, listenOnly);
      } else {
        await startParticipant(claimed.peer, stream, participantName, listenOnly);
      }
    } catch (error) {
      teardown("error");
      setErrorText(errorMessage(error));
      setStatus("Could not enter the LenderFlow room.");
    }
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
    setStatus(next ? "Your microphone is muted." : "Your microphone is live.");
  };

  const enableAudio = async () => {
    if (audioContextRef.current?.state === "suspended") await audioContextRef.current.resume();
    await Promise.allSettled(audioElementsRef.current.map((audio) => audio.play()));
    setStatus("Room audio enabled.");
  };

  const reset = () => {
    teardown("ended");
    setPhase("gate");
    setErrorText("");
    setStatus("Join the permanent LenderFlow room when ready.");
  };

  return (
    <main className={styles.shell}>
      <div className={styles.glow} />
      <section className={styles.wrap}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>NULLWORKS · LENDERFLOW</div>
            <h1>Permanent LenderFlow Room</h1>
            <p>Open the same link anytime. The first person in automatically opens the room; everyone else joins it.</p>
          </div>
          <div className={styles.badges}>
            <span className={styles.badge}>UP TO {MAX_HUMANS} PEOPLE</span>
            <span className={`${styles.badge} ${aiState === "live" ? styles.liveBadge : aiState === "error" ? styles.errorBadge : ""}`}>LENA {aiState.toUpperCase()}</span>
          </div>
        </header>

        {!accessGranted && (
          <section className={styles.card}>
            <h2>Enter room PIN</h2>
            <p>This link is private. Anyone with the link and PIN may enter.</p>
            <label>
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
            {errorText && <div className={styles.errorBox}>{errorText}</div>}
            <button className={styles.primary} onClick={() => void unlockRoom()} disabled={checkingAccess}>
              {checkingAccess ? "Checking access..." : "Unlock room"}
            </button>
          </section>
        )}

        {accessGranted && phase === "gate" && (
          <section className={styles.card}>
            <h2>Join LENA</h2>
            <label>
              Your name
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={32} autoComplete="name" />
            </label>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={listenOnly} onChange={(event) => setListenOnly(event.target.checked)} />
              <span><strong>Listen-only / spectate</strong><small>Your microphone starts muted. You may unmute later.</small></span>
            </label>
            {errorText && <div className={styles.errorBox}>{errorText}</div>}
            <button className={styles.primary} onClick={() => void joinRoom()}>Join room</button>
            <p className={styles.finePrint}>No Mason host step is required. Use headphones when several people are present.</p>
          </section>
        )}

        {accessGranted && phase === "joining" && (
          <section className={styles.card}>
            <div className={styles.spinner} />
            <h2>Connecting</h2>
            <p>{status}</p>
          </section>
        )}

        {accessGranted && (phase === "live" || phase === "error") && (
          <>
            <section className={styles.liveCard}>
              <div className={styles.statusLine}>
                <div>
                  <strong>{role === "coordinator" ? "Automatic room coordinator" : "Room participant"}</strong>
                  <span>{status}</span>
                </div>
                <span className={`${styles.dot} ${phase === "live" ? styles.dotLive : styles.dotError}`} />
              </div>

              {errorText && <div className={styles.errorBox}>{errorText}</div>}

              <div className={styles.roster}>
                {(roster.length ? roster : [{ id: "self", name, coordinator: role === "coordinator", listenOnly: muted }]).map((person) => (
                  <div className={styles.person} key={person.id}>
                    <span className={styles.personDot} />
                    <div><strong>{person.name}</strong><small>{person.coordinator ? "Room coordinator" : person.listenOnly ? "Listening" : "Connected"}</small></div>
                  </div>
                ))}
                <div className={styles.person}>
                  <span className={`${styles.personDot} ${aiState === "live" ? styles.aiDot : ""}`} />
                  <div><strong>LENA</strong><small>{aiState}</small></div>
                </div>
              </div>

              <div className={styles.controls}>
                <button className={styles.secondary} onClick={toggleMute}>{muted ? "Unmute microphone" : "Mute microphone"}</button>
                <button className={styles.secondary} onClick={() => void enableAudio()}>Enable audio</button>
                <button className={styles.danger} onClick={() => teardown("ended")}>Leave room</button>
              </div>
            </section>

            <section className={styles.transcriptCard}>
              <div className={styles.transcriptHeader}><h2>Live transcript</h2><span>Automated · may contain errors</span></div>
              <div className={styles.transcriptBody}>
                {transcript.length === 0 ? <p className={styles.empty}>Conversation will appear here.</p> : transcript.map((entry) => (
                  <article key={entry.id}>
                    <div><strong>{entry.speaker}</strong><time>{entry.at}</time></div>
                    <p>{entry.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {phase === "ended" && (
          <section className={styles.card}>
            <h2>You left the room</h2>
            <p>The permanent link remains valid. Rejoin whenever needed.</p>
            <button className={styles.primary} onClick={reset}>Rejoin room</button>
          </section>
        )}

        <footer className={styles.footer}>
          Conversational beta · encrypted browser media · first entrant coordinates automatically · no live lender-rule writeback
        </footer>
      </section>
    </main>
  );
}
