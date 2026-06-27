import axios from "axios";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  getUserData,
  uploadImageProfile,
  editProfileData,
  deleteAccount,
  deleteImageProfile,
} from "../../services/profile.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Footer from "../../components/ui/Footer";
import "../../styles/animations.css";

const EditProfile = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const { getToken } = useAuth();

  const [preview, setPreview] = useState<string | null>(null);
  const [currImage, setCurrImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [emailVerification, setEmailVerification] = useState(false);
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [confirmationDelete, setConfirmationDelete] = useState(false);
  const [email, setEmail] = useState("");
  const [oldEmail, setOldEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const hasPassword = user?.passwordEnabled;

  type EmailAddressType = Awaited<
    ReturnType<NonNullable<typeof user>["createEmailAddress"]>
  >;
  const [emailAddressClerk, setEmailAddressClerk] =
    useState<EmailAddressType | null>(null);
  const [code, setCode] = useState("");
  const [delProfilePic, setDelProfilePic] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user id");
      return getUserData(user.id);
    },
    enabled: !!isLoaded && !!user?.id,
  });

  const pageLoading = !isLoaded || profileLoading;

  useEffect(() => {
    if (!profile) return;

    setCurrImage(profile.profile_image_url);
    setUsername(profile.username);
    setFullname(profile.fullname);
    setEmail(profile.email);
    setOldEmail(profile.email);
  }, [profile]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || pageLoading) return;

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
  }, [pageLoading, emailVerification]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const [editLoading, setEditLoading] = useState(false);

  const handleUpload = async () => {
    setEditLoading(true);

    if (!fullname || !username || !email) {
      setError("please fill in all fields");
      setEditLoading(false);
      return;
    }

    if (username.includes(" ")) {
      setError("username cannot contains space");
      setEditLoading(false);
      return;
    }

    const token = await getToken();

    const formData = new FormData();

    if (file) {
      formData.append("profile_image", file);
    }

    try {
      if (file) {
        await deleteImageProfile(token);
        await uploadImageProfile(formData, token);
      }

      if (oldEmail !== email) {
        if (!user) return;

        const emailAddress = await user.createEmailAddress({
          email: email,
        });

        await emailAddress?.prepareVerification({
          strategy: "email_code",
        });

        setEmailAddressClerk(emailAddress);

        setEmailVerification(true);

        return;
      }

      await editProfileData({
        fullname,
        username,
        email,
        clerkId: user?.id,
        token,
      });

      if (delProfilePic) {
        await deleteImageProfile(token);
      }

      await queryClient.invalidateQueries({
        queryKey: ["profile", user?.id],
      });

      navigate("/profile");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message);
      }
      setEditLoading(false);
    } finally {
      setEditLoading(false);
    }
  };

  const verifyCode = async () => {
    try {
      if (!emailAddressClerk) return;
      const result = await emailAddressClerk.attemptVerification({
        code: code,
      });

      if (result.verification.status === "verified") {
        await user?.update({
          primaryEmailAddressId: result.id,
        });
      }

      const token = await getToken();

      await user?.reload();
      const latestEmail = user?.primaryEmailAddress?.emailAddress;

      console.log("fullname: ", fullname);
      console.log("username: ", username);

      await editProfileData({
        fullname,
        username,
        email: latestEmail!,
        clerkId: user?.id,
        token,
      });

      navigate("/profile");
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteAccount = async () => {
    const token = await getToken();

    try {
      setDeleteLoading(true);

      await deleteAccount(token);

      await signOut({
        redirectUrl: "/signin",
      });
    } catch (err) {
      console.log(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (pageLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative min-h-screen bg-white lowercase text-[#111111]">
      {deleteLoading && <LoadingScreen />}

      {confirmationDelete && (
        <div className="modal-overlay">
          <div className="modal-panel flex flex-col items-center gap-4 text-center">
            <p>are you sure to delete your account?</p>
            <p className="text-xs text-gray-400">
              this permanently removes your profile and all saved items.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                className="action-btn-danger"
                onClick={handleDeleteAccount}
              >
                yes
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={() => setConfirmationDelete(false)}
              >
                no
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="landing-ambient" aria-hidden="true" />

      <div ref={containerRef} className="relative z-10">
        <title>edit profile</title>

        <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-16 sm:px-10 lg:py-24">
          {!emailVerification ? (
            <>
              <div className="reveal mb-10 flex flex-col items-center">
                <input
                  type="file"
                  accept="image/*"
                  id="fileInput"
                  name="profile_image"
                  hidden
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="fileInput"
                  className="landing-card group relative block h-60 w-60 cursor-pointer overflow-hidden bg-[#f7f6f3]"
                >
                  {preview && !error ? (
                    <img
                      src={preview}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : currImage ? (
                    delProfilePic ? (
                      <img
                        src="default-profile-pic.png"
                        alt="profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={currImage}
                        alt="profile"
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <img
                      src="default-profile-pic.png"
                      alt="profile"
                      className="h-full w-full object-cover"
                    />
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 px-4 text-center text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {currImage
                      ? delProfilePic
                        ? "upload new profile"
                        : "change profile pic"
                      : "upload new profile"}
                  </div>
                </label>

                {currImage ? (
                  <button
                    type="button"
                    className={`mt-4 ${delProfilePic ? "action-btn" : "action-btn-danger"}`}
                    onClick={() => setDelProfilePic(!delProfilePic)}
                  >
                    {delProfilePic
                      ? "restore profile pic"
                      : "delete profile picture"}
                  </button>
                ) : (
                  ""
                )}

                {error && <p className="field-error mt-5">{error}</p>}
              </div>

              <div className="reveal flex w-full max-w-[350px] flex-col gap-3">
                <input
                  type="text"
                  className="field-input"
                  placeholder="full name"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                />

                <input
                  type="text"
                  className="field-input"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <div className="group relative w-full">
                  <input
                    type="email"
                    disabled={!hasPassword}
                    className={`field-input ${!hasPassword ? "cursor-not-allowed bg-[#f7f6f3] opacity-60" : ""}`}
                    placeholder="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  {!hasPassword && (
                    <div className="pointer-events-none absolute bottom-[110%] left-0 mb-2 w-max max-w-[280px] border border-[#eaeaea] bg-[#f7f6f3] px-3 py-2 text-xs text-gray-400 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      signed in using google account, email cannot be changed
                    </div>
                  )}
                </div>

                <p className="hidden text-green-400">
                  verification email was sent! <br /> please check your email.
                </p>

                <div className="mt-6 flex flex-col gap-4 border-t border-[#eaeaea] pt-6">
                  {!editLoading && (
                    <>
                      <button
                        type="button"
                        className="action-btn-danger w-fit"
                        onClick={() => setConfirmationDelete(true)}
                      >
                        delete account
                      </button>
                      <p className="text-xs text-gray-400">
                        permanent action. all saved screen and read entries will be removed.
                      </p>
                    </>
                  )}

                  <div className="flex gap-3">
                    {!editLoading && (
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => navigate(-1)}
                      >
                        cancel
                      </button>
                    )}

                    <button
                      type="button"
                      className={`action-btn ${editLoading ? "cursor-not-allowed opacity-50" : ""}`}
                      onClick={handleUpload}
                      disabled={editLoading}
                    >
                      {editLoading ? "processing..." : "save"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="reveal flex w-full max-w-[350px] flex-col gap-3">
              <input
                type="text"
                placeholder="verification code"
                className="field-input"
                onChange={(e) => setCode(e.target.value)}
              />

              <button type="button" className="action-btn w-fit" onClick={verifyCode}>
                verify email
              </button>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default EditProfile;
