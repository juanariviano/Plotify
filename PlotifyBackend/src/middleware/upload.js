import multer from "multer";

// filter image yang masuk
const uploadConfig = multer({
  storage: multer.memoryStorage(), // file disimpan smntara saat sdg diproses
  limits: { fileSize: 2 * 1024 * 1024 }, // ukuran max file = 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    allowed.includes(file.mimetype)
      ? cb(null, true) // cb = callback
      : cb(new Error("Only JPG, PNG, WebP allowed"));
  },
});


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

      next();
    });
  };
};
