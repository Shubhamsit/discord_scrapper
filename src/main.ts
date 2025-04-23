// main.ts
import {  loginToDiscord } from './login';
import { scrapeServerMembers } from './scrape';
import {goToUserProfile} from './profile';

(async () => {
  // Step 1: Get user credentials and log in
  // const { identifier, password } = await askCredentials();

  let identifier:string="shubhamsit31@gmail.com"
let password:string=""
let userid:string="1164576122818793565"
  const { browser, page } = await loginToDiscord(identifier, password);

  // await goToUserProfile(page,userid)



  // Step 2: Prompt user for the server URL to scrape
  const serverUrl = 'https://discord.com/channels/1231112132595028008/1231196402730664047'; // Replace with actual server URL
  let data=await scrapeServerMembers(page, serverUrl);
  console.log(data);
  

  // Close the browser when done
  await browser.close();
})();
