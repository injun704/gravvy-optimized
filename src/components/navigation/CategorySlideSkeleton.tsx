import React from 'react';
import { CategoryTab } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface CategorySlideSkeletonProps {
  category: CategoryTab;
}

export const CategorySlideSkeleton: React.FC<CategorySlideSkeletonProps> = React.memo(({ category }) => {
  const { theme } = useTheme();

  const isLight = theme === 'LIGHT';

  // Category specific accent themes
  const config = React.useMemo(() => {
    switch (category) {
      case 'food':
        return {
          title: 'Food Delivery & Restaurants',
          subtitle: 'Hot biryani, woodfired pizza, momos & rolls',
          badge: 'Street Food & Dining',
          badgeBg: 'bg-red-500/20 text-red-500',
          gradient: isLight
            ? 'from-red-500/10 via-rose-500/5 to-transparent border-red-200/50'
            : 'from-red-950/40 via-rose-900/10 to-transparent border-red-500/20',
          accentColor: 'bg-red-500',
        };
      case 'grocery':
        return {
          title: 'Farm Fresh Grocery Mart',
          subtitle: 'Daily fruits, fresh veggies, dairy & essentials',
          badge: '10 Min Delivery',
          badgeBg: 'bg-emerald-500/20 text-emerald-500',
          gradient: isLight
            ? 'from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-200/50'
            : 'from-emerald-950/40 via-teal-900/10 to-transparent border-emerald-500/20',
          accentColor: 'bg-emerald-500',
        };
      case 'medicine':
        return {
          title: 'Pharmacy & Healthcare',
          subtitle: 'Genuine medicines, wellness & care in 15 mins',
          badge: '100% Certified Meds',
          badgeBg: 'bg-sky-500/20 text-sky-500',
          gradient: isLight
            ? 'from-sky-500/10 via-blue-500/5 to-transparent border-sky-200/50'
            : 'from-sky-950/40 via-blue-900/10 to-transparent border-sky-500/20',
          accentColor: 'bg-sky-500',
        };
      case 'home':
      default:
        return {
          title: 'Handcrafted Food & Fresh Groceries',
          subtitle: 'Discover top restaurants and daily supermart deals',
          badge: 'All in One App',
          badgeBg: 'bg-amber-500/20 text-amber-500',
          gradient: isLight
            ? 'from-amber-500/10 via-orange-500/5 to-transparent border-amber-200/50'
            : 'from-amber-950/40 via-orange-900/10 to-transparent border-amber-500/20',
          accentColor: 'bg-amber-500',
        };
    }
  }, [category, isLight]);

  return (
    <div className="w-full space-y-5 animate-pulse select-none pointer-events-none pb-12">
      {/* Category Hero Banner Shell */}
      <div
        className={`w-full p-5 sm:p-7 rounded-3xl border bg-gradient-to-r ${config.gradient} flex flex-col justify-between min-h-[120px] sm:min-h-[140px]`}
      >
        <div className="space-y-2">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${config.badgeBg}`}>
            {config.badge}
          </span>
          <h1 className="text-xl sm:text-2xl font-black font-display text-current tracking-tight line-clamp-1">
            {config.title}
          </h1>
          <p className="text-xs text-stone-400 line-clamp-1">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* Quick Category Filter Pills */}
      <div className="flex gap-2 overflow-x-hidden py-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`h-8 rounded-full shrink-0 ${i === 1 ? 'w-20' : 'w-24'} ${
              isLight ? 'bg-stone-200/70' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Product Cards Grid Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className={`h-5 w-40 rounded-lg ${isLight ? 'bg-stone-200' : 'bg-white/10'}`} />
          <div className={`h-4 w-16 rounded-md ${isLight ? 'bg-stone-200' : 'bg-white/10'}`} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 xs:gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className={`rounded-2xl border p-2.5 space-y-2.5 ${
                isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-white/10'
              }`}
            >
              {/* Product Image placeholder */}
              <div className={`aspect-[4/3] w-full rounded-xl ${isLight ? 'bg-stone-100' : 'bg-white/5'}`} />

              {/* Title & subtitle placeholder lines */}
              <div className="space-y-1.5 pt-1">
                <div className={`h-3.5 w-3/4 rounded-md ${isLight ? 'bg-stone-200' : 'bg-white/10'}`} />
                <div className={`h-2.5 w-1/2 rounded-md ${isLight ? 'bg-stone-100' : 'bg-white/5'}`} />
              </div>

              {/* Price and Add button placeholder */}
              <div className="flex items-center justify-between pt-1">
                <div className={`h-4 w-12 rounded-md ${isLight ? 'bg-stone-200' : 'bg-white/10'}`} />
                <div className={`h-7 w-16 rounded-xl ${isLight ? 'bg-stone-200' : 'bg-white/10'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
