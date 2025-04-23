

import { Page, ElementHandle } from 'puppeteer';

interface MemberData {
  displayName: string;
  username: string | null;
  userID: string | null;
  avatar: string | null;
  status: string;
}

export async function scrapeServerMembers(page: Page, serverUrl: string): Promise<MemberData[]> {
  console.log(' Navigating to the server...');

  try {
    await page.goto(serverUrl, { waitUntil: 'networkidle2' });
    console.log(' Page loaded successfully');
    await ensureMemberListVisible(page);
    return await scrapeMembersWithProfiles(page); // Scrape members after the list is fully loaded
  } catch (error) {
    console.error(' Error in scrapeServerMembers:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

async function ensureMemberListVisible(page: Page): Promise<void> {
  try {
    if (await page.$('[aria-label="Members"]')) {
      console.log(' Member list already visible');
      return;
    }

    console.log(' Expanding member list...');
    const showMembersButton = await page.waitForSelector('[aria-label="Show Member List"]', {
      timeout: 10000,
      visible: true
    });

    if (showMembersButton) {
      await showMembersButton.click();
      console.log("click1");
      
      await page.waitForSelector('[aria-label="Members"]', { timeout: 10000 });
    }
  } catch (error) {
    console.log(' Continuing with potentially incomplete member list:', error instanceof Error ? error.message : String(error));
  }
}


async function scrapeMembersWithProfiles(page: Page): Promise<MemberData[]> {
  console.log('👥 Starting detailed member scraping...');

 
  await page.waitForSelector('[aria-label="Members"] [class*="member"]', { timeout: 5000 });
  
  const memberHandles = await page.$$('[aria-label="Members"] [class*="member"]');
  console.log(memberHandles.length,"length");
  console.log(memberHandles);
  
  
  const members: MemberData[] = [];

  for (const [index, member] of memberHandles.entries()) {
 
    try {
      await member.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      const userData = await page.evaluate((): MemberData => {
        const profile = document.querySelector('[role="dialog"]');
        const usernameElement = profile?.querySelector('.userTagUsername__63ed3');
        const avatarElement = profile?.querySelector('img[src*="avatars"]') as HTMLImageElement | null;
        const profileLink = profile?.querySelector('a[href*="/users/"]') as HTMLAnchorElement | null;
        
        return {
          displayName: profile?.querySelector('.nickname__63ed3')?.textContent?.trim() || 'Unknown',
          username: usernameElement?.textContent?.trim() || null,
          userID: profileLink?.href.match(/\/users\/(\d+)/)?.[1] || null,
          avatar: avatarElement?.src || null,
          status: profile?.querySelector('[class*="status"]')?.ariaLabel || 'offline'
        };
      });
      
      if (userData.username) {
        console.log(` ${index+1}/${memberHandles.length}: ${userData.username}`);
        members.push(userData);
      }
      
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.warn(` Skipping member ${index+1}:`, error instanceof Error ? error.message : String(error));
    }
  }
  
  console.log(` Successfully scraped ${members.length}/${memberHandles.length} members`);
  return members;
}


