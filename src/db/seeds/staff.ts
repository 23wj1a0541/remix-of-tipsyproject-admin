import { db } from '@/db';
import { staff } from '@/db/schema';

async function main() {
    const sampleStaff = [
        {
            restaurantId: 1,
            userId: 3,
            roleInRestaurant: 'server',
            qrSlug: 'aisha-qr',
            joinedAt: new Date('2024-02-07'),
        },
        {
            restaurantId: 1,
            userId: 4,
            roleInRestaurant: 'bartender',
            qrSlug: 'rahul-qr',
            joinedAt: new Date('2024-02-15'),
        },
        {
            restaurantId: 1,
            userId: 5,
            roleInRestaurant: 'hostess',
            qrSlug: 'priya-qr',
            joinedAt: new Date('2024-02-22'),
        }
    ];

    await db.insert(staff).values(sampleStaff);
    
    console.log('✅ Staff seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});