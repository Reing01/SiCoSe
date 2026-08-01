import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://127.0.0.1:4179";
  console.log(
    `\n[Playwright Setup] Validating server identity at ${baseURL}...`,
  );

  try {
    const response = await fetch(baseURL);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    const html = await response.text();
    if (!html.includes("SiCoSe - San Diego Chalma")) {
      throw new Error(
        "The title of the page does not match the SiCoSe application.",
      );
    }
    console.log("[Playwright Setup] Server identity verified successfully.\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `\n❌ [Playwright Setup ERROR] Verification failed: ${message}`,
    );
    console.error(
      "Playwright was about to test the wrong application or an invalid server.",
    );
    console.error(
      "Please stop any conflicting services running on the port.\n",
    );
    process.exit(1);
  }
}

export default globalSetup;
