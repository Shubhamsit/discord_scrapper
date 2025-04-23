
import { Page } from 'puppeteer';

export async function goToUserProfile(page: Page, userId: string): Promise<void> {
    try {
        // Navigate directly to user's profile URL
        await page.goto(`https://discord.com/users/${userId}`, {
            waitUntil: 'domcontentloaded', // More reliable than networkidle2
            timeout: 30000 // Increased timeout
        });

        // Wait for either the profile to load or the login page (in case we got logged out)
        await Promise.race([
            page.waitForSelector('[class*="username"], [class*="userProfile"]', { timeout: 15000 }),
            page.waitForSelector('[aria-label="Login"]', { timeout: 15000 })
        ]);

        // Check if we're actually on the profile page
        const isProfileLoaded = await page.evaluate(() => {
            return !!document.querySelector('[class*="username"], [class*="userProfile"]');
        });

        if (!isProfileLoaded) {
            throw new Error('Profile did not load properly - possibly redirected to login');
        }

        console.log(`✅ Successfully loaded profile for user ${userId}`);
        
    } catch (error) {
        console.error(` Failed to load profile for ${userId}:`, 
            error instanceof Error ? error.message : String(error));
        throw error; 
    }
}