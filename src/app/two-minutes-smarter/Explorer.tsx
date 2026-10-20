'use client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Clock3, Globe2, Headphones, Mail, Music2, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { Lesson } from '@/lib/two-minutes-smarter/lessons';
import styles from './page.module.css';

type Props = { entries: Lesson[]; newsletterEnabled: boolean };

export default function Explorer({entries,newsletterEnabled}: Props){
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All');
  const [opened,setOpened]=useState<string[]>([]);
  const [quizShown,setQuizShown]=useState<string[]>([]);
  const [email,setEmail]=useState('');
  const [website,setWebsite]=useState('');
  const [consent,setConsent]=useState(false);
  const [signup,setSignup]=useState<'idle'|'sending'|'sent'|'failed'>('idle');
  const [error,setError]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const categories=['All',...Array.from(new Set(entries.map(x=>x.category)))];
  const filtered=useMemo(()=>entries
    .filter(x=>category==='All'||x.category===category)
    .filter(x=>[x.title,x.location,x.teaser,x.intro,x.category,x.genre,...x.tags,...x.facts.flatMap(y=>[y.label,y.text])].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b)=>b.day-a.day),[entries,category,query]);

  useEffect(()=>{
    if(new URLSearchParams(window.location.search).get('signup')==='confirmed') setConfirmed(true);
    const hash=decodeURIComponent(window.location.hash.slice(1));
    if(hash&&entries.some(e=>e.slug===hash)) setOpened(prev=>[...new Set([...prev,hash])]);
  },[entries]);
  function toggle(slug:string){ setOpened(prev=>prev.includes(slug)?prev.filter(x=>x!==slug):[...prev,slug]); }
  async function subscribe(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!newsletterEnabled||signup==='sending') return;
    setSignup('sending');setError('');
    try{
      const r=await fetch('/api/two-minutes-smarter/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,consent,website})});
      const body=await r.json();
      if(!r.ok) throw new Error(body.error||'Could not request subscription.');
      setSignup('sent');setEmail('');
    }catch(err){setSignup('failed');setError(err instanceof Error?err.message:'Could not request subscription.');}
  }
  return <main className={styles.page}>
    <div className={styles.container}>
      <header className={styles.topbar}>
        <a href="/" className={styles.logo}><span className={styles.logoMark}>2<span>m</span>.</span><span className={styles.logoText}>A NULLWORKS<br/>LEARNING EXPERIMENT</span></a>
        <a href="#learn" className={styles.topLink}>Explore lessons <ArrowUpRight size={15}/></a>
      </header>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroWords}>
          <div className={styles.eyebrow}><span className={styles.liveDot}/>YOUR DAILY DOSE OF CURIOSITY</div>
          <h1 id="hero-title">A little<br/><em>smarter.</em><br/>Every day.</h1>
          <p className={styles.heroDeck}>The world is a fascinating place. Give us two minutes and we’ll show you something worth knowing.</p>
          <div className={styles.heroActions}><a href="#learn" className={styles.primary}>Start learning <ArrowRight size={18}/></a><a href="#newsletter" className={styles.secondary}>Get the daily email <Mail size={16}/></a></div>
          <div className={styles.microfacts}><span><BookOpen size={16}/> Five facts</span><span><Clock3 size={16}/> Two minutes</span><span><Music2 size={16}/> One original song</span></div>
        </div>
        <div className={styles.heroGraphic} aria-label="Illustration of geography, music, and curiosity">
          <div className={`${styles.orbit} ${styles.orbitOne}`} /><div className={`${styles.orbit} ${styles.orbitTwo}`} />
          <span className={`${styles.orbLabel} ${styles.orbTop}`}>THE WORLD IS<br/>YOUR CLASSROOM ↗</span>
          <div className={styles.globe}><div className={styles.globeLineV}/><div className={styles.globeLineH}/><span>🌍</span></div>
          <div className={styles.musicNote}>♫</div><div className={styles.starOne}>✳</div><div className={styles.starTwo}>✳</div>
          <span className={`${styles.orbLabel} ${styles.orbBottom}`}>KNOW SOMETHING<br/>YOU DIDN’T YESTERDAY.</span>
        </div>
      </section>
      <section className={styles.stats} aria-label="The format"><div><strong>01</strong><span>NEW SUBJECT<br/>EVERY DAY</span></div><div><strong>05</strong><span>FACTS YOU'LL<br/>ACTUALLY REMEMBER</span></div><div><strong>02</strong><span>MINUTES TO<br/>LEARN SOMETHING</span></div></section>
      <section className={styles.learn} id="learn">
        <div className={styles.sectionTop}><div><p className={styles.kicker}>THE KNOWLEDGE ARCHIVE</p><h2>Pick a curiosity.<br/><em>Follow it.</em></h2></div><p className={styles.sectionSub}>No accounts. No paywalls. Just a growing collection of interesting things about the world.</p></div>
        <div className={styles.searchBox}><Search size={22}/><input aria-label="Search lessons" placeholder="Search a country, volcanoes, horses..." value={query} onChange={e=>setQuery(e.target.value)}/>{query?<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={18}/></button>:<span className={styles.searchHint}>SEARCH ANYTHING</span>}</div>
        <div className={styles.filterBar}><div className={styles.filters}>{categories.map(c=><button key={c} className={category===c?styles.activeFilter:styles.filter} onClick={()=>setCategory(c)}>{c}</button>)}</div><span className={styles.count}>{filtered.length} {filtered.length===1?'lesson':'lessons'}</span></div>
        {!entries.length&&<div className={styles.empty}><Sparkles size={30}/><h3>Something good is coming.</h3><p>Our first five country lessons are in editorial review. The archive will appear here when they’re approved.</p></div>}
        {!!entries.length&&!filtered.length&&<div className={styles.empty}><Search size={30}/><h3>Nothing in the archive yet.</h3><p>Try another word. Curiosity takes a few detours.</p><button onClick={()=>{setQuery('');setCategory('All');}}>Show all lessons</button></div>}
        <div className={styles.lessonList}>
          {filtered.map(lesson=>{
            const isOpen=opened.includes(lesson.slug);const showAnswer=quizShown.includes(lesson.slug);
            return <article className={styles.lesson} id={lesson.slug} key={lesson.id}>
              <button type="button" className={styles.lessonHeader} aria-expanded={isOpen} aria-controls={`details-${lesson.slug}`} onClick={()=>toggle(lesson.slug)}>
                <div className={styles.flag} aria-hidden="true">{lesson.flag}</div>
                <div className={styles.lessonIdentity}><span className={styles.lessonKicker}>DAY {String(lesson.day).padStart(3,'0')} <span className={styles.midDot}>·</span> {lesson.category.toUpperCase()} <span className={styles.midDot}>·</span> {lesson.location.toUpperCase()}</span><h3>{lesson.title} <ArrowUpRight className={styles.headingArrow} size={21}/></h3><p>{lesson.teaser}</p><div className={styles.lessonTags}><span><Clock3 size={13}/> 2 MIN READ</span><span><Music2 size={13}/> {lesson.genre}</span>{lesson.status!=='published'&&<span className={styles.draftBadge}>EDITORIAL PREVIEW</span>}</div></div>
                <span className={`${styles.openCircle} ${isOpen?styles.opened:''}`}><ChevronDown size={22}/></span>
              </button>
              {isOpen&&<div className={styles.lessonContent} id={`details-${lesson.slug}`}>
                <div className={styles.articleText}><p className={styles.intro}>{lesson.intro}</p><ol className={styles.facts}>{lesson.facts.map((fact,i)=><li key={i}><span className={styles.factNumber}>{String(i+1).padStart(2,'0')}</span><div><h4>{fact.label}</h4><p>{fact.text}</p></div></li>)}</ol>
                <div className={styles.surprise}><span>💡 THE INTERESTING BIT</span><p>{lesson.surprise}</p></div>
                <div className={styles.takeaway}><strong>TAKE THIS WITH YOU</strong><p>{lesson.takeaway}</p></div>
                <div className={styles.quiz}><span className={styles.quizLabel}>ONE QUICK QUESTION</span><h4>{lesson.quiz}</h4>{showAnswer?<p className={styles.answer}><Check size={16}/>{lesson.answer}</p>:<button onClick={()=>setQuizShown(prev=>[...prev,lesson.slug])}>Reveal the answer <ArrowRight size={16}/></button>}</div>
                <div className={styles.sources}><strong>FURTHER READING</strong>{lesson.sources.map(s=><a href={s.url} key={s.url} target="_blank" rel="noreferrer">{s.label} <ArrowUpRight size={13}/></a>)}<p>Suggested reference links; these preview lessons await final source verification.</p></div>
                </div>
                <aside className={styles.songAside}><div className={styles.disc}><div className={styles.discCenter}>♫</div></div><span className={styles.trackEyebrow}>THE SOUNDTRACK</span><h4>{lesson.songTitle}</h4><p>{lesson.genre}</p>{lesson.songUrl?<audio preload="none" controls src={lesson.songUrl} aria-label={`Play ${lesson.songTitle}`}>Your browser does not support audio.</audio>:<div className={styles.songPending}><Headphones size={17}/> Original song in production</div>}
                <p className={styles.songNote}>Every lesson can have its own sound. We don't bend the facts to make the rhyme.</p><a className={styles.share} href={`#${lesson.slug}`} onClick={e=>{e.preventDefault();window.history.replaceState(null,'',`#${lesson.slug}`);navigator.clipboard?.writeText(window.location.href).catch(()=>{});}}>Copy lesson link ↗</a>
                </aside>
              </div>}
            </article>;
          })}
        </div>
      </section>
      <section className={styles.newsletter} id="newsletter"><div className={styles.newsletterInner}><div className={styles.newsLeft}><div className={styles.newsIcon}><Mail size={23}/></div><p className={styles.kicker}>DELIVERED TO YOUR INBOX</p><h2>Make curiosity<br/><em>a daily habit.</em></h2><p>Same five facts. Same little surprise. A new country (or dinosaur, or discovery) every day. And a song, when it's ready.</p><div className={styles.newsChecks}><span><Check size={16}/> One short email a day</span><span><Check size={16}/> Free, forever for the pilot</span><span><Check size={16}/> Unsubscribe whenever</span></div></div><div className={styles.newsRight}>{confirmed?<div className={styles.success}><Check size={28}/><h3>You're on the list.</h3><p>Subscription confirmed. Your first lesson will arrive when daily publishing begins.</p></div>:newsletterEnabled?<>{signup==='sent'?<div className={styles.success}><Check size={28}/><h3>Check your inbox.</h3><p>We sent a confirmation link. You're not subscribed until you confirm it.</p></div>:<form onSubmit={subscribe}><label htmlFor="tms-email">Your email address</label><input id="tms-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/><input className={styles.honeypot} tabIndex={-1} aria-hidden="true" name="website" value={website} onChange={e=>setWebsite(e.target.value)}/><label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>Send me the free daily Two Minutes Smarter email. I can unsubscribe at any time.</span></label><button disabled={signup==='sending'||!consent} type="submit">{signup==='sending'?'Sending confirmation...':'Count me in'} <ArrowRight size={18}/></button>{signup==='failed'&&<p role="alert" className={styles.formError}>{error}</p>}</form>}</>:<div className={styles.signupComing}><Sparkles size={24}/><h3>The daily email is on its way.</h3><p>We're preparing confirmed opt-in delivery. In the meantime, the lessons will always be free to read here.</p><span>SUBSCRIPTIONS OPEN AFTER FINAL TESTING</span></div>}<div className={styles.newsPrivacy}><ShieldCheck size={15}/> No spam. No selling your email. Just learning.</div></div></div></section>
      <footer className={styles.footer}><a href="/" className={styles.footMark}>2m.</a><div><strong>Two Minutes Smarter</strong><span>One curious human at a time.</span></div><a href="/privacy">Privacy</a><a href="/learn-it-loud">Our music-learning experiment ↗</a><span>© {new Date().getFullYear()} NULLWORKS</span></footer>
    </div>
  </main>;
}