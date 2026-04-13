import React, { useState, useEffect } from 'react';
import HamburgerMenu from '../Components/HamburgerMenu';
import "./Table.css"
import { Helmet } from "react-helmet";
import { auth } from '../firebase';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function Table({ page, toggleSidebar, collapsed }) {
  const [update, setUpdate] = useState(false);
  const [data, setData] = useState([]);
  const [dataHeader, setDataHeader] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    setDataHeader([]);
    setData([]);
    setFilteredData([]);
    if(update === true) {
      setUpdate(false);
    }
    user.getIdToken().then(token => {
      fetch('/api/manager/' + page, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            console.error('Error response:', err);
            setError(true);
            throw new Error(err.error);
          });
        }
        return response.json();
      })
      .then(dataAPI => {
        dataHandler(dataAPI)
      })
      .catch(error => {console.error('Error fetching Data:', error); setError(true)})
      .finally(() => {setUpdate(false); setLoading(false)});
    });
  }, [update, page]);
  const dataHandler = (dataAPI) => {
    var head = dataAPI.shift()
    setDataHeader(head)
    setData(dataAPI)
    setFilteredData(dataAPI)
  }
  const handleFilterChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchFilter(value);
    const filtered = data.filter((item) => {
      const field1 = item[1] ? item[1].toLowerCase() : '';
      const field2 = item[2] ? item[2].toLowerCase() : '';
      const field3 = item[3] ? item[3].toString().toLowerCase() : '';
      const field4 = item[4] ? item[4].toLowerCase() : '';
      const searchTerm = value.toLowerCase();
      return (
        field1.includes(searchTerm) ||
        field2.includes(searchTerm) ||
        field3.includes(searchTerm) ||
        field4.includes(searchTerm)
      );
    });
    setFilteredData(filtered);
  };
  const handleRowClick = (item) => {
    if (page === 'clients') {
      navigate(`/clients/${item[0]}`);
      return;
    }
    setSelectedItem(item)
  };
  const closePopup = () => {
    setSelectedItem(null);
  };
  function capitalize(str) {
    return str
      .split(' ')
      .map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }
  const newItem = () => {
    const item = {};
    dataHeader.forEach((head, index) => {
      item[index] = '';
    });
    setSelectedItem(item);
  }
  const saveChanges = () => {
    try {
      user.getIdToken().then(token => {
        fetch('/api/manager/update/' + page, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({selectedItem}),
        }).then(response => {
          const result = response.json();
          console.log(result)
        })
        setUpdate(true)
      });
    } catch (err) {
      setError(true);
    }
    closePopup();
  }
  const adjustForTimezone = (date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() + offset * 60000);
  };

  const deleteItem = (id) => {
    setLoading(true);
    const pageLower = page.toLowerCase();
    user.getIdToken().then(token => {
      fetch('/api/manager/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ pageLower, id })
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            console.error('Error response:', err);
            setError(true);
            throw new Error(err.error);
          });
        }
        return response.json();
      })
      .catch(error => {console.error('Error fetching Data:', error); setError(true)})
      .finally(() => {setLoading(false)});
    });
    data.map((row, index) => {
      if(row[0] === id) {
        data.splice(index, 1);
      }
    });
  }

  if (loading) return <Spinner className="m-5" />;

  return (
    <div className="table-container">
      <Helmet>
        <title>{capitalize(page)}</title>
      </Helmet>
         <div className="table-page-header">
           <div className="menu-toggle" onClick={toggleSidebar}>
             <HamburgerMenu collapsed={collapsed} />
           </div>
           <h1>{capitalize(page)}</h1>
           <button onClick={newItem}>New {page.slice(0, -1)}</button>
         </div>
      <input
        type="text"
        placeholder="Search by name, email, phone, or address..."
        className="filter-input"
        value={searchFilter}
        onChange={handleFilterChange}
      />
      {page === 'clients' ? (
        <p className="table-helper-copy">Click a client row to open invoices, upcoming jobs, and year-to-date spend.</p>
      ) : null}
      <table className="table">
        <thead>
          <tr>
            {dataHeader.slice(1).map((head, index) => (
              <th key={index}>{capitalize(head[0].replace('_', ' '))}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row) => (
            <tr key={row[0]} onClick={() => handleRowClick(row)} className={page === 'clients' ? 'clickable-row' : ''}>
              {row.slice(1).map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className={`error ${error ? 'show': ' '}`}>Error Loading Data</h3>
      {selectedItem && (
        <div className="table-popup" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h2>{capitalize(page)} Details</h2>
            {dataHeader.map((head, index) => (
              <label key={index}>
                {capitalize(head[0].replace('_', ' '))}:
                {head[1] === 'date' ? (
                  
                  <DatePicker
                    selected={
                      selectedItem[index]
                        ? adjustForTimezone(new Date(selectedItem[index]))
                        : null
                    }
                    onChange={(date) =>
                      setSelectedItem((prev) => ({
                        ...prev,
                        [index]: date.toUTCString(),
                      }))
                    }
                    dateFormat="yyyy-MM-dd"
                  />
                ) : (
                  <input
                    type="text"
                    name={head[0]}
                    value={selectedItem[index]}
                    onChange={(e) =>
                      setSelectedItem((prev) => ({
                        ...prev,
                        [index]: e.target.value,
                      }))
                    }
                  />
                )}
              </label>
            ))}
              <div className="popup-buttons">
                <button className="cancel-button" onClick={closePopup}>Cancel</button>
                <button className="button" onClick={saveChanges}>Save</button>
                <button className="delete-button" onClick={() => {deleteItem(selectedItem[0]); closePopup();}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
