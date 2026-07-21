'use client';

import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export function FavoriteButton({
  listingId,
  size = 'md',
}: {
  listingId: string;
  size?: 'sm' | 'md';
}) {
  const { favoriteIds, toggle } = useFavorites();
  const { user } = useAuth();
  const router = useRouter();
  const isFavorited = favoriteIds.has(listingId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/sign-in');
      return;
    }
    toggle(listingId);
  };

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <button
      onClick={handleClick}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      className={`flex items-center justify-center rounded-full transition-all duration-200 ${
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
      } ${
        isFavorited
          ? 'bg-white text-rose-500 shadow-md'
          : 'bg-white/80 backdrop-blur-sm text-foreground/60 hover:text-rose-500 shadow-sm'
      }`}
    >
      <Heart className={`${iconSize} ${isFavorited ? 'fill-current' : ''}`} />
    </button>
  );
}
