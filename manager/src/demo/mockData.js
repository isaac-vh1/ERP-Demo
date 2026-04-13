// In-memory database — resets completely on every page reload.

const now = new Date();
const daysAgo = (n) => new Date(now - n * 86400000).toISOString().slice(0, 10);
const daysFromNow = (n) => new Date(+now + n * 86400000).toISOString().slice(0, 10);
const isoAgo = (n) => new Date(now - n * 86400000).toUTCString();
const isoFromNow = (n) => new Date(+now + n * 86400000).toUTCString();

export const db = {
  nextIds: {
    clients: 6,
    locations: 6,
    invoices: 13,
    invoice_items: 34,
    calendar: 9,
    job_requests: 6,
    contractors: 4,
    contractor_payments: 8,
    receipts: 6,
  },

  // [id, firstName, lastName, email, phone, address, city, zip, businessAccount, locationId]
  clients: [
    [1, 'Alice',   'Martin',   'alice@example.com',   '555-111-0001', '42 Maple Ave',   'Anytown',  '98001', false, 1],
    [2, 'Bob',     'Chen',     'bob@example.com',     '555-111-0002', '17 Oak Blvd',    'Anytown',  '98002', false, 2],
    [3, 'Carol',   'Rivera',   'carol@example.com',   '555-111-0003', '8 Pine Ct',      'Westside', '98003', false, 3],
    [4, 'David',   'Kim',      'david@example.com',   '555-111-0004', '99 Birch Ln',    'Eastville','98004', false, 4],
    [5, 'Eve',     'Torres',   'eve@example.com',     '555-111-0005', '3 Cedar St',     'Northend', '98005', false, 5],
  ],

  // [id, address, city, zip]
  locations: [
    [1, '42 Maple Ave',   'Anytown',   '98001'],
    [2, '17 Oak Blvd',    'Anytown',   '98002'],
    [3, '8 Pine Ct',      'Westside',  '98003'],
    [4, '99 Birch Ln',    'Eastville', '98004'],
    [5, '3 Cedar St',     'Northend',  '98005'],
  ],

  // [id, clientId, invoiceNum, locationId, issueDate, dueDate, paymentDate, subtotal, salesTax, balanceDue, tips, status, createdAt, updatedAt]
  invoices: [
    [1,  1, 'INV-001', 1, isoAgo(60),  isoAgo(30),  isoAgo(25), '450.00', '40.50', '0.00',   '0.00',  'paid',    isoAgo(60),  isoAgo(25)],
    [2,  2, 'INV-002', 2, isoAgo(50),  isoAgo(20),  null,        '320.00', '28.80', '348.80', '0.00',  'pending', isoAgo(50),  isoAgo(50)],
    [3,  3, 'INV-003', 3, isoAgo(45),  isoAgo(15),  isoAgo(10), '780.00', '70.20', '0.00',   '20.00', 'paid',    isoAgo(45),  isoAgo(10)],
    [4,  4, 'INV-004', 4, isoAgo(40),  isoAgo(10),  null,        '250.00', '22.50', '272.50', '0.00',  'pending', isoAgo(40),  isoAgo(40)],
    [5,  5, 'INV-005', 5, isoAgo(35),  isoAgo(5),   isoAgo(2),  '920.00', '82.80', '0.00',   '50.00', 'paid',    isoAgo(35),  isoAgo(2)],
    [6,  1, 'INV-006', 1, isoAgo(30),  isoFromNow(0), null,      '150.00', '13.50', '163.50', '0.00',  'pending', isoAgo(30),  isoAgo(30)],
    [7,  2, 'INV-007', 2, isoAgo(20),  isoFromNow(10), null,     '600.00', '54.00', '654.00', '0.00',  'pending', isoAgo(20),  isoAgo(20)],
    [8,  3, 'INV-008', 3, isoAgo(15),  isoFromNow(15), isoAgo(5),'380.00', '34.20', '0.00',  '0.00',  'paid',    isoAgo(15),  isoAgo(5)],
    [9,  4, 'INV-009', 4, isoAgo(10),  isoFromNow(20), null,     '210.00', '18.90', '228.90', '0.00',  'pending', isoAgo(10),  isoAgo(10)],
    [10, 5, 'INV-010', 5, isoAgo(5),   isoFromNow(25), null,     '1100.00','99.00','1199.00', '0.00',  'pending', isoAgo(5),   isoAgo(5)],
    [11, 1, 'INV-011', 1, isoAgo(3),   isoFromNow(27), null,     '480.00', '43.20', '523.20', '0.00',  'draft',   isoAgo(3),   isoAgo(3)],
    [12, 2, 'INV-012', 2, isoAgo(1),   isoFromNow(29), null,     '330.00', '29.70', '359.70', '0.00',  'draft',   isoAgo(1),   isoAgo(1)],
  ],

  // [id, invoiceId, description, price]
  invoice_items: [
    [1,  1, 'Lawn mowing',          '200.00'],
    [2,  1, 'Hedge trimming',       '150.00'],
    [3,  1, 'Debris removal',       '100.00'],
    [4,  2, 'Spring cleanup',       '320.00'],
    [5,  3, 'Full yard service',    '500.00'],
    [6,  3, 'Fertilization',        '180.00'],
    [7,  3, 'Edging',               '100.00'],
    [8,  4, 'Lawn mowing',          '250.00'],
    [9,  5, 'Landscaping design',   '600.00'],
    [10, 5, 'Planting',             '200.00'],
    [11, 5, 'Mulching',             '120.00'],
    [12, 6, 'Lawn mowing',          '150.00'],
    [13, 7, 'Full yard service',    '450.00'],
    [14, 7, 'Aeration',             '150.00'],
    [15, 8, 'Cleanup',              '280.00'],
    [16, 8, 'Weed control',         '100.00'],
    [17, 9, 'Lawn mowing',          '210.00'],
    [18, 10,'Major landscaping',    '800.00'],
    [19, 10,'Tree trimming',        '300.00'],
    [20, 11,'Lawn mowing',          '200.00'],
    [21, 11,'Hedge trimming',       '180.00'],
    [22, 11,'Debris removal',       '100.00'],
    [23, 12,'Spring cleanup',       '330.00'],
  ],

  // calendar events: { id, title, description, start, end, calendar, client_id, job_request_id }
  calendar: [
    { id: 1, title: 'Mow Alice yard',     description: 'Weekly mow',     start: isoFromNow(2)  + 'T09:00:00', end: isoFromNow(2)  + 'T10:00:00', calendar: 'scheduledEvents',   client_id: 1, job_request_id: null },
    { id: 2, title: 'Bob cleanup',        description: 'Spring cleanup', start: isoFromNow(4)  + 'T13:00:00', end: isoFromNow(4)  + 'T15:00:00', calendar: 'scheduledEvents',   client_id: 2, job_request_id: null },
    { id: 3, title: 'Carol full service', description: 'All services',   start: isoFromNow(7)  + 'T08:00:00', end: isoFromNow(7)  + 'T12:00:00', calendar: 'scheduledEvents',   client_id: 3, job_request_id: null },
    { id: 4, title: 'David lawn mow',     description: '',               start: isoFromNow(10) + 'T10:00:00', end: isoFromNow(10) + 'T11:00:00', calendar: 'scheduledEvents',   client_id: 4, job_request_id: null },
    { id: 5, title: 'Eve landscaping',    description: 'New install',    start: isoFromNow(14) + 'T09:00:00', end: isoFromNow(14) + 'T13:00:00', calendar: 'scheduledEvents',   client_id: 5, job_request_id: null },
    { id: 6, title: 'Estimate – Alice',   description: 'Walk-through',   start: null, end: null, calendar: 'unscheduledEvents', client_id: 1, job_request_id: 2 },
    { id: 7, title: 'Aeration job',       description: 'Fall aeration',  start: null, end: null, calendar: 'unscheduledEvents', client_id: 3, job_request_id: null },
    { id: 8, title: 'Worker A shift',     description: '',               start: isoFromNow(2)  + 'T09:00:00', end: isoFromNow(2)  + 'T10:00:00', calendar: 'workerSchedule',    client_id: null, job_request_id: null },
  ],

  // job requests
  job_requests: [
    { id: 1, clientId: '1', clientName: 'Alice Martin',  title: 'Regular mowing',    details: 'Weekly front and back', priority: 'normal', preferredWindow: 'Mornings',    serviceAddress: '42 Maple Ave',   status: 'scheduled',  createdAt: isoAgo(30), updatedAt: isoAgo(10) },
    { id: 2, clientId: '1', clientName: 'Alice Martin',  title: 'Estimate request',  details: 'Walk-through needed',  priority: 'high',   preferredWindow: 'Anytime',     serviceAddress: '42 Maple Ave',   status: 'pending',    createdAt: isoAgo(10), updatedAt: isoAgo(10) },
    { id: 3, clientId: '2', clientName: 'Bob Chen',      title: 'Spring cleanup',    details: 'Full yard',            priority: 'normal', preferredWindow: 'Afternoons',  serviceAddress: '17 Oak Blvd',    status: 'completed',  createdAt: isoAgo(50), updatedAt: isoAgo(20) },
    { id: 4, clientId: '3', clientName: 'Carol Rivera',  title: 'Hedge trim',        details: 'Front hedge only',     priority: 'low',    preferredWindow: 'Flexible',    serviceAddress: '8 Pine Ct',      status: 'approved',   createdAt: isoAgo(15), updatedAt: isoAgo(5)  },
    { id: 5, clientId: '4', clientName: 'David Kim',     title: 'Weed control',      details: 'Backyard weeds',       priority: 'high',   preferredWindow: 'Weekends',    serviceAddress: '99 Birch Ln',    status: 'draft',      createdAt: isoAgo(3),  updatedAt: isoAgo(3)  },
  ],

  // contractors: [id, name, first_name, last_name]
  contractors: [
    [1, 'Jordan B.', 'Jordan', 'Brown'],
    [2, 'Morgan L.', 'Morgan', 'Lee'  ],
    [3, 'Casey R.', 'Casey',  'Reed'  ],
  ],

  // contractor_payments: [id, contractor_id, job_name, work_date, hours, amount_paid, notes]
  contractor_payments: [
    [1, 1, 'Lawn mowing – Alice', daysAgo(60), '3',   '120.00', ''],
    [2, 2, 'Cleanup – Bob',       daysAgo(50), '5',   '200.00', ''],
    [3, 1, 'Full service – Carol',daysAgo(45), '7',   '280.00', 'Includes overtime'],
    [4, 3, 'Mowing – David',      daysAgo(40), '2.5', '100.00', ''],
    [5, 2, 'Landscaping – Eve',   daysAgo(35), '8',   '320.00', ''],
    [6, 1, 'Mowing – Alice',      daysAgo(15), '3',   '120.00', ''],
    [7, 3, 'Cleanup – Carol',     daysAgo(10), '4',   '160.00', ''],
  ],

  // receipts: { id, expense_date, category, amount, description, vendor_name }
  receipts: [
    { id: 1, expense_date: daysAgo(60), category: 'Fuel',                    amount: '52.40',  description: 'Fill-up for truck',         vendor_name: 'Demo Gas Station' },
    { id: 2, expense_date: daysAgo(45), category: 'Materials and Supplies',  amount: '134.75', description: 'Mulch and edging supplies',  vendor_name: 'Demo Hardware' },
    { id: 3, expense_date: daysAgo(30), category: 'Equipment and Tools',     amount: '89.99',  description: 'Replacement blade',          vendor_name: 'Demo Tool Supply' },
    { id: 4, expense_date: daysAgo(20), category: 'Fuel',                    amount: '48.20',  description: 'Fuel for crew truck',        vendor_name: 'Demo Gas Station' },
    { id: 5, expense_date: daysAgo(7),  category: 'Dump Waste',              amount: '75.00',  description: 'Yard waste disposal',        vendor_name: 'Demo Transfer Station' },
  ],
};
