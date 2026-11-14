import type { ReactNode } from "react";

export function Stamp({ children, tone = "pass" }: { children: ReactNode; tone?: "pass" | "fail" }) {
  return <div className={`kit-stamp kit-stamp-${tone}`}>{children}</div>;
}
