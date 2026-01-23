// test/basic.test.js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

describe("QuillEditor basic tests", () => {
  test("package.json exists", () => {
    expect(fs.existsSync("package.json")).toBe(true);
  });

  test("main.js exists", () => {
    expect(fs.existsSync("main.js")).toBe(true);
  });

  test("index.html exists", () => {
    expect(fs.existsSync("index.html")).toBe(true);
  });

  test("package.json has required fields", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(pkg.name).toBe("quilleditor");
    expect(pkg.main).toBe("main.js");
    expect(pkg.build).toBeDefined();
  });

  test("dependencies are installed", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    expect(fs.existsSync("node_modules/electron")).toBe(true);
    expect(fs.existsSync("node_modules/electron-builder")).toBe(true);
  });
});

// Simple expect function for basic testing
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
      console.log(`✓ ${expected}`);
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error("Expected value to be defined");
      }
      console.log(`✓ is defined`);
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error("Expected truthy value");
      }
      console.log(`✓ is truthy`);
    },
  };
}

// Run tests if called directly
if (require.main === module) {
  console.log("Running basic tests...\n");

  const tests = [
    () => {
      console.log("Test 1: package.json exists");
      expect(fs.existsSync("package.json")).toBe(true);
    },
    () => {
      console.log("Test 2: main.js exists");
      expect(fs.existsSync("main.js")).toBe(true);
    },
    () => {
      console.log("Test 3: index.html exists");
      expect(fs.existsSync("index.html")).toBe(true);
    },
    () => {
      console.log("Test 4: package.json structure");
      const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
      expect(pkg.name).toBe("quilleditor");
      expect(pkg.main).toBe("main.js");
      expect(pkg.build).toBeDefined();
    },
    () => {
      console.log("Test 5: dependencies installed");
      expect(fs.existsSync("node_modules/electron")).toBe(true);
      expect(fs.existsSync("node_modules/electron-builder")).toBe(true);
    },
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach((test, index) => {
    try {
      test();
      passed++;
    } catch (error) {
      failed++;
      console.error(`Test ${index + 1} failed: ${error.message}`);
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
