import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, Image, ProgressBar, Row, Spinner } from 'react-bootstrap';
import heic2any from 'heic2any';
import { useNavigate } from 'react-router-dom';
import { createWorker } from 'tesseract.js';

import HamburgerMenu from '../Components/HamburgerMenu';
import { useAuth } from '../AuthContext';

const CATEGORY_KEYWORDS = [
  { category: 'Fuel', terms: ['shell', 'chevron', '76', 'gas', 'fuel', 'exxon'] },
  { category: 'Meals', terms: ['restaurant', 'cafe', 'coffee', 'burger', 'grill', 'pizza'] },
  { category: 'Supplies', terms: ['office', 'staples', 'depot', 'printer', 'paper', 'supply', 'supplies'] },
  { category: 'Materials and Supplies', terms: ['home depot', 'lowes', 'lumber', 'hardware', 'material'] },
  { category: 'Equipment and Tools', terms: ['tool', 'tools', 'equipment', 'rental', 'repair'] },
  { category: 'Insurance', terms: ['insurance', 'premium', 'policy'] },
  { category: 'Licenses', terms: ['license', 'licenses', 'licence', 'permit', 'registration'] },
  { category: 'Dump Waste', terms: ['dump', 'waste', 'transfer station', 'landfill', 'disposal'] },
  { category: 'Other', terms: [] },
];

const initialForm = {
  expense_date: '',
  category: '',
  amount: '',
  description: '',
  vendor_name: '',
};

const categoryOptions = CATEGORY_KEYWORDS.map(({ category }) => category);

function standardizeDate(input) {
  if (!input) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const cleaned = input.replace(/\./g, '/').replace(/-/g, '/');
  const parts = cleaned.split('/');
  if (parts.length !== 3) return '';
  const [month, day, yearValue] = parts;
  const year = yearValue.length === 2 ? `20${yearValue}` : yearValue;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function guessCategory(text) {
  const normalized = text.toLowerCase();
  const match = CATEGORY_KEYWORDS.find(({ terms }) => terms.some((term) => normalized.includes(term)));
  return match ? match.category : '';
}

function parseAmounts(text) {
  const matches = [...text.matchAll(/(?:\$|USD\s*)?(\d{1,4}(?:[.,]\d{2}))/gi)]
    .map((match) => Number(match[1].replace(',', '.')))
    .filter((value) => Number.isFinite(value));

  if (!matches.length) {
    return { amount: '' };
  }

  const sorted = [...matches].sort((a, b) => b - a);
  const total = sorted[0];

  return {
    amount: total.toFixed(2),
  };
}

function parseVendor(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return '';

  const vendorLine = lines.find((line) => /[A-Za-z]{3,}/.test(line)) || lines[0];
  return vendorLine.replace(/[^A-Za-z0-9&.' -]/g, '').trim().slice(0, 120);
}

function parseReceiptText(text) {
  const normalized = text.replace(/\r/g, '');
  const dateMatch = normalized.match(
    /(\d{4}-\d{2}-\d{2})|((?:0?[1-9]|1[0-2])[./-](?:0?[1-9]|[12][0-9]|3[01])[./-](?:\d{2}|\d{4}))/
  );
  const amounts = parseAmounts(normalized);
  const description = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(' | ')
    .slice(0, 255);

  return {
    expense_date: dateMatch ? standardizeDate(dateMatch[0]) : '',
    category: guessCategory(normalized),
    amount: amounts.amount,
    description,
    vendor_name: parseVendor(normalized),
  };
}

function isHeicFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  return type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif');
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image decode failed'));
    };
    image.src = objectUrl;
  });
}

