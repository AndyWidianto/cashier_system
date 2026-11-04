import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak ditemukan atau kadaluwarsa' },
        { status: 401 }
      );
    }

    // 1. Total Revenue & Total Sales Count (Completed transactions only)
    const stats = await prisma.transaction.aggregate({
      _sum: {
        finalAmount: true,
      },
      _count: {
        id: true,
      },
      where: {
        status: 'COMPLETED',
      },
    });

    // 2. Total Active Products
    const totalProducts = await prisma.product.count({
      where: {
        isActive: true,
      },
    });

    // 3. Low-stock Alerts
    // Fetch products to compare stock levels against minStock
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        stock: true,
        minStock: true,
      },
    });
    const lowStockAlerts = products.filter((p) => p.stock <= p.minStock).length;

    // 4. 7-Day Sales History (Revenue per day for the last 7 days)
    const salesHistory = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayStats = await prisma.transaction.aggregate({
        _sum: {
          finalAmount: true,
        },
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      });

      salesHistory.push({
        date: date.toISOString().split('T')[0],
        revenue: Number(dayStats._sum.finalAmount || 0),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue: Number(stats._sum.finalAmount || 0),
        totalSales: stats._count.id,
        totalProducts,
        lowStockAlerts,
        salesHistory,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
