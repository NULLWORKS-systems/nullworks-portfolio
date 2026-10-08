"use client";

import { useEffect } from "react";

export default function GroupResultsLink() {
  useEffect(() => {
    const id = "nw-group-results";
    const place = () => {
      if (document.getElementById(id)) return;
      const target = Array.from(document.querySelectorAll("b")).find((node) =>
        node.textContent?.includes("KEEP THE RECEIPTS"),
      );
      if (!target) return;
      const link = document.createElement("a");
      link.id = id;
      link.href = "/tinkerers/live";
      link.textContent = "SEE THE GROUP RESULTS";
      link.style.display = "block";
      link.style.marginTop = "22px";
      link.style.padding = "16px 18px";
      link.style.minHeight = "54px";
      link.style.borderRadius = "16px";
      link.style.background = "#d7ffe6";
      link.style.color = "#071311";
      link.style.fontWeight = "800";
      link.style.fontSize = "16px";
      link.style.textAlign = "center";
      link.style.textDecoration = "none";
      link.style.boxSizing = "border-box";
      target.insertAdjacentElement("afterend", link);
    };
    place();
    const observer = new MutationObserver(place);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
