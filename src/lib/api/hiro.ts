import axios from 'axios'

const HIRO_API_BASE = process.env.NEXT_PUBLIC_HIRO_ENDPOINT || 'https://api.hiro.so'
const HIRO_API_KEY = process.env.HIRO_API_KEY

// Hiro API Types
export interface HiroInscription {
  id: string
  number: number
  address: string
  genesis_address: string
  genesis_block_height: number
  genesis_block_hash: string
  genesis_tx_id: string
  genesis_fee: number
  genesis_timestamp: number
  tx_id: string
  location: string
  output: string
  value: number
  offset: number
  sat_ordinal: string
  sat_rarity: string
  sat_coinbase_height: number
  mime_type: string
  content_type: string
  content_length: number
  timestamp: number
  curse_type: string | null
  recursive: boolean
  recursion_refs: string[] | null
}

export interface HiroInscriptionsResponse {
  limit: number
  offset: number
  total: number
  results: HiroInscription[]
}

export interface HiroStats {
  inscriptions_total: number
  inscriptions_total_24h: number
  blocks_total: number
  blocks_total_24h: number
  fees_total: number
  fees_total_24h: number
}

class HiroAPI {
  private axiosInstance

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: HIRO_API_BASE,
      headers: {
        'x-api-key': HIRO_API_KEY || '',
        'Content-Type': 'application/json'
      }
    })
  }

  async getInscriptions(limit = 20, offset = 0): Promise<HiroInscriptionsResponse> {
    try {
      const response = await this.axiosInstance.get('/ordinals/v1/inscriptions', {
        params: { limit, offset }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching inscriptions:', error)
      throw error
    }
  }

  async getInscription(id: string): Promise<HiroInscription> {
    try {
      const response = await this.axiosInstance.get(`/ordinals/v1/inscriptions/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching inscription:', error)
      throw error
    }
  }

  async getStats(): Promise<HiroStats> {
    try {
      const response = await this.axiosInstance.get('/ordinals/v1/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching stats:', error)
      throw error
    }
  }

  async searchInscriptions(query: string): Promise<HiroInscriptionsResponse> {
    try {
      const response = await this.axiosInstance.get('/ordinals/v1/inscriptions', {
        params: { 
          address: query,
          limit: 20
        }
      })
      return response.data
    } catch (error) {
      console.error('Error searching inscriptions:', error)
      throw error
    }
  }
}

export const hiroAPI = new HiroAPI()