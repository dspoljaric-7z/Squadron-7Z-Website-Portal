import { redirect } from "next/navigation";

export default function CorrectionsPage() {
  redirect("/discipline?tab=corrections");
}
