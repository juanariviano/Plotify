import { Routes, Route, Navigate } from "react-router";
import { SignedIn } from "@clerk/clerk-react";
import { lazy, Suspense } from "react";
import { ProtectedRoute, PublicRoute } from "./components/AuthRoutes";
import { useCacheGuard } from "./hooks/useCacheGuard";
import LoadingScreen from "./components/ui/LoadingScreen";
import { routeLoaders } from "./lib/routeLoaders";
import Home from "./page/menus/Home";

const Screen = lazy(routeLoaders["/screen"]);
const Read = lazy(routeLoaders["/read"]);
const Profile = lazy(routeLoaders["/profile"]);
const Card = lazy(() => import("./page/menus/Card"));
const Add = lazy(routeLoaders["/add"]);
const AddBulk = lazy(() => import("./page/menus/AddBulk"));
const Import = lazy(() => import("./page/menus/Import"));
const Recap = lazy(() => import("./page/recap/Recap"));
const Donate = lazy(() => import("./page/menus/Donate"));
const ChatWidget = lazy(() => import("./components/chat/ChatWidget"));
const FeedbackPrompt = lazy(() => import("./components/feedback/FeedbackPrompt"));
const Signin = lazy(routeLoaders["/signin"]);
const Signup = lazy(routeLoaders["/signup"]);
const Forgot = lazy(() => import("./page/auth/Forgot"));
const Reset = lazy(() => import("./page/auth/Reset"));
const ChangePassword = lazy(() => import("./page/auth/ChangePassword"));
const EditProfile = lazy(() => import("./page/profiles/EditProfile"));
const VerifySignup = lazy(() => import("./page/auth/VerifySignup"));
const Page404 = lazy(() => import("./page/error/page404"));
const Page500 = lazy(() => import("./page/error/page500"));
const SsoCallback = lazy(() => import("./components/auth/SsoCallback"));

function App() {
  useCacheGuard();

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          // auth
          <Route path="/ssocallback" element={<SsoCallback />} />
          <Route path="/v1/oauth_callback" element={<Navigate to="/" replace />} />
          // public
          <Route
            path="/signin"
            element={
              <PublicRoute>
                <Signin />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route path="/verifysignup" element={<VerifySignup />} />
          <Route
            path="/forgot"
            element={
              <PublicRoute>
                <Forgot />
              </PublicRoute>
            }
          />
          <Route
            path="/reset"
            element={
              <PublicRoute>
                <Reset />
              </PublicRoute>
            }
          />
          // public
          <Route index element={<Home />} />
          <Route path="/donate" element={<Donate />} />
          // protected
          <Route
            path="/screen"
            element={
              <ProtectedRoute>
                <Screen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/read"
            element={
              <ProtectedRoute>
                <Read />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/card"
            element={
              <ProtectedRoute>
                <Card />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add"
            element={
              <ProtectedRoute>
                <Add />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add/bulk"
            element={
              <ProtectedRoute>
                <AddBulk />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add/import"
            element={
              <ProtectedRoute>
                <Import />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recap/:year"
            element={
              <ProtectedRoute>
                <Recap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/changepassword"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editprofile"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/servererror" element={<Page500 />} />
          <Route path="*" element={<Page404 />} />
        </Routes>
      </Suspense>
      <SignedIn>
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
        <Suspense fallback={null}>
          <FeedbackPrompt />
        </Suspense>
      </SignedIn>
    </>
  );
}

export default App;
