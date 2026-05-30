const { Builder, By, until } = require("selenium-webdriver");
require("chromedriver");

async function waitForText(driver, text, timeout = 20000) {
  await driver.wait(
    until.elementLocated(By.xpath(`//*[contains(text(),"${text}")]`)),
    timeout
  );
}

async function runTest() {
  const driver = await new Builder().forBrowser("chrome").build();

  try {
    await driver.get("http://localhost:4200");

    await waitForText(driver, "Pharma Analytics Dashboard", 10000);
    console.log("Dashboard loaded");

    const clientDropdown = await driver.findElement(By.css("select"));
    await clientDropdown.sendKeys("Jpharma");

    const openButton = await driver.findElement(
      By.xpath("//button[contains(text(),'Open Analytics Workspace')]")
    );
    await openButton.click();

    await waitForText(driver, "Jpharma Reporting Workspace", 10000);
    console.log("Workspace opened");

    const textarea = await driver.findElement(By.css("textarea[name='question']"));
    await textarea.sendKeys("Show top 5 therapeutic classes by medicine count");

    const generateButton = await driver.findElement(
      By.xpath("//button[contains(text(),'Generate Report')]")
    );
    await generateButton.click();

    console.log("Clicked Generate Report. Waiting for output...");

    await driver.wait(async () => {
      const bodyText = await driver.findElement(By.css("body")).getText();

      if (bodyText.includes("Chart Output")) return true;
      if (bodyText.includes("Something went wrong")) return true;
      if (bodyText.includes("No data returned")) return true;
      if (bodyText.includes("Generated SQL")) return true;

      return false;
    }, 120000);

    const bodyTextAfterGenerate = await driver.findElement(By.css("body")).getText();

    if (bodyTextAfterGenerate.includes("Something went wrong")) {
      throw new Error("Frontend showed error: Something went wrong while fetching the response.");
    }

    console.log("Report generated");

    const dataTab = await driver.findElement(
      By.xpath("//button[contains(text(),'Data Preview')]")
    );
    await dataTab.click();

    await waitForText(driver, "Data Preview", 10000);
    console.log("Data Preview tab works");

    const sqlTab = await driver.findElement(
      By.xpath("//button[contains(text(),'SQL Generated')]")
    );
    await sqlTab.click();

    await waitForText(driver, "Generated SQL", 10000);
    console.log("SQL Generated tab works");

    const summaryTab = await driver.findElement(
      By.xpath("//button[contains(text(),'Summary')]")
    );
    await summaryTab.click();

    const chartDropdown = await driver.findElement(By.css(".visual-config select"));
    await chartDropdown.sendKeys("Table Only");

    await waitForText(driver, "Table Only selected", 10000);
    console.log("Chart type selector works");

    const saveButton = await driver.findElement(
      By.xpath("//button[contains(text(),'Save Report')]")
    );
    await saveButton.click();

    await waitForText(driver, "Saved Reports", 10000);
    console.log("Save Report works");

    console.log("All Selenium tests passed");
  } catch (error) {
    console.error("Selenium test failed:", error);

    try {
      const bodyText = await driver.findElement(By.css("body")).getText();
      console.log("PAGE TEXT AT FAILURE:");
      console.log(bodyText);
    } catch (pageError) {
      console.log("Could not read page text.");
    }
  } finally {
    await driver.quit();
  }
}

runTest();