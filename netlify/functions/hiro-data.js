// Hiro API Data Function for Netlify
exports.handler = async (event, context) => {
  const API_KEY = process.env.HIRO_API_KEY || '3100ea7623797d267da3bd6dc94f47f9';
  
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
    const { endpoint = 'runes', limit = '20', offset = '0' } = event.queryStringParameters || {};
    
    let apiUrl = '';
    switch(endpoint) {
      case 'runes':
        apiUrl = `https://api.hiro.so/runes/v1/etchings?limit=${limit}&offset=${offset}`;
        break;
      case 'ordinals':
        apiUrl = `https://api.hiro.so/ordinals/v1/inscriptions?limit=${limit}&offset=${offset}`;
        break;
      case 'brc20':
        apiUrl = `https://api.hiro.so/ordinals/v1/brc-20/tokens?limit=${limit}&offset=${offset}`;
        break;
      default:
        throw new Error('Invalid endpoint');
    }
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Hiro API responded with ${response.status}`);
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Hiro API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch Hiro data',
        message: error.message 
      })
    };
  }
};