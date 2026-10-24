const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const path = require("node:path");

// Resolve the actual runtime dependency chain rather than a separate test copy.
const serverRequire = createRequire(path.resolve(__dirname, "../../artifacts/api-server/package.json"));
const proxyRequire = createRequire(serverRequire.resolve("http-proxy-middleware"));
const matchRequire = createRequire(proxyRequire.resolve("micromatch"));
const braces = matchRequire("braces");

const sandboxRequire = createRequire(path.resolve(__dirname, "../../artifacts/mockup-sandbox/package.json"));
const globRequire = createRequire(sandboxRequire.resolve("fast-glob"));
const globMatchRequire = createRequire(globRequire.resolve("micromatch"));
const sandboxBraces = globMatchRequire("braces");

test("ordinary brace/glob behavior is preserved", () => {
  assert.deepEqual(braces.expand("files/{a,b}/{1..3}.txt"), [
    "files/a/1.txt", "files/a/2.txt", "files/a/3.txt",
    "files/b/1.txt", "files/b/2.txt", "files/b/3.txt",
  ]);
  assert.equal(braces.compile("files/{a,b}.txt"), "files/(a|b).txt");
  assert.equal(braces.stringify(braces.parse("files/{a,b}.txt")), "files/{a,b}.txt");
  assert.deepEqual(braces.expand("files/\\{a,b\\}.txt"), ["files/{a,b}.txt"]);
});

test("sandbox globbing chain uses the patched braces depth guard", () => {
  const deeplyNestedPattern = "(".repeat(129) + "a" + ")".repeat(129);
  assert.throws(() => sandboxBraces.parse(deeplyNestedPattern), {
    name: "SyntaxError", message: /maximum nesting depth/,
  });
});

for (const [open, close] of [["{", "}"], ["(", ")"]]) {
  for (const method of ["parse", "compile", "expand", "stringify"]) {
    test(`${method} rejects deeply nested ${open}${close} without overflowing the stack`, () => {
      // Stay below the library's existing 10,000-character limit.
      const pattern = open.repeat(4500) + "a,b" + close.repeat(4500);
      assert.throws(() => braces[method](pattern), {
        name: "SyntaxError", message: /maximum nesting depth/,
      });
      assert.throws(() => braces[method](open.repeat(4500) + "a"), {
        name: "SyntaxError", message: /maximum nesting depth/,
      });
    });
  }
}

for (const method of ["compile", "expand", "stringify"]) {
  test(`${method} also bounds callers passing an AST directly`, () => {
    let ast = { type: "text", value: "ok", nodes: [] };
    for (let i = 0; i < 10000; i++) {
      const parent = { type: "root", nodes: [ast] };
      ast.parent = parent;
      ast = parent;
    }
    assert.throws(() => braces[method](ast), {
      name: "SyntaxError", message: /maximum nesting depth/,
    });
  });
}
