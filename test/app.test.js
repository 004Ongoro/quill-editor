const fs = require("fs");
const path = require("path");

describe("QuillEditor Application Tests", () => {
  test("package.json should exist", () => {
    expect(fs.existsSync("package.json")).toBe(true);
  });

  test("main.js should exist", () => {
    expect(fs.existsSync("main.js")).toBe(true);
  });

  test("index.html should exist", () => {
    expect(fs.existsSync("index.html")).toBe(true);
  });

  test("package.json should have required fields", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.name).toBe("quilleditor");
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.main).toBe("main.js");
    expect(pkg.build).toBeDefined();
    expect(pkg.build.appId).toBe("com.quilleditor.app");
  });

  test("all required JavaScript files exist", () => {
    const requiredFiles = [
      "renderer.js",
      "preload.js",
      "main.js",
      "editor/editor.js",
      "editor/syntax.js",
      "editor/findreplace.js",
    ];

    requiredFiles.forEach((file) => {
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  test("CSS files exist", () => {
    expect(fs.existsSync("styles.css")).toBe(true);
  });

  test("node_modules should have electron and electron-builder", () => {
    expect(fs.existsSync("node_modules/electron")).toBe(true);
    expect(fs.existsSync("node_modules/electron-builder")).toBe(true);
  });

  test("main.js should contain required exports", () => {
    const mainContent = fs.readFileSync("main.js", "utf8");
    expect(mainContent).toContain("app.whenReady()");
    expect(mainContent).toContain("createWindow");
    expect(mainContent).toContain("ipcMain");
  });

  test("renderer.js should contain QuillEditorUI class", () => {
    const rendererContent = fs.readFileSync("renderer.js", "utf8");
    expect(rendererContent).toContain("class QuillEditorUI");
    expect(rendererContent).toContain("constructor");
    expect(rendererContent).toContain("setupEventListeners");
  });
});
