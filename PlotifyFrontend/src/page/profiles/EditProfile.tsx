import axios from "axios";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "motion/react";
import { ImageUp, Lock, RotateCcw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  uploadImageProfile,
  editProfileData,
  deleteAccount,
  deleteImageProfile,
} from "../../services/profile.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import Modal from "../../components/ui/Modal";
import OtpInput from "../../components/ui/OtpInput";
import { FormError } from "../../components/auth/AuthLayout";
import { easeOut, fadeUp, stagger } from "../../lib/motion";
import { btn } from "../../lib/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "../../hooks/useProfile";

const SECTIONS = [
  { id: "profile", label: "profile" },
  { id: "email", label: "email" },
  { id: "password", label: "password" },
  { id: "session", label: "sign out" },
  { id: "danger", label: "delete account" },
];

const EditProfile = () => {
  const navigate = useNavigate();

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
  const [verifyError, setVerifyError] = useState("");

  const hasPassword = user?.passwordEnabled;

  type EmailAddressType = Awaited<
    ReturnType<NonNullable<typeof user>["createEmailAddress"]>
  >;
  const [emailAddressClerk, setEmailAddressClerk] =
    useState<EmailAddressType | null>(null);
  const [code, setCode] = useState("");
  const [delProfilePic, setDelProfilePic] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading, missing } = useProfile();

  const pageLoading = !isLoaded || profileLoading || missing;

  useEffect(() => {
    document.title = "settings · plotify";
  }, []);

  useEffect(() => {
    if (!profile) return;

    setCurrImage(profile.profile_image_url);
    setUsername(profile.username);
    setFullname(profile.fullname);
    setEmail(profile.email);
    setOldEmail(profile.email);
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setDelProfilePic(false);
    setPreview(URL.createObjectURL(selected));
  };

  const [editLoading, setEditLoading] = useState(false);

  const handleUpload = async () => {
    setEditLoading(true);
    setError(null);

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
        setError(err.response?.data?.message ?? "something went wrong");
      } else {
        setError("something went wrong");
      }
      setEditLoading(false);
    } finally {
      setEditLoading(false);
    }
  };

  const verifyCode = async () => {
    try {
      setVerifyError("");
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

      await editProfileData({
        fullname,
        username,
        email: latestEmail!,
        clerkId: user?.id,
        token,
      });

      await queryClient.invalidateQueries({
        queryKey: ["profile", user?.id],
      });

      navigate("/profile");
    } catch (error) {
      console.log(error);
      setVerifyError("that code didn't work. check it and try again.");
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

  const loggingOut = async () => {
    try {
      await signOut({ redirectUrl: "/signin" });
    } catch (err) {
      console.log(err);
    }
  };

  if (pageLoading) {
    return <LoadingScreen />;
  }

  const avatarSrc = preview ?? (delProfilePic ? null : currImage);
  const initial = (fullname || username || "·").charAt(0).toLowerCase();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      {deleteLoading && <LoadingScreen />}
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-10 pb-24 sm:px-10">
        <Breadcrumbs items={[{ label: "profile", to: "/profile" }, { label: "settings" }]} />
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="mb-10 font-serif text-[48px] leading-none tracking-[-0.025em] sm:text-[56px]"
        >
          settings
        </motion.h1>

        <AnimatePresence mode="wait">
          {emailVerification ? (
            <motion.section
              key="verify"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="max-w-md border border-line bg-white p-7"
            >
              <p className="eyebrow mb-2">confirm your new email</p>
              <h2 className="mb-2 font-serif text-3xl">check your inbox.</h2>
              <p className="mb-6 text-sm text-muted">
                we sent a 6-digit code to <span className="text-ink">{email}</span>.
              </p>
              <form
                className="flex flex-col gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  verifyCode();
                }}
              >
                <OtpInput value={code} onChange={setCode} invalid={!!verifyError} />
                <FormError message={verifyError} />
                <div className="flex gap-3">
                  <button type="submit" disabled={code.length < 6} className={btn("primary", "lg")}>
                    verify email
                  </button>
                  <button
                    type="button"
                    className={btn("secondary", "lg")}
                    onClick={() => {
                      setEmailVerification(false);
                      setEmail(oldEmail);
                      setCode("");
                    }}
                  >
                    cancel
                  </button>
                </div>
              </form>
            </motion.section>
          ) : (
            <motion.div
              key="settings"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              variants={stagger(0.07, 0.05)}
              className="flex flex-wrap items-start gap-x-16 gap-y-8"
            >
              <motion.nav
                variants={fadeUp}
                aria-label="settings sections"
                className="flex w-full flex-row flex-wrap gap-1 text-[15px] lg:sticky lg:top-8 lg:w-56 lg:flex-col"
              >
                {SECTIONS.filter((s) => s.id !== "password" || hasPassword).map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`border-l-2 border-transparent px-3.5 py-2.5 transition-colors hover:border-line-strong hover:bg-white ${
                      s.id === "danger" ? "text-danger" : "text-body hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </a>
                ))}
              </motion.nav>

              <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
                <motion.form
                  variants={fadeUp}
                  id="profile"
                  className="scroll-mt-8 border border-line bg-white p-6 sm:p-7"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpload();
                  }}
                >
                  <h2 className="mb-1 font-serif text-[26px]">profile</h2>
                  <p className="mb-6 text-sm text-muted">how your name appears around plotify.</p>

                  <div className="mb-6 flex flex-wrap items-center gap-4">
                    <label
                      htmlFor="fileInput"
                      className="group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden bg-[#3b4a3f] font-serif text-4xl text-white"
                    >
                      <AnimatePresence mode="wait">
                        {avatarSrc ? (
                          <motion.img
                            key={avatarSrc}
                            src={avatarSrc}
                            alt="profile"
                            className="h-full w-full object-cover"
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        ) : (
                          <motion.span key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {initial}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <span className="absolute inset-0 flex items-center justify-center bg-ink/55 opacity-0 transition-opacity group-hover:opacity-100">
                        <ImageUp size={20} />
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        id="fileInput"
                        name="profile_image"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <label htmlFor="fileInput" className={btn("secondary", "md", "cursor-pointer")}>
                      upload new photo
                    </label>
                    {currImage && !file && (
                      <button
                        type="button"
                        className={btn("ghost", "md", delProfilePic ? "" : "hover:text-danger")}
                        onClick={() => setDelProfilePic(!delProfilePic)}
                      >
                        {delProfilePic ? (
                          <>
                            <RotateCcw size={14} /> keep photo
                          </>
                        ) : (
                          "remove"
                        )}
                      </button>
                    )}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="set-name" className="label">full name</label>
                      <input
                        id="set-name"
                        type="text"
                        autoComplete="name"
                        className="field"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="set-user" className="label">username</label>
                      <div className="flex h-12 border border-line-strong bg-white transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgb(23_22_15/0.06)]">
                        <span className="flex items-center pr-1 pl-3.5 text-muted">@</span>
                        <input
                          id="set-user"
                          type="text"
                          autoComplete="username"
                          className="min-w-0 flex-1 bg-transparent pr-3.5 text-[15px] outline-none"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                      <p className="hint">no spaces.</p>
                    </div>
                    <div id="email" className="scroll-mt-8 sm:col-span-2">
                      <label htmlFor="set-email" className="label">email</label>
                      <input
                        id="set-email"
                        type="email"
                        autoComplete="email"
                        readOnly={!hasPassword}
                        className="field sm:max-w-md"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <p className="hint flex items-center gap-1.5">
                        {hasPassword ? (
                          "changing it sends a code to the new address first."
                        ) : (
                          <>
                            <Lock size={13} /> you signed in with google, so this email is managed by your google account.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <FormError message={error ?? ""} />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="submit" disabled={editLoading} className={btn("primary", "md")}>
                      {editLoading ? "saving…" : "save changes"}
                    </button>
                    <button type="button" disabled={editLoading} className={btn("secondary", "md")} onClick={() => navigate(-1)}>
                      cancel
                    </button>
                  </div>
                </motion.form>

                {hasPassword && (
                  <motion.section
                    variants={fadeUp}
                    id="password"
                    className="flex scroll-mt-8 flex-wrap items-center gap-x-6 gap-y-4 border border-line bg-white p-6 sm:p-7"
                  >
                    <div className="flex-[1_1_260px]">
                      <h2 className="mb-1 font-serif text-[26px]">password</h2>
                      <p className="text-sm text-muted">we'll ask for your current password, then a new one.</p>
                    </div>
                    <Link to="/changepassword" className={btn("secondary", "md")}>change password</Link>
                  </motion.section>
                )}

                <motion.section
                  variants={fadeUp}
                  id="session"
                  className="flex scroll-mt-8 flex-wrap items-center gap-x-6 gap-y-4 border border-line bg-white p-6 sm:p-7"
                >
                  <div className="flex-[1_1_260px]">
                    <h2 className="mb-1 font-serif text-[26px]">sign out</h2>
                    <p className="text-sm text-muted">your shelves stay exactly as they are.</p>
                  </div>
                  <button type="button" className={btn("secondary", "md", "border-ink")} onClick={loggingOut}>
                    sign out of this device
                  </button>
                </motion.section>

                <motion.section
                  variants={fadeUp}
                  id="danger"
                  className="scroll-mt-8 border border-[#e3b7b5] bg-danger-soft p-6 sm:p-7"
                >
                  <h2 className="mb-1 font-serif text-[26px] text-danger">delete account</h2>
                  <p className="mb-5 max-w-xl text-sm leading-relaxed text-body">
                    permanently removes your profile and every screen and read entry, including covers and ratings. this
                    can't be undone.
                  </p>
                  <button type="button" className={btn("danger", "md")} onClick={() => setConfirmationDelete(true)}>
                    delete my account…
                  </button>
                </motion.section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      <Modal
        open={confirmationDelete}
        onClose={() => !deleteLoading && setConfirmationDelete(false)}
        title="delete your account?"
        tone="danger"
      >
        <p className="mb-7 text-sm leading-relaxed text-muted">
          this permanently removes your profile and all saved items. there's no way to bring them back.
        </p>
        <div className="flex gap-3">
          <button type="button" className={btn("danger", "lg")} onClick={handleDeleteAccount} disabled={deleteLoading}>
            yes, delete everything
          </button>
          <button type="button" className={btn("secondary", "lg")} onClick={() => setConfirmationDelete(false)}>
            keep my account
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default EditProfile;
