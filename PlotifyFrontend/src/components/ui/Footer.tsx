import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";

const Footer = () => {
  const { isSignedIn } = useAuth();

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-7 text-[13px] text-muted sm:px-10">
        <span className="font-serif text-xl text-ink">plotify</span>
        <nav aria-label="footer" className="flex flex-wrap gap-6">
          {isSignedIn ? (
            <>
              <Link to="/screen" className="transition-colors hover:text-ink">screen</Link>
              <Link to="/read" className="transition-colors hover:text-ink">read</Link>
              <Link to="/profile" className="transition-colors hover:text-ink">profile</Link>
            </>
          ) : (
            <>
              <Link to="/signin" className="transition-colors hover:text-ink">sign in</Link>
              <Link to="/signup" className="transition-colors hover:text-ink">create account</Link>
            </>
          )}
        </nav>
        <span>a personal media journal</span>
      </div>
    </footer>
  );
};

export default Footer;
