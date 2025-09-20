import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdOutlineAccessTime } from "react-icons/md";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { BsExclamationTriangle } from "react-icons/bs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export default function CurrentTasksTable() {
  return (
    <div className="my-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Current Tasks (56)</h2>
            <div className="flex space-x-2">
              <Button variant="default" size="sm">
                All
              </Button>
              <Button variant="outline" size="sm">
                <MdOutlineAccessTime /> Pending
              </Button>
              <Button variant="outline" size="sm">
                <IoMdCheckmarkCircleOutline /> Completed
              </Button>
              <Button variant="outline" size="sm">
                <BsExclamationTriangle /> Overdue
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Task</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
