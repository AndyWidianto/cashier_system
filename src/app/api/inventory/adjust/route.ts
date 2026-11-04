import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const adjustStockSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().int('Jumlah harus berupa angka bulat'),
  reason: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
});

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
    const validatedData = adjustStockSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: validatedData.productId },
      });

      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }

      const previousStock = product.stock;
      let newStock = previousStock;
      let movementQty = 0;

      if (validatedData.type === 'IN') {
        const qty = Math.abs(validatedData.quantity);
        if (qty <= 0) throw new Error('Jumlah stok masuk harus lebih dari 0');
        newStock = previousStock + qty;
        movementQty = qty;
      } else if (validatedData.type === 'OUT') {
        const qty = Math.abs(validatedData.quantity);
        if (qty <= 0) throw new Error('Jumlah stok keluar harus lebih dari 0');
        if (previousStock - qty < 0) {
          throw new Error(`Stok tidak mencukupi (stok saat ini: ${previousStock})`);
        }
        newStock = previousStock - qty;
        movementQty = -qty;
      } else if (validatedData.type === 'ADJUSTMENT') {
        if (validatedData.quantity < 0) {
          throw new Error('Penyesuaian stok baru tidak boleh negatif');
        }
        newStock = validatedData.quantity;
        movementQty = newStock - previousStock;
      }

      const updatedProduct = await tx.product.update({
        where: { id: validatedData.productId },
        data: { stock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: validatedData.productId,
          userId: session.userId,
          type: validatedData.type,
          quantity: movementQty,
          previousStock,
          newStock,
          reason: validatedData.reason || null,
          referenceNumber: validatedData.referenceNumber || null,
        },
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      });

      return { product: updatedProduct, movement };
    });

    return NextResponse.json({
      success: true,
      message: 'Penyesuaian stok berhasil disimpan',
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || 'Data tidak valid' },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada server';
    return NextResponse.json(
      { success: false, message },
      { status: 400 }
    );
  }
}
