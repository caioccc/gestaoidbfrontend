import type { KeyboardEvent, MutableRefObject } from 'react';

export interface LandingTabItem {
  id: string;
  label: string;
}

interface LandingTabsProps {
  items: LandingTabItem[];
  active: number;
  onSelect: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  tabRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  idPrefix: string;
  ariaLabel: string;
  className?: string;
}

export default function LandingTabs({
  items,
  active,
  onSelect,
  onKeyDown,
  tabRefs,
  idPrefix,
  ariaLabel,
  className = '',
}: LandingTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`tw:inline-flex tw:max-w-full tw:flex-wrap tw:gap-1 tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-slate-100/80 tw:p-1.5 tw:shadow-sm ${className}`}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          ref={(element) => {
            tabRefs.current[index] = element;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${item.id}`}
          aria-controls={`${idPrefix}-panel-${item.id}`}
          aria-selected={active === index}
          tabIndex={active === index ? 0 : -1}
          onClick={() => onSelect(index)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className={`tw:inline-flex tw:items-center tw:gap-2 tw:whitespace-nowrap tw:rounded-xl tw:px-5 tw:py-2.5 tw:text-sm tw:font-semibold tw:transition-all tw:duration-200 tw:focus-visible:outline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#1c4ed8] ${
            active === index
              ? 'tw:bg-white tw:text-[#071b3a] tw:shadow-md tw:ring-1 tw:ring-[#1c4ed8]/15'
              : 'tw:text-slate-600 tw:hover:bg-white/70 tw:hover:text-[#1c4ed8]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
