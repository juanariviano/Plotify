import { useSignIn } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Footer from "../../components/ui/Footer";
import "../../styles/animations.css";

const Reset = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const { isLoaded, signIn, setActive } = useSignIn();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || loading) return;

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
  }, [loading, step]);

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

        setError(clerkError.errors?.[0]?.longMessage || "something went wrong");
      } else {
        setError("something went wrong");
      }
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative min-h-screen bg-white lowercase text-[#111111]">
      <div className="landing-ambient" aria-hidden="true" />

      <div ref={containerRef} className="relative z-10 flex min-h-screen flex-col">
        <title>reset password</title>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
          <div className="reveal flex w-full max-w-[350px] flex-col gap-3">
            <span className="mb-2 inline-block w-fit border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
              {step === 1 ? "verification" : "new password"}
            </span>

            <h1 className="mb-4 text-2xl font-bold sm:text-[26px]">plotify</h1>

            {step === 1 ? (
              <>
                <p className="mb-2 text-sm text-gray-400">
                  enter the code from your email
                </p>

                <input
                  type="text"
                  placeholder="verification code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="field-input"
                />

                <button
                  type="button"
                  className="action-btn mt-3 w-fit"
                  onClick={() => setStep(2)}
                >
                  continue
                </button>
              </>
            ) : (
              <>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    className="field-input pr-12"
                    placeholder="new password"
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
                    value={confirmPassword}
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

                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => setStep(1)}
                  >
                    back
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={handleResetPassword}
                  >
                    reset password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Reset;
