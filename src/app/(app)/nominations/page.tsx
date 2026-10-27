import { redirect } from "next/navigation";

export default function NominationsPage() {
  redirect("/advancement?tab=nominations");
}
