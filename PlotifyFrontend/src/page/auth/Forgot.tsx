import { useSignIn } from "@clerk/clerk-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import AuthLayout, { AuthHeading, BackLink, FormError } from "../../components/auth/AuthLayout";
import { btn } from "../../lib/ui";

const Forgot = () => {
  const navigate = useNavigate();
  const { isLoaded, signIn } = useSignIn();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async () => {
    if (!isLoaded || loading) return;

    try {
      setLoading(true);
      setError("");
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      navigate("/reset");
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
    <AuthLayout title="forgot password · plotify">
      <p className="eyebrow mb-3">account recovery</p>
      <AuthHeading title="lost your key?" subtitle="enter the email on your account and we'll send you a reset code." />

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleReset();
        }}
      >
        <div>
          <label htmlFor="forgot-email" className="label">email</label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            className="field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <FormError message={error} />

        <button type="submit" disabled={loading} className={btn("primary", "lg", "mt-2 w-full")}>
          {loading ? "sending…" : "send reset code"}
        </button>
      </form>

      <div className="mt-7">
        <BackLink to="/signin">back to sign in</BackLink>
      </div>
    </AuthLayout>
  );
};

export default Forgot;
