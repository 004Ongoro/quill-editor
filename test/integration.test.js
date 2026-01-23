const fs = require("fs");
const path = require("path");

describe("Integration Tests", () => {
  test("all HTML files have correct structure", () => {
    const htmlContent = fs.readFileSync("index.html", "utf8");

    // Check for required elements
    expect(htmlContent).toContain("<!doctype html>");
    expect(htmlContent).toContain("<html");
    expect(htmlContent).toContain("<head>");
    expect(htmlContent).toContain("<body>");
    expect(htmlContent).toContain('id="codeEditor"');
    expect(htmlContent).toContain('class="editor-container"');
  });

  test("CSS file is valid", () => {
    const cssContent = fs.readFileSync("styles.css", "utf8");

    // Check for CSS variables and key selectors
    expect(cssContent).toContain(":root");
    expect(cssContent).toContain("--primary-color");
    expect(cssContent).toContain(".app-container");
    expect(cssContent).toContain(".code-editor");
    expect(cssContent).toContain(".tab-bar");
  });

  test("GitHub Actions workflows exist", () => {
    const workflowsDir = ".github/workflows";
    expect(fs.existsSync(workflowsDir)).toBe(true);

    const files = fs.readdirSync(workflowsDir);
    expect(files).toContain("release.yml");
    expect(files).toContain("build-test.yml");
  });

  test("Release script exists and is executable", () => {
    const releaseScript = "scripts/release.js";
    expect(fs.existsSync(releaseScript)).toBe(true);

    const content = fs.readFileSync(releaseScript, "utf8");
    expect(content).toContain("#!/usr/bin/env node");
    expect(content).toContain("QuillEditor Release Automation");
  });
});
