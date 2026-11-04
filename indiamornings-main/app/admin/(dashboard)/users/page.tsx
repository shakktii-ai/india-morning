"use client";

import { useEffect, useState } from "react";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
   const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("JOURNALIST");
  const [showPassword, setShowPassword] = useState(false);

  // Edit State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("JOURNALIST");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  async function load() {
    const r = await fetch("/api/users");
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Forbidden"); return; }
    setUsers(d.users || []);
  }

  useEffect(() => { load(); }, []);

  // Auto-hide success message
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);
  
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  async function create() {
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
    setName(""); setEmail(""); setPassword("");
    setSuccessMsg("User created successfully!");
    await load();
  }

  async function toggle(id: string, isActive: boolean) {
    const r = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive })
    });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed"); return; }
    setSuccessMsg(`User ${isActive ? "activated" : "deactivated"}.`);
    await load();
  }

  async function deleteUser(id: string) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    const r = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed to delete user"); return; }
    setSuccessMsg("User deleted successfully.");
    await load();
  }

  async function update() {
    if (!editingUser) return;
    const payload: any = { name: editName, role: editRole };
    if (editPassword) payload.password = editPassword;

    const r = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) { setErrorMsg(d?.message || "Failed to update user"); return; }
    setSuccessMsg("User updated successfully!");
    setEditingUser(null);
    setEditPassword("");
    await load();
  }

  function startEdit(u: any) {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditPassword("");
  }

  return (
    <div style={{ display: "grid", gap: 32 }}>
       {successMsg && (
        <div style={{ 
          background: "#ecfdf5", color: "#065f46", padding: "12px 16px", borderRadius: 8, 
          border: "1px solid #a7f3d0", fontWeight: 500 
        }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ 
          background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, 
          border: "1px solid #fecaca", fontWeight: 500 
        }}>
          {errorMsg}
        </div>
      )}

      {/* Edit Modal Overlay */}
      {editingUser && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 1000, padding: 20
        }}>
          <div className="card" style={{ padding: 32, maxWidth: 500, width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h2 style={{ marginTop: 0, marginBottom: 24 }}>Edit User</h2>
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Name</label>
                <input className="input" value={editName} onChange={e=>setEditName(e.target.value)} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                 <label style={{ fontSize: 13, fontWeight: 600 }}>Role</label>
                 <select className="select" value={editRole} onChange={e=>setEditRole(e.target.value)}>
                   <option value="JOURNALIST">JOURNALIST</option>
                   <option value="ADMIN">ADMIN</option>
                   <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                 </select>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>New Password (leave blank to keep current)</label>
                <div style={{ position: "relative" }}>
                  <input 
                    className="input" 
                    type={showEditPassword ? "text" : "password"} 
                    value={editPassword} 
                    onChange={e=>setEditPassword(e.target.value)} 
                    placeholder="Min 6 characters"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                  >
                    {showEditPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button className="btn btnPrimary" onClick={update} style={{ flex: 1 }}>Save Changes</button>
                <button className="btn btnGhost" onClick={() => setEditingUser(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24, borderLeft: "4px solid var(--accent)" }}>
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20 }}>Create New User</h2>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
           <div style={{ display: "grid", gap: 8 }}>
             <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Name</label>
             <input className="input" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
           </div>
           <div style={{ display: "grid", gap: 8 }}>
             <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Role</label>
             <select className="select" value={role} onChange={e=>setRole(e.target.value)}>
               <option value="JOURNALIST">JOURNALIST</option>
               <option value="ADMIN">ADMIN</option>
               <option value="SUPER_ADMIN">SUPER_ADMIN</option>
             </select>
           </div>
           <div style={{ display: "grid", gap: 8 }}>
             <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Email</label>
             <input className="input" placeholder="user@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
           </div>
           <div style={{ display: "grid", gap: 8 }}>
             <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563" }}>Password</label>
             <div style={{ position: "relative" }}>
                <input 
                  className="input" 
                  placeholder="Strong password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e=>setPassword(e.target.value)} 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
             </div>
           </div>
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btnPrimary" onClick={create} style={{ padding: "10px 24px" }}>Create User</button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 12, textAlign: "right" }}>
           Only valid for Admin/Super Admin.
        </div>
      </div>

      <div className="card" style={{ padding: 0, paddingBottom: 16, overflow: "hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding: "16px 24px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>System Users</h2>
          <button className="btn btnGhost" onClick={load} style={{ fontSize: 13 }}>Refresh List</button>
        </div>

        <div style={{ padding: "16px 24px", display: "grid", gap: 12 }}>
          {users.map((u:any) => (
            <div key={u.id} style={{ 
               display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap: 16,
               padding: "12px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: u.isActive ? "white" : "#fef2f2"
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: u.isActive ? "var(--text)" : "#991b1b" }}>
                  {u.name} <span style={{ 
                     fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4, marginLeft: 8,
                     background: "#e5e7eb", color: "#4b5563", textTransform: "uppercase" 
                  }}>{u.role}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{u.email}</div>
              </div>
              <div style={{ display:"flex", gap: 8 }}>
                <button 
                   className="btn btnGhost" 
                   style={{ fontSize: 12, padding: "6px 12px" }}
                   onClick={()=>startEdit(u)}
                >
                   Edit
                </button>
                <button 
                  className={`btn ${u.isActive ? "btnGhost" : "btnPrimary"}`} 
                  style={{ fontSize: 12, padding: "6px 12px", ...(u.isActive ? { color: "#b91c1c", background: "#fee2e2" } : {}) }}
                  onClick={()=>toggle(u.id, !u.isActive)}
                >
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>
                <button 
                   className="btn" 
                   style={{ fontSize: 12, padding: "6px 12px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}
                   onClick={()=>deleteUser(u.id)}
                >
                   Delete
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 ? <div style={{ opacity: 0.7, padding: 24, textAlign: "center" }}>No users found.</div> : null}
        </div>
      </div>
    </div>
  );
}
