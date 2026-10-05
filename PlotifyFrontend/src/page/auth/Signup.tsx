import { Link } from "react-router";
import { useSignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Check, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import AuthLayout, { AuthHeading, AuthTabs, Divider, FormError } from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/ui/PasswordInput";
import OtpInput from "../../components/ui/OtpInput";
import { btn } from "../../lib/ui";

const STRENGTH = ["", "weak", "okay", "good", "strong"];

const passwordChecks = (pw: string) => [
  { label: "at least 8 characters", ok: pw.length >= 8 },
  { label: "includes a number", ok: /\d/.test(pw) },
  { label: "includes a symbol or capital letter", ok: /[^a-z0-9]/.test(pw) },
];

const Signup = () => {
  const { signUp, isLoaded } = useSignUp();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(
    sessionStorage.getItem("google_oauth_loading") === "true",
  );

  useEffect(() => {
    sessionStorage.removeItem("google_oauth_loading");

    setLoading(false);
    setGoogleLoading(false);
  }, []);

  const checks = passwordChecks(password);
  const score = password ? checks.filter((c) => c.ok).length + (password.length >= 12 ? 1 : 0) : 0;

  const handleSignup = async () => {
    if (!isLoaded || loading) return;

    try {
      setLoading(true);

      await signUp.create({
        emailAddress: email,
        password: password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingVerification(true);
      await signUp.reload();
      setError("");
    } catch (err) {
      if (typeof err === "object" && err !== null && "errors" in err) {
        const clerkError = err as { errors?: { longMessage?: string; message?: string }[] };
        setError((clerkError.errors?.[0]?.longMessage || clerkError.errors?.[0]?.message || "something went wrong").toLowerCase());
      } else if (err instanceof Error) {
        setError(err.message.toLowerCase());
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || loading) return;

    try {
      setLoading(true);
      setError("");

      sessionStorage.setItem("signup_method", "email");

      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        sessionStorage.setItem(
          "signup_session_id",
          result.createdSessionId || "",
        );

        sessionStorage.setItem("signup_clerk_id", result.createdUserId || "");

        navigate("/verifysignup");
      }
    } catch (err) {
      console.log(err);
      setError("invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded || googleLoading) return;

    try {
      setGoogleLoading(true);
      sessionStorage.setItem("google_oauth_loading", "true");
      sessionStorage.setItem("signup_method", "oauth");

      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/ssocallback",
        redirectUrlComplete: "/verifysignup",
      });
    } catch (err) {
      console.log(err);
      sessionStorage.removeItem("google_oauth_loading");
      setGoogleLoading(false);
      setError("internal server error");
    }
  };

  return (
    <AuthLayout variant="signup" title="create account · plotify" stepKey={pendingVerification ? "verify" : "form"}>
      {!pendingVerification ? (
        <>
          <AuthTabs />
          <AuthHeading title="start your shelf." subtitle="takes less than a minute." />

          <button
            type="button"
            className={btn("secondary", "lg", "w-full border-ink")}
            disabled={googleLoading}
            onClick={handleGoogleSignUp}
          >
            {googleLoading ? "redirecting…" : "sign up with google"}
          </button>

          <Divider />

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignup();
            }}
          >
            <div>
              <label htmlFor="signup-email" className="label">email</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                className="field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="label">password</label>
              <PasswordInput
                id="signup-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="mt-2.5 grid grid-cols-4 gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-1 overflow-hidden bg-line">
                    <motion.span
                      className={`block h-1 ${score >= 3 ? "bg-done" : "bg-accent"}`}
                      initial={false}
                      animate={{ width: i < score ? "100%" : "0%" }}
                      transition={{ duration: 0.35, delay: i * 0.05 }}
                    />
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted" aria-live="polite">
                {password ? `strength: ${STRENGTH[Math.max(1, score)]}` : "use something you don't use anywhere else"}
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-[13px]">
                {checks.map((c) => (
                  <motion.li
                    key={c.label}
                    animate={{ color: c.ok ? "#2f6a3a" : "#67645d" }}
                    className="flex items-center gap-2"
                  >
                    <motion.span
                      key={String(c.ok)}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      {c.ok ? <Check size={14} strokeWidth={2.6} /> : <Minus size={14} />}
                    </motion.span>
                    {c.label}
                  </motion.li>
                ))}
              </ul>
            </div>

            <FormError message={error} />

            <button type="submit" disabled={loading} className={btn("primary", "lg", "mt-2 w-full")}>
              {loading ? "creating…" : "create account"}
            </button>
          </form>

          <p className="mt-7 text-sm text-muted">
            already have a shelf?{" "}
            <Link to="/signin" className="text-ink underline underline-offset-4">sign in</Link>
          </p>
        </>
      ) : (
        <>
          <p className="eyebrow mb-3">step 2 of 3</p>
          <AuthHeading
            title="check your inbox."
            subtitle={
              <>
                we sent a 6-digit code to <span className="text-ink">{email}</span>.
              </>
            }
          />
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              verifyCode();
            }}
          >
            <fieldset>
              <legend className="label">verification code</legend>
              <OtpInput value={code} onChange={setCode} invalid={!!error} />
              <p className="hint">tip: paste the whole code into the first box.</p>
            </fieldset>
            <FormError message={error} />
            <button type="submit" disabled={loading || code.length < 6} className={btn("primary", "lg", "w-full")}>
              {loading ? "checking…" : "verify email"}
            </button>
            <button
              type="button"
              className="text-left text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
              onClick={() => {
                setPendingVerification(false);
                setCode("");
                setError("");
              }}
            >
              use a different email
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
};

export default Signup;
