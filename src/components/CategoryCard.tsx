import { useState } from 'react';

interface CategoryCardProps {
  title: string;
  imageUrl?: string;
  onClick?: () => void;
  comingSoon?: boolean;
}

export default function CategoryCard({ title, imageUrl, onClick, comingSoon }: CategoryCardProps) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div
      onClick={!comingSoon ? onClick : undefined}
      className={`flex flex-col items-center ${!comingSoon ? 'cursor-pointer' : 'cursor-default'} group`}
    >
      <div
        className={`relative w-40 h-40 rounded-full overflow-hidden shadow-lg ring-1 ring-black/5 bg-gradient-to-br from-ink to-moss ${
          !comingSoon ? 'group-hover:shadow-2xl group-hover:shadow-saffron/20 group-hover:scale-105' : ''
        } transition-all duration-500 border-2 border-saffron-light/70`}
      >
        {/* Always-present designed fallback: shows while the real photo is
            loading and stays visible if it never arrives, so a slow or
            failed image never leaves a blank ring or bleeds broken-image
            alt text into the circle. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-cream text-3xl font-semibold select-none">
            {title[0]}
          </span>
        </div>

        {imageUrl && imageStatus !== 'error' && (
          <img
            src={imageUrl}
            alt={title}
            onLoad={() => setImageStatus('loaded')}
            onError={() => setImageStatus('error')}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${
              imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
            } ${!comingSoon ? 'group-hover:scale-110' : ''}`}
          />
        )}
        {!comingSoon && (
          <div className="absolute inset-0 rounded-full ring-0 group-hover:ring-4 group-hover:ring-saffron-light/30 transition-all duration-500" />
        )}
        {comingSoon && (
          <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
            <span className="text-ink font-semibold text-sm bg-saffron-light px-3 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
        )}
      </div>
      <h3
        className={`mt-4 font-serif text-lg font-semibold text-center ${
          comingSoon ? 'text-gray-400' : 'text-ink group-hover:text-moss'
        } transition-colors`}
      >
        {title}
      </h3>
    </div>
  );
}
