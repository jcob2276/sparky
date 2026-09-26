import { FC, useState } from 'react';
import { getSuperinvestorAvatar } from '../../lib/investments/superinvestorPhoto';

interface Props {
  name: string;
  fundName?: string;
  slug?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-bold',
  lg: 'w-12 h-12 text-base font-bold',
  xl: 'w-16 h-16 text-xl font-black',
};

export const SuperinvestorAvatar: FC<Props> = ({
  name,
  fundName,
  slug,
  size = 'md',
  className = '',
}) => {
  const avatarData = getSuperinvestorAvatar(name, fundName, slug);
  const [imgError, setImgError] = useState(false);

  const sizeClass = SIZE_CLASSES[size];

  if (avatarData.type === 'image' && avatarData.url && !imgError) {
    return (
      <div
        className={`relative shrink-0 rounded-full overflow-hidden border border-border-custom bg-surface shadow-2xs ${sizeClass} ${className}`}
      >
        <img
          src={avatarData.url}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center border font-mono tracking-tight shadow-2xs ${sizeClass} ${avatarData.badgeClasses} ${className}`}
    >
      {avatarData.initials}
    </div>
  );
};
