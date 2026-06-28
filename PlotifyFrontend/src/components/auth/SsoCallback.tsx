import { useClerk } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import LoadingScreen from "../ui/LoadingScreen";

const SsoCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clerk = useClerk();
  const handling = useRef(false);

  useEffect(() => {
    const errCode = searchParams.get("err_code");

    if (errCode) {
      navigate("/", { replace: true });
      return;
    }

    if (!clerk.loaded || handling.current) return;
    handling.current = true;

    clerk
      .handleRedirectCallback({
        signInForceRedirectUrl: "/verifysignup",
        signUpForceRedirectUrl: "/verifysignup",
      })
      .catch(() => {
        navigate("/", { replace: true });
      });
  }, [clerk, clerk.loaded, navigate, searchParams]);

  return (
    <>
      <LoadingScreen />
      <div id="clerk-captcha" />
    </>
  );
};

export default SsoCallback;
