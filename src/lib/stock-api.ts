export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export const POPULAR_INDIAN_STOCKS = [
  // Large Cap - Nifty 50
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Oil & Gas' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT Services' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'Banking' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'Banking' },
  { symbol: 'INFY.NS', name: 'Infosys', sector: 'IT Services' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG' },
  { symbol: 'ITC.NS', name: 'ITC', sector: 'FMCG' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Banking' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'Telecom' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Banking' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'Construction' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank', sector: 'Banking' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'NBFC' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'FMCG' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', sector: 'Automobile' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'Pharma' },
  { symbol: 'TITAN.NS', name: 'Titan Company', sector: 'Consumer Durables' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement' },
  { symbol: 'WIPRO.NS', name: 'Wipro', sector: 'IT Services' },
  { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corporation', sector: 'Oil & Gas' },
  { symbol: 'NTPC.NS', name: 'NTPC', sector: 'Power' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation', sector: 'Power' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'Automobile' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'Metals' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel', sector: 'Metals' },
  { symbol: 'HINDALCO.NS', name: 'Hindalco Industries', sector: 'Metals' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises', sector: 'Conglomerate' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports', sector: 'Infrastructure' },
  { symbol: 'COALINDIA.NS', name: 'Coal India', sector: 'Mining' },
  { symbol: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories', sector: 'Pharma' },
  { symbol: 'CIPLA.NS', name: 'Cipla', sector: 'Pharma' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra', sector: 'IT Services' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India', sector: 'FMCG' },
  { symbol: 'BRITANNIA.NS', name: 'Britannia Industries', sector: 'FMCG' },
  { symbol: 'DIVISLAB.NS', name: 'Divi\'s Laboratories', sector: 'Pharma' },
  { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals', sector: 'Healthcare' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv', sector: 'NBFC' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies', sector: 'IT Services' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra', sector: 'Automobile' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors', sector: 'Automobile' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp', sector: 'Automobile' },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto', sector: 'Automobile' },
  { symbol: 'GRASIM.NS', name: 'Grasim Industries', sector: 'Cement' },
  { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance', sector: 'Insurance' },
  { symbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance', sector: 'Insurance' },
  { symbol: 'ICICIPRULI.NS', name: 'ICICI Prudential Life', sector: 'Insurance' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank', sector: 'Banking' },
  { symbol: 'FEDERALBNK.NS', name: 'Federal Bank', sector: 'Banking' },
  { symbol: 'BANKBARODA.NS', name: 'Bank of Baroda', sector: 'Banking' },
  { symbol: 'PNB.NS', name: 'Punjab National Bank', sector: 'Banking' },
  { symbol: 'CANBK.NS', name: 'Canara Bank', sector: 'Banking' },
  { symbol: 'IDFCFIRSTB.NS', name: 'IDFC First Bank', sector: 'Banking' },
  { symbol: 'YESBANK.NS', name: 'Yes Bank', sector: 'Banking' },
  { symbol: 'ZOMATO.NS', name: 'Zomato', sector: 'Internet' },
  { symbol: 'PAYTM.NS', name: 'Paytm', sector: 'Fintech' },
  { symbol: 'NYKAA.NS', name: 'Nykaa', sector: 'Internet' },
  { symbol: 'POLICYBZR.NS', name: 'PB Fintech', sector: 'Fintech' },
  { symbol: 'DMART.NS', name: 'Avenue Supermarts', sector: 'Retail' },
  { symbol: 'TRENT.NS', name: 'Trent', sector: 'Retail' },
  { symbol: 'SHREECEM.NS', name: 'Shree Cement', sector: 'Cement' },
  { symbol: 'AMBUJACEM.NS', name: 'Ambuja Cements', sector: 'Cement' },
  { symbol: 'ACC.NS', name: 'ACC', sector: 'Cement' },
  { symbol: 'JINDALSTEL.NS', name: 'Jindal Steel & Power', sector: 'Metals' },
  { symbol: 'SAIL.NS', name: 'Steel Authority of India', sector: 'Metals' },
  { symbol: 'VEDL.NS', name: 'Vedanta', sector: 'Metals' },
  { symbol: 'NATIONALUM.NS', name: 'National Aluminium', sector: 'Metals' },
  { symbol: 'GAIL.NS', name: 'GAIL (India)', sector: 'Oil & Gas' },
  { symbol: 'IOC.NS', name: 'Indian Oil Corporation', sector: 'Oil & Gas' },
  { symbol: 'BPCL.NS', name: 'Bharat Petroleum', sector: 'Oil & Gas' },
  { symbol: 'HINDPETRO.NS', name: 'Hindustan Petroleum', sector: 'Oil & Gas' },
  { symbol: 'PETRONET.NS', name: 'Petronet LNG', sector: 'Oil & Gas' },
  { symbol: 'IGL.NS', name: 'Indraprastha Gas', sector: 'Oil & Gas' },
  { symbol: 'MGL.NS', name: 'Mahanagar Gas', sector: 'Oil & Gas' },
  { symbol: 'GUJGASLTD.NS', name: 'Gujarat Gas', sector: 'Oil & Gas' },
  { symbol: 'TORNTPOWER.NS', name: 'Torrent Power', sector: 'Power' },
  { symbol: 'TATAPOWER.NS', name: 'Tata Power', sector: 'Power' },
  { symbol: 'ADANIGREEN.NS', name: 'Adani Green Energy', sector: 'Power' },
  { symbol: 'ADANITRANS.NS', name: 'Adani Transmission', sector: 'Power' },
  { symbol: 'RECLTD.NS', name: 'REC Limited', sector: 'Financial Services' },
  { symbol: 'PFC.NS', name: 'Power Finance Corporation', sector: 'Financial Services' },
  { symbol: 'IRFC.NS', name: 'Indian Railway Finance Corp', sector: 'Financial Services' },
  { symbol: 'NHPC.NS', name: 'NHPC', sector: 'Power' },
  { symbol: 'SJVN.NS', name: 'SJVN', sector: 'Power' },
];

export function searchPopularStocks(query: string): typeof POPULAR_INDIAN_STOCKS {
  const lowerQuery = query.toLowerCase();
  return POPULAR_INDIAN_STOCKS.filter(stock => 
    stock.name.toLowerCase().includes(lowerQuery) ||
    stock.symbol.toLowerCase().includes(lowerQuery) ||
    stock.sector.toLowerCase().includes(lowerQuery)
  );
}

export function getStockBySymbol(symbol: string) {
  return POPULAR_INDIAN_STOCKS.find(stock => stock.symbol === symbol);
}

export function getStocksBySector(sector: string) {
  return POPULAR_INDIAN_STOCKS.filter(stock => stock.sector === sector);
}

export function getAllSectors(): string[] {
  return [...new Set(POPULAR_INDIAN_STOCKS.map(s => s.sector))].sort();
}