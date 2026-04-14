import React, { useEffect, useMemo, useState } from 'react';
import './InvoiceNew.css';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import DatePicker from 'react-datepicker';
import { Helmet } from 'react-helmet';
import { DateTime } from 'luxon';
import HamburgerMenu from '../Components/HamburgerMenu';
import { Spinner } from 'react-bootstrap';

const EMPTY_ITEM = ['', '0.00'];

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

const InvoiceNew = ({ collapsed, toggleSidebar }) => {
  const today = DateTime.local();
  const dueDate = today.plus({ days: 30 });
  const [invoiceData, setInvoiceData] = useState([
    '',
    '',
    '',
    '',
    today.toUTC().toHTTP(),
    dueDate.toUTC().toHTTP(),
    '',
    '0.00',
    '0.00',
    '0.00',
    '0.00',
    'pending',
    '0',
  ]);
  const [invoiceItems, setInvoiceItems] = useState([EMPTY_ITEM]);
  const [clientData, setClientData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [selectedClientIndex, setSelectedClientIndex] = useState(-1);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(-1);
  const [clientSearch, setClientSearch] = useState('');
  const [salesTaxRate, setSalesTaxRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const user = auth.currentUser;
  const navigate = useNavigate();

  const selectedLocation = selectedLocationIndex >= 0 ? locationData[selectedLocationIndex] : null;

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadInvoiceSeedData() {
      setLoading(true);
      setError('');
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/manager/new-invoice', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load invoice setup data.');
        }

        const dataAPI = await response.json();
        if (cancelled) return;

        setInvoiceData((prev) => {
          const next = [...prev];
          next[2] = dataAPI[0];
          return next;
        });
        setClientData(dataAPI[1] || []);
        setLocationData(dataAPI[2] || []);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching invoice setup data:', err);
          setError(String(err.message || err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInvoiceSeedData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const subtotal = roundMoney(
      invoiceItems.reduce((sum, item) => sum + (parseFloat(item[1]) || 0), 0)
    );
    const taxAmount = roundMoney(subtotal * salesTaxRate);
    const tips = roundMoney(invoiceData[10]);
    const total = roundMoney(subtotal + taxAmount + tips);

    setInvoiceData((prev) => {
      const next = [...prev];
      next[7] = subtotal.toFixed(2);
      next[8] = taxAmount.toFixed(2);
      next[9] = total.toFixed(2);
      return next;
    });
  }, [invoiceItems, salesTaxRate, invoiceData[10]]);

  useEffect(() => {
    if (!user || !selectedLocation) {
      setSalesTaxRate(0);
      setInvoiceData((prev) => {
        const next = [...prev];
        next[12] = '0';
        return next;
      });
      return;
    }

    let cancelled = false;

    async function loadSalesTaxRate() {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/manager/sales-tax-lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify([selectedLocation[1], selectedLocation[2], selectedLocation[3]]),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load sales tax.');
        }

        const dataAPI = await response.json();
        if (cancelled) return;

        setSalesTaxRate(Number(dataAPI[0] || 0));
        setInvoiceData((prev) => {
          const next = [...prev];
          next[12] = dataAPI[1] || '0';
          return next;
        });
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching sales tax:', err);
          setSalesTaxRate(0);
          setError(String(err.message || err));
        }
      }
    }

    loadSalesTaxRate();

    return () => {
      cancelled = true;
    };
  }, [selectedLocation, user]);

  const taxPercentLabel = useMemo(
    () => (salesTaxRate * 100).toFixed(2).replace(/\.00$/, ''),
    [salesTaxRate]
  );

  const adjustForTimezone = (date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() + offset * 60000);
  };

  const handleClientSelection = (inputValue) => {
    setClientSearch(inputValue);
    const foundIndex = clientData.findIndex((client) => {
      const fullName = `${client[1] || ''} ${client[2] || ''}`.trim();
      return fullName === inputValue;
    });

    if (foundIndex === -1) {
      setSelectedClientIndex(-1);
      setSelectedLocationIndex(-1);
      setSalesTaxRate(0);
      setInvoiceData((prev) => {
        const next = [...prev];
        next[1] = '';
        next[3] = '';
        next[12] = '0';
        return next;
      });
      return;
    }

    const client = clientData[foundIndex];
    const locationIndex = locationData.findIndex((item) => item[0] === client[9]);

    setSelectedClientIndex(foundIndex);
    setSelectedLocationIndex(locationIndex);
    setInvoiceData((prev) => {
      const next = [...prev];
      next[1] = client[0];
      next[3] = client[9] || '';
      return next;
    });
  };

  const saveInvoice = async () => {
    if (!user) return;
    if (!invoiceData[1]) {
      setError('Select a client before saving the invoice.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/update/new-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify([invoiceData, invoiceItems.filter((item) => item[0] || parseFloat(item[1]) > 0)]),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save invoice.');
      }
      if (result === 'true') {
        navigate('/invoice-dashboard');
        return;
      }
      throw new Error('Unexpected response while saving invoice.');
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setInvoiceItems((prev) => [...prev, [...EMPTY_ITEM]]);
  };

  const updateItem = (index, itemIndex, value) => {
    setInvoiceItems((prev) => {
      const next = [...prev];
      next[index] = [...next[index]];
      next[index][itemIndex] = value;
      return next;
    });
  };

  if (loading) return <Spinner className="m-5" />;

  return (
    <div className="invoice-scope">
      <Helmet><title>ERP Demo | New Invoice</title></Helmet>
      <div className="top-bar">
        <div className={`top-bar-button ${collapsed ? 'collapsed' : ''}`} onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
      </div>
      <input
        className="form-control"
        list="datalistOptions"
        id="exampleDataList"
        placeholder="Type to search..."
        value={clientSearch}
        onChange={(e) => handleClientSelection(e.target.value)}
      />

      <datalist id="datalistOptions">
        {clientData.map((client, index) => {
          const value = client ? `${client[1] || ''} ${client[2] || ''}`.trim() : '';
          return <option key={index} value={value} />;
        })}
      </datalist>
      <div className="invoiceBorder">
        <div className="invoiceContainer">
          <label className="title">Invoice #</label>
          <input
            type="text"
            name="InvoiceNum"
            value={invoiceData[2]}
            onChange={(e) =>
              setInvoiceData((prev) => {
                const next = [...prev];
                next[2] = e.target.value;
                return next;
              })
            }
          />
          <img src="/favicon.ico" className="invoiceLogo" alt="Demo Company logo" />
          <section className="section">
            <h2 className="companyName">Demo Company</h2>
            <p>123 Demo St.</p>
            <p>Anytown, WA 00000</p>
            <p>(555) 000-0000</p>
          </section>

          <section className="section">
            <h3 className="heading">Invoice Details</h3>
            <p><strong>Date of Completion: </strong><DatePicker
              selected={invoiceData[4] ? adjustForTimezone(new Date(invoiceData[4])) : null}
              onChange={(date) =>
                setInvoiceData((prev) => {
                  const next = [...prev];
                  next[4] = date.toUTCString();
                  return next;
                })
              }
              dateFormat="yyyy-MM-dd"
            /></p>
            <p><strong>Due Date: </strong><DatePicker
              selected={invoiceData[5] ? adjustForTimezone(new Date(invoiceData[5])) : null}
              onChange={(date) =>
                setInvoiceData((prev) => {
                  const next = [...prev];
                  next[5] = date.toUTCString();
                  return next;
                })
              }
              dateFormat="yyyy-MM-dd"
            />
            </p>
          </section>
          <section className="section">
            <h3 className="heading">Bill To</h3>
            <p>
              {selectedClientIndex >= 0 ? `${clientData[selectedClientIndex][1] || ''} ${clientData[selectedClientIndex][2] || ''}`.trim() : ''}
            </p>
            <p>{selectedLocation ? selectedLocation[1] || '' : ''}</p>
            <p>{selectedLocation ? `${selectedLocation[2] || ''}, WA, ${selectedLocation[3] || ''}` : ''}</p>
          </section>

          <section className="section">
            <h3 className="heading">Items</h3>
            <table className="invoiceTable">
              <thead>
                <tr>
                  <th className="tableHeader">Description</th>
                  <th className="tableHeader">Price</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => (
                  <tr key={index}>
                    <td className="leftAlign"><input
                      type="text"
                      name="description"
                      value={item[0]}
                      onChange={(e) => updateItem(index, 0, e.target.value)}
                    /></td>
                    <td className="rightAlign">$<input
                      type="text"
                      name="price"
                      value={item[1]}
                      onChange={(e) => updateItem(index, 1, e.target.value)}
                    /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="button" onClick={addItem} style={{ marginTop: '20px' }}>
              Add Item
            </button>
          </section>

          <section className="section">
            <div className="totals">
              <p>
                <strong>Subtotal:</strong> ${invoiceData[7]}
              </p>
              <p>
                <strong>
                  Sales Tax ({taxPercentLabel}%):
                </strong>{' '}
                ${invoiceData[8]}
              </p>
              <p className="total">
                ${invoiceData[9]}
              </p>
            </div>
          </section>

          <section className="section">
            <h3 className="heading">Payment Methods</h3>
            <ul>
              <li>Zelle (demo@example.com, Demo Company LLC)</li>
              <li>Debit/Credit Card accepted, text (555) 000-0000 to get started, (3% surcharge will apply)</li>
              <li>Cash or Check</li>
            </ul>
          </section>

          <section className="section">
            <p className="note">
              Note: A late fee of 20% of the subtotal may apply if payment is not
              received by the due date.
            </p>
          </section>
        </div>
      </div>
      {error ? <p className="note" style={{ color: '#b00020' }}>{error}</p> : null}
      <button className="button" onClick={saveInvoice} style={{ marginTop: '20px' }} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
};

export default InvoiceNew;
