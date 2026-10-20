/** TWO MINUTES SMARTER — Canonical lesson ledger.
 * These five starter entries are DRAFTS. Source URLs are suggested review leads,
 * not an assertion of live, independent verification. Publication requires approval.
 */
export type LessonStatus = 'draft' | 'approved' | 'published';
export type Lesson = {
  id: string; day: number; slug: string; title: string; flag: string;
  location: string; category: 'Countries' | 'Science' | 'History' | 'Dinosaurs';
  status: LessonStatus; date: string | null; genre: string; songTitle: string;
  songUrl: string | null; coverUrl: string | null;
  teaser: string; intro: string; facts: {label: string; text: string}[];
  surprise: string; takeaway: string; quiz: string; answer: string;
  tags: string[]; sources: {label: string; url: string}[];
};
export const lessons: Lesson[] = [
  {
    id:'TMS-001', day:1, slug:'mongolia', title:'Mongolia', flag:'🇲🇳', location:'Asia',
    category:'Countries', status:'draft', date:null, genre:'Ska-punk', songTitle:'The Horse, the Khan & the Steppe', songUrl:null, coverUrl:null,
    teaser:'Wide-open grasslands, powerful horses, and an empire that changed the world.',
    intro:'Mongolia is a huge country with big skies, long traditions, and an extraordinary history. Here are five things worth remembering.',
    facts:[
      {label:'Find it on a map', text:'Mongolia is in Asia, between Russia to the north and China to the south. It has no ocean coastline.'},
      {label:'Meet the capital', text:'The capital is Ulaanbaatar. It is the country’s largest city.'},
      {label:'Not all desert', text:'Mongolia has broad, grassy plains called steppes. The Gobi Desert stretches across much of its south.'},
      {label:'An enormous empire', text:'In 1206, Genghis Khan united Mongol groups and founded the Mongol Empire. His successors expanded it across much of Asia and into Europe.'},
      {label:'Moving with the herds', text:'Some Mongolian herding families move with their animals through the seasons and live in round portable homes called gers.'}
    ],
    surprise:'Mongolia has plenty of desert, but grasslands are also a major part of its landscape.',
    takeaway:'Mongolia is a landlocked Asian country known for its steppe, horse culture, and remarkable imperial history.',
    quiz:'Which two countries share a border with Mongolia?', answer:'Russia and China.',
    tags:['horses','genghis khan','steppe','gobi','asia'],
    sources:[{label:'Encyclopaedia Britannica — Mongolia',url:'https://www.britannica.com/place/Mongolia'}]
  },
  {
    id:'TMS-002', day:2, slug:'lesotho', title:'Lesotho', flag:'🇱🇸', location:'Africa',
    category:'Countries', status:'draft', date:null, genre:'Mountain bluegrass', songTitle:'The Kingdom in the Clouds', songUrl:null, coverUrl:null,
    teaser:'A mountain kingdom surrounded completely by another country.',
    intro:'Lesotho is a small nation with soaring mountains and a geographical trick that makes it easy to remember.',
    facts:[
      {label:'One remarkable border', text:'Lesotho is surrounded on every side by South Africa. It does not share a border with any other country.'},
      {label:'A mountain kingdom', text:'The country is mostly mountainous, with many villages set high above sea level.'},
      {label:'Meet the capital', text:'Maseru is Lesotho’s capital. It sits near the western border.'},
      {label:'Two official languages', text:'Sesotho and English are the country’s official languages.'},
      {label:'Independence', text:'Lesotho became independent from Britain in 1966. It is a constitutional monarchy.'}
    ],
    surprise:'Lesotho is one of the few independent countries on Earth completely surrounded by just one other country.',
    takeaway:'Lesotho is a mountainous African kingdom entirely enclosed by South Africa.',
    quiz:'Which country surrounds Lesotho?', answer:'South Africa.',
    tags:['mountains','south africa','africa','maseru','kingdom'],
    sources:[{label:'Encyclopaedia Britannica — Lesotho',url:'https://www.britannica.com/place/Lesotho'}]
  },
  {
    id:'TMS-003', day:3, slug:'nepal', title:'Nepal', flag:'🇳🇵', location:'Asia',
    category:'Countries', status:'draft', date:null, genre:'Orchestral rock', songTitle:'Higher Than the Clouds', songUrl:null, coverUrl:null,
    teaser:'The Himalayas, Mount Everest, and a flag unlike any other national flag.',
    intro:'Nepal stretches from warm lowlands to some of the highest mountains on Earth.',
    facts:[
      {label:'Between two neighbors', text:'Nepal is a landlocked country in Asia between India and China.'},
      {label:'Meet the capital', text:'Kathmandu is Nepal’s capital and an important cultural center.'},
      {label:'The highest summit', text:'Mount Everest sits on the Nepal–China border. It has Earth’s highest summit above sea level.'},
      {label:'A special flag', text:'Nepal’s national flag is made of two joined triangular shapes, unlike the usual rectangular national flags.'},
      {label:'Different landscapes', text:'The country includes southern plains, hills, valleys, and the high Himalayan mountains.'}
    ],
    surprise:'Nepal is the only country with a national flag that is not rectangular or square.',
    takeaway:'Nepal is a Himalayan country between India and China, home to Mount Everest and a distinctive flag.',
    quiz:'What makes Nepal’s national flag unusual?', answer:'It is made of two joined triangles rather than a rectangle.',
    tags:['himalayas','everest','flag','kathmandu','asia'],
    sources:[{label:'Encyclopaedia Britannica — Nepal',url:'https://www.britannica.com/place/Nepal'}]
  },
  {
    id:'TMS-004', day:4, slug:'suriname', title:'Suriname', flag:'🇸🇷', location:'South America',
    category:'Countries', status:'draft', date:null, genre:'Tropical funk', songTitle:'Rainforest Radio', songUrl:null, coverUrl:null,
    teaser:'A South American country with deep rainforests and Dutch as its official language.',
    intro:'Suriname may be easy to overlook on a world map, but it has a surprising mix of geography, languages, and cultures.',
    facts:[
      {label:'Find it on a map', text:'Suriname is on the northern coast of South America, beside the Atlantic Ocean.'},
      {label:'Meet the capital', text:'Its capital is Paramaribo, near the Suriname River.'},
      {label:'An unexpected language', text:'Dutch is the official language of Suriname, even though the country is in South America.'},
      {label:'Forest everywhere', text:'Tropical rainforest covers much of Suriname’s land.'},
      {label:'Independence', text:'Suriname became independent from the Netherlands in 1975.'}
    ],
    surprise:'A country in South America uses Dutch as its official language.',
    takeaway:'Suriname is a rainforest-rich South American country with a Dutch-speaking national government.',
    quiz:'What is Suriname’s official language?', answer:'Dutch.',
    tags:['dutch','rainforest','paramaribo','south america','atlantic'],
    sources:[{label:'Encyclopaedia Britannica — Suriname',url:'https://www.britannica.com/place/Suriname'}]
  },
  {
    id:'TMS-005', day:5, slug:'iceland', title:'Iceland', flag:'🇮🇸', location:'Europe',
    category:'Countries', status:'draft', date:null, genre:'Viking metal', songTitle:'Fire Beneath the Ice', songUrl:null, coverUrl:null,
    teaser:'Glaciers, volcanoes, and warmth that comes from beneath the ground.',
    intro:'Iceland is a North Atlantic island where ice and underground heat shape daily life.',
    facts:[
      {label:'An island nation', text:'Iceland is an island country in the North Atlantic Ocean, between Greenland and mainland Europe.'},
      {label:'Meet the capital', text:'Reykjavík is Iceland’s capital and largest city.'},
      {label:'Fire and ice', text:'Iceland has both glaciers and active volcanoes.'},
      {label:'Heat from Earth', text:'Geothermal energy—heat from underground—warms many Icelandic homes and buildings.'},
      {label:'An old assembly', text:'Iceland’s Alþingi parliament traces its beginning to the year 930.'}
    ],
    surprise:'In many Icelandic homes, hot water comes from geothermal heating rather than burning fuel in a household furnace.',
    takeaway:'Iceland is a volcanic North Atlantic island that uses underground heat and has a long parliamentary history.',
    quiz:'What is geothermal energy?', answer:'Energy from heat inside Earth.',
    tags:['volcanoes','glaciers','geothermal','reykjavik','europe'],
    sources:[{label:'Encyclopaedia Britannica — Iceland',url:'https://www.britannica.com/place/Iceland'}]
  }
];

/** Do not make editor drafts public merely because code exists in the repo. */
export function publicLessons(): Lesson[] {
  const showDrafts = process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_TMS_SHOW_DRAFTS === 'true';
  return lessons.filter(x => x.status === 'published' || showDrafts);
}

export function makeLinkedInPost(x: Lesson): string {
  return [
    `🌍 TWO MINUTES SMARTER — DAY ${String(x.day).padStart(3,'0')}`,
    `Today’s country: ${x.title} ${x.flag}`,'',x.intro,'',
    ...x.facts.flatMap((f,i)=>[`FACT ${i+1} — ${f.label.toUpperCase()}`,f.text,'']),
    `🤯 TODAY’S SURPRISE: ${x.surprise}`,'',
    `🎵 ${x.songTitle} (${x.genre}) — listen in the archive.`,'',
    `REMEMBER: ${x.takeaway}`,'',
    `QUIZ: ${x.quiz}`,'',
    `Read, listen and explore: https://nullworks.systems/two-minutes-smarter#${x.slug}`,'',
    '#TwoMinutesSmarter #LearnSomethingNew #Geography'
  ].join('\n');
}