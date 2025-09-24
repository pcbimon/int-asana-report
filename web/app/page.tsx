import Image from "next/image";
import MahidolLoginButton from "../components/MahidolLoginButton";

export default function Home() {
  return (
    <div className="font-sans flex items-center justify-center min-h-screen p-8">
      <main className="flex flex-col items-center justify-center max-w-md w-full space-y-8">
        {/* Asana Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <Image
              src="/Asana-Logo.png"
              alt="Asana Logo"
              width={280}
              height={56}
              priority
              style={{ height: "auto" }}
              className="dark:brightness-0 dark:invert"
            />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            ระบบรายงานข้อมูลจาก Asana
          </p>
        </div>

        {/* Login Section */}
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
              เข้าสู่ระบบ
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              กรุณาเข้าสู่ระบบเพื่อดูรายงาน
            </p>
          </div>
          <div className="flex items-center justify-center">
            <MahidolLoginButton />
          </div>
        </div>
      </main>
    </div>
  );
}
