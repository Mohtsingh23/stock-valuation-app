import ValuationPageClient from './ValuationPageClient';

interface ValuationPageProps {
  params: Promise<{ symbol: string }>;
}

export default async function ValuationPage({ params }: ValuationPageProps) {
  const resolvedParams = await params;
  const symbol = resolvedParams.symbol || 'RELIANCE.NS';

  return (
    <ValuationPageClient initialSymbol={symbol} />
  );
}