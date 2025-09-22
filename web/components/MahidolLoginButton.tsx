"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export default function MahidolLoginButton() {
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null);
  const [signInFn, setSignInFn] = useState<null | ((...args: any[]) => void)>(null);

  useEffect(() => {
    let mounted = true;

    // Try to dynamically import next-auth/react. If it's not installed, show install hint.
    import("next-auth/react")
      .then((mod) => {
        if (!mounted) return;
        setAuthAvailable(true);
        setSignInFn(() => (mod.signIn as unknown) as (...args: any[]) => void);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (authAvailable === null) {
    return <Button disabled>Checking auth...</Button>;
  }

  if (authAvailable === false) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm">Auth library not installed.</div>
        <a
          className="text-sm underline"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // show a small copy-to-clipboard or instructions
            navigator.clipboard?.writeText("pnpm add next-auth");
            alert("Run `pnpm add next-auth` in the project root. The command was copied to your clipboard.");
          }}
        >
          Install next-auth (click to copy command)
        </a>
      </div>
    );
  }

  return (
    <Button
      onClick={() => {
        if (!signInFn) return;
        // Use provider id 'mahidol' as requested
        signInFn("mahidol");
      }}
    >
      Sign in with Mahidol Account
    </Button>
  );
}
