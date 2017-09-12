'use babel';

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

/* eslint comma-dangle: [1, always-multiline], prefer-object-spread/prefer-object-spread: 0 */

const AutocompleteAdapter = require('atom-languageclient/build/lib/adapters/autocomplete-adapter');

class FlowAutocompleteAdapter {
  async getSuggestions(connection, request) {
    const completionItems = await connection.completion(
      AutocompleteAdapter.requestToTextDocumentPositionParams(request),
    );
    return FlowAutocompleteAdapter.completionItemsToSuggestions(completionItems, request);
  }

  static completionItemsToSuggestions(completionItems, request) {
    return (Array.isArray(completionItems) ? completionItems : completionItems.items || []).map(s =>
      FlowAutocompleteAdapter.completionItemToSuggestion(s, request),
    );
  }

  static completionItemToSuggestion(item, request) {
    const suggestion = FlowAutocompleteAdapter.basicCompletionItemToSuggestion(item);
    AutocompleteAdapter.applyTextEditToSuggestion(item.textEdit, request.editor, suggestion);
    // TODO: Snippets
    return suggestion;
  }

  static basicCompletionItemToSuggestion(item) {
    const completion = {
      text: item.insertText || item.label,
      displayText: item.label,
      filterText: item.filterText || item.label,
      type: AutocompleteAdapter.completionKindToSuggestionType(item.kind),
      leftLabel: item.detail,
      description: item.documentation,
      descriptionMarkdown: item.documentation,
    };

    if (item._returnDetail) {
      completion.leftLabel = item._returnDetail;
    }
    if (item._parametersDetail) {
      completion.rightLabel = item._parametersDetail;
    }

    return completion;
  }
}

FlowAutocompleteAdapter.canAdapt = AutocompleteAdapter.canAdapt;
FlowAutocompleteAdapter.completionKindToSuggestionType = AutocompleteAdapter.completionKindToSuggestionType;
FlowAutocompleteAdapter.requestToTextDocumentPositionParams = AutocompleteAdapter.requestToTextDocumentPositionParams;
FlowAutocompleteAdapter.applyTextEditToSuggestion = AutocompleteAdapter.applyTextEditToSuggestion;

module.exports = FlowAutocompleteAdapter;
