import type { Metadata } from 'next';
import { publicLessons } from '@/lib/two-minutes-smarter/lessons';
import Explorer from './Explorer';
import { readyForSignup } from '@/lib/two-minutes-smarter/mailing';

export const metadata: Metadata = {
  title: 'Two Minutes Smarter — One little lesson every day',
  description: 'Five facts, one question, and an original song. Free two-minute lessons about the world and everything in it.',
  alternates: {canonical:'/two-minutes-smarter'},
  openGraph: {
    title:'Two Minutes Smarter',
    description:'A little smarter every day. Five facts. One song. Two minutes.',
    url:'https://nullworks.systems/two-minutes-smarter',
    siteName:'NULLWORKS',type:'website',
  },
};
export default function TwoMinutesSmarterPage(){
  return <Explorer entries={publicLessons()} newsletterEnabled={readyForSignup()} />;
}