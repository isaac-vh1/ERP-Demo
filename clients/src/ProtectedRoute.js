import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './App.css';

const VERIFY_REQUEST_TIMEOUT_MS = 15000;

function ProtectedRoute({ setSavedPage, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [verified, setVerified] = useState(null);
  const [client, setClient] = useState(null);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), VERIFY_REQUEST_TIMEOUT_MS);

    setVerified(null);
    setClient(null);
    setVerificationError('');

    if (!user) {
      window.clearTimeout(timeoutId);
      return () => {
        cancelled = true;
      };
    }

    user.getIdToken()
      .then((token) =>
        fetch('/api/get-verified', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token
          },
          signal: controller.signal,
        })
      )
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message = data && typeof data === 'object' ? data.error : '';
          throw new Error(message || 'Unable to verify your account.');
        }
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        if (data === "true") {
          setVerified(true);
          setClient(true);
        } else if (data === "Not Verified") {
          setVerified(false);
          setClient(false);
        } else if (data === "No Client") {
          setVerified(true);
          setClient(false);
        } else {
          setVerified(false);
          setClient(false);
          setVerificationError('Unexpected verification response from the server.');
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error fetching verification state:', error);
        setVerified(false);
        setClient(false);
        setVerificationError(
          error.name === 'AbortError'
            ? 'Account verification timed out. Please try again.'
            : String(error.message || error)
        );
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user, location]);

  if (loading) {
    return (
      <div className="app-spinner-wrap">
        <div className="app-spinner" />
      </div>
    );
  }
  if (!user) {
    setSavedPage(location.pathname);
    return <Navigate to="/login" />;
  }
  if (verificationError) {
    return <div>{verificationError}</div>;
  }
  if (verified === null || client === null) {
    return (
      <div className="app-spinner-wrap">
        <div className="app-spinner" />
      </div>
    );
  }
  if (!verified && location.pathname !== "/verify") {
    return <Navigate to="/verify" />;
  }
  if(verified && location.pathname === "/verify") {
    return <Navigate to="/" />;
  }
  if (!client && location.pathname !== "/client-info" && location.pathname !== "/verify") {
    return <Navigate to="client-info" />;
  }
  return children;
}

export default ProtectedRoute;
