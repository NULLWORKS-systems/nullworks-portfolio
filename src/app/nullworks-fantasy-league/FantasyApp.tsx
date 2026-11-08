"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Crown,
  DraftingCompass,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquareText,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserPlus,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  STARTER_SLOTS,
  STORAGE_KEY,
  activity,
  autoDraftUntilHuman,
  availablePlayers,
  blankDatabase,
  createLeague,
  currentDraftTeamId,
  draftRound,
  hashPassword,
  id,
  isEligible,
  makeDraftPick,
  optimizeTeam,
  playerLabel,
  playerValue,
  proposeTrade,
  resolveTrade,
  simulateCurrentWeek,
  standings,
  startDraft,
  submitWaiver,
} from "./engine";
import type {
  Account,
  AppView,
  FantasyDatabase,
  FantasyLeague,
  FantasyPlayer,
  FantasyTeam,
  Position,
} from "./types";
import styles from "./fantasy.module.css";

const NAV: Array<{ view: AppView; label: string; icon: typeof LayoutDashboard }> = [
  { view: "dashboard", label: "Command Center", icon: LayoutDashboard },
  { view: "draft", label: "Draft Room", icon: DraftingCompass },
  { view: "team", label: "My Team", icon: ShieldCheck },
  { view: "matchups", label: "Matchups", icon: Swords },
  { view: "players", label: "Players", icon: Search },
  { view: "waivers", label: "Waivers", icon: ListChecks },
  { view: "trades", label: "Trades", icon: RefreshCw },
  { view: "league", label: "League", icon: Users },
  { view: "commissioner", label: "Commissioner", icon: Crown },
];

const POSITION_ORDER: Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

