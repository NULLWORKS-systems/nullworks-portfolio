import type {Metadata} from "next";
import AnvilShell from "../../AnvilShell";
import ListeningPage from "../../ListeningPage";
const base="https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/9-volt/christmas-can-wait";
const coverSrc=`${base}/cover.png`;
const tracks=[
  {
    n:1,
    title:"DECEMBER STARTED IN OCTOBER",
    src:`${base}/01-december-started-in-october.mp3`,
    dur:"5:32",
    note:"December started in October, and that is bullshit. Put the fucking sleigh away.",
    artSrc:`${base}/01-art.png`
  },
  {
    n:2,
    title:"WHO ATE THE BATTERIES?",
    src:`${base}/02-who-ate-the-batteries.mp3`,
    dur:"5:06",
    note:"Six in the box, none in the house. Santa brought the toy, but he didn't bring the fucking power.",
    artSrc:`${base}/02-art.png`
  }
];
export const metadata:Metadata={
  title:"9 VOLT — CHRISTMAS CAN WAIT // ANVIL",
  description:"Christmas can wait. December started in October. A 9 VOLT holiday release building one song at a time.",
  alternates:{canonical:"/anvil/9-volt/christmas-can-wait"},
  openGraph:{
    title:"9 VOLT — CHRISTMAS CAN WAIT",
    description:"December started in October. Christmas can wait. A 9 VOLT album preserved by NULLWORKS // ANVIL.",
    url:"https://nullworks.systems/anvil/9-volt/christmas-can-wait",
    siteName:"NULLWORKS // ANVIL",
    type:"music.album",
    images:[{url:coverSrc,width:1200,height:1200,alt:"CHRISTMAS CAN WAIT by 9 VOLT"}]
  },
  twitter:{card:"summary_large_image",title:"9 VOLT — CHRISTMAS CAN WAIT",description:"December started in October. Christmas can wait.",images:[coverSrc]}
};
export default function Page(){
  return <AnvilShell accent="#e23b3b"><ListeningPage title="CHRISTMAS CAN WAIT" eyebrow="9 VOLT // HOLIDAY" description="December started in October. One song a day until Christmas can wait no longer. Two tracks live." accent="#e23b3b" background="linear-gradient(180deg,#14080a,#090909 48%,#050505)" coverSrc={coverSrc} tracks={tracks} footer="9 VOLT // CHRISTMAS CAN WAIT // NULLWORKS // ANVIL // 2026"/></AnvilShell>;
}
