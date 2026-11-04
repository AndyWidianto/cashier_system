import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const transactionItemSchema = z.object({
  productId: z.string().min(1, 'Product ID wajib diisi'),
  quantity: z.number().int().positive('Jumlah harus lebih dari 0'),
  unitPrice: z.number().min(0).optional(),
});

const createTransactionSchema = z.object({
  customerId: z.string().optional().nullable(),
  items: z.array(transactionItemSchema).min(1, 'Minimal 1 produk dalam transaksi'),
  discountAmount: z.number().min(0).optional().default(0),
  taxAmount: z.number().min(0).optional().default(0),
  paidAmount: z.number().min(0, 'Jumlah bayar tidak boleh kurang dari 0'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'QRIS', 'DEBIT_CARD']),
  notes: z.string().optional().nullable(),
});

function generateInvoiceNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(1000 + Math.random() * 9000);
  return `INV/${dateStr}/${randomStr}`;
}

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
    const search = searchParams.get('search') || '';
    const paymentMethod = searchParams.get('paymentMethod') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (pageParam || limitParam) {
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const limit = Math.max(1, parseInt(limitParam || '10', 10));
      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            customer: true,
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.transaction.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        customer: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('GET transactions error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak ditemukan atau kadaluwarsa' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createTransactionSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const productIds = validatedData.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = 0;
      const transactionItemsData = [];

      for (const item of validatedData.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`);
        }

        if (!product.isActive) {
          throw new Error(`Produk ${product.name} tidak aktif`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Stok produk "${product.name}" tidak mencukupi (Tersedia: ${product.stock}, Diminta: ${item.quantity})`
          );
        }

        const priceToUse = item.unitPrice !== undefined ? item.unitPrice : Number(product.price);
        const subtotal = priceToUse * item.quantity;
        totalAmount += subtotal;

        transactionItemsData.push({
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          unitPrice: priceToUse,
          costPrice: Number(product.costPrice),
          subtotal: subtotal,
        });
      }

      const discountAmount = validatedData.discountAmount || 0;
      const taxAmount = validatedData.taxAmount || 0;
      const finalAmount = totalAmount - discountAmount + taxAmount;

      if (validatedData.paidAmount < finalAmount) {
        throw new Error(
          `Jumlah pembayaran (Rp ${validatedData.paidAmount.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${finalAmount.toLocaleString('id-ID')})`
        );
      }

      const changeAmount = validatedData.paidAmount - finalAmount;
      const invoiceNumber = generateInvoiceNumber();

      const transaction = await tx.transaction.create({
        data: {
          invoiceNumber,
          userId: session.userId,
          customerId: validatedData.customerId || null,
          totalAmount,
          discountAmount,
          taxAmount,
          finalAmount,
          paidAmount: validatedData.paidAmount,
          changeAmount,
          paymentMethod: validatedData.paymentMethod,
          status: 'COMPLETED',
          notes: validatedData.notes || null,
          items: {
            create: transactionItemsData,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          customer: true,
          items: true,
        },
      });

      for (const item of validatedData.items) {
        const product = productMap.get(item.productId)!;
        const newStock = product.stock - item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: { stock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            userId: session.userId,
            type: 'SALE',
            quantity: item.quantity,
            previousStock: product.stock,
            newStock: newStock,
            reason: `Penjualan ${invoiceNumber}`,
            referenceNumber: invoiceNumber,
          },
        });
      }

      return transaction;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Transaksi berhasil dibuat',
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || 'Data transaksi tidak valid' },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    console.error('POST transaction error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
