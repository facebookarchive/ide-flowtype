const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = 'eslint-rules';

module.exports = {
  "extends": "fbjs-opensource",
  "plugins": ["rulesdir"],
  "rules": {
    "rulesdir/license-header": 1,
    // unfortunately have to ignore in fn calls without babel or recent v8
    "comma-dangle": [
      "error", {
        "arrays": "only-multiline",
        "objects": "only-multiline",
        "functions": "ignore",
      },
    ]
  }
}
