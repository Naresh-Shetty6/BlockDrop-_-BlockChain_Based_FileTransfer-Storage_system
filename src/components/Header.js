import React from 'react';
import { Upload, Shield, Link } from 'lucide-react';

function Header() {
  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <Upload className="logo-icon" />
          <h2>BlockDrop</h2>
        </div>
        
        <nav className="nav">
          <div className="nav-item">
            <Shield size={20} />
            <span>Secure</span>
          </div>
          <div className="nav-item">
            <Link size={20} />
            <span>Decentralized</span>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;
