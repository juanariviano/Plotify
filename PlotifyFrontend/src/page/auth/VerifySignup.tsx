import { useAuth, useSignUp, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { completeProfile } from "../../services/auth.service";
import { getUserData } from "../../services/profile.service";
import LoadingScreen from "../../components/ui/LoadingScreen";

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
    console.log("!");
    if (!isLoaded || !user?.id) return;
    setLoading(false);

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
    <div className="flex items-center justify-center h-[100vh]">
      <title>signup</title>

      <div className="flex flex-col gap-3">
        <input
          type="text"
          className="border py-4 px-6 w-[350px]"
          placeholder="full name"
          onChange={(e) => setFullname(e.target.value)}
        />

        <input
          type="text"
          className="border py-4 px-6 w-[350px]"
          placeholder="username"
          onChange={(e) => setUsername(e.target.value)}
        />

        {error && <p className="text-red-500 max-w-sm">{error}</p>}

        <span
          className={`mt-3 ${loading ? "text-gray-500 opacity-70 pointer-events-none" : "underline cursor-pointer"}`}
          onClick={handleCompleteProfile}
        >
          {loading ? 'processing...' : 'continue to home page'}
        </span>
      </div>
    </div>
  );
};

export default VerifySignup;
