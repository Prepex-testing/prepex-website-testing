import Link from "next/link";
import { AuthCard } from "@/components/layout/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserIcon, MailIcon, LockIcon } from "@/components/ui/icons";

export default function CreateAccountPage() {
  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-h1 text-ink">Create your account</h1>
        <p className="text-sm text-muted">
          Quick setup. Takes 30 seconds.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <Input
          label="Full Name"
          helperText="Used in your daily plan greetings"
          icon={<UserIcon />}
          name="fullName"
          type="text"
          placeholder="Rohan"
        />
        <Input
          label="Email Address"
          helperText="For plan reminders and account events"
          icon={<MailIcon />}
          name="email"
          type="email"
          placeholder="Rohan@example.com"
        />
        <Input
          label="Password"
          helperText="At least 8 characters with one number"
          icon={<LockIcon />}
          name="password"
          type="password"
          placeholder="At least 8 characters"
        />

        <Button variant="primary" href="/email-verification">
          Sign up
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        By clicking “Sign Up”, you agree to our{" "}
        <Link href="/terms" className="text-ink">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-ink">
          Privacy Policy
        </Link>
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline">
          Login
        </Link>
      </p>
    </AuthCard>
  );
}
