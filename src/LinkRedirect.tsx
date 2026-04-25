import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pb } from './auth';

export default function LinkRedirect() {
  const { alias } = useParams<{ alias: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveAlias = async () => {
      try {
        const record = await pb.collection('aliases').getFirstListItem(`alias="${alias}"`, {
          $autoCancel: false
        });
        
        if (record) {
          navigate(`/${record.mode}/${record.token}`);
        } else {
          setError("Link not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Link not found or has expired.");
      }
    };

    if (alias) {
      resolveAlias();
    }
  }, [alias, navigate]);

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1e1e', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>404</h1>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/')}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1e1e', color: 'white', fontFamily: 'sans-serif' }}>
      <p>Redirecting...</p>
    </div>
  );
}
