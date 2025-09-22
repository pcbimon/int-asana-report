"use client";
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MdOutlineAccessTime } from "react-icons/md";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { BsExclamationTriangle } from "react-icons/bs";
import { FaList } from "react-icons/fa6";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { Skeleton, SkeletonText } from "./ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { CurrentTaskRow, StatusFilter } from "@/lib/types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Props = {
  assigneeGid: string;
};

export default function CurrentTasksTable({ assigneeGid }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const initialStatus = (sp?.get("status") ?? "all") as StatusFilter;
  const initialPage = Number(sp?.get("page") ?? 1);

  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize] = useState<number>(10);
  const [rows, setRows] = useState<CurrentTaskRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildUrl = (params: Partial<{ page: number; status: StatusFilter }>) => {
    const usp = new URLSearchParams(sp?.toString());
    if (params.status) usp.set("status", params.status);
    if (params.page) usp.set("page", String(params.page));
    if (params.page === 1) usp.delete("page");
    const qs = usp.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };

  // request id to ignore out-of-order responses
  const reqIdRef = useRef(0);

  const loadData = async (newStatus?: StatusFilter, newPage?: number) => {
    const s = newStatus ?? status;
    const p = newPage ?? page;

    // update local state (for UI) immediately
    setStatus(s);
    setPage(p);


    setLoading(true);
    const myId = ++reqIdRef.current;
    try {
      const qs = new URLSearchParams();
      qs.set("status", s);
      qs.set("page", String(p));
      qs.set("pageSize", String(pageSize));
      qs.set("assignee", assigneeGid);
      const res = await fetch(`/api/current-tasks?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      // ignore stale responses
      if (myId !== reqIdRef.current) return;
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // initial load or when assignee changes
    loadData(initialStatus, initialPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assigneeGid]);

  const onChangePage = (p: number) => { loadData(undefined, p); };
  const onChangeStatus = (s: StatusFilter) => { loadData(s, 1); };

  return (
    <div className="my-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Current Tasks ({total})</h2>
            <div className="flex space-x-2">
              <Button variant={status === 'all' ? 'default' : 'outline'} size="sm" className="flex items-center space-x-2" onClick={() => onChangeStatus?.('all')}>
              <FaList className="w-4 h-4" />
              <span className="hidden sm:inline">All</span>
              </Button>
              <Button variant={status === 'pending' ? 'default' : 'outline'} size="sm" className="flex items-center space-x-2" onClick={() => onChangeStatus?.('pending')}>
              <MdOutlineAccessTime className="w-4 h-4" />
              <span className="hidden sm:inline">Pending</span>
              </Button>
              <Button variant={status === 'completed' ? 'default' : 'outline'} size="sm" className="flex items-center space-x-2" onClick={() => onChangeStatus?.('completed')}>
              <IoMdCheckmarkCircleOutline className="w-4 h-4" />
              <span className="hidden sm:inline">Completed</span>
              </Button>
              <Button variant={status === 'overdue' ? 'default' : 'outline'} size="sm" className="flex items-center space-x-2" onClick={() => onChangeStatus?.('overdue')}>
              <BsExclamationTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Overdue</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Task</TableHead>
                <TableHead className="w-1/6">Week</TableHead>
                <TableHead className="w-1/6">Due Date</TableHead>
                <TableHead className="w-1/6">Status</TableHead>
                <TableHead className="w-1/6">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col space-y-2">
                          <SkeletonText className="w-3/4" />
                          <SkeletonText className="w-1/2 h-3" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <SkeletonText className="w-1/2" />
                      </TableCell>
                      <TableCell>
                        <SkeletonText className="w-1/2" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="inline-block h-6 px-3 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="inline-block h-6 px-3 w-28" />
                      </TableCell>
                    </TableRow>
                  ))
                : rows.map((r) => (
                    <TableRow key={`${r.gid}-${r.type}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-medium">{r.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{r.week || '-'}</TableCell>
                      <TableCell>{r.due_on || '-'}</TableCell>
                      <TableCell>
                        {r.status === 'Completed' && (
                          <Badge variant="success">
                            <IoMdCheckmarkCircleOutline /> Completed
                          </Badge>
                        )}
                        {r.status === 'Pending' && (
                          <Badge variant="secondary">
                            <MdOutlineAccessTime /> Pending
                          </Badge>
                        )}
                        {r.status === 'Overdue' && (
                          <Badge variant="destructive">
                            <BsExclamationTriangle /> Overdue
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.type === 'Owner' ? 'default' : 'secondary'}>{r.type === 'Owner' ? 'Owner' : 'Collaborator'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          <div className="flex justify-between mt-4">
            <div className="text-sm text-gray-500">
              {loading ? 'Loading...' : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total} entries`}
            </div>
            <div className="flex items-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); onChangePage(Math.max(1, page - 1)); }} />
                  </PaginationItem>
                  {/* numeric page links hidden on small screens */}
                  <div className="hidden sm:flex items-center space-x-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink href="#" isActive={i + 1 === page} onClick={(e) => { e.preventDefault(); onChangePage(i + 1); }}>{i + 1}</PaginationLink>
                      </PaginationItem>
                    ))}
                  </div>
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); onChangePage(Math.min(totalPages, page + 1)); }} />
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
