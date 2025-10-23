"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconComponent = (props: { size?: number; color?: string }) => JSX.Element;

const DashboardIcon: IconComponent = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M4 9h7V4H4v5Zm9 0h7V4h-7v5Zm0 11h7v-9h-7v9Zm-9 0h7v-5H4v5Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ClientsIcon: IconComponent = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx={9} cy={7} r={4} stroke={color} strokeWidth={1.8} />
    <path
      d="M21 21v-2a4 4 0 0 0-3-3.87M16.5 3.34A4 4 0 0 1 18 7a4 4 0 0 1-1.5 3.13"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </svg>
);

const AddClientIcon: IconComponent = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 5v14M5 12h14"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MailPlusIcon: IconComponent = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m4 7 8 5 8-5M12 10v6M9 13h6"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlanIcon: IconComponent = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 4h14M5 20h14M5 4l2 16M19 4l-2 16M8 12h8"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ProfileIcon: IconComponent = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={7} r={4} stroke={color} strokeWidth={1.8} />
    <path
      d="M4 20.5a6.5 6.5 0 0 1 16 0"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </svg>
);

type NavLink = {
  href: string;
  label: string;
  icon: IconComponent;
  match: (pathname: string) => boolean;
};

const links: NavLink[] = [
  {
    href: "/dashboard",
    label: "Kontrol Paneli",
    icon: DashboardIcon,
    match: (pathname) => pathname === "/dashboard"
  },
  {
    href: "/clients",
    label: "Müşteriler",
    icon: ClientsIcon,
    match: (pathname) =>
      pathname === "/clients" ||
      (pathname.startsWith("/clients/") && !pathname.startsWith("/clients/new"))
  },
  {
    href: "/clients/new",
    label: "Müşteri Ekle",
    icon: AddClientIcon,
    match: (pathname) => pathname === "/clients/new"
  },
  {
    href: "/communications/new",
    label: "İletişim Ekle",
    icon: MailPlusIcon,
    match: (pathname) => pathname === "/communications/new"
  },
  {
    href: "/communications",
    label: "İletişim Planı",
    icon: PlanIcon,
    match: (pathname) =>
      pathname === "/communications" ||
      pathname.startsWith("/communications/") && !pathname.startsWith("/communications/new")
  },
  {
    href: "/communications/campaigns",
    label: "Kampanyalar",
    icon: MailPlusIcon,
    match: (pathname) => pathname.startsWith("/communications/campaigns")
  },
  {
    href: "/profile",
    label: "Profilim",
    icon: ProfileIcon,
    match: (pathname) => pathname === "/profile"
  }
];

interface SidebarNavProps {
  expanded: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ expanded, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        paddingRight: expanded ? "0.5rem" : 0
      }}
      aria-label="Uygulama menüsü"
    >
      {links.map((link) => {
        const isActive = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            onClick={onNavigate}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: expanded ? "flex-start" : "center",
              gap: expanded ? "0.85rem" : "0",
              padding: expanded ? "0.75rem 0.9rem" : "0.65rem",
              borderRadius: "0.75rem",
              fontWeight: 600,
              fontSize: expanded ? "0.95rem" : "0.8rem",
              color: "#f8fafc",
              textDecoration: "none",
              transition: "background-color 0.2s ease, color 0.2s ease, gap 0.2s ease",
              backgroundColor: isActive ? "rgba(248, 250, 252, 0.16)" : "transparent",
              borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
              marginLeft: expanded ? "-1rem" : "0",
              paddingLeft: expanded ? "calc(0.9rem - 3px)" : undefined,
              minHeight: "48px"
            }}
          >
            <link.icon color={isActive ? "#bfdbfe" : "#e2e8f0"} />
            <span
              style={{
                opacity: expanded ? 1 : 0,
                visibility: expanded ? "visible" : "hidden",
                transition: "opacity 0.18s ease, transform 0.18s ease",
                transform: expanded ? "translateX(0)" : "translateX(-8px)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                width: expanded ? "auto" : 0,
                display: "inline-block"
              }}
            >
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
