import { db } from '@/db';
import { users } from '@/db/schema';

async function main() {
    const sampleUsers = [
        {
            authUserId: 'admin_auth_1',
            role: 'admin',
            name: 'System Admin',
            email: 'admin@tipmate.com',
            phone: '+91-9999999999',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
            createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
            authUserId: 'owner_auth_1',
            role: 'owner',
            name: 'Rajesh Kumar',
            email: 'rajesh@tipsykitchen.com',
            phone: '+91-9876543210',
            avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
            createdAt: new Date('2024-01-05T00:00:00.000Z'),
        },
        {
            authUserId: 'worker_auth_1',
            role: 'worker',
            name: 'Aisha Sharma',
            email: 'aisha.sharma@gmail.com',
            phone: '+91-9876543211',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b1c4?w=400&h=400&fit=crop&crop=face',
            createdAt: new Date('2024-01-10T00:00:00.000Z'),
        },
        {
            authUserId: 'worker_auth_2',
            role: 'worker',
            name: 'Rahul Patel',
            email: 'rahul.patel@gmail.com',
            phone: '+91-9876543212',
            avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
            createdAt: new Date('2024-01-12T00:00:00.000Z'),
        },
        {
            authUserId: 'worker_auth_3',
            role: 'worker',
            name: 'Priya Singh',
            email: 'priya.singh@gmail.com',
            phone: '+91-9876543213',
            avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
            createdAt: new Date('2024-01-15T00:00:00.000Z'),
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});