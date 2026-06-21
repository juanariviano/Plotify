import { Link } from "react-router";
import { useSignUp } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import "../../styles/animations.css";

const Signup = () => {
  const page: string = window.location.pathname;
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

  const handleSignup = async () => {
    if (!isLoaded || loading) return; // cek ketersediaan layanan clerk udh siap dipake / blm

    if (password !== confirmPassword) {
      setError("password does not match");
      return;
    }

    try {
      setLoading(true);

      // kirim email ke server clerk -> buat didaftarin
      await signUp.create({
        emailAddress: email,
        password: password,
      });

      // kirim email verification
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
    if (!isLoaded || loading) return; // cek ketersediaan layanan clerk udh siap dipake / blm

    try {
      setLoading(true);

      // buat nanti di verifysignup
      sessionStorage.setItem("signup_method", "email");

      // cek code otp
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });


      if (result.status === "complete") {
        // session id itu kaya tanda bahwa kalian udh login
        // harus di pas ke setActive -> bilang ke user bahwa kalian udah berhasil login
        sessionStorage.setItem(
          "signup_session_id",
          result.createdSessionId || "",
        );

        // clerk user id
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
    <div className="flex items-center justify-center h-[100vh]">
      <title>sign up</title>

      <div className="flex flex-col gap-3">
        <h1 className="font-bold text-[26px]">plotify</h1>

        {!pendingVerification ? (
          <>
            <div className="flex gap-4">
              <Link
                to="/signin"
                className={page.includes("signin") ? "" : "text-gray-400"}
              >
                sign in
              </Link>
              <Link
                to="/signup"
                className={page.includes("signup") ? "" : "text-gray-400"}
              >
                sign up
              </Link>
            </div>

            <button
              className={`border py-3 px-6 w-[350px] relative overflow-hidden ${googleLoading ? "bg-gray-100 opacity-50 cursor-not-allowed" : "cursor-pointer google-btn"}`}
              disabled={googleLoading}
              onClick={handleGoogleSignUp}
            >
              {googleLoading ? "redirecting..." : "sign-up with google"}
            </button>

            <p className="my-2 text-gray-400">or with email</p>

            <input
              type="email"
              className="border py-4 px-6 w-[350px]"
              placeholder="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="relative w-[350px]">
              <input
                type={showPassword ? "text" : "password"}
                className="border py-4 px-6 w-full pr-12"
                placeholder="password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
              >
                {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>
            <div className="relative w-[350px]">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="border py-4 px-6 w-full pr-12"
                placeholder="confirm password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
              >
                {showConfirmPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            {/* {success && (
              <p className="text-green-400 hidden">
              verification email was sent! <br /> please check your email.
            </p>
            )} */}

            <span
              className={`mt-3  ${loading ? "text-gray-500 opacity-70" : "underline cursor-pointer"}`}
              onClick={handleSignup}
            >
              {!loading ? "register" : "processing..."}
            </span>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="verification code"
              className="border py-4 px-6 w-[350px]"
              onChange={(e) => setCode(e.target.value)}
            />

            <span
              className={`mt-3 ${loading ? "text-gray-500 opacity-70 pointer-events-none" : "underline cursor-pointer"}`}
              onClick={verifyCode}
            >
              {loading ? "processing..." : "verify email"}
            </span>
          </>
        )}

        {error && <p className="text-red-500 max-w-sm">{error}</p>}
      </div>
    </div>
  );
};

export default Signup;
