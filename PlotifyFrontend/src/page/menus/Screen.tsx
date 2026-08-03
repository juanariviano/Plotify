import Footer from "../../components/ui/Footer";
import Navbar from "../../components/ui/Navbar";
import Item from "../../components/ui/Item";
import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import "../../styles/animations.css";

const Screen = () => {
  const page: string = window.location.pathname;
  const itemAdd: string = page.slice(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const elements = root.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [debouncedSearch]);

  return (
    <>
      <title>screen</title>

      <div
        ref={containerRef}
        className="relative min-h-screen bg-white lowercase text-[#111111]"
      >
        <div className="landing-ambient" aria-hidden="true" />

        <div className="relative z-10">
          <Navbar page={page} />

          <div className="mx-auto max-w-5xl px-6 pb-16 sm:px-10">
            <div className="reveal mb-10 flex gap-2">
              <input
                type="text"
                className="flex-1 border border-[#eaeaea] bg-white px-4 py-3 outline-none transition-colors focus:border-[#111111] sm:px-6 sm:py-4"
                placeholder="search your watch"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Link to={`/add?item=${itemAdd}`}>
                <button className="cursor-pointer border border-[#eaeaea] px-4 py-3 whitespace-nowrap transition-all duration-500 ease-in-out hover:bg-black hover:text-white active:scale-[0.98] sm:px-6 sm:py-4">
                  add new
                </button>
              </Link>
            </div>

            <Item page={page} search={debouncedSearch} />
          </div>

          <Footer />
        </div>
      </div>
    </>
  );
};

export default Screen;
