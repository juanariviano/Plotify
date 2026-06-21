import { useSignIn } from "@clerk/clerk-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import LoadingScreen from "../../components/ui/LoadingScreen";

const Reset = () => {
  const navigate = useNavigate();

  const { isLoaded, signIn, setActive } = useSignIn();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      if (
        typeof err === "object" &&
        err !== null &&
        "errors" in err
      ) {
        const clerkError = err as {
          errors?: { longMessage?: string }[];
        };

        setError(
          clerkError.errors?.[0]?.longMessage ||
          "something went wrong"
        );
      } else {
        setError("something went wrong");
      }
    }
  };

  if(loading){
    return <LoadingScreen />
  }

  return (
    <div className="flex items-center justify-center h-[100vh]">
      <title>reset password</title>
      <div className="flex flex-col gap-3">
        <h1 className="font-bold text-[26px]">plotify</h1>

        {step === 1 ? (
          <>
            <input
              type="text"
              placeholder="verification code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border py-4 px-6 w-[350px]"
            />

            <span
              className="underline cursor-pointer mt-3"
              onClick={() => setStep(2)}
            >
              continue
            </span>
          </>
        ) : (
          <>
            <div className="relative w-[350px]">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                className="border py-4 px-6 w-full pr-12"
                placeholder="new password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
              >
                {showConfirmPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            <div className="relative w-[350px]">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                className="border py-4 px-6 w-full pr-12"
                placeholder="new password"
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

            {error && (
                  <p className="text-red-500">
                    {error}
                  </p>
                )}

            <span
              className="underline cursor-pointer mt-3"
              onClick={handleResetPassword}
            >
              reset password
            </span>
          </>
        )}

        
      </div>
    </div>
  );
};

export default Reset;
