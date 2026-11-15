import type { ButtonHTMLAttributes } from "react";
import { playSound } from "../../audio/sound";
import { vibrate } from "../../audio/haptics";

export function Button({ onClick, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`kit-button ${props.className ?? ""}`}
      onClick={(event) => {
        playSound("click");
        vibrate(8);
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
