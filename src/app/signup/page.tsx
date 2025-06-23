
"use client";
import { SignupForm } from "@/components/auth/SignupForm";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/feed");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || (!isLoading && isAuthenticated)) {
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] py-12">
      <SignupForm />
    </div>
  );
}
