import { useSignIn } from "@clerk/clerk-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import AuthLayout, { AuthHeading, BackLink, FormError } from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/ui/PasswordInput";
import OtpInput from "../../components/ui/OtpInput";
import { btn } from "../../lib/ui";

const Reset = () => {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!isLoaded || loading) return;

    if (!code || !password || !confirmPassword) {
      setError("please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("password does not match");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result.status === "complete") {
        await setActive({
          session: result.createdSessionId,
        });

        navigate("/");
      }
    } catch (err: unknown) {
      console.log(err);
      setLoading(false);

      if (typeof err === "object" && err !== null && "errors" in err) {
        const clerkError = err as {
          errors?: { longMessage?: string }[];
        };

        setError((clerkError.errors?.[0]?.longMessage || "something went wrong").toLowerCase());
      } else {
        setError("something went wrong");
      }
    }
  };

  return (
    <AuthLayout title="reset password · plotify" stepKey={`step-${step}`}>
      <p className="eyebrow mb-3">step {step} of 2</p>
      {step === 1 ? (
        <>
          <AuthHeading title="check your inbox." subtitle="enter the 6-digit code we sent you." />
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) setStep(2);
            }}
          >
            <fieldset>
              <legend className="label">reset code</legend>
              <OtpInput value={code} onChange={setCode} onComplete={() => setStep(2)} />
            </fieldset>
            <button type="submit" disabled={code.length < 6} className={btn("primary", "lg", "w-full")}>
              continue
            </button>
          </form>
          <div className="mt-7">
            <BackLink to="/forgot">send a new code</BackLink>
          </div>
        </>
      ) : (
        <>
          <AuthHeading title="pick a new password." subtitle="you'll be signed in right after." />
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleResetPassword();
            }}
          >
            <div>
              <label htmlFor="reset-password" className="label">new password</label>
              <PasswordInput
                id="reset-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="label">confirm password</label>
              <PasswordInput
                id="reset-confirm"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <FormError message={error} />

            <div className="mt-2 flex gap-3">
              <button type="button" className={btn("secondary", "lg")} onClick={() => setStep(1)}>
                back
              </button>
              <button type="submit" disabled={loading} className={btn("primary", "lg", "flex-1")}>
                {loading ? "saving…" : "reset password"}
              </button>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  );
};

export default Reset;
