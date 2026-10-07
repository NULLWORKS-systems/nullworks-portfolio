import type {Metadata} from "next";
import AnvilShell from "../../AnvilShell";
import ListeningPage from "../../ListeningPage";
const base="https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/9-volt/thursday-is-monday";
const coverSrc=`${base}/cover.png`;
const tracks=[{
  n:1,
  title:"THURSDAY IS MONDAY",
  src:`${base}/01-thursday-is-monday.mp3`,
  dur:"4:04",
  note:"Thursday is Monday. Tuesday is Friday. Wednesday's the weekend. Write it down."
}];
export const metadata:Metadata={
  title:"9 VOLT — THURSDAY IS MONDAY // ANVIL",
  description:"9 VOLT single. Thursday is Monday. Tuesday is Friday. Wednesday's the weekend.",
  alternates:{canonical:"/anvil/9-volt/thursday-is-monday"},
  openGraph:{
    title:"9 VOLT — THURSDAY IS MONDAY",
    description:"Thursday morning, the week begins. A 9 VOLT single preserved by NULLWORKS // ANVIL.",
    url:"https://nullworks.systems/anvil/9-volt/thursday-is-monday",
    siteName:"NULLWORKS // ANVIL",
    type:"music.song",
    images:[{url:coverSrc,width:1024,height:1024,alt:"9 VOLT — THURSDAY IS MONDAY"}]
  },
  twitter:{card:"summary_large_image",title:"9 VOLT — THURSDAY IS MONDAY",description:"Thursday is Monday. Tuesday is Friday. One day off.",images:[coverSrc]}
};
export default function Page(){
  return <AnvilShell accent="#e23b3b"><ListeningPage title="THURSDAY IS MONDAY" eyebrow="9 VOLT // SINGLE" description="Thursday morning, the week begins. Tuesday is Friday. Wednesday's the weekend. One day off. Don't make this hard." accent="#e23b3b" background="linear-gradient(180deg,#14080a,#090909 48%,#050505)" coverSrc={coverSrc} tracks={tracks} footer="9 VOLT // THURSDAY IS MONDAY // NULLWORKS // ANVIL"/></AnvilShell>;
}
