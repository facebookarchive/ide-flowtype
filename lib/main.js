/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 * @format
 */

const {Disposable} = require('atom');
const {AutoLanguageClient} = require('atom-languageclient');
const {spawn} = require('child_process');
const path = require('path');
const xdgBaseDir = require('xdg-basedir');

const PACKAGE_NAME = require('../package.json').name;

const SERVER_HOME = path.resolve(
  require.resolve('flow-language-server'),
  '..',
  '..',
  '..',
  'server',
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
//   customPathToFlow: {
//     enabled: boolean,
//     pathToFlow: string,
//   }
// }

class FlowLanguageClient extends AutoLanguageClient {
  getConnectionType() {
    return 'ipc';
  }

  getGrammarScopes() {
    return ['source.js', 'source.jsx', 'source.js.jsx'];
  }

  getLanguageName() {
    return 'JavaScript';
  }

  getServerName() {
    return 'Flow';
  }

  startServerProcess() {
    const config = atom.config.get(PACKAGE_NAME);

    const params = ['--node-ipc'];
    if (config.tryFlowBin) {
      params.push('--try-flow-bin');
    }
    if (config.customPathToFlow.enabled && config.customPathToFlow.pathToFlow) {
      params.push('--path-to-flow', config.customPathToFlow.pathToFlow);
    }
    if (!config.autoDownloadFlowBinaries) {
      params.push('--no-auto-download');
    }

    return Promise.resolve(
      spawn('./cli.js', params, {
        cwd: SERVER_HOME,
        stdio: [null, null, null, 'ipc'],
      })
    );
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
    return Object.assign(super.provideAutocomplete(), {
      suggestionPriority: 5,
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
    title: 'Try flow-bin from node_modules when available',
    description:
      'Try to use the flow-bin binary from node_modules when compatible with ' +
      'the project. Will fall back if version mismatches with your project.\n\n ' +
      'Security Warning: Atom will execute whichever binary is located at ' +
      '$PROJECT_ROOT/node_modules/.bin/flow',
    default: false,
    order: 10,
  },
  autoDownloadFlowBinaries: {
    type: 'boolean',
    title: 'Automatically download and manage flow binaries from GitHub',
    description: `Requires an internet connection. Manages binaries in ${xdgBaseDir.cache}`,
    default: true,
    order: 30,
  },
  customPathToFlow: {
    title: 'Custom path to Flow',
    description: 'Use a specific flow binary on your system when running',
    type: 'object',
    order: 40,
    properties: {
      enabled: {
        type: 'boolean',
        default: false,
        title: 'Enable custom path',
        order: 10,
      },
      pathToFlow: {
        type: 'string',
        title: 'Custom Path',
        description: 'The path to a specific binary of flow',
        default: '',
        order: 20,
      },
    },
  },
};
