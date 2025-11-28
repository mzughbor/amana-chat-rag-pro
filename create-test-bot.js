// Script to create a test bot with a specific ID directly in the database
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

async function createTestBot() {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set in environment variables.');
        console.error('Please make sure the .env file exists and contains DATABASE_URL.');
        process.exit(1);
    }

    const prisma = new PrismaClient();

    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('✅ Database connected');

        // Check if the bot already exists
        const existingBot = await prisma.bot.findUnique({
            where: {
                id: '3c372145-2864-4562-b65d-4b1aeeaac606'
            }
        });

        if (existingBot) {
            console.log('✅ Bot with ID 3c372145-2864-4562-b65d-4b1aeeaac606 already exists');
            console.log('Bot name:', existingBot.name);
            await prisma.$disconnect();
            return;
        }

        // Create a site first (required for the bot)
        const siteId = crypto.randomUUID();
        const userId = 'test-user-id'; // This would normally come from the session

        console.log('Creating site...');
        await prisma.site.create({
            data: {
                id: siteId,
                userId: userId,
                name: 'Test Site',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log('✅ Site created with ID:', siteId);

        // Create the bot with the specific ID
        console.log('Creating bot with ID 3c372145-2864-4562-b65d-4b1aeeaac606...');
        await prisma.bot.create({
            data: {
                id: '3c372145-2864-4562-b65d-4b1aeeaac606',
                siteId: siteId,
                name: 'First Test Bot',
                welcomeMessage: 'Hello! How can I help you today?',
                status: 'active',
                widgetSettings: {},
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        console.log('✅ Bot created successfully with ID: 3c372145-2864-4562-b65d-4b1aeeaac606');

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Error creating test bot:', error.message);
        await prisma.$disconnect();
        process.exit(1);
    }
}

createTestBot();