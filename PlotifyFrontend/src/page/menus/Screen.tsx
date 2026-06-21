import Footer from "../../components/ui/Footer";
import Navbar from "../../components/ui/Navbar";
import Item from "../../components/ui/Item";
import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { getMediaData } from "../../services/media.service";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Media } from "../../types/media";

const Screen = () => {
  const page: string = window.location.pathname;
  const itemAdd: string = page.slice(1);
  const [search, setSearch] = useState("");

  const { getToken } = useAuth();

  // pakai tanstack query (biar ga fetch berulang kali) -> sama kaya react query
  const { data: media = [], isLoading } = useQuery({
    queryKey: ["media"], // nama cache, jadi disimpan di cache["media"]
    queryFn: async () => {
      const token = await getToken();

      if (!token) {
        throw new Error("No token");
      }

      return getMediaData(token);
    },
    staleTime: 1000 * 60 * 10, // 10 menit (cache akan kadaluarsa dalam waktu 10 menit)
  });

  const filteredMedia = media.filter((item: Media) =>
      item.title.toLowerCase().includes(search.toLowerCase()),
    );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <title>screen</title>

      <Navbar page={page} />

      <div className="flex gap-2 justify-center mx-10">
        <input
          type="text"
          className="border py-4 px-6 flex-1"
          placeholder="search your watch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Link to={`/add?item=${itemAdd}`}>
          <button className="border py-4 px-6 cursor-pointer">add new</button>
        </Link>
      </div>

      <div className="mx-10">
        <Item page={page} data={filteredMedia} />
      </div>

      <Footer />
    </>
  );
};

export default Screen;
