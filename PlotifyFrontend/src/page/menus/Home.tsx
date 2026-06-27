import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";
import Footer from "../../components/ui/Footer";
import Navbar from "../../components/ui/Navbar";
import "../../styles/animations.css";

const Home = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isSignedIn } = useAuth();

  const authPath = (path: string) => (isSignedIn ? path : "/signin");

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
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-white lowercase text-[#111111]">
      <title>plotify</title>

      <div className="landing-ambient" aria-hidden="true" />

      <div className="relative z-10">
        <div className="w-full">
          <Navbar page="/" />
        </div>

        <main>
          {/* hero */}
          <section className="mx-auto max-w-5xl px-6 pb-24 pt-16 sm:px-10 sm:pb-32 sm:pt-24">
            <div className="reveal max-w-3xl">
              <p className="mb-6 text-xs tracking-[0.12em] text-gray-400">
                personal media journal
              </p>
              <h1
                className="mb-8 text-[2.75rem] leading-[1.08] tracking-[-0.03em] sm:text-[4rem]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                remember where you left off
              </h1>
              <p className="mb-12 max-w-xl text-lg leading-relaxed text-gray-400">
                a quiet notebook for the shows you watch and the books you read. log your last
                episode, your last page, and pick up exactly where you stopped.
              </p>
              <Link to={authPath("/screen")}>
                <button className="cursor-pointer border px-6 py-4 transition-all duration-500 ease-in-out hover:bg-black hover:text-white active:scale-[0.98]">
                  save your progress
                </button>
              </Link>
            </div>
          </section>

          {/* bento grid */}
          <section className="mx-auto max-w-5xl px-6 py-24 sm:px-10">
            <div className="reveal mb-12 max-w-2xl">
              <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
                two shelves, one place
              </h2>
              <p className="leading-relaxed text-gray-400">
                screen and read live side by side. search, sort, and update without digging through
                notes or browser tabs.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              <div
                className="reveal landing-card bg-[#f9f9f8] p-8 sm:col-span-2 lg:col-span-7 lg:p-10"
                style={{ transitionDelay: "80ms" }}
              >
                <span className="mb-4 inline-block border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
                  screen
                </span>
                <h3 className="mb-3 text-xl font-bold">track every watch</h3>
                <p className="mb-8 leading-relaxed text-gray-400">
                  add a title, drop in a cover, and note the last episode you finished. ongoing
                  series stay up front until you mark them done.
                </p>
                <div className="overflow-hidden border border-[#eaeaea] bg-white">
                  <div className="flex items-center gap-2 border-b border-[#eaeaea] px-4 py-3">
                    <span className="h-2.5 w-2.5 bg-gray-300" />
                    <span className="h-2.5 w-2.5 bg-gray-300" />
                    <span className="h-2.5 w-2.5 bg-gray-300" />
                    <span className="ml-3 font-mono text-xs text-gray-400">screen</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 p-4">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex flex-col gap-2">
                        <div className="aspect-[3/4] bg-[#f7f6f3]" />
                        <div className="h-2 w-3/4 bg-[#eaeaea]" />
                        <div className="h-2 w-1/2 bg-[#f7f6f3]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="reveal landing-card bg-white p-8 lg:col-span-5 lg:p-10"
                style={{ transitionDelay: "160ms" }}
              >
                <span className="mb-4 inline-block border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
                  read
                </span>
                <h3 className="mb-3 text-xl font-bold">books and chapters</h3>
                <p className="mb-6 leading-relaxed text-gray-400">
                  same flow for novels, manga, and long reads. last page, source link, and
                  categories in one card.
                </p>
                <div className="space-y-3 border-t border-[#eaeaea] pt-6">
                  {[
                    { title: "the three-body problem", meta: "page 214" },
                    { title: "vinland saga", meta: "chapter 98" },
                    { title: "project hail mary", meta: "page 88" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center justify-between border-b border-[#eaeaea] pb-3 last:border-0"
                    >
                      <span className="text-sm font-bold">{item.title}</span>
                      <span className="font-mono text-xs text-gray-400">{item.meta}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="reveal landing-card bg-white p-8 lg:col-span-4 lg:p-10"
                style={{ transitionDelay: "240ms" }}
              >
                <span className="mb-4 inline-block border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
                  complete
                </span>
                <h3 className="mb-3 text-xl font-bold">finish and rate</h3>
                <p className="leading-relaxed text-gray-400">
                  when something is done, move it to completed and leave a rating out of five.
                  your shelf stays honest.
                </p>
              </div>

              <div
                className="reveal landing-card bg-[#f9f9f8] p-8 lg:col-span-8 lg:p-10"
                style={{ transitionDelay: "320ms" }}
              >
                <span className="mb-4 inline-block border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
                  detail view
                </span>
                <h3 className="mb-3 text-xl font-bold">one card, full context</h3>
                <p className="mb-8 leading-relaxed text-gray-400">
                  open any entry to edit the title, update progress, swap the cover, or jump to
                  the source you saved.
                </p>
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-gray-400">
                  <kbd className="border border-[#eaeaea] bg-[#f7f6f3] px-2 py-1">
                    last eps
                  </kbd>
                  <kbd className="border border-[#eaeaea] bg-[#f7f6f3] px-2 py-1">
                    source
                  </kbd>
                  <kbd className="border border-[#eaeaea] bg-[#f7f6f3] px-2 py-1">
                    rating
                  </kbd>
                </div>
              </div>
            </div>
          </section>

          {/* steps */}
          <section className="border-t border-[#eaeaea] bg-[#fbfbfa]">
            <div className="mx-auto max-w-5xl px-6 py-24 sm:px-10">
              <div className="reveal mb-16 max-w-2xl">
                <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  three steps, no clutter
                </h2>
                <p className="leading-relaxed text-gray-400">
                  plotify stays out of the way. add an item, update it when you watch or read,
                  archive it when you are finished.
                </p>
              </div>

              <div className="grid gap-0 sm:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "add a title",
                    body: "pick screen or read, upload a cover if you want, and set where you stopped.",
                  },
                  {
                    step: "02",
                    title: "update as you go",
                    body: "change the last episode or page anytime. search finds it in seconds.",
                  },
                  {
                    step: "03",
                    title: "close the loop",
                    body: "mark it complete, add a rating, and keep your finished shelf separate.",
                  },
                ].map((item, index) => (
                  <div
                    key={item.step}
                    className="reveal border-b border-[#eaeaea] py-8 sm:border-b-0 sm:border-r sm:px-8 sm:last:border-r-0"
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    <span className="mb-4 block font-mono text-xs text-gray-400">{item.step}</span>
                    <h3 className="mb-3 font-bold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-400">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* cta */}
          <section className="mx-auto max-w-5xl px-6 py-32 sm:px-10">
            <div className="reveal text-center">
              <h2
                className="mb-6 text-3xl tracking-[-0.02em] sm:text-4xl"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                your list is waiting
              </h2>
              <p className="mx-auto mb-10 max-w-md leading-relaxed text-gray-400">
                head to screen or read and log what you are watching tonight.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to={authPath("/screen")}>
                  <button className="cursor-pointer border px-6 py-4 transition-all duration-500 ease-in-out hover:bg-black hover:text-white active:scale-[0.98]">
                    go to screen
                  </button>
                </Link>
                <Link to={authPath("/read")}>
                  <button className="cursor-pointer border px-6 py-4 transition-all duration-500 ease-in-out hover:bg-black hover:text-white active:scale-[0.98]">
                    go to read
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Home;
