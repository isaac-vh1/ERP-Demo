import React from 'react';
import "./Components.css";
import HamburgerMenu from "./HamburgerMenu"; // Adjust the path to your HamburgerMenu component file
import { Helmet } from 'react-helmet';

export default function HeaderBar({ page, toggleSidebar, collapsed }) {
  return (
    <div className="header-bar">
      <Helmet>
        <title>{page}</title>
      </Helmet>
      <div className="menu-toggle" onClick={toggleSidebar}>
        <HamburgerMenu collapsed={collapsed} />
      </div>
    </div>
  );
}
