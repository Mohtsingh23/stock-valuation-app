import { Suspense } from 'react';
import ValuationPageClient from './ValuationPageClient';

interface ValuationPageProps {
  params: Promise<{ symbol: string }>;
}

export default async function ValuationPage({ params }: ValuationPageProps) {
  const resolvedParams = await params;
  const symbol = resolvedParams.symbol || 'RELIANCE.NS';

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading {symbol}...</p>
        </div>
      </div>
    }>
      <ValuationPageClient initialSymbol={symbol} />
    </Suspense>
  );
}