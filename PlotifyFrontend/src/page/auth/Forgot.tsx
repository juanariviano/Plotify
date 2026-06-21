import { useSignIn } from "@clerk/clerk-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import LoadingScreen from "../../components/ui/LoadingScreen";

const Forgot = () => {
  const navigate = useNavigate();

  const { isLoaded, signIn } = useSignIn();

  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      <title>forgot password</title>
      <div className="flex flex-col gap-3">
        <h1 className="font-bold text-[26px]">plotify</h1>
        <p>enter email of your registered account</p>
        <input
          type="email"
          className="border py-4 px-6 w-[350px]"
          placeholder="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        {success && (
          <p className="text-green-400">
            reset email was sent!
            please check your email.
          </p>
        )}

        {error && (
          <p className="text-red-500">
            {error}
          </p>
        )}

        <span className="underline cursor-pointer mt-3" onClick={handleReset}>reset</span>
      </div>
    </div>
  );
};

export default Forgot;
