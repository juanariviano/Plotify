import axios from "axios";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import React, { useEffect, useState } from "react";
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
  // const [initialized, setInitialized] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected)); // buat preview
    // URL.createObjectURL : buat bikin alamat url sementara untk <img>
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

    // cara ambil token di clerk
    const token = await getToken();

    // cara kirim file ke be (dokumen, gambar, file) -> pake formData
    const formData = new FormData();

    if (file) {
      // key, isi nilai/value
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
    <div className="flex flex-col items-center justify-center h-[100vh]">
      {deleteLoading && <LoadingScreen />}

      {confirmationDelete && (
        <div className="fixed inset-0 z-50 h-[100vh] w-[100vw] flex flex-col justify-center items-center bg-gray-100/50 backdrop-blur">
          <div className="flex flex-col justify-center items-center bg-white w-[350px] h-[160px]">
            <p>are you sure to delete your account?</p>

            <div className="flex gap-7 mt-7">
              <span
                className="cursor-pointer underline"
                onClick={handleDeleteAccount}
              >
                yes
              </span>
              <span
                className="cursor-pointer underline"
                onClick={() => setConfirmationDelete(false)}
              >
                no
              </span>
            </div>
          </div>
        </div>
      )}

      <title>edit profile</title>
      <div className="flex flex-col gap-3">
        {!emailVerification ? (
          <>
            <div className="flex flex-col items-center mb-10">
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
                className="relative border h-60 w-60 cursor-pointer overflow-hidden group"
              >
                {preview && !error ? (
                  <img src={preview} className="h-full w-full object-cover" />
                ) : currImage ? (
                  delProfilePic ? (
                    <img
                      src="default-profile-pic.png"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={currImage}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <img
                    src="default-profile-pic.png"
                    className="h-full w-full object-cover"
                  />
                )}

                {/* for hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                  <p className="text-white text-center px-4">
                    {currImage
                      ? delProfilePic
                        ? "upload new profile"
                        : "change profile pic"
                      : "upload new profile"}
                  </p>
                </div>
              </label>

              {currImage ? (
                <span
                  className="mt-3 underline cursor-pointer"
                  onClick={() => setDelProfilePic(!delProfilePic)}
                >
                  {delProfilePic
                    ? "restore profile pic"
                    : "delete profile picture"}
                </span>
              ) : (
                ""
              )}

              {error && <p className="text-red-500 mt-5">{error}</p>}
            </div>

            <input
              type="text"
              className="border py-4 px-6 w-[350px]"
              placeholder="full name"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
            />

            <input
              type="text"
              className="border py-4 px-6 w-[350px]"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <div className="relative group w-[350px]">
              <input
                type="email"
                disabled={!hasPassword}
                className={`border py-4 px-6 w-[350px] ${!hasPassword ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}`}
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              {/* tooltip pemberitahuan */}
              {!hasPassword && (
                <div
                  className="absolute bottom-[110%] left-1/2 -translate-x-1/2 mb-2 w-max bg-black text-white text-[12px] py-3 px-4 shadow-lg z-50 pointer-events-none 
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                  transition-all duration-500 ease-in-out transform translate-y-2 group-hover:translate-y-0"
                >
                  signed in using google account, email cannot be changed
                  {/* Panah kecil di bawah tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black"></div>
                </div>
              )}
            </div>

            <p className="text-green-400 hidden">
              verification email was sent! <br /> please check your email.
            </p>

            <div className="mt-3">
              {editLoading ? "" : <span
                className="cursor-pointer underline text-red-500"
                onClick={() => setConfirmationDelete(true)}
              >
                delete account
              </span>}
              
              <div className="flex gap-3 mt-2">
                {editLoading ? (
                  ""
                ) : (
                  <span
                    className="underline cursor-pointer"
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    cancel
                  </span>
                )}

                <span
                  className={`${editLoading ? "text-gray-300" : "underline cursor-pointer"}`}
                  onClick={handleUpload}
                >
                  {editLoading ? "processing..." : "save"}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              placeholder="verification code"
              className="border py-4 px-6 w-[350px]"
              onChange={(e) => setCode(e.target.value)}
            />

            <span
              className="underline mt-3 cursor-pointer"
              onClick={verifyCode}
            >
              verify email
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default EditProfile;
