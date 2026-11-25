// Primary navigation shares these imports with React.lazy.
export const routeLoaders = {
  "/screen": () => import("../page/menus/Screen"),
  "/read": () => import("../page/menus/Read"),
  "/profile": () => import("../page/profiles/Profile"),
  "/add": () => import("../page/menus/Add"),
  "/signin": () => import("../page/auth/Signin"),
  "/signup": () => import("../page/auth/Signup"),
};
