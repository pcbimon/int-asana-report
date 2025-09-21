import { FiTarget } from "react-icons/fi";
import { IoMdCheckmarkCircleOutline, IoMdTrendingUp } from "react-icons/io";
import { BsExclamationTriangle } from "react-icons/bs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  total: number;
  completed: number;
  overdue: number;
  completionRate: number; // percent
};

export default function SummaryMetricCard({ total, completed, overdue, completionRate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Total Tasks</CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <FiTarget className="text-blue-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{total}</div>
          <CardDescription className="text-xs text-gray-500">
            Number of tasks assigned
          </CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Completed</CardTitle>
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <IoMdCheckmarkCircleOutline className="text-green-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{completed}</div>
          <CardDescription className="text-xs text-gray-500">
            Completed subtasks
          </CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Completetion Rate</CardTitle>
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <IoMdTrendingUp className="text-green-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{completionRate}%</div>
          <CardDescription className="text-xs text-gray-500">
            Percentage completed
          </CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overdue</CardTitle>
            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
              <BsExclamationTriangle className="text-gray-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{overdue}</div>
          <CardDescription className="text-xs text-gray-500">
            Overdue subtasks
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
