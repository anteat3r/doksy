import * as Y from 'yjs';
import PocketBase from 'pocketbase';
import { fromUint8Array, toUint8Array } from 'js-base64';

export class PocketBaseProvider {
  doc: Y.Doc;
  pb: PocketBase;
  documentId: string;
  clientId: string;
  isReadOnly: boolean;
  editToken?: string;

  constructor(doc: Y.Doc, pb: PocketBase, documentId: string, options?: { isReadOnly?: boolean, editToken?: string }) {
    this.doc = doc;
    this.pb = pb;
    this.documentId = documentId;
    this.clientId = Math.random().toString(36).substring(2, 15);
    this.isReadOnly = options?.isReadOnly || false;
    this.editToken = options?.editToken;

    this.init();
  }

  async init() {
    // 1. Fetch document state
    let documentRecord;
    try {
      documentRecord = await this.pb.collection('documents').getOne(this.documentId, { $autoCancel: false });
      if (documentRecord.state) {
        const stateVector = toUint8Array(documentRecord.state);
        Y.applyUpdate(this.doc, stateVector);
      }
    } catch (e) {
      console.warn("Could not load initial document state");
    }

    // 2. Fetch existing updates
    try {
      const updates = await this.pb.collection('document_updates').getFullList({
        filter: `document_id = "${this.documentId}"`,
        sort: 'created',
        $autoCancel: false
      });

      updates.forEach((u: any) => {
        const updateData = toUint8Array(u.update_data);
        Y.applyUpdate(this.doc, updateData);
      });
    } catch (e) {
      console.warn("Could not load document updates", e);
    }

    // 3. Subscribe to real-time updates from others
    this.pb.collection('document_updates').subscribe('*', (e: any) => {
      if (e.action === 'create' && e.record.document_id === this.documentId && e.record.client_id !== this.clientId) {
        const updateData = toUint8Array(e.record.update_data);
        Y.applyUpdate(this.doc, updateData);
      }
    });

    // 4. Broadcast local changes (if not read-only)
    if (!this.isReadOnly) {
      this.doc.on('update', async (update: Uint8Array, origin: any) => {
        // Only broadcast if the origin isn't remote
        if (origin !== this) {
          const base64Update = fromUint8Array(update);
          try {
            await this.pb.collection('document_updates').create({
              document_id: this.documentId,
              update_data: base64Update,
              client_id: this.clientId,
              edit_token: this.editToken
            }, { $autoCancel: false });
          } catch (err) {
            console.error("Failed to broadcast update", err);
          }
        }
      });
    }
  }

  destroy() {
    this.pb.collection('document_updates').unsubscribe('*');
  }
}
