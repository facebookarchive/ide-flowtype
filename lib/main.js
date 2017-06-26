// @flow

const {BusySignalService} = require('atom-ide-ui');

const {Disposable} = require('atom');
const {AutoLanguageClient} = require('atom-languageclient');
const {spawn} = require('child_process');
const path = require('path');

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

class FlowLanguageServer extends AutoLanguageClient {
  getConnectionType() {
    return 'ipc';
  }

  getGrammarScopes() {
    return ['source.js', 'source.js.jsx'];
  }

  getLanguageName() {
    return 'JavaScript';
  }

  getServerName() {
    return 'Flow';
  }

  startServerProcess() {
    return Promise.resolve(
      spawn('./cli.js', ['--node-ipc'], {
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
    // TODO: needs a public API
    connection._rpc.onClose(() => {
      if (this._lastBusyMessage) {
        this._lastBusyMessage.dispose();
      }
    });
  }

  // Have our autocompletion results take priority.
  provideAutocomplete() {
    return Object.assign(super.provideAutocomplete(), {suggestionPriority: 5});
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

module.exports = new FlowLanguageServer();
