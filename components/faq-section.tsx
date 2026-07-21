'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '@/lib/types';

export function FaqSection({ faqs, title = 'Frequently Asked Questions' }: { faqs: FaqItem[] | null; title?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqs || faqs.length === 0) return null;

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-foreground mb-6">{title}</h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-border overflow-hidden transition-all"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between gap-4 p-4 text-left"
            >
              <span className="font-medium text-foreground text-sm">{faq.question}</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed animate-fade-in">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
