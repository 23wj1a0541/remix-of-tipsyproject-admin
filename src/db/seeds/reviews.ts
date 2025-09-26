import { db } from '@/db';
import { reviews } from '@/db/schema';

async function main() {
    const sampleReviews = [
        {
            workerUserId: 1, // Aisha
            restaurantId: 1,
            rating: 5,
            comment: 'Amazing service! Aisha was incredibly helpful and friendly throughout our meal.',
            tipId: 1, // Review for Aisha's tip
            status: 'approved',
            moderatedByUserId: 4, // Admin
            createdAt: new Date('2024-01-16'),
        },
        {
            workerUserId: 2, // Rahul
            restaurantId: 1,
            rating: 5,
            comment: 'Rahul provided excellent service and made great recommendations from the menu.',
            tipId: 2, // Review for Rahul's tip
            status: 'approved',
            moderatedByUserId: 4, // Admin
            createdAt: new Date('2024-01-18'),
        },
        {
            workerUserId: 3, // Priya
            restaurantId: 2,
            rating: 5,
            comment: 'Priya was wonderful! Very attentive and made sure we had everything we needed.',
            tipId: 3, // Review for Priya's tip
            status: 'approved',
            moderatedByUserId: 4, // Admin
            createdAt: new Date('2024-01-20'),
        },
        {
            workerUserId: 1, // Aisha
            restaurantId: 1,
            rating: 4,
            comment: 'Good service overall. The staff was polite and food came out quickly.',
            tipId: null, // Standalone review
            status: 'pending',
            moderatedByUserId: null,
            createdAt: new Date('2024-01-22'),
        },
        {
            workerUserId: 2, // Rahul
            restaurantId: 1,
            rating: 2,
            comment: 'Service was slow and the order was mixed up. Not a great experience.',
            tipId: null, // Standalone review
            status: 'rejected',
            moderatedByUserId: 4, // Admin
            createdAt: new Date('2024-01-24'),
        },
        {
            workerUserId: 3, // Priya
            restaurantId: 2,
            rating: 4,
            comment: 'Pleasant dining experience. The service was efficient and staff was courteous.',
            tipId: null, // Standalone review
            status: 'approved',
            moderatedByUserId: 4, // Admin
            createdAt: new Date('2024-01-26'),
        }
    ];

    await db.insert(reviews).values(sampleReviews);
    
    console.log('✅ Reviews seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});