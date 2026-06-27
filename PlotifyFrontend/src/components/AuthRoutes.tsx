import { useAuth } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router";
import LoadingScreen from "./ui/LoadingScreen";

// kalo belom login -> redirect ke /signin
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();

  if (!isLoaded) return <LoadingScreen />;

  if (!isSignedIn) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  return children;
};

// kalo udah login -> redirect ke /
export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (isSignedIn) return <Navigate to="/" replace />;

  return children;
};
