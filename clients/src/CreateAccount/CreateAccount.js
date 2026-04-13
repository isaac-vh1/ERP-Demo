import React, { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './CreateAccount.css';

const CreateAccount = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Function to validate the password
  const validatePassword = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    return regex.test(password);
  };
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));

    // Validate password in real-time
    if (name === 'password') {
      if (!validatePassword(value)) {
        setError('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
      } else {
        setError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!validatePassword(formData.password)) {
      setError('Password does not meet the required criteria.');
      return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      userCredential.user.getIdToken().then(token => {
        fetch('/api/create-account', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({name: formData.displayName})
        }).catch(error => console.error('Error sending email:', error))
      })
      setSuccess('Account created successfully!');
      navigate("/verify");
    } catch (err) {
      setError(err.message);
    }
  };

  if (user) {
    return <Navigate to={"/"} />
  }

  return (
    <div className="create-account-container">
      <h2>Create Account</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="displayName">Name<span className='required'>*</span></label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            required
            autoComplete='name'
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email<span className='required'>*</span></label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete='email'
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password<span className='required'>*</span></label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete='new-password'
          />
          <small>
            Password must contain at least one uppercase letter, one lowercase letter, and one number.
          </small>
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password<span className='required'>*</span></label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            autoComplete='new-password'
          />
        </div>
        <button type="submit" className='submit'>Create Account</button>
      </form>
      <a href='/login'>Login Here!</a>
    </div>
  );
};

export default CreateAccount;
