import React, { useMemo, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import "./Login.css"

function normalizePath(path) {
  if (!path || path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

function Login({ page }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = useMemo(() => {
    const fromState = location.state?.from?.pathname;
    return normalizePath(fromState || page || '/');
  }, [location.state, page]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError('');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      const response = await fetch('/api/manager/login', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data !== 'true') {
        await signOut(auth);
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'You are not authorized to access the manager dashboard.'
        );
      }

      navigate(redirectTarget, { replace: true });
    } catch (loginError) {
      console.error('Login error:', loginError);
      setError(String(loginError.message || loginError));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Checking session...</div>;
  }

  if (user) {
    return <Navigate to={redirectTarget} replace />;
  }


  return (
    <div>
      <h2>Login Page</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e)=> setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e)=> setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? <p>{error}</p> : null}
        <button type="submit" disabled={submitting}>{submitting ? 'Logging In...' : 'Log In'}</button>
      </form>
    </div>
  );
}

export default Login;
