import { useSearchParams, useNavigate } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { createMedia, uploadThumbnail } from "../../services/media.service";
import Footer from "../../components/ui/Footer";
import "../../styles/animations.css";

const Add = () => {
  const [searchParams] = useSearchParams();
  const item = searchParams.get("item");
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `add new ${item}`;
  }, [item]);

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
  }, []);

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
    <div className="relative min-h-screen bg-white lowercase text-[#111111]">
      <div className="landing-ambient" aria-hidden="true" />

      <div ref={containerRef} className="relative z-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-center gap-12 px-6 py-16 sm:px-10 lg:gap-20 lg:py-24">
          <div className="reveal w-80 shrink-0">
            <input
              type="file"
              accept="image/*"
              id="fileInput"
              hidden
              onChange={handleImageChange}
            />
            <label
              htmlFor="fileInput"
              className="landing-card relative block h-120 w-80 cursor-pointer overflow-hidden bg-[#f7f6f3]"
            >
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity duration-300 hover:opacity-100">
                    change image
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  upload image
                </div>
              )}
            </label>
          </div>

          <div className="reveal flex w-full max-w-[350px] flex-col justify-center">
            <span className="mb-8 inline-block w-fit border border-[#eaeaea] bg-[#f7f6f3] px-3 py-1 text-[10px] tracking-[0.08em] text-gray-400">
              {item === "screen" ? "add new screen" : "add new read"}
            </span>

            <div className="flex flex-col gap-3">
              <div>
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
                  className={`field-input ${errors.title ? "border-red-500" : ""}`}
                />
                {errors.title && <p className="field-error">{errors.title}</p>}
              </div>

              <input
                type="text"
                className="field-input"
                placeholder="short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <input
                type="text"
                className="field-input"
                placeholder="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />

              <input
                type="text"
                className="field-input"
                placeholder="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />

              <div>
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
                  className={`field-input ${errors.lastEpisode ? "border-red-500" : ""}`}
                />
                {errors.lastEpisode && (
                  <p className="field-error">{errors.lastEpisode}</p>
                )}
              </div>
            </div>

            <div className="mt-10 flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="action-btn disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "saving..." : "save"}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="action-btn"
              >
                cancel
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default Add;
