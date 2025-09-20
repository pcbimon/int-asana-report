import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdLogout } from "react-icons/md";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import React from "react";
import "../../globals.css";
import SummaryMetricCard from "@/components/SummaryMatricCard";
import WeeklySummaryChart from "@/components/WeeklySummaryChart";
import CurrentTasksTable from "@/components/CurrentTasksTable";
import AdminSection from "@/components/AdminSection";
export default function DashboardPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto">
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight">
                  Dashboard Overview
                </h1>
                <p className="text-sm sm:text-base font-light">
                  Patipat Chewprecha
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Last sync: 01 Oct 2023 12:00:00 PM
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  aria-label="Export PDF"
                  title="Export PDF"
                  variant="outline"
                  className="h-8 p-0 flex items-center justify-center w-8 md:w-auto md:px-3"
                >
                  <FaFilePdf />
                  <span className="hidden md:inline ml-2 text-sm">Export PDF</span>
                </Button>

                <Button
                  aria-label="Export Excel"
                  title="Export Excel"
                  variant="outline"
                  className="h-8 p-0 flex items-center justify-center w-8 md:w-auto md:px-3"
                >
                  <FaFileExcel />
                  <span className="hidden md:inline ml-2 text-sm">Export Excel</span>
                </Button>

                <Button
                  aria-label="Logout"
                  title="Logout"
                  variant="default"
                  className="h-8 p-0 flex items-center justify-center w-8 md:w-auto md:px-3"
                >
                  <MdLogout />
                  <span className="hidden md:inline ml-2 text-sm">Logout</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <AdminSection />
        <SummaryMetricCard />
        <WeeklySummaryChart />
        <CurrentTasksTable />
      </div>
    </div>
  );
}
