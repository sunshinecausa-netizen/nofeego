import './globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

const siteUrl = 'https://manhattanliving.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ManhattanLiving — Apartments for Rent in NYC',
    template: '%s | ManhattanLiving',
  },
  description: 'Find your perfect Manhattan apartment. Browse rentals, short stays, and shared living spaces across NYC\'s best neighborhoods.',
  keywords: ['Manhattan apartments', 'NYC rentals', 'apartments for rent Manhattan', 'New York City apartments', 'short stay NYC', 'shared living Manhattan'],
  authors: [{ name: 'ManhattanLiving' }],
  creator: 'ManhattanLiving',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'ManhattanLiving',
    title: 'ManhattanLiving — Apartments for Rent in NYC',
    description: 'Find your perfect Manhattan apartment. Browse rentals, short stays, and shared living spaces across NYC\'s best neighborhoods.',
    images: [{ url: 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg', width: 1200, height: 630, alt: 'Manhattan apartments' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ManhattanLiving — Apartments for Rent in NYC',
    description: 'Find your perfect Manhattan apartment. Browse rentals, short stays, and shared living spaces across NYC\'s best neighborhoods.',
    images: [{ url: 'https://images.pexels.com/photos/2016156/pexels-photo-2016156.jpeg' }],
  },
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
