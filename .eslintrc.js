/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @noflow
 */
'use strict';

/* eslint comma-dangle: [1, always-multiline], prefer-object-spread/prefer-object-spread: 0 */

const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = 'eslint-rules';

module.exports = {
  extends: 'fbjs-opensource',
  plugins: ['rulesdir', 'prettier'],
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'script',
  },
  rules: {
    'rulesdir/license-header': 1,
  },
};
