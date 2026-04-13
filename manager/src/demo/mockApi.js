// Mock API — intercepts all /api/ fetch calls and serves in-memory data.
// Resets on every page reload (module-level state in mockData.js).

import { db } from './mockData';

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

// Table format used by Table.js: [[header pairs], [row values], ...]
function tableFormat(columns, rows) {
  const header = columns.map((col) => [col, 'text']);
  const data = rows.map((row) => columns.map((col) => row[col] ?? ''));
  return [header, ...data];
}

function clientsListPayload() {
  return db.clients.map((c) => ({
    id: c[0],
    name: `${c[1]} ${c[2]}`.trim(),
    firstName: c[1],
    lastName: c[2],
    email: c[3],
    phoneNumber: c[4],
    address: c[5],
    city: c[6],
    zipCode: c[7],
    businessAccount: c[8],
    dorLocationCode: c[9],
    picturePreference: false,
  }));
}

function clientOverviewPayload(clientId, year) {
  const client = db.clients.find((c) => String(c[0]) === String(clientId));
  if (!client) return null;
  const location = db.locations.find((l) => l[0] === client[9]);
  const clientInvoices = db.invoices.filter((inv) => String(inv[1]) === String(clientId));
  const paidInvoices = clientInvoices.filter((inv) => inv[11] === 'paid');
  const pendingInvoices = clientInvoices.filter((inv) => inv[11] === 'pending');
  const totalRevenue = paidInvoices.reduce((s, inv) => s + parseFloat(inv[7] || 0), 0);
  const outstanding = pendingInvoices.reduce((s, inv) => s + parseFloat(inv[9] || 0), 0);
  const events = db.calendar.filter((e) => String(e.client_id) === String(clientId) && e.calendar === 'scheduledEvents');

  return {
    client: {
      id: client[0],
      firstName: client[1],
      lastName: client[2],
      email: client[3],
      phoneNumber: client[4],
      address: client[5],
      city: client[6],
      zipCode: client[7],
      dorLocationCode: location ? location[0] : '',
      picturePreference: false,
    },
    summary: {
      totalRevenue: totalRevenue.toFixed(2),
      outstanding: outstanding.toFixed(2),
      invoiceCount: clientInvoices.length,
      paidCount: paidInvoices.length,
    },
    invoices: clientInvoices.map((inv) => ({
      id: inv[0],
      invoiceNumber: inv[2],
      issueDate: inv[4],
      dueDate: inv[5],
      subtotal: inv[7],
      balanceDue: inv[9],
      status: inv[11],
    })),
    upcomingEvents: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
    })),
    location: location ? { address: location[1], city: location[2], zip: location[3] } : null,
  };
}

