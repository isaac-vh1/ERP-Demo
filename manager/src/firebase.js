// Demo mock — replaces real Firebase. No external dependencies or credentials needed.

const DEMO_USER = {
  uid: 'demo-uid-001',
  email: 'demo@example.com',
  displayName: 'Demo Manager',
  getIdToken: () => Promise.resolve('demo-mock-token'),
};

let _currentUser = DEMO_USER; // auto-logged-in, no sign-in required
const _listeners = new Set();

function _notify() {
  _listeners.forEach((cb) => cb(_currentUser));
}

export const auth = {
  get currentUser() {
    return _currentUser;
  },
};

export function onAuthStateChanged(_authObj, callback) {
  _listeners.add(callback);
  Promise.resolve().then(() => callback(_currentUser));
  return () => _listeners.delete(callback);
}

export function signInWithEmailAndPassword(_authObj, email, password) {
  if (!email || !password) {
    return Promise.reject(new Error('Email and password are required.'));
  }
  _currentUser = DEMO_USER;
  _notify();
  return Promise.resolve({ user: DEMO_USER });
}

export function signOut(_authObj) {
  _currentUser = null;
  _notify();
  return Promise.resolve();
}
