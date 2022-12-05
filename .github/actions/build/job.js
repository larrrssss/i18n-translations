const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

const mergeDeep = require('./deepmerge');

function reduceFilesToObject(paths, root) {
  let output = {};

  for (const p of paths) {
    const tree = p
      .split(root)
      .pop()
      ?.split('/')
      .filter((s) => s.length)
      .map((s) => s.split('.').shift()) ?? [];
    const content = JSON.parse(fs.readFileSync(p).toString());

    if (!tree.length)
      continue;

    if (tree.length === 1 && tree[0] === 'base') {
      output = mergeDeep(output, content);
      continue;
    }

    output = mergeDeep(
      output,
      tree
        .slice(0, -1)
        .reverse()
        .reduce((p, c) => ({ [c]: p }), { [tree[tree.length - 1]]: content }),
    );
  }

  return output;
}

function getFilePathsRecursively(p, root = false) {
  const paths = [];

  let result = [];
  try {
    result = fs.readdirSync(p);
  } catch (e) {}

  for (const f of result) {
    if (root && f === 'output.json') continue;

    if (['json'].includes(f.split('.').pop())) {
      console.log(`Found file ${f}`);
      paths.push(path.join(p, f));
    } else {
      paths.push(...getFilePathsRecursively(path.join(p, f)));
    }
  }

  return paths;
}

(async () => {
  try {
    const githubWorkpace = core.getInput('path');
    let changes = false;

    const locales = JSON.parse(fs.readFileSync(path.join(githubWorkpace, 'locales.json')).toString());
  
    for (const locale of locales) {
      console.log(`Merging ${locale}`);

      const paths = getFilePathsRecursively(path.join(githubWorkpace, locale), true);
      const output = reduceFilesToObject(paths, path.join(githubWorkpace, locale));

      let lastOutput;
      try {
        lastOutput = JSON.parse(fs.readFileSync(path.join(githubWorkpace, locale, 'output.json')).toString());
      } catch (e) {}

      if (!lastOutput || JSON.stringify(lastOutput) !== JSON.stringify(output))
        changes = true;

      fs.writeFileSync(
        path.join(githubWorkpace, locale, 'output.json'),
        JSON.stringify(output, null, 2),
      );
    }

    core.setOutput('needpush', changes ? '1' : '0');
  } catch (error) {
    core.setFailed(error.message);
  }
})();
