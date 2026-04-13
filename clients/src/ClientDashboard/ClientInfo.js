import React, { useState, useEffect } from 'react';
import './ClientInfo.css';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const ClientInfo = () => {
  const { user } = useAuth();
  const [clientInfo, setClientInfo] = useState(['','','','','1','','','']);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    user.getIdToken().then(token => {
      fetch('/api/client/client-info', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data === "false") {
          setEditing(true);
        } else {
          setClientInfo(data);
          if (data.slice(0, 7).filter(item => item === '').length >= 3) {
            setEditing(true);
          }
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching client info:', error);
        setLoading(false);
        setEditing(true);
      });
    });
  }, [user]);

  const handleChange = (e, index) => {
    const { value, type, checked } = e.target;
    setClientInfo(prev => {
      const newArray = [...prev];
      newArray[index] = type === 'checkbox' ? (checked ? 1 : 0) : value;
      return newArray;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    user.getIdToken().then(token => {
      fetch('/api/client/update/client-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(clientInfo)
      })
      .then(response => response.json())
      .then(data => {
        if(data == "Updated")
        alert('Client information saved successfully.');
        setEditing(false);
      })
      .catch(error => {
        console.error('Error saving client information:', error);
      });
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="client-information-page">
      <h1>Client Information</h1>
      {!editing ? (
        <div>
          <p><strong>First Name:</strong> {clientInfo[0]}</p>
          <p><strong>Last Name:</strong> {clientInfo[1]}</p>
          <p><strong>Email:</strong> {clientInfo[2]}</p>
          <p><strong>Phone Number:</strong> {clientInfo[3]}</p>
          <p>
            <strong>Permission to Use On-Site Photographs for Promotional Purposes:</strong>{' '}
            {clientInfo[4] ? 'Yes' : 'No'}
          </p>
          <p><strong>Address:</strong> {clientInfo[5]}</p>
          <p><strong>City:</strong> {clientInfo[6]}</p>
          <p><strong>Zip Code:</strong> {clientInfo[7]}</p>
          <button onClick={() => setEditing(true)} className='submit'>Edit Information</button>
          <button onClick={() => navigate("/")} className='submit'>Dashboard</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              First Name<span className='required'>*</span>
              <input
                type="text"
                value={clientInfo[0]}
                onChange={(e) => handleChange(e, 0)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Last Name<span className='required'>*</span>
              <input
                type="text"
                value={clientInfo[1]}
                onChange={(e) => handleChange(e, 1)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Email<span className='required'>*</span>
              <input
                type="email"
                value={clientInfo[2]}
                onChange={(e) => handleChange(e, 2)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Phone Number:
              <input
                type="text"
                value={clientInfo[3]}
                onChange={(e) => handleChange(e, 3)}
              />
            </label>
          </div>
          <div>
            <label>
            Permission to Use On-Site Photographs for Promotional Purposes:
              <input
                type="checkbox"
                checked={!!clientInfo[4]}
                onChange={(e) => handleChange(e, 4)}
              />
            </label>
          </div>
          <div>
            <label>
              Address<span className='required'>*</span>
              <textarea
                value={clientInfo[5]}
                onChange={(e) => handleChange(e, 5)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              City<span className='required'>*</span>
              <input
                type="text"
                value={clientInfo[6]}
                onChange={(e) => handleChange(e, 6)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Zip Code<span className='required'>*</span>
              <input
                type="text"
                value={clientInfo[7]}
                onChange={(e) => handleChange(e, 7)}
                required
              />
            </label>
          </div>
          <button type="submit">Save Information</button>
          <button onClick={() => {setEditing(false)}}>Cancel</button>
        </form>
      )}
    </div>
  );
};

export default ClientInfo;