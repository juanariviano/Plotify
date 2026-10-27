import { getAuth } from "@clerk/express";

// balas 401 untuk request tanpa login, bukan redirect seperti requireAuth()
const authMiddleware = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export default authMiddleware;
