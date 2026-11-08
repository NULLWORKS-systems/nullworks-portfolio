"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./huddle.module.css";

type RoomMode = "host" | "guest";
type RoomState = "idle" | "starting" | "waiting" | "connected" | "ended" | "error";
type AiState = "offline" | "connecting" | "live" | "error";

type TranscriptEntry = {
  id: string;
  speaker: string;
  text: string;
  at: string;
};

type DataConnectionLike = {
  open?: boolean;
  metadata?: Record<string, unknown>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  send: (data: unknown) => void;
  close: () => void;
};

type MediaConnectionLike = {
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
      else reject(new Error("PeerJS loaded without a browser constructor."));
    };

    if (window.Peer) finish();
    else {
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", () => reject(new Error("Could not load the room signaling client.")), { once: true });
    }
  });

  return peerScriptPromise;
}

function randomHex(bytes = 16): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return Array.from(data, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cleanName(value: string, fallback: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9 .'-]/g, "").trim();
  return cleaned.slice(0, 32) || fallback;
}

function hostPeerId(room: string, key: string): string {
  return `nw-h-${room}-${key.slice(0, 16)}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
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
    const timer = window.setTimeout(() => reject(new Error("The host did not answer in time.")), timeoutMs);
    connection.on("open", () => {
      window.clearTimeout(timer);
      resolve();
    });
    connection.on("error", () => {
      window.clearTimeout(timer);
      reject(new Error("The private room data channel failed."));
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

function audioConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  };
}

function timeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function errorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "Microphone permission was denied.";
  if (error instanceof Error) return error.message;
  return "An unknown room error occurred.";
}

export default function HuddleClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode");
  const mode: RoomMode | null = modeParam === "host" || modeParam === "guest" ? modeParam : null;
  const room = searchParams.get("room") || "";
  const roomKey = searchParams.get("key") || "";
  const pinHash = searchParams.get("ph") || "";
  const expiresAt = Number(searchParams.get("exp") || "0");
  const hostFromUrl = cleanName(searchParams.get("host") || "Mason", "Mason");
  const validRoomLink = Boolean(mode && room && roomKey && pinHash && expiresAt);

  const [creatorName, setCreatorName] = useState("Mason");
  const [creatorPin, setCreatorPin] = useState("");
  const [hostName, setHostName] = useState(hostFromUrl);
  const [guestName, setGuestName] = useState("Anthony");
  const [guestPin, setGuestPin] = useState("");
  const [hostPin, setHostPin] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [roomState, setRoomState] = useState<RoomState>("idle");
  const [aiState, setAiState] = useState<AiState>("offline");
  const [statusText, setStatusText] = useState("Ready to create a private room.");
  const [errorText, setErrorText] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [copied, setCopied] = useState("");

  const localStreamRef = useRef<MediaStream | null>(null);
  const guestStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<PeerLike | null>(null);
  const mediaCallRef = useRef<MediaConnectionLike | null>(null);
  const dataConnectionRef = useRef<DataConnectionLike | null>(null);
  const realtimePcRef = useRef<RTCPeerConnection | null>(null);
  const realtimeDataRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<AudioNode[]>([]);
  const participantMixRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const aiMixRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const guestAudioRef = useRef<HTMLAudioElement | null>(null);
  const aiAudioRef = useRef<HTMLAudioElement | null>(null);

  const expired = Boolean(expiresAt && Date.now() > expiresAt);
  const isActive = roomState === "starting" || roomState === "waiting" || roomState === "connected";

  const expirationLabel = useMemo(() => {
    if (!expiresAt) return "";
    return new Date(expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, [expiresAt]);

  const sendToGuest = useCallback((payload: unknown) => {
    const connection = dataConnectionRef.current;
    if (connection?.open) {
      try {
        connection.send(payload);
      } catch (error) {
        console.error("Huddle data send failed", error);
      }
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
    setTranscript((current) => [...current.slice(-79), entry]);
    if (relay) sendToGuest({ type: "transcript", entry });
  }, [sendToGuest]);

  const teardown = useCallback((nextState: RoomState = "ended") => {
    try { realtimeDataRef.current?.close(); } catch { /* no-op */ }
    try { realtimePcRef.current?.close(); } catch { /* no-op */ }
    try { mediaCallRef.current?.close(); } catch { /* no-op */ }
    try { dataConnectionRef.current?.close(); } catch { /* no-op */ }
    try { peerRef.current?.destroy(); } catch { /* no-op */ }

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    guestStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioNodesRef.current.forEach((node) => {
      try { node.disconnect(); } catch { /* no-op */ }
    });
    audioNodesRef.current = [];

    for (const audio of [remoteAudioRef.current, guestAudioRef.current, aiAudioRef.current]) {
      if (audio) {
        audio.pause();
        audio.srcObject = null;
      }
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }

    localStreamRef.current = null;
    guestStreamRef.current = null;
    peerRef.current = null;
    mediaCallRef.current = null;
    dataConnectionRef.current = null;
    realtimePcRef.current = null;
    realtimeDataRef.current = null;
    audioContextRef.current = null;
    participantMixRef.current = null;
    aiMixRef.current = null;
    remoteAudioRef.current = null;
    guestAudioRef.current = null;
    aiAudioRef.current = null;
    setAiState("offline");
    setRoomState(nextState);
    setStatusText(nextState === "ended" ? "Room ended. No session is running." : "Room stopped.");
  }, []);

  useEffect(() => () => teardown("ended"), [teardown]);

  useEffect(() => {
    setHostName(hostFromUrl);
    if (!validRoomLink || typeof window === "undefined") return;
    const storedPin = sessionStorage.getItem(`nw-huddle-pin-${room}`) || "";
    if (mode === "host") setHostPin(storedPin);

    const invite = new URL(window.location.origin + "/huddle");
    invite.searchParams.set("mode", "guest");
    invite.searchParams.set("room", room);
    invite.searchParams.set("key", roomKey);
    invite.searchParams.set("ph", pinHash);
    invite.searchParams.set("exp", String(expiresAt));
    invite.searchParams.set("host", hostFromUrl);
    setInviteUrl(invite.toString());
    setStatusText(mode === "host" ? "Private room prepared. Start the host bridge." : "Enter your name and four-digit PIN.");
  }, [expiresAt, hostFromUrl, mode, pinHash, room, roomKey, validRoomLink]);

  const createRoom = useCallback(async () => {
    const normalizedName = cleanName(creatorName, "Mason");
    if (!/^\d{4}$/.test(creatorPin)) {
      setErrorText("Use exactly four digits for the room PIN.");
      return;
    }

    setErrorText("");
    const newRoom = `${Date.now().toString(36)}${randomHex(4)}`.slice(0, 16);
    const key = randomHex(20);
    const expiry = Date.now() + 2 * 60 * 60 * 1000;
    const digest = await sha256(`${newRoom}:${creatorPin}`);
    sessionStorage.setItem(`nw-huddle-pin-${newRoom}`, creatorPin);

    const hostUrl = new URL(window.location.origin + "/huddle");
    hostUrl.searchParams.set("mode", "host");
    hostUrl.searchParams.set("room", newRoom);
    hostUrl.searchParams.set("key", key);
    hostUrl.searchParams.set("ph", digest);
    hostUrl.searchParams.set("exp", String(expiry));
    hostUrl.searchParams.set("host", normalizedName);
    router.push(`${hostUrl.pathname}${hostUrl.search}`);
  }, [creatorName, creatorPin, router]);

  const copyText = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    }
  }, []);

  const shareInvite = useCallback(async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: "NULLWORKS Huddle",
        text: `Join my private NULLWORKS Huddle. I will send the four-digit PIN separately.`,
        url: inviteUrl,
      });
    } else {
      await copyText("link", inviteUrl);
    }
  }, [copyText, inviteUrl]);

  const handleRealtimeEvent = useCallback((raw: string) => {
    try {
      const event = JSON.parse(raw) as Record<string, any>;
      const type = String(event.type || "");
      if (type === "session.created" || type === "session.updated") {
        setAiState("live");
        setStatusText((current) => current.includes("Anthony") ? current : "NULLWORKS voice agent is live. Waiting for the invited guest.");
        sendToGuest({ type: "ai-state", value: "live" });
      } else if (type === "conversation.item.input_audio_transcription.completed") {
        addTranscript("Room", String(event.transcript || ""));
      } else if (type === "response.output_audio_transcript.done") {
        addTranscript("NULLWORKS", String(event.transcript || ""));
      } else if (type === "response.output_text.done") {
        addTranscript("NULLWORKS", String(event.text || ""));
      } else if (type === "error") {
        const message = String(event.error?.message || "Realtime model error.");
        setAiState("error");
        setErrorText(message);
        sendToGuest({ type: "ai-state", value: "error", message });
      }
    } catch (error) {
      console.error("Realtime event parse failed", error);
    }
  }, [addTranscript, sendToGuest]);

  const connectRealtime = useCallback(async (
    aiInput: MediaStream,
    context: AudioContext,
    participantMix: MediaStreamAudioDestinationNode,
  ) => {
    setAiState("connecting");
    setStatusText("Connecting the NULLWORKS realtime voice agent...");

    const pc = new RTCPeerConnection();
    realtimePcRef.current = pc;
    for (const track of aiInput.getTracks()) pc.addTrack(track, aiInput);

    const events = pc.createDataChannel("oai-events");
    realtimeDataRef.current = events;
    events.addEventListener("message", (message) => handleRealtimeEvent(String(message.data || "")));
    events.addEventListener("open", () => setStatusText("NULLWORKS voice agent connected. Waiting for the invited guest."));

    pc.addEventListener("track", (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      const audio = new Audio();
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      audio.srcObject = stream;
      aiAudioRef.current = audio;
      void audio.play().catch(() => setStatusText("Tap Enable Audio so the room can speak."));

      const aiSource = context.createMediaStreamSource(stream);
      aiSource.connect(participantMix);
      audioNodesRef.current.push(aiSource);
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setAiState("error");
        setErrorText("The realtime voice connection closed unexpectedly.");
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    const localSdp = pc.localDescription?.sdp;
    if (!localSdp) throw new Error("The browser did not create a WebRTC offer.");

    const endpoint = new URL("/api/huddle/session", window.location.origin);
    endpoint.searchParams.set("room", room);
    endpoint.searchParams.set("host", hostName);
    endpoint.searchParams.set("guest", guestName || "Guest");

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
    setAiState("live");
    addTranscript("System", "NULLWORKS realtime voice agent joined the room.");
    sendToGuest({ type: "ai-state", value: "live" });
  }, [addTranscript, guestName, handleRealtimeEvent, hostName, room, sendToGuest]);

  const startHost = useCallback(async () => {
    if (expired) {
      setErrorText("This room link has expired. Create a new room.");
      return;
    }
    if (isActive) return;

    setRoomState("starting");
    setErrorText("");
    setStatusText("Requesting microphone access...");

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(), video: false });
      localStreamRef.current = localStream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("This browser does not support live audio mixing.");
      const context = new AudioContextClass();
      audioContextRef.current = context;
      await context.resume();

      const aiMix = context.createMediaStreamDestination();
      const participantMix = context.createMediaStreamDestination();
      aiMixRef.current = aiMix;
      participantMixRef.current = participantMix;

      const localSource = context.createMediaStreamSource(localStream);
      localSource.connect(aiMix);
      localSource.connect(participantMix);
      audioNodesRef.current.push(localSource);

      const PeerClass = await loadPeerJs();
      const peer = new PeerClass(hostPeerId(room, roomKey));
      peerRef.current = peer;

      peer.on("connection", (connection: DataConnectionLike) => {
        if (dataConnectionRef.current?.open) {
          connection.on("open", () => {
            connection.send({ type: "room-full", message: "This room already has two human participants." });
            connection.close();
          });
          return;
        }

        dataConnectionRef.current = connection;
        connection.on("open", () => {
          connection.send({ type: "host-state", aiState, hostName });
          connection.send({ type: "transcript-snapshot", entries: transcript });
        });
        connection.on("data", (data: Record<string, any>) => {
          if (data?.type === "hello") {
            const joinedName = cleanName(String(data.name || "Guest"), "Guest");
            setGuestName(joinedName);
            setStatusText(`${joinedName} connected to the private room. Connecting audio...`);
            addTranscript("System", `${joinedName} entered the private room.`);
          }
        });
        connection.on("close", () => {
          if (roomState !== "ended") {
            setRoomState("waiting");
            setStatusText("Guest disconnected. The host room is still open.");
          }
          dataConnectionRef.current = null;
        });
      });

      peer.on("call", (call: MediaConnectionLike) => {
        if (mediaCallRef.current?.open) {
          call.close();
          return;
        }

        mediaCallRef.current = call;
        const metadataName = cleanName(String(call.metadata?.name || "Guest"), "Guest");
        setGuestName(metadataName);
        call.answer(participantMix.stream);

        call.on("stream", (guestStream: MediaStream) => {
          guestStreamRef.current = guestStream;
          const guestSource = context.createMediaStreamSource(guestStream);
          guestSource.connect(aiMix);
          audioNodesRef.current.push(guestSource);

          const audio = new Audio();
          audio.autoplay = true;
          audio.setAttribute("playsinline", "");
          audio.srcObject = guestStream;
          guestAudioRef.current = audio;
          void audio.play().catch(() => setStatusText("Tap Enable Audio to hear the invited guest."));

          setRoomState("connected");
          setStatusText(`${metadataName}, ${hostName}, and NULLWORKS are connected.`);
          sendToGuest({ type: "room-state", value: "connected", hostName, guestName: metadataName });
        });

        call.on("close", () => {
          guestStreamRef.current = null;
          mediaCallRef.current = null;
          setRoomState("waiting");
          setStatusText("Guest audio disconnected. The host room remains open.");
        });
      });

      peer.on("error", (error: unknown) => {
        setErrorText(errorMessage(error));
      });

      await waitForPeerOpen(peer);
      setRoomState("waiting");
      setStatusText("Private host bridge is live. Share the link and PIN.");
      addTranscript("System", `${hostName} opened the private Huddle.`);

      try {
        await connectRealtime(aiMix.stream, context, participantMix);
      } catch (error) {
        setAiState("error");
        setErrorText(errorMessage(error));
        setStatusText("Human room is live, but the NULLWORKS voice agent did not connect.");
      }
    } catch (error) {
      teardown("error");
      setErrorText(errorMessage(error));
      setStatusText("The host room could not start.");
    }
  }, [addTranscript, aiState, connectRealtime, expired, hostName, isActive, room, roomKey, roomState, sendToGuest, teardown, transcript]);

  const handleGuestData = useCallback((data: Record<string, any>) => {
    if (!data || typeof data !== "object") return;
    if (data.type === "room-full") {
      setErrorText(String(data.message || "The private room is full."));
      teardown("error");
    } else if (data.type === "transcript" && data.entry) {
      setTranscript((current) => [...current.slice(-79), data.entry as TranscriptEntry]);
    } else if (data.type === "transcript-snapshot" && Array.isArray(data.entries)) {
      setTranscript(data.entries.slice(-80));
    } else if (data.type === "ai-state") {
      setAiState(data.value === "live" ? "live" : data.value === "error" ? "error" : "connecting");
      if (data.message) setErrorText(String(data.message));
    } else if (data.type === "room-state" && data.value === "connected") {
      setRoomState("connected");
      setStatusText(`${data.hostName || hostName}, ${data.guestName || guestName}, and NULLWORKS are connected.`);
    } else if (data.type === "host-state") {
      setAiState(data.aiState === "live" ? "live" : data.aiState === "error" ? "error" : "connecting");
    }
  }, [guestName, hostName, teardown]);

  const joinGuest = useCallback(async () => {
    if (expired) {
      setErrorText("This room link has expired. Ask the host for a new link.");
      return;
    }
    if (Date.now() < lockUntil) {
      setErrorText("PIN entry is temporarily locked. Wait thirty seconds.");
      return;
    }
    if (!/^\d{4}$/.test(guestPin)) {
      setErrorText("Enter the four-digit PIN.");
      return;
    }

    const attemptedHash = await sha256(`${room}:${guestPin}`);
    if (attemptedHash !== pinHash) {
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockUntil(Date.now() + 30000);
        setPinAttempts(0);
        setErrorText("Too many incorrect attempts. PIN entry is locked for thirty seconds.");
      } else {
        setErrorText(`Incorrect PIN. ${5 - nextAttempts} attempts remain before a temporary lock.`);
      }
      return;
    }

    setRoomState("starting");
    setErrorText("");
    setStatusText("Requesting microphone access...");
    const normalizedName = cleanName(guestName, "Guest");
    setGuestName(normalizedName);

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(), video: false });
      localStreamRef.current = localStream;
      const PeerClass = await loadPeerJs();
      const guestPeerId = `nw-g-${room}-${randomHex(8)}`.slice(0, 60);
      const peer = new PeerClass(guestPeerId);
      peerRef.current = peer;
      peer.on("error", (error: unknown) => setErrorText(errorMessage(error)));
      await waitForPeerOpen(peer);

      setStatusText("Finding the private host bridge...");
      const connection = peer.connect(hostPeerId(room, roomKey), {
        serialization: "json",
        metadata: { name: normalizedName },
      });
      dataConnectionRef.current = connection;
      connection.on("data", (data: Record<string, any>) => handleGuestData(data));
      connection.on("close", () => {
        if (roomState !== "ended") {
          setRoomState("error");
          setErrorText("The host ended or lost the private room.");
        }
      });
      await waitForDataOpen(connection);
      connection.send({ type: "hello", name: normalizedName });

      const call = peer.call(hostPeerId(room, roomKey), localStream, {
        metadata: { name: normalizedName },
      });
      mediaCallRef.current = call;
      setRoomState("waiting");
      setStatusText("Host found. Connecting live audio...");

      const connectionTimer = window.setTimeout(() => {
        if (!call.open) setErrorText("Audio connection is taking too long. End and rejoin the room.");
      }, 15000);

      call.on("stream", (remoteStream: MediaStream) => {
        window.clearTimeout(connectionTimer);
        const audio = new Audio();
        audio.autoplay = true;
        audio.setAttribute("playsinline", "");
        audio.srcObject = remoteStream;
        remoteAudioRef.current = audio;
        void audio.play().catch(() => setStatusText("Tap Enable Audio to hear the room."));
        setRoomState("connected");
        setStatusText(`${hostName}, ${normalizedName}, and NULLWORKS are connected.`);
      });
      call.on("close", () => {
        window.clearTimeout(connectionTimer);
        setRoomState("error");
        setErrorText("The host audio bridge closed.");
      });
      call.on("error", () => {
        window.clearTimeout(connectionTimer);
        setRoomState("error");
        setErrorText("The private audio connection failed.");
      });
    } catch (error) {
      teardown("error");
      setErrorText(errorMessage(error));
      setStatusText("Could not join the private room.");
    }
  }, [expired, guestName, guestPin, handleGuestData, hostName, lockUntil, pinAttempts, pinHash, room, roomKey, roomState, teardown]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !micMuted;
    stream.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setMicMuted(nextMuted);
    setStatusText(nextMuted ? "Your microphone is muted." : "Your microphone is live.");
  }, [micMuted]);

  const enableAudio = useCallback(async () => {
    const context = audioContextRef.current;
    if (context?.state === "suspended") await context.resume();
    const audios = [remoteAudioRef.current, guestAudioRef.current, aiAudioRef.current].filter(Boolean) as HTMLAudioElement[];
    await Promise.allSettled(audios.map((audio) => audio.play()));
    setStatusText(roomState === "connected" ? "Room audio enabled." : statusText);
  }, [roomState, statusText]);

  const resetToCreate = useCallback(() => {
    teardown("ended");
    router.push("/huddle");
  }, [router, teardown]);

  if (!validRoomLink) {
    return (
      <main className={styles.shell}>
        <div className={styles.gridGlow} />
        <section className={styles.creatorCard}>
          <div className={styles.eyebrow}>NULLWORKS PRIVATE VOICE</div>
          <h1>Huddle Room</h1>
          <p className={styles.lead}>Create a two-hour browser room for two people and one low-latency NULLWORKS voice agent.</p>

          <label className={styles.fieldLabel}>
            Host name
            <input value={creatorName} onChange={(event) => setCreatorName(event.target.value)} maxLength={32} autoComplete="name" />
          </label>
          <label className={styles.fieldLabel}>
            Four-digit PIN
            <input
              value={creatorPin}
              onChange={(event) => setCreatorPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••"
              maxLength={4}
            />
          </label>

          {errorText && <div className={styles.errorBox}>{errorText}</div>}
          <button className={styles.primaryButton} onClick={() => void createRoom()}>Create private room</button>
          <p className={styles.finePrint}>The link carries an unguessable room key. Send the PIN separately. The room disappears when the host leaves and the invite expires after two hours.</p>
        </section>
      </main>
    );
  }

  if (expired) {
    return (
      <main className={styles.shell}>
        <section className={styles.creatorCard}>
          <div className={styles.eyebrow}>ROOM EXPIRED</div>
          <h1>This Huddle is closed.</h1>
          <p className={styles.lead}>Create a fresh private room and send a new invite.</p>
          <button className={styles.primaryButton} onClick={resetToCreate}>Create new room</button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.gridGlow} />
      <div className={styles.roomWrap}>
        <header className={styles.roomHeader}>
          <div>
            <div className={styles.eyebrow}>NULLWORKS HUDDLE</div>
            <h1>Private Room</h1>
            <div className={styles.roomCode}>ROOM {room.slice(0, 8).toUpperCase()} · EXPIRES {expirationLabel}</div>
          </div>
          <div className={styles.statusStack}>
            <span className={`${styles.statusPill} ${isActive ? styles.green : styles.gray}`}>ROOM {roomState.toUpperCase()}</span>
            <span className={`${styles.statusPill} ${aiState === "live" ? styles.green : aiState === "error" ? styles.red : styles.amber}`}>AI {aiState.toUpperCase()}</span>
          </div>
        </header>

        {mode === "host" && roomState === "idle" && (
          <section className={styles.panel}>
            <h2>Host controls</h2>
            <p>Send Anthony the invite link and the PIN through separate messages, then start the room on this phone.</p>
            <div className={styles.shareGrid}>
              <button className={styles.secondaryButton} onClick={() => void shareInvite()}>{copied === "link" ? "Link copied" : "Share invite link"}</button>
              <button className={styles.secondaryButton} onClick={() => void copyText("pin", hostPin)} disabled={!hostPin}>{copied === "pin" ? "PIN copied" : `Copy PIN ${hostPin || "unavailable"}`}</button>
            </div>
            <button className={styles.primaryButton} onClick={() => void startHost()}>Start host bridge</button>
            <p className={styles.finePrint}>Use earbuds on both phones when possible. The host phone mixes both human microphones and the AI audio.</p>
          </section>
        )}

        {mode === "guest" && roomState === "idle" && (
          <section className={styles.panel}>
            <h2>Join {hostName}&apos;s room</h2>
            <label className={styles.fieldLabel}>
              Your name
              <input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={32} autoComplete="name" />
            </label>
            <label className={styles.fieldLabel}>
              Four-digit PIN
              <input
                value={guestPin}
                onChange={(event) => setGuestPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••"
                maxLength={4}
              />
            </label>
            <button className={styles.primaryButton} onClick={() => void joinGuest()}>Join microphone</button>
            <p className={styles.finePrint}>Your browser will ask for microphone access. Headphones reduce echo and make interruptions much cleaner.</p>
          </section>
        )}

        {roomState !== "idle" && (
          <section className={styles.livePanel}>
            <div className={styles.participantGrid}>
              <div className={styles.participant}><span className={styles.liveDot} /><strong>{hostName}</strong><small>Host</small></div>
              <div className={styles.participant}><span className={roomState === "connected" ? styles.liveDot : styles.waitDot} /><strong>{guestName || "Guest"}</strong><small>{roomState === "connected" ? "Connected" : "Waiting"}</small></div>
              <div className={styles.participant}><span className={aiState === "live" ? styles.liveDot : styles.waitDot} /><strong>NULLWORKS</strong><small>{aiState}</small></div>
            </div>

            <div className={styles.bigStatus}>{statusText}</div>
            {errorText && <div className={styles.errorBox}>{errorText}</div>}

            <div className={styles.controlGrid}>
              <button className={`${styles.micButton} ${micMuted ? styles.muted : ""}`} onClick={toggleMic}>{micMuted ? "Unmute microphone" : "Mute microphone"}</button>
              <button className={styles.secondaryButton} onClick={() => void enableAudio()}>Enable audio</button>
              <button className={styles.dangerButton} onClick={() => teardown("ended")}>End room</button>
            </div>

            {mode === "host" && inviteUrl && roomState !== "connected" && (
              <div className={styles.waitingShare}>
                <button className={styles.textButton} onClick={() => void shareInvite()}>Share invite link again</button>
                {hostPin && <button className={styles.textButton} onClick={() => void copyText("pin", hostPin)}>PIN {hostPin}</button>}
              </div>
            )}
          </section>
        )}

        {roomState === "ended" && (
          <section className={styles.panel}>
            <h2>Room ended</h2>
            <p>The microphones, peer connection, and realtime model connection have been closed.</p>
            <button className={styles.primaryButton} onClick={resetToCreate}>Create another room</button>
          </section>
        )}

        <section className={styles.transcriptPanel}>
          <div className={styles.transcriptHeader}>
            <h2>Live transcript</h2>
            <span>Automated · may contain errors</span>
          </div>
          <div className={styles.transcriptBody}>
            {transcript.length === 0 ? (
              <p className={styles.transcriptEmpty}>Conversation will appear here after the room starts.</p>
            ) : transcript.map((entry) => (
              <article className={styles.transcriptEntry} key={entry.id}>
                <div><strong>{entry.speaker}</strong><time>{entry.at}</time></div>
                <p>{entry.text}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className={styles.footerNote}>BETA TRANSPORT · Browser media is encrypted in transit. PeerJS Cloud is currently used only for connection signaling; production hardening should move signaling onto a NULLWORKS-controlled service.</footer>
      </div>
    </main>
  );
}
