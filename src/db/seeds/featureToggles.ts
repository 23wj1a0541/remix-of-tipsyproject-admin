import { db } from '@/db';
import { featureToggles } from '@/db/schema';

async function main() {
    const sampleFeatureToggles = [
        {
            key: 'qr_payments',
            label: 'QR Code Payments',
            enabled: true,
            audience: 'all',
            createdAt: new Date('2024-01-10').toISOString(),
            updatedAt: new Date('2024-01-10').toISOString(),
        },
        {
            key: 'review_moderation',
            label: 'Review Moderation System',
            enabled: false,
            audience: 'owners',
            createdAt: new Date('2024-01-12').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            key: 'analytics_dashboard',
            label: 'Analytics Dashboard',
            enabled: true,
            audience: 'owners',
            createdAt: new Date('2024-01-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            key: 'mobile_app',
            label: 'Mobile Application Access',
            enabled: true,
            audience: 'all',
            createdAt: new Date('2024-01-18').toISOString(),
            updatedAt: new Date('2024-01-20').toISOString(),
        },
        {
            key: 'tip_goals',
            label: 'Worker Tip Goals Feature',
            enabled: false,
            audience: 'workers',
            createdAt: new Date('2024-01-20').toISOString(),
            updatedAt: new Date('2024-01-22').toISOString(),
        },
        {
            key: 'multi_restaurant',
            label: 'Multi-Restaurant Management',
            enabled: true,
            audience: 'owners',
            createdAt: new Date('2024-01-25').toISOString(),
            updatedAt: new Date('2024-01-25').toISOString(),
        },
        {
            key: 'admin_panel',
            label: 'System Administration Panel',
            enabled: true,
            audience: 'admins',
            createdAt: new Date('2024-01-28').toISOString(),
            updatedAt: new Date('2024-01-28').toISOString(),
        },
        {
            key: 'push_notifications',
            label: 'Push Notification Service',
            enabled: false,
            audience: 'all',
            createdAt: new Date('2024-02-01').toISOString(),
            updatedAt: new Date('2024-02-03').toISOString(),
        }
    ];

    await db.insert(featureToggles).values(sampleFeatureToggles);
    
    console.log('✅ Feature toggles seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});