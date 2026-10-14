import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = resolve(root, "src-v3");

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const groups = await Promise.all(entries.map(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : Promise.resolve(path.endsWith(".ts") ? [path] : []);
  }));
  return groups.flat();
}

for (const file of await sourceFiles(sourceRoot)) {
  const source = await readFile(file, "utf8");
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const layer = relative(sourceRoot, file).split(sep)[0];
  const visit = node => {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifier = node.moduleSpecifier.text;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      assert.ok(argument && ts.isStringLiteral(argument), `Dynamic import must be literal: ${file}`);
      specifier = argument.text;
    }
    if (specifier) {
      assert.ok(specifier.startsWith(".") && specifier.endsWith(".js"), `V3 imports must be relative .js paths: ${file} -> ${specifier}`);
      const target = resolve(dirname(file), specifier.slice(0, -3) + ".ts");
      assert.ok(target.startsWith(sourceRoot + sep), `Import escapes V3: ${file} -> ${specifier}`);
      const targetLayer = relative(sourceRoot, target).split(sep)[0];
      if (layer === "domain") assert.equal(targetLayer, "domain", `Domain boundary: ${file}`);
      if (layer === "application") assert.ok(["application", "domain"].includes(targetLayer), `Application boundary: ${file}`);
      if (layer === "adapters") assert.ok(["adapters", "application", "domain"].includes(targetLayer), `Adapter boundary: ${file}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
}

const html = await readFile(resolve(root, "public-v3/index.html"), "utf8");
const css = await readFile(resolve(root, "public-v3/styles.css"), "utf8");
assert.match(html, /src="\/js\/main\/index\.js"/);
assert.doesNotMatch(html + css, /src-v2|public-v2|\/src\/|\/public\//);
console.log("V3 boundaries OK");
