import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';
import '../CreateAccount/CreateAccount.css';
import { useAuth } from "../AuthContext"

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { user, loading } = useAuth();
  const [error, setError] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in:', userCredential.user);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setResetError(err.message);
    }
  };

  if (user) {
    return <Navigate to={'/'} />;
  }

  if (resetMode) {
    return (
      <div className="create-account-container">
        <h2>Reset Password</h2>
        {resetSent ? (
          <>
            <p className="success">
              Password reset email sent! Check your inbox and follow the link to set a new password.
            </p>
            <button
              className="submit"
              onClick={() => { setResetMode(false); setResetSent(false); setResetEmail(''); }}
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            {resetError && <p className="error">{resetError}</p>}
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="reset-email">Email:</label>
                <input
                  type="email"
                  id="reset-email"
                  name="reset-email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="submit">Send Reset Email</button>
            </form>
            <button
              className="submit"
              style={{ background: 'none', color: '#1976d2', border: 'none', cursor: 'pointer', padding: '8px 0', width: '100%', marginTop: '4px' }}
              onClick={() => { setResetMode(false); setResetError(''); }}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="create-account-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div style={{ textAlign: 'right', marginBottom: '8px' }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', padding: 0, fontSize: '0.88rem' }}
            onClick={() => { setResetMode(true); setResetEmail(email); }}
          >
            Forgot password?
          </button>
        </div>
        <button type="submit" className='submit'>Log In</button>
      </form>
      <a href="/create-account" style={{ display: 'block', marginTop: '12px' }}>Create an account here!</a>
    </div>
  );
}

export default Login;
