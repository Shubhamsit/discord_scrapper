import { loginToDiscord } from "./login";
import { scrapeServerMembers } from "./scrape";
import { prompt } from "enquirer";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("Loaded SERVERURL:", process.env.SERVERURL);

interface Credentials {
  identifier: string;
  password: string;
}

async function askCredentials(): Promise<Credentials> {
  const response = await prompt([
    {
      type: "input",
      name: "identifier",
      message: "Enter your Discord email or username:",
      validate: (value: string) =>
        value.trim() ? true : "Please enter your email/username",
    },
    {
      type: "password",
      name: "password",
      message: "Enter your Discord password:",
      validate: (value: string) => (value ? true : "Password cannot be empty"),
    },
  ]);

 
  return response as Credentials;
}

(async () => {

  

  const { identifier, password } = await askCredentials();

  const { browser, page } = await loginToDiscord(identifier, password);



  const serverUrl = process.env.SERVERURL;

  if (!serverUrl) {
    throw new Error("SERVERURL is not defined in your .env file.");
  }

  let data = await scrapeServerMembers(page, serverUrl);
  console.log(data);

  

  await browser.close();
})();
