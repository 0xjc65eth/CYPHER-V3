// Test CoinMarketCap API Function
exports.handler = async (event, context) => {
  const CMC_API_KEY = process.env.CMC_API_KEY || 'c045d2a9-6f2d-44e9-8297-a88ab83b463b';
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('Testing CMC API with key:', CMC_API_KEY ? 'Key present' : 'No key');
    
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC&convert=USD',
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json'
        }
      }
    );

    const responseText = await response.text();
    console.log('CMC Response Status:', response.status);
    console.log('CMC Response:', responseText.substring(0, 200));

    if (!response.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          status: response.status,
          error: responseText,
          hasApiKey: !!CMC_API_KEY,
          keyPreview: CMC_API_KEY ? `${CMC_API_KEY.substring(0, 8)}...` : 'No key'
        })
      };
    }

    const data = JSON.parse(responseText);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data.data?.BTC || data,
        hasApiKey: !!CMC_API_KEY,
        keyPreview: CMC_API_KEY ? `${CMC_API_KEY.substring(0, 8)}...` : 'No key'
      })
    };
  } catch (error) {
    console.error('Test CMC Error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        hasApiKey: !!CMC_API_KEY,
        keyPreview: CMC_API_KEY ? `${CMC_API_KEY.substring(0, 8)}...` : 'No key'
      })
    };
  }
};