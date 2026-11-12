import type { Metadata } from 'next';
import SharedRoomClient from './SharedRoomClient';
import './shared-room.css';

export const metadata: Metadata = {
  title: 'PENUMBRA Shared | NULLWORKS',
  description: 'Private, member-only workroom for Mason, Jason and a governed AI participant.',
  robots: { index: false, follow: false },
};
export default function SharedRoomPage() { return <SharedRoomClient />; }
