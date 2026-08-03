import { useSearchParams, useNavigate } from "react-router";
import type { Media } from "../../types/media";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  completeMedia,
  deleteMedia,
  updateMedia,
  getMediaById,
  uncompleteMedia,
  deleteMediaThumbnail,
  uploadThumbnail,
} from "../../services/media.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Footer from "../../components/ui/Footer";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { useQueryClient } from "@tanstack/react-query";
import "../../styles/animations.css";

const Edit = () => {
  const [isDelete, setIsDelete] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isMarkCompleted, setIsMarkCompleted] = useState(false);
  const [isError, setIsError] = useState(false);
  const [value, setValue] = useState("");
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  type EditMedia = Omit<Media, "rating"> & {
    rating: string | null;
  };

  type EditData = Record<string, EditMedia>;

  const [editData, setEditData] = useState<EditData>({});

  function clickCompleted(value: string) {
    if (
      value.trim() === "" ||
      isNaN(Number(value)) ||
      parseFloat(value) < 0 ||
      parseFloat(value) > 5
    ) {
      setIsError(true);
      return false;
    }
    navigate(-1);
    return true;
  }

  const { getToken } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token || !id) return;

        const data = await getMediaById(token, parseInt(id, 10));
        setMedia([data]);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, [getToken, id]);

  useEffect(() => {
    if (loading) return;

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
  }, [loading, media]);

  useEffect(() => {
    if (isEdit) {
      const initial = Object.fromEntries(
        media.map((item) => [
          item.id,
          {
            ...item,
            rating: item.rating?.toString() ?? null,
          },
        ]),
      );

      setEditData(initial);
    }
  }, [isEdit, media]);

  const handleDelete = async (type: string) => {
    try {
      const token = await getToken();

      if (!token) return;

      await deleteMediaThumbnail({
        token,
        id: Number(id),
      });

      await deleteMedia({
        token,
        id: Number(id),
      });

      await queryClient.invalidateQueries({
        queryKey: ["media"],
      });

      navigate(type === "read" ? "/read" : "/screen");
    } catch (error) {
      console.log(error);
    }
  };

  const [categoryInput, setCategoryInput] = useState<Record<number, string>>(
    {},
  );

  const [errors, setErrors] = useState<
    Record<number, { title?: string; lastEpisode?: string; rating?: string }>
  >({});

  const validate = (item: Media) => {
    const data = editData[item.id];

    const newErrors = {
      title: "",
      lastEpisode: "",
      rating: "",
    };

    let isValid = true;

    // TITLE VALIDATION
    if (!data?.title?.trim()) {
      newErrors.title = "title is required";
      isValid = false;
    }

    // LAST_EPISODE VALIDATION
    const rawValue = data?.last_episode;

    if (rawValue === null || rawValue === undefined) {
      newErrors.lastEpisode =
        item.type === "screen"
          ? "last episode is required"
          : "last page is required";
      isValid = false;
    } else {
      const num = Number(rawValue);

      if (isNaN(num)) {
        newErrors.lastEpisode = "must be a number";
        isValid = false;
      } else if (num < 0) {
        newErrors.lastEpisode = "cannot be negative";
        isValid = false;
      } else if (num > 10000) {
        newErrors.lastEpisode = "value too large";
        isValid = false;
      }
    }

    // RATING VALIDATION
    const rawRating = data?.rating;
    if (item.is_completed) {
      if (rawRating === null || rawRating === undefined || rawRating === "") {
        newErrors.rating = "rating is required";
        isValid = false;
      } else {
        const num = Number(rawRating);

        if (isNaN(num)) {
          newErrors.rating = "must be a number";
          isValid = false;
        } else if (num < 0) {
          newErrors.rating = "cannot be negative";
          isValid = false;
        } else if (num > 5) {
          newErrors.rating = "max rating is 5";
          isValid = false;
        }
      }
    }

    setErrors((prev) => ({
      ...prev,
      [item.id]: newErrors,
    }));

    return isValid;
  };

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deleteThumbnail, setDeleteThumbnail] = useState(false);

  const handleSave = async (item: Media) => {
    if (!validate(item)) return;

    setLoading(true);

    try {
      const token = await getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      const payload = editData[item.id];

      let imageUrl = payload.image_url;

      if (deleteThumbnail || imageFile) {
        await deleteMediaThumbnail({ token, id: item.id });
      }

      if(imageFile){
        imageUrl = await uploadThumbnail({
          token,
          file: imageFile,
        });
      }else if(deleteThumbnail) {
        imageUrl = null;
      }

      await updateMedia({
        token,
        id: item.id,
        mediaData: {
          ...payload,
          image_url: imageUrl,
          rating: payload?.rating === null ? null : Number(payload?.rating),
          last_episode: Number(payload?.last_episode),
        },
      });

      await queryClient.invalidateQueries({
        queryKey: ["media"],
      });

      await queryClient.refetchQueries({
        queryKey: ["media"],
      });

      setIsEdit(false);
      setDeleteThumbnail(false);
      setImageFile(null);

      navigate(-1);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const [loadingComplete, setLoadingComplete] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Media | null>(null);
  const [ratingInput, setRatingInput] = useState<string>("");

  const [showUncompleteModal, setShowUncompleteModal] = useState(false);
  const [uncompleteLoading, setUncompleteLoading] = useState(false);

  const openCompleteModal = (item: Media) => {
    setSelectedItem(item);
    setRatingInput(editData[item.id]?.rating?.toString() || "");
    setShowRatingModal(true);
  };

  const openUncompleteModal = (item: Media) => {
    setSelectedItem(item);
    setShowUncompleteModal(true);
  };

  const validateRating = () => {
    if (!selectedItem) return false;

    const raw = ratingInput.trim();
    const rating = parseFloat(raw);

    if (!raw) {
      setErrors((prev) => ({
        ...prev,
        [selectedItem.id]: {
          ...prev[selectedItem.id],
          rating: "rating is required",
        },
      }));
      return false;
    }

    if (isNaN(rating)) {
      setErrors((prev) => ({
        ...prev,
        [selectedItem.id]: {
          ...prev[selectedItem.id],
          rating: "rating must be a number",
        },
      }));
      return false;
    }

    if (rating < 0 || rating > 5) {
      setErrors((prev) => ({
        ...prev,
        [selectedItem.id]: {
          ...prev[selectedItem.id],
          rating: "rating must be 0 - 5",
        },
      }));
      return false;
    }

    return true;
  };

  const confirmComplete = async () => {
    if (!selectedItem) return;

    try {
      setLoadingComplete(true);

      const token = await getToken();

      if (!token) return;

      if (!validateRating()) return;

      await completeMedia({
        token,
        id: selectedItem.id,
        rating: parseFloat(ratingInput),
      });

      await queryClient.invalidateQueries({
        queryKey: ["media"],
      });

      await queryClient.refetchQueries({
        queryKey: ["media"],
      });

      setShowRatingModal(false);
      setSelectedItem(null);

      navigate(-1);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingComplete(false);
    }
  };

  const confirmUncomplete = async () => {
    if (!selectedItem) return;

    try {
      setUncompleteLoading(true);

      const token = await getToken();
      if (!token) return;

      await uncompleteMedia({
        token,
        id: selectedItem.id,
      });

      await queryClient.invalidateQueries({
        queryKey: ["media"],
      });

      setShowUncompleteModal(false);
      setSelectedItem(null);

      navigate(-1);
    } catch (err) {
      console.log(err);
    } finally {
      setUncompleteLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <title>more info</title>

      <div className="relative min-h-screen bg-[#fbfafa] lowercase text-[#111111]">
        <div className="landing-ambient" aria-hidden="true" />

        <div ref={containerRef} className="relative z-10 flex min-h-screen flex-col">
      {media.map((item: Media) => {
        if (item.id === parseInt(id!))
          return (
            <div
              key={item.id}
              className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10 lg:py-16"
            >
                <div className="reveal grid w-full items-start gap-10 lg:grid-cols-[minmax(280px,320px)_1fr] lg:gap-16">
              {/* confirmation pop up */}
              {isDelete && (
                <div className="modal-overlay">
                  <div className="modal-panel modal-panel-enter flex flex-col items-center gap-4 text-center">
                    <p
                      className="card-detail-title text-xl"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      are you sure to delete?
                    </p>
                    <p className="text-xs leading-relaxed text-[#787774]">
                      this cannot be undone.
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="action-btn-danger"
                        onClick={() => handleDelete(item.type)}
                      >
                        yes
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => setIsDelete(false)}
                      >
                        no
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isMarkCompleted && (
                <div className="modal-overlay">
                  <div className="modal-panel modal-panel-enter flex flex-col items-center gap-4 text-center">
                    <p
                      className="card-detail-title text-xl"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      mark as completed?
                    </p>

                    <p className="text-sm text-[#787774]">
                      add rating:{" "}
                      <input
                        type="string"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="0-5"
                        className={`field-input mt-2 w-[70px] text-center ${isError ? "border-[#9f2f2d]" : ""}`}
                      />
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => {
                          clickCompleted(value);
                        }}
                      >
                        yes
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => setIsMarkCompleted(false)}
                      >
                        no
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showRatingModal && (
                <div className="modal-overlay">
                  <div className="modal-panel modal-panel-enter flex flex-col items-center gap-4 text-center">
                    <p
                      className="card-detail-title mb-3 text-xl"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      give rating (0 - 5)
                    </p>

                    <input
                      type="text"
                      value={ratingInput}
                      onChange={(e) => {
                        setRatingInput(e.target.value);

                        setErrors((prev) => ({
                          ...prev,
                          [selectedItem!.id]: {
                            ...prev[selectedItem!.id],
                            rating: "",
                          },
                        }));
                      }}
                      className={`field-input w-[120px] text-center ${
                        errors[selectedItem?.id || 0]?.rating
                          ? "border-[#9f2f2d]"
                          : ""
                      }`}
                    />

                    <div
                      className={`
                      overflow-hidden
                      transition-all
                      duration-300
                      ease-in-out
                      ${
                        errors[selectedItem?.id || 0]?.rating
                          ? "max-h-10 opacity-100 mt-1"
                          : "max-h-0 opacity-0"
                      }
                    `}
                    >
                      <p className="text-sm text-[#9f2f2d]">
                        {errors[selectedItem?.id || 0]?.rating}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="action-btn-primary"
                        onClick={confirmComplete}
                      >
                        {loadingComplete ? "saving..." : "yes"}
                      </button>

                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => setShowRatingModal(false)}
                      >
                        no
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showUncompleteModal && (
                <div className="modal-overlay">
                  <div className="modal-panel modal-panel-enter flex flex-col items-center gap-4 text-center">
                    <p
                      className="card-detail-title mb-3 text-xl"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      set this item back to uncompleted?
                    </p>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className={`action-btn-primary ${
                          uncompleteLoading
                            ? "pointer-events-none opacity-50"
                            : ""
                        }`}
                        onClick={confirmUncomplete}
                      >
                        {uncompleteLoading ? "processing..." : "yes"}
                      </button>

                      <button
                        type="button"
                        className={`action-btn ${
                          uncompleteLoading
                            ? "pointer-events-none opacity-50"
                            : ""
                        }`}
                        onClick={() => {
                          if (uncompleteLoading) return;
                          setShowUncompleteModal(false);
                          setSelectedItem(null);
                        }}
                      >
                        no
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isEdit ? (
                <div className="flex w-full flex-col items-start gap-5">
                  <Breadcrumbs
                    className="mb-0 w-full"
                    items={[
                      { label: item.type, to: `/${item.type}` },
                      { label: item.title },
                      { label: "editing" },
                    ]}
                  />

                  <div className="landing-card group relative w-full overflow-hidden bg-[#f7f6f3]">
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={
                          imageFile
                            ? URL.createObjectURL(imageFile)
                            : deleteThumbnail
                              ? "default-thumbnail.png"
                              : item.image_url || "default-thumbnail.png"
                        }
                        alt="thumbnail"
                        className="card-thumbnail-img h-full w-full object-cover"
                      />
                    </div>

                    <label
                      htmlFor="thumbnail-upload"
                      className="card-thumbnail-overlay cursor-pointer"
                    >
                      {item.image_url ? "change thumbnail" : "upload thumbnail"}
                    </label>

                    <input
                      id="thumbnail-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        setImageFile(file);
                        setDeleteThumbnail(false);
                      }}
                    />
                  </div>

                  {(item.image_url && !deleteThumbnail && !imageFile) || deleteThumbnail ? (
                    <div className="flex w-full flex-wrap justify-center gap-3">
                      {item.image_url && !deleteThumbnail && !imageFile && (
                        <button
                          type="button"
                          className="action-btn-danger"
                          onClick={() => {
                            setDeleteThumbnail(true);
                            setImageFile(null);
                          }}
                        >
                          delete thumbnail
                        </button>
                      )}

                      {deleteThumbnail && (
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => setDeleteThumbnail(false)}
                        >
                          restore thumbnail
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex w-full flex-col items-start gap-5">
                  <Breadcrumbs
                    className="mb-0 w-full"
                    items={[
                      { label: item.type, to: `/${item.type}` },
                      { label: item.title },
                    ]}
                  />

                  <div className="landing-card w-full overflow-hidden bg-[#f7f6f3]">
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={
                          item.image_url ? item.image_url : "default-thumbnail.png"
                        }
                        alt={item.title}
                        className="card-thumbnail-img h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex w-full min-w-0 flex-col items-start justify-center lg:pt-2">
                {!isEdit ? (
                  <div className="card-content-stagger w-full">
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                      <span className="card-detail-badge card-detail-badge--type">
                        {item.type}
                      </span>
                      {item.is_completed && (
                        <span className="card-detail-badge card-detail-badge--completed">
                          completed
                        </span>
                      )}
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {item.category.length > 0 ? (
                        item.category.map((cat) => (
                          <span key={cat} className="card-category-pill">
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="font-mono text-xs text-[#787774]">
                          no category
                        </span>
                      )}
                    </div>

                    <h1
                      className="card-detail-title mb-5 text-[2rem] sm:text-[2.5rem]"
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    >
                      {item.title}
                    </h1>

                    <p className="mb-8 max-w-lg leading-[1.6] text-[#787774]">
                      {item.description || "no description added"}
                    </p>

                    <div className="card-meta-panel w-full">
                      <div className="detail-meta-row">
                        <span className="text-sm text-[#787774]">
                          {item.type === "read" ? "where to read" : "where to watch"}
                        </span>
                        <span className="font-mono text-sm">{item.source || "—"}</span>
                      </div>

                      <div className="detail-meta-row">
                        <span className="text-sm text-[#787774]">
                          {item.is_completed ? "total" : "last"}{" "}
                          {item.type === "read" ? "page" : "episode"}
                        </span>
                        <span className="font-mono text-sm">{item.last_episode}</span>
                      </div>

                      {item.is_completed && (
                        <div className="detail-meta-row border-b-0">
                          <span className="text-sm text-[#787774]">rating</span>
                          <span className="bg-[#fbf3db] px-2 py-0.5 font-mono text-sm text-[#956400]">
                            {item.rating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 flex flex-wrap items-center gap-2">
                      <span className="card-detail-badge card-detail-badge--type">
                        {item.type}
                      </span>
                      <span className="card-detail-badge card-detail-badge--editing">
                        editing
                      </span>
                    </div>

                  <div className="flex w-full flex-col gap-5">
                    <div>
                      <span className="mb-2 block text-xs tracking-[0.06em] text-[#787774]">
                        category
                      </span>
                      <input
                        type="text"
                        value={
                          categoryInput[item.id] ??
                          (editData[item.id]?.category || []).join(", ")
                        }
                        onChange={(e) => {
                          const val = e.target.value;

                          setCategoryInput((prev) => ({
                            ...prev,
                            [item.id]: val,
                          }));

                          setEditData((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              category: val
                                .split(",")
                                .map((c) => c.trim())
                                .filter(Boolean),
                            },
                          }));
                        }}
                        className="field-input"
                        placeholder="comma separated"
                      />
                    </div>

                    <div>
                      <span className="mb-2 block text-xs tracking-[0.06em] text-[#787774]">
                        title
                      </span>
                      <input
                        type="text"
                        value={editData[item.id]?.title || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...(prev[item.id] || {}),
                              title: e.target.value,
                            },
                          }))
                        }
                        className={`field-input ${
                          errors[item.id]?.title ? "border-[#9f2f2d]" : ""
                        }`}
                      />
                      {errors[item.id]?.title && (
                        <p className="field-error">{errors[item.id]?.title}</p>
                      )}
                    </div>

                    <div>
                      <span className="mb-2 block text-xs tracking-[0.06em] text-[#787774]">
                        description
                      </span>
                      <textarea
                        value={editData[item.id]?.description || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              description: e.target.value,
                            },
                          }))
                        }
                        className="field-input min-h-[100px] resize-none"
                      />
                    </div>

                    <div className="card-edit-section flex flex-col gap-5">
                      <div>
                        <span className="mb-2 block text-xs tracking-[0.06em] text-[#787774]">
                          {item.type === "read" ? "where to read" : "where to watch"}
                        </span>
                        <input
                          type="text"
                          value={editData[item.id]?.source || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                source: e.target.value,
                              },
                            }))
                          }
                          className="field-input"
                        />
                      </div>

                      <div>
                        <span className="mb-2 block text-xs tracking-[0.06em] text-[#787774]">
                          {item.is_completed ? "total" : "last"}{" "}
                          {item.type === "read" ? "page" : "episode"}
                        </span>
                        <input
                          type="text"
                          value={editData[item.id]?.last_episode ?? ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] || {}),
                                last_episode:
                                  e.target.value === "" ? null : e.target.value,
                              },
                            }))
                          }
                          className={`field-input max-w-[160px] ${
                            errors[item.id]?.lastEpisode ? "border-[#9f2f2d]" : ""
                          }`}
                        />
                        {errors[item.id]?.lastEpisode && (
                          <p className="field-error">{errors[item.id]?.lastEpisode}</p>
                        )}
                      </div>

                      {item.is_completed && (
                        <div>
                          <span className="mb-2 block text-xs tracking-[0.06em] text-[#787774]">
                            rating
                          </span>
                          <input
                            type="text"
                            value={editData[item.id]?.rating ?? ""}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || {}),
                                  rating:
                                    e.target.value === "" ? null : e.target.value,
                                },
                              }))
                            }
                            className={`field-input max-w-[160px] ${
                              errors[item.id]?.rating ? "border-[#9f2f2d]" : ""
                            }`}
                          />
                          {errors[item.id]?.rating && (
                            <p className="field-error">{errors[item.id]?.rating}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  </>
                )}

                <div
                  key={isEdit ? "edit-actions" : "view-actions"}
                  className="card-actions-fade mt-10 flex w-full flex-col gap-3 border-t border-[#eaeaea] pt-8"
                >
                  {isEdit ? (
                    <>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="action-btn-primary"
                          onClick={() => handleSave(item)}
                        >
                          {loading ? "saving..." : "save"}
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => {
                            setIsEdit(false);
                            setDeleteThumbnail(false);
                            setImageFile(null);
                          }}
                        >
                          cancel
                        </button>
                      </div>
                      <button
                        type="button"
                        className="action-btn-danger w-fit"
                        onClick={() => setIsDelete(true)}
                      >
                        delete
                      </button>
                    </>
                  ) : (
                    <>
                      {item.is_completed ? (
                        <button
                          type="button"
                          className="action-btn-primary w-fit"
                          onClick={() => openUncompleteModal(item)}
                        >
                          set back to uncomplete
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="action-btn-primary w-fit"
                          onClick={() => openCompleteModal(item)}
                        >
                          mark as complete
                        </button>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => navigate(-1)}
                        >
                          back
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => setIsEdit(true)}
                        >
                          edit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            </div>
          );
      })}
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Edit;
