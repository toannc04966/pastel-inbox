import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const { login, error, isAuthenticated, loading: authLoading } = useAuth();

  // Redirect to inbox if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const validate = () => {
    const errors: typeof validationErrors = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 4) {
      errors.password = "Password must be at least 4 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    const success = await login(email, password);
    
    // Only reset submitting if login failed
    // If success, the page will redirect via window.location.href
    if (!success) {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 animate-fade-in"
      style={{
        background: `
          radial-gradient(1200px 800px at 15% 10%, #f6f8ff, transparent 55%),
          radial-gradient(900px 650px at 85% 20%, #fff7fb, transparent 55%),
          radial-gradient(900px 700px at 60% 90%, #fff1f7, transparent 55%),
          #ffffff
        `,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="w-full max-w-[420px]">
        {/* Glassmorphism Card */}
        <div
          className="rounded-[18px] p-[22px] animate-scale-in"
          style={{
            background: "rgba(255, 255, 255, 0.78)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(15, 23, 42, 0.10)",
          }}
        >
          {/* Brand Section */}
          <div className="text-center mb-[14px]">
            {/* Logo Mark */}
            <div
              className="w-[46px] h-[46px] mx-auto rounded-[14px] mb-3"
              style={{
                background: "radial-gradient(circle at 30% 30%, #ffd6e8, #f6b9d6 60%, #f5c7dc 100%)",
                border: "1px solid rgba(15, 23, 42, 0.08)",
              }}
            />

            {/* Title */}
            <h1
              className="text-[20px] tracking-[-0.02em]"
              style={{
                fontWeight: 650,
                color: "#0f172a",
              }}
            >
              BPINK WEBMAIL
            </h1>

            {/* Subtitle */}
            <p className="text-[13px] leading-[1.35] mt-1" style={{ color: "rgba(15, 23, 42, 0.62)" }}>
              Quiet access to your inbox — sign in to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email Field */}
            <div className="space-y-[6px]">
              <Label htmlFor="email" className="text-[13px]" style={{ color: "rgba(15, 23, 42, 0.80)" }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) {
                    setValidationErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                className="h-[42px] rounded-[12px] px-3 text-[14px] transition-all duration-200"
                style={{
                  background: "rgba(255, 255, 255, 0.85)",
                  border: "1px solid rgba(15, 23, 42, 0.10)",
                  color: "#0f172a",
                }}
                autoComplete="email"
                autoFocus
              />
              <div className="min-h-[18px]">
                {validationErrors.email && (
                  <p className="text-[13px]" style={{ color: "rgba(190, 18, 60, 0.95)" }}>
                    {validationErrors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-[6px]">
              <Label htmlFor="password" className="text-[13px]" style={{ color: "rgba(15, 23, 42, 0.80)" }}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                className="h-[42px] rounded-[12px] px-3 text-[14px] transition-all duration-200"
                style={{
                  background: "rgba(255, 255, 255, 0.85)",
                  border: "1px solid rgba(15, 23, 42, 0.10)",
                  color: "#0f172a",
                }}
                autoComplete="current-password"
              />
              <div className="min-h-[18px]">
                {validationErrors.password && (
                  <p className="text-[13px]" style={{ color: "rgba(190, 18, 60, 0.95)" }}>
                    {validationErrors.password}
                  </p>
                )}
              </div>
            </div>

            {/* API Error */}
            <div className="min-h-[18px]">
              {error && (
                <p className="text-[13px] text-center" style={{ color: "rgba(190, 18, 60, 0.95)" }}>
                  {error}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-[42px] rounded-[12px] text-[14px] transition-all duration-200 hover:brightness-110 disabled:opacity-75"
              style={{
                background: "#0f172a",
                color: "#ffffff",
                fontWeight: 650,
                border: "1px solid rgba(15, 23, 42, 0.12)",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Security Notice */}
          <p className="text-[12px] text-center mt-[14px]" style={{ color: "rgba(15, 23, 42, 0.55)" }}>
            This page sets a secure session cookie on this domain.
          </p>

          {/* Copyright & Legal */}
          <div className="text-[11px] text-center leading-[1.5] mt-[18px]" style={{ color: "rgba(15, 23, 42, 0.45)" }}>
            <p>© 2025 bpink.io.vn. All rights reserved.</p>
            <p className="mt-1">
              By signing in, you agree to our{" "}
              <span className="underline cursor-pointer hover:opacity-80">Terms of Service</span> and{" "}
              <span className="underline cursor-pointer hover:opacity-80">Privacy Policy</span>.
            </p>
            <p className="mt-1">Your emails are encrypted and private.</p>
          </div>
        </div>
      </div>

      {/* Custom focus styles */}
      <style>{`
        input:focus {
          border-color: rgba(244, 114, 182, 0.55) !important;
          box-shadow: 0 0 0 4px rgba(244, 114, 182, 0.35) !important;
          outline: none !important;
        }
      `}</style>
    </div>
  );
};

export default Login;
