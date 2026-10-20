import { useState } from "react";
import type { Page, User } from "../types";
import { api, message } from "../api";
import { useQuery } from "../useQuery";
import { Badge, Empty, Loading, Modal, Notice, Pager } from "../components/UI";
export function Accounts({
  user,
  refresh,
  onChanged,
}: {
  user: User;
  refresh: number;
  onChanged: () => void;
}) {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<User | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState("");
  const result = useQuery<Page<User>>(
    `/users?page=${page}&search=${encodeURIComponent(search)}`,
    refresh,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE PEOPLE BEHIND THE PAGES</span>
          <h1>
            Library members<span className="hello-dot">.</span>
          </h1>
          <p>
            Give every reader the right access. Only admins can change roles.
          </p>
        </div>
      </div>
      <form
        className="searchbox account-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(draft);
          setPage(1);
        }}
      >
        <input
          aria-label="Search members"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={100}
          placeholder="Search by name or email…"
        />
        <button className="button">Search</button>
      </form>
      <section className="panel">
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <Notice>{result.error}</Notice>
        ) : !result.data?.items.length ? (
          <Empty title="No matching members" />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Access</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>
                          {member.name}
                          {member.id === user.id ? " (you)" : ""}
                        </strong>
                        <small>{member.email}</small>
                      </td>
                      <td>{member.role}</td>
                      <td>
                        <Badge
                          value={member.isActive ? "Active" : "Inactive"}
                        />
                      </td>
                      <td>
                        <button
                          className="button small"
                          disabled={member.id === user.id}
                          onClick={() => {
                            setSelected(member);
                            setError("");
                          }}
                        >
                          Edit access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              page={page}
              total={result.data.total}
              size={20}
              onChange={setPage}
            />
          </>
        )}
      </section>
      {selected && (
        <Modal
          title="Edit member access"
          onClose={() => setSelected(null)}
          busy={busy}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError("");
              const values = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await api.put(`/users/${selected.id}`, {
                  name: values.name,
                  role: values.role,
                  isActive: values.isActive === "on",
                });
                setSelected(null);
                onChanged();
              } catch (err) {
                setError(message(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Full name
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={selected.name}
              />
            </label>
            <label>
              Role
              <select name="role" defaultValue={selected.role}>
                <option>Student</option>
                <option>Librarian</option>
                <option>Admin</option>
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={selected.isActive}
              />
              Account is active
            </label>
            <p className="field-help">
              Access changes end this member’s existing sessions. Resolve active
              student loans before deactivation or a role change.
            </p>
            {error && <Notice>{error}</Notice>}
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save access"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
