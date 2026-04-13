import React, { useState, useEffect } from 'react';
import './CreateAccount.css';
import { useAuth } from '../AuthContext';
import { useNavigate, useSearchParams} from 'react-router-dom';

const VerifyEmail = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code');
  useEffect(() => {
    if(codeParam && codeParam !== ''){
      setCode(codeParam);
      handleSubmit();
    }
    const sendVerificationEmail = async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const response = await fetch('/api/verify-email', {
            method: 'GET',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json'
            }
          }).then(response => {
            if (!response.ok) {
              return response.json().then(err => {
                console.error('Error response:', err);
                throw new Error(err.error);
              });
            }
            return response.json();
          })
          .then(data => {
            if (data === "Email verification initiated") {
              console.log("Received data: [" + data + "]");
              setSuccess("Verification Email Sent! Code will expire in 15 minutes");
            } else if(data === "Not sent, too close to time") {
              setSuccess("Verification Email Sent Previously!");
            }
          })
        } catch (err) {
          console.error('Error sending email:', err);
          setError("Error sending email, please try again");
        }
      }
    };

    sendVerificationEmail();
  }, []);

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
    }
    setError('');
    setSuccess('');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: code ? code : codeParam })
      });
      const data = await response.json();
      if (data === "true" || data === true) {
        setSuccess('Email verified successfully!');
        navigate('/');
      } else if (data === "Verification Email Resent"){
        setError("Code Expired")
        setSuccess("Verification Email resent!")
      } else {
        setError("Wrong Verification Code! Try again!");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleResend = async () => {
    try {
      setSuccess('')
      setError('')
      const token = await user.getIdToken();
      const response = await fetch('/api/verify-email-force', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data === "Email verification initiated") {
        setSuccess("Verification Email Sent! Code will expire in 15 minutes");
      } else {
        setError("Unexpected response: " + data);
      }
    } catch (err) {
      console.error('Error sending email:', err);
      setError("Error sending email, please try again");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="create-account-container">
      <h2>Verify Your Email</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="code">Verification Code:</label>
          <input 
            type="text" 
            id="code" 
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required 
          />
        </div>
        <button type="submit" className='submit'>Verify Email</button>
      </form>
      <button onClick={handleResend} className='submit'>Resend Email</button>
    </div>
  );
};

export default VerifyEmail;
