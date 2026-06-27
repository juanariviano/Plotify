import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import "../../styles/animations.css";

const Navbar = ({ page }: { page: string }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSignedIn } = useAuth();

  const linkClass = (segment: string) =>
    `transition-colors hover:text-black ${page.includes(segment) ? "text-black" : "text-gray-400"}`;

  const closeMenu = () => setMenuOpen(false);

  const authLinks = (
    <>
      <Link to="/signin" className={linkClass("signin")} onClick={closeMenu}>
        sign in
      </Link>
      <Link to="/signup" className={linkClass("signup")} onClick={closeMenu}>
        sign up
      </Link>
    </>
  );

  const appLinks = (
    <>
      <Link to="/screen" className={linkClass("screen")} onClick={closeMenu}>
        screen
      </Link>
      <Link to="/read" className={linkClass("read")} onClick={closeMenu}>
        read
      </Link>
      <Link to="/profile" className={linkClass("profile")} onClick={closeMenu}>
        profile
      </Link>
    </>
  );

  return (
    <header className="relative mx-auto w-full max-w-5xl px-6 py-8 lowercase sm:px-10">
      <div className="flex w-full items-center justify-between gap-12">
        <Link
          to="/"
          className="shrink-0 text-lg font-bold tracking-tight text-[#111111]"
          onClick={closeMenu}
        >
          plotify
        </Link>

        <nav className="hidden items-center gap-8 text-sm lg:flex">
          {isSignedIn ? appLinks : authLinks}
        </nav>

        <button
          type="button"
          className="nav-toggle flex flex-col justify-center gap-[5px] lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "close menu" : "open menu"}
          aria-expanded={menuOpen}
        >
          <span className={`nav-toggle-line ${menuOpen ? "open" : ""}`} />
          <span className={`nav-toggle-line ${menuOpen ? "open" : ""}`} />
          <span className={`nav-toggle-line ${menuOpen ? "open" : ""}`} />
        </button>
      </div>

      <nav
        className={`nav-mobile-panel flex flex-col lg:hidden ${menuOpen ? "open" : ""}`}
        aria-hidden={!menuOpen}
      >
        {isSignedIn ? (
          <>
            <Link
              to="/screen"
              className={`nav-mobile-link ${linkClass("screen")}`}
              onClick={closeMenu}
            >
              screen
            </Link>
            <Link
              to="/read"
              className={`nav-mobile-link ${linkClass("read")}`}
              onClick={closeMenu}
            >
              read
            </Link>
            <Link
              to="/profile"
              className={`nav-mobile-link ${linkClass("profile")}`}
              onClick={closeMenu}
            >
              profile
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/signin"
              className={`nav-mobile-link ${linkClass("signin")}`}
              onClick={closeMenu}
            >
              sign in
            </Link>
            <Link
              to="/signup"
              className={`nav-mobile-link ${linkClass("signup")}`}
              onClick={closeMenu}
            >
              sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
