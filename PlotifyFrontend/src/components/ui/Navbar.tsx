import { Link } from "react-router"

const Navbar = ({ page }: {page: string}) => {
  return (
    <div className="flex justify-center align-center gap-25 my-10">
      <Link to="/screen" className={`${page.includes("screen") ? "text-black" : "text-gray-400"}`}>screen</Link>
      <Link to="/read" className={`${page.includes("read") ? "text-black" : "text-gray-400"}`}>read</Link>
      <Link to="/profile" className={`${page.includes("profile") ? "text-black" : "text-gray-400"}`}>profile</Link>
    </div>
  )
}

export default Navbar