async function route(url, options) {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  const method = (options?.method || 'GET').toUpperCase();

  // ── Auth / login ──────────────────────────────────────────────────────────
  if (path === '/api/manager/login' && method === 'GET') {
    return jsonResponse('true');
  }

  // ── Dashboard home ────────────────────────────────────────────────────────
  if (path === '/api/manager/home' && method === 'GET') {
    const year = new Date().getFullYear();
    const yearInvoices = db.invoices.filter((inv) => inv[4] && new Date(inv[4]).getFullYear() === year);
    const paidYearInvoices = yearInvoices.filter((inv) => inv[11] === 'paid');
    const yearIncome = paidYearInvoices.reduce((s, inv) => s + parseFloat(inv[7] || 0), 0);
    const yearSalesTax = paidYearInvoices.reduce((s, inv) => s + parseFloat(inv[8] || 0), 0);
    const yearTips = paidYearInvoices.reduce((s, inv) => s + parseFloat(inv[10] || 0), 0);
    const yearExpenses = db.receipts.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    const outstanding = db.invoices.filter((inv) => inv[11] === 'pending').reduce((s, inv) => s + parseFloat(inv[9] || 0), 0);
    const now = new Date();
    const overdueInvoices = db.invoices.filter((inv) => inv[11] === 'pending' && inv[5] && new Date(inv[5]) < now).length;
    const paidInvoiceValue = paidYearInvoices.reduce((s, inv) => s + parseFloat(inv[9] === '0.00' ? inv[7] : 0) + parseFloat(inv[10] || 0), 0);
    const activeClients = new Set(db.invoices.filter(inv => inv[11] === 'pending').map(inv => inv[1])).size;
    const upcomingEventsRaw = db.calendar
      .filter((e) => e.calendar === 'scheduledEvents' && e.start && new Date(e.start) > now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 5);

    return jsonResponse({
      summary: {
        yearIncome: yearIncome.toFixed(2),
        yearSalesTax: yearSalesTax.toFixed(2),
        yearExpenses: yearExpenses.toFixed(2),
        yearTips: yearTips.toFixed(2),
        netIncome: (yearIncome - yearExpenses).toFixed(2),
        paidInvoiceValue: paidYearInvoices.reduce((s, inv) => s + parseFloat(inv[7] || 0), 0).toFixed(2),
        outstandingBalance: outstanding.toFixed(2),
        overdueInvoices,
        activeClients,
        scheduledEvents: upcomingEventsRaw.length,
      },
      invoiceStatus: {
        paid: db.invoices.filter((inv) => inv[11] === 'paid').length,
        pending: db.invoices.filter((inv) => inv[11] === 'pending').length,
        draft: db.invoices.filter((inv) => inv[11] === 'draft').length,
      },
      recentInvoices: db.invoices.slice(-5).reverse().map((inv) => {
        const client = db.clients.find((c) => c[0] === inv[1]);
        return {
          id: inv[0],
          invoiceNumber: inv[2],
          clientName: client ? `${client[1]} ${client[2]}`.trim() : 'Unknown',
          status: inv[11],
          balanceDue: inv[9],
          dueDate: inv[5],
        };
      }),
      upcomingEvents: upcomingEventsRaw.map((e) => {
        const client = db.clients.find((c) => c[0] === e.client_id);
        return {
          id: e.id,
          title: e.title,
          clientName: client ? `${client[1]} ${client[2]}`.trim() : '',
          start: e.start,
        };
      }),
    });
  }

  // ── Clients list ──────────────────────────────────────────────────────────
  if (path === '/api/manager/clients-list' && method === 'GET') {
    return jsonResponse(clientsListPayload());
  }

  // ── Client overview ───────────────────────────────────────────────────────
  const clientOverviewMatch = matchPath('/api/manager/client-overview/:clientId', path);
  if (clientOverviewMatch && method === 'GET') {
    const payload = clientOverviewPayload(clientOverviewMatch.clientId);
    if (!payload) return jsonResponse({ error: 'Client not found' }, 404);
    return jsonResponse(payload);
  }

  // ── Create client ─────────────────────────────────────────────────────────
  if (path === '/api/manager/client' && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    const id = db.nextIds.clients++;
    const locId = db.nextIds.locations++;
    db.locations.push([locId, body.address || '', body.city || '', body.zipCode || '']);
    db.clients.push([id, body.firstName || '', body.lastName || '', body.email || '', body.phoneNumber || '', body.address || '', body.city || '', body.zipCode || '', false, locId]);
    return jsonResponse({ id });
  }

  // ── Update client ─────────────────────────────────────────────────────────
  const updateClientMatch = matchPath('/api/manager/client/:clientId', path);
  if (updateClientMatch && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    const idx = db.clients.findIndex((c) => String(c[0]) === String(updateClientMatch.clientId));
    if (idx === -1) return jsonResponse({ error: 'Not found' }, 404);
    const c = db.clients[idx];
    db.clients[idx] = [c[0], body.firstName ?? c[1], body.lastName ?? c[2], body.email ?? c[3], body.phoneNumber ?? c[4], body.address ?? c[5], body.city ?? c[6], body.zipCode ?? c[7], c[8], c[9]];
    const locIdx = db.locations.findIndex((l) => l[0] === c[9]);
    if (locIdx !== -1) db.locations[locIdx] = [c[9], body.address ?? c[5], body.city ?? c[6], body.zipCode ?? c[7]];
    return jsonResponse('true');
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  if (path === '/api/manager/delete' && method === 'POST') {
    const body = JSON.parse(options.body || '[]');
    let tableName, id;
    if (Array.isArray(body)) {
      [tableName, id] = body;
    } else {
      tableName = body.pageLower;
      id = body.id;
    }
    const table = db[tableName];
    if (Array.isArray(table)) {
      if (table.length && typeof table[0] === 'object' && !Array.isArray(table[0])) {
        db[tableName] = table.filter((row) => String(row.id) !== String(id));
      } else {
        db[tableName] = table.filter((row) => String(row[0]) !== String(id));
      }
    }
    return jsonResponse('true');
  }

  // ── Invoices data ─────────────────────────────────────────────────────────
  if (path === '/api/manager/invoicesData' && method === 'GET') {
    return jsonResponse([db.invoices, db.clients, db.invoice_items]);
  }

  // ── Invoice mark paid ─────────────────────────────────────────────────────
  const markPaidMatch = matchPath('/api/manager/invoice/:invoiceId/mark-paid', path);
  if (markPaidMatch && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    const idx = db.invoices.findIndex((inv) => String(inv[0]) === String(markPaidMatch.invoiceId));
    if (idx !== -1) {
      const inv = [...db.invoices[idx]];
      inv[6] = body.payment_date || new Date().toUTCString();
      inv[9] = '0.00';
      inv[11] = 'paid';
      db.invoices[idx] = inv;
    }
    return jsonResponse('true');
  }

  // ── Single invoice page ───────────────────────────────────────────────────
  const invoicePageMatch = matchPath('/api/invoice/:invoiceId', path);
  if (invoicePageMatch && method === 'GET') {
    const inv = db.invoices.find((i) => String(i[0]) === String(invoicePageMatch.invoiceId));
    if (!inv) return jsonResponse('Invoice not found', 404);
    const client = db.clients.find((c) => c[0] === inv[1]);
    const location = db.locations.find((l) => l[0] === inv[3]);
    const items = db.invoice_items.filter((item) => item[1] === inv[0]);
    const itemFlat = items.flatMap((item) => [item[2], item[3]]);
    // [invoiceNum, issueDate, dueDate, subtotal, salesTax, balanceDue, tips, status, paymentDate, locationCode, firstName, lastName, address, city, zip, ...items]
    return jsonResponse([
      inv[2], inv[4], inv[5], inv[7], inv[8], inv[9], inv[10], inv[11], inv[6],
      inv[3],
      client ? client[1] : '', client ? client[2] : '',
      location ? location[1] : '', location ? location[2] : '', location ? location[3] : '',
      ...itemFlat,
    ]);
  }

  // ── New invoice seed ──────────────────────────────────────────────────────
  if (path === '/api/manager/new-invoice' && method === 'GET') {
    const nextNum = `INV-${String(db.nextIds.invoices).padStart(3, '0')}`;
    return jsonResponse([nextNum, db.clients, db.locations]);
  }

  // ── Save new invoice ──────────────────────────────────────────────────────
  if (path === '/api/manager/update/new-invoice' && method === 'POST') {
    const [invoiceData, items] = JSON.parse(options.body || '[[],[]]');
    const id = db.nextIds.invoices++;
    db.invoices.push([
      id,
      invoiceData[1], invoiceData[2], invoiceData[3],
      invoiceData[4], invoiceData[5], null,
      invoiceData[7], invoiceData[8], invoiceData[9], invoiceData[10],
      invoiceData[11], new Date().toUTCString(), new Date().toUTCString(),
    ]);
    items.forEach((item) => {
      db.invoice_items.push([db.nextIds.invoice_items++, id, item[0], item[1]]);
    });
    return jsonResponse('true');
  }

  // ── Sales tax lookup ──────────────────────────────────────────────────────
  if (path === '/api/manager/sales-tax-lookup' && method === 'POST') {
    return jsonResponse([0.09, '0900']);
  }

  // ── Calendar events ───────────────────────────────────────────────────────
  if (path === '/api/manager/events' && method === 'GET') {
    const scheduled = db.calendar.filter((e) => e.calendar === 'scheduledEvents');
    const unscheduled = db.calendar.filter((e) => e.calendar === 'unscheduledEvents');
    const worker = db.calendar.filter((e) => e.calendar === 'workerSchedule');
    return jsonResponse([scheduled, unscheduled, worker, db.clients, db.nextIds.calendar, db.job_requests]);
  }

  // ── Save calendar event ───────────────────────────────────────────────────
  if (path === '/api/manager/events/save' && method === 'POST') {
    const event = JSON.parse(options.body || '{}');
    if (event.id) {
      const idx = db.calendar.findIndex((e) => e.id === event.id);
      if (idx !== -1) db.calendar[idx] = { ...db.calendar[idx], ...event };
    } else {
      const id = db.nextIds.calendar++;
      db.calendar.push({ ...event, id });
    }
    return jsonResponse('true');
  }

  // ── Delete calendar event ─────────────────────────────────────────────────
  const calendarDeleteMatch = matchPath('/api/manager/events/:eventId', path);
  if (calendarDeleteMatch && method === 'DELETE') {
    db.calendar = db.calendar.filter((e) => String(e.id) !== String(calendarDeleteMatch.eventId));
    return jsonResponse('true');
  }

  // ── Job requests ──────────────────────────────────────────────────────────
  if (path === '/api/manager/job-requests' && method === 'GET') {
    const allItems = db.job_requests;
    const statusKeys = ['draft', 'pending', 'approved', 'scheduled', 'completed'];
    const columns = statusKeys.map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      items: allItems
        .filter((item) => item.status === key)
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))),
    }));
    return jsonResponse({
      columns,
      clients: clientsListPayload(),
      summary: {
        total: allItems.length,
        highPriority: allItems.filter((item) => item.priority === 'high').length,
        open: allItems.filter((item) => item.status !== 'completed').length,
      },
    });
  }

  // ── Save job request ──────────────────────────────────────────────────────
  if (path === '/api/manager/job-requests/save' && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    if (body.id) {
      const idx = db.job_requests.findIndex((r) => String(r.id) === String(body.id));
      if (idx !== -1) db.job_requests[idx] = { ...db.job_requests[idx], ...body, updatedAt: new Date().toISOString() };
    } else {
      const id = db.nextIds.job_requests++;
      const client = db.clients.find((c) => String(c[0]) === String(body.clientId));
      db.job_requests.push({ ...body, id, clientName: client ? `${client[1]} ${client[2]}`.trim() : '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    return jsonResponse('true');
  }

  // ── Delete job request ────────────────────────────────────────────────────
  const jobDeleteMatch = matchPath('/api/manager/job-requests/:id', path);
  if (jobDeleteMatch && method === 'DELETE') {
    db.job_requests = db.job_requests.filter((r) => String(r.id) !== String(jobDeleteMatch.id));
    return jsonResponse('true');
  }

  // ── Contractors / worker pay (WorkerPayPage) ──────────────────────────────
  if (path === '/api/manager/contractors' && method === 'GET') {
    const header = [['id', 'text'], ['name', 'text'], ['first_name', 'text'], ['last_name', 'text']];
    return jsonResponse([header, ...db.contractors]);
  }

  if (path === '/api/manager/contractor_payments' && method === 'GET') {
    const header = [['id', 'text'], ['contractor_id', 'text'], ['job_name', 'text'], ['work_date', 'text'], ['hours', 'text'], ['amount_paid', 'text'], ['notes', 'text']];
    return jsonResponse([header, ...db.contractor_payments]);
  }

  // ── Receipts list ─────────────────────────────────────────────────────────
  if (path === '/api/manager/receipts' && method === 'GET') {
    const header = [['id', 'text'], ['expense_date', 'text'], ['category', 'text'], ['amount', 'text'], ['description', 'text'], ['vendor_name', 'text']];
    const rows = db.receipts.map((r) => [r.id, r.expense_date, r.category, r.amount, r.description, r.vendor_name]);
    return jsonResponse([header, ...rows]);
  }

  // ── Receipt detail ────────────────────────────────────────────────────────
  const receiptDetailMatch = matchPath('/api/manager/receipt/:receiptId', path);
  if (receiptDetailMatch && method === 'GET') {
    const receipt = db.receipts.find((r) => String(r.id) === String(receiptDetailMatch.receiptId));
    if (!receipt) return jsonResponse({ error: 'Receipt not found' }, 404);
    return jsonResponse(receipt);
  }

  // ── Sales tax report ──────────────────────────────────────────────────────
  if (path.startsWith('/api/manager/sales-tax-report') && method === 'GET') {
    const params = new URLSearchParams(path.split('?')[1] || '');
    const year = parseInt(params.get('year') || new Date().getFullYear(), 10);
    const quarter = parseInt(params.get('quarter') || 1, 10);
    const startMonth = (quarter - 1) * 3;
    const paidInvoices = db.invoices.filter((inv) => {
      if (inv[11] !== 'paid' || !inv[6]) return false;
      const d = new Date(inv[6]);
      return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter - 1;
    });
    const yearPaid = db.invoices.filter((inv) => {
      if (inv[11] !== 'paid' || !inv[6]) return false;
      return new Date(inv[6]).getFullYear() === year;
    });
    const qExpenses = db.receipts.filter((r) => {
      if (!r.expense_date) return false;
      const d = new Date(r.expense_date);
      return d.getFullYear() === year && Math.floor(d.getMonth() / 3) === quarter - 1;
    });
    const yearExpenses = db.receipts.filter((r) => r.expense_date && new Date(r.expense_date).getFullYear() === year);
    const workerComp = db.contractor_payments.reduce((s, p) => s + parseFloat(p[5] || 0), 0);
    const taxable = paidInvoices.reduce((s, inv) => s + parseFloat(inv[7] || 0), 0);
    const tax = paidInvoices.reduce((s, inv) => s + parseFloat(inv[8] || 0), 0);
    const totalPaid = paidInvoices.reduce((s, inv) => s + parseFloat(inv[7] || 0) + parseFloat(inv[8] || 0) + parseFloat(inv[10] || 0), 0);
    const expenseTotal = qExpenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

    return jsonResponse({
      year,
      quarter,
      summary: {
        invoiceCount: paidInvoices.length,
        taxableSales: taxable.toFixed(2),
        salesTaxCollected: tax.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        expenseCount: qExpenses.length,
        expenses: expenseTotal.toFixed(2),
        netCash: (totalPaid - expenseTotal).toFixed(2),
      },
      yearlySummary: {
        expenseCount: yearExpenses.length,
        expenses: yearExpenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0).toFixed(2),
        workerCompensation: workerComp.toFixed(2),
      },
      yearlyRevenueSummary: {
        invoiceCount: yearPaid.length,
        taxableSales: yearPaid.reduce((s, inv) => s + parseFloat(inv[7] || 0), 0).toFixed(2),
        salesTaxCollected: yearPaid.reduce((s, inv) => s + parseFloat(inv[8] || 0), 0).toFixed(2),
        totalPaid: yearPaid.reduce((s, inv) => s + parseFloat(inv[7] || 0) + parseFloat(inv[8] || 0) + parseFloat(inv[10] || 0), 0).toFixed(2),
      },
      locations: db.locations.map((l) => ({ code: l[0], address: l[1], city: l[2], zip: l[3] })),
      paidInvoices: paidInvoices.map((inv) => {
        const client = db.clients.find((c) => c[0] === inv[1]);
        return { id: inv[0], invoiceNumber: inv[2], clientName: client ? `${client[1]} ${client[2]}`.trim() : '', subtotal: inv[7], salesTax: inv[8], total: inv[9], paymentDate: inv[6] };
      }),
      expensesByCategory: Object.entries(qExpenses.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + parseFloat(r.amount || 0); return acc; }, {})).map(([category, total]) => ({ category, total: total.toFixed(2) })),
      yearlyExpensesByCategory: Object.entries(yearExpenses.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + parseFloat(r.amount || 0); return acc; }, {})).map(([category, total]) => ({ category, total: total.toFixed(2) })),
      availableLocationCodes: [...new Set(db.locations.map((l) => String(l[0])))],
    });
  }

  // ── Email all clients ─────────────────────────────────────────────────────
  if (path === '/api/manager/email-all-clients' && method === 'POST') {
    const clientsWithEmail = db.clients.filter((c) => c[3] && !c[8]);
    return jsonResponse({ sent: clientsWithEmail.length, skipped: 0, message: `Demo: would send to ${clientsWithEmail.length} client(s).` });
  }

  // ── Generic table GET ─────────────────────────────────────────────────────
  // Catches /api/manager/:tableName for Table.js
  const genericTableMatch = matchPath('/api/manager/:table', path);
  if (genericTableMatch && method === 'GET') {
    const { table } = genericTableMatch;
    const rows = db[table];
    if (!rows) return jsonResponse({ error: `Table '${table}' not found` }, 404);
    if (rows.length === 0) return jsonResponse([[]]);
    if (Array.isArray(rows[0])) {
      // array-of-arrays format already — prefix a header row
      const colCount = rows[0].length;
      const header = Array.from({ length: colCount }, (_, i) => [`col_${i}`, 'text']);
      return jsonResponse([header, ...rows]);
    }
    // array of objects
    const columns = Object.keys(rows[0]);
    return jsonResponse(tableFormat(columns, rows));
  }

  // ── Generic table UPDATE ──────────────────────────────────────────────────
  const updateMatch = matchPath('/api/manager/update/:table', path);
  if (updateMatch && method === 'POST') {
    const { table } = updateMatch;
    const body = JSON.parse(options.body || '{}');
    const selectedItem = body.selectedItem ?? body;
    const rows = db[table];
    if (!rows) return jsonResponse({ error: `Table '${table}' not found` }, 404);

    const keys = Object.keys(selectedItem);
    const namedKeys = keys.some((k) => isNaN(Number(k)));

    if (namedKeys) {
      // Object-keyed row (ReceiptDetails, WorkerPayPage, etc.)
      const id = selectedItem.id ?? selectedItem.receipt_id;
      const idx = rows.findIndex((r) => String(r.id ?? r[0]) === String(id));
      if (idx !== -1) {
        db[table][idx] = typeof rows[idx] === 'object' && !Array.isArray(rows[idx])
          ? { ...rows[idx], ...selectedItem }
          : rows[idx];
      } else {
        const newId = db.nextIds[table] ? db.nextIds[table]++ : (Math.max(0, ...rows.map(r => r.id || r[0])) + 1);
        db[table].push({ id: newId, ...selectedItem });
      }
    } else {
      // Numeric-keyed row (Table.js, Invoices.js)
      const id = selectedItem[0];
      const idx = rows.findIndex((r) => String(Array.isArray(r) ? r[0] : r.id) === String(id));
      if (idx !== -1) {
        if (Array.isArray(rows[idx])) {
          db[table][idx] = Object.values(selectedItem);
        }
      } else {
        // New row
        const newId = db.nextIds[table] ? db.nextIds[table]++ : (Math.max(0, ...rows.map(r => r[0])) + 1);
        const row = Object.values(selectedItem);
        row[0] = newId;
        db[table].push(row);
      }
    }
    return jsonResponse('true');
  }

  return null; // not matched
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
      return jsonResponse({ error: String(err.message || err) }, 500);
    }
    console.warn('[mockApi] unmatched route:', options?.method || 'GET', url);
    return jsonResponse({ error: 'Mock route not found: ' + url }, 404);
  };
}
