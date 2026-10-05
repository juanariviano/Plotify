import ErrorPage from "../../components/ui/ErrorPage";

const page404 = () => (
  <ErrorPage
    code="404"
    title="you've lost your place."
    body="this page doesn't exist, or it moved. your shelves are still where you left them."
  />
);

export default page404;
