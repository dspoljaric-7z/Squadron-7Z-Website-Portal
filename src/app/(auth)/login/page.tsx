import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
        <p className="mt-1 text-sm text-gray-400">Sign in to access your squadron portal</p>
      </div>
      <LoginForm registered={params.registered === "1"} oauthError={params.error} />
    </>
  );
}
