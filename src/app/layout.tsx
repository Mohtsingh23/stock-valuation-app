import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NiveshIQ — Indian Stock Recommendations',
  description: 'Live NSE market research with technical and fundamental stock recommendations for intraday and positional strategies.',
  keywords: ['Indian stocks', 'NSE', 'stock screener', 'technical analysis', 'fundamental analysis', 'intraday'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
