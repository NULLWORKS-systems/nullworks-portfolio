export type AnvilAlbum = {
  slug: string;
  title: string;
  note: string;
};

export type AnvilProject = {
  slug: string;
  name: string;
  kicker: string;
  summary: string;
  status: string;
  accent: string;
  accent2: string;
  texture: string;
  facts: string[];
  works?: string[];
  albums?: AnvilAlbum[];
};

export const projects: AnvilProject[] = [
  {
    slug: "9-volt",
    name: "9 VOLT",
    kicker: "REVERSE-DISCOGRAPHY HARD ROCK / PROTO-METAL",
    summary: "A band reconstructed backward through its own fictional history: mature hard rock first, then rougher records, found tapes, scavenged amplification and the systems accidents that become identity.",
    status: "ACTIVE CANON",
    accent: "#f6b73c",
    accent2: "#ff6b35",
    texture: "AMPLIFICATION / WIRE / TAPE",
    facts: ["1982: VEX LIKES SEX", "1978: HARRY PLOPPINS", "Reverse chronology is part of the composition method", "Physical imperfection beats generic polish"],
    works: ["VEX LIKES SEX", "HARRY PLOPPINS", "AMPLIFIED", "BURNING WIRE"],
  },
  {
    slug: "blood-pagoda",
    name: "BLOOD PAGODA",
    kicker: "1970 JAPANESE OCCULT ACID-DOOM",
    summary: "A one-album Japanese-language identity built from ritual patience, damaged amplification, classical ancestry and period occult weight rather than modern genre cosplay.",
    status: "ACTIVE CANON",
    accent: "#c246ff",
    accent2: "#7b1fa2",
    texture: "INCENSE / FEEDBACK / ORGAN",
    facts: ["Japanese language", "One-album identity", "1970 period frame", "Occult acid-doom with physical tape-era texture"],
    works: ["THE UNIVERSITY INCIDENT", "閉じた門 / The Closed Gate", "赤いランプ / The Red Lamp"],
  },
  {
    slug: "penny",
    name: "PENNY",
    kicker: "ELDERLY OUTLAW-COUNTRY STORYTELLER",
    summary: "A genuinely elderly-sounding female outlaw storyteller: very low natural register, enormous chest resonance and tobacco-scorched gravel, built from original vocal mechanics rather than imitation.",
    status: "ACTIVE ARTIST",
    accent: "#d7b46a",
    accent2: "#7b5a35",
    texture: "DUST / WOOD / OLD TAPE",
    facts: ["Approximately 75–85 sounding", "Very low natural register", "Chest-led delivery", "Story first, never novelty impersonation"],
  },
  {
    slug: "nan-violence",
    name: "NAN VIOLENCE",
    kicker: "ADULT GRANDMOTHER OUTLAW / COMEDY LANE",
    summary: "The adult grandmother lane: blunt, unruly and deliberately separate from the child-safe NAN WISDOM identity.",
    status: "ACTIVE ARTIST",
    accent: "#ff375f",
    accent2: "#6f001d",
    texture: "TRACKSUIT / PUB CARPET / BASS",
    facts: ["Adult lane", "Grandmother outlaw/comedy identity", "Not interchangeable with NAN WISDOM", "Separation is a canon rule"],
  },
  {
    slug: "nan-wisdom",
    name: "NAN WISDOM",
    kicker: "G-RATED GRANDMOTHER MUSIC",
    summary: "Funny, warm, tough family music for roughly 8–10-year-old listeners: school, manners, trying hard, kindness, common sense and practical granny advice without talking down to children.",
    status: "ACTIVE ARTIST / FAMILY",
    accent: "#5dd6c0",
    accent2: "#f0c75e",
    texture: "SWEETS / TRAINERS / SCHOOL RUN",
    facts: ["G-rated", "Audience centered around ages 8–10", "Respect, effort, kindness and practical advice", "Clearly separated from NAN VIOLENCE"],
  },
  {
    slug: "non-opera-italica",
    name: "NON OPERA ITALICA",
    kicker: "LATE-19TH-CENTURY LATIN INDUSTRIAL DOOM OPERA",
    summary: "A fictional Latin-language doom opera cycle about industrialization, carried by CARNIFICINA over pipe organ, tuba and low-brass walls, contrabasses and slow subterranean orchestral mass.",
    status: "ACTIVE CYCLE",
    accent: "#b11116",
    accent2: "#5d4b3c",
    texture: "IRON / STEAM / STONE",
    facts: ["Lead voice: CARNIFICINA", "Extremely low dramatic contralto", "No modern electronic foundation", "Industrialization told as physical orchestral weight"],
    works: ["TERRA RESPIRAT", "CARO MACHINAE", "TERRA MANET", "NOX ACCIPIT"],
    albums: [
      { slug: "non-opera-italica", title: "NON OPERA ITALICA", note: "Original twelve-movement industrial cycle" },
      { slug: "non-opera-italica-nox", title: "NOX ACCIPIT", note: "Night cycle. Eight movements." },
    ],
  },
  {
    slug: "non-opera-italica-nox",
    name: "NOX ACCIPIT",
    kicker: "NON OPERA ITALICA // NIGHT CYCLE",
    summary: "The night successor to NON OPERA ITALICA. Eight Latin movements for CARNIFICINA: the works go dark, the people enter, the moon takes flesh and does not look, labor continues without a witness, and night remains.",
    status: "ACTIVE CYCLE",
    accent: "#c4b48a",
    accent2: "#7a1c22",
    texture: "MOON / IRON / COLD STACK",
    facts: ["Lead voice: CARNIFICINA", "Eight-movement night cycle", "Latin industrial doom opera", "Sibling of NON OPERA ITALICA and SCHWEIZER DÜSTEROPER"],
    works: ["NOX ORITUR", "POPULUS INTRAT", "LUNA ACCIPIT", "LABOR CAECUS", "NOX SUPER URBEM", "LUNA NON VIDET", "FRIGUS OPERIS", "ET NOX MANET"],
  },
  {
    slug: "swiss-doom-opera",
    name: "SWISS DOOM OPERA",
    kicker: "LUCERNE / LUZERN · SWISS-GERMAN ORCHESTRAL DOOM",
    summary: "A historically grounded Lucerne-centered opera inheriting NON OPERA ITALICA's low orchestral mass, with long beautiful contralto sustains colliding against hard Swiss-German consonants.",
    status: "ACTIVE CYCLE",
    accent: "#d8d8d2",
    accent2: "#b51d24",
    texture: "STONE / WATER / LOW BRASS",
    facts: ["Swiss German / Lucerne dialect", "Low dramatic contralto", "Beauty-to-abrasion vocal mechanism", "Major movements generally tell 5–6 minute stories"],
    works: ["ÜBER DER REUSS", "IM STILLEN SEE", "DER BERG HAT KEINEN NAMEN", "DAS EIS BEWEGT SICH", "DER MENSCH WIRD MASS"],
  },
  {
    slug: "mountain-lords",
    name: "MOUNTAIN LORDS",
    kicker: "DARK GRUNGE / SLUDGE",
    summary: "Abrasive mountain-weight music about fatigue, isolation, abrasion and stubborn survival, kept deliberately rough rather than cosmetically polished.",
    status: "ACTIVE ARTIST",
    accent: "#9fa78f",
    accent2: "#4e5848",
    texture: "ROCK / COLD / AMP HUM",
    facts: ["Dark grunge / sludge", "Fatigue and isolation", "Abrasion and weight", "Stubborn survival without cosmetic polish"],
  },
  {
    slug: "harescramble",
    name: "HARESCRAMBLE",
    kicker: "BALKAN ALT-METAL / SKA",
    summary: "Fast, strange and communal: motion, mischief, endurance, racing, boating, memorial and odd human bonds held inside one high-energy artist system.",
    status: "ACTIVE ARTIST",
    accent: "#f3de54",
    accent2: "#2ba5a2",
    texture: "MUD / BRASS / ENGINE NOISE",
    facts: ["Balkan alt-metal / ska", "Motion and endurance", "Racing and boating", "Community, memorial and mischief"],
  },
  {
    slug: "silt-serpent",
    name: "SILT SERPENT",
    kicker: "FIELD RELEASE / OBJECT-LED SONG",
    summary: "An identity that starts from a physical object and forges a complete release around it: cover, lyrics, story, and a song people can actually hear.",
    status: "FIELD RELEASE",
    accent: "#c4a574",
    accent2: "#5c3d2e",
    texture: "SMOKE / LEATHER / COPPER LIGHT",
    facts: ["Object-led composition", "Field Release 001: NICARAGUAN", "Custom song as a normal custom product", "Cover, lyrics, story and master kept together"],
    works: ["NICARAGUAN"],
  },
  {
    slug: "limestone-kin",
    name: "LIMESTONE KIN",
    kicker: "HILL-COUNTRY NIGHT FOLK / ROCK",
    summary: "Porch-light songs from limestone country: church on the ridge, two guitars on the boards, and the hills keeping what the town forgot.",
    status: "ACTIVE ARTIST",
    accent: "#c4a36a",
    accent2: "#3d4a5c",
    texture: "LIMESTONE / LANTERN / PORCH WOOD",
    facts: ["Night hill-country identity", "Church-on-the-ridge visual contract", "Acoustic and electric in the same room", "The hills remember what people drop"],
    works: ["THE HILLS STILL KNOW"],
  },
  {
    slug: "crownrot",
    name: "CROWNROT",
    kicker: "ATHLETE SOUNDTRACK / MODERN METAL",
    summary: "Original music built from an athlete's competitive identity instead of borrowed third-party tracks. ARACHNID is the proof-of-concept soundtrack for Cooper Webb.",
    status: "ATHLETE SOUNDTRACK",
    accent: "#ff4d57",
    accent2: "#8a8f98",
    texture: "DIRT / STEEL / STADIUM LIGHT",
    facts: [
      "Independent proof of concept — not an official affiliation",
      "Music built FROM the athlete, not licensed onto the athlete",
      "Direct site playback without Spotify",
      "Custom soundtrack as brand architecture, not afterthought"
    ],
    works: ["ARACHNID", "KNUCKLES"],
  },
];

export const metaPages = [
  { slug: "artists", name: "ARTISTS", summary: "Distinct performer identities and their canon boundaries." },
  { slug: "projects", name: "PROJECTS", summary: "Operas, lineage experiments, one-off systems and active research worlds." },
  { slug: "releases", name: "RELEASES", summary: "Public catalog and release-facing surface for ANVIL output." },
  { slug: "labs", name: "LABS", summary: "Composition systems, FRANZ physical-source work, lineage tests and production experiments." },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function getArtistAlbums(slug: string) {
  const project = getProject(slug);
  if (project?.albums?.length) return project.albums;
  return project ? [{ slug: project.slug, title: project.name, note: project.kicker }] : [];
}
