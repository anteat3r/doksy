// Node.js script to set up PocketBase schema
 // we can just use native fetch if Node >= 18

async function setup() {
  console.log("Setting up PocketBase...");
  
  // Create admin account
  try {
    await fetch('http://127.0.0.1:8090/api/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'password123456',
        passwordConfirm: 'password123456'
      })
    });
  } catch(e) {} // might already exist

  // Authenticate
  const authRes = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: 'admin@admin.com',
      password: 'password123456'
    })
  });
  const auth = await authRes.json();
  const token = auth.token;

  // Create documents collection
  await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({
      name: 'documents',
      type: 'base',
      system: false,
      schema: [
        { name: 'title', type: 'text', required: true },
        { name: 'state', type: 'text', required: false } // Base64 full state
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: ""
    })
  });

  // Create document_updates collection
  await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token },
    body: JSON.stringify({
      name: 'document_updates',
      type: 'base',
      system: false,
      schema: [
        { name: 'document_id', type: 'text', required: true },
        { name: 'update_data', type: 'text', required: true }, // Base64 update chunk
        { name: 'client_id', type: 'text', required: true }
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: ""
    })
  });

  console.log("Schema setup complete.");
}

setup();
