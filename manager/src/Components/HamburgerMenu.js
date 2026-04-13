import React from 'react';
import "./Components.css"

export default function HamburgerMenu ({collapsed}) {
    return (
        <div>
        <svg className={`hamburger-menu ${collapsed ? '': 'o0iVae'}`} width="24"
        height="24"
        viewBox="-9 -9 18 18">
            <path className="hlJH0" d="M-9 -5 L9 -5" fill="none" strokeWidth="2" stroke='white'></path>
            <path className="HBu6N" d="M-9 0 L9 0" fill="none" strokeWidth="2" stroke='white'></path>
            <path className="cLAGQe" d="M-9 5 L9 5" fill="none" strokeWidth="2" stroke='white'></path>
        </svg>
        </div>
    )
}
