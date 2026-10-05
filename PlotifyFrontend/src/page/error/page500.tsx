import ErrorPage from "../../components/ui/ErrorPage";

const page500 = () => (
  <ErrorPage
    code="500"
    title="something slipped off the shelf."
    body="our server hit a problem. try again in a moment; nothing you saved has been lost."
  />
);

export default page500;
