import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const updateProductSchema = z.object({
  categoryId: z.string().min(1, 'Kategori wajib dipilih').optional(),
  name: z.string().min(1, 'Nama produk wajib diisi').optional(),
  sku: z.string().min(1, 'SKU wajib diisi').optional(),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Harga jual tidak boleh negatif').optional(),
  costPrice: z.coerce.number().min(0, 'Harga modal tidak boleh negatif').optional(),
  stock: z.coerce.number().int().min(0, 'Stok tidak boleh negatif').optional(),
  minStock: z.coerce.number().int().min(0, 'Minimal stok tidak boleh negatif').optional(),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak ditemukan atau kadaluwarsa' },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('GET product error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak ditemukan atau kadaluwarsa' },
        { status: 401 }
      );
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Admin yang memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    if (validatedData.categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: validatedData.categoryId },
      });
      if (!categoryExists) {
        return NextResponse.json(
          { success: false, message: 'Kategori tidak ditemukan' },
          { status: 404 }
        );
      }
    }

    if (validatedData.sku && validatedData.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: validatedData.sku },
      });
      if (existingSku) {
        return NextResponse.json(
          { success: false, message: 'SKU produk sudah digunakan' },
          { status: 400 }
        );
      }
    }

    if (
      validatedData.barcode !== undefined &&
      validatedData.barcode !== null &&
      validatedData.barcode !== existingProduct.barcode
    ) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: validatedData.barcode },
      });
      if (existingBarcode) {
        return NextResponse.json(
          { success: false, message: 'Barcode produk sudah digunakan' },
          { status: 400 }
        );
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(validatedData.categoryId && { categoryId: validatedData.categoryId }),
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.sku && { sku: validatedData.sku }),
        ...(validatedData.barcode !== undefined && { barcode: validatedData.barcode }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.price !== undefined && { price: validatedData.price }),
        ...(validatedData.costPrice !== undefined && { costPrice: validatedData.costPrice }),
        ...(validatedData.stock !== undefined && { stock: validatedData.stock }),
        ...(validatedData.minStock !== undefined && { minStock: validatedData.minStock }),
        ...(validatedData.image !== undefined && { image: validatedData.image }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
      },
      include: { category: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui',
      data: updatedProduct,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || 'Data tidak valid' },
        { status: 400 }
      );
    }
    console.error('PUT product error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak ditemukan atau kadaluwarsa' },
        { status: 401 }
      );
    }

    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Admin yang memiliki akses' },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    const hasTransactions = await prisma.transactionItem.count({
      where: { productId: id },
    });

    if (hasTransactions > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: 'Produk memiliki riwayat transaksi, status diubah menjadi tidak aktif',
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus',
    });
  } catch (error) {
    console.error('DELETE product error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
