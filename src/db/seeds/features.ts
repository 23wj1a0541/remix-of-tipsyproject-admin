import { db } from '@/db';
import { features } from '@/db/schema';

async function main() {
    const sampleFeatures = [
        {
            key: 'qr_scanner',
            name: 'QR Code Scanner',
            description: 'Enable QR code scanning functionality for tip submissions',
            enabled: true,
            createdAt: new Date('2024-01-10').getTime(),
        },
        {
            key: 'owner_analytics',
            name: 'Owner Analytics Dashboard',
            description: 'Advanced analytics and reporting for restaurant owners',
            enabled: true,
            createdAt: new Date('2024-01-15').getTime(),
        },
        {
            key: 'review_moderation',
            name: 'Review Moderation System',
            description: 'Allow owners to moderate and approve customer reviews',
            enabled: true,
            createdAt: new Date('2024-01-20').getTime(),
        },
        {
            key: 'upi_payments',
            name: 'UPI Payment Integration',
            description: 'Direct UPI payment processing for tips',
            enabled: false,
            createdAt: new Date('2024-01-25').getTime(),
        },
    ];

    await db.insert(features).values(sampleFeatures);
    
    console.log('✅ Features seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});