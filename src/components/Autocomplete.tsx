import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  suggestions,
  placeholder = "Type to search...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const cleanSuggestions = Array.from(
    new Set(
      suggestions
        .filter(s => s !== undefined && s !== null && s !== '')
        .map(String)
    )
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);
    if (val.trim().length >= 1) {
      const filtered = cleanSuggestions.filter(s =>
        s.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setIsOpen(true);
    } else {
      setFilteredSuggestions(cleanSuggestions);
      setIsOpen(true);
    }
  };

  const handleOpenDropdown = () => {
    setActiveIndex(-1);
    if (value.trim().length >= 1) {
      const filtered = cleanSuggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered.length > 0 ? filtered : cleanSuggestions);
      setIsOpen(true);
    } else {
      setFilteredSuggestions(cleanSuggestions);
      setIsOpen(true);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && cleanSuggestions.length > 0) {
        const filtered = value.trim().length >= 1
          ? cleanSuggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
          : cleanSuggestions;
        setFilteredSuggestions(filtered.length > 0 ? filtered : cleanSuggestions);
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[activeIndex]);
      } else if (filteredSuggestions.length === 1) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleOpenDropdown}
        onClick={handleOpenDropdown}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                index === activeIndex ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted"
              }`}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Autocomplete;
