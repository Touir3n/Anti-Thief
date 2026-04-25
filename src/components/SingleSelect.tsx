import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';

interface SingleSelectProps {
  label: string;
  options: { label: string; value: string }[];
  selected: string;
  onChange: (selected: string) => void;
  className?: string;
}

export default function SingleSelect({ label, options, selected, onChange, className = '' }: SingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  const selectedOption = options.find(o => o.value === selected);
  const displayText = selectedOption ? toUpperCaseAccentFree(selectedOption.label) : label;

  return (
    <div className={`relative ${className || 'h-[42px] bg-white border border-slate-200 rounded-xl'}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-full min-h-[34px] px-2 sm:px-2.5 flex items-center justify-between outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-[11px] lg:text-[10px] xl:text-[11px] text-slate-700 uppercase ${!className?.includes('bg-') ? 'bg-white border border-slate-200 rounded-xl' : 'rounded-lg bg-white/90 border border-slate-200/60'}`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-4 h-4 ml-1 sm:ml-2 shrink-0 text-slate-400" />
      </button>
      
      {isOpen && (
        <div className="absolute z-[6000] mt-1 max-h-60 w-full lg:min-w-[160px] overflow-auto rounded-xl bg-white p-1 text-base shadow-lg border border-slate-200 focus:outline-none sm:text-sm custom-scrollbar">
          {options.length === 0 && (
            <div className="px-3 py-2 text-slate-500 text-xs text-center">{toUpperCaseAccentFree('ΔΕΝ ΥΠΑΡΧΟΥΝ ΕΠΙΛΟΓΕΣ')}</div>
          )}
          {options.map((option) => {
            const isSelected = selected === option.value;
            
            return (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center gap-2 cursor-pointer select-none rounded-lg py-2 px-3 hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
              >
                <div className={`flex items-center justify-center w-4 h-4 border rounded-full shrink-0 transition-colors ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                   {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <span className={`text-[10px] sm:text-xs font-medium text-slate-700 uppercase`}>
                  {toUpperCaseAccentFree(option.label)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
