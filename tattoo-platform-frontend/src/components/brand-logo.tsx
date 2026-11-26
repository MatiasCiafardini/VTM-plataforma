import Image from 'next/image';
import isotype from '../../public/brand-isotype.png';
import wordmark from '../../public/brand-wordmark.png';

type BrandLogoProps = {
  variant?: 'wordmark' | 'isotype';
  priority?: boolean;
  className?: string;
  chrome?: boolean;
  decorative?: boolean;
};

export function BrandLogo({
  variant = 'wordmark',
  priority = false,
  className = '',
  chrome = true,
  decorative = false,
}: BrandLogoProps) {
  const isWordmark = variant === 'wordmark';

  return (
    <span
      className={`brand-logo-frame ${chrome ? 'brand-logo-frame-chrome' : 'brand-logo-frame-bare'} ${isWordmark ? 'brand-logo-frame-wordmark' : 'brand-logo-frame-isotype'} ${className}`.trim()}
    >
      <Image
        src={isWordmark ? wordmark : isotype}
        alt={decorative ? '' : 'Vende Más Tattoo'}
        preload={priority}
        className={isWordmark ? 'brand-logo-wordmark' : 'brand-logo-isotype'}
      />
    </span>
  );
}
