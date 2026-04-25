import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import type { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { vim } from '@replit/codemirror-vim';
import { basicSetup } from 'codemirror';
import { completionKeymap } from '@codemirror/autocomplete';
import { languageServer } from 'codemirror-languageserver';
import { typst } from 'codemirror-lang-typst';
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';
import { WebrtcProvider } from 'y-webrtc';
import { $typst } from '@myriaddreamin/typst.ts';
// @ts-ignore
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
// @ts-ignore
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import { PocketBaseProvider } from './PocketBaseProvider';
import { pb, ensureAuth, getColor } from './auth';
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { Terminal, Type, Eye, EyeOff, Share2, Code, ZoomIn, ZoomOut, Home, FolderOpen, Upload, Trash2, Edit2 } from 'lucide-react';
import './App.css';

let typstInitialized = false;
let typstInitPromise: Promise<void> | null = null;

async function initTypst() {
  if (typstInitialized) return;
  if (typstInitPromise) return typstInitPromise;
  
  typstInitPromise = (async () => {
    try {
      $typst.setCompilerInitOptions({ getModule: () => compilerWasm });
      $typst.setRendererInitOptions({ getModule: () => rendererWasm });
    } catch (e) {
      // Already initialized, which is fine
      console.debug("Typst already initialized", e);
    }
    typstInitialized = true;
  })();
  
  return typstInitPromise;
}

export default function Editor() {
  const { mode, token } = useParams<{ mode: string, token: string }>();
  const isReadOnly = mode === 'view';
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [typstContent, setTypstContent] = useState('');
  const [isVimMode, setIsVimMode] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [showCode, setShowCode] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [docId, setDocId] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled Document');
  const [isReady, setIsReady] = useState(false);
  const [viewLink, setViewLink] = useState<string>('');
  const [editLink, setEditLink] = useState<string>('');
  const [showShare, setShowShare] = useState(false);
  const [aliases, setAliases] = useState<any[]>([]);
  const [newAlias, setNewAlias] = useState('');

  const [files, setFiles] = useState<any[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [awareness, setAwareness] = useState<any>(null);
  const [lspStatus, setLspStatus] = useState<string>('Ready');
  const [lspProgress, setLspProgress] = useState<number | null>(null);

  // Memoize Yjs instances so they aren't recreated on re-renders
  const ydoc = useMemo(() => new Y.Doc(), []);
  const ytext = useMemo(() => ydoc.getText('codemirror'), [ydoc]);

  const fetchAliases = async (dId: string) => {
    try {
      const records = await pb.collection('aliases').getFullList({
        filter: `document_id="${dId}"`,
        $autoCancel: false
      });
      setAliases(records);
    } catch (e) {
      console.error("Failed to fetch aliases", e);
    }
  };

  const createAlias = async (m: 'view' | 'edit') => {
    if (!newAlias.trim() || !docId) return;
    try {
      const t = m === 'view' ? viewLink.split('/').pop() : editLink.split('/').pop();
      await pb.collection('aliases').create({
        alias: newAlias.trim(),
        document_id: docId,
        mode: m,
        token: t
      });
      setNewAlias('');
      fetchAliases(docId);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to create alias. It might already be taken.");
    }
  };

  const deleteAlias = async (id: string) => {
    try {
      await pb.collection('aliases').delete(id);
      fetchAliases(docId!);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      // Use the base URL, proxy will handle the connection logic
      socket = new WebSocket('ws://127.0.0.1:8081/status');
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'tinymist-status') {
            const payload = data.payload;
            if (payload.message) {
              setLspStatus(payload.message);
              setTimeout(() => setLspStatus('Ready'), 5000);
            }
            if (payload.value) {
              const val = payload.value;
              if (val.kind === 'begin') {
                setLspStatus(val.title);
                setLspProgress(val.percentage || null);
              } else if (val.kind === 'report') {
                setLspProgress(val.percentage || null);
                if (val.message) setLspStatus(val.message);
              } else if (val.kind === 'end') {
                setLspStatus('Ready');
                setLspProgress(null);
              }
            }
          }
        } catch (e) {}
      };

      socket.onclose = () => {
        retryTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();
    return () => {
      socket?.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  const fetchFiles = async (dId: string) => {
    try {
      const records = await pb.collection('document_files').getFullList({
        filter: `document_id="${dId}"`,
        $autoCancel: false,
        headers: { 'x-token': token || '' }
      });
      setFiles(records);

      await initTypst();
      const compiler = await $typst.getCompiler();
      
      for (const record of records) {
        const fileUrl = pb.files.getUrl(record, record.file);
        const res = await fetch(fileUrl);
        const buffer = await res.arrayBuffer();
        // $typst.svg snippet API writes main file to /tmp/random.typ
        // Mapping files to /tmp/ allows relative path loading to work smoothly.
        compiler.mapShadow('/tmp/' + record.name, new Uint8Array(buffer));
      }
      setRefreshCounter(c => c + 1);
    } catch (e) {
      console.error("Failed to fetch files", e);
    }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docId || isReadOnly) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document_id', docId);
      formData.append('name', file.name);
      formData.append('file', file);
      formData.append('edit_token', token || '');
      
      await pb.collection('document_files').create(formData, { $autoCancel: false, headers: { 'x-token': token || '' } });
      await fetchFiles(docId);
    } catch (err) {
      console.error(err);
      alert("Failed to upload file");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteFile = async (id: string, name: string) => {
    if (isReadOnly || !confirm("Delete file?")) return;
    setLoading(true);
    try {
      await pb.collection('document_files').delete(id, { $autoCancel: false, headers: { 'x-token': token || '' } });
      
      const compiler = await $typst.getCompiler();
      compiler.unmapShadow('/tmp/' + name);
      
      await fetchFiles(docId!);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renameFile = async (id: string, oldName: string) => {
    if (isReadOnly) return;
    const newName = prompt("Enter new file name:", oldName);
    if (!newName || newName === oldName) return;
    
    setLoading(true);
    try {
      await pb.collection('document_files').update(id, { name: newName }, { $autoCancel: false, headers: { 'x-token': token || '' } });
      
      const compiler = await $typst.getCompiler();
      compiler.unmapShadow('/tmp/' + oldName);
      
      await fetchFiles(docId!);
    } catch (err) {
      console.error(err);
      alert("Failed to rename file");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    let pbProvider: PocketBaseProvider | null = null;
    let webrtcProvider: WebrtcProvider | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    const init = async () => {
      try {
        const user = await ensureAuth();
        if (!active) return;
        
        // Lookup document by token
        const filter = isReadOnly ? `view_token="${token}"` : `edit_token="${token}"`;
        const docs = await pb.collection('documents').getList(1, 1, { 
          filter, 
          $autoCancel: false,
          headers: { 'x-token': token || '' }
        });
        
        if (!active) return;

        if (docs.items.length === 0) {
          setError("Document not found or invalid token.");
          setLoading(false);
          return;
        }

        const docRecord = docs.items[0];
        setDocId(docRecord.id);
        setTitle(docRecord.title);
        
        await fetchFiles(docRecord.id);
        await fetchAliases(docRecord.id);
        if (!active) return;
        
        // Generate links for sharing
        const origin = window.location.origin;
        setViewLink(`${origin}/view/${docRecord.view_token}`);
        if (!isReadOnly) {
          setEditLink(`${origin}/edit/${docRecord.edit_token}`);
        }

        // Initialize persistent sync provider
        pbProvider = new PocketBaseProvider(ydoc, pb, docRecord.id, {
          isReadOnly,
          editToken: isReadOnly ? undefined : token
        });

        // Initialize WebRTC for ephemeral cursor awareness
        // WebRTC room should be unguessable, use the doc ID
        webrtcProvider = new WebrtcProvider(`doksy-room-${docRecord.id}`, ydoc, { 
          signaling: ['ws://localhost:4444'],
          peerOpts: {
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
              ]
            }
          }
        });
        const currentAwareness = webrtcProvider.awareness;
        setAwareness(currentAwareness);

        if (user) {
          const color = getColor(user);
          currentAwareness.setLocalStateField('user', {
            name: user.name,
            color: color,
            colorLight: color + '33'
          });
        }

        const updateActiveUsers = () => {
          const usersMap = new Map();
          Array.from(currentAwareness.getStates().entries()).forEach(([clientId, state]: any) => {
             if (state.user) {
                usersMap.set(clientId, state.user);
             }
          });
          setActiveUsers(Array.from(usersMap.values()));
        };
        currentAwareness.on('change', updateActiveUsers);
        updateActiveUsers(); // Initial call

        setTimeout(() => {
          if (active && !isReadOnly && ytext.toString() === '') {
            ytext.insert(0, '#set page(width: auto, height: auto, margin: 1cm)\n\n= Hello Typst\n\nThis is a collaborative editor using *Vim* bindings, _Yjs_, and *Typst*!');
          }
        }, 1000);

        setLoading(false);
        setIsReady(true);

        const handleUpdate = () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            if (active) setTypstContent(ytext.toString());
          }, 500);
        };
        
        ytext.observe(handleUpdate);
        if (active) setTypstContent(ytext.toString());

      } catch (err: any) {
        if (!active) return;
        console.error(err);
        setError("An error occurred while loading the document.");
        setLoading(false);
      }
    };

    init();

    return () => {
      active = false;
      clearTimeout(timeout);
      if (pbProvider) {
        ytext.unobserve(() => {}); 
        pbProvider.destroy();
      }
      if (webrtcProvider) {
        webrtcProvider.destroy();
      }
    };
  }, [mode, token, ydoc, ytext, isReadOnly]);

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    if (!isReadOnly && docId) {
      try {
        await pb.collection('documents').update(docId, { title: newTitle }, { $autoCancel: false, headers: { 'x-token': token || '' } });
      } catch (e) {
        console.error("Failed to save title", e);
      }
    }
  };

  const extensions = useMemo(() => {
    if (!isReady) return [];
    
    const ext: Extension[] = [];

    // Highest precedence: Autocomplete keys (Enter, ArrowDown) so Vim doesn't intercept dropdown navigation
    ext.push(keymap.of(completionKeymap));
    
    if (isVimMode && !isReadOnly) {
      ext.push(vim());
    }

    ext.push(basicSetup);
    
    if (docId) {
      ext.push(languageServer({
        serverUri: 'ws://127.0.0.1:8081',
        rootUri: 'file:///',
        documentUri: `file:///${docId}.typ`,
        languageId: 'typst',
        workspaceFolders: null,
        initializationOptions: {
          exportPdf: "never",
          semanticTokens: "disable",
          formatterMode: "typstyle"
        }
      }));
    }

    ext.push(typst());

    if (awareness) {
      ext.push(yCollab(ytext, awareness));
    } else {
      ext.push(yCollab(ytext, null));
    }
    
    return ext;
  }, [isVimMode, isReadOnly, docId, awareness, ytext, isReady]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading document...</div>;
  if (error) return <div style={{ color: 'red', padding: '2rem' }}>{error}</div>;

  return (
    <div className="app-container">
      <div className="toolbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="toolbar-btn" onClick={() => navigate('/')} style={{ marginRight: '1rem' }} title="Dashboard">
            <Home size={16} />
          </button>
          
          <input 
            type="text" 
            value={title} 
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={isReadOnly}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#e0e0e0', 
              fontWeight: 600, 
              fontSize: '1rem',
              outline: 'none',
              cursor: isReadOnly ? 'default' : 'text',
              borderBottom: isReadOnly ? 'none' : '1px dashed #666'
            }}
          />
          {isReadOnly && <span style={{ color: '#aaa', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(Read-Only)</span>}
          
          <div className="active-users-widget">
            {activeUsers.map((u, i) => (
              <div 
                key={i} 
                className="user-avatar" 
                style={{ backgroundColor: u.color }} 
                title={u.name}
              >
                {u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            ))}
            <span className="user-count">{activeUsers.length} online</span>
          </div>
        </div>
        <div className="toolbar-actions">
          {!isReadOnly && (
            <>
              <button 
                className={`toolbar-btn ${isVimMode ? 'active' : ''}`}
                onClick={() => setIsVimMode(true)}
                title="Vim Mode"
              >
                <Terminal size={16} /> Vim
              </button>
              <button 
                className={`toolbar-btn ${!isVimMode ? 'active' : ''}`}
                onClick={() => setIsVimMode(false)}
                title="Normal Mode"
              >
                <Type size={16} /> Normal
              </button>
              <div className="toolbar-divider" />
            </>
          )}
          
          <button 
            className={`toolbar-btn ${showShare ? 'active' : ''}`}
            onClick={() => setShowShare(!showShare)}
            title="Share"
          >
            <Share2 size={16} /> Share
          </button>

          <div className="toolbar-divider" />

          <button 
            className={`toolbar-btn ${showFiles ? 'active' : ''}`}
            onClick={() => setShowFiles(!showFiles)}
            title="Toggle Files"
          >
            <FolderOpen size={16} /> Files
          </button>

          <button 
            className={`toolbar-btn ${showCode ? 'active' : ''}`}
            onClick={() => setShowCode(!showCode)}
            title="Toggle Code"
          >
            <Code size={16} /> Code
          </button>

          <button 
            className={`toolbar-btn ${showPreview ? 'active' : ''}`}
            onClick={() => setShowPreview(!showPreview)}
            title="Toggle Preview"
          >
            {showPreview ? <Eye size={16} /> : <EyeOff size={16} />} Preview
          </button>

          {showPreview && (
            <>
              <div className="toolbar-divider" />
              <button className="toolbar-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} title="Zoom Out">
                <ZoomOut size={16} />
              </button>
              <span style={{ fontSize: '0.8rem', color: '#aaa', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button className="toolbar-btn" onClick={() => setZoom(z => Math.min(3, z + 0.2))} title="Zoom In">
                <ZoomIn size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {showShare && (
        <div style={{ position: 'absolute', top: '48px', right: '1rem', backgroundColor: '#333', padding: '1rem', borderRadius: '0 0 8px 8px', zIndex: 10, border: '1px solid #444', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', width: '350px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Standard Links:</strong>
            <div style={{ marginBottom: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>View Link</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" readOnly value={viewLink} style={{ padding: '0.2rem', flex: 1, backgroundColor: '#222', color: '#fff', border: '1px solid #555' }} />
                <button onClick={() => copyToClipboard(viewLink)} style={{ cursor: 'pointer' }}>Copy</button>
              </div>
            </div>
            {!isReadOnly && (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>Edit Link</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" readOnly value={editLink} style={{ padding: '0.2rem', flex: 1, backgroundColor: '#222', color: '#fff', border: '1px solid #555' }} />
                  <button onClick={() => copyToClipboard(editLink)} style={{ cursor: 'pointer' }}>Copy</button>
                </div>
              </div>
            )}
          </div>

          <hr style={{ borderColor: '#444', margin: '1rem 0' }} />

          <div>
            <strong>Aliases (Short Links):</strong>
            {!isReadOnly && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Enter alias (e.g. my-doc)" 
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  style={{ padding: '0.3rem', backgroundColor: '#222', color: '#fff', border: '1px solid #555' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => createAlias('view')} style={{ flex: 1, padding: '0.3rem', cursor: 'pointer' }}>Create View Alias</button>
                  <button onClick={() => createAlias('edit')} style={{ flex: 1, padding: '0.3rem', cursor: 'pointer' }}>Create Edit Alias</button>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '1rem', maxHeight: '150px', overflowY: 'auto' }}>
              {aliases.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#aaa', fontStyle: 'italic' }}>No aliases created yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {aliases.map(a => {
                    const url = `${window.location.origin}/link/${a.alias}`;
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem', backgroundColor: '#222', borderRadius: '4px', fontSize: '0.85rem' }}>
                        <span style={{ color: a.mode === 'edit' ? '#ff4d4f' : '#007acc', fontWeight: 'bold', minWidth: '40px' }}>{a.mode}</span>
                        <span style={{ flex: 1, margin: '0 0.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }} title={url}>{a.alias}</span>
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          <button onClick={() => copyToClipboard(url)} style={{ padding: '2px 5px', cursor: 'pointer' }}>Copy</button>
                          {!isReadOnly && <button onClick={() => deleteAlias(a.id)} style={{ padding: '2px 5px', color: '#ff4d4f', cursor: 'pointer' }}>×</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="workspace">
        <Allotment>
          <Allotment.Pane minSize={150} preferredSize={200} visible={showFiles}>
            <div style={{ padding: '1rem', backgroundColor: '#2d2d2d', height: '100%', overflowY: 'auto', color: 'white', boxSizing: 'border-box', borderRight: '1px solid #111' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Files</h3>
                {!isReadOnly && (
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', backgroundColor: '#007acc', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <Upload size={14} /> Upload
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={uploadFile} />
                  </label>
                )}
              </div>
              {files.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: '0.9rem', fontStyle: 'italic' }}>No files uploaded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {files.map(f => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: '#1e1e1e', borderRadius: '4px', border: '1px solid #444' }}>
                      <span style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{f.name}</span>
                      {!isReadOnly && (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button onClick={() => renameFile(f.id, f.name)} style={{ background: 'none', border: 'none', color: '#007acc', cursor: 'pointer', padding: '2px' }} title="Rename">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteFile(f.id, f.name)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '2px' }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Allotment.Pane>
          <Allotment.Pane minSize={200} visible={showCode}>
            <div className="editor-pane">
              <CodeMirror
                theme="dark"
                basicSetup={false}
                extensions={extensions}
                className="codemirror-wrapper"
                editable={!isReadOnly}
              />
            </div>
          </Allotment.Pane>
          <Allotment.Pane minSize={200} visible={showPreview}>
            <div className="preview-pane">
              <TypstPreview source={typstContent} zoom={zoom} refresh={refreshCounter} />
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* LSP Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <div className={`status-indicator ${lspStatus === 'Ready' ? 'ready' : 'busy'}`}></div>
          <span>LSP: {lspStatus}</span>
          {lspProgress !== null && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${lspProgress}%` }}></div>
            </div>
          )}
        </div>
        <div className="status-spacer"></div>
        <div className="status-item">
          <span>{typstContent.length} chars</span>
        </div>
      </div>
    </div>
  );
}

const TypstPreview = ({ source, zoom, refresh }: { source: string, zoom: number, refresh: number }) => {
  const [pages, setPages] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<any[] | null>(null);

  useEffect(() => {
    let active = true;
    const compile = async () => {
      try {
        await initTypst();
        // @ts-ignore
        const result = await $typst.svg({ mainContent: source, multi: true });
        if (active && result) {
          setPages(Array.isArray(result) ? result : [result]);
          setDiagnostics(null);
        }
      } catch (err: any) {
        if (active) {
          const msg = err?.message || String(err) || "Compilation failed";
          const parsed: any[] = [];
          
          // Regex to parse Rust Debug format of SourceDiagnostic
          const regex = /SourceDiagnostic \{ severity: (\w+), .*? message: "(.*?)", .*? hints: \[(.*?)\] \}/g;
          let match;
          while ((match = regex.exec(msg)) !== null) {
            const severity = match[1];
            const message = match[2];
            const rawHints = match[3];
            const hints = rawHints ? rawHints.split('", "').map(h => h.replace(/^"|"$/g, '')) : [];
            
            parsed.push({ severity, message, hints });
          }
          
          if (parsed.length > 0) {
            setDiagnostics(parsed);
          } else {
            setDiagnostics([{ severity: 'Error', message: msg, hints: [] }]);
          }
        }
      }
    };

    if (source) compile();
    return () => { active = false; };
  }, [source, refresh]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'auto' }}>
      {diagnostics && (
        <div style={{ 
          position: 'absolute', 
          top: '1rem', 
          left: '1rem', 
          right: '1rem', 
          zIndex: 20, 
          backgroundColor: '#2d1b1b', 
          border: '1px solid #ff4d4f', 
          borderRadius: '4px', 
          padding: '1rem', 
          color: '#ffccc7',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          fontFamily: 'monospace',
          fontSize: '0.9rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Trash2 size={16} /> Compiler Diagnostics
          </div>
          {diagnostics.map((d, i) => (
            <div key={i} style={{ marginBottom: '0.8rem', paddingLeft: '1rem', borderLeft: `3px solid ${d.severity === 'Error' ? '#ff4d4f' : '#faad14'}` }}>
              <div style={{ fontWeight: 'bold', color: d.severity === 'Error' ? '#ff4d4f' : '#faad14' }}>{d.severity}: {d.message}</div>
              {d.hints.length > 0 && (
                <div style={{ marginTop: '0.3rem', fontSize: '0.85rem', color: '#aaa' }}>
                  {d.hints.map((h: string, j: number) => <div key={j}>• {h}</div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pages.length === 0 && !diagnostics && <div style={{ padding: 20 }}>Compiling...</div>}
      {pages.length > 0 && (
        <div className="typst-container" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}>
          {pages.map((svg, i) => (
            <div key={i} className="typst-page" dangerouslySetInnerHTML={{ __html: svg }} />
          ))}
        </div>
      )}
    </div>
  );
}

