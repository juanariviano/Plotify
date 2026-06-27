import { Link } from "react-router";
import { useSignIn } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Footer from "../../components/ui/Footer";
import "../../styles/animations.css";

const Signin = () => {
  const page: string = window.location.pathname;
  const containerRef = useRef<HTMLDivElement>(null);
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState("login");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [factorType, setFactorType] = useState<"first" | "second">("first");

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
  }, [step]);

  const handleSignin = async () => {
    if (!isLoaded || loading) return;

    try {
      setLoading(true);
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete") {
        await setActive({
          session: result.createdSessionId,
        });

        window.location.href = "/";
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
    } catch (err) {
      console.log(err);
      setLoading(false);
      await signIn.reload();
      setError("invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || !signIn || !setActive || loading) return;

    try {
      setLoading(true);

      const result =
        factorType === "first"
          ? await signIn.attemptFirstFactor({ strategy: "email_code", code })
          : await signIn.attemptSecondFactor({ strategy: "email_code", code });

      if (result.status === "complete") {
        await setActive({
          session: result.createdSessionId,
        });

        window.location.href = "/";
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
    <div className="relative min-h-screen bg-white lowercase text-[#111111]">
      <div className="landing-ambient" aria-hidden="true" />

      <div ref={containerRef} className="relative z-10 flex min-h-screen flex-col">
        <title>sign in</title>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
          <div className="reveal flex w-full max-w-[350px] flex-col gap-3">
            <span className="mb-2 inline-block w-fit border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
              {step === "login" ? "welcome back" : "verification"}
            </span>

            <h1 className="mb-4 text-2xl font-bold sm:text-[26px]">plotify</h1>

            {step === "login" && (
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
                  className="google-btn w-full cursor-pointer px-6 py-3"
                  onClick={handleGoogleSignIn}
                >
                  continue with google
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

                {error && <p className="field-error">{error}</p>}

                <div className="mt-4 flex flex-col items-start gap-3">
                  {!loading && (
                    <Link to="/forgot" className="back-link">
                      forgot password
                    </Link>
                  )}

                  <button
                    type="button"
                    className="action-btn disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading}
                    onClick={handleSignin}
                  >
                    {loading ? "processing..." : "login"}
                  </button>
                </div>
              </>
            )}

            {step === "otp" && (
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

export default Signin;
