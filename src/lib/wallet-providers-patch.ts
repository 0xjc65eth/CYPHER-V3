'use client'

// Patch to fix wallet provider compatibility issues
export function initializeWalletProviderPatches() {
  if (typeof window === 'undefined') return;

  // Patch for Xverse wallet
  const patchXverse = () => {
    const checkAndPatch = () => {
      const xverseProvider = (window as any).XverseProviders?.BitcoinProvider;
      if (xverseProvider && !xverseProvider.getAddresses) {
        
        // Add the missing getAddresses method
        xverseProvider.getAddresses = async function() {
          try {
            // Get accounts first
            const response = await this.request('getAccounts', {
              purposes: ['ordinals', 'payment'],
              message: 'Connect to CYPHER ORDi Future V3',
            });

            if (response?.result?.addresses) {
              return response.result.addresses;
            }

            // Fallback: try to get addresses another way
            if (this.accounts?.length > 0) {
              return this.accounts;
            }

            return [];
          } catch (error) {
            console.error('Error getting addresses:', error);
            return [];
          }
        };

        // Also ensure other methods exist
        if (!xverseProvider.getBalance) {
          xverseProvider.getBalance = async function() {
            try {
              const response = await this.request('getBalance');
              return response?.result?.total || 0;
            } catch (error) {
              console.error('Error getting balance:', error);
              return 0;
            }
          };
        }

      }
    };

    // Try immediately
    checkAndPatch();

    // Also try after a delay in case the provider loads later
    setTimeout(checkAndPatch, 1000);
    setTimeout(checkAndPatch, 3000);
  };

  // Execute patches
  patchXverse();

  // Listen for provider availability
  if ((window as any).addEventListener) {
    (window as any).addEventListener('xverse:ready', patchXverse);
  }
}