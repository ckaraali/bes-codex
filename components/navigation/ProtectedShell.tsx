"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/navigation/Sidebar";

interface ProtectedShellProps {
  userName?: string | null;
  children: ReactNode;
}

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Kontrol Paneli",
  "/clients": "Müşteriler",
  "/clients/new": "Yeni Müşteri",
  "/clients/[id]": "Müşteri Detayı",
  "/communications": "İletişim Planı",
  "/communications/new": "İletişim Oluştur",
  "/communications/campaigns": "Kampanyalar",
  "/profile": "Profilim"
};

function resolveLabel(href: string) {
  if (ROUTE_LABELS[href]) {
    return ROUTE_LABELS[href];
  }

  if (href.startsWith("/clients/") && href !== "/clients/new") {
    return ROUTE_LABELS["/clients/[id]"];
  }

  if (href.startsWith("/communications/campaigns")) {
    return ROUTE_LABELS["/communications/campaigns"];
  }

  if (href.startsWith("/communications/")) {
    return ROUTE_LABELS["/communications"];
  }

  const segment = href.split("/").filter(Boolean).pop() ?? "";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ProtectedShell({ userName, children }: ProtectedShellProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 960px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return [
        {
          href: "/dashboard",
          label: ROUTE_LABELS["/dashboard"],
          isLast: true
        }
      ];
    }

    return segments.map((_, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const label = resolveLabel(href);
      return {
        href,
        label,
        isLast: index === segments.length - 1
      };
    });
  }, [pathname]);

  return (
    <div className="app-shell">
      <Sidebar
        userName={userName}
        mobileOpen={isMobile ? mobileMenuOpen : true}
        onMobileClose={() => setMobileMenuOpen(false)}
        isMobile={isMobile}
      />
      {isMobile && mobileMenuOpen && (
        <button
          type="button"
          className="app-shell__backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Menüyü kapat"
        />
      )}
      <div className="app-shell__content">
        <header className="app-shell__topbar">
          {isMobile && (
            <button
              type="button"
              className="topbar__menu"
              aria-controls="app-sidebar"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              ☰
            </button>
          )}
          <nav aria-label="Sayfa konumu" className="topbar__breadcrumbs">
            <ol>
              {crumbs.map((crumb) => (
                <li key={crumb.href} aria-current={crumb.isLast ? "page" : undefined}>
                  {crumb.isLast ? (
                    <span>{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <Link href="mailto:support@bes-codex.app" className="topbar__help">
            Yardım
          </Link>
        </header>
        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}
