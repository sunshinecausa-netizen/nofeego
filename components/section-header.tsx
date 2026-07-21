import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SectionHeader({
  title,
  subtitle,
  href,
  hrefLabel = 'View All',
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {href && (
        <Button asChild variant="ghost" size="sm" className="gap-1 shrink-0">
          <Link href={href}>
            {hrefLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
