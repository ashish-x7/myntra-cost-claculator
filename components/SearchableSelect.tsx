import React, { useState, useRef, useEffect, useMemo } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  compact?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  className = '',
  placeholder = 'Select option...',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search on open / focus input
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(-1);
      // Delay slightly for render cycles to complete
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query)
    );
  }, [options, search]);

  // Adjust active index when filtered options change
  useEffect(() => {
    setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions]);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  // Keyboard navigation logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => {
          const nextIdx = prev + 1;
          return nextIdx >= filteredOptions.length ? 0 : nextIdx;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => {
          const nextIdx = prev - 1;
          return nextIdx < 0 ? filteredOptions.length - 1 : nextIdx;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          handleSelect(filteredOptions[activeIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Auto scroll logic to keep active index visible
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        const container = listRef.current;
        const activeTop = activeEl.offsetTop;
        const activeBottom = activeTop + activeEl.offsetHeight;
        const containerScrollTop = container.scrollTop;
        const containerHeight = container.offsetHeight;

        if (activeTop < containerScrollTop) {
          container.scrollTop = activeTop;
        } else if (activeBottom > containerScrollTop + containerHeight) {
          container.scrollTop = activeBottom - containerHeight;
        }
      }
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <div
        id={`searchable-select-trigger-${placeholder.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`flex items-center justify-between border cursor-pointer select-none transition-all duration-150 rounded-lg outline-none ${
          compact
            ? 'bg-slate-100/50 border-slate-200 px-1.5 py-1 text-[10px] font-normal text-slate-700'
            : 'bg-white border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-normal text-slate-800 shadow-sm'
        } ${isOpen ? 'ring-1 ring-slate-400' : 'focus:ring-1 focus:ring-slate-300'}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {/* Chevron Icon */}
        <div className={`text-slate-400 opacity-60 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className={compact ? "w-2 h-2 ml-1" : "w-2.5 h-2.5 ml-1"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          id={`searchable-select-dropdown-${placeholder.replace(/\s+/g, '-').toLowerCase()}`}
          className="absolute left-0 right-0 z-[100] mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col"
          style={{ minWidth: '180px', maxHeight: '280px' }}
        >
          {/* Search Input block */}
          <div className="p-1 px-1.5 border-b border-slate-100 bg-slate-50 flex items-center">
            {/* Search Icon */}
            <svg className="w-3 h-3 text-slate-400 mr-1 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="w-full bg-transparent outline-none border-none py-1 text-xs text-slate-700 font-normal placeholder:text-slate-400 leading-normal"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-400"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className="overflow-y-auto flex-1 py-1 max-h-[220px]">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-slate-400 font-normal italic text-center">
                No match found
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`px-3 py-1.5 text-xs text-left cursor-pointer transition-all duration-100 select-none ${
                      isSelected
                        ? 'bg-slate-700 text-white font-normal'
                        : isActive
                        ? 'bg-slate-100 text-slate-800 font-normal'
                        : 'text-slate-700 font-normal'
                    }`}
                  >
                    {opt.label}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
