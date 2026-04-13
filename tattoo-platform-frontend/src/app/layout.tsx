import type { Metadata } from 'next';
import { Montserrat, Oswald } from 'next/font/google';
import './globals.css';

const headingFont = Oswald({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700'],
});

const bodyFont = Montserrat({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Vende Más Tattoo',
  description: 'Plataforma operativa de Vende Más Tattoo para alumnos, mentores y gestión.',
  icons: {
    icon: '/brand-isotype.png',
    shortcut: '/brand-isotype.png',
    apple: '/brand-isotype.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
