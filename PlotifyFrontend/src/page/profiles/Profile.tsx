import { Link } from "react-router";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import { useClerk, useUser } from "@clerk/clerk-react";
// import { useEffect, useState } from "react";
// import type { profileData } from "../../types/user";
import { getUserData } from "../../services/profile.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { useQuery } from "@tanstack/react-query";

const Profile = () => {
  const page: string = window.location.pathname;
  // buat dapetin clerk id
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  // const [loading, setLoading] = useState(true);
  // const [canExitLoading, setCanExitLoading] = useState(false);

  // const [profile, setProfile] = useState<profileData | null>(null);

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
      <Navbar page={page} />

      <div className="flex gap-15 justify-center content-center flex-wrap h-[70vh]">
        <img
          src={profile?.profile_image_url || "default-profile-pic.png"}
          alt="profile-url"
          className="w-60 h-60 object-cover"
        />

        <div className="flex flex-col justify-center">
          <h1 className="font-bold text-[26px]">
            {profile?.fullname.toLowerCase()}
          </h1>
          <p className="mt-2">@{profile?.username}</p>

          {hasPassword && (
            <span className="underline mt-10 mb-3 cursor-pointer">
              <Link to="/changepassword">change password</Link>
            </span>
          )}
          <div
            className={`flex gap-3 underline cursor-pointer ${!hasPassword && "mt-10"}`}
          >
            <span>
              <Link to="/editprofile">edit</Link>
            </span>
            <span onClick={loggingOut}>logout</span>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Profile;
