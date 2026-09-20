export default function TinkerersRunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        .nw-public-quicknav { display: none !important; }
        body { padding-bottom: 0 !important; }
      `}</style>
      {children}
    </>
  );
}
