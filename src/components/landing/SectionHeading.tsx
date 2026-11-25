import { Ornament } from './Symbols';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  light?: boolean;
  align?: 'left' | 'center';
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
  align = 'left',
}: SectionHeadingProps) {
  const centered = align === 'center';

  return (
    <div
      className={`${centered ? 'tw:mx-auto tw:max-w-3xl tw:text-center' : 'tw:max-w-3xl'}`}
    >
      <div className={`tw:flex tw:items-center tw:gap-4 ${centered ? 'tw:justify-center' : ''}`}>
        <Ornament className="tw:h-5 tw:w-20 tw:shrink-0" />
        <p
          className={`tw:text-sm tw:font-bold tw:uppercase tw:tracking-[0.18em] ${
            light ? 'tw:text-[#fbbf24]' : 'tw:text-[#1c4ed8]'
          }`}
        >
          {eyebrow}
        </p>
      </div>
      <h2
        className={`landing-display tw:mt-5 tw:text-3xl tw:font-bold tw:leading-[1.12] tw:sm:text-4xl tw:lg:text-[2.75rem] ${
          light ? 'tw:text-white' : 'tw:text-[#071b3a]'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`tw:mt-5 tw:max-w-2xl tw:text-base tw:font-medium tw:leading-relaxed tw:sm:text-lg ${
            light ? 'tw:text-white/85' : 'tw:text-slate-700'
          } ${centered ? 'tw:mx-auto' : ''}`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
