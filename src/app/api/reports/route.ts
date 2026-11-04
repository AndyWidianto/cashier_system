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

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const dateFilter: any = {};
    if (startDateParam) {
      const start = new Date(startDateParam);
      if (!isNaN(start.getTime())) {
        dateFilter.gte = start;
      }
    }
    if (endDateParam) {
      const end = new Date(endDateParam);
      if (!isNaN(end.getTime())) {
        if (endDateParam.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        dateFilter.lte = end;
      }
    }

    const whereTransaction: any = {
      status: 'COMPLETED',
    };
    if (Object.keys(dateFilter).length > 0) {
      whereTransaction.createdAt = dateFilter;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereTransaction,
      include: {
        items: {
          include: {
            product: {
              select: {
                categoryId: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalGrossSales = 0;
    let totalCostOfGoods = 0;

    const paymentMethodStats: Record<string, { count: number; amount: number }> = {};
    const productStatsMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        productSku: string;
        totalQuantity: number;
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
      }
    >();

    const categoryStatsMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        totalQuantity: number;
        totalRevenue: number;
      }
    >();

    for (const tx of transactions) {
      const revenue = Number(tx.finalAmount || 0);
      const discount = Number(tx.discountAmount || 0);
      const tax = Number(tx.taxAmount || 0);
      const gross = Number(tx.totalAmount || 0);

      totalRevenue += revenue;
      totalDiscount += discount;
      totalTax += tax;
      totalGrossSales += gross;

      const pm = tx.paymentMethod;
      if (!paymentMethodStats[pm]) {
        paymentMethodStats[pm] = { count: 0, amount: 0 };
      }
      paymentMethodStats[pm].count += 1;
      paymentMethodStats[pm].amount += revenue;

      for (const item of tx.items) {
        const qty = item.quantity;
        const subtotal = Number(item.subtotal || 0);
        const itemCost = Number(item.costPrice || 0) * qty;
        totalCostOfGoods += itemCost;

        const existingProd = productStatsMap.get(item.productId);
        if (existingProd) {
          existingProd.totalQuantity += qty;
          existingProd.totalRevenue += subtotal;
          existingProd.totalCost += itemCost;
          existingProd.totalProfit += subtotal - itemCost;
        } else {
          productStatsMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            totalQuantity: qty,
            totalRevenue: subtotal,
            totalCost: itemCost,
            totalProfit: subtotal - itemCost,
          });
        }

        const catId = item.product?.category?.id || 'uncategorized';
        const catName = item.product?.category?.name || 'Uncategorized';
        const existingCat = categoryStatsMap.get(catId);
        if (existingCat) {
          existingCat.totalQuantity += qty;
          existingCat.totalRevenue += subtotal;
        } else {
          categoryStatsMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            totalQuantity: qty,
            totalRevenue: subtotal,
          });
        }
      }
    }

    const totalTransactions = transactions.length;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const grossProfit = totalRevenue - totalCostOfGoods;
    const profitMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const topProducts = Array.from(productStatsMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );

    const categoryPerformance = Array.from(categoryStatsMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    const paymentMethodsBreakdown = Object.entries(paymentMethodStats).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTransactions,
          totalRevenue,
          totalGrossSales,
          totalDiscount,
          totalTax,
          averageTransactionValue,
        },
        financials: {
          totalRevenue,
          totalCostOfGoods,
          grossProfit,
          profitMarginPercent,
        },
        paymentMethods: paymentMethodsBreakdown,
        topProducts,
        categoryPerformance,
      },
    });
  } catch (error) {
    console.error('GET reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
