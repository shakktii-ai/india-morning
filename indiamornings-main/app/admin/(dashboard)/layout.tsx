import Link from "next/link";
import { requireUser } from "@/src/auth/requireUser";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let me: any = null;
  try {
    me = await requireUser();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #e5e7eb", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 800, color: "var(--brand)", textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
          <img 
            src="/images/Indian-Morning-Logo.png" 
            alt="India Mornings" 
            style={{ height: 32, width: "auto", objectFit: "contain" }} 
          />
          <span className="hide-on-mobile">India Morning </span>
        </Link>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {me ? (
            <div style={{ textAlign: "right", lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{me?.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{me.role}</div>
            </div>
          ) : (
            <span style={{ fontSize: 14, color: "#6b7280" }}>Not logged in</span>
          )}
          <form action="/api/auth/logout" method="post">
            <button className="btn" style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 13, padding: "6px 14px" }} type="submit">Logout</button>
          </form>
        </div>
      </header>

      <div className="container" style={{ flex: 1, padding: "24px 16px", maxWidth: 1400, width: "100%" }}>
        {/* Mobile Navigation Bar */}
        <div className="admin-mobile-nav">
          <NavLink href="/admin" label="Dashboard" mobile />
          <NavLink href="/admin/articles" label="Articles" mobile />
          {(me?.role === "ADMIN" || me?.role === "SUPER_ADMIN") && (
            <>
              <NavLink href="/admin/review" label="Review" mobile />
              <NavLink href="/admin/archive" label="Archive" mobile />
            </>
          )}
          <NavLink href="/admin/docs" label="Docs 📖" mobile />
        </div>

        <div className="admin-grid">
          {/* Sidebar Navigation (Hidden on Mobile) */}
          <nav className="admin-sidebar" style={{ padding: "8px", border: "none", boxShadow: "none", background: "transparent" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <NavLink href="/admin" label="Dashboard" />
              <NavLink href="/admin/articles" label="Articles" />
              
              {(me?.role === "ADMIN" || me?.role === "SUPER_ADMIN") && (
                <>
                  <NavLink href="/admin/review" label="Review Queue" />
                  <NavLink href="/admin/archive" label="Archive" />
                  <NavLink href="/admin/users" label="Users" />
                </>
              )}
              
              <NavLink href="/admin/taxonomy" label="Categories & Tags" />

              {(me?.role === "ADMIN" || me?.role === "SUPER_ADMIN") && (
                <>
                  <NavLink href="/admin/api-keys" label="API Keys 🔑" />
                  <NavLink href="/admin/settings" label="System Settings ⚙️" />
                </>
              )}
              
              <NavLink href="/admin/docs" label="Documentation 📖" />
              <div style={{ height: 1, background: "#e5e7eb", margin: "8px 0" }} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 24, padding: "0 12px" }}>
              {me?.role === "JOURNALIST" ? "Journalist access: Create & Edit articles." : "Admin/Super Admin access enabled."}
            </div>
          </nav>

          {/* Main Content Area */}
          <main style={{ minWidth: 0 }}>
            {children}
          </main>
        </div>
      </div>

    </div>
  );
}

function NavLink({ href, label, mobile }: { href: string; label: string, mobile?: boolean }) {
  return (
    <Link href={href} style={{ 
      display: "block", 
      padding: mobile ? "8px 14px" : "10px 16px", 
      borderRadius: 8, 
      color: "#4b5563", 
      fontWeight: 600,
      fontSize: mobile ? 13 : 14,
      transition: "all 0.2s",
      background: mobile ? "white" : "white",
      border: "1px solid #e5e7eb",
      whiteSpace: "nowrap",
      flexShrink: 0
    }} className="admin-nav-link">
      {label}
    </Link>
  );
}
