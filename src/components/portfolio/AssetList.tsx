/**
 * Asset List Component
 * 
 * This component displays a list of assets in the user's portfolio
 * with details like name, quantity, value, and price.
 */

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui';
import { Asset, AssetType } from '@/services/portfolio-service';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Bitcoin, CircleDollarSign, Gem } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
}

export function AssetList({ assets }: AssetListProps) {
  // Sort assets by value (highest first)
  const sortedAssets = [...assets].sort((a, b) => {
    const valueA = (a as any).value || 0;
    const valueB = (b as any).value || 0;
    return valueB - valueA;
  });

  const getAssetIcon = (type: AssetType | string) => {
    const typeStr = typeof type === 'string' ? type.toLowerCase() : type;
    switch (typeStr) {
      case AssetType.BITCOIN:
      case 'bitcoin':
      case 'btc':
        return <Bitcoin className="h-5 w-5 text-[#F7931A]" />;
      case AssetType.ORDINAL:
      case 'ordinal':
      case 'ordinals':
        return <Gem className="h-5 w-5 text-[#6F4E37]" />;
      case AssetType.RUNE:
      case 'rune':
      case 'runes':
        return <CircleDollarSign className="h-5 w-5 text-[#9945FF]" />;
      default:
        return <CircleDollarSign className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Assets</h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Asset</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAssets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12">
                <div className="flex flex-col items-center gap-3">
                  <Gem className="h-10 w-10 text-[#666] opacity-50" />
                  <p className="text-sm font-medium text-[#888]">No assets in portfolio</p>
                  <p className="text-xs text-[#555]">Connect your wallet to view your Bitcoin, Ordinals, and Runes</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sortedAssets.map((asset) => {
              const assetData = asset as any;
              const assetId = assetData.id || assetData.asset || assetData.symbol || 'unknown';
              const assetLocation = assetData.location || 'default';
              const assetQuantity = typeof assetData.quantity === 'string'
                ? parseFloat(assetData.quantity)
                : assetData.quantity || 0;
              const assetPrice = assetData.priceUsd || assetData.price || 0;
              const assetValue = assetData.value || (assetQuantity * assetPrice);

              return (
              <TableRow key={`${assetId}-${assetLocation}`}>
                <TableCell>
                  {getAssetIcon(assetData.type)}
                </TableCell>
                <TableCell className="font-medium">
                  <div>{assetData.name || assetData.asset || 'Unknown'}</div>
                  {assetData.symbol && (
                    <div className="text-xs text-muted-foreground">{assetData.symbol}</div>
                  )}
                </TableCell>
                <TableCell>
                  {formatNumber(assetQuantity)}
                </TableCell>
                <TableCell>
                  <div>{formatCurrency(assetPrice)}</div>
                  {assetData.priceBtc && assetData.type !== AssetType.BITCOIN && assetData.type !== 'bitcoin' && (
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(assetData.priceBtc)} BTC
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(assetValue)}
                </TableCell>
              </TableRow>
            )})
          )}
        </TableBody>
      </Table>
    </div>
  );
}
