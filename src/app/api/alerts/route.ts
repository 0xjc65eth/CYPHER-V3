import { NextRequest, NextResponse } from 'next/server';
import { type Alert, type AlertUnion } from '@/lib/alerts/alert-engine';

// In-memory storage for demo (in production, use database)
let alerts: AlertUnion[] = [];
let nextId = 1;

/**
 * GET /api/alerts - Get all alerts for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'demo-user';
    const status = searchParams.get('status'); // 'active', 'inactive', 'triggered'
    const assetType = searchParams.get('assetType'); // 'crypto', 'ordinal', 'rune'

    let filteredAlerts = alerts.filter(alert => alert.userId === userId);

    if (status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
    }

    if (assetType) {
      filteredAlerts = filteredAlerts.filter(alert => alert.assetType === assetType);
    }

    // Sort by createdAt (newest first)
    filteredAlerts.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      success: true,
      data: filteredAlerts,
      count: filteredAlerts.length,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/alerts - Create a new alert
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'Alert type is required' },
        { status: 400 }
      );
    }

    if (!body.asset) {
      return NextResponse.json(
        { success: false, error: 'Asset is required' },
        { status: 400 }
      );
    }

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Alert name is required' },
        { status: 400 }
      );
    }

    // Create new alert
    const now = Date.now();
    const newAlert: Alert = {
      id: `alert_${nextId++}`,
      userId: body.userId || 'demo-user',
      type: body.type,
      status: 'active',
      asset: body.asset,
      assetType: body.assetType || 'crypto',
      condition: body.condition,
      targetValue: body.targetValue,
      percentage: body.percentage,
      name: body.name,
      description: body.description,
      createdAt: now,
      updatedAt: now,
      triggerCount: 0,
      notifyInApp: body.notifyInApp !== false, // default true
      notifyEmail: body.notifyEmail || false,
      notifyPush: body.notifyPush || false,
      expiresAt: body.expiresAt,
      oneTime: body.oneTime || false,
    };

    // Add type-specific fields
    switch (body.type) {
      case 'price':
        (newAlert as any).targetPrice = body.targetPrice;
        break;
      case 'volume':
        (newAlert as any).multiplier = body.multiplier || 2;
        (newAlert as any).timeframe = body.timeframe || '24h';
        break;
      case 'whale':
        (newAlert as any).threshold = body.threshold || 100000;
        (newAlert as any).direction = body.direction || 'both';
        break;
      case 'milestone':
        (newAlert as any).milestone = body.milestone;
        (newAlert as any).timeframe = body.timeframe || 'all';
        break;
      case 'trend':
        (newAlert as any).trendType = body.trendType;
        (newAlert as any).sensitivity = body.sensitivity || 'medium';
        break;
    }

    alerts.push(newAlert as AlertUnion);

    return NextResponse.json({
      success: true,
      data: newAlert,
      message: 'Alert created successfully',
    });
  } catch (error) {
    console.error('Create alert error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/alerts - Update an alert
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    const alertIndex = alerts.findIndex(a => a.id === body.id);

    if (alertIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Update alert
    const existingAlert = alerts[alertIndex];
    const updatedAlert = {
      ...existingAlert,
      ...body,
      id: existingAlert.id, // Don't allow ID change
      userId: existingAlert.userId, // Don't allow userId change
      createdAt: existingAlert.createdAt, // Don't allow createdAt change
      updatedAt: Date.now(),
    };

    alerts[alertIndex] = updatedAlert as AlertUnion;

    return NextResponse.json({
      success: true,
      data: updatedAlert,
      message: 'Alert updated successfully',
    });
  } catch (error) {
    console.error('Update alert error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/alerts - Delete an alert
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    const alertIndex = alerts.findIndex(a => a.id === id);

    if (alertIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    const deletedAlert = alerts.splice(alertIndex, 1)[0];

    return NextResponse.json({
      success: true,
      data: deletedAlert,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
