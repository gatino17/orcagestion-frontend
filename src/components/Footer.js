import React from "react";
import "./Layout.css";

function Footer() {
  return (
    <footer className="app-footer">
      <div>
        &copy; {new Date().getFullYear()} OrcaGest · Plataforma Operativa.{" "}
        <a href="https://orcagest.com" target="_blank" rel="noreferrer">
          www.orcagest.com
        </a>
      </div>
      <small>v1.0 · Integridad y soporte 24/7</small>
    </footer>
  );
}

export default Footer;

