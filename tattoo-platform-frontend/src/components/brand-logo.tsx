import Image from 'next/image';

type BrandLogoProps = {
  variant?: 'wordmark' | 'isotype';
  priority?: boolean;
  className?: string;
  chrome?: boolean;
};

export function BrandLogo({
  variant = 'wordmark',
  priority = false,
  className = '',
  chrome = true,
}: BrandLogoProps) {
  const isWordmark = variant === 'wordmark';

  return (
    <span
      className={`brand-logo-frame ${chrome ? 'brand-logo-frame-chrome' : 'brand-logo-frame-bare'} ${isWordmark ? 'brand-logo-frame-wordmark' : 'brand-logo-frame-isotype'} ${className}`.trim()}
    >
      <Image
        src={isWordmark ? '/brand-wordmark.png' : '/brand-isotype.png'}
        alt="Vende Mas Tattoo"
        width={isWordmark ? 880 : 512}
        height={isWordmark ? 332 : 512}
        priority={priority}
        className={isWordmark ? 'brand-logo-wordmark' : 'brand-logo-isotype'}
      />
    </span>
  );
}
