import { requireUser } from "@/src/auth/requireUser";
import { db } from "@/src/lib/firebase-admin";

export default async function AdminHome() {
  const actor = await requireUser();

  // Fetch user data from Firestore
  const userDoc = await db.collection("users").doc(actor.id).get();
  const me = userDoc.exists ? { name: userDoc.data()?.name, email: userDoc.data()?.email, role: userDoc.data()?.role } : null;
  
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: "var(--brand)" }}>Dashboard</h1>
      <p style={{ color: "#6b7280", marginBottom: 32 }}>Welcome back, {me?.name}. Here's what's happening today.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ color: "#6b7280", fontSize: 14, fontWeight: 600, textTransform: "uppercase" }}>Your Role</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8, color: "var(--accent)" }}>{me?.role}</div>
        </div>
        {/* Placeholder stats */}
        <div className="card" style={{ padding: 24 }}>
           <div style={{ color: "#6b7280", fontSize: 14, fontWeight: 600, textTransform: "uppercase" }}>Quick Actions</div>
           <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
             <a href="/admin/articles/new" className="btn btnPrimary" style={{ fontSize: 12 }}>New Article</a>
             {me?.role !== "JOURNALIST" && (
               <a href="/admin/review" className="btn btnGhost" style={{ fontSize: 12 }}>Review</a>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
