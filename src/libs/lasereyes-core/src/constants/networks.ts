import type { BitcoinNetworkType } from '@orangecrypto/orange-connect'
import { BaseNetwork, CmdruidNetwork, FractalNetwork, LeatherNetwork, OkxNetwork, OrangeNetwork, UnisatNetwork, WizzNetwork, XverseNetwork } from '../types/network'

export const MAINNET = BaseNetwork.MAINNET
export const SIGNET = BaseNetwork.SIGNET
export const TESTNET = BaseNetwork.TESTNET
export const TESTNET4 = BaseNetwork.TESTNET4
export const FRACTAL_MAINNET = BaseNetwork.FRACTAL_MAINNET
export const FRACTAL_TESTNET = BaseNetwork.FRACTAL_TESTNET
export const REGTEST = BaseNetwork.REGTEST

export const getSatsConnectNetwork = (network: string) => {
  if (network === BaseNetwork.MAINNET) return XverseNetwork.MAINNET
  if (network === BaseNetwork.TESTNET) return XverseNetwork.TESTNET
  if (network === BaseNetwork.TESTNET4) return XverseNetwork.TESTNET
  if (network === BaseNetwork.SIGNET) return XverseNetwork.SIGNET
  if (network === BaseNetwork.FRACTAL_MAINNET) return XverseNetwork.MAINNET
  if (network === BaseNetwork.FRACTAL_TESTNET) return XverseNetwork.MAINNET
  return XverseNetwork.MAINNET
}

export const getLeatherNetwork = (network: string) => {
  if (network === BaseNetwork.MAINNET) return LeatherNetwork.MAINNET
  if (network === BaseNetwork.TESTNET) return LeatherNetwork.TESTNET
  return LeatherNetwork.MAINNET
}

export const getUnisatNetwork = (network: string) => {
  if (network === BaseNetwork.MAINNET) return UnisatNetwork.MAINNET
  if (network === BaseNetwork.TESTNET) return UnisatNetwork.TESTNET
  if (network === BaseNetwork.TESTNET4) return UnisatNetwork.TESTNET4
  if (network === BaseNetwork.SIGNET) return UnisatNetwork.SIGNET
  if (network === BaseNetwork.FRACTAL_MAINNET) return UnisatNetwork.FRACTAL_MAINNET
  if (network === BaseNetwork.FRACTAL_TESTNET) return UnisatNetwork.FRACTAL_TESTNET
  return UnisatNetwork.MAINNET
}

export const getWizzNetwork = (network: string) => {
  if (network === BaseNetwork.MAINNET) return WizzNetwork.MAINNET
  if (network === BaseNetwork.TESTNET) return WizzNetwork.TESTNET
  if (network === BaseNetwork.TESTNET4) return WizzNetwork.TESTNET4
  if (network === BaseNetwork.SIGNET) return WizzNetwork.SIGNET
  if (network === BaseNetwork.FRACTAL_TESTNET) return WizzNetwork.TESTNET
  if (network === BaseNetwork.FRACTAL_MAINNET) return WizzNetwork.MAINNET
  return WizzNetwork.MAINNET
}

// OrangeNetwork enum values ('Mainnet', 'Testnet') are structurally compatible
// with BitcoinNetworkType string values at runtime. This mapping provides
// type-safe conversion without double-casting through `unknown`.
const orangeNetworkMap: Record<string, BitcoinNetworkType> = {
  [BaseNetwork.MAINNET]: OrangeNetwork.MAINNET as BitcoinNetworkType,
  [BaseNetwork.TESTNET]: OrangeNetwork.TESTNET as BitcoinNetworkType,
  [BaseNetwork.TESTNET4]: OrangeNetwork.TESTNET as BitcoinNetworkType,
  [BaseNetwork.SIGNET]: OrangeNetwork.TESTNET as BitcoinNetworkType,
  [BaseNetwork.FRACTAL_MAINNET]: OrangeNetwork.MAINNET as BitcoinNetworkType,
  [BaseNetwork.FRACTAL_TESTNET]: OrangeNetwork.MAINNET as BitcoinNetworkType,
}

const ORANGE_DEFAULT: BitcoinNetworkType = OrangeNetwork.MAINNET as BitcoinNetworkType

export const getOrangeNetwork = (network: string): BitcoinNetworkType => {
  return orangeNetworkMap[network] ?? ORANGE_DEFAULT
}

export const getCmDruidNetwork = (network: string) => {
  if (network === BaseNetwork.MAINNET) return CmdruidNetwork.MAINNET
  if (network === BaseNetwork.TESTNET4) return CmdruidNetwork.TESTNET
  if (network === BaseNetwork.TESTNET) return CmdruidNetwork.TESTNET
  if (network === BaseNetwork.SIGNET) return CmdruidNetwork.SIGNET
  if (network === BaseNetwork.MAINNET) return CmdruidNetwork.MAINNET
  if (network === BaseNetwork.TESTNET) return CmdruidNetwork.MAINNET
  return CmdruidNetwork.MAINNET
}


export const getNetworkForUnisat = (network: string) => {
  if (network === UnisatNetwork.MAINNET) return BaseNetwork.MAINNET
  if (network === UnisatNetwork.TESTNET) return BaseNetwork.TESTNET
  if (network === UnisatNetwork.TESTNET4) return BaseNetwork.TESTNET4
  if (network === UnisatNetwork.SIGNET) return BaseNetwork.SIGNET
  if (network === UnisatNetwork.FRACTAL_MAINNET) return BaseNetwork.FRACTAL_MAINNET
  if (network === UnisatNetwork.FRACTAL_TESTNET) return BaseNetwork.TESTNET
  return BaseNetwork.MAINNET
}

export const getNetworkForXverse = (network: string) => {
  if (network === XverseNetwork.MAINNET) return BaseNetwork.MAINNET
  if (network === XverseNetwork.TESTNET) return BaseNetwork.TESTNET
  if (network === XverseNetwork.TESTNET4) return BaseNetwork.TESTNET4
  if (network === XverseNetwork.SIGNET) return BaseNetwork.SIGNET
  if (network === XverseNetwork.FRACTAL_MAINNET) return BaseNetwork.FRACTAL_MAINNET
  if (network === XverseNetwork.FRACTAL_TESTNET) return BaseNetwork.FRACTAL_TESTNET
  return BaseNetwork.MAINNET
}

export const getNetworkForLeather = (network: string) => {
  if (network === LeatherNetwork.MAINNET) return BaseNetwork.MAINNET
  if (network === LeatherNetwork.TESTNET) return BaseNetwork.TESTNET
  return BaseNetwork.MAINNET
}

export const getNetworkForOkx = (network: string) => {
  if (network === OkxNetwork.MAINNET) return BaseNetwork.MAINNET
  if (network === OkxNetwork.TESTNET) return BaseNetwork.TESTNET
  return BaseNetwork.MAINNET
}

export const getNetworkForWizz = (network: string) => {
  if (network === WizzNetwork.MAINNET) return BaseNetwork.MAINNET
  if (network === WizzNetwork.TESTNET) return BaseNetwork.TESTNET
  if (network === WizzNetwork.TESTNET4) return BaseNetwork.TESTNET4
  if (network === WizzNetwork.SIGNET) return BaseNetwork.SIGNET
  if (network === FractalNetwork.TESTNET) return BaseNetwork.TESTNET
  if (network === FractalNetwork.MAINNET) return BaseNetwork.MAINNET
  return BaseNetwork.MAINNET
}

