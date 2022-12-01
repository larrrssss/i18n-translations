const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

function getFilesRecursive(p, root = false) {
  const files = [];

  let result = [];
  try {
    result = fs.readdirSync(p);
  } catch (e) {}

  for (const f of result) {
    if (root && f === 'output.json') continue;

    if (['json'].includes(f.split('.').pop())) {
      console.log(`Found file ${f}`);
      const content = JSON.parse(fs.readFileSync(path.join(p, f)).toString());
      files.push(content);
    } else {
      files.push(...getFilesRecursive(path.join(p, f)));
    }
  }

  return files;
}

(async () => {
  try {
    const githubWorkpace = core.getInput('path');

    const locales = JSON.parse(fs.readFileSync(path.join(githubWorkpace, 'locales.json')).toString());
  
    for (const locale of locales) {
      console.log(`Merging ${locale}`);
      
      const objects = getFilesRecursive(path.join(githubWorkpace, locale), true);
      const output = Object.assign({}, ...objects);

      let lastOutput;
      try {
        lastOutput = JSON.parse(fs.readFileSync(path.join(githubWorkpace, locale, 'output.json')).toString());
      } catch (e) {}

      core.setOutput(
        'needpush', 
        lastOutput && JSON.stringify(lastOutput) !== JSON.stringify(output)
          ? '1'
          : '0',
      );

      fs.writeFileSync(
        path.join(githubWorkpace, locale, 'output.json'),
        JSON.stringify(output, null, 2),
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
})();
