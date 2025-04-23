import { Page, ElementHandle } from "puppeteer";

interface MemberData {
  displayName: string;
  username: string | null;
  userID: string | null;
  avatar: string | null;
  status: string | null;
  index: number;
}

import fs from "fs";
import path from "path";

export async function scrapeServerMembers(
  page: Page,
  serverUrl: string
): Promise<MemberData[]> {
  console.log(" Starting sequential member scraping...");

  try {
    // 1. Navigate to server and ensure member list is visible
    await page.goto(serverUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await ensureMemberListVisible(page);

    // 2. Get the member list container
    const memberList = await page.waitForSelector('[aria-label="Members"]', {
      timeout: 10000,
    });
    if (!memberList) throw new Error("Member list not found");

    // 3. Start scraping sequentially
    const members = await scrapeWithIndexTracking(page, memberList);

    // 4. Save results to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `members_${timestamp}.json`;
    const filePath = path.join(process.cwd(), "data", fileName);

    // Create data directory if it doesn't exist
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(members, null, 2));
    console.log(` Saved ${members.length} members to ${filePath}`);

    return members;
  } catch (error) {
    console.error(
      " Scraping failed:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

async function scrapeWithIndexTracking(
  page: Page,
  memberList: ElementHandle<Element>
): Promise<MemberData[]> {
  const members: MemberData[] = [];
  let currentIndex = 0;
  let consecutiveFailures = 0;
  const maxFailures = 3;
  const scrollStep = 500;

  while (consecutiveFailures < maxFailures) {
    // Find member with current index
    const member = await memberList.$(`[index="${currentIndex}"]`);

    if (member) {
      try {
        // Process the member
        const memberData = await processMember(page, member, currentIndex);
        if (memberData) {
          members.push(memberData);
          console.log(
            ` ${currentIndex}: ${memberData.username || memberData.displayName}`
          );
          currentIndex++;
          consecutiveFailures = 0;

          // Scroll to keep member in view (every 10 members)
          if (currentIndex % 10 === 0) {
            await memberList.evaluate((el, index) => {
              const member = el.querySelector(`[index="${index}"]`);
              if (member)
                member.scrollIntoView({ behavior: "smooth", block: "center" });
            }, currentIndex);
            await delay(500);
          }
        }
      } catch (error) {
        console.warn(
          ` Error processing member ${currentIndex}:`,
          error instanceof Error ? error.message : String(error)
        );
        consecutiveFailures++;
      }
    } else {
      // Member not found - scroll down and try again
      console.log(` Member ${currentIndex} not found, scrolling...`);
      await memberList.evaluate((el, step) => {
        el.scrollBy(0, step);
      }, scrollStep);

      await delay(1000 + Math.random() * 500);
      consecutiveFailures++;

      // Check if we've reached the end
      const isAtBottom = await memberList.evaluate((el) => {
        return el.scrollHeight - el.scrollTop <= el.clientHeight + 100;
      });

      if (isAtBottom && consecutiveFailures >= maxFailures) {
        console.log("ℹ Reached end of member list");
        break;
      }
    }
  }

  console.log(` Finished scraping ${members.length} members`);
  return members;
}

async function processMember(
  page: Page,
  member: ElementHandle<Element>,
  index: number
): Promise<MemberData | null> {
  try {
    // Hover first to make element interactive
    await member.hover();
    await delay(200 + Math.random() * 300);

    // Get basic info without opening profile
    const basicInfo = await member.evaluate((el): Partial<MemberData> => {
      const avatarEl = el.querySelector(
        'img[src*="avatars"]'
      ) as HTMLImageElement | null;
      const nameEl = el.querySelector('[class*="name"]');
      const statusEl = el.querySelector('[class*="status"]');

      return {
        displayName: nameEl?.textContent?.trim() || "Unknown",
        userID: avatarEl?.src.match(/\/(\d+)\//)?.[1] || null,
        avatar: avatarEl?.src || null,
        status: statusEl?.getAttribute("aria-label") || "offline",
      };
    });

    // Click to open profile (with retry)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await member.click({ delay: 50 });
        await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
        break;
      } catch {
        if (attempt === 1) throw new Error("Failed to open profile");
        await delay(500);
      }
    }

    // Extract profile data
    const profileData = await page.evaluate((): Partial<MemberData> | null => {
      const profile = document.querySelector('[role="dialog"]');
      if (!profile) return null;

      const usernameEl = profile.querySelector(".userTagUsername__63ed3");
      const profileLink = profile.querySelector(
        'a[href*="/users/"]'
      ) as HTMLAnchorElement | null;

      return {
        username: usernameEl?.textContent?.trim() || null,
        userID: profileLink?.href.match(/\/users\/(\d+)/)?.[1] || null,
      };
    });

    // Close profile
    await page.keyboard.press("Escape");
    await delay(200);

    return {
      displayName: basicInfo.displayName || "Unknown",
      username: profileData?.username || null,
      userID: profileData?.userID || basicInfo.userID || null,
      avatar: basicInfo.avatar || null,
      status: basicInfo.status || null,
      index: index,
    };
  } catch (error) {
    console.warn(
      ` Failed to process member ${index}:`,
      error instanceof Error ? error.message : String(error)
    );
    await page.keyboard.press("Escape").catch(() => {});
    return null;
  }
}

// Helper functions

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureMemberListVisible(page: Page): Promise<void> {
  try {
    if (await page.$('[aria-label="Members"]')) return;

    const showButton = await page.waitForSelector(
      '[aria-label="Show Member List"]',
      {
        timeout: 10000,
        visible: true,
      }
    );

    if (showButton) {
      await showButton.click();
      await page.waitForSelector('[aria-label="Members"]', { timeout: 10000 });
    }
  } catch (error) {
    console.warn(
      " Could not expand member list:",
      error instanceof Error ? error.message : String(error)
    );
  }
}
