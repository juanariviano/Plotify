import { Link, useLocation } from "react-router";
import { useSignIn } from "@clerk/clerk-react";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import AuthLayout, { AuthHeading, AuthTabs, Divider, FormError } from "../../components/auth/AuthLayout";
import PasswordInput from "../../components/ui/PasswordInput";
import OtpInput from "../../components/ui/OtpInput";
import { btn } from "../../lib/ui";

const Signin = () => {
  const location = useLocation();
  const redirectTo =
    typeof location.state?.from === "string" ? location.state.from : "/";
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState("login");
  const [code, setCode] = useState("");
  const [factorType, setFactorType] = useState<"first" | "second">("first");

  const handleSignin = async () => {
    if (!isLoaded || loading) return;

    try {
      setLoading(true);
      setError("");
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete") {
        await setActive({
          session: result.createdSessionId,
        });

        window.location.href = redirectTo;
      }

      if (result.status === "needs_first_factor") {
        const emailFactor = result.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code",
        );

        if (!emailFactor) {
          setError("email verification not available");
          return;
        }

        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });

        setFactorType("first");
        setStep("otp");
      }

      if (result.status === "needs_second_factor") {
        const factor = result.supportedSecondFactors?.find(
          (f) => f.strategy === "email_code",
        );

        if (!factor) {
          setError("no verification method available");
          return;
        }

        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: factor.emailAddressId,
        });

        setFactorType("second");
        setStep("otp");
      }
    } catch (err: unknown) {
      console.log(err);

      if (typeof err === "object" && err !== null && "errors" in err) {
        const clerkError = err as {
          errors?: { longMessage?: string; message?: string }[];
        };

        setError(
          (
            clerkError.errors?.[0]?.longMessage ||
            clerkError.errors?.[0]?.message ||
            "invalid username or password"
          ).toLowerCase(),
        );
      } else {
        setError("invalid username or password");
      }

      try {
        await signIn.reload();
      } catch (reloadErr) {
        console.log(reloadErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || !signIn || !setActive || loading) return;

    try {
      setLoading(true);
      setError("");

      const result =
        factorType === "first"
          ? await signIn.attemptFirstFactor({ strategy: "email_code", code })
          : await signIn.attemptSecondFactor({ strategy: "email_code", code });

      if (result.status === "complete") {
        await setActive({
          session: result.createdSessionId,
        });

        window.location.href = redirectTo;
      }
    } catch (err) {
      console.log(err);
      setError("invalid code");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded || loading) return;

    try {
      setLoading(true);
      sessionStorage.setItem("signup_method", "oauth");
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/ssocallback",
        redirectUrlComplete: "/verifysignup",
      });
    } catch (err) {
      console.log(err);
      setLoading(false);
      setError("internal server error");
    }
  };

  return (
    <AuthLayout variant="signin" title="sign in · plotify" stepKey={step}>
      {step === "login" ? (
        <>
          <AuthTabs />
          <AuthHeading title="welcome back." subtitle="sign in to pick up where you stopped." />

          <button type="button" className={btn("secondary", "lg", "w-full border-ink")} disabled={loading} onClick={handleGoogleSignIn}>
            continue with google
          </button>

          <Divider />

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignin();
            }}
          >
            <div>
              <label htmlFor="signin-email" className="label">email</label>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                className="field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="signin-password" className="text-[13px] font-medium">password</label>
                <Link to="/forgot" className="text-[13px] text-muted transition-colors hover:text-ink">
                  forgot it?
                </Link>
              </div>
              <PasswordInput
                id="signin-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>

            <FormError message={error} />

            <button type="submit" disabled={loading} className={btn("primary", "lg", "group mt-2 w-full")}>
              {loading ? "signing in…" : "sign in"}
              {!loading && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
            </button>
          </form>

          <p className="mt-7 text-sm text-muted">
            new to plotify?{" "}
            <Link to="/signup" className="text-ink underline underline-offset-4">create an account</Link>
          </p>
        </>
      ) : (
        <>
          <p className="eyebrow mb-3">one more step</p>
          <AuthHeading title="check your inbox." subtitle="we sent a 6-digit code to your email." />

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
            </fieldset>
            <FormError message={error} />
            <button type="submit" disabled={loading || code.length < 6} className={btn("primary", "lg", "w-full")}>
              {loading ? "checking…" : "verify and continue"}
            </button>
            <button
              type="button"
              className="text-left text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
              onClick={() => {
                setStep("login");
                setCode("");
                setError("");
              }}
            >
              use a different account
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
};

export default Signin;
