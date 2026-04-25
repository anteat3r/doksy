async function fixAll() {
  const authRes = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@admin.com', password: 'password123456' })
  });
  const token = (await authRes.json()).token;

  const colsRes = await fetch('http://127.0.0.1:8090/api/collections', { headers: { 'Authorization': token } });
  const cols = await colsRes.json();
  const docsCol = cols.items.find(c => c.name === 'documents');

  if (!docsCol) {
    console.error("Documents collection not found!");
    return;
  }

  // Delete document_files if it exists
  const filesCol = cols.items.find(c => c.name === 'document_files');
  if (filesCol) {
    await fetch(`http://127.0.0.1:8090/api/collections/${filesCol.id}`, { method: 'DELETE', headers: { 'Authorization': token } });
  }

  const res = await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({
      name: 'document_files',
      type: 'base',
      system: false,
      schema: [
        { name: 'document_id', type: 'relation', required: true, options: { collectionId: docsCol.id, cascadeDelete: true, maxSelect: 1 } },
        { name: 'file', type: 'file', required: true, options: { maxSelect: 1, maxSize: 52428800 } },
        { name: 'name', type: 'text', required: true },
        { name: 'edit_token', type: 'text', required: false }
      ],
      listRule: 'document_id.owner = @request.auth.id || document_id.view_token = @request.headers.x_token || document_id.edit_token = @request.headers.x_token',
      viewRule: 'document_id.owner = @request.auth.id || document_id.view_token = @request.headers.x_token || document_id.edit_token = @request.headers.x_token',
      createRule: '@request.auth.id != \'\' && (document_id.owner = @request.auth.id || @request.data.edit_token = document_id.edit_token)',
      updateRule: '@request.auth.id != \'\' && (document_id.owner = @request.auth.id || @request.data.edit_token = document_id.edit_token)',
      deleteRule: '@request.auth.id != \'\' && (document_id.owner = @request.auth.id || @request.headers.x_token = document_id.edit_token)'
    })
  });

  const text = await res.text();
  console.log("Added document_files collection", text);
}
fixAll();
