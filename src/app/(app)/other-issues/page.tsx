import { redirect } from "next/navigation";

export default function OtherIssuesPage() {
  redirect("/discipline?tab=other-issues");
}
