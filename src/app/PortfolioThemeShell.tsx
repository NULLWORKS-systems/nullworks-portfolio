"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import OscilloscopeBackground from "./receipt-wallet/OscilloscopeBackground";

const preservedVisualRoutes = [
  "/field-notes",
  "/ciris-proof",
  "/ciris-review",
];

const readableOscilloscopeRoutes = ["/tinkerers"];

const nativeOscilloscopeRoutes = [
  "/stallworks",
  "/receipt-wallet",
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export default function PortfolioThemeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const preserveVisualSystem = preservedVisualRoutes.some((prefix) => matchesPrefix(pathname, prefix));
  const alreadyOwnsOscilloscope = nativeOscilloscopeRoutes.some((prefix) => matchesPrefix(pathname, prefix));
  const readableScope = readableOscilloscopeRoutes.some((prefix) => matchesPrefix(pathname, prefix));

  if (preserveVisualSystem || alreadyOwnsOscilloscope) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen bg-[#020806] text-white" style={{ isolation: "isolate", backgroundColor: "#020806" }}>
      <OscilloscopeBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2]"
        style={{
          background: readableScope
            ? "linear-gradient(rgba(2,8,6,.78),rgba(2,8,6,.78)),radial-gradient(circle at 50% 18%,rgba(68,112,76,.06),transparent 31%),radial-gradient(circle at 50% 82%,rgba(38,77,49,.04),transparent 38%)"
            : "linear-gradient(rgba(2,8,6,.56),rgba(2,8,6,.56)),radial-gradient(circle at 50% 18%,rgba(68,112,76,.075),transparent 31%),radial-gradient(circle at 50% 82%,rgba(38,77,49,.045),transparent 38%)",
        }}
      />
      <div className="portfolio-theme-content relative z-[3] min-h-screen">{children}</div>
      <style jsx global>{`
        .portfolio-theme-content > main {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
}
