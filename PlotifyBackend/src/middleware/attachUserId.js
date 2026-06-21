import { supabase } from "../supabase-client.js";

// ubah clerk id ke user id (di tabel)
async function attachUserId(req, res, next) {
  try {
    const { userId: clerkId } = req.auth();

    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.userId = user.id;

    next();
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
}

export default attachUserId;
