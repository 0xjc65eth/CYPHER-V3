'use client'

// Patch for LaserEyes to properly handle Xverse wallet connection
export function patchLaserEyesForXverse() {
  if (typeof window === 'undefined') return;

  // Store the original Xverse provider
  const originalXverseProvider = (window as any).XverseProviders?.BitcoinProvider;
  
  if (!originalXverseProvider) {
    return;
  }

  // Create a patched version that includes getAddresses
  const patchedProvider = {
    ...originalXverseProvider,
    getAddresses: async function() {
      try {
        // Try to get accounts using Xverse's API
        const response = await this.request('getAccounts', {
          purposes: ['ordinals', 'payment'],
          message: 'CYPHER ORDi Future V3 would like to connect to your wallet.',
        });

        if (response?.result?.addresses) {
          return response.result.addresses.map((addr: any) => ({
            address: addr.address,
            publicKey: addr.publicKey || '',
            purpose: addr.purpose,
          }));
        }

        return [];
      } catch (error) {
        console.error('Error in patched getAddresses:', error);
        return [];
      }
    },
    // Ensure request method is properly bound
    request: originalXverseProvider.request.bind(originalXverseProvider),
  };

  // Replace the provider
  if ((window as any).XverseProviders) {
    (window as any).XverseProviders.BitcoinProvider = patchedProvider;
  }

  // Also patch the global BitcoinProvider if it exists
  if ((window as any).BitcoinProvider === originalXverseProvider) {
    (window as any).BitcoinProvider = patchedProvider;
  }

}