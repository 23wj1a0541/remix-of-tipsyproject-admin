import { db } from '@/db';
import { workers } from '@/db/schema';

async function main() {
    const sampleWorkers = [
        {
            userId: 3,
            restaurantId: 1,
            displayName: 'John - Your Server',
            bio: 'Friendly server with 3 years experience. Always happy to help!',
            qrcodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=john.server@paytm&pn=John%20Server&cu=INR',
            upiVpa: 'john.server@paytm',
            earningsTotal: 2500.50,
            ratingAvg: 4.2,
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        }
    ];

    await db.insert(workers).values(sampleWorkers);
    
    console.log('✅ Workers seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});