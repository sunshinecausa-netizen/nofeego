import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Fragment } from 'react';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm flex-wrap">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={index}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate max-w-[200px]">{item.label}</span>
            )}
            {!isLast && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
          </Fragment>
        );
      })}
    </nav>
  );
}
