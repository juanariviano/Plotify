import { Routes, Route } from "react-router";
import { ProtectedRoute, PublicRoute } from "./components/AuthRoutes";

import Home from "./page/menus/Home";
import Screen from "./page/menus/Screen";
import Read from "./page/menus/Read";
import Profile from "./page/profiles/Profile";
import Card from "./page/menus/Card";
import Add from "./page/menus/Add";
import Signin from "./page/auth/Signin";
import Signup from "./page/auth/Signup";
import Forgot from "./page/auth/Forgot";
import Reset from "./page/auth/Reset";
import ChangePassword from "./page/auth/ChangePassword";
import EditProfile from "./page/profiles/EditProfile";
import VerifySignup from "./page/auth/VerifySignup";
import Page404 from "./page/error/page404";
import Page500 from "./page/error/page500";
import SsoCallback from "./components/auth/SsoCallback";

function App() {
  return (
    <Routes>
      // auth
      <Route path="/ssocallback" element={<SsoCallback />} />
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
  );
}

export default App;
