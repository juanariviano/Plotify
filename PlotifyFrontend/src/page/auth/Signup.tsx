import { Link } from "react-router";
import { useSignUp } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import Footer from "../../components/ui/Footer";
import "../../styles/animations.css";

const Signup = () => {
  const page: string = window.location.pathname;
  const containerRef = useRef<HTMLDivElement>(null);
  const { signUp, isLoaded } = useSignUp();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

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
  }, [pendingVerification]);

  const handleSignup = async () => {
    if (!isLoaded || loading) return;

    if (password !== confirmPassword) {
      setError("password does not match");
      return;
    }

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
      if (err instanceof Error) {
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
    <div className="relative min-h-screen bg-white lowercase text-[#111111]">
      <div className="landing-ambient" aria-hidden="true" />

      <div ref={containerRef} className="relative z-10 flex min-h-screen flex-col">
        <title>sign up</title>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
          <div className="reveal flex w-full max-w-[350px] flex-col gap-3">
            <span className="mb-2 inline-block w-fit border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
              {pendingVerification ? "verification" : "create account"}
            </span>

            <h1 className="mb-4 text-2xl font-bold sm:text-[26px]">plotify</h1>

            {!pendingVerification ? (
              <>
                <div className="mb-4 flex gap-4 border-b border-[#eaeaea] pb-3 text-sm">
                  <Link
                    to="/signin"
                    className={`transition-colors hover:text-black ${page.includes("signin") ? "text-black" : "text-gray-400"}`}
                  >
                    sign in
                  </Link>
                  <Link
                    to="/signup"
                    className={`transition-colors hover:text-black ${page.includes("signup") ? "text-black" : "text-gray-400"}`}
                  >
                    sign up
                  </Link>
                </div>

                <button
                  type="button"
                  className={`w-full px-6 py-3 ${googleLoading ? "cursor-not-allowed border border-[#eaeaea] bg-[#f7f6f3] opacity-50" : "google-btn cursor-pointer"}`}
                  disabled={googleLoading}
                  onClick={handleGoogleSignUp}
                >
                  {googleLoading ? "redirecting..." : "sign-up with google"}
                </button>

                <p className="my-2 text-sm text-gray-400">or with email</p>

                <input
                  type="email"
                  className="field-input"
                  placeholder="email"
                  onChange={(e) => setEmail(e.target.value)}
                />

                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="field-input pr-12"
                    placeholder="password"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
                  >
                    {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>

                <div className="relative w-full">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="field-input pr-12"
                    placeholder="confirm password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
                  >
                    {showConfirmPassword ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>

                {error && <p className="field-error">{error}</p>}

                <button
                  type="button"
                  className="action-btn mt-3 w-fit disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  onClick={handleSignup}
                >
                  {loading ? "processing..." : "register"}
                </button>
              </>
            ) : (
              <>
                <p className="mb-2 text-sm text-gray-400">
                  enter the code sent to your email
                </p>

                <input
                  type="text"
                  placeholder="verification code"
                  className="field-input"
                  onChange={(e) => setCode(e.target.value)}
                />

                {error && <p className="field-error">{error}</p>}

                <button
                  type="button"
                  className="action-btn mt-3 w-fit disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  onClick={verifyCode}
                >
                  {loading ? "processing..." : "verify email"}
                </button>
              </>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Signup;
