import { useNavigate } from "react-router";
import { useUser, useReverification } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import type { ClerkError } from "../../types/auth";
import { Eye, EyeOff } from "lucide-react";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Footer from "../../components/ui/Footer";
import "../../styles/animations.css";

const ChangePassword = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState(false);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || loading) return;

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
      setLoading(false);

      const clerkError = err as ClerkError;

      setError(
        clerkError.errors?.[0]?.longMessage || "failed to change password",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative min-h-screen bg-white lowercase text-[#111111]">
      <div className="landing-ambient" aria-hidden="true" />

      <div ref={containerRef} className="relative z-10 flex min-h-screen flex-col">
        <title>change password</title>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 sm:px-10">
          <div className="reveal flex w-full max-w-[350px] flex-col gap-3">
            <span className="mb-4 inline-block w-fit border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
              security
            </span>

            <h1 className="mb-6 text-2xl font-bold sm:text-[26px]">change password</h1>

            <div className="relative w-full">
              <input
                type={showOldPassword ? "text" : "password"}
                className="field-input pr-12"
                value={currentPassword}
                placeholder="old password"
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
              >
                {showOldPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            <div className="relative w-full">
              <input
                type={showPassword ? "text" : "password"}
                className="field-input pr-12"
                value={newPassword}
                placeholder="new password"
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
              >
                {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            <div className="relative w-full">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="field-input pr-12"
                value={confirmPassword}
                placeholder="confirm password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
              >
                {showConfirmPassword ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            {error && <p className="field-error">{error}</p>}
            {success && <p className="text-sm text-gray-400">{success}</p>}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="action-btn"
                onClick={() => navigate(-1)}
              >
                {changes ? "back" : "cancel"}
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={handleChangePassword}
              >
                save
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default ChangePassword;
