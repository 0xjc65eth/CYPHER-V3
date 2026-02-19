/**
 * Position Sizing Calculator
 * Helps traders calculate optimal position sizes based on risk parameters
 */

export interface PositionSizingInput {
  // Portfolio
  portfolioValue: number;
  riskPercentage: number; // e.g., 2% = 2

  // Entry and Exit
  entryPrice: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;

  // Optional: Custom risk amount instead of percentage
  customRiskAmount?: number;
}

export interface PositionSizingResult {
  // Position Details
  positionSize: number; // Number of units to buy
  positionValue: number; // Total cost of position
  portfolioPercentage: number; // % of portfolio this position represents

  // Risk Metrics
  riskAmount: number; // Dollar amount at risk
  riskPerUnit: number; // Risk per unit (entry - stop loss)
  riskRewardRatio?: number; // Reward/Risk ratio

  // Profit/Loss Scenarios
  maxLoss: number; // Maximum loss if stop loss hit
  maxLossPercentage: number; // % of portfolio at risk
  expectedProfit?: number; // Expected profit if take profit hit
  expectedProfitPercentage?: number; // % gain if take profit hit

  // Warnings
  warnings: string[];
  isViable: boolean;
}

export function calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
  const warnings: string[] = [];
  let isViable = true;

  // Validate inputs
  if (input.portfolioValue <= 0) {
    warnings.push('Portfolio value must be greater than 0');
    isViable = false;
  }

  if (input.entryPrice <= 0) {
    warnings.push('Entry price must be greater than 0');
    isViable = false;
  }

  if (input.riskPercentage < 0 || input.riskPercentage > 100) {
    warnings.push('Risk percentage must be between 0 and 100');
    isViable = false;
  }

  // Calculate risk amount
  const riskAmount = input.customRiskAmount || (input.portfolioValue * (input.riskPercentage / 100));

  if (riskAmount <= 0) {
    warnings.push('Risk amount must be greater than 0');
    isViable = false;
  }

  // Calculate risk per unit (if stop loss is provided)
  let riskPerUnit = 0;
  let positionSize = 0;
  let positionValue = 0;

  if (input.stopLossPrice !== undefined && input.stopLossPrice > 0) {
    // Validate stop loss makes sense
    if (input.stopLossPrice >= input.entryPrice) {
      warnings.push('Stop loss must be below entry price for long positions');
      isViable = false;
    } else {
      riskPerUnit = input.entryPrice - input.stopLossPrice;

      if (riskPerUnit > 0) {
        // Calculate position size based on risk
        positionSize = riskAmount / riskPerUnit;
        positionValue = positionSize * input.entryPrice;
      } else {
        warnings.push('Invalid stop loss price');
        isViable = false;
      }
    }
  } else {
    // Without stop loss, use default 50% of entry as stop loss assumption
    riskPerUnit = input.entryPrice * 0.5;
    positionSize = riskAmount / riskPerUnit;
    positionValue = positionSize * input.entryPrice;
    warnings.push('No stop loss provided - using 50% of entry price as default');
  }

  // Calculate portfolio percentage
  const portfolioPercentage = input.portfolioValue > 0 ? (positionValue / input.portfolioValue) * 100 : 0;

  // Position size validation
  if (portfolioPercentage > 50) {
    warnings.push(`Position size is ${portfolioPercentage.toFixed(1)}% of portfolio - consider reducing risk`);
  }

  if (portfolioPercentage > 100) {
    warnings.push('Position size exceeds portfolio value - LEVERAGE REQUIRED');
    isViable = false;
  }

  // Calculate max loss
  const maxLoss = positionSize * riskPerUnit;
  const maxLossPercentage = input.portfolioValue > 0 ? (maxLoss / input.portfolioValue) * 100 : 0;

  // Calculate profit metrics (if take profit is provided)
  let expectedProfit: number | undefined;
  let expectedProfitPercentage: number | undefined;
  let riskRewardRatio: number | undefined;

  if (input.takeProfitPrice !== undefined && input.takeProfitPrice > 0) {
    if (input.takeProfitPrice <= input.entryPrice) {
      warnings.push('Take profit must be above entry price for long positions');
    } else {
      const profitPerUnit = input.takeProfitPrice - input.entryPrice;
      expectedProfit = positionSize * profitPerUnit;
      expectedProfitPercentage = input.portfolioValue > 0 ? (expectedProfit / input.portfolioValue) * 100 : 0;

      if (riskPerUnit > 0) {
        riskRewardRatio = profitPerUnit / riskPerUnit;

        // Risk/Reward validation
        if (riskRewardRatio < 1) {
          warnings.push(`Risk/Reward ratio is ${riskRewardRatio.toFixed(2)} - consider better risk/reward (aim for 2:1 or higher)`);
        } else if (riskRewardRatio < 2) {
          warnings.push(`Risk/Reward ratio is ${riskRewardRatio.toFixed(2)} - acceptable but aim for 2:1 or higher`);
        }
      }
    }
  }

  return {
    positionSize,
    positionValue,
    portfolioPercentage,
    riskAmount,
    riskPerUnit,
    riskRewardRatio,
    maxLoss,
    maxLossPercentage,
    expectedProfit,
    expectedProfitPercentage,
    warnings,
    isViable,
  };
}

