import { db } from '@/db';
import { tips } from '@/db/schema';

async function main() {
    const sampleTips = [
        // 4 tips for Aisha (userId: 3)
        {
            workerUserId: 3,
            restaurantId: 1,
            amountCents: 25000,
            currency: 'INR',
            payerName: 'Rajesh Kumar',
            message: 'Excellent service! Food was amazing and you were so helpful.',
            rating: 5,
            createdAt: new Date('2024-12-15T19:30:00Z'),
        },
        {
            workerUserId: 3,
            restaurantId: 1,
            amountCents: 15000,
            currency: 'INR',
            payerName: 'Priya Sharma',
            message: 'Thank you for the great recommendations!',
            rating: 4,
            createdAt: new Date('2024-12-18T14:45:00Z'),
        },
        {
            workerUserId: 3,
            restaurantId: 1,
            amountCents: 50000,
            currency: 'INR',
            payerName: null,
            message: 'Outstanding service, keep it up!',
            rating: 5,
            createdAt: new Date('2024-12-20T20:15:00Z'),
        },
        {
            workerUserId: 3,
            restaurantId: 1,
            amountCents: 20000,
            currency: 'INR',
            payerName: 'Amit Patel',
            message: null,
            rating: 4,
            createdAt: new Date('2024-12-23T18:20:00Z'),
        },
        // 4 tips for Rahul (userId: 4)
        {
            workerUserId: 4,
            restaurantId: 1,
            amountCents: 30000,
            currency: 'INR',
            payerName: 'Neha Singh',
            message: 'Very attentive and friendly service!',
            rating: 5,
            createdAt: new Date('2024-12-16T13:30:00Z'),
        },
        {
            workerUserId: 4,
            restaurantId: 1,
            amountCents: 12000,
            currency: 'INR',
            payerName: 'Vikram Gupta',
            message: 'Good service, tasty food!',
            rating: 4,
            createdAt: new Date('2024-12-19T21:00:00Z'),
        },
        {
            workerUserId: 4,
            restaurantId: 1,
            amountCents: 40000,
            currency: 'INR',
            payerName: null,
            message: 'Fantastic experience, will come back!',
            rating: 5,
            createdAt: new Date('2024-12-21T16:45:00Z'),
        },
        {
            workerUserId: 4,
            restaurantId: 1,
            amountCents: 18000,
            currency: 'INR',
            payerName: 'Kavya Reddy',
            message: 'Professional and courteous service.',
            rating: 4,
            createdAt: new Date('2024-12-24T12:30:00Z'),
        },
        // 2 tips for Priya (userId: 5)
        {
            workerUserId: 5,
            restaurantId: 1,
            amountCents: 35000,
            currency: 'INR',
            payerName: 'Arjun Mehta',
            message: 'Wonderful hospitality and great food suggestions!',
            rating: 5,
            createdAt: new Date('2024-12-17T19:15:00Z'),
        },
        {
            workerUserId: 5,
            restaurantId: 1,
            amountCents: 22000,
            currency: 'INR',
            payerName: null,
            message: null,
            rating: 3,
            createdAt: new Date('2024-12-22T15:45:00Z'),
        }
    ];

    await db.insert(tips).values(sampleTips);
    
    console.log('✅ Tips seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});