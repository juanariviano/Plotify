import { Link, NavLink, useLocation } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, Plus, X } from "lucide-react";
import { useState } from "react";
import { useProfile } from "../../hooks/useProfile";
import { btn } from "../../lib/ui";
import { easeOut } from "../../lib/motion";
import Ribbon from "./Ribbon";

export const Logo = ({ light = false }: { light?: boolean }) => (
  <Link
    to="/"
    className={`flex items-center gap-2.5 font-serif text-[26px] leading-none font-medium tracking-[-0.02em] ${
      light ? "text-paper" : "text-ink"
    }`}
  >
    <Ribbon className="h-5 w-3" delay={0.1} />
    plotify
  </Link>
);

const APP_LINKS = [
  { to: "/screen", label: "screen" },
  { to: "/read", label: "read" },
];

const Avatar = () => {
  const { data: profile } = useProfile();

  const initial = (profile?.fullname || profile?.username || "·").charAt(0).toLowerCase();

  return (
    <NavLink
      to="/profile"
      aria-label="your profile"
      className={({ isActive }) =>
        `flex h-10 w-10 items-center justify-center overflow-hidden bg-[#3b4a3f] font-serif text-lg text-white transition-[outline-color] ${
          isActive ? "outline-2 outline-offset-2 outline-accent" : "outline-2 outline-offset-2 outline-transparent hover:outline-line-strong"
        }`
      }
    >
      {profile?.profile_image_url ? (
        <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </NavLink>
  );
};

const Navbar = () => {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const shelf = location.pathname.startsWith("/read") ? "read" : "screen";

  return (
    <header className="relative z-30 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center gap-8 px-5 py-4 sm:px-10">
        <Logo />

        {isSignedIn && (
          <nav aria-label="shelves" className="hidden items-center gap-6 text-sm sm:flex">
            {APP_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className="relative py-1.5">
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-ink" : "text-muted transition-colors hover:text-ink"}>
                      {link.label}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute inset-x-0 -bottom-[3px] h-0.5 bg-accent"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex-1" />

        {isSignedIn ? (
          <div className="hidden items-center gap-4 sm:flex">
            <Link to={`/add?item=${shelf}`} className={btn("primary", "md")}>
              <Plus size={16} strokeWidth={2.4} />
              add
            </Link>
            <Avatar />
          </div>
        ) : (
          <div className="hidden items-center gap-5 sm:flex">
            <Link to="/signin" className="text-sm text-ink transition-colors hover:text-accent">
              sign in
            </Link>
            <Link to="/signup" className={btn("primary", "md")}>
              start your shelf
            </Link>
          </div>
        )}

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center sm:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "close menu" : "open menu"}
          aria-expanded={open}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "x" : "menu"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="menu"
            className="overflow-hidden border-t border-line sm:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: easeOut }}
          >
            <motion.div
              className="flex flex-col px-5 py-3"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } }}
            >
              {(isSignedIn
                ? [...APP_LINKS, { to: "/profile", label: "profile" }, { to: `/add?item=${shelf}`, label: "add a title" }]
                : [
                    { to: "/signin", label: "sign in" },
                    { to: "/signup", label: "start your shelf" },
                  ]
              ).map((link) => (
                <motion.div
                  key={link.to}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                >
                  <NavLink
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex h-12 items-center border-b border-line font-serif text-2xl last:border-0 ${
                        isActive ? "text-ink" : "text-body"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
