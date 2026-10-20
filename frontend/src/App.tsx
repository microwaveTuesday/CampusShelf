import { useEffect, useState } from "react";
import {
  LibraryBig,
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  Globe,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { api, message, setToken } from "./api";
import type { Session, Book } from "./types";
import { AuthPage } from "./pages/AuthPage";
import { Dashboard } from "./pages/Dashboard";
import { Catalog } from "./pages/Catalog";
import { Loans } from "./pages/Loans";
import { External } from "./pages/External";
import { Accounts } from "./pages/Accounts";
import { BookDialog, BookEditor } from "./components/BookDialog";
import { Modal, Notice } from "./components/UI";

function App() {
  const [session, setSession] = useState<Session | null>(null),
    [expired, setExpired] = useState(false),
    [page, setPage] = useState("overview"),
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState<Book | null>(null),
    [editor, setEditor] = useState<{ book: Book | null } | null>(null),
    [mobile, setMobile] = useState(false),
    [logout, setLogout] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    function endSession() {
      setToken(null);
      setSession(null);
      setSelected(null);
      setEditor(null);
      setLogout(false);
      setExpired(true);
    }
    window.addEventListener("session-expired", endSession);
    return () => window.removeEventListener("session-expired", endSession);
  }, []);
  function navigate(destination: string) {
    setPage(destination);
    setMobile(false);
    window.scrollTo({ top: 0 });
  }
  function changed() {
    setRefresh((n) => n + 1);
  }
  if (!session)
    return (
      <AuthPage
        expired={expired}
        onLogin={(s) => {
          setToken(s.accessToken);
          setSession(s);
          setExpired(false);
          setPage("overview");
          changed();
        }}
      />
    );
  const user = session.user,
    staff = user.role !== "Student";
  const navigation = [
    { id: "overview", text: "Overview", icon: LayoutDashboard },
    { id: "catalog", text: "The collection", icon: BookOpen },
    {
      id: "loans",
      text: staff ? "Circulation desk" : "My borrowing",
      icon: ArrowLeftRight,
    },
    ...(staff
      ? [{ id: "external", text: "Discover & import", icon: Globe }]
      : []),
    ...(user.role === "Admin"
      ? [{ id: "accounts", text: "Library members", icon: Users }]
      : []),
  ];
  const current = navigation.find((n) => n.id === page)?.text || "Overview";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {mobile && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <LibraryBig size={30} />
          <span>
            campus<span className="brand-light">shelf</span>
            <small>THE CAMPUS LIBRARY</small>
          </span>
        </div>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <span className="nav-label">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "nav-item active" : "nav-item"}
              aria-current={page === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} strokeWidth={1.7} />
              <span>{item.text}</span>
              {page === item.id && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <BookOpen size={23} strokeWidth={1.2} />
          <p>
            A good book is
            <br />
            just the beginning.
          </p>
          <span>KEEP EXPLORING.</span>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={() => {
              setLogout(true);
              setError("");
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <button
              className="icon-button menu-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div>
            <span className="role-pill">{user.role} workspace</span>
            <span className="topbar-greeting">
              Welcome back, {user.name.split(" ")[0]}
            </span>
            <div className="avatar small">{user.name[0]}</div>
          </div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          {page === "overview" && (
            <Dashboard
              user={user}
              refresh={refresh}
              navigate={navigate}
              onBook={setSelected}
            />
          )}
          {page === "catalog" && (
            <Catalog
              user={user}
              refresh={refresh}
              onBook={setSelected}
              onCreate={() => setEditor({ book: null })}
            />
          )}
          {page === "loans" && (
            <Loans user={user} refresh={refresh} onChanged={changed} />
          )}
          {page === "external" && staff && (
            <External
              onChanged={changed}
              onManual={() => setEditor({ book: null })}
            />
          )}
          {page === "accounts" && user.role === "Admin" && (
            <Accounts user={user} refresh={refresh} onChanged={changed} />
          )}
        </main>
        <footer className="site-footer">
          <span>CampusShelf · A little space for big ideas.</span>
          <span>Borrow thoughtfully. Return on time.</span>
        </footer>
      </div>
      {selected && (
        <BookDialog
          book={selected}
          user={user}
          onClose={() => setSelected(null)}
          onChanged={changed}
          onEdit={() => {
            setEditor({ book: selected });
            setSelected(null);
          }}
        />
      )}
      {editor && (
        <BookEditor
          book={editor.book}
          onClose={() => setEditor(null)}
          onChanged={changed}
        />
      )}
      {logout && (
        <Modal
          title="See you next chapter?"
          busy={busy}
          onClose={() => setLogout(false)}
        >
          <p>
            Sign out of your CampusShelf account? Your borrowing requests are
            safely saved.
          </p>
          {error && <Notice>{error}</Notice>}
          <div className="modal-actions">
            <button
              className="button"
              disabled={busy}
              onClick={() => setLogout(false)}
            >
              Stay here
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  await api.post("/auth/logout");
                  setToken(null);
                  setSession(null);
                  setSelected(null);
                  setEditor(null);
                  setLogout(false);
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default App;
