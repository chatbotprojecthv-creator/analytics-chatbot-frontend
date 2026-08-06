const { Builder, By, until } = require("selenium-webdriver");
require("chromedriver");

async function waitForText(driver, text, timeout = 20000) {
  await driver.wait(
    until.elementLocated(
      By.xpath(`//*[contains(text(),"${text}")]`)
    ),
    timeout
  );
}

async function runTest() {
  const driver = await new Builder()
    .forBrowser("chrome")
    .build();

  try {
    // Open Angular app
    await driver.get("http://localhost:4200");

    await waitForText(
      driver,
      "Pharma Analytics Dashboard",
      10000
    );

    console.log("Dashboard loaded");

    // Select client
    const clientDropdown = await driver.findElement(
      By.css("select")
    );

    await clientDropdown.sendKeys("Jpharma");

    // Open workspace
    const openButton = await driver.findElement(
      By.xpath(
        "//button[contains(text(),'Open Analytics Workspace')]"
      )
    );

    await openButton.click();

    await waitForText(
      driver,
      "Jpharma Reporting Workspace",
      10000
    );

    console.log("Workspace opened");

    // Enter question
    const textarea = await driver.findElement(
      By.css("textarea[name='question']")
    );

    await textarea.sendKeys(
      "Show top 5 therapeutic classes by medicine count"
    );

    const generateButton = await driver.findElement(
      By.xpath(
        "//button[contains(text(),'Generate Report')]"
      )
    );

    await generateButton.click();

    console.log(
      "Clicked Generate Report. Waiting for output..."
    );

    await driver.wait(async () => {
      const bodyText = await driver
        .findElement(By.css("body"))
        .getText();

      return (
        bodyText.includes("Chart Output") ||
        bodyText.includes("Generated SQL") ||
        bodyText.includes("Something went wrong")
      );
    }, 120000);

    const bodyText = await driver
      .findElement(By.css("body"))
      .getText();

    if (
      bodyText.includes(
        "Something went wrong while fetching the response"
      )
    ) {
      throw new Error(
        "Frontend displayed API error."
      );
    }

    console.log("Report generated");

    // Data Preview Tab
    const dataTab = await driver.findElement(
      By.xpath(
        "//button[contains(text(),'Data Preview')]"
      )
    );

    await dataTab.click();

    await waitForText(
      driver,
      "Data Preview",
      10000
    );

    console.log("Data Preview tab works");

    // SQL Tab
    const sqlTab = await driver.findElement(
      By.xpath(
        "//button[contains(text(),'SQL Generated')]"
      )
    );

    await sqlTab.click();

    await waitForText(
      driver,
      "Generated SQL",
      10000
    );

    console.log("SQL Generated tab works");

    // Summary Tab
    const summaryTab = await driver.findElement(
      By.xpath(
        "//button[contains(text(),'Summary')]"
      )
    );

    await summaryTab.click();

    // Wait for chart configuration dropdown
    const chartDropdown = await driver.wait(
      until.elementLocated(
        By.xpath(
          "//label[contains(text(),'Configure Chart:')]/following-sibling::select"
        )
      ),
      10000
    );

    await chartDropdown.sendKeys("Table Only");

    await waitForText(
      driver,
      "Table Only selected",
      10000
    );

    console.log("Chart type selector works");

    // Save report
    const saveButton = await driver.findElement(
      By.xpath(
        "//button[contains(text(),'Save Report')]"
      )
    );

    await saveButton.click();

    await waitForText(
      driver,
      "Saved Reports",
      10000
    );

    console.log("Save Report works");

    console.log(
      "All Selenium tests passed"
    );

  } catch (error) {

    console.error(
      "Selenium test failed:",
      error
    );

    try {
      const pageText = await driver
        .findElement(By.css("body"))
        .getText();

      console.log(
        "\n===== PAGE TEXT AT FAILURE =====\n"
      );

      console.log(pageText);

      console.log(
        "\n===============================\n"
      );

    } catch (e) {
      console.log(
        "Could not capture page text."
      );
    }

  } finally {
    await driver.quit();
  }
}

runTest();