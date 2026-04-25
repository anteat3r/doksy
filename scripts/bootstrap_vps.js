
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASS = 'password123456';

async function bootstrap() {
  console.log(`Bootstrapping PocketBase at ${PB_URL}...`);

  // 1. Create Admin
  try {
    await fetch(`${PB_URL}/api/admins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        passwordConfirm: ADMIN_PASS
      })
    });
    console.log("Admin account created.");
  } catch(e) {
    console.log("Admin account might already exist.");
  }

  // 2. Authenticate
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  const { token } = await authRes.json();

  // 3. Update Users Collection (Add color)
  console.log("Updating users collection...");
  const usersColRes = await fetch(`${PB_URL}/api/collections/users`, { headers: { 'Authorization': token } });
  const usersCol = await usersColRes.json();
  
  // PocketBase v0.23+ uses .fields instead of .schema
  const fields = usersCol.fields || usersCol.schema || [];
  
  if (!fields.some(f => f.name === 'color')) {
    fields.push({ name: 'color', type: 'text', required: false });
    const updateRes = await fetch(`${PB_URL}/api/collections/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': token },
      body: JSON.stringify({ [usersCol.fields ? 'fields' : 'schema']: fields })
    });
    if (!updateRes.ok) {
      console.error("Failed to update users:", await updateRes.text());
    }
  }

  // 4. Create Documents Collection
  console.log("Creating documents collection...");
  const docBody = {
    name: 'documents',
    type: 'base',
    [usersCol.fields ? 'fields' : 'schema']: [
      { name: 'title', type: 'text', required: true },
      { name: 'state', type: 'text', required: false },
      { name: 'owner', type: 'relation', required: true, options: { collectionId: "_pb_users_auth_", cascadeDelete: true, maxSelect: 1 } },
      { name: 'view_token', type: 'text', required: true },
      { name: 'edit_token', type: 'text', required: true }
    ],
    listRule: "", viewRule: "", 
    createRule: "@request.auth.id != '' && owner = @request.auth.id",
    updateRule: "@request.auth.id != '' && (owner = @request.auth.id || @request.data.edit_token = edit_token)",
    deleteRule: "@request.auth.id != '' && owner = @request.auth.id"
  };

  const docRes = await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify(docBody)
  });
  
  if (!docRes.ok) {
    console.error("Failed to create documents:", await docRes.text());
    return;
  }
  const docCol = await docRes.json();

  // 5. Create Document Updates Collection
  console.log("Creating document_updates collection...");
  const updatesBody = {
    name: 'document_updates',
    type: 'base',
    [usersCol.fields ? 'fields' : 'schema']: [
      { name: 'document_id', type: 'relation', required: true, options: { collectionId: docCol.id, cascadeDelete: true, maxSelect: 1 } },
      { name: 'update_data', type: 'text', required: true },
      { name: 'client_id', type: 'text', required: true },
      { name: 'edit_token', type: 'text', required: false }
    ],
    listRule: "", viewRule: "",
    createRule: "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.data.edit_token = document_id.edit_token)",
    updateRule: null, deleteRule: null
  };
  await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify(updatesBody)
  });

  // 6. Create Document Files Collection
  console.log("Creating document_files collection...");
  const filesBody = {
    name: 'document_files',
    type: 'base',
    [usersCol.fields ? 'fields' : 'schema']: [
      { name: 'document_id', type: 'relation', required: true, options: { collectionId: docCol.id, cascadeDelete: true, maxSelect: 1 } },
      { name: 'name', type: 'text', required: true },
      { name: 'file', type: 'file', required: true, options: { maxSelect: 1, maxSize: 5242880 } },
      { name: 'edit_token', type: 'text', required: false }
    ],
    listRule: "", viewRule: "",
    createRule: "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.data.edit_token = document_id.edit_token)",
    updateRule: "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.data.edit_token = edit_token)",
    deleteRule: "@request.auth.id != '' && (document_id.owner = @request.auth.id || @request.data.edit_token = edit_token)"
  };
  await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify(filesBody)
  });

  // 7. Create Aliases Collection
  console.log("Creating aliases collection...");
  const aliasesBody = {
    name: 'aliases',
    type: 'base',
    [usersCol.fields ? 'fields' : 'schema']: [
      { name: 'alias', type: 'text', required: true },
      { name: 'document_id', type: 'relation', required: true, options: { collectionId: docCol.id, cascadeDelete: true, maxSelect: 1 } },
      { name: 'mode', type: 'select', required: true, options: { values: ['view', 'edit'], maxSelect: 1 } },
      { name: 'token', type: 'text', required: true }
    ],
    listRule: "", viewRule: "",
    createRule: "@request.auth.id != '' && document_id.owner = @request.auth.id",
    updateRule: "@request.auth.id != '' && document_id.owner = @request.auth.id",
    deleteRule: "@request.auth.id != '' && document_id.owner = @request.auth.id"
  };
  await fetch(`${PB_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify(aliasesBody)
  });

  console.log("Bootstrap complete!");
}

bootstrap();
