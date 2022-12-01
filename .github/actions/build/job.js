const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

function getFilesRecursive(p) {
  const files = [];

  let result = [];
  try {
    result = fs.readdirSync(p);
  } catch (e) {}

  for (const f of result) {
    if (['json'].includes(f.split('.').pop())) {
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
      console.log(`Mergin ${locale}`);
      
      const objects = getFilesRecursive(path.join(githubWorkpace, locale));

      const output = Object.assign({}, ...objects);

      fs.writeFileSync(
        path.join(githubWorkpace, locale, 'output.json'),
        JSON.stringify(output, null, 2),
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
})();
