interface CategoryCardProps {
  title: string;
  imageUrl?: string;
  onClick?: () => void;
  comingSoon?: boolean;
}

export default function CategoryCard({ title, imageUrl, onClick, comingSoon }: CategoryCardProps) {
  return (
    <div
      onClick={!comingSoon ? onClick : undefined}
      className={`flex flex-col items-center ${!comingSoon ? 'cursor-pointer' : 'cursor-default'} group`}
    >
      <div
        className={`relative w-40 h-40 rounded-full overflow-hidden shadow-lg ring-1 ring-black/5 ${
          !comingSoon ? 'group-hover:shadow-2xl group-hover:shadow-saffron/20 group-hover:scale-105' : ''
        } transition-all duration-500 border-2 border-saffron-light/70`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className={`w-full h-full object-cover ${!comingSoon ? 'group-hover:scale-110' : ''} transition-transform duration-700 ease-out`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink to-moss flex items-center justify-center">
            <span className="font-serif text-cream text-3xl font-semibold">{title[0]}</span>
          </div>
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
