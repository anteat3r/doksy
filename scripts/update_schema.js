// Node.js script to update PocketBase schema for sharing and ownership

async function updateSchema() {
  console.log("Authenticating as admin...");
  const authRes = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@admin.com', password: 'password123456' })
  });
  const auth = await authRes.json();
  const token = auth.token;

  console.log("Fetching collections...");
  const colsRes = await fetch('http://127.0.0.1:8090/api/collections', {
    headers: { 'Authorization': token }
  });
  const cols = await colsRes.json();
  const items = cols.items || [];

  for (const col of items) {
    if (col.name === 'documents' || col.name === 'document_updates') {
      console.log(`Deleting ${col.name}...`);
      await fetch(`http://127.0.0.1:8090/api/collections/${col.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
    }
  }

  console.log("Creating documents collection...");
  await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({
      name: 'documents',
      type: 'base',
      system: false,
      schema: [
        { name: 'title', type: 'text', required: true },
        { name: 'state', type: 'text', required: false },
        { name: 'owner', type: 'relation', required: true, options: { collectionId: "_pb_users_auth_", cascadeDelete: true, maxSelect: 1 } },
        { name: 'view_token', type: 'text', required: true },
        { name: 'edit_token', type: 'text', required: true }
      ],
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != '' && owner = @request.auth.id",
      updateRule: "@request.auth.id != '' && (owner = @request.auth.id || @request.data.edit_token = edit_token)",
      deleteRule: "@request.auth.id != '' && owner = @request.auth.id"
    })
  });

  console.log("Creating document_updates collection...");
  await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({
      name: 'document_updates',
      type: 'base',
      system: false,
      schema: [
        { name: 'document_id', type: 'relation', required: true, options: { collectionId: "documents", cascadeDelete: true, maxSelect: 1 } },
        { name: 'update_data', type: 'text', required: true },
        { name: 'client_id', type: 'text', required: true },
        { name: 'edit_token', type: 'text', required: false }
      ],
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.data.edit_token = document_id.edit_token)",
      updateRule: null, // Immutable
      deleteRule: null  // Immutable
    })
  });

  console.log("Schema update complete.");
}

updateSchema();
