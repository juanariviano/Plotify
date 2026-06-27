import { Link } from "react-router";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import { useClerk, useUser } from "@clerk/clerk-react";
import { getUserData } from "../../services/profile.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import "../../styles/animations.css";

const Profile = () => {
  const page: string = window.location.pathname;
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data: profile,
    isLoading: profileLoading,
    isFetching,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user id");
      return getUserData(user.id);
    },
    enabled: !!isLoaded && !!user?.id,
    staleTime: 1000 * 60 * 10,
  });

  const loading = !isLoaded || profileLoading || isFetching;
  const hasPassword = user?.passwordEnabled;

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
  }, [loading]);

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

  return (
    <>
      <title>profile</title>

      <div className="relative min-h-screen bg-white lowercase text-[#111111]">
        <div className="landing-ambient" aria-hidden="true" />

        <div ref={containerRef} className="relative z-10 flex min-h-screen w-full flex-col">
          <div className="w-full">
            <Navbar page={page} />
          </div>

          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-8 sm:px-10 lg:py-12">
            <div className="flex w-full max-w-[220px] flex-col items-center gap-8 sm:max-w-[260px] lg:mx-auto lg:w-auto lg:max-w-none lg:flex-row lg:items-center lg:justify-center lg:gap-20">
              <div className="reveal landing-card w-full shrink-0 overflow-hidden bg-[#f7f6f3] lg:w-60">
                <img
                  src={profile?.profile_image_url || "default-profile-pic.png"}
                  alt="profile"
                  className="aspect-square w-full object-cover lg:h-60 lg:w-60"
                />
              </div>

              <div className="reveal flex w-full flex-col items-center text-center lg:max-w-md lg:items-start lg:text-left">
                <span className="mb-4 inline-block w-fit border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
                  profile
                </span>

                <h1 className="text-xl font-bold sm:text-2xl lg:text-[26px]">
                  {profile?.fullname.toLowerCase()}
                </h1>
                <p className="mt-2 font-mono text-sm text-gray-400">
                  @{profile?.username}
                </p>

                <div className="mt-8 flex w-full flex-col gap-3 lg:mt-10 lg:items-start">
                  {hasPassword && (
                    <Link
                      to="/changepassword"
                      className="action-btn w-full text-center lg:w-fit"
                    >
                      change password
                    </Link>
                  )}

                  <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:flex-wrap">
                    <Link
                      to="/editprofile"
                      className="action-btn w-full text-center lg:w-fit"
                    >
                      edit
                    </Link>
                    <button
                      type="button"
                      onClick={loggingOut}
                      className="action-btn w-full lg:w-fit"
                    >
                      logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    </>
  );
};

export default Profile;
