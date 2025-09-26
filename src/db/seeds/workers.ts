import { db } from '@/db';
import { workers } from '@/db/schema';

async function main() {
    const sampleWorkers = [
        {
            userId: 3,
            restaurantId: 1,
            displayName: 'Aisha - Server',
            bio: 'Friendly server with 3 years of experience in fine dining. Known for excellent customer service and detailed knowledge of our menu. Always happy to help with recommendations!',
            qrcodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://tipflow.app/tip/aisha-server',
            upiVpa: 'aisha.kumar@paytm',
            earningsTotal: 2450.75,
            ratingAvg: 4.6,
            createdAt: new Date('2024-01-15T10:00:00Z').toISOString(),
            updatedAt: new Date('2024-01-15T10:00:00Z').toISOString(),
        },
        {
            userId: 4,
            restaurantId: 1,
            displayName: 'Rahul - Bartender',
            bio: 'Skilled bartender specializing in craft cocktails and traditional Indian beverages. 5 years of experience creating memorable drink experiences. Ask me about our signature cocktails!',
            qrcodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://tipflow.app/tip/rahul-bartender',
            upiVpa: 'rahul.mixologist@gpay',
            earningsTotal: 3280.50,
            ratingAvg: 4.8,
            createdAt: new Date('2024-01-18T14:30:00Z').toISOString(),
            updatedAt: new Date('2024-01-18T14:30:00Z').toISOString(),
        },
        {
            userId: 5,
            restaurantId: 1,
            displayName: 'Priya - Host',
            bio: 'Welcoming host who ensures every guest feels at home from the moment they arrive. Expert at managing reservations and creating a warm, inviting atmosphere for all our visitors.',
            qrcodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://tipflow.app/tip/priya-host',
            upiVpa: 'priya.welcome@phonepe',
            earningsTotal: 1875.25,
            ratingAvg: 4.4,
            createdAt: new Date('2024-01-22T09:15:00Z').toISOString(),
            updatedAt: new Date('2024-01-22T09:15:00Z').toISOString(),
        }
    ];

    await db.insert(workers).values(sampleWorkers);
    
    console.log('✅ Workers seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});