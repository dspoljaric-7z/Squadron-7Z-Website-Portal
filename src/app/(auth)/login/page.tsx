import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <h2 className="mb-6 text-center text-lg font-semibold">Sign In</h2>
      <LoginForm registered={params.registered === "1"} />
    </>
  );
}
