"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "../brand-logo";
const links = [
  ["/how-it-works", "How it works"],
  ["/rates", "Rates"],
  ["/business", "For business"],
  ["/help", "Help"],
] as const;
export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);
  return (
    <header className="m-header">
      <div className="m-container m-header-inner">
        <BrandLogo />
        <nav aria-label="Main navigation" className="m-desktop-nav">
          {links.map(([href, label]) => (
            <Link
              aria-current={path === href ? "page" : undefined}
              key={href}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="m-header-actions">
          <Link className="m-signin" href="/login">
            Sign in
          </Link>
          <Link className="m-button m-button-small" href="/register">
            Get started <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <button
          ref={trigger}
          className="m-menu-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
          <span aria-hidden="true">{open ? "×" : "+"}</span>
        </button>
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="m-mobile-nav"
          hidden={!open}
        >
          {[
            ...links,
            ["/tracking", "Track your package"],
            ["/login", "Sign in"],
            ["/register", "Get started"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
