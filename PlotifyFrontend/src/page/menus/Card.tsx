import { useSearchParams, useNavigate } from "react-router";
import type { Media } from "../../types/media";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  completeMedia,
  deleteMedia,
  updateMedia,
  getMediaData,
  uncompleteMedia,
  deleteMediaThumbnail,
  uploadThumbnail,
} from "../../services/media.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { useQueryClient } from "@tanstack/react-query";

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

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) return;

        const data = await getMediaData(token);
        setMedia(data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, [getToken]);

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

      {media.map((item: Media) => {
        if (item.id === parseInt(id!))
          return (
            <div className="flex gap-20 content-center justify-center flex-wrap h-[100vh]">
              {/* confirmation pop up */}
              {isDelete && (
                <div className="fixed h-[100vh] w-[100vw] flex flex-col justify-center items-center bg-gray-100/50 backdrop-blur">
                  <div className="flex flex-col justify-center items-center bg-white w-[350px] h-[160px]">
                    <p>are you sure to delete?</p>

                    <div className="flex gap-7 mt-7">
                      <span
                        className="cursor-pointer underline"
                        onClick={() => handleDelete(item.type)}
                      >
                        yes
                      </span>
                      <span
                        className="cursor-pointer underline"
                        onClick={() => setIsDelete(false)}
                      >
                        no
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isMarkCompleted && (
                <div className="fixed h-[100vh] w-[100vw] flex flex-col justify-center items-center bg-gray-100/50 backdrop-blur">
                  <div className="flex flex-col justify-center items-center bg-white w-[390px] h-[210px]">
                    <p>mark as completed?</p>

                    <p>
                      add rating:{" "}
                      <input
                        type="string"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="0-5"
                        className={`border py-1 px-3 w-[70px] mt-5 ${isError && "border-red-500"}`}
                      />
                    </p>

                    <div className="flex gap-7 mt-7">
                      <span
                        className="cursor-pointer underline"
                        onClick={() => {
                          clickCompleted(value);
                        }}
                      >
                        yes
                      </span>
                      <span
                        className="cursor-pointer underline"
                        onClick={() => setIsMarkCompleted(false)}
                      >
                        no
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {showRatingModal && (
                <div className="fixed h-[100vh] w-[100vw] flex flex-col justify-center items-center bg-gray-100/50 backdrop-blur">
                  <div className="flex flex-col justify-center items-center bg-white w-[350px] h-[180px]">
                    <p className="mb-3">give rating (0 - 5)</p>

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
                      className={`border py-1 px-3 w-[120px] transition-colors duration-300 ${
                        errors[selectedItem?.id || 0]?.rating
                          ? "border-red-500"
                          : "border-black"
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
                      <p className="text-red-500 text-sm text-right">
                        {errors[selectedItem?.id || 0]?.rating}
                      </p>
                    </div>

                    <div className="flex gap-7 mt-7">
                      <span
                        className="cursor-pointer underline"
                        onClick={confirmComplete}
                      >
                        {loadingComplete ? "saving..." : "yes"}
                      </span>

                      <span
                        className="cursor-pointer underline"
                        onClick={() => setShowRatingModal(false)}
                      >
                        no
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {showUncompleteModal && (
                <div className="fixed h-[100vh] w-[100vw] flex justify-center items-center bg-gray-100/50 backdrop-blur">
                  <div className="flex flex-col justify-center items-center bg-white w-[350px] h-[160px]">
                    <p className="mb-5">set this item back to uncompleted?</p>

                    <div className="flex gap-7">
                      <span
                        className={`cursor-pointer underline ${
                          uncompleteLoading
                            ? "pointer-events-none opacity-50"
                            : ""
                        }`}
                        onClick={confirmUncomplete}
                      >
                        {uncompleteLoading ? "processing..." : "yes"}
                      </span>

                      <span
                        className={`cursor-pointer underline ${
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
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isEdit ? (
                <div className="flex flex-col items-center gap-5">
                  <div className="relative group">
                    <img
                      src={
                        imageFile
                          ? URL.createObjectURL(imageFile)
                          : deleteThumbnail
                            ? "default-thumbnail.png"
                            : item.image_url || "default-thumbnail.png"
                      }
                      alt="thumbnail"
                      className="h-120 w-80 object-cover"
                    />

                    {/* Overlay */}
                    <label
                      htmlFor="thumbnail-upload"
                      className="
                        absolute inset-0
                        flex items-center justify-center
                        bg-black/50
                        opacity-0
                        group-hover:opacity-100
                        transition-opacity
                        duration-300
                        cursor-pointer
                      "
                    >
                      <span className="text-white">
                        {item.image_url ? "change thumbnail" : "upload thumbnail"}
                      </span>
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

                  {item.image_url && !deleteThumbnail && !imageFile && (
                    <span
                      className="underline cursor-pointer"
                      onClick={() => {
                        setDeleteThumbnail(true);
                        setImageFile(null);
                      }}
                    >
                      delete thumbnail
                    </span>
                  )}

                  {deleteThumbnail && (
                    <span
                      className="underline cursor-pointer"
                      onClick={() => setDeleteThumbnail(false)}
                    >
                      restore thumbnail
                    </span>
                  )}
                </div>
              ) : (
                <img
                  src={
                    item.image_url ? item.image_url : "default-thumbnail.png"
                  }
                  alt="test"
                  className="h-120 w-80 object-cover"
                />
              )}

              <div className="flex flex-col justify-center min-w-[400px]">
                {isEdit ? (
                  ""
                ) : (
                  <span
                    className="underline cursor-pointer mb-1"
                    onClick={() => navigate(-1)}
                  >
                    back to prev tab
                  </span>
                )}

                {isEdit ? (
                  <div className="flex items-center gap-1 mt-3">
                    <span>category:</span>
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
                      className="border py-1 px-3 w-full"
                    />
                  </div>
                ) : (
                  <p className="mt-5">{item.category.join(", ")}</p>
                )}

                {isEdit ? (
                  <div className="mt-2 w-full">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap">title:</span>

                      <div className="relative group w-full">
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
                          className={`border py-1 px-3 w-full transition-colors duration-300 ${
                            errors[item.id]?.title
                              ? "border-red-500"
                              : "border-black"
                          }`}
                        />

                        {/* tooltip error */}
                        {errors[item.id]?.title && (
                          <div
                            className="
                              absolute left-0 top-full
                              translate-y-1

                              opacity-0 group-hover:opacity-100
                              transition-opacity duration-200

                              bg-white
                              border border-red-400
                              text-red-500 text-sm
                              px-2 py-1
                              rounded-md
                              shadow-md
                              whitespace-nowrap
                              z-10

                              before:content-['']
                              before:absolute
                              before:-top-1
                              before:left-3
                              before:w-2
                              before:h-2
                              before:bg-white
                              before:rotate-45
                              before:border-l
                              before:border-t
                              before:border-red-400
                            "
                          >
                            {errors[item.id]?.title}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <h1 className="font-bold text-[26px] lowercase">
                    {item.title}
                  </h1>
                )}

                {isEdit ? (
                  <>
                    <p className="mt-2">description: </p>
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
                      className="border py-2 px-3 w-full min-h-[100px] resize-none"
                    />
                  </>
                ) : (
                  <p className="lowercase text-gray-400 mb-5">
                    {item.description || "no description added"}
                  </p>
                )}

                {item && (
                  <p className="lowercase mt-2">
                    {item.type === "read"
                      ? "where to read:"
                      : "where to watch:"}{" "}
                    {isEdit ? (
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
                        className="border py-1 px-3 w-[300px]"
                      />
                    ) : (
                      item.source
                    )}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <p className="whitespace-nowrap">
                    {item.is_completed ? "total" : "last"}{" "}
                    {item.type === "read" ? "page" : "episode"}:
                  </p>

                  {isEdit ? (
                    <div className="relative group">
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
                        className={`border py-1 px-3 w-[120px] ${
                          errors[item.id]?.lastEpisode
                            ? "border-red-500"
                            : "border-black"
                        }`}
                      />

                      {errors[item.id]?.lastEpisode && (
                        <div
                          className="
                            absolute left-0 top-full
                            translate-y-1

                            opacity-0 group-hover:opacity-100
                            transition-opacity duration-200

                            bg-white
                            border border-red-400
                            text-red-500 text-sm
                            px-2 py-1
                            rounded-md
                            shadow-md
                            whitespace-nowrap
                            z-10

                            before:content-['']
                            before:absolute
                            before:-top-1
                            before:left-3
                            before:w-2
                            before:h-2
                            before:bg-white
                            before:rotate-45
                            before:border-l
                            before:border-t
                            before:border-red-400
                          "
                        >
                          {errors[item.id]?.lastEpisode}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="ml-1">{item.last_episode}</p>
                  )}
                </div>

                {item.is_completed && (
                  <div className="mt-2 flex items-center gap-2">
                    <p className="whitespace-nowrap">rating:</p>

                    {isEdit ? (
                      <div className="relative group">
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
                          className={`border py-1 px-3 w-[100px] ${
                            errors[item.id]?.rating
                              ? "border-red-500"
                              : "border-black"
                          }`}
                        />

                        {errors[item.id]?.rating && (
                          <div
                            className="
                              absolute left-0 top-full
                              translate-y-1

                              opacity-0 group-hover:opacity-100
                              transition-opacity duration-200

                              bg-white
                              border border-red-400
                              text-red-500 text-sm
                              px-2 py-1
                              rounded-md
                              shadow-md
                              whitespace-nowrap
                              z-10

                              before:content-['']
                              before:absolute
                              before:-top-1
                              before:left-3
                              before:w-2
                              before:h-2
                              before:bg-white
                              before:rotate-45
                              before:border-l
                              before:border-t
                              before:border-red-400
                            "
                          >
                            {errors[item.id]?.rating}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="ml-1">{item.rating}/5</p>
                    )}
                  </div>
                )}

                <div className="flex flex-col mt-15 gap-2">
                  {isEdit ? (
                    <span
                      className="inline-flex w-fit underline cursor-pointer"
                      onClick={() => setIsDelete(true)}
                    >
                      delete
                    </span>
                  ) : item.is_completed ? (
                    <span
                      className="inline-flex w-fit underline cursor-pointer"
                      onClick={() => openUncompleteModal(item)}
                    >
                      set back to uncomplete
                    </span>
                  ) : (
                    <span
                      className="inline-flex w-fit underline cursor-pointer"
                      onClick={() => openCompleteModal(item)}
                    >
                      mark as complete
                    </span>
                  )}

                  {isEdit ? (
                    <div className="flex gap-3">
                      <span
                        className="underline cursor-pointer"
                        onClick={() => handleSave(item)}
                      >
                        {loading ? "saving..." : "save"}
                      </span>

                      <span
                        className="underline cursor-pointer"
                        onClick={() => {
                          setIsEdit(false);
                          setDeleteThumbnail(false);
                          setImageFile(null);
                        }}
                      >
                        cancel
                      </span>
                    </div>
                  ) : (
                    <span
                      className="inline-flex w-fit underline cursor-pointer"
                      onClick={() => setIsEdit(true)}
                    >
                      edit
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
      })}
    </>
  );
};

export default Edit;
