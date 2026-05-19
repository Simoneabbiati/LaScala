"use client";
import { useEffect, useRef, useState } from "react";

export type OperaResult = {
  id: string;
  title: string;
  composer: string | null;
  characters: { id: string; name: string; voiceType: string | null }[];
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (opera: OperaResult) => void;
  placeholder?: string;
  required?: boolean;
};

export default function OperaTitleInput({
  value,
  onChange,
  onSelect,
  placeholder,
  required,
}: Props) {
  const [suggestion, setSuggestion] = useState<OperaResult | null>(null);
  const [candidates, setCandidates] = useState<OperaResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSuggestion(null);
      setCandidates([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(
        `/api/operas/search?q=${encodeURIComponent(value)}`
      );
      const data: OperaResult[] = await res.json();
      setCandidates(data);
      const top = data[0] ?? null;
      const lower = value.toLowerCase();
      setSuggestion(
        top && top.title.toLowerCase().startsWith(lower) ? top : null
      );
      setShowDropdown(data.length > 0);
    }, 200);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ghost =
    suggestion && suggestion.title.toLowerCase().startsWith(value.toLowerCase())
      ? suggestion.title.slice(value.length)
      : "";

  const accept = (opera: OperaResult) => {
    onChange(opera.title);
    onSelect(opera);
    setSuggestion(null);
    setCandidates([]);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" || e.key === "ArrowRight") {
      if (ghost && suggestion) {
        e.preventDefault();
        accept(suggestion);
      }
    }
    if (e.key === "Enter" && suggestion) {
      e.preventDefault();
      accept(suggestion);
    }
    if (e.key === "Escape") {
      setSuggestion(null);
      setShowDropdown(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent"
    >
      {/* Ghost text layer — behind the input */}
      <div
        aria-hidden
        className="pointer-events-none select-none absolute inset-0 flex items-center px-3 text-sm overflow-hidden"
        style={{ fontFamily: "inherit", whiteSpace: "pre" }}
      >
        <span style={{ visibility: "hidden" }}>{value}</span>
        <span className="text-muted-foreground/40">{ghost}</span>
      </div>

      {/* Input — transparent so ghost shows through */}
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => candidates.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className="relative w-full bg-transparent px-3 py-2 text-sm outline-none"
        autoComplete="off"
      />

      {/* Dropdown with alternatives */}
      {showDropdown && candidates.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md text-sm overflow-hidden">
          {candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                accept(c);
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-baseline gap-2"
            >
              <span className="font-medium">{c.title}</span>
              {c.composer && (
                <span className="text-xs text-muted-foreground truncate">
                  {c.composer}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
