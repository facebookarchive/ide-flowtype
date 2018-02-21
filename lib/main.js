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

const {Disposable} = require('atom');
const {AutoLanguageClient} = require('atom-languageclient');
const path = require('path');
const FLOW_DATA_DIR = require('flow-language-server/dirs').flowData;

const PACKAGE_NAME = require('../package.json').name;

const SERVER_HOME = path.resolve(
  require.resolve('flow-language-server'),
  '..',
  '..',
  'lib',
  'bin'
);

// As defined in the LSP.
const LOG_MESSAGE_INFO = 3;

// Keep these in sync with the server side.
const STATUS_PREFIX = 'Flow status: ';
const BUSY_STATUS = Object.freeze({
  busy: 'busy',
  init: 'initializing',
});

// this package's config has the shape:
// type PackageConfig = {
//   autoDownloadFlowBinaries: boolean,
//   tryFlowBin: boolean,
//   customFlowPath: {
//     enabled: boolean,
//     flowPath: string,
//   }
// }

class FlowLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ['source.js', 'source.jsx', 'source.js.jsx'];
  }

  getLanguageName() {
    return 'JavaScript';
  }

  getServerName() {
    return 'Flow';
  }

  onDidConvertAutocomplete(completionItem, suggestion, request) {
    // Flow LSP attaches split values for the parameters and the return type.
    // Rather than just using "details", which is a string of both, specify
    // each for the left and right labels, according to Atom autocomplete-plus
    // convention
    if (completionItem._returnDetail) {
      suggestion.leftLabel = completionItem._returnDetail;
    }
    if (completionItem._parametersDetail) {
      suggestion.rightLabel = completionItem._parametersDetail;
    }
  }

  startServerProcess() {
    const config = atom.config.get(PACKAGE_NAME);

    const args = ['cli.js', '--stdio'];
    if (config.tryFlowBin) {
      args.push('--try-flow-bin');
    }
    if (config.customFlowPath.enabled && config.customFlowPath.flowPath) {
      args.push('--flow-path', config.customFlowPath.flowPath);
    }
    if (!config.autoDownloadFlowBinaries) {
      args.push('--no-auto-download');
    }

    return Promise.resolve(this.spawnChildNode(args, {cwd: SERVER_HOME}));
  }

  preInitialization(connection) {
    connection.onLogMessage(e => {
      if (
        this._busySignalService != null &&
        e.type === LOG_MESSAGE_INFO &&
        e.message.startsWith(STATUS_PREFIX)
      ) {
        if (this._lastBusyMessage) {
          this._lastBusyMessage.dispose();
        }
        const status = e.message.substr(STATUS_PREFIX.length);
        const statusText = BUSY_STATUS[status];
        if (statusText) {
          this._lastBusyMessage = this._busySignalService.reportBusy(
            `Flow is ${statusText}...`
          );
        }
      }
    });
    connection._rpc.onClose(() => {
      if (this._lastBusyMessage) {
        this._lastBusyMessage.dispose();
      }
    });
  }

  // Have our autocompletion results take priority.
  provideAutocomplete() {
    const config = atom.config.get(PACKAGE_NAME);
    return Object.assign(super.provideAutocomplete(), {
      suggestionPriority: config.flowAutocompleteResultsFirst ? 5 : 1,
    });
  }

  consumeBusySignal(busySignalService) {
    this._busySignalService = busySignalService;
    this._disposable.add(busySignalService);
    return new Disposable(() => {
      this._busySignalService = null;
      this._disposable.remove(busySignalService);
    });
  }
}

module.exports = new FlowLanguageClient();

module.exports.config = {
  tryFlowBin: {
    type: 'boolean',
    title: 'Use flow-bin from node_modules when available',
    description:
      'Use the flow-bin binary from node_modules when present and compatible with ' +
      'the project. Will fall back if version mismatches with your project.\n\n ' +
      '**Security Warning:** Atom will execute whichever binary is located at ' +
      '$PROJECT_ROOT/node_modules/.bin/flow',
    default: false,
    order: 10,
  },
  autoDownloadFlowBinaries: {
    type: 'boolean',
    title: 'Automatically download and manage Flow binaries from GitHub',
    description:
      `
      **Requires an internet connection on first run and when Flow version requirements change.**` +
      '\n\n' +
      "Atom IDE will detect your project's requirements, and will download and manage flow binaries for you." +
      '\n\n' +
      `Flow binaries are stored in **${FLOW_DATA_DIR}**`,
    default: true,
    order: 30,
  },
  customFlowPath: {
    title: 'Custom Flow executable',
    description: 'Use a specific flow executable on your system when running',
    type: 'object',
    order: 40,
    properties: {
      enabled: {
        type: 'boolean',
        default: false,
        title: 'Enable custom executable',
        order: 10,
      },
      flowPath: {
        type: 'string',
        title: 'Path to Flow executable',
        description: 'The path to a specific flow binary',
        default: '',
        order: 20,
      },
    },
  },
  flowAutocompleteResultsFirst: {
    type: 'boolean',
    title: 'Show Flow autocomplete results first',
    description:
      'If checked, Flow suggestions will be placed before the rest of autocomplete results ' +
      '(e.g. snippets etc.). Requires restart to take effect.',
    default: true,
    order: 50,
  },
};
