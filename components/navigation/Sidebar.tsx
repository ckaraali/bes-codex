"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { SignOutButton } from "@/components/navigation/SignOutButton";

interface SidebarProps {
  userName?: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ userName, mobileOpen = true, onMobileClose, isMobile = false }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoverEnabled, setHoverEnabled] = useState(true);

  const brandInitials = "EC";

  const userInitials = useMemo(() => {
    if (!userName) {
      return "EC";
    }
    const parts = userName.split(" ").filter(Boolean);
    if (parts.length === 0) {
      return "EC";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [userName]);

  const collapseTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isMobile) {
      setExpanded(true);
      setHoverEnabled(false);
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
      }
    } else {
      setHoverEnabled(true);
      setExpanded(false);
    }
  }, [isMobile]);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }
    };
  }, []);

  const handleEnter = () => {
    if (!hoverEnabled) return;
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    setExpanded(true);
  };

  const handleLeave = () => {
    if (!hoverEnabled) return;
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
    }
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
      collapseTimer.current = null;
    }, 200);
  };

  const effectiveExpanded = isMobile ? true : expanded;
  const sidebarWidth = isMobile ? "min(320px, 85vw)" : effectiveExpanded ? "220px" : "90px";
  const sidebarPadding = isMobile ? "1.35rem" : effectiveExpanded ? "1.35rem" : "1.35rem 0.75rem";

  return (
    <aside
      id="app-sidebar"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        width: sidebarWidth,
        backgroundColor: "var(--color-primary-dark)",
        color: "#f8fafc",
        padding: sidebarPadding,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        transition: isMobile ? "transform 0.24s ease" : "width 0.22s ease, padding 0.22s ease",
        boxShadow: effectiveExpanded ? "6px 0 20px rgba(15, 23, 42, 0.25)" : "none",
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: isMobile ? 80 : 50,
        overflow: "hidden",
        transform: isMobile ? `translateX(${mobileOpen ? "0" : "-110%"})` : "translateX(0)",
        borderRight: isMobile ? "none" : "1px solid rgba(255, 255, 255, 0.06)"
      }}
      aria-hidden={isMobile ? !mobileOpen : false}
    >
      {isMobile && (
        <button
          type="button"
          onClick={onMobileClose}
          className="sidebar-close"
          aria-label="Menüyü kapat"
        >
          ×
        </button>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: effectiveExpanded ? "0.75rem" : "0.55rem",
          marginTop: "0.25rem"
        }}
      >
        <div
          style={{
            width: effectiveExpanded ? "44px" : "34px",
            height: effectiveExpanded ? "44px" : "34px",
            borderRadius: "12px",
            background: "rgba(67, 97, 238, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f8fafc",
            fontWeight: 700,
            fontSize: effectiveExpanded ? "1.15rem" : "1rem",
            letterSpacing: "0.05em",
            transition: "all 0.22s ease"
          }}
        >
          {brandInitials}
        </div>
        {effectiveExpanded && (
          <div style={{ textAlign: "center", color: "rgba(226, 232, 240, 0.85)" }}>
            <h1 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Emeklilik CRM</h1>
            <p style={{ marginTop: "0.2rem", fontSize: "0.78rem" }}>Danışman paneli</p>
          </div>
        )}
      </div>

      <SidebarNav expanded={effectiveExpanded} onNavigate={isMobile ? onMobileClose : undefined} />

      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.9rem",
          alignItems: expanded ? "stretch" : "center"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: effectiveExpanded ? "flex-start" : "center",
            gap: effectiveExpanded ? "0.6rem" : 0,
            padding: effectiveExpanded ? "0 0.35rem" : 0
          }}
        >
          <div
            style={{
              width: effectiveExpanded ? "42px" : "36px",
              height: effectiveExpanded ? "42px" : "36px",
              borderRadius: "14px",
              background: "rgba(22, 58, 117, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f8fafc",
              fontWeight: 700,
              fontSize: effectiveExpanded ? "1.1rem" : "1rem"
            }}
          >
            {userInitials}
          </div>
          {effectiveExpanded && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <strong style={{ fontSize: "0.95rem", color: "#f8fafc" }}>{userName ?? "Danışman"}</strong>
              <span style={{ fontSize: "0.8rem", color: "rgba(226, 232, 240, 0.75)" }}>Profilinizi görüntüleyin</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SignOutButton condensed={!effectiveExpanded} />
        </div>
      </div>
    </aside>
  );
}
