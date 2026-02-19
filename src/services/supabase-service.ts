import { createClient } from '@supabase/supabase-js'
import { NeuralModel, NeuralInsight, TrainingData } from '@/services/neural-learning-service'

// Inicializar o cliente Supabase
// Você precisará criar uma conta no Supabase e obter suas credenciais
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export class SupabaseService {
  private static instance: SupabaseService
  
  private constructor() {
  }
  
  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService()
    }
    return SupabaseService.instance
  }
  
  // Salvar modelo neural no Supabase
  public async saveModel(model: NeuralModel): Promise<void> {
    try {
      const { error } = await supabase
        .from('neural_models')
        .upsert({
          id: model.id,
          name: model.name,
          version: model.version,
          accuracy: model.accuracy,
          last_training: model.lastTraining,
          data_points: model.dataPoints,
          weights: model.weights,
          biases: model.biases,
          features: model.features,
          target_metric: model.targetMetric,
          prediction_history: model.predictionHistory,
          performance_metrics: model.performanceMetrics,
          updated_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error saving model to Supabase:', error)
        throw error
      }
      
    } catch (error) {
      console.error('Error in saveModel:', error)
      throw error
    }
  }
  
  // Carregar modelo neural do Supabase
  public async loadModel(modelId: string): Promise<NeuralModel | null> {
    try {
      const { data, error } = await supabase
        .from('neural_models')
        .select('*')
        .eq('id', modelId)
        .single()
      
      if (error) {
        console.error('Error loading model from Supabase:', error)
        throw error
      }
      
      if (!data) {
        return null
      }
      
      // Converter o formato do banco de dados para o formato do modelo
      const model: NeuralModel = {
        id: data.id,
        name: data.name,
        version: data.version,
        accuracy: data.accuracy,
        lastTraining: data.last_training,
        dataPoints: data.data_points,
        weights: data.weights,
        biases: data.biases,
        features: data.features,
        targetMetric: data.target_metric,
        predictionHistory: data.prediction_history,
        performanceMetrics: data.performance_metrics
      }
      
      return model
    } catch (error) {
      console.error('Error in loadModel:', error)
      return null
    }
  }
  
  // Carregar todos os modelos do Supabase
  public async loadAllModels(): Promise<NeuralModel[]> {
    try {
      const { data, error } = await supabase
        .from('neural_models')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (error) {
        console.error('Error loading models from Supabase:', error)
        throw error
      }
      
      if (!data || data.length === 0) {
        return []
      }
      
      // Converter o formato do banco de dados para o formato do modelo
      const models: NeuralModel[] = data.map(item => ({
        id: item.id,
        name: item.name,
        version: item.version,
        accuracy: item.accuracy,
        lastTraining: item.last_training,
        dataPoints: item.data_points,
        weights: item.weights,
        biases: item.biases,
        features: item.features,
        targetMetric: item.target_metric,
        predictionHistory: item.prediction_history,
        performanceMetrics: item.performance_metrics
      }))
      
      return models
    } catch (error) {
      console.error('Error in loadAllModels:', error)
      return []
    }
  }
  
  // Salvar dados de treinamento no Supabase
  public async saveTrainingData(data: Partial<TrainingData>): Promise<void> {
    try {
      const timestamp = new Date().toISOString()
      
      // Salvar dados de mercado
      if (data.marketData && data.marketData.length > 0) {
        const { error } = await supabase
          .from('market_data')
          .insert(data.marketData.map(item => ({
            ...item,
            saved_at: timestamp
          })))
        
        if (error) {
          console.error('Error saving market data to Supabase:', error)
        }
      }
      
      // Salvar dados de mempool
      if (data.mempoolData && data.mempoolData.length > 0) {
        const { error } = await supabase
          .from('mempool_data')
          .insert(data.mempoolData.map(item => ({
            ...item,
            saved_at: timestamp
          })))
        
        if (error) {
          console.error('Error saving mempool data to Supabase:', error)
        }
      }
      
      // Salvar dados de ordinals
      if (data.ordinalData && data.ordinalData.length > 0) {
        const { error } = await supabase
          .from('ordinal_data')
          .insert(data.ordinalData.map(item => ({
            ...item,
            saved_at: timestamp
          })))
        
        if (error) {
          console.error('Error saving ordinal data to Supabase:', error)
        }
      }
      
      // Salvar dados de runes
      if (data.runeData && data.runeData.length > 0) {
        const { error } = await supabase
          .from('rune_data')
          .insert(data.runeData.map(item => ({
            ...item,
            saved_at: timestamp
          })))
        
        if (error) {
          console.error('Error saving rune data to Supabase:', error)
        }
      }
      
    } catch (error) {
      console.error('Error in saveTrainingData:', error)
      throw error
    }
  }
  
  // Carregar dados de treinamento do Supabase
  public async loadTrainingData(days: number = 30): Promise<Partial<TrainingData>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      const cutoffTimestamp = cutoffDate.toISOString()
      
      // Carregar dados de mercado
      const { data: marketData, error: marketError } = await supabase
        .from('market_data')
        .select('*')
        .gt('timestamp', cutoffTimestamp)
        .order('timestamp', { ascending: false })
      
      if (marketError) {
        console.error('Error loading market data from Supabase:', marketError)
      }
      
      // Carregar dados de mempool
      const { data: mempoolData, error: mempoolError } = await supabase
        .from('mempool_data')
        .select('*')
        .gt('timestamp', cutoffTimestamp)
        .order('timestamp', { ascending: false })
      
      if (mempoolError) {
        console.error('Error loading mempool data from Supabase:', mempoolError)
      }
      
      // Carregar dados de ordinals
      const { data: ordinalData, error: ordinalError } = await supabase
        .from('ordinal_data')
        .select('*')
        .gt('timestamp', cutoffTimestamp)
        .order('timestamp', { ascending: false })
      
      if (ordinalError) {
        console.error('Error loading ordinal data from Supabase:', ordinalError)
      }
      
      // Carregar dados de runes
      const { data: runeData, error: runeError } = await supabase
        .from('rune_data')
        .select('*')
        .gt('timestamp', cutoffTimestamp)
        .order('timestamp', { ascending: false })
      
      if (runeError) {
        console.error('Error loading rune data from Supabase:', runeError)
      }
      
      const result: Partial<TrainingData> = {
        marketData: marketData || [],
        mempoolData: mempoolData || [],
        ordinalData: ordinalData || [],
        runeData: runeData || []
      }
      
      return result
    } catch (error) {
      console.error('Error in loadTrainingData:', error)
      return {}
    }
  }
  
  // Salvar insights no Supabase
  public async saveInsights(insights: NeuralInsight[]): Promise<void> {
    try {
      if (insights.length === 0) {
        return
      }
      
      const { error } = await supabase
        .from('neural_insights')
        .insert(insights.map(insight => ({
          id: insight.id,
          timestamp: insight.timestamp,
          model_id: insight.modelId,
          confidence: insight.confidence,
          type: insight.type,
          prediction: insight.prediction,
          explanation: insight.explanation,
          related_metrics: insight.relatedMetrics,
          data_points: insight.dataPoints
        })))
      
      if (error) {
        console.error('Error saving insights to Supabase:', error)
        throw error
      }
      
    } catch (error) {
      console.error('Error in saveInsights:', error)
      throw error
    }
  }
  
  // Carregar insights do Supabase
  public async loadInsights(limit: number = 100, type?: string): Promise<NeuralInsight[]> {
    try {
      let query = supabase
        .from('neural_insights')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)
      
      if (type) {
        query = query.eq('type', type)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error loading insights from Supabase:', error)
        throw error
      }
      
      if (!data || data.length === 0) {
        return []
      }
      
      // Converter o formato do banco de dados para o formato do insight
      const insights: NeuralInsight[] = data.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        modelId: item.model_id,
        confidence: item.confidence,
        type: item.type,
        prediction: item.prediction,
        explanation: item.explanation,
        relatedMetrics: item.related_metrics,
        dataPoints: item.data_points
      }))
      
      return insights
    } catch (error) {
      console.error('Error in loadInsights:', error)
      return []
    }
  }
  
  // Configurar tabelas no Supabase (executar uma vez durante a configuração)
  public async setupTables(): Promise<void> {
    try {
      // Esta função é apenas para referência
      // Na prática, você deve criar as tabelas através do painel do Supabase
    } catch (error) {
      console.error('Error in setupTables:', error)
      throw error
    }
  }
}

// Exportar instância única
export const supabaseService = SupabaseService.getInstance()
