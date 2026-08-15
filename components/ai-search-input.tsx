'use client';

import { type CSSProperties, type ChangeEvent, useLayoutEffect, useRef, useState } from 'react';
import { House, Sparkles } from 'lucide-react';
import styles from './ai-search-input.module.css';

type Props = { id: string; value: string; placeholder: string; label: string; loading?: boolean; error?: string | null; onChange: (event: ChangeEvent<HTMLInputElement>) => void };

export function AISearchInput({ id, value, placeholder, label, loading = false, error = null, onChange }: Props) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [typedWidth, setTypedWidth] = useState(0);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure) return;
    const updateWidth = () => setTypedWidth(Math.ceil(measure.getBoundingClientRect().width));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [value]);

  return <div className={styles.container}>
    <div className={styles.shell} style={{ '--typed-width': `${typedWidth}px` } as CSSProperties} data-loading={loading || undefined} data-error={error ? true : undefined}>
      <div className={styles.identity} aria-hidden="true"><span className={styles.core}><House className={styles.house} strokeWidth={1.8} /><Sparkles className={styles.sparkle} strokeWidth={1.8} /><span className={styles.particleOne} /><span className={styles.particleTwo} /></span><span className={styles.aiLabel}>{label}</span></div>
      <div className={styles.inputArea}><span className={styles.energyField} aria-hidden="true" /><label htmlFor={id} className="sr-only">{label}</label><input id={id} type="search" value={value} onChange={onChange} placeholder={placeholder} className={styles.input} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} /><span ref={measureRef} className={styles.measure} aria-hidden="true">{value}</span></div>
    </div>
    {error && <p id={`${id}-error`} className={styles.errorText}>{error}</p>}
  </div>;
}