async function canvasConvertToJpeg(file) {
  if (typeof document === 'undefined') {
    throw new Error('Canvas conversion unavailable');
  }

  const image = await blobToImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context unavailable');
  }
  context.drawImage(image, 0, 0);

  const jpegBlob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas export failed'));
        }
      },
      'image/jpeg',
      0.92
    );
  });

  const baseName = String(file.name || 'receipt').replace(/\.(heic|heif)$/i, '');
  return new File([jpegBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

async function normalizeUploadFile(file) {
  if (!isHeicFile(file)) {
    return file;
  }

  try {
    return await canvasConvertToJpeg(file);
  } catch (nativeError) {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92,
      });
      const normalizedBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const baseName = String(file.name || 'receipt').replace(/\.(heic|heif)$/i, '');
      return new File([normalizedBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
    } catch (libraryError) {
      throw new Error(
        `HEIC conversion failed: ${nativeError instanceof Error ? nativeError.message : nativeError}; ${
          libraryError instanceof Error ? libraryError.message : libraryError
        }`
      );
    }
  }
}

function ReceiptScanner({ toggleSidebar, collapsed }) {
  const fileRef = useRef(null);
  const workerRef = useRef(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [recentReceipts, setRecentReceipts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [deletingReceiptId, setDeletingReceiptId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(initialForm);

  useEffect(() => () => {
    if (workerRef.current) {
      workerRef.current.terminate().catch(() => {});
      workerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;

    async function loadReceipts() {
      try {
        setLoadingReceipts(true);
        const token = await user.getIdToken();
        const response = await fetch('/api/manager/receipts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load receipts.');
        }
        if (cancelled) return;
        const rows = Array.isArray(payload) ? payload : [];
        const [, ...dataRows] = rows;
        setRecentReceipts(
          dataRows
            .map((row) => ({
              id: row[0],
              expense_date: row[1],
              category: row[2],
              amount: row[3],
              description: row[4],
            }))
            .sort((a, b) => String(b.expense_date || '').localeCompare(String(a.expense_date || '')))
            .slice(0, 8)
        );
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load receipts:', err);
        }
      } finally {
        if (!cancelled) {
          setLoadingReceipts(false);
        }
      }
    }

    loadReceipts();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const canSubmit = !processing && !saving && !authLoading;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = async (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setOcrText('');
    setError('');
    setSuccess('');
    setProgress(0);
    setProcessing(true);
    setSelectedFile(null);

    try {
      const file = await normalizeUploadFile(rawFile);
      const nextPreview = URL.createObjectURL(file);
      setPreview(nextPreview);
      setSelectedFile(file);

      if (!workerRef.current) {
        workerRef.current = await createWorker('eng', 1, {
          logger: (message) => {
            if (typeof message.progress === 'number') {
              setProgress(Math.round(message.progress * 100));
            }
          },
        });
      }

      const { data } = await workerRef.current.recognize(file);
      setOcrText(data.text || '');
      const parsed = parseReceiptText(data.text || '');
      setForm((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, value || prev[key]])
        ),
      }));
      setProgress(100);
    } catch (err) {
      console.error('OCR error:', err);
      setError(
        isHeicFile(rawFile)
          ? 'This HEIC image could not be converted or read for OCR. You can still enter the receipt manually below.'
          : 'Could not read the receipt automatically. You can still enter the values manually below.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = ({ clearMessages = true } = {}) => {
    setForm(initialForm);
    setOcrText('');
    if (clearMessages) {
      setError('');
      setSuccess('');
    }
    setProgress(0);
    setProcessing(false);
    setSaving(false);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    setSelectedFile(null);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (authLoading || !user) {
      setError('You must be signed in to save an expense.');
      return;
    }
    if (!form.expense_date || !form.category || !form.amount || !form.description.trim()) {
      setError('Expense date, category, amount, and description are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const token = await user.getIdToken();

      const selectedItem = {
        ...form,
        amount: String(form.amount),
      };

      const requestOptions = selectedFile
        ? (() => {
            const body = new FormData();
            body.append('selectedItem', JSON.stringify(selectedItem));
            body.append('receiptImage', selectedFile, selectedFile.name || 'receipt');
            return {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body,
            };
          })()
        : {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ selectedItem }),
          };

      const response = await fetch('/api/manager/update/receipts', requestOptions);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save expense.');
      }

      const payload = await response.json().catch(() => ({}));
      const createdId = payload?.return;
      setRecentReceipts((current) => [
        {
          id: createdId || `new-${Date.now()}`,
          expense_date: form.expense_date,
          category: form.category,
          amount: form.amount,
          description: form.description,
        },
        ...current,
      ].slice(0, 8));
      setSuccess('Expense saved.');
      resetAll({ clearMessages: false });
    } catch (err) {
      console.error('Expense save failed:', err);
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!user || deletingReceiptId === receiptId) return;
    if (!window.confirm('Delete this receipt record?')) {
      return;
    }

    try {
      setDeletingReceiptId(receiptId);
      setError('');
      setSuccess('');
      const token = await user.getIdToken();
      const response = await fetch('/api/manager/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(['receipts', receiptId]),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete receipt.');
      }
      setRecentReceipts((current) => current.filter((receipt) => receipt.id !== receiptId));
      setSuccess('Receipt deleted.');
    } catch (err) {
      console.error('Receipt delete failed:', err);
      setError(String(err.message || err));
    } finally {
      setDeletingReceiptId(null);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-center p-4">
        <Card className="w-100" style={{ maxWidth: 980 }}>
          <Card.Body>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="menu-toggle" onClick={toggleSidebar}><HamburgerMenu collapsed={collapsed} /></div>
              <Card.Title className="mb-0">Receipt Scanner</Card.Title>
            </div>
            <Card.Text className="text-muted">
              OCR runs locally in the browser. Review the parsed fields before saving.
            </Card.Text>

            {error ? <Alert variant="warning">{error}</Alert> : null}
            {success ? <Alert variant="success">{success}</Alert> : null}

            <Row className="g-4">
              <Col md={5}>
                <div className="mb-3 text-center">
                  {preview ? (
                    <Image src={preview} thumbnail className="w-100 mb-3" />
                  ) : (
                    <div className="border border-secondary rounded p-5 text-muted">
                      No image selected
                    </div>
                  )}

                  <Form.Control
                    ref={fileRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    capture="environment"
                    onChange={handleFile}
                  />

                  {processing && progress > 0 && progress < 100 ? (
                    <ProgressBar now={progress} label={`${progress}%`} className="mt-3" />
                  ) : null}
                </div>

                <Form.Group>
                  <Form.Label>OCR Text</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={10}
                    value={ocrText}
                    readOnly
                    placeholder="Scanned text will appear here."
                  />
                </Form.Group>
              </Col>

              <Col md={7}>
                <Form onSubmit={handleSubmit}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Expense Date</Form.Label>
                        <Form.Control
                          type="date"
                          name="expense_date"
                          value={form.expense_date}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Category</Form.Label>
                        <Form.Select
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select category</option>
                          {categoryOptions.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Total Amount</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="amount"
                          value={form.amount}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Vendor Name</Form.Label>
                        <Form.Control
                          name="vendor_name"
                          value={form.vendor_name}
                          onChange={handleChange}
                          placeholder="Optional unless schema supports it"
                        />
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="description"
                          value={form.description}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="d-flex gap-2 mt-4">
                    <Button type="submit" disabled={!canSubmit} className="flex-grow-1">
                      {saving ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" /> Saving…
                        </>
                      ) : (
                        'Save Expense'
                      )}
                    </Button>
                    <Button type="button" variant="outline-secondary" onClick={resetAll}>
                      Reset
                    </Button>
                  </div>
                </Form>
              </Col>
            </Row>

            <hr className="my-4" />

            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="mb-1">Recent Receipts</h5>
                  <div className="text-muted small">Latest saved expenses from the receipts table.</div>
                </div>
                {loadingReceipts ? <Spinner animation="border" size="sm" /> : null}
              </div>

              {recentReceipts.length ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th className="text-end">Amount</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReceipts.map((receipt) => (
                        <tr
                          key={receipt.id}
                          role="button"
                          tabIndex={0}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/receipts/${receipt.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              navigate(`/receipts/${receipt.id}`);
                            }
                          }}
                        >
                          <td>{receipt.expense_date || 'N/A'}</td>
                          <td>{receipt.category || 'Uncategorized'}</td>
                          <td>{receipt.description || 'No description'}</td>
                          <td className="text-end">{receipt.amount || '0.00'}</td>
                          <td className="text-end">
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={deletingReceiptId === receipt.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteReceipt(receipt.id);
                              }}
                            >
                              {deletingReceiptId === receipt.id ? 'Deleting…' : 'Delete'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted">No receipts saved yet.</div>
              )}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

export default ReceiptScanner;
