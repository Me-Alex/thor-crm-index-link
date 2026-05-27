import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

export interface RadarSelectOption<TValue extends string = string> {
  label: string;
  value: TValue;
}

interface RadarSelectProps<TValue extends string = string> {
  label: string;
  value: TValue;
  options: Array<RadarSelectOption<TValue>>;
  onChange: (value: TValue) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function RadarSelect<TValue extends string = string>(props: RadarSelectProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectId = useId();
  const labelId = `${selectId}-label`;
  const listboxId = `${selectId}-listbox`;
  const selectedOption = props.options.find((option) => option.value === props.value);
  const selectedLabel = selectedOption?.label ?? props.placeholder ?? "Selecteaza";

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [isOpen]);

  const handleButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const rootClassName = ["radar-select", isOpen ? "is-open" : "", props.className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={rootClassName} ref={rootRef}>
      <span id={labelId} className="radar-select-label">
        {props.label}
      </span>
      <button
        type="button"
        className="radar-select-button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={`${labelId} ${selectId}-value`}
        aria-label={`${props.label}: ${selectedLabel}`}
        disabled={props.disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        onKeyDown={handleButtonKeyDown}
      >
        <span id={`${selectId}-value`} className="radar-select-value">
          {selectedLabel}
        </span>
        <span className="radar-select-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {isOpen ? (
        <div id={listboxId} className="radar-select-menu" role="listbox" aria-labelledby={labelId}>
          {props.options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === props.value}
              className={`radar-select-option${option.value === props.value ? " is-selected" : ""}`}
              data-value={option.value}
              onClick={() => {
                props.onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
