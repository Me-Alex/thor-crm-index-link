import { useState } from "react";

const tools = ["Select", "Search", "Saved", "Links", "Settings"];

export function CanvasToolbox() {
  const [activeTool, setActiveTool] = useState(tools[0]);

  return (
    <nav className="canvas-toolbox" aria-label="Canvas tools">
      {tools.map((tool) => (
        <button
          key={tool}
          type="button"
          className={activeTool === tool ? "is-active" : ""}
          aria-pressed={activeTool === tool}
          onClick={() => setActiveTool(tool)}
        >
          {tool}
        </button>
      ))}
    </nav>
  );
}
