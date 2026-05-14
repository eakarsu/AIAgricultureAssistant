import React from 'react';
import SimpleAIPage from './SimpleAIPage';

export default function MarketPricePredictionPage() {
  return (
    <SimpleAIPage
      title="Market Price Prediction"
      description="Project short-term commodity price direction. Paste recent prices for best results; live commodity feeds require credentials."
      endpoint="/ai/market-price-prediction"
      fields={[
        { name: 'commodity', label: 'Commodity', required: true, placeholder: 'e.g. Corn, Soybeans, Wheat' },
        { name: 'region', label: 'Region', placeholder: 'e.g. US Midwest' },
        { name: 'horizon_days', label: 'Horizon (days)', type: 'number', placeholder: '30' },
        { name: 'recent_prices', label: 'Recent Prices (paste text or JSON)', type: 'textarea', rows: 6, placeholder: 'e.g. 2025-04-01: 4.80, 2025-04-08: 4.92, ...' },
      ]}
    />
  );
}
