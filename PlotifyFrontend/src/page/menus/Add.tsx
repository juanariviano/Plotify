import { useSearchParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { createMedia, uploadThumbnail } from "../../services/media.service";

const Add = () => {
  const [searchParams] = useSearchParams();
  const item = searchParams.get("item");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `add new ${item}`;
  }, [item]);

  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [lastEpisode, setLastEpisode] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  const [errors, setErrors] = useState({
    title: "",
    lastEpisode: "",
  });

  const validate = () => {
    const newErrors = {
      title: "",
      lastEpisode: "",
    };

    let isValid = true;

    if (!title.trim()) {
      newErrors.title = "title is required";
      isValid = false;
    }

    if (!lastEpisode.trim()) {
      newErrors.lastEpisode =
        item === "screen"
          ? "last episode is required"
          : "last page is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImageFile(file);

    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const token = await getToken();

      if (!token) return;

      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadThumbnail({
          token,
          file: imageFile,
        });
      }

      await createMedia({
        token,
        mediaData: {
          title,
          description,
          category: category ? category.split(",").map((c) => c.trim()) : [],
          source,
          last_episode: Number(lastEpisode),
          type: item!,
          image_url: imageUrl,
        },
      });

      queryClient.invalidateQueries({
        queryKey: ["media"],
      });

      navigate("/screen");
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-20 content-center justify-center flex-wrap h-[100vh]">
      <input
        type="file"
        accept="image/*"
        id="fileInput"
        hidden
        onChange={handleImageChange}
      />
      <label
        htmlFor="fileInput"
        className="relative border h-120 w-80 cursor-pointer overflow-hidden"
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="preview"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0
                        bg-black/40
                        opacity-0
                        hover:opacity-100
                        flex items-center justify-center
                        text-white
                        transition-opacity
                        duration-300"
            >
              change image
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            upload image
          </div>
        )}
      </label>

      <div className="flex flex-col justify-center">
        <p className="text-gray-400 mb-10">
          {item === "screen" ? "add new screen" : "add new read"}
        </p>

        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);

                if (errors.title) {
                  setErrors((prev) => ({
                    ...prev,
                    title: "",
                  }));
                }
              }}
              className={`py-4 px-6 w-[350px] border transition-colors duration-300 ${
                errors.title ? "border-red-500" : "border-black"
              }`}
            />

            <div
              className={`
                overflow-hidden
                transition-all
                duration-300
                ease-in-out
                ${errors.title ? "max-h-10 opacity-100 mt-1" : "max-h-0 opacity-0"}
              `}
            >
              <p className="text-red-500 text-sm">{errors.title}</p>
            </div>
          </div>

          <input
            type="text"
            className="border py-4 px-6 w-[350px]"
            placeholder="short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <input
            type="text"
            className="border py-4 px-6 w-[350px]"
            placeholder="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <input
            type="text"
            className="border py-4 px-6 w-[350px]"
            placeholder="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />

          <div className="relative">
            <input
              type="number"
              placeholder={item === "screen" ? "last episode" : "last page"}
              value={lastEpisode}
              onChange={(e) => {
                setLastEpisode(e.target.value);

                if (errors.lastEpisode) {
                  setErrors((prev) => ({
                    ...prev,
                    lastEpisode: "",
                  }));
                }
              }}
              className={`py-4 px-6 w-[350px] border transition-colors ${
                errors.lastEpisode ? "border-red-500" : "border-black"
              }`}
            />

            {errors.lastEpisode && (
              <p className="absolute text-red-500 text-sm mt-1">
                {errors.lastEpisode}
              </p>
            )}
          </div>
        </div>

        <div className="flex mt-10 gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "saving..." : "save"}
          </button>
          <span
            className="underline cursor-pointer"
            onClick={() => navigate(-1)}
          >
            cancel
          </span>
        </div>
      </div>
    </div>
  );
};

export default Add;
