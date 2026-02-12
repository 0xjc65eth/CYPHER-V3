// YHP Ethereum contract
export const YHP_CONTRACT_ADDRESS = '0xf4b6f2ab709703aa1a3e47fa0183ec700017c62b'
export const YHP_COLLECTION_NAME = 'YIELD HACKER PASS'

// Premium collections for access verification
export const PREMIUM_COLLECTIONS = [
  'OCM GENESIS',
  'OCM KATOSHI PRIME',
  'OCM KATOSHI CLASSIC',
  'MULTIVERSO PASS',
  'SEIZE CTRL',
  'N0 0RDINARY KIND',
  'BITCOIN PUPPETS',
  'THE WIZARDS OF LORD',
  'YIELD HACKER',
  'STACK SATS'
];

// Function to check if a collection is premium
export function isPremiumCollection(collectionName: string): boolean {
  if (!collectionName) return false;

  // Normalize collection name for comparison (remove extra spaces, convert to uppercase)
  const normalizedName = collectionName.trim().toUpperCase();

  // Check if the collection is in the premium collections list
  return PREMIUM_COLLECTIONS.some(collection =>
    collection.trim().toUpperCase() === normalizedName
  );
}

// Function to check if a user has premium access based on their collections
export function hasUserPremiumAccess(userCollections: string[]): boolean {
  if (!userCollections || userCollections.length === 0) return false;

  // Check if the user owns at least one premium collection
  return userCollections.some(collection => isPremiumCollection(collection));
}
