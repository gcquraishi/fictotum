import Image from 'next/image';
import { isValidImageUrl, getPlaceholderStyle } from '@/lib/card-utils';

export default function SearchThumbnail({
  name,
  imageUrl,
  historicityStatus,
}: {
  name: string;
  imageUrl?: string | null;
  historicityStatus?: string;
}) {
  const ph = getPlaceholderStyle('figure', name, historicityStatus);

  return (
    <div style={{ width: 40, height: 53, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
      {isValidImageUrl(imageUrl) ? (
        <Image src={imageUrl!} alt={name} fill sizes="40px" style={{ objectFit: 'cover' }} />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: ph.backgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 14,
              fontWeight: 300,
              color: ph.textColor,
              opacity: 0.5,
            }}
          >
            {ph.initials}
          </span>
        </div>
      )}
    </div>
  );
}
