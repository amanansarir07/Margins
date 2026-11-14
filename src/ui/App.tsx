import { useReducer } from "react";
import { appReducer, initialState } from "./state";
import { TitleScreen } from "./TitleScreen";

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <main className="app">
      {state.screen === "title" ? (
        <TitleScreen onStartSolo={() => dispatch({ type: "START_SOLO" })} />
      ) : (
        <section className="placeholder-screen">
          <p>More mission screens are being assembled.</p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => dispatch({ type: "GO_TO", screen: "title" })}
          >
            Back to title
          </button>
        </section>
      )}
    </main>
  );
}
