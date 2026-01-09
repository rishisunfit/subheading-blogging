/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, EditorState, Transaction } from "prosemirror-state";

/**
 * Robust guard to prevent removing the required template header nodes.
 *
 * We enforce that once the editor has the required structure, the first 4
 * top-level blocks must remain:
 * - templateSeries
 * - templateTitle
 * - templateSubtitle
 * - templateByline
 *
 * This blocks Ctrl+A + Delete/Backspace and any transaction that would remove
 * or reorder those nodes, while still allowing normal editing elsewhere and
 * attribute updates (e.g. NodeView inputs updating attrs).
 */
export const ProtectedTemplateExtension = Extension.create({
  name: "protectedTemplate",

  addProseMirrorPlugins() {
    const REQUIRED = [
      "templateSeries",
      "templateTitle",
      "templateSubtitle",
      "templateByline",
    ] as const;

    const hasLockedTemplateHeader = (doc: EditorState["doc"]) => {
      if (!doc || doc.childCount < REQUIRED.length) return false;
      for (let i = 0; i < REQUIRED.length; i++) {
        const child = doc.child(i);
        if (!child || child.type.name !== REQUIRED[i]) return false;
      }
      return true;
    };

    const getTemplateNodes = (doc: EditorState["doc"]) => {
      const nodes: { pos: number; type: string; node: any }[] = [];
      doc.descendants((node: any, pos: number) => {
        if (REQUIRED.includes(node.type.name as any)) {
          nodes.push({ pos, type: node.type.name, node });
        }
      });
      return nodes;
    };

    return [
      new Plugin({
        key: new PluginKey("protectedTemplate"),
        filterTransaction(tr: Transaction, state: EditorState) {
          // Check if any template nodes exist in the document
          const beforeNodes = getTemplateNodes(state.doc);

          // If no template nodes exist, allow the transaction (for posts without templates)
          if (beforeNodes.length === 0) return true;

          // If document didn't change, allow it (e.g., selection changes)
          if (!tr.docChanged) return true;

          // Get template nodes after the transaction
          const afterNodes = getTemplateNodes(tr.doc);

          // Check if any required template nodes are missing after the transaction
          const beforeTypes = new Set(beforeNodes.map((n) => n.type));
          const afterTypes = new Set(afterNodes.map((n) => n.type));

          // Block if any template node type that existed before is now missing
          for (const requiredType of REQUIRED) {
            if (
              beforeTypes.has(requiredType) &&
              !afterTypes.has(requiredType)
            ) {
              console.log(
                `[ProtectedTemplate] Blocking transaction: ${requiredType} would be removed`
              );
              return false;
            }
          }

          // Also check if the header structure is still intact (first 4 nodes)
          // This ensures the template nodes remain in the correct order at the top
          const hadHeader = hasLockedTemplateHeader(state.doc);
          if (hadHeader && !hasLockedTemplateHeader(tr.doc)) {
            console.log(
              "[ProtectedTemplate] Blocking transaction: header structure would be broken"
            );
            return false;
          }

          // Additional check: verify the steps don't delete template nodes
          for (const step of tr.steps) {
            // Check if step has from/to properties (ReplaceStep, etc.)
            const stepAny = step as any;
            if (stepAny.from !== undefined && stepAny.to !== undefined) {
              // Check if this step would delete any template node
              for (const { pos, node } of beforeNodes) {
                const nodeStart = pos;
                const nodeEnd = pos + node.nodeSize;

                // If the deletion range fully encompasses a template node, block it
                if (stepAny.from <= nodeStart && stepAny.to >= nodeEnd) {
                  console.log(
                    `[ProtectedTemplate] Blocking transaction: step would delete ${node.type.name} at ${pos}`
                  );
                  return false;
                }
              }
            }
          }

          return true;
        },
        appendTransaction(transactions, oldState, newState) {
          // Backup: if template nodes somehow got deleted, restore them
          const hadHeader = hasLockedTemplateHeader(oldState.doc);
          if (!hadHeader) return null;

          const hasHeader = hasLockedTemplateHeader(newState.doc);
          if (hasHeader) return null; // Header is intact, no need to restore

          // Header was broken - restore it
          const oldNodes = getTemplateNodes(oldState.doc);
          if (oldNodes.length === 0) return null; // No nodes to restore

          // Create a transaction to restore the template nodes
          const { tr } = newState;
          const schema = newState.schema;

          // Find where to insert (at the start of the document)
          let insertPos = 1; // After the doc node

          // Check what's currently at the start
          const currentFirstChild = newState.doc.child(0);
          if (
            currentFirstChild &&
            REQUIRED.includes(currentFirstChild.type.name as any)
          ) {
            // Template nodes might be there but in wrong order - skip restoration
            return null;
          }

          // Restore each required node in order
          for (let i = 0; i < REQUIRED.length; i++) {
            const requiredType = REQUIRED[i];
            const oldNode = oldNodes.find((n) => n.type === requiredType);
            if (!oldNode) continue;

            // Check if this node type already exists
            let exists = false;
            newState.doc.descendants((node: any) => {
              if (node.type.name === requiredType) {
                exists = true;
                return false;
              }
            });

            if (!exists) {
              // Insert the node
              const nodeType = schema.nodes[requiredType];
              if (nodeType) {
                const node = nodeType.create(oldNode.node.attrs);
                tr.insert(insertPos, node);
                insertPos += node.nodeSize;
              }
            }
          }

          if (tr.steps.length > 0) {
            console.log("Restoring template nodes via appendTransaction");
            return tr;
          }

          return null;
        },
      }),
    ];
  },
});
