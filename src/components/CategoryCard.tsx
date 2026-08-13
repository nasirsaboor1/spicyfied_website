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
      <div className={`relative w-40 h-40 rounded-full overflow-hidden shadow-lg ${!comingSoon ? 'group-hover:shadow-2xl group-hover:scale-105' : ''} transition-all duration-300 border-4 border-[#d4af37]`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className={`w-full h-full object-cover ${!comingSoon ? 'group-hover:scale-110' : ''} transition-transform duration-500`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2d5016] to-[#4a7c24] flex items-center justify-center">
            <span className="text-white text-3xl font-bold">{title[0]}</span>
          </div>
        )}
        {comingSoon && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-semibold text-sm bg-[#d4af37] px-3 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
        )}
      </div>
      <h3 className={`mt-4 text-lg font-semibold text-center ${comingSoon ? 'text-gray-400' : 'text-gray-800 group-hover:text-[#2d5016]'} transition-colors`}>
        {title}
      </h3>
    </div>
  );
}
