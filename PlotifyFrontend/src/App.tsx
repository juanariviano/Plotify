import { Routes, Route, Navigate } from "react-router";
import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { ProtectedRoute, PublicRoute } from "./components/AuthRoutes";
import { useCacheGuard } from "./hooks/useCacheGuard";
import LoadingScreen from "./components/ui/LoadingScreen";
import Home from "./page/menus/Home";

// every page except the landing one is its own chunk, so the first load stays small
const pages: (() => Promise<unknown>)[] = [];
const page = <T extends ComponentType>(load: () => Promise<{ default: T }>) => {
  pages.push(load);
  return lazy(load);
};

const Screen = page(() => import("./page/menus/Screen"));
const Read = page(() => import("./page/menus/Read"));
const Profile = page(() => import("./page/profiles/Profile"));
const Card = page(() => import("./page/menus/Card"));
const Add = page(() => import("./page/menus/Add"));
const ChatWidget = page(() => import("./components/chat/ChatWidget"));
const Signin = page(() => import("./page/auth/Signin"));
const Signup = page(() => import("./page/auth/Signup"));
const Forgot = page(() => import("./page/auth/Forgot"));
const Reset = page(() => import("./page/auth/Reset"));
const ChangePassword = page(() => import("./page/auth/ChangePassword"));
const EditProfile = page(() => import("./page/profiles/EditProfile"));
const VerifySignup = page(() => import("./page/auth/VerifySignup"));
const Page404 = page(() => import("./page/error/page404"));
const Page500 = page(() => import("./page/error/page500"));
const SsoCallback = page(() => import("./components/auth/SsoCallback"));

// once the current page is up, fetch the other chunks quietly so later
// navigation never waits on the network
const preloadPages = () => {
  const run = () => pages.forEach((load) => void load().catch(() => {}));
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
};

function App() {
  useCacheGuard();

  useEffect(preloadPages, []);

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
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </>
  );
}

export default App;
