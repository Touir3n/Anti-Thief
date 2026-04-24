import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { toUpperCaseAccentFree } from '../lib/Typography';

interface MultiSelectProps {
  label: string;
  options: { label: string; value: string; isGroup?: boolean; indent?: boolean }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export default function MultiSelect({ label, options, selected, onChange, className = '' }: MultiSelectProps) {
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

  const toggleOption = (value: string, isGroup?: boolean) => {
    if (isGroup) {
      // Find all items in this group
      const groupIdx = options.findIndex(o => o.value === value);
      let itemsInGroup: string[] = [];
      for (let i = groupIdx + 1; i < options.length; i++) {
        if (options[i].isGroup) break;
        itemsInGroup.push(options[i].value);
      }
      const allSelected = itemsInGroup.every(i => selected.includes(i));
      if (allSelected) {
        onChange(selected.filter(i => !itemsInGroup.includes(i)));
      } else {
        const newSelected = [...selected];
        itemsInGroup.forEach(i => {
          if (!newSelected.includes(i)) newSelected.push(i);
        });
        onChange(newSelected);
      }
    } else {
      if (selected.includes(value)) {
        onChange(selected.filter(i => i !== value));
      } else {
        onChange([...selected, value]);
      }
    }
  };

  const displayText = selected.length === 0 ? label : selected.length === 1 ? toUpperCaseAccentFree(selected[0]) : `${label} (${selected.length})`;

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
        <div className="absolute z-[6000] mt-1 max-h-60 w-full lg:w-64 overflow-auto rounded-xl bg-white p-1 text-base shadow-lg border border-slate-200 focus:outline-none sm:text-sm custom-scrollbar">
          {options.length === 0 && (
            <div className="px-3 py-2 text-slate-500 text-xs text-center">{toUpperCaseAccentFree('ΔΕΝ ΥΠΑΡΧΟΥΝ ΕΠΙΛΟΓΕΣ')}</div>
          )}
          {options.map((option) => {
            let isSelected = false;
            let groupIndeterminate = false;
            
            if (option.isGroup) {
              const groupIdx = options.findIndex(o => o.value === option.value);
              let itemsInGroup: string[] = [];
              for (let i = groupIdx + 1; i < options.length; i++) {
                if (options[i].isGroup) break;
                itemsInGroup.push(options[i].value);
              }
              const selectedCount = itemsInGroup.filter(i => selected.includes(i)).length;
              isSelected = selectedCount === itemsInGroup.length && itemsInGroup.length > 0;
              groupIndeterminate = selectedCount > 0 && selectedCount < itemsInGroup.length;
            } else {
              isSelected = selected.includes(option.value);
            }

            return (
              <div
                key={option.value}
                onClick={() => toggleOption(option.value, option.isGroup)}
                className={`flex items-center gap-2 cursor-pointer select-none rounded-lg py-2 px-3 hover:bg-blue-50 ${option.isGroup ? 'bg-slate-50 border-t border-slate-100 first:border-0 mt-1' : ''}`}
              >
                <div className={`flex items-center justify-center w-4 h-4 border rounded shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : groupIndeterminate ? 'bg-blue-100 border-blue-400' : 'bg-white border-slate-300'}`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                  {groupIndeterminate && <div className="w-2 h-0.5 bg-blue-600 rounded-full" />}
                </div>
                <span className={`text-[10px] sm:text-xs ${option.isGroup ? 'font-black tracking-[0.1em] text-slate-800 uppercase' : 'font-medium text-slate-700 uppercase'} ${option.indent ? 'ml-3' : ''}`}>
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
