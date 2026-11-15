PROJECT: "Margins", a game for students. Players define a mission objective, design a robotic science mission (spacecraft bus, power, communications, onboard computer, attitude control, instruments, launch vehicle, orbit), manage six resources (mass, power, budget, data, communications, time), simulate it, and get a plain-English explanation of why it succeeded or failed. Solo mode first, then pass-and-play team mode for 2 to 4 players.
STACK: Vite + React + TypeScript for UI, Vitest for tests, plain CSS with CSS variables. Allowed dependencies ONLY: react, react-dom, three, astronomy-engine (runtime) and vite, typescript, vitest (dev). No other packages. No backend. Builds with "npm run build", deploys on Netlify (publish dir: dist).
ARCHITECTURE: All game rules live in /src/engine as pure TypeScript with NO React or DOM imports. Main functions: previewResources(design, scenario) and evaluate(design, scenario, seed). The UI only displays results. All game numbers live in JSON in /data. Real NASA event data (DONKI solar flares) is fetched by a script in /scripts into /data, never live in the game. Three.js only for the optional 3D spacecraft builder. Optional features sit behind on/off flags.
DATA HONESTY: Every number shown in the game is tagged "NASA-based" (with source) or "Game model". Never invent NASA facts. If unsure, add to docs/FACTS_TO_VERIFY.md.
LICENSING: Use only free or open-licensed images, fonts and sounds, and record attributions in README. Project license Apache-2.0.
WORKFLOW: Work in small steps. After each step tell me exactly how to test it, run the tests, then commit (one feature per commit, clear message). Explain what you did in 3 to 5 short lines. Do not copy code from other teams' repos. Keep files small and commented because two beginners must read them. Mobile friendly, keyboard accessible, plain English for students.

## GAME DESIGN STANDARDS

1. **Perfect information before commitment:** Show hazards and constraints before building. Use no hidden dice. Explain every failure as a design decision.
2. **No dominant strategy:** Every component must be the best choice in at least one situation. Every scenario needs at least 4 distinct winning archetypes. Justify balance changes with numbers in [docs/BALANCE_REPORT.md](docs/BALANCE_REPORT.md).
3. **Multiple score axes:** Score science, cost, margin, resilience, and schedule. Support optimization and replay beyond win or lose.
4. **Easy first solution:** Make the first crude solution easy. Add depth through optimization.
5. **Fast feedback:** Give feedback within 100 ms for every interaction through sound, motion, or number change. Make failure useful: show what broke and what fixes it.
6. **Honest figures:** Tag every figure as "NASA-based" or "Game model". Label comparisons "simulated designs", never "players".
7. **Accessible play:** Never rely on color alone. Respect reduced motion. Keep every interaction keyboard playable.
8. **Decision filter:** Cut any feature that does not change a decision.
