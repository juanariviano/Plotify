import { useNavigate } from "react-router";
import { useUser, useReverification } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { ClerkError } from "../../types/auth";
import Navbar from "../../components/ui/Navbar";
import Footer from "../../components/ui/Footer";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import PasswordInput from "../../components/ui/PasswordInput";
import { FormError } from "../../components/auth/AuthLayout";
import { PageEnter } from "../../components/motion";
import { btn } from "../../lib/ui";

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState(false);

  useEffect(() => {
    document.title = "change password · plotify";
  }, []);

  const updatePasswordWithReverification = useReverification(async () => {
    await user?.updatePassword({
      currentPassword,
      newPassword,
      signOutOfOtherSessions: true,
    });
  });

  const handleChangePassword = async () => {
    if (loading) return;
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("password does not match");
      return;
    }

    try {
      setLoading(true);
      setChanges(true);
      await updatePasswordWithReverification();

      setSuccess("password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      console.log(err);

      const clerkError = err as ClerkError;

      setError(
        (clerkError.errors?.[0]?.longMessage || "failed to change password").toLowerCase(),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink lowercase">
      <Navbar />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-10 pb-24 sm:px-10">
        <Breadcrumbs
          items={[
            { label: "profile", to: "/profile" },
            { label: "settings", to: "/editprofile" },
            { label: "password" },
          ]}
        />
        <PageEnter className="max-w-xl">
          <h1 className="mb-2 font-serif text-[48px] leading-none tracking-[-0.025em]">change password</h1>
          <p className="mb-9 text-muted">other devices will be signed out once it's changed.</p>

          <form
            className="flex flex-col gap-5 border border-line bg-white p-6 sm:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              handleChangePassword();
            }}
          >
            <div>
              <label htmlFor="cp-current" className="label">current password</label>
              <PasswordInput
                id="cp-current"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cp-new" className="label">new password</label>
              <PasswordInput
                id="cp-new"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cp-confirm" className="label">confirm new password</label>
              <PasswordInput
                id="cp-confirm"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <FormError message={error} />
            <AnimatePresence>
              {success && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 border-l-2 border-done bg-done-soft px-3 py-2 text-sm text-done"
                >
                  <Check size={15} /> {success}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-2 flex flex-wrap gap-3">
              <button type="submit" disabled={loading} className={btn("primary", "lg")}>
                {loading ? "saving…" : "save new password"}
              </button>
              <button type="button" className={btn("secondary", "lg")} onClick={() => navigate(-1)}>
                {changes ? "back" : "cancel"}
              </button>
            </div>
          </form>
        </PageEnter>
      </main>
      <Footer />
    </div>
  );
};

export default ChangePassword;
