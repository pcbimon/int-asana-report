import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdLogout } from "react-icons/md";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import React from "react";
import "../../globals.css";
import SummaryMetricCard from "@/components/SummaryMatricCard";
import WeeklySummaryChart from "@/components/WeeklySummaryChart";
import CurrentTasksTable from "@/components/CurrentTasksTable";
export default function DashboardPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto">
        <Card>
          <CardContent>
            <div className="flex">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold">Dashboard Overview</h1>
                <h1 className="text-xl font-light">Patipat Chewprecha</h1>
                <h3 className="text-sm font-light text-gray-400">Last sync: 01 Oct 2023 12:00:00 PM</h3>
              </div>
              <div className="flex-grow text-right space-x-2">
                <Button variant="outline">
                  <FaFilePdf /> Export PDF
                </Button>
                <Button variant="outline">
                  <FaFileExcel /> Export Excel
                </Button>
                <Button variant="default">
                  <MdLogout /> Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <SummaryMetricCard />
        <WeeklySummaryChart />
        <CurrentTasksTable />
      </div>
    </div>
  );
}
