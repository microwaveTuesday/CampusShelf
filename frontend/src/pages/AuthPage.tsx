import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, BookOpen, LibraryBig } from "lucide-react";
import { api, message } from "../api";
import type { Session } from "../types";
import { Notice } from "../components/UI";
export function AuthPage({
  onLogin,
  expired,
}: {
  onLogin: (s: Session) => void;
  expired: boolean;
}) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = Object.fromEntries(new FormData(e.currentTarget));
    if (register && form.password !== form.confirm) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<Session>(
        `/auth/${register ? "register" : "login"}`,
        { name: form.name, email: form.email, password: form.password },
      );
      onLogin(data);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <div className="brand">
          <LibraryBig size={30} />
          <span>
            campus<span className="brand-light">shelf</span>
            <small>THE CAMPUS LIBRARY</small>
          </span>
        </div>
        <div>
          <span className="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</span>
          <h1>
            A place for your
            <br />
            next chapter.
          </h1>
          <p>
            Discover something new. Borrow a good book.
            <br />
            Make room for a different perspective.
          </p>
          <div className="auth-books" aria-hidden="true">
            <div>
              THE ART
              <br />
              OF LEARNING
            </div>
            <div>
              STAY
              <br />
              CURIOUS.
            </div>
            <div>
              ONE MORE
              <br />
              CHAPTER
            </div>
          </div>
        </div>
        <span className="auth-foot">
          Good books. Open minds. Your campus library.
        </span>
      </aside>
      <main className="auth-main">
        <div className="auth-form">
          <BookOpen className="auth-mark" size={32} />
          <span className="eyebrow">WELCOME TO CAMPUSSHELF</span>
          <h2>
            {register
              ? "Start your reading journey."
              : "Good to see you again."}
          </h2>
          <p className="muted">
            {register
              ? "Create a student account to explore and borrow."
              : "Sign in to your campus library account."}
          </p>
          {expired && (
            <Notice kind="info">
              Your session ended. Please sign in again.
            </Notice>
          )}
          {error && <Notice>{error}</Notice>}
          <form onSubmit={submit}>
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Your full name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="you@campus.edu"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 10 : 1}
                maxLength={128}
                pattern={
                  register
                    ? "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}"
                    : undefined
                }
                title={
                  register
                    ? "At least 10 characters with upper and lower case letters and a number"
                    : undefined
                }
              />
            </label>
            {register && (
              <>
                <p className="field-help">
                  Use 10+ characters, upper and lower case letters, and a
                  number.
                </p>
                <label>
                  Confirm password
                  <input
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    maxLength={128}
                  />
                </label>
              </>
            )}
            <button className="button primary wide" disabled={busy}>
              {busy
                ? "Please wait…"
                : register
                  ? "Create student account"
                  : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already a member?" : "New to the library?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="auth-note">
            For your privacy, signing out or refreshing this page ends your
            session.
          </p>
        </div>
      </main>
    </div>
  );
}
