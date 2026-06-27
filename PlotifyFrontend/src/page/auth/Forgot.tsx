import { Link } from "react-router";
import { useSignIn } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Footer from "../../components/ui/Footer";
import "../../styles/animations.css";

const Forgot = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const { isLoaded, signIn } = useSignIn();

  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  }, [loading]);

  const handleReset = async () => {
    if (!isLoaded || loading) return;

    try {
      setLoading(true);
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      setSuccess(true);

      navigate("/reset");
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
        <title>forgot password</title>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
          <div className="reveal flex w-full max-w-[350px] flex-col gap-3">
            <span className="mb-2 inline-block w-fit border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
              account recovery
            </span>

            <h1 className="mb-2 text-2xl font-bold sm:text-[26px]">plotify</h1>

            <p className="mb-2 text-sm text-gray-400">
              enter email of your registered account
            </p>

            <input
              type="email"
              className="field-input"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {success && (
              <p className="text-sm text-gray-400">
                reset email was sent. please check your email.
              </p>
            )}

            {error && <p className="field-error">{error}</p>}

            <div className="mt-4 flex flex-col items-start gap-3">
              <Link to="/signin" className="back-link">
                back to sign in
              </Link>
              <button type="button" className="action-btn" onClick={handleReset}>
                reset
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Forgot;
