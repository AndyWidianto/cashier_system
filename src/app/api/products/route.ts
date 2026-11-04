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

const createProductSchema = z.object({
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  name: z.string().min(1, 'Nama produk wajib diisi'),
  sku: z.string().min(1, 'SKU wajib diisi'),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, 'Harga jual tidak boleh negatif'),
  costPrice: z.coerce.number().min(0, 'Harga modal tidak boleh negatif'),
  stock: z.coerce.number().int().min(0, 'Stok tidak boleh negatif').default(0),
  minStock: z.coerce.number().int().min(0, 'Minimal stok tidak boleh negatif').default(5),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

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
    const categoryId = searchParams.get('categoryId') || '';
    const isActiveParam = searchParams.get('isActive');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== '') {
      where.isActive = isActiveParam === 'true';
    }

    if (pageParam || limitParam) {
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const limit = Math.max(1, parseInt(limitParam || '10', 10));
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: { category: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: products,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('GET products error:', error);
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

    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Admin yang memiliki akses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    const categoryExists = await prisma.category.findUnique({
      where: { id: validatedData.categoryId },
    });
    if (!categoryExists) {
      return NextResponse.json(
        { success: false, message: 'Kategori tidak ditemukan' },
        { status: 404 }
      );
    }

    const existingSku = await prisma.product.findUnique({
      where: { sku: validatedData.sku },
    });
    if (existingSku) {
      return NextResponse.json(
        { success: false, message: 'SKU produk sudah digunakan' },
        { status: 400 }
      );
    }

    if (validatedData.barcode) {
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

    const product = await prisma.product.create({
      data: {
        categoryId: validatedData.categoryId,
        name: validatedData.name,
        sku: validatedData.sku,
        barcode: validatedData.barcode || null,
        description: validatedData.description || null,
        price: validatedData.price,
        costPrice: validatedData.costPrice,
        stock: validatedData.stock,
        minStock: validatedData.minStock,
        image: validatedData.image || null,
        isActive: validatedData.isActive,
      },
      include: { category: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Produk berhasil dibuat',
        data: product,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || 'Data tidak valid' },
        { status: 400 }
      );
    }
    console.error('POST product error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
