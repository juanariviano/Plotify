import multer from "multer";

// filter image yang masuk
const uploadConfig = multer({
  storage: multer.memoryStorage(), // file disimpan smntara saat sdg diproses
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // ukuran max file = 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    allowed.includes(file.mimetype)
      ? cb(null, true) // cb = callback
      : cb(new Error("Only JPG, PNG, WebP allowed"));
  },
});

// mimetype berasal dari client dan bisa dipalsukan, jadi cek juga isi byte awal file
const matchesSignature = (file) => {
  const b = file.buffer;
  if (!b || b.length < 12) return false;

  switch (file.mimetype) {
    case "image/jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    default:
      return false;
  }
};

// multer = middleware untuk Express.js di Node.js yang digunakan untuk menangani upload file dari client ke server
// middleware itu sederhananya kaya penengah, misal dlm hal ini cek filenya ukuran dan tipe datanya sesuai atau ga
export const handleUpload = (fieldName) => {
  return (req, res, next) => {
    // .single = hanya untuk satu file
    // fieldName harus sama dengan formData.append di FE
    // file yang dipload dari FE akan masuk ke req.file
    const upload = uploadConfig.single(fieldName);

    // jalanin multernya
    upload(req, res, (err) => {
      // buat cek, apakah error yang dibuat benar" dari multer
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            status: "error",
            message: "image too large! maximum 2mb",
          });
        }
        return res.status(400).json({
          status: "error",
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          status: "error",
          message: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "image empty",
        });
      }

      if (!matchesSignature(req.file)) {
        return res.status(400).json({
          status: "error",
          message: "Only JPG, PNG, WebP allowed",
        });
      }

      next();
    });
  };
};
