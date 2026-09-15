"use strict";
import * as vscode from "vscode";
import { WorkspaceSymbolIndex } from "./WorkspaceSymbolIndex";
import {
  CallItem,
  callHierarchyItemAt,
  incomingCalls,
  outgoingCalls,
} from "../core/callHierarchy";
import { toVsRange } from "./convert";

const KIND: Record<CallItem["kind"], vscode.SymbolKind> = {
  sub: vscode.SymbolKind.Method,
  function: vscode.SymbolKind.Function,
  module: vscode.SymbolKind.Module,
};

export class CallHierarchyProvider implements vscode.CallHierarchyProvider {
  constructor(private readonly workspaceIndex: WorkspaceSymbolIndex) {}

  prepareCallHierarchy(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.CallHierarchyItem | undefined {
    this.workspaceIndex.ensureAllDocuments();
    const item = callHierarchyItemAt(
      this.workspaceIndex.index,
      this.workspaceIndex.keyOf(document),
      position
    );
    return item ? toVsItem(item) : undefined;
  }

  provideCallHierarchyIncomingCalls(
    item: vscode.CallHierarchyItem,
    _token: vscode.CancellationToken
  ): vscode.CallHierarchyIncomingCall[] {
    this.workspaceIndex.ensureAllDocuments();
    return incomingCalls(this.workspaceIndex.index, fromVsItem(item)).map(
      (c) => new vscode.CallHierarchyIncomingCall(toVsItem(c.from), c.fromRanges.map(toVsRange))
    );
  }

  provideCallHierarchyOutgoingCalls(
    item: vscode.CallHierarchyItem,
    _token: vscode.CancellationToken
  ): vscode.CallHierarchyOutgoingCall[] {
    this.workspaceIndex.ensureAllDocuments();
    return outgoingCalls(this.workspaceIndex.index, fromVsItem(item)).map(
      (c) => new vscode.CallHierarchyOutgoingCall(toVsItem(c.to), c.fromRanges.map(toVsRange))
    );
  }
}

function toVsItem(item: CallItem): vscode.CallHierarchyItem {
  return new vscode.CallHierarchyItem(
    KIND[item.kind],
    item.name,
    item.detail,
    vscode.Uri.file(item.file),
    toVsRange(item.range),
    toVsRange(item.selectionRange)
  );
}

function fromVsItem(item: vscode.CallHierarchyItem): CallItem {
  const kind: CallItem["kind"] =
    item.kind === vscode.SymbolKind.Module ? "module" : item.kind === vscode.SymbolKind.Method ? "sub" : "function";
  const r = (range: vscode.Range) => ({
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  });
  return {
    name: item.name,
    kind,
    detail: String(item.detail ?? ""),
    file: item.uri.fsPath,
    range: r(item.range),
    selectionRange: r(item.selectionRange),
  };
}
