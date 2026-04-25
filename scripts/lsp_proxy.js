import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lspPath = path.resolve(__dirname, '../lsp/tinymist-x86_64-unknown-linux-gnu/tinymist');

const wss = new WebSocketServer({ port: 8081, host: '127.0.0.1' });
const statusListeners = new Set();

wss.on('connection', (ws, req) => {
  console.log(`New connection: ${req.url}`);
  if (req.url && req.url.startsWith('/status')) {
    console.log('Status monitor connected');
    statusListeners.add(ws);
    ws.on('close', () => {
      console.log('Status monitor disconnected');
      statusListeners.delete(ws);
    });
    return;
  }

  console.log('LSP Client connected');
  const lsp = spawn(lspPath, ['lsp']);
  
  const reader = new StreamMessageReader(lsp.stdout);
  const writer = new StreamMessageWriter(lsp.stdin);

  const pendingRequests = new Map();

  const broadcastStatus = (statusMsg) => {
    const msg = JSON.stringify({ type: 'tinymist-status', payload: statusMsg });
    for (const listener of statusListeners) {
      if (listener.readyState === 1) listener.send(msg);
    }
  };

  const methodMap = new Map();

  reader.listen((message) => {
    try {
      if (message.id !== undefined && pendingRequests.has(message.id)) {
        const start = pendingRequests.get(message.id);
        const duration = Date.now() - start;
        const method = methodMap.get(message.id) || 'unknown';
        console.log(`LSP Response [${message.id}] (${method}) took ${duration}ms`);
        pendingRequests.delete(message.id);
        methodMap.delete(message.id);
      }

      if (message.method === '$/progress' || message.method === 'window/showMessage') {
        broadcastStatus(message.params);
      }
      ws.send(JSON.stringify(message)); 
    } catch (e) { 
      console.error("WS Send Error:", e.message); 
    }
  });

  lsp.stderr.on('data', (data) => {
    // console.error(`LSP Stderr: ${data}`);
  });

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.id !== undefined && parsed.method) {
        pendingRequests.set(parsed.id, Date.now());
        methodMap.set(parsed.id, parsed.method);
        console.log(`LSP Request [${parsed.id}] (${parsed.method})`);
      } else if (parsed.method) {
        console.log(`LSP Notification (${parsed.method})`);
      }
      writer.write(parsed);
    } catch (e) {
      console.error("WS Receive Error:", e.message);
    }
  });

  ws.on('close', () => {
    console.log('LSP Client disconnected');
    lsp.kill();
  });

  lsp.on('exit', (code) => {
    console.log(`LSP Process exited with code ${code}`);
    ws.close();
  });
});

console.log('LSP WebSocket proxy running on ws://localhost:8081');
