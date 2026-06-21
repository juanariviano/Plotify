import { Link } from "react-router";

const Home = () => {
  return (
    <div className="flex flex-col justify-center items-center h-[100vh]">
      <title>plotify</title>

      <Link to="/screen">
        <button className="border py-4 px-6 flex-1 cursor-pointer hover:bg-black hover:text-white hover:duration-500 hover:ease-in-out">
          save your progress
        </button>
      </Link>
    </div>
  );
};

export default Home;
