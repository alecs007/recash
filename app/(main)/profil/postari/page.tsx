import { Metadata } from "next";
import AllPostsPage from "./AllPostsPage";

export const metadata: Metadata = {
  title: "Postările mele | Recash",
  description: "Toate postările tale de reciclare.",
};

export default function PostsRoute() {
  return <AllPostsPage />;
}