function readDatabase() {
  if (typeof window === "undefined") return blankDatabase();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankDatabase();
    const parsed = JSON.parse(raw) as FantasyDatabase;
    return parsed?.version === 1 ? parsed : blankDatabase();
  } catch {
    return blankDatabase();
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function shortName(value: string) {
  const parts = value.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : value;
}

function getMyTeam(league: FantasyLeague, accountId: string | null) {
  return league.teams.find((team) => team.ownerAccountId === accountId) ?? league.teams[0];
}

function updateLeague(database: FantasyDatabase, leagueId: string, updater: (league: FantasyLeague) => FantasyLeague) {
  return {
    ...database,
    leagues: database.leagues.map((league) => league.id === leagueId ? updater(league) : league),
  };
}

function AuthGate({ onAuthenticated }: { onAuthenticated: (database: FantasyDatabase) => void }) {
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const database = readDatabase();

    try {
      if (!email || password.length < 4 || (mode === "create" && !name)) {
        throw new Error("Enter a name, valid email, and a password with at least four characters.");
      }
      const passwordHash = await hashPassword(password);
      const existing = database.accounts.find((account) => account.email === email);

      if (mode === "signin") {
        if (!existing || existing.passwordHash !== passwordHash) throw new Error("Email or password did not match this browser account.");
        onAuthenticated({ ...database, activeAccountId: existing.id, currentLeagueId: database.currentLeagueId ?? database.leagues[0]?.id ?? null });
        return;
      }

      if (existing) throw new Error("That email already has an account in this browser.");
      const account: Account = { id: id("account"), name, email, passwordHash, createdAt: new Date().toISOString() };
      const league = createLeague(account);
      onAuthenticated({
        version: 1,
        activeAccountId: account.id,
        currentLeagueId: league.id,
        accounts: [...database.accounts, account],
        leagues: [...database.leagues, league],
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : String(submissionError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.authPage}>
      <div className={styles.authGlow} />
      <section className={styles.authBrand}>
        <div className={styles.logoMark}>NFL</div>
        <div className={styles.authEyebrow}>NULLWORKS FANTASY LEAGUE</div>
        <h1>Run the whole damn season.</h1>
        <p>Create the league. Fill the room. Draft the teams. Work waivers. Trade players. Set lineups. Score every week. Crown a champion.</p>
        <div className={styles.featureRail}>
          <span><DraftingCompass size={17} /> Live snake draft</span>
          <span><Swords size={17} /> Full weekly schedule</span>
          <span><BadgeDollarSign size={17} /> FAAB waivers</span>
          <span><Trophy size={17} /> Season standings</span>
        </div>
      </section>

      <section className={styles.authCard}>
        <div className={styles.authTabs}>
          <button className={mode === "create" ? styles.activeAuthTab : undefined} onClick={() => setMode("create")}>Create account</button>
          <button className={mode === "signin" ? styles.activeAuthTab : undefined} onClick={() => setMode("signin")}>Sign in</button>
        </div>
        <form onSubmit={submit}>
          {mode === "create" ? <label>Display name<input name="name" autoComplete="name" placeholder="Mason Perry" /></label> : null}
          <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} placeholder="••••••••" /></label>
          {error ? <div className={styles.formError}>{error}</div> : null}
          <button className={styles.primaryButton} type="submit" disabled={busy}>
            {busy ? "Building league…" : mode === "create" ? "Create account + league" : "Enter league"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className={styles.localReceipt}>
          <ShieldCheck size={17} />
          <p><strong>Playable local-first build.</strong> Accounts and league state persist in this browser. The production database schema is included for cross-device deployment.</p>
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return <div className={styles.loading}><div className={styles.loadingMark}>NFL</div><strong>Loading league operating system…</strong></div>;
}

function EmptyLeague({ account, database, setDatabase }: { account: Account; database: FantasyDatabase; setDatabase: (database: FantasyDatabase) => void }) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  function create() {
    const league = createLeague(account);
    setDatabase({ ...database, currentLeagueId: league.id, leagues: [...database.leagues, league] });
  }

  function join() {
    const league = database.leagues.find((candidate) => candidate.code === joinCode.trim().toUpperCase());
    if (!league) return setError("No league with that invite code exists in this browser database.");
    const openTeam = league.teams.find((team) => team.isBot);
    if (!openTeam) return setError("That league has no open team slot.");
    setDatabase({
      ...updateLeague(database, league.id, (current) => ({
        ...current,
        teams: current.teams.map((team) => team.id === openTeam.id ? { ...team, ownerAccountId: account.id, ownerName: account.name, isBot: false, name: `${account.name.split(" ")[0]}'s Franchise` } : team),
        activity: [activity("league", `${account.name} joined the league.`), ...current.activity],
      })),
      currentLeagueId: league.id,
    });
  }

  return (
    <div className={styles.emptyLeague}>
      <div className={styles.logoMark}>NFL</div>
      <h1>No active league.</h1>
      <p>Create a new NULLWORKS league or enter a six-character invite code.</p>
      <div className={styles.emptyLeagueActions}>
        <button onClick={create}><Plus size={18} /> Create league</button>
        <div><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} maxLength={6} placeholder="JOIN CODE" /><button onClick={join}>Join</button></div>
      </div>
      {error ? <div className={styles.formError}>{error}</div> : null}
    </div>
  );
}

function StatusPill({ status }: { status: FantasyLeague["status"] }) {
  return <span className={`${styles.statusPill} ${styles[`status_${status}`]}`}>{status.replace("_", " ")}</span>;
}

function PlayerBadge({ player }: { player: FantasyPlayer | undefined }) {
  if (!player) return <div className={styles.playerBadgeEmpty}>EMPTY</div>;
  return <div className={`${styles.playerBadge} ${styles[`pos_${player.position}`]}`}><span>{player.position}</span><strong>{shortName(player.name)}</strong><small>{player.team}</small></div>;
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <article className={styles.metricCard}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function DashboardView({ league, myTeam, account, players, mutateLeague }: ViewProps) {
  const table = standings(league);
  const week = league.currentWeek;
  const myMatchup = league.schedule.find((matchup) => matchup.week === week && [matchup.homeTeamId, matchup.awayTeamId].includes(myTeam.id));
  const opponentId = myMatchup ? (myMatchup.homeTeamId === myTeam.id ? myMatchup.awayTeamId : myMatchup.homeTeamId) : null;
  const opponent = league.teams.find((team) => team.id === opponentId);
  const rostered = new Map(players.map((player) => [player.id, player]));
  const topRoster = myTeam.roster.map((id) => rostered.get(id)).filter(Boolean).sort((a, b) => (a?.searchRank ?? 9999) - (b?.searchRank ?? 9999)).slice(0, 5) as FantasyPlayer[];

  return (
    <>
      <section className={styles.viewHero}>
        <div><span>COMMAND CENTER · WEEK {league.currentWeek}</span><h1>Welcome back, {account.name.split(" ")[0]}.</h1><p>{league.name} is in <b>{league.status.replace("_", " ")}</b> mode. Every draft pick, claim, trade, lineup, score, and commissioner action stays inside the league ledger.</p></div>
        <div className={styles.heroActionCard}>
          <StatusPill status={league.status} />
          <strong>{myTeam.name}</strong>
          <span>{myTeam.wins}-{myTeam.losses}-{myTeam.ties} · ${myTeam.faab} FAAB</span>
          {league.status === "setup" ? <Link href="/nullworks-fantasy-league/draft">Open draft room <ArrowRight size={15} /></Link> : null}
          {league.status === "in_season" ? <Link href="/nullworks-fantasy-league/team">Set lineup <ArrowRight size={15} /></Link> : null}
        </div>
      </section>

      <section className={styles.metricGrid}>
        <MetricCard label="League rank" value={`#${table.findIndex((team) => team.id === myTeam.id) + 1}`} detail={`${league.teams.length} franchises`} />
        <MetricCard label="Points for" value={myTeam.pointsFor.toFixed(1)} detail="season total" />
        <MetricCard label="Waiver budget" value={`$${myTeam.faab}`} detail="FAAB remaining" />
        <MetricCard label="Roster" value={`${myTeam.roster.length}/${league.settings.rosterSize}`} detail="players signed" />
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><Swords size={18} /><span>Current matchup</span></div><Link href="/nullworks-fantasy-league/matchups">All matchups</Link></div>
          {myMatchup && opponent ? (
            <div className={styles.matchupCard}>
              <div><span>{myTeam.abbreviation}</span><strong>{myTeam.name}</strong><b>{myMatchup.homeTeamId === myTeam.id ? myMatchup.homeScore ?? "—" : myMatchup.awayScore ?? "—"}</b></div>
              <i>VS</i>
              <div><span>{opponent.abbreviation}</span><strong>{opponent.name}</strong><b>{myMatchup.homeTeamId === opponent.id ? myMatchup.homeScore ?? "—" : myMatchup.awayScore ?? "—"}</b></div>
            </div>
          ) : <div className={styles.emptyPanel}>Matchups become active when the draft is complete.</div>}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><Trophy size={18} /><span>Standings</span></div><Link href="/nullworks-fantasy-league/league">Full table</Link></div>
          <div className={styles.miniStandings}>{table.slice(0, 6).map((team, index) => <div key={team.id} className={team.id === myTeam.id ? styles.highlightRow : undefined}><span>{index + 1}</span><strong>{team.name}</strong><b>{team.wins}-{team.losses}</b><small>{team.pointsFor.toFixed(1)} PF</small></div>)}</div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><Zap size={18} /><span>Roster core</span></div><Link href="/nullworks-fantasy-league/team">Manage</Link></div>
          <div className={styles.rosterCore}>{topRoster.length ? topRoster.map((player) => <PlayerBadge key={player.id} player={player} />) : <div className={styles.emptyPanel}>Your roster will populate during the draft.</div>}</div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><Activity size={18} /><span>League wire</span></div><small>latest events</small></div>
          <div className={styles.activityList}>{league.activity.slice(0, 7).map((event) => <div key={event.id}><i className={styles[`activity_${event.type}`]} /><p>{event.message}</p><span>{formatDate(event.createdAt)}</span></div>)}</div>
        </article>
      </section>
    </>
  );
}

type ViewProps = {
  league: FantasyLeague;
  myTeam: FantasyTeam;
  account: Account;
  players: FantasyPlayer[];
  mutateLeague: (updater: (league: FantasyLeague) => FantasyLeague) => void;
};

function DraftView({ league, myTeam, account, players, mutateLeague }: ViewProps) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<"ALL" | Position>("ALL");
  const currentTeamId = league.status === "drafting" ? currentDraftTeamId(league) : null;
  const currentTeam = league.teams.find((team) => team.id === currentTeamId);
  const userTurn = currentTeam?.ownerAccountId === account.id;
  const pool = availablePlayers(league, players)
    .filter((player) => position === "ALL" || player.position === position)
    .filter((player) => !query || `${player.name} ${player.team} ${player.position}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => playerValue(right, currentTeam) - playerValue(left, currentTeam))
    .slice(0, 160);
  const lookup = new Map(players.map((player) => [player.id, player]));

  function begin() {
    mutateLeague((current) => autoDraftUntilHuman(startDraft(current), players, account.id));
  }

  function pick(player: FantasyPlayer, auto = false) {
    mutateLeague((current) => {
      let next = makeDraftPick(current, player, auto);
      next = autoDraftUntilHuman(next, players, account.id);
      if (next.draft.completed) next = { ...next, teams: next.teams.map((team) => optimizeTeam(team, players)) };
      return next;
    });
  }

  function runBots() {
    mutateLeague((current) => autoDraftUntilHuman(current, players, account.id));
  }

  return (
    <>
      <section className={styles.viewHeroCompact}>
        <div><span>LIVE SNAKE DRAFT</span><h1>Draft Room</h1><p>{league.settings.draftRounds} rounds · {league.teams.length} teams · PPR · {league.settings.pickTimerSeconds}-second operating timer</p></div>
        <div className={styles.draftClock}><small>On the clock</small><strong>{currentTeam?.name ?? (league.draft.completed ? "Draft complete" : "Waiting to start")}</strong><span>Round {league.status === "drafting" ? draftRound(league) : 1} · Pick {league.draft.currentPick}</span></div>
      </section>

      {league.status === "setup" ? (
        <section className={styles.startDraftPanel}>
          <div className={styles.draftGraphic}><DraftingCompass size={54} /><span>1.01</span></div>
          <div><h2>The entire season begins here.</h2><p>The commissioner opens the room. Bot franchises draft automatically between human selections. Every pick is preserved in the league activity ledger.</p><button className={styles.primaryButton} onClick={begin}><Play size={17} /> Start live draft</button></div>
        </section>
      ) : null}

      {league.status === "drafting" ? (
        <>
          <section className={styles.draftBoardStrip}>
            {league.draft.order.map((teamId, index) => {
              const team = league.teams.find((candidate) => candidate.id === teamId)!;
              return <div key={team.id} className={team.id === currentTeamId ? styles.onClockTeam : undefined}><span>{index + 1}</span><strong>{team.abbreviation}</strong><small>{team.isBot ? "OI" : "HUMAN"}</small></div>;
            })}
          </section>

          <section className={styles.draftWorkspace}>
            <div className={styles.playerPoolPanel}>
              <div className={styles.playerControls}><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search draft pool" /></label><select value={position} onChange={(event) => setPosition(event.target.value as "ALL" | Position)}><option value="ALL">All positions</option>{POSITION_ORDER.map((item) => <option key={item}>{item}</option>)}</select>{!userTurn ? <button onClick={runBots}><Bot size={16} /> Run OI picks</button> : null}</div>
              <div className={styles.playerTableHeader}><span>RK</span><span>Player</span><span>Pos</span><span>Team</span><span>Trend</span><span /></div>
              <div className={styles.playerTable}>{pool.map((player, index) => <div key={player.id}><span>{index + 1}</span><strong>{player.name}</strong><b className={styles[`position_${player.position}`]}>{player.position}</b><span>{player.team}</span><span>{player.trending ? `+${player.trending}` : "—"}</span><button disabled={!userTurn} onClick={() => pick(player)}>{userTurn ? "Draft" : "Waiting"}</button></div>)}</div>
            </div>

            <aside className={styles.draftSidebar}>
              <div className={styles.panelHeading}><div><ShieldCheck size={17} /><span>{myTeam.name}</span></div><small>{myTeam.roster.length}/{league.settings.rosterSize}</small></div>
              <div className={styles.draftedRoster}>{POSITION_ORDER.map((pos) => <div key={pos}><span>{pos}</span><div>{myTeam.roster.map((playerId) => lookup.get(playerId)).filter((player) => player?.position === pos).map((player) => <strong key={player!.id}>{shortName(player!.name)}</strong>)}</div></div>)}</div>
              {userTurn && pool[0] ? <button className={styles.autoPickButton} onClick={() => pick(pool[0], true)}><Sparkles size={17} /> Auto-pick best value</button> : null}
              <div className={styles.recentPicks}><span>Recent picks</span>{[...league.draft.picks].reverse().slice(0, 10).map((pick) => { const team = league.teams.find((candidate) => candidate.id === pick.teamId); const player = lookup.get(pick.playerId); return <div key={pick.pickNumber}><b>{pick.pickNumber}</b><p><strong>{player?.name ?? pick.playerId}</strong><span>{team?.abbreviation} · {player?.position}</span></p></div>; })}</div>
            </aside>
          </section>
        </>
      ) : null}

      {league.draft.completed ? <section className={styles.completeBanner}><Check size={28} /><div><strong>Draft complete.</strong><p>All rosters are populated and the league moved into Week 1.</p></div><Link href="/nullworks-fantasy-league/team">Set lineup <ArrowRight size={16} /></Link></section> : null}
    </>
  );
}

function TeamView({ league, myTeam, players, mutateLeague }: ViewProps) {
  const lookup = new Map(players.map((player) => [player.id, player]));
  const assigned = new Set(Object.values(myTeam.starters).filter(Boolean));
  const bench = myTeam.roster.filter((playerId) => !assigned.has(playerId));

  function optimize() {
    mutateLeague((current) => ({ ...current, teams: current.teams.map((team) => team.id === myTeam.id ? optimizeTeam(team, players) : team), activity: [activity("roster", `${myTeam.name} optimized its starting lineup.`), ...current.activity] }));
  }

  function setSlot(slotKey: string, playerId: string) {
    mutateLeague((current) => ({
      ...current,
      teams: current.teams.map((team) => {
        if (team.id !== myTeam.id) return team;
        const starters = { ...team.starters };
        Object.keys(starters).forEach((key) => { if (starters[key] === playerId) starters[key] = null; });
        starters[slotKey] = playerId || null;
        return { ...team, starters };
      }),
      activity: [activity("roster", `${myTeam.name} updated the Week ${current.currentWeek} lineup.`), ...current.activity],
    }));
  }

  return (
    <>
      <section className={styles.viewHeroCompact}><div><span>WEEK {league.currentWeek} ROSTER OPERATIONS</span><h1>{myTeam.name}</h1><p>{myTeam.wins}-{myTeam.losses}-{myTeam.ties} · {myTeam.pointsFor.toFixed(1)} points for · ${myTeam.faab} FAAB</p></div><button className={styles.primaryButton} onClick={optimize} disabled={!myTeam.roster.length}><Zap size={17} /> Optimize lineup</button></section>
      <section className={styles.teamGrid}>
        <div className={styles.lineupPanel}>
          <div className={styles.panelHeading}><div><ShieldCheck size={18} /><span>Starting lineup</span></div><small>PPR scoring</small></div>
          <div className={styles.lineupSlots}>{STARTER_SLOTS.map((slot) => { const player = lookup.get(myTeam.starters[slot.key] ?? ""); const options = myTeam.roster.map((id) => lookup.get(id)).filter((candidate): candidate is FantasyPlayer => Boolean(candidate) && isEligible(candidate, slot.type)); return <article key={slot.key}><div className={styles.slotLabel}>{slot.label}</div><PlayerBadge player={player} /><select value={player?.id ?? ""} onChange={(event) => setSlot(slot.key, event.target.value)}><option value="">Empty</option>{options.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.team}</option>)}</select></article>; })}</div>
        </div>
        <aside className={styles.benchPanel}>
          <div className={styles.panelHeading}><div><Users size={18} /><span>Bench</span></div><small>{bench.length} players</small></div>
          <div className={styles.benchList}>{bench.map((playerId) => { const player = lookup.get(playerId); return <div key={playerId}><PlayerBadge player={player} /><span>Rank {player?.searchRank ?? "—"}</span></div>; })}{!bench.length ? <div className={styles.emptyPanel}>No bench players yet.</div> : null}</div>
        </aside>
      </section>
    </>
  );
}

function MatchupsView({ league }: ViewProps) {
  const [week, setWeek] = useState(league.currentWeek);
  const rows = league.schedule.filter((matchup) => matchup.week === week);
  const team = (id: string) => league.teams.find((candidate) => candidate.id === id)!;
  return (
    <>
      <section className={styles.viewHeroCompact}><div><span>HEAD-TO-HEAD SCHEDULE</span><h1>Matchups</h1><p>Every regular-season pairing, result, and score in one weekly control surface.</p></div><select className={styles.weekSelect} value={week} onChange={(event) => setWeek(Number(event.target.value))}>{Array.from({ length: league.settings.regularSeasonWeeks }, (_, index) => <option key={index + 1} value={index + 1}>Week {index + 1}</option>)}</select></section>
      <section className={styles.matchupGrid}>{rows.map((matchup) => { const home = team(matchup.homeTeamId); const away = team(matchup.awayTeamId); const homeWon = matchup.complete && Number(matchup.homeScore) > Number(matchup.awayScore); const awayWon = matchup.complete && Number(matchup.awayScore) > Number(matchup.homeScore); return <article key={matchup.id}><div className={homeWon ? styles.matchupWinner : undefined}><span>{home.abbreviation}</span><div><strong>{home.name}</strong><small>{home.ownerName}</small></div><b>{matchup.homeScore ?? "—"}</b></div><i>WEEK {week}</i><div className={awayWon ? styles.matchupWinner : undefined}><span>{away.abbreviation}</span><div><strong>{away.name}</strong><small>{away.ownerName}</small></div><b>{matchup.awayScore ?? "—"}</b></div><footer>{matchup.complete ? "FINAL" : league.status === "setup" || league.status === "drafting" ? "LOCKED UNTIL DRAFT" : "UPCOMING"}</footer></article>; })}</section>
    </>
  );
}

function PlayersView({ league, myTeam, players, mutateLeague }: ViewProps) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<"ALL" | Position>("ALL");
  const [dropId, setDropId] = useState("");
  const [bid, setBid] = useState(5);
  const owned = new Set(league.teams.flatMap((team) => team.roster));
  const lookup = new Map(players.map((player) => [player.id, player]));
  const results = players.filter((player) => position === "ALL" || player.position === position).filter((player) => !query || `${player.name} ${player.team} ${player.position}`.toLowerCase().includes(query.toLowerCase())).sort((left, right) => left.searchRank - right.searchRank).slice(0, 220);

  function addPlayer(player: FantasyPlayer) {
    if (owned.has(player.id)) return;
    if (league.status === "in_season") {
      mutateLeague((current) => submitWaiver(current, { teamId: myTeam.id, addPlayerId: player.id, dropPlayerId: dropId || null, bid: Math.max(0, Math.min(myTeam.faab, bid)), priority: current.waiverClaims.length + 1 }));
      return;
    }
    if (myTeam.roster.length >= league.settings.rosterSize) return;
    mutateLeague((current) => ({ ...current, teams: current.teams.map((team) => team.id === myTeam.id ? { ...team, roster: [...team.roster, player.id] } : team), activity: [activity("roster", `${myTeam.name} added ${player.name}.`), ...current.activity] }));
  }

  return (
    <>
      <section className={styles.viewHeroCompact}><div><span>PLAYER MARKET</span><h1>Players</h1><p>Search the live NFL player pool, inspect ownership, and submit FAAB claims.</p></div><div className={styles.marketReceipt}><strong>{players.length}</strong><span>players loaded</span><small>Sleeper read-only player directory with daily cache</small></div></section>
      <section className={styles.marketControls}><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or team" /></label><select value={position} onChange={(event) => setPosition(event.target.value as "ALL" | Position)}><option value="ALL">All positions</option>{POSITION_ORDER.map((item) => <option key={item}>{item}</option>)}</select><select value={dropId} onChange={(event) => setDropId(event.target.value)}><option value="">No drop selected</option>{myTeam.roster.map((playerId) => <option key={playerId} value={playerId}>Drop {lookup.get(playerId)?.name ?? playerId}</option>)}</select><label className={styles.bidInput}>FAAB<input type="number" min={0} max={myTeam.faab} value={bid} onChange={(event) => setBid(Number(event.target.value))} /></label></section>
      <section className={styles.marketTable}><div className={styles.playerTableHeader}><span>RK</span><span>Player</span><span>Pos</span><span>Team</span><span>Status</span><span /></div>{results.map((player) => { const owner = league.teams.find((team) => team.roster.includes(player.id)); const disabled = Boolean(owner) || league.status === "drafting" || (myTeam.roster.length >= league.settings.rosterSize && !dropId); return <div key={player.id}><span>{player.searchRank}</span><strong>{player.name}</strong><b className={styles[`position_${player.position}`]}>{player.position}</b><span>{player.team}</span><span>{owner ? owner.abbreviation : "FREE"}</span><button disabled={disabled} onClick={() => addPlayer(player)}>{owner ? "Rostered" : league.status === "in_season" ? "Claim" : "Add"}</button></div>; })}</section>
    </>
  );
}

function WaiversView({ league, myTeam, players, mutateLeague }: ViewProps) {
  const lookup = new Map(players.map((player) => [player.id, player]));
  const claims = [...league.waiverClaims].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  function cancel(claimId: string) { mutateLeague((current) => ({ ...current, waiverClaims: current.waiverClaims.map((claim) => claim.id === claimId && claim.status === "pending" ? { ...claim, status: "cancelled" as const } : claim) })); }
  return (
    <>
      <section className={styles.viewHeroCompact}><div><span>FAAB CLAIM CENTER</span><h1>Waivers</h1><p>Claims process when the commissioner advances the week. Highest bid wins; ties break by queue priority.</p></div><div className={styles.walletCard}><WalletCards size={22} /><strong>${myTeam.faab}</strong><span>remaining budget</span></div></section>
      <section className={styles.claimGrid}>{claims.length ? claims.map((claim) => { const team = league.teams.find((candidate) => candidate.id === claim.teamId); const add = lookup.get(claim.addPlayerId); const drop = claim.dropPlayerId ? lookup.get(claim.dropPlayerId) : null; return <article key={claim.id}><div className={styles.claimStatus}><span className={styles[`claim_${claim.status}`]}>{claim.status}</span><b>${claim.bid}</b></div><h2>{add?.name ?? claim.addPlayerId}</h2><p>{team?.name} · Add {add?.position} {add?.team}{drop ? ` · Drop ${drop.name}` : ""}</p><small>{formatDate(claim.createdAt)} · Priority {claim.priority}</small>{claim.teamId === myTeam.id && claim.status === "pending" ? <button onClick={() => cancel(claim.id)}><X size={15} /> Cancel claim</button> : null}</article>; }) : <div className={styles.largeEmpty}><ListChecks size={38} /><strong>No waiver claims yet.</strong><p>Use the Players market to submit the first claim.</p><Link href="/nullworks-fantasy-league/players">Open player market</Link></div>}</section>
    </>
  );
}

function TradesView({ league, myTeam, players, mutateLeague, account }: ViewProps) {
  const lookup = new Map(players.map((player) => [player.id, player]));
  const [partnerId, setPartnerId] = useState(league.teams.find((team) => team.id !== myTeam.id)?.id ?? "");
  const partner = league.teams.find((team) => team.id === partnerId);
  const [offerId, setOfferId] = useState("");
  const [requestId, setRequestId] = useState("");

  function propose(event: FormEvent) {
    event.preventDefault();
    if (!partnerId || !offerId || !requestId) return;
    mutateLeague((current) => proposeTrade(current, { fromTeamId: myTeam.id, toTeamId: partnerId, offerPlayerIds: [offerId], requestPlayerIds: [requestId] }));
    setOfferId(""); setRequestId("");
  }

  const canResolve = league.commissionerAccountId === account.id;
  return (
    <>
      <section className={styles.viewHeroCompact}><div><span>FRANCHISE NEGOTIATION</span><h1>Trade Center</h1><p>Build offers, route them to another team, and preserve the complete transaction state.</p></div><MessageSquareText size={48} /></section>
      <section className={styles.tradeWorkspace}>
        <form className={styles.tradeBuilder} onSubmit={propose}>
          <div className={styles.panelHeading}><div><RefreshCw size={18} /><span>Build trade</span></div><small>one-for-one beta</small></div>
          <label>Trade partner<select value={partnerId} onChange={(event) => { setPartnerId(event.target.value); setRequestId(""); }}>{league.teams.filter((team) => team.id !== myTeam.id).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <div className={styles.tradeSides}>
            <label>You send<select value={offerId} onChange={(event) => setOfferId(event.target.value)}><option value="">Choose player</option>{myTeam.roster.map((playerId) => <option key={playerId} value={playerId}>{playerLabel(lookup.get(playerId))}</option>)}</select></label>
            <Swords size={24} />
            <label>You request<select value={requestId} onChange={(event) => setRequestId(event.target.value)}><option value="">Choose player</option>{partner?.roster.map((playerId) => <option key={playerId} value={playerId}>{playerLabel(lookup.get(playerId))}</option>)}</select></label>
          </div>
          <button className={styles.primaryButton} type="submit" disabled={!offerId || !requestId}><ArrowRight size={17} /> Send proposal</button>
        </form>

        <div className={styles.tradeLedger}>
          <div className={styles.panelHeading}><div><ListChecks size={18} /><span>Trade ledger</span></div><small>{league.trades.length} proposals</small></div>
          {league.trades.length ? [...league.trades].reverse().map((trade) => { const from = league.teams.find((team) => team.id === trade.fromTeamId); const to = league.teams.find((team) => team.id === trade.toTeamId); return <article key={trade.id}><div><span className={styles[`claim_${trade.status}`]}>{trade.status}</span><small>{formatDate(trade.createdAt)}</small></div><h3>{from?.name} ↔ {to?.name}</h3><p><b>{trade.offerPlayerIds.map((id) => lookup.get(id)?.name ?? id).join(", ")}</b><i>for</i><b>{trade.requestPlayerIds.map((id) => lookup.get(id)?.name ?? id).join(", ")}</b></p>{trade.status === "pending" && canResolve ? <footer><button onClick={() => mutateLeague((current) => resolveTrade(current, trade.id, true))}><Check size={15} /> Accept</button><button onClick={() => mutateLeague((current) => resolveTrade(current, trade.id, false))}><X size={15} /> Reject</button></footer> : null}</article>; }) : <div className={styles.emptyPanel}>No trade proposals yet.</div>}
        </div>
      </section>
    </>
  );
}

function LeagueView({ league, myTeam, account, mutateLeague }: ViewProps & { database?: FantasyDatabase }) {
  const table = standings(league);
  return (
    <>
      <section className={styles.viewHeroCompact}><div><span>LEAGUE OFFICE</span><h1>{league.name}</h1><p>Invite code <b>{league.code}</b> · {league.season} season · {league.teams.length} teams · {league.settings.playoffTeams} playoff berths</p></div><div className={styles.inviteCode}><span>Invite code</span><strong>{league.code}</strong></div></section>
      <section className={styles.leagueGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}><div><Trophy size={18} /><span>Standings</span></div><small>PF tiebreaker</small></div>
          <div className={styles.fullStandings}><div className={styles.standingsHeader}><span>RK</span><span>Team</span><span>W-L-T</span><span>PF</span><span>PA</span><span>FAAB</span></div>{table.map((team, index) => <div key={team.id} className={team.id === myTeam.id ? styles.highlightRow : undefined}><span>{index + 1}</span><strong>{team.name}<small>{team.ownerName}{team.isBot ? " · OI" : ""}</small></strong><b>{team.wins}-{team.losses}-{team.ties}</b><span>{team.pointsFor.toFixed(1)}</span><span>{team.pointsAgainst.toFixed(1)}</span><span>${team.faab}</span></div>)}</div>
        </article>
        <aside className={styles.leagueSidebar}>
          <article className={styles.panel}><div className={styles.panelHeading}><div><Settings size={18} /><span>League settings</span></div></div><dl className={styles.settingsList}><div><dt>Scoring</dt><dd>Full PPR</dd></div><div><dt>Draft</dt><dd>Snake · {league.settings.draftRounds} rounds</dd></div><div><dt>Lineup</dt><dd>QB · 2 RB · 2 WR · TE · FLEX · K · DEF</dd></div><div><dt>Waivers</dt><dd>$100 FAAB</dd></div><div><dt>Season</dt><dd>{league.settings.regularSeasonWeeks} regular weeks</dd></div><div><dt>Playoffs</dt><dd>{league.settings.playoffTeams} teams</dd></div></dl></article>
          <article className={styles.panel}><div className={styles.panelHeading}><div><Users size={18} /><span>Members</span></div></div><div className={styles.memberList}>{league.teams.map((team) => <div key={team.id}><span style={{ background: team.color }}>{team.abbreviation}</span><p><strong>{team.ownerName}</strong><small>{team.name}</small></p>{team.isBot ? <Bot size={16} /> : team.ownerAccountId === account.id ? <CircleUserRound size={16} /> : <Users size={16} />}</div>)}</div></article>
        </aside>
      </section>
    </>
  );
}

function CommissionerView({ league, account, players, mutateLeague }: ViewProps) {
  const commissioner = league.commissionerAccountId === account.id;
  const [confirmReset, setConfirmReset] = useState(false);
  function begin() { mutateLeague((current) => autoDraftUntilHuman(startDraft(current), players, account.id)); }
  function fillDraft() { mutateLeague((current) => { let next = current; let guard = 0; while (next.status === "drafting" && !next.draft.completed && guard < 500) { const team = next.teams.find((candidate) => candidate.id === currentDraftTeamId(next)); const pool = availablePlayers(next, players).sort((a, b) => playerValue(b, team) - playerValue(a, team)); if (!pool[0]) break; next = makeDraftPick(next, pool[0], true); guard += 1; } return { ...next, teams: next.teams.map((team) => optimizeTeam(team, players)) }; }); }
  function reset() { mutateLeague((current) => { const fresh = createLeague(account, { name: current.name, teamCount: current.settings.teamCount }); return { ...fresh, id: current.id, code: current.code, createdAt: current.createdAt }; }); setConfirmReset(false); }
  return (
    <>
      <section className={styles.viewHeroCompact}><div><span>COMMISSIONER CONTROL</span><h1>League operations</h1><p>Consequential actions are explicit, visible, and written into the league state.</p></div><Crown size={50} /></section>
      {!commissioner ? <section className={styles.largeEmpty}><ShieldCheck size={38} /><strong>Commissioner access only.</strong><p>{league.teams.find((team) => team.ownerAccountId === league.commissionerAccountId)?.ownerName ?? "The league commissioner"} owns these controls.</p></section> : (
        <section className={styles.commissionerGrid}>
          <article><div><DraftingCompass size={27} /><span>Draft operations</span></div><h2>{league.draft.completed ? "Draft finalized" : league.draft.started ? `Pick ${league.draft.currentPick} active` : "Draft not started"}</h2><p>Open the draft room or force the remaining teams through the best-value OI draft engine.</p><footer>{league.status === "setup" ? <button onClick={begin}><Play size={16} /> Start draft</button> : null}{league.status === "drafting" ? <button onClick={fillDraft}><Bot size={16} /> Finish full draft</button> : null}</footer></article>
          <article><div><Gauge size={27} /><span>Week engine</span></div><h2>Week {league.currentWeek}</h2><p>Optimize every lineup, process FAAB claims, simulate player outcomes, finalize every matchup, and update standings.</p><footer><button disabled={league.status !== "in_season"} onClick={() => mutateLeague((current) => simulateCurrentWeek(current, players))}><Zap size={16} /> Simulate + advance week</button></footer></article>
          <article><div><BarChart3 size={27} /><span>Season state</span></div><h2>{league.status.replace("_", " ")}</h2><p>{league.schedule.filter((matchup) => matchup.complete).length} matchups finalized · {league.waiverClaims.filter((claim) => claim.status === "pending").length} pending claims · {league.trades.filter((trade) => trade.status === "pending").length} pending trades.</p><footer><Link href="/nullworks-fantasy-league/matchups">Review schedule <ArrowRight size={15} /></Link></footer></article>
          <article className={styles.dangerCard}><div><RefreshCw size={27} /><span>Reset league</span></div><h2>Return to setup</h2><p>Erase the draft, rosters, scores, transactions, and standings while preserving the league identity and invite code.</p><footer>{confirmReset ? <><button onClick={reset}>Confirm reset</button><button onClick={() => setConfirmReset(false)}>Cancel</button></> : <button onClick={() => setConfirmReset(true)}>Arm reset</button>}</footer></article>
        </section>
      )}
    </>
  );
}

function ViewRouter(props: ViewProps & { view: AppView }) {
  switch (props.view) {
    case "draft": return <DraftView {...props} />;
    case "team": return <TeamView {...props} />;
    case "matchups": return <MatchupsView {...props} />;
    case "players": return <PlayersView {...props} />;
    case "waivers": return <WaiversView {...props} />;
    case "trades": return <TradesView {...props} />;
    case "league": return <LeagueView {...props} />;
    case "commissioner": return <CommissionerView {...props} />;
    default: return <DashboardView {...props} />;
  }
}

export default function FantasyApp({ view = "dashboard" }: { view?: AppView }) {
  const [ready, setReady] = useState(false);
  const [database, setDatabase] = useState<FantasyDatabase>(blankDatabase());
  const [players, setPlayers] = useState<FantasyPlayer[]>([]);
  const [playerSource, setPlayerSource] = useState("Loading NFL directory…");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setDatabase(readDatabase());
    setReady(true);
    fetch("/api/nullworks-fantasy/players")
      .then((response) => response.json())
      .then((payload) => { setPlayers(payload.players ?? []); setPlayerSource(payload.source ?? "NFL player directory"); })
      .catch(() => setPlayerSource("Player directory unavailable"));
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  }, [database, ready]);

  if (!ready) return <LoadingScreen />;
  if (!database.activeAccountId) return <AuthGate onAuthenticated={setDatabase} />;

  const account = database.accounts.find((candidate) => candidate.id === database.activeAccountId);
  if (!account) return <AuthGate onAuthenticated={setDatabase} />;
  const league = database.leagues.find((candidate) => candidate.id === database.currentLeagueId);
  if (!league) return <EmptyLeague account={account} database={database} setDatabase={setDatabase} />;
  const activeLeague = league;
  const myTeam = getMyTeam(activeLeague, account.id);

  function mutateLeague(updater: (league: FantasyLeague) => FantasyLeague) {
    setDatabase((current) => updateLeague(current, activeLeague.id, updater));
  }

  function logout() {
    setDatabase((current) => ({ ...current, activeAccountId: null }));
  }

  return (
    <main className={styles.appPage}>
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarBrand}><div className={styles.logoMark}>NFL</div><div><span>NULLWORKS</span><strong>Fantasy League</strong></div><button onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
        <div className={styles.leagueSwitcher}><span>Active league</span><select value={league.id} onChange={(event) => setDatabase((current) => ({ ...current, currentLeagueId: event.target.value }))}>{database.leagues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><StatusPill status={league.status} /></div>
        <nav>{NAV.map((item) => { const Icon = item.icon; return <Link key={item.view} href={`/nullworks-fantasy-league/${item.view}`} onClick={() => setMenuOpen(false)} className={view === item.view ? styles.activeNav : undefined}><Icon size={18} /><span>{item.label}</span>{view === item.view ? <ChevronRight size={15} /> : null}</Link>; })}</nav>
        <div className={styles.sidebarReceipt}><i /><div><strong>Player data online</strong><span>{playerSource}</span></div></div>
        <div className={styles.userCard}><div>{account.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</div><p><strong>{account.name}</strong><span>{myTeam.name}</span></p><button onClick={logout} title="Sign out"><LogOut size={17} /></button></div>
      </aside>

      <div className={styles.mobileHeader}><button onClick={() => setMenuOpen(true)}><Menu size={21} /></button><div><span>NULLWORKS</span><strong>Fantasy League</strong></div><StatusPill status={league.status} /></div>
      {menuOpen ? <button className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} aria-label="Close navigation" /> : null}

      <section className={styles.appContent}>
        <ViewRouter view={view} league={league} myTeam={myTeam} account={account} players={players} mutateLeague={mutateLeague} />
        <footer className={styles.appFooter}><span>NULLWORKS Fantasy League · local-first operating build</span><strong>Data source: {playerSource}</strong></footer>
      </section>
    </main>
  );
}
