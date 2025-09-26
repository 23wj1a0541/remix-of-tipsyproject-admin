import { db } from '@/db';
import { restaurants } from '@/db/schema';

async function main() {
    const sampleRestaurants = [
        {
            ownerUserId: 2,
            name: 'Tipsy Test Kitchen',
            address: '42, MG Road, Koramangala, Bangalore, Karnataka 560034',
            upiHandle: 'tipsy@upi',
            createdAt: new Date('2024-01-30'),
        }
    ];

    await db.insert(restaurants).values(sampleRestaurants);
    
    console.log('✅ Restaurants seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});