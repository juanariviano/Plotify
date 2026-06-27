import { useAuth, useSignUp, useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { completeProfile } from "../../services/auth.service";
import { getUserData } from "../../services/profile.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Footer from "../../components/ui/Footer";
import "../../styles/animations.css";

const VerifySignup = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const root = containerRef.current;
    if (!root || checkingUser) return;

    const elements = root.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [checkingUser]);

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
    <div className="relative min-h-screen bg-white lowercase text-[#111111]">
      <div className="landing-ambient" aria-hidden="true" />

      <div ref={containerRef} className="relative z-10 flex min-h-screen flex-col">
        <title>signup</title>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
          <div className="reveal flex w-full max-w-[350px] flex-col gap-3">
            <span className="mb-2 inline-block w-fit border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
              finish setup
            </span>

            <h1 className="mb-4 text-2xl font-bold sm:text-[26px]">plotify</h1>

            <p className="mb-2 text-sm text-gray-400">
              one last step before your shelf is ready
            </p>

            <input
              type="text"
              className="field-input"
              placeholder="full name"
              onChange={(e) => setFullname(e.target.value)}
            />

            <input
              type="text"
              className="field-input"
              placeholder="username"
              onChange={(e) => setUsername(e.target.value)}
            />

            {error && <p className="field-error">{error}</p>}

            <button
              type="button"
              className="action-btn mt-3 w-fit disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
              onClick={handleCompleteProfile}
            >
              {loading ? "processing..." : "continue to home page"}
            </button>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default VerifySignup;
