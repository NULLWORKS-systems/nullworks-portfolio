import type { Metadata } from 'next';
import AccessPortalClient from './AccessPortalClient';
import '../shared/shared-room.css';

export const metadata: Metadata = {
  title: 'PENUMBRA Access Portal | NULLWORKS',
  description: 'Owner-only, room-scoped membership and invitations for PENUMBRA.',
  robots: { index: false, follow: false },
};

export default function PenumbraAccessPortalPage() {
  return <AccessPortalClient />;
}
