// Mock API for the client-facing demo app.

const now = new Date();
const daysAgo = (n) => new Date(now - n * 86400000).toISOString().slice(0, 10);
const isoAgo = (n) => new Date(now - n * 86400000).toUTCString();
const isoFromNow = (n) => new Date(+now + n * 86400000).toUTCString();

const db = {
  clientInfo: ['Demo', 'Client', 'demo@example.com', '555-000-0000', 1, '123 Demo St', 'Anytown', '00000'],
  jobRequests: [
    { id: 1, title: 'Regular mowing', details: 'Weekly front and back yard', priority: 'normal', preferredWindow: 'Mornings', serviceAddress: '123 Demo St', status: 'scheduled', createdAt: isoAgo(30) },
    { id: 2, title: 'Spring cleanup', details: 'Full yard cleanup', priority: 'high', preferredWindow: 'Anytime', serviceAddress: '123 Demo St', status: 'pending', createdAt: isoAgo(10) },
  ],
  nextRequestId: 3,
  // invoices: [invoiceNum, issueDate, dueDate, subtotal, salesTax, balanceDue, tips, status, paymentDate, locationCode, firstName, lastName, address, city, zip, ...itemPairs]
  invoices: {
    1: ['INV-001', isoAgo(60), isoAgo(30), '450.00', '40.50', '0.00',   '0.00',  'paid',    isoAgo(25), 1, 'Demo', 'Client', '123 Demo St', 'Anytown', '00000', 'Lawn mowing', '200.00', 'Hedge trimming', '150.00', 'Debris removal', '100.00'],
    2: ['INV-002', isoAgo(30), isoFromNow(0), '320.00', '28.80', '348.80', '0.00', 'pending', null,       1, 'Demo', 'Client', '123 Demo St', 'Anytown', '00000', 'Spring cleanup', '320.00'],
    3: ['INV-003', isoAgo(10), isoFromNow(20), '780.00', '70.20', '850.20', '0.00', 'pending', null,      1, 'Demo', 'Client', '123 Demo St', 'Anytown', '00000', 'Full yard service', '500.00', 'Fertilization', '180.00', 'Edging', '100.00'],
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function matchPath(pattern, path) {
  const patternParts = pattern.split('/');
  const pathParts = path.split('?')[0].split('/');
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

async function route(url, options) {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const method = (options?.method || 'GET').toUpperCase();

  // Verification check (ProtectedRoute — bypassed by passthrough, but handle anyway)
  if (path === '/api/get-verified' && method === 'GET') {
    return jsonResponse('true');
  }

  // Client dashboard
  if (path === '/api/client/dashboard' && method === 'GET') {
    const outstanding = Object.values(db.invoices)
      .filter((inv) => inv[7] === 'pending')
      .reduce((s, inv) => s + parseFloat(inv[5] || 0), 0);

    return jsonResponse({
      client: {
        firstName: db.clientInfo[0],
        lastName: db.clientInfo[1],
        email: db.clientInfo[2],
        phoneNumber: db.clientInfo[3],
        address: db.clientInfo[5],
        city: db.clientInfo[6],
        zipCode: db.clientInfo[7],
      },
      summary: {
        outstandingBalance: outstanding.toFixed(2),
        pendingInvoiceCount: Object.values(db.invoices).filter((inv) => inv[7] === 'pending').length,
        jobRequestCount: db.jobRequests.length,
      },
      invoices: Object.entries(db.invoices).map(([id, inv]) => ({
        id: Number(id),
        invoiceNumber: inv[0],
        issueDate: inv[1],
        dueDate: inv[2],
        subtotal: inv[3],
        salesTax: inv[4],
        balanceDue: inv[5],
        tips: inv[6],
        status: inv[7],
        paymentDate: inv[8],
      })),
      scheduledJobs: [
        { id: 1, title: 'Lawn mowing', start: isoFromNow(2), end: isoFromNow(2), description: 'Weekly service' },
        { id: 2, title: 'Spring cleanup', start: isoFromNow(7), end: isoFromNow(7), description: 'Full yard' },
      ],
      jobRequests: db.jobRequests,
    });
  }

  // Submit job request
  if (path === '/api/client/job-request' && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    const id = db.nextRequestId++;
    db.jobRequests.push({ ...body, id, status: 'pending', createdAt: new Date().toISOString() });
    return jsonResponse('true');
  }

  // Client info GET
  if (path === '/api/client/client-info' && method === 'GET') {
    return jsonResponse(db.clientInfo);
  }

  // Client info UPDATE
  if (path === '/api/client/update/client-info' && method === 'POST') {
    const body = JSON.parse(options.body || '[]');
    if (Array.isArray(body)) db.clientInfo = body;
    return jsonResponse('true');
  }

  // Invoice detail (shared with manager)
  const invoiceMatch = matchPath('/api/invoice/:invoiceId', path);
  if (invoiceMatch && method === 'GET') {
    const inv = db.invoices[invoiceMatch.invoiceId];
    if (!inv) return jsonResponse('Invoice not found', 404);
    return jsonResponse(inv);
  }

  // Auth/account routes — not needed in demo, return success silently
  if (path === '/api/create-account') return jsonResponse('true');
  if (path === '/api/verify-email') return jsonResponse('true');
  if (path === '/api/verify') return jsonResponse('true');
  if (path === '/api/verify-email-force') return jsonResponse('true');

  return null;
}

export function installMockApi() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function mockFetch(input, options) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('/api/')) {
      return originalFetch(input, options);
    }
    try {
      const response = await route(url, options);
      if (response) return response;
    } catch (err) {
      console.error('[mockApi] handler error:', err);
      return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    console.warn('[mockApi] unmatched route:', options?.method || 'GET', url);
    return new Response(JSON.stringify({ error: 'Mock route not found: ' + url }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };
}
