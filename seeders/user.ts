import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

export async function createUsers() {
    try {
        console.log("🌱 Mulai seeding data user...");

        // Hash password default untuk keamanan
        const hashedPassword = await bcrypt.hash("password123", 10);

        // Data dummy user yang akan dimasukkan
        const usersData = [
            {
                name: "Administrator Utama",
                email: "admin@sistemkasir.com",
                password: hashedPassword,
                role: Role.ADMIN, // Sesuaikan dengan enum Role di schema Anda
            },
            {
                name: "Kasir Toko 1",
                email: "kasir1@sistemkasir.com",
                password: hashedPassword,
                role: Role.CASHIER,
            },
        ];

        for (const userData of usersData) {
            // Gunakan upsert agar tidak error jika data dengan email tersebut sudah ada
            const user = await prisma.user.upsert({
                where: { email: userData.email },
                update: {},
                create: userData,
            });

            console.log(`✅ User berhasil dibuat/ditemukan: ${user.email} (${user.role})`);
        }

        console.log("✨ Seeding user selesai!");
    } catch (error) {
        console.error("❌ Terjadi kesalahan saat seeding user:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}