import { FC, useState } from 'react';
import { getPoliticianPhotoUrl } from '../../lib/investments/politicianPhoto';

interface Props {
  name: string;
  bioguideId?: string | null;
  party?: string | null;
  size?: number;
  className?: string;
}

export const PoliticianAvatar: FC<Props> = ({
  name,
  bioguideId,
  party,
  size = 36,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const photoUrl = getPoliticianPhotoUrl(name, bioguideId);

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const isDem = party === 'D' || party?.toLowerCase().includes('dem');
  const isRep = party === 'R' || party?.toLowerCase().includes('rep');

  const partyBg = isDem
    ? 'bg-primary/10 text-primary border-primary/30'
    : isRep
    ? 'bg-danger/10 text-danger border-danger/30'
    : 'bg-surface-subtle text-text-muted border-border-custom';

  if (photoUrl && !imgFailed) {
    return (
      <div
        className={`relative rounded-full overflow-hidden shrink-0 border border-border-custom bg-surface-subtle ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={photoUrl}
          alt={`Zdjęcie kongresmena ${name}`}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-bold font-mono border text-2xs select-none ${partyBg} ${className}`}
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  );
};
