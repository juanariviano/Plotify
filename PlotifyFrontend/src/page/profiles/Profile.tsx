import { Link } from "react-router";
import { useClerk } from "@clerk/clerk-react";
import { motion } from "motion/react";
import { ChevronRight, KeyRound, LogOut, Pencil } from "lucide-react";
import { useEffect } from "react";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Cover from "../../components/ui/Cover";
import CountUp from "../../components/ui/CountUp";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { StarDisplay } from "../../components/ui/Stars";
import { Reveal } from "../../components/motion";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { useMediaSlice } from "../../hooks/useMediaSummary";
import { useProfile } from "../../hooks/useProfile";
import { btn, unitOf } from "../../lib/ui";
import type { Media } from "../../types/media";

const Profile = () => {
  const { signOut } = useClerk();
  const { data: profile, isLoading: profileLoading, missing, user, isLoaded } = useProfile();

  const screenOngoing = useMediaSlice("screen", false, 6);
  const readOngoing = useMediaSlice("read", false, 6);
  const screenDone = useMediaSlice("screen", true, 50);
  const readDone = useMediaSlice("read", true, 50);

  const loading = !isLoaded || profileLoading || missing;
  const hasPassword = user?.passwordEnabled;

  useEffect(() => {
    document.title = "profile · plotify";
  }, []);

  const loggingOut = async () => {
    try {
      await signOut({ redirectUrl: "/signin" });
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return <LoadingScreen canExit={true} onFinish={() => {}} />;
  }

  const ongoing: Media[] = [...(screenOngoing.data?.data ?? []), ...(readOngoing.data?.data ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);
  const finished: Media[] = [...(screenDone.data?.data ?? []), ...(readDone.data?.data ?? [])];
  const favourites = [...finished].sort((a, b) => b.rating - a.rating).slice(0, 3);

  const totals = [
    { label: "on your shelves now", value: (screenOngoing.data?.total ?? 0) + (readOngoing.data?.total ?? 0) },
    { label: "finished", value: (screenDone.data?.total ?? 0) + (readDone.data?.total ?? 0) },
    { label: "shows finished", value: screenDone.data?.total ?? 0 },
    { label: "reads finished", value: readDone.data?.total ?? 0 },
  ];

  const categoryCounts = Object.entries(
    [...finished, ...ongoing].flatMap((m) => m.category ?? []).reduce<Record<string, number>>((acc, c) => {
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topCategory = categoryCounts[0]?.[1] ?? 1;

  const ratingBuckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: finished.filter((m) => Math.round(m.rating) === stars).length,
  }));
  const topBucket = Math.max(1, ...ratingBuckets.map((b) => b.count));

  const since = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase()
    : "";
  const name = (profile?.fullname || "").toLowerCase();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-12 pb-24 sm:px-10">
        <motion.section
          className="mb-10 flex flex-wrap items-end gap-x-8 gap-y-6"
          initial="hidden"
          animate="show"
          variants={stagger(0.08)}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.9, rotate: -3 },
              show: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.8, ease: easeOut } },
            }}
            className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden bg-[#3b4a3f] font-serif text-6xl text-white sm:h-32 sm:w-32"
          >
            {profile?.profile_image_url ? (
              <img src={profile.profile_image_url} alt={name} className="h-full w-full object-cover" />
            ) : (
              name.charAt(0) || "·"
            )}
          </motion.div>
          <motion.div variants={fadeUp} className="min-w-0 flex-[1_1_320px]">
            <h1 className="mb-1.5 font-serif text-[48px] leading-none tracking-[-0.025em] break-words sm:text-[56px]">{name}</h1>
            <p className="text-[15px] text-muted">
              @{profile?.username}
              {since && <> · keeping a shelf since {since}</>}
            </p>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
            <Link to="/editprofile" className={btn("secondary", "md")}>
              <Pencil size={15} /> edit profile
            </Link>
            {hasPassword && (
              <Link to="/changepassword" className={btn("secondary", "md")}>
                <KeyRound size={15} /> password
              </Link>
            )}
            <button type="button" onClick={loggingOut} className={btn("ghost", "md")}>
              <LogOut size={15} /> sign out
            </button>
          </motion.div>
        </motion.section>

        <Reveal className="mb-14 grid grid-cols-2 border-t border-ink border-b border-b-line md:grid-cols-4">
          {totals.map((t) => (
            <div key={t.label} className="py-5 pr-4">
              <CountUp value={t.value} className="block font-serif text-[44px] leading-none" />
              <span className="mt-1.5 block text-[13px] text-muted">{t.label}</span>
            </div>
          ))}
        </Reveal>

        {ongoing.length > 0 && (
          <Reveal className="mb-14">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-[28px]">on your shelves right now</h2>
              <Link to="/screen" className="text-sm text-muted transition-colors hover:text-ink">see all</Link>
            </div>
            <motion.div
              className="grid grid-cols-2 gap-4 md:grid-cols-4"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={stagger(0.08)}
            >
              {ongoing.map((m) => (
                <motion.div key={m.id} variants={fadeUp}>
                  <Link to={`/card?id=${m.id}`} className="group flex items-center gap-3 border border-line bg-white p-3 transition-colors hover:border-ink">
                    <Cover title={m.title} src={m.image_url} showTitle={false} className="h-[60px] w-11 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{m.title}</span>
                      <span className="block font-mono text-xs text-muted">
                        {unitOf(m.type).short} {m.last_episode}
                      </span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </Reveal>
        )}

        <div className="flex flex-wrap gap-12">
          <Reveal className="min-w-0 flex-[1_1_340px]">
            <h2 className="mb-2 border-b border-ink pb-2.5 font-serif text-[26px]">all-time favourites</h2>
            {favourites.length ? (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {favourites.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 20, rotate: i === 1 ? 0 : i === 0 ? -2 : 2 }}
                    whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: easeOut, delay: i * 0.1 }}
                  >
                    <Link to={`/card?id=${m.id}`} className="group block">
                      <Cover title={m.title} src={m.image_url} className="aspect-[3/4] w-full" titleClassName="text-base" />
                      <span className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                        <StarDisplay rating={m.rating} size={11} /> {m.type}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">finish and rate something to see it here.</p>
            )}
          </Reveal>

          <Reveal className="min-w-0 flex-[1_1_300px]" delay={0.1}>
            <h2 className="mb-2 border-b border-ink pb-2.5 font-serif text-[26px]">how you rate</h2>
            {finished.length ? (
              <ul className="mt-3">
                {ratingBuckets.map((b, i) => (
                  <li key={b.stars} className="flex items-center gap-3 py-2">
                    <span className="w-14 shrink-0">
                      <StarDisplay rating={b.stars} size={10} />
                    </span>
                    <span className="h-3 flex-1 bg-track">
                      <motion.span
                        className="block h-3 bg-accent"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(b.count / topBucket) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: easeOut, delay: 0.1 + i * 0.07 }}
                      />
                    </span>
                    <span className="w-6 text-right font-mono text-xs text-muted">{b.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">no ratings yet.</p>
            )}
          </Reveal>

          {categoryCounts.length > 0 && (
            <Reveal className="min-w-0 flex-[1_1_300px]" delay={0.2}>
              <h2 className="mb-2 border-b border-ink pb-2.5 font-serif text-[26px]">what you're into</h2>
              <ul className="mt-3">
                {categoryCounts.map(([cat, count], i) => (
                  <li key={cat} className="flex items-center gap-3 py-2">
                    <span className="w-24 shrink-0 truncate text-sm">{cat}</span>
                    <span className="h-3 flex-1 bg-track">
                      <motion.span
                        className="block h-3 bg-ink"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(count / topCategory) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: easeOut, delay: 0.1 + i * 0.07 }}
                      />
                    </span>
                    <span className="w-6 text-right font-mono text-xs text-muted">{count}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>

        <Reveal>
          <Link
            to="/editprofile"
            className="group mt-14 flex items-center gap-4 border border-line bg-white px-6 py-5 transition-colors hover:border-ink"
          >
            <span className="flex-1">
              <span className="block font-medium">account and settings</span>
              <span className="mt-0.5 block text-[13px] text-muted">name, photo, email, sign out, delete account</span>
            </span>
            <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
