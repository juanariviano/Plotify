import { Link } from "react-router";
import { useSignIn } from "@clerk/clerk-react";
import { useState } from "react";
import "../../styles/animations.css";
import { Eye, EyeOff } from "lucide-react";

const Signin = () => {
  const page: string = window.location.pathname;
  const { signIn, setActive, isLoaded } = useSignIn();
  // const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState("login");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

        setStep("otp");
      }

      if (result.status === "needs_second_factor") {
        // cari strategi yg pengguna punya buat verification
        // karena ud signup pake email_code, pasti bakal ada
        const factor = result.supportedSecondFactors?.find(
          (f) => f.strategy === "email_code",
        );

        // jaga2 kalo ga ketemu
        if (!factor) {
          setError("no verification method available");
          return;
        }

        // kirim kode otp ke user ini
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: factor.emailAddressId,
        });

        setStep("otp");
      }
    } catch (err) {
      console.log(err);
      setLoading(false);
      await signIn.reload();
      setError("invalid username or password");
    }
  };

  const verifyCode = async () => {
    if (!isLoaded || !signIn || !setActive || loading) return;

    try {
      setLoading(true);

      // cek kode otp ke clerk
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });

      // klo bener bikin session terus redirect ke home
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
    <div className="flex items-center justify-center h-[100vh]">
      <title>sign in</title>

      <div className="flex flex-col gap-3">
        <h1 className="font-bold text-[26px]">plotify</h1>
        {step === "login" && (
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
              className="google-btn border py-3 px-6 w-[350px] cursor-pointer relative overflow-hidden"
              onClick={handleGoogleSignIn}
            >
              continue with google
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

            {error && <p className="text-red-500 max-w-sm">{error}</p>}

            <div className="flex gap-5 mt-3">
              <span
                className={`${loading ? "text-gray-500 opacity-70 pointer-events-none" : "underline cursor-pointer"}`}
                onClick={handleSignin}
              >
                {loading ? "processing..." : "login"}
              </span>

              <Link to="/forgot">
                <span
                  className={`underline cursor-pointer ${loading ? "hidden" : ""}`}
                >
                  forgot password
                </span>
              </Link>
            </div>
          </>
        )}

        {step === "otp" && (
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
      </div>
    </div>
  );
};

export default Signin;
