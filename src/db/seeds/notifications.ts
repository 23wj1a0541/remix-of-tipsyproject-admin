import { db } from '@/db';
import { notifications } from '@/db/schema';

async function main() {
    const sampleNotifications = [
        {
            userId: 3, // Aisha
            type: 'tip_received',
            title: 'New Tip Received!',
            body: 'You received a ₹250 tip from a customer. Keep up the great work!',
            read: false,
            createdAt: new Date('2024-12-09T14:30:00Z'),
        },
        {
            userId: 3, // Aisha
            type: 'review_posted',
            title: '5-Star Review Posted',
            body: 'A customer left you a 5-star review: "Excellent service, very friendly and attentive!"',
            read: true,
            createdAt: new Date('2024-12-08T16:45:00Z'),
        },
        {
            userId: 4, // Rahul
            type: 'tip_received',
            title: 'New Tip Received!',
            body: 'You received a ₹300 tip from a customer. Great job on the service!',
            read: false,
            createdAt: new Date('2024-12-09T18:15:00Z'),
        },
        {
            userId: 4, // Rahul
            type: 'review_posted',
            title: '4-Star Review Posted',
            body: 'A customer left you a 4-star review: "Good service, food was delivered quickly."',
            read: false,
            createdAt: new Date('2024-12-07T20:30:00Z'),
        },
        {
            userId: 5, // Priya
            type: 'tip_received',
            title: 'New Tip Received!',
            body: 'You received a ₹350 tip from a customer. Outstanding work today!',
            read: true,
            createdAt: new Date('2024-12-08T12:20:00Z'),
        },
        {
            userId: 1, // Admin system notification
            type: 'system',
            title: 'System Maintenance Scheduled',
            body: 'Scheduled maintenance will occur tonight from 2 AM to 4 AM. App may be temporarily unavailable.',
            read: false,
            createdAt: new Date('2024-12-09T10:00:00Z'),
        }
    ];

    await db.insert(notifications).values(sampleNotifications);
    
    console.log('✅ Notifications seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});