/**
 * Calculate Kelly Criterion optimal bet size
 */
export function calculateKellyCriterion(
  winProbability: number,
  winAmount: number,
  lossAmount: number
): {
  kellyPercentage: number;
  halfKellyPercentage: number;
  recommendation: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Validate inputs
  if (winProbability < 0 || winProbability > 1) {
    warnings.push('Win probability must be between 0 and 1');
  }

  if (winAmount <= 0) {
    warnings.push('Win amount must be positive');
  }

  if (lossAmount <= 0) {
    warnings.push('Loss amount must be positive');
  }

  // Kelly Criterion formula: f* = (bp - q) / b
  // where b = win/loss ratio, p = win probability, q = 1 - p
  const b = winAmount / lossAmount;
  const p = winProbability;
  const q = 1 - p;

  const kellyPercentage = ((b * p) - q) / b * 100;
  const halfKellyPercentage = kellyPercentage / 2;

  let recommendation = '';
  if (kellyPercentage <= 0) {
    recommendation = 'Negative expected value - DO NOT TAKE THIS TRADE';
    warnings.push('This trade has negative expected value');
  } else if (kellyPercentage > 20) {
    recommendation = `Kelly suggests ${kellyPercentage.toFixed(1)}% but this is very aggressive. Consider half-Kelly (${halfKellyPercentage.toFixed(1)}%) or less.`;
    warnings.push('Kelly percentage is very high - use caution');
  } else if (kellyPercentage > 10) {
    recommendation = `Kelly suggests ${kellyPercentage.toFixed(1)}%. Consider using half-Kelly (${halfKellyPercentage.toFixed(1)}%) for more conservative sizing.`;
  } else {
    recommendation = `Kelly suggests ${kellyPercentage.toFixed(1)}% position size. Half-Kelly would be ${halfKellyPercentage.toFixed(1)}%.`;
  }

  return {
    kellyPercentage: Math.max(0, kellyPercentage),
    halfKellyPercentage: Math.max(0, halfKellyPercentage),
    recommendation,
    warnings,
  };
}

/**
 * Calculate Expected Value (EV) of a trade
 */
export function calculateExpectedValue(
  winProbability: number,
  winAmount: number,
  lossProbability: number,
  lossAmount: number
): {
  expectedValue: number;
  expectedValuePercentage: number;
  isPositiveEV: boolean;
  recommendation: string;
} {
  // EV = (Win% × Win$) - (Loss% × Loss$)
  const expectedValue = (winProbability * winAmount) - (lossProbability * lossAmount);

  // EV as percentage of risk
  const expectedValuePercentage = lossAmount > 0 ? (expectedValue / lossAmount) * 100 : 0;

  const isPositiveEV = expectedValue > 0;

  let recommendation = '';
  if (expectedValue <= 0) {
    recommendation = 'NEGATIVE EV - Avoid this trade';
  } else if (expectedValuePercentage < 10) {
    recommendation = 'Positive EV but low expected return - consider if worth the risk';
  } else if (expectedValuePercentage < 50) {
    recommendation = 'Good positive EV trade - acceptable risk/reward';
  } else {
    recommendation = 'EXCELLENT EV - Strong positive expected value';
  }

  return {
    expectedValue,
    expectedValuePercentage,
    isPositiveEV,
    recommendation,
  };
}

/**
 * Calculate stop loss and take profit levels based on risk/reward ratio
 */
export function calculateStopLossTakeProfit(
  entryPrice: number,
  riskRewardRatio: number,
  riskPercentage: number
): {
  stopLossPrice: number;
  takeProfitPrice: number;
  stopLossDistance: number;
  takeProfitDistance: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
} {
  // Calculate stop loss based on risk percentage
  const stopLossDistance = entryPrice * (riskPercentage / 100);
  const stopLossPrice = entryPrice - stopLossDistance;

  // Calculate take profit based on risk/reward ratio
  const takeProfitDistance = stopLossDistance * riskRewardRatio;
  const takeProfitPrice = entryPrice + takeProfitDistance;

  // Calculate percentages
  const stopLossPercentage = (stopLossDistance / entryPrice) * 100;
  const takeProfitPercentage = (takeProfitDistance / entryPrice) * 100;

  return {
    stopLossPrice,
    takeProfitPrice,
    stopLossDistance,
    takeProfitDistance,
    stopLossPercentage,
    takeProfitPercentage,
  };
}
