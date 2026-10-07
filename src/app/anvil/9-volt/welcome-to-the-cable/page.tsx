import type {Metadata} from "next";
import AnvilShell from "../../AnvilShell";
import ListeningPage from "../../ListeningPage";
const base="https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/9-volt/welcome-to-the-cable";
const coverSrc=`${base}/cover.png`;
const tracks=[{
  n:1,
  title:"WELCOME TO THE CABLE",
  src:`${base}/01-welcome-to-the-cable.mp3`,
  dur:"4:40",
  note:"Same little hole, different day. Europe made the law. Apple changed the plug. Then they announced it."
}];
export const metadata:Metadata={
  title:"9 VOLT — WELCOME TO THE CABLE // ANVIL",
  description:"9 VOLT single. One cable, one law, one stage. Welcome to the cable.",
  alternates:{canonical:"/anvil/9-volt/welcome-to-the-cable"},
  openGraph:{
    title:"9 VOLT — WELCOME TO THE CABLE",
    description:"Same little hole, different day. A 9 VOLT single preserved by NULLWORKS // ANVIL.",
    url:"https://nullworks.systems/anvil/9-volt/welcome-to-the-cable",
    siteName:"NULLWORKS // ANVIL",
    type:"music.song",
    images:[{url:coverSrc,width:1024,height:1024,alt:"9 VOLT — WELCOME TO THE CABLE"}]
  },
  twitter:{card:"summary_large_image",title:"9 VOLT — WELCOME TO THE CABLE",description:"Same little hole, different day.",images:[coverSrc]}
};
export default function Page(){
  return <AnvilShell accent="#e23b3b"><ListeningPage title="WELCOME TO THE CABLE" eyebrow="9 VOLT // SINGLE" description="They stood on a stage, held up a cable, and plugged the thing in. Ten years late. Same little hole. Welcome to the cable." accent="#e23b3b" background="linear-gradient(180deg,#14080a,#090909 48%,#050505)" coverSrc={coverSrc} tracks={tracks} footer="9 VOLT // WELCOME TO THE CABLE // NULLWORKS // ANVIL"/></AnvilShell>;
}
