import { AuthenticateWithRedirectCallback }
from "@clerk/clerk-react";

const SsoCallback = () => {
  return (
    <AuthenticateWithRedirectCallback 
      signInForceRedirectUrl="/verifysignup"
      signUpForceRedirectUrl="/verifysignup"
    />
  );
};

export default SsoCallback;