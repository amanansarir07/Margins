interface TitleScreenProps {
  onStartSolo: () => void;
}

export function TitleScreen({ onStartSolo }: TitleScreenProps) {
  return (
    <section className="title-screen" aria-labelledby="game-title">
      <p className="eyebrow">NASA Space Apps 2026</p>
      <h1 id="game-title">Margins</h1>
      <p className="title-tagline">
        Mission trade-offs you can feel, not just read about.
      </p>
      <div className="title-actions">
        <button className="button button-primary" type="button" onClick={onStartSolo}>
          Solo mission
        </button>
        <button className="button button-muted" type="button" disabled>
          Team mode <span>Coming soon</span>
        </button>
        <button className="button button-muted" type="button" disabled>
          Sandbox <span>Coming soon</span>
        </button>
      </div>
    </section>
  );
}
