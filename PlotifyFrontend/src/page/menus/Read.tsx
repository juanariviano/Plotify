import { Link } from "react-router";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Item from "../../components/ui/Item";
import { getMediaData } from "../../services/media.service";
import { useAuth } from "@clerk/clerk-react";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { Media } from "../../types/media";
import "../../styles/animations.css";

const Read = () => {
  const page: string = window.location.pathname;
  const itemAdd: string = page.slice(1);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { getToken } = useAuth();

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["media"],
    queryFn: async () => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      return getMediaData(token);
    },
    staleTime: 1000 * 60 * 10,
  });

  const filteredMedia = media.filter((item: Media) =>
    item.title.toLowerCase().includes(search.toLowerCase()),
  );

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
  }, [isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <title>read</title>

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
                placeholder="search your reads"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Link to={`/add?item=${itemAdd}`}>
                <button className="cursor-pointer border border-[#eaeaea] px-4 py-3 whitespace-nowrap transition-all duration-500 ease-in-out hover:bg-black hover:text-white active:scale-[0.98] sm:px-6 sm:py-4">
                  add new
                </button>
              </Link>
            </div>

            <Item page={page} data={filteredMedia} />
          </div>

          <Footer />
        </div>
      </div>
    </>
  );
};

export default Read;
