import { useAuth, useSignUp, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { completeProfile } from "../../services/auth.service";
import { getUserData } from "../../services/profile.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import AuthLayout, { AuthHeading, FormError } from "../../components/auth/AuthLayout";
import { btn } from "../../lib/ui";

const VerifySignup = () => {
  const navigate = useNavigate();
  const { setActive } = useSignUp();
  const { isLoaded, user } = useUser();
  const { isSignedIn } = useAuth();

  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const sessionId = sessionStorage.getItem("signup_session_id");
  const method = sessionStorage.getItem("signup_method");
  const [checkingUser, setCheckingUser] = useState(method === "oauth");

  useEffect(() => {
    setLoading(false);
    if (!isLoaded || !user?.id) return;

    const checkUser = async () => {
      try {
        const res = await getUserData(user.id);

        if (res.fullname && res.username) {
          navigate("/", { replace: true });
          return;
        }

        const oauthComplete = sessionStorage.getItem("oauth_complete");
        if (oauthComplete) return;
      } catch (err) {
        console.log(err);
      } finally {
        setCheckingUser(false);
      }
    };

    checkUser();
  }, [isLoaded, isSignedIn]);

  const handleCompleteProfile = async () => {
    if (!fullname || !username) {
      setError("please fill all fields");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      setLoading(true);
      const finalClerkId =
        method === "oauth"
          ? user?.id
          : sessionStorage.getItem("signup_clerk_id");

      if (!finalClerkId) {
        setError("user not ready, please try again");
        setIsSubmitting(false);
        return;
      }

      if (method === "oauth") {
        sessionStorage.setItem("oauth_complete", "true");
        sessionStorage.removeItem("google_oauth_loading");
      }

      if (sessionId && setActive) {
        await setActive({ session: sessionId });
      }

      await completeProfile({
        fullname,
        username,
        clerkId: finalClerkId,
      });

      sessionStorage.removeItem("signup_session_id");
      sessionStorage.removeItem("signup_clerk_id");
      sessionStorage.removeItem("signup_method");

      navigate("/", { replace: true });
    } catch (err) {
      console.log(err);
      setError("something went wrong");
      sessionStorage.removeItem("oauth_complete");
      setIsSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return <LoadingScreen />;
  }

  return (
    <AuthLayout variant="signup" title="finish setup · plotify">
      <p className="eyebrow mb-3">last step</p>
      <AuthHeading title="what should we call you?" subtitle="one last thing before your shelf is ready." />

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleCompleteProfile();
        }}
      >
        <div>
          <label htmlFor="setup-name" className="label">full name</label>
          <input
            id="setup-name"
            type="text"
            autoComplete="name"
            className="field"
            value={fullname}
            onChange={(e) => setFullname(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="setup-username" className="label">username</label>
          <div className="flex h-12 border border-line-strong bg-white transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgb(23_22_15/0.06)]">
            <span className="flex items-center pr-1 pl-3.5 text-muted">@</span>
            <input
              id="setup-username"
              type="text"
              autoComplete="username"
              className="min-w-0 flex-1 bg-transparent pr-3.5 text-[15px] outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            />
          </div>
          <p className="hint">no spaces. you can change it later.</p>
        </div>

        <FormError message={error} />

        <button type="submit" disabled={loading} className={btn("primary", "lg", "mt-2 w-full")}>
          {loading ? "setting up…" : "open my shelf"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default VerifySignup;
