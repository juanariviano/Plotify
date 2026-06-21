import { useNavigate } from "react-router";
import { useUser, useReverification } from "@clerk/clerk-react";
import { useState } from "react";
import type { ClerkError } from "../../types/auth";
import { Eye, EyeOff } from "lucide-react";
import LoadingScreen from "../../components/ui/LoadingScreen";

const ChangePassword = () => {
  const navigate = useNavigate();
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

  // harus di fix nnti, karena masih munculin jendela ui dari clerk (biasanya minta reverifikasi)
  const updatePasswordWithReverification = useReverification(
    async () => {
      await user?.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });
    }
  );

  const handleChangePassword = async () => {
    if(loading) return;
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
      
      setSuccess("Password changed successfully");
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

  if(loading){
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col items-center justify-center h-[100vh]">
      <title>change password</title>
      <div className="flex flex-col gap-3">
        <h1 className="font-bold text-[26px]">plotify</h1>

        <div className="relative w-[350px]">
          <input
            type={showOldPassword ? "text" : "password"}
            className="border py-4 px-6 w-full pr-12"
            value={currentPassword}
            placeholder="old password"
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowOldPassword(!showOldPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
          >
            {showOldPassword ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        </div>

        <div className="relative w-[350px]">
          <input
            type={showPassword ? "text" : "password"}
            className="border py-4 px-6 w-full pr-12"
            value={newPassword}
            placeholder="new password"
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
          >
            {showPassword ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        </div>

        <div className="relative w-[350px]">
          <input
            type={showConfirmPassword ? "text" : "password"}
            className="border py-4 px-6 w-full pr-12"
            value={confirmPassword}
            placeholder="confirm password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
          >
            {showConfirmPassword ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        </div>

        {error && <p className="text-red-500 max-w-sm">{error}</p>}
        {success && <p className="text-green-500">{success}</p>}

        <div className="flex gap-3">
          <span
            className="underline cursor-pointer mt-3"
            onClick={() => {
              navigate(-1);
            }}
          >
            {changes ? 'back' : 'cancel'}
          </span>
          <span
            className="underline cursor-pointer mt-3"
            onClick={handleChangePassword}
          >
            save
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
