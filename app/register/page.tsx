"use client";
import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "../../components/brand-logo";
export default function Register() {
  const [success, setSuccess] = useState(false);
  return (
    <>
      <header className="nav">
        <div className="wrap">
          <BrandLogo />
          <Link href="/dashboard">Dashboard preview</Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="form">
        <div className="tag">Get started</div>
        <h1 className="page-title">Preview your registration.</h1>
        <div className="alert">
          Preview only: this form does not save your information or register an
          account.
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSuccess(true);
          }}
        >
          <label className="field">
            Full name
            <input required placeholder="Your full name" />
          </label>
          <label className="field">
            Email
            <input type="email" required placeholder="name@example.com" />
          </label>
          <label className="field">
            Phone
            <input type="tel" required placeholder="876 ..." />
          </label>
          <label className="field">
            Shipping type
            <select>
              <option>Personal</option>
              <option>Business / reseller</option>
            </select>
          </label>
          <button className="btn" type="submit">
            Preview registration →
          </button>
        </form>
        {success && (
          <p role="status" className="alert">
            Demo validation completed. No account was created.{" "}
            <Link href="/dashboard">See the customer dashboard →</Link>
          </p>
        )}
      </main>
    </>
  );
}
