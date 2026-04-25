import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb, getAuth, createNewAccount, loginWithToken, getExportToken, getColor } from './auth';
import { FileText, Plus, Key, Copy, Trash2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getAuth());
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);
  const [importToken, setImportToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [newColor, setNewColor] = useState(user?.color || (user ? getColor(user) : '#007acc'));

  const fetchDocs = async () => {
    try {
      const records = await pb.collection('documents').getFullList({
        sort: '-created',
      });
      setDocs(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocs();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      const updated = await pb.collection('users').update(user.id, {
        name: newName,
        color: newColor
      });
      setUser(updated);
      setShowProfile(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    const newUser = await createNewAccount();
    if (newUser) setUser(newUser);
    setLoading(false);
  };

  const handleImportAccount = async () => {
    if (!importToken.trim()) return;
    setLoading(true);
    const newUser = await loginWithToken(importToken.trim());
    if (newUser) {
      setUser(newUser);
    } else {
      alert("Invalid or expired token.");
    }
    setLoading(false);
  };

  const createDocument = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");

      const viewToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const editToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      await pb.collection('documents').create({
        title: 'Untitled Document',
        owner: user.id,
        view_token: viewToken,
        edit_token: editToken,
      });

      navigate(`/edit/${editToken}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create document.");
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await pb.collection('documents').delete(id);
      fetchDocs();
    } catch (err) {
      console.error(err);
      alert("Failed to delete document.");
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(getExportToken() || '');
    alert("Account token copied to clipboard! Save this somewhere safe.");
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1e1e', color: 'white' }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#1e1e1e', color: 'white', fontFamily: 'sans-serif' }}>
        <h1>Typst Collab</h1>
        <p style={{ color: '#aaa', marginBottom: '2rem' }}>Welcome to real-time collaborative Typst editing.</p>
        
        <div style={{ backgroundColor: '#2d2d2d', padding: '2rem', borderRadius: '8px', width: '300px', border: '1px solid #444' }}>
          <h3 style={{ marginTop: 0 }}>First time here?</h3>
          <button 
            onClick={handleCreateAccount}
            style={{ width: '100%', padding: '0.8rem', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '1.5rem' }}
          >
            Create Anonymous Account
          </button>

          <hr style={{ borderColor: '#444', marginBottom: '1.5rem' }} />

          <h3 style={{ marginTop: 0 }}>Already have an account?</h3>
          <input 
            type="text" 
            placeholder="Paste your account token..." 
            value={importToken}
            onChange={(e) => setImportToken(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem', marginBottom: '0.5rem', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
          />
          <button 
            onClick={handleImportAccount}
            style={{ width: '100%', padding: '0.8rem', backgroundColor: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Import Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#1e1e1e', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', backgroundColor: '#2d2d2d', borderBottom: '1px solid #444', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Typst Collab Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            onClick={() => {
              setNewName(user.name);
              setNewColor(getColor(user));
              setShowProfile(!showProfile);
            }} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: '4px', backgroundColor: showProfile ? '#444' : 'transparent' }}
            title="Edit Profile"
          >
             <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: getColor(user) }}></div>
             <span>{user.name}</span>
          </div>
          <button onClick={() => setShowToken(!showToken)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
             <Key size={14} /> Account Token
          </button>
        </div>
      </div>

      {showProfile && (
        <div style={{ backgroundColor: '#2d2d2d', padding: '1rem 2rem', borderBottom: '1px solid #444', display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.3rem' }}>Nickname</label>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)}
              style={{ padding: '0.5rem', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '0.3rem' }}>Color</label>
            <input 
              type="color" 
              value={newColor} 
              onChange={(e) => setNewColor(e.target.value)}
              style={{ width: '50px', height: '35px', padding: '2px', backgroundColor: '#1e1e1e', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
            />
          </div>
          <button 
            onClick={handleUpdateProfile}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Save Changes
          </button>
          <button 
            onClick={() => setShowProfile(false)}
            style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      )}

      {showToken && (
        <div style={{ backgroundColor: '#ffffe0', color: '#333', padding: '1rem 2rem', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Your Account Token:</strong> Save this string somewhere safe. You need it to log in on other devices.
            <br />
            <code style={{ backgroundColor: '#fff', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #ccc', marginTop: '0.5rem', display: 'inline-block' }}>
              {getExportToken()}
            </code>
          </div>
          <button onClick={copyToken} style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Copy size={16} /> Copy Token
          </button>
        </div>
      )}

      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0 }}>My Documents</h1>
          <button 
            onClick={createDocument} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            <Plus size={18} /> New Document
          </button>
        </div>

        {docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#2d2d2d', borderRadius: '8px', border: '1px dashed #444' }}>
            <p style={{ color: '#aaa', margin: 0 }}>You haven't created any documents yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {docs.map(doc => (
              <div key={doc.id} onClick={() => navigate(`/edit/${doc.edit_token}`)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', backgroundColor: '#2d2d2d', borderRadius: '8px', border: '1px solid #444', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3d3d3d'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2d2d2d'}>
                <FileText size={24} color="#007acc" />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.2rem 0' }}>{doc.title || 'Untitled Document'}</h3>
                  <small style={{ color: '#aaa' }}>Created: {new Date(doc.created).toLocaleDateString()}</small>
                </div>
                <button 
                  onClick={(e) => deleteDocument(doc.id, e)}
                  style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '0.5rem' }}
                  title="Delete Document"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
