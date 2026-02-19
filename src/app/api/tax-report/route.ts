import { NextRequest, NextResponse } from 'next/server';
import {
  calculateTaxReport,
  type TaxTransaction,
  type TaxJurisdiction,
} from '@/lib/tax/tax-calculator';

/**
 * POST /api/tax-report - Generate tax report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { transactions, taxYear, jurisdiction } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { success: false, error: 'Transactions array is required' },
        { status: 400 }
      );
    }

    if (!taxYear) {
      return NextResponse.json(
        { success: false, error: 'Tax year is required' },
        { status: 400 }
      );
    }

    // Validate jurisdiction
    const validJurisdictions: TaxJurisdiction[] = ['us', 'uk', 'eu'];
    const selectedJurisdiction: TaxJurisdiction = jurisdiction || 'us';

    if (!validJurisdictions.includes(selectedJurisdiction)) {
      return NextResponse.json(
        { success: false, error: 'Invalid jurisdiction' },
        { status: 400 }
      );
    }

    // Calculate tax report
    const report = calculateTaxReport(
      transactions as TaxTransaction[],
      taxYear,
      selectedJurisdiction
    );

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Tax report generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate tax report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
