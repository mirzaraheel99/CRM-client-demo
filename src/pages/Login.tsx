import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Field } from "../components/ui";
import { Logo } from "../components/Logo";
import { bi } from "../lib/domainAr";

const DEMO_ACCOUNTS = [
  { username: "admin", label: "Admin" },
  { username: "manager", label: "Manager" },
  { username: "supervisor", label: "Supervisor" },
  { username: "technician", label: "Technician" },
  { username: "frontdesk", label: "Front Desk" },
];

export default function Login() {
  const currentUser = useStore((state) => state.currentUser);
  const login = useStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (currentUser) {
    return <Navigate to={location.state?.from ?? "/"} replace />;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const outcome = await login(username, password);
    setSubmitting(false);
    if (!outcome.ok) { setError(outcome.message); return; }
    setError("");
    navigate(location.state?.from ?? "/", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-page)] p-4">
      <Card className="w-full max-w-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-1)] text-white shrink-0">
            <Logo size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold">VFix</p>
            <p className="text-[11px] text-[var(--color-ink-muted)]">{bi("Appliance Service Suite", "منصة خدمة الأجهزة")}</p>
          </div>
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight">{bi("Sign in", "تسجيل الدخول")}</h1>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{bi("Use your staff username and password", "استخدم اسم المستخدم وكلمة المرور الخاصة بك")}</p>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          <Field label={bi("Username", "اسم المستخدم")}>
            <Input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoFocus />
          </Field>
          <Field label={bi("Password", "كلمة المرور")}>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </Field>
          {error && <p className="text-[11px] text-[var(--color-status-serious)]">{error}</p>}
          <Button type="submit" className="w-full justify-center" disabled={!username.trim() || !password.trim() || submitting}>
            <LogIn size={14} /> {submitting ? bi("Signing in...", "جارٍ تسجيل الدخول...") : bi("Sign in", "تسجيل الدخول")}
          </Button>
        </form>

        <div className="border-t pt-3 [border-color:var(--color-border)]">
          <p className="text-[11px] text-[var(--color-ink-muted)] mb-2">{bi("Demo accounts (password: demo123)", "حسابات تجريبية (كلمة المرور: demo123)")}</p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => { setUsername(account.username); setPassword("demo123"); }}
                className="rounded-full border px-2.5 py-1 text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-brand-1)] hover:border-[var(--color-brand-1)] [border-color:var(--color-border)]"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
