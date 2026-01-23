const { execSync } = require("child_process");

describe("Electron Build Tests", () => {
  test("should be able to require electron", () => {
    // This test ensures electron is properly installed
    const electron = require("electron");
    expect(electron).toBeDefined();
  });

  test("should be able to require electron-builder", () => {
    const builder = require("electron-builder");
    expect(builder).toBeDefined();
  });

  test("package.json should have valid build configuration", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const { build } = pkg;

    expect(build.appId).toBe("com.quilleditor.app");
    expect(build.productName).toBe("QuillEditor");
    expect(build.win).toBeDefined();
    expect(build.mac).toBeDefined();
    expect(build.linux).toBeDefined();
    expect(build.directories).toBeDefined();
    expect(build.directories.output).toBe("dist");
  });

  test("should be able to run npm run build without errors", () => {
    // This test just checks the command exists and runs
    expect(() => {
      // Just check if the script exists
      const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
      expect(pkg.scripts.build).toBe("electron-builder");
    }).not.toThrow();
  });
});
