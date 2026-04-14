import './App.css';
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { signOut, auth } from './firebase';
import { AuthProvider, useAuth } from "./AuthContext.js";
import InvoicePage from "./InvoicePage/InvoicePage.js";
import Login from './Login/Login.js';
import ProtectedRoute from "./ProtectedRoute.js";
import CreateAccount from './CreateAccount/CreateAccount.js';
import VerifyEmail from './CreateAccount/VerifyEmail.js';
import ClientDashboard from './ClientDashboard/ClientDashboard.js';
import ClientInfo from './ClientDashboard/ClientInfo.js';
import EndOfYearSurvey from './Forms/endOfYearSurvey.js';
import { navItems } from './ClientDashboard/clientDashboardShared';
const demoLogo = '/Demo_logo.png';

function extractClientName(user) {
  if (user?.displayName?.trim()) {
    return user.displayName.trim();
  }

  const emailName = user?.email?.split('@')[0]?.trim();
  if (!emailName) return 'Client';

  return emailName
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildGreeting(name) {
  const hour = new Date().getHours();
  const sharedGreetings = [
    `Hello, ${name}`,
    `Welcome, ${name}`,
    `Hey, ${name}`,
    `Howdy, ${name}`,
  ];

  if (hour >= 5 && hour < 12) {
    sharedGreetings.push(`Good morning, ${name}`);
  } else if (hour >= 12 && hour < 17) {
    sharedGreetings.push(`Good afternoon, ${name}`);
  } else {
    sharedGreetings.push(`Good evening, ${name}`);
  }

  return sharedGreetings[Math.floor(Math.random() * sharedGreetings.length)];
}

function ClientNav() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState(() => buildGreeting(extractClientName(user)));
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setGreeting(buildGreeting(extractClientName(user)));
  }, [user]);

  return (
    <nav className={`app-client-nav${menuOpen ? ' menu-open' : ''}`} aria-label="Client portal sections">
      <div className="app-client-nav-inner">
        <div className="app-client-nav-brand">
          <img src={demoLogo} alt="Demo logo" className="app-client-nav-logo" />
          <p className="app-client-nav-greeting">{greeting}</p>
        </div>
        <button
          className="app-client-nav-hamburger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
        <div className="app-client-nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `app-client-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <button
            className="app-client-nav-link"
            onClick={() => { setMenuOpen(false); signOut(auth); window.location.href = '../'; }}
            style={{ cursor: 'pointer', fontWeight: 700 }}
          >
            Log Out
          </button>
        </div>
      </div>
    </nav>
  );
}

function PublicLayout({ children }) {
  return (
    <>
      <nav className="App-header" />
      <main>{children}</main>
    </>
  );
}

function AuthLayout({ children, showClientNav = false }) {
  return (
    <AuthProvider>
      <header className="App-header" />
      {showClientNav ? <ClientNav /> : null}
      <main>{children}</main>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <div className="App">
      <Routes>
        {/* Public branch */}
        <Route
          path="/end-of-year-survey"
          element={
            <PublicLayout>
              <EndOfYearSurvey />
            </PublicLayout>
          }
        />

        {/* Auth branch */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          }
        />
        <Route
          path="/create-account"
          element={
            <AuthLayout>
              <CreateAccount />
            </AuthLayout>
          }
        />
        <Route
          path="/verify"
          element={
            <AuthLayout>
              <ProtectedRoute >
                <VerifyEmail />
              </ProtectedRoute>
            </AuthLayout>
          }
        />
        <Route
          path="/invoice"
          element={
            <AuthLayout showClientNav>
              <ProtectedRoute >
                <InvoicePage />
              </ProtectedRoute>
            </AuthLayout>
          }
        />
        <Route
          path="/"
          element={
            <AuthLayout showClientNav>
              <ProtectedRoute >
                <ClientDashboard section="overview" />
              </ProtectedRoute>
            </AuthLayout>
          }
        />
        <Route
          path="/client-requests"
          element={
            <AuthLayout showClientNav>
              <ProtectedRoute >
                <ClientDashboard section="requests" />
              </ProtectedRoute>
            </AuthLayout>
          }
        />
        <Route
          path="/client-schedule"
          element={
            <AuthLayout showClientNav>
              <ProtectedRoute >
                <ClientDashboard section="schedule" />
              </ProtectedRoute>
            </AuthLayout>
          }
        />
        <Route
          path="/client-invoices"
          element={
            <AuthLayout showClientNav>
              <ProtectedRoute >
                <ClientDashboard section="invoices" />
              </ProtectedRoute>
            </AuthLayout>
          }
        />
        <Route
          path="/client-info"
          element={
            <AuthLayout>
              <ProtectedRoute >
                <ClientInfo />
              </ProtectedRoute>
            </AuthLayout>
          }
        />

        {/* Global fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
