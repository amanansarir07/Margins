import type { ReactNode } from "react";
import { useEffect } from "react";
import { vibrate } from "../../audio/haptics";
import { playSound } from "../../audio/sound";

export function Stamp({
  children,
  tone = "pass",
  sound = false,
}: {
  children: ReactNode;
  tone?: "pass" | "fail";
  sound?: boolean;
}) {
  useEffect(() => {
    if (!sound) return;
    playSound(tone === "pass" ? "success" : "fail");
    vibrate(35);
  }, [sound, tone]);

  return <div className={`kit-stamp kit-stamp-${tone}`}>{children}</div>;
}
