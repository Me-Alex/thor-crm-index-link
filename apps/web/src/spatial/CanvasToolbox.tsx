const tools = ["Select", "Search", "Saved", "Links", "Settings"];

export function CanvasToolbox() {
  return (
    <nav className="canvas-toolbox" aria-label="Canvas tools">
      {tools.map((tool, index) => (
        <button key={tool} type="button" className={index === 0 ? "is-active" : ""}>
          {tool}
        </button>
      ))}
    </nav>
  );
}
