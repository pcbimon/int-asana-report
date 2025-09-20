import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdOutlineAccessTime } from "react-icons/md";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { BsExclamationTriangle } from "react-icons/bs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
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
                <TableHead className="w-1/2">Task</TableHead>
                <TableHead className="w-1/6">Created</TableHead>
                <TableHead className="w-1/6">Due Date</TableHead>
                <TableHead className="w-1/6">Status</TableHead>
                <TableHead className="w-1/6">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-medium">Design new UI</span>
                  </div>
                </TableCell>
                <TableCell>01 Oct 2025</TableCell>
                <TableCell>15 Oct 2023</TableCell>
                <TableCell>
                  <Badge variant="success">
                    <IoMdCheckmarkCircleOutline /> Completed
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="default">Owner</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      Implement authentication
                    </span>
                    <span className="text-xs text-gray-500">
                      Mr. Smith, Mr. Johnson
                    </span>
                  </div>
                </TableCell>
                <TableCell>01 Oct 2025</TableCell>
                <TableCell>15 Oct 2023</TableCell>
                <TableCell>
                  <Badge variant="success">
                    <IoMdCheckmarkCircleOutline /> Completed
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Collaborator</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">Implement function A</span>
                  </div>
                </TableCell>
                <TableCell>01 Oct 2025</TableCell>
                <TableCell>15 Oct 2023</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    <MdOutlineAccessTime /> Pending
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="default">Owner</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">Implement function B</span>
                  </div>
                </TableCell>
                <TableCell>01 Oct 2025</TableCell>
                <TableCell>15 Oct 2023</TableCell>
                <TableCell>
                  <Badge variant="destructive">
                    <BsExclamationTriangle /> Overdue
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="default">Owner</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="flex justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing 1 to 4 of 56 entries
            </div>
            <div className="flex items-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive={true}>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
