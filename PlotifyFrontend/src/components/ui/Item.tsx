import { Link } from "react-router";
import type { Media, ItemsProps } from "../../types/media";

const Item = ({ page, data }: ItemsProps) => {
  const checkComplete = data.some((item: Media) => item.is_completed === true);
  const checkUncomplete = data.some(
    (item: Media) => item.is_completed === false,
  );
  const hasData = data.length > 0;
  console.log("data", hasData)

  if (!hasData) {
  return (
    <div className="flex items-center justify-center h-[65vh]">
      <span className="text-gray-300">no items found</span>
    </div>
  );
}

  return (
    <>
      {checkUncomplete && (
        <h3 className="mt-5 mb-2 font-bold">
          {page.includes("screen") ? "ongoing" : "on reads"}
        </h3>
      )}
      <div className="flex flex-wrap gap-5">
        {data.map((item: Media) => {
          if (item.is_completed === false && page.includes(item.type))
            return (
              <Link key={item.id} to={`/card?id=${item.id}`}>
                <div className="flex flex-col cursor-pointer">
                  <img
                    src={
                      item.image_url ? item.image_url : "default-thumbnail.png"
                    }
                    alt="test"
                    className="h-80 w-60 object-cover"
                  />
                  <h1 className="font-bold lowercase">{item.title}</h1>
                  <p>last eps: {item.last_episode}</p>
                </div>
              </Link>
            );
        })}
      </div>

      {checkComplete && <h3 className="mt-5 mb-2 font-bold">completed</h3>}
      <div className="flex flex-wrap gap-5">
        {data.map((item: Media) => {
          if (item.is_completed === true && page.includes(item.type))
            return (
              <Link key={item.id} to={`/card?id=${item.id}`}>
                <div className="flex flex-col cursor-pointer">
                  <img
                    src={
                      item.image_url ? item.image_url : "default-thumbnail.png"
                    }
                    alt="test"
                    className="h-80 w-60 object-cover"
                  />
                  <h1 className="font-bold lowercase">{item.title}</h1>
                  <p>rating: {item.rating}/5</p>
                </div>
              </Link>
            );
        })}
      </div>
    </>
  );
};

export default Item;
