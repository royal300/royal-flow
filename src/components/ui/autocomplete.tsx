import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  emptyValue?: string; // e.g. 'All' or '' when cleared/empty
}

export const Autocomplete = ({
  value,
  onChange,
  suggestions,
  placeholder = "Type to search...",
  className = "",
  emptyValue = ""
}: AutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Clean suggestions array, excluding empty string or nulls, and if emptyValue is 'All', we can keep or filter out 'All' from suggestions so typing searches actual values
  const cleanSuggestions = Array.from(
    new Set(
      suggestions
        .filter(s => s !== undefined && s !== null && s !== '' && s !== 'All')
        .map(String)
    )
  );

  const displayValue = (value === 'All' || value === emptyValue) ? '' : value;

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
    if (val === '') {
      onChange(emptyValue);
      setFilteredSuggestions(cleanSuggestions);
      setIsOpen(true);
    } else {
      onChange(val);
      setActiveIndex(-1);
      const filtered = cleanSuggestions.filter(s =>
        s.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setIsOpen(true);
    }
  };

  const handleOpenDropdown = () => {
    setActiveIndex(-1);
    const query = displayValue.trim();
    if (query.length >= 1) {
      const filtered = cleanSuggestions.filter(s =>
        s.toLowerCase().includes(query.toLowerCase())
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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(emptyValue);
    setFilteredSuggestions(cleanSuggestions);
    setActiveIndex(-1);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && cleanSuggestions.length > 0) {
        const filtered = displayValue.trim().length >= 1
          ? cleanSuggestions.filter(s => s.toLowerCase().includes(displayValue.toLowerCase()))
          : cleanSuggestions;
        if (filtered.length > 0) {
          e.preventDefault();
          setFilteredSuggestions(filtered);
          setIsOpen(true);
          setActiveIndex(e.key === "ArrowDown" ? 0 : filtered.length - 1);
        }
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
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Tab") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <Input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleOpenDropdown}
        onClick={handleOpenDropdown}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-background border border-input rounded-md shadow-sm h-9 pr-14 text-xs"
      />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {displayValue && (
          <div
            onClick={handleClear}
            className="cursor-pointer p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </div>
        )}
        <div
          onClick={() => {
            if (!isOpen) {
              handleOpenDropdown();
            } else {
              setIsOpen(false);
            }
          }}
          className="cursor-pointer p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
      {isOpen && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-auto">
          {emptyValue && (
            <div
              onClick={() => selectSuggestion(emptyValue)}
              className={cn(
                "px-3 py-2 text-xs cursor-pointer text-left transition-colors border-b",
                (value === emptyValue || value === '')
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
              )}
            >
              {emptyValue === 'All' ? 'All / Reset' : 'Clear selection'}
            </div>
          )}
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((s, idx) => (
              <div
                key={idx}
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  "px-3 py-2 text-xs cursor-pointer text-left transition-colors",
                  idx === activeIndex || value === s
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {s}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              No matching suggestions
            </div>
          )}
        </div>
      )}
    </div>
  );
